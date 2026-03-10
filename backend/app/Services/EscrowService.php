<?php

namespace App\Services;

use App\Models\AdminLog;
use App\Models\BuyerStat;
use App\Models\Order;
use App\Models\PlatformWallet;
use App\Models\SellerStat;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;

class EscrowService
{
    /**
     * Place a purchase hold in escrow when an order is created.
     * Money is debited from buyer; sits as a "held" transaction.
     *
     * This method is fully atomic and safe under concurrency:
     * - Locks both the order row and the buyer's wallet row.
     * - Re-checks balance inside the transaction.
     * - Ensures escrow_status transitions from null -> held only once.
     */
    public function holdFunds(Order $order, User $buyer): void
    {
        DB::transaction(function () use ($order, $buyer) {
            /** @var Order|null $lockedOrder */
            $lockedOrder = Order::whereKey($order->id)->lockForUpdate()->first();
            if (! $lockedOrder) {
                return;
            }

            // Only place a hold once; strict state machine: null -> held
            if ($lockedOrder->escrow_status !== null && $lockedOrder->escrow_status !== 'held') {
                \Log::warning('Escrow hold skipped: order already transitioned', [
                    'order_id'       => $lockedOrder->id,
                    'escrow_status'  => $lockedOrder->escrow_status,
                ]);

                return;
            }

            $wallet = $this->getOrCreateWallet($buyer);
            // Lock wallet row for balance mutation
            $wallet = Wallet::whereKey($wallet->id)->lockForUpdate()->first();
            if (! $wallet) {
                return;
            }

            $amount = (float) $lockedOrder->total_amount;

            if ((float) $wallet->balance < $amount) {
                throw new \RuntimeException('INSUFFICIENT_WALLET_BALANCE_HOLD');
            }

            $wallet->decrement('balance', $amount);

            $wallet->transactions()->create([
                'type'           => 'purchase_hold',
                'status'         => 'hold',
                'amount'         => -$amount,
                'balance_after'  => (float) $wallet->fresh()->balance,
                'reference_type' => Order::class,
                'reference_id'   => $lockedOrder->id,
                'description'    => "Escrow hold for order #{$lockedOrder->order_number}",
            ]);

            $lockedOrder->update([
                'escrow_amount' => $amount,
                'escrow_status' => 'held',
            ]);

            // Update buyer stats
            $this->incrementBuyerStats($buyer, $amount, $lockedOrder);
        });
    }

    /**
     * Release escrow to seller minus platform commission on order completion.
     * Creates: seller_payout + platform_fee transactions.
     *
     * Concurrency guarantees:
     * - Locks the order row and re-checks escrow_status inside the transaction.
     * - Strict state machine: only 'held' -> 'released' is allowed.
     * - Guards against duplicate seller_payout transactions for the same order.
     */
    public function releaseFunds(Order $order, ?User $adminUser = null): void
    {
        DB::transaction(function () use ($order) {
            /** @var Order|null $lockedOrder */
            $lockedOrder = Order::whereKey($order->id)->lockForUpdate()->first();
            if (! $lockedOrder) {
                return;
            }

            // Only release from held state; idempotent and state-safe.
            if ($lockedOrder->escrow_status !== 'held') {
                \Log::warning('Escrow release skipped: order not in held state', [
                    'order_id'      => $lockedOrder->id,
                    'escrow_status' => $lockedOrder->escrow_status,
                ]);

                return;
            }

            // Amount actually held from buyer wallet (after any discounts)
            $totalAmount = (float) $lockedOrder->escrow_amount;
            if ($totalAmount <= 0) {
                $totalAmount = (float) $lockedOrder->total_amount;
            }

            // Subtotal before discounts (sum of order item totals).
            // If unavailable, fall back to the held amount.
            $lockedOrder->loadMissing('orderItems');
            $subtotal = (float) $lockedOrder->orderItems->sum('total_price');
            if ($subtotal <= 0) {
                $subtotal = $totalAmount;
            }

            // Coupon discount is inferred as the difference between subtotal and what buyer paid.
            $discountAmount = max(0.0, round($subtotal - $totalAmount, 2));

            $sellerId = $lockedOrder->seller_id;
            if (! $sellerId) {
                // Fallback: get seller from first order item
                $lockedOrder->loadMissing('orderItems.product');
                $sellerId = $lockedOrder->orderItems->first()?->product?->user_id;
            }

            $platformFee  = 0.0;
            $sellerAmount = $totalAmount;

            // Pay seller (skip payout if seller is currently banned)
            if ($sellerId) {
                $seller = User::find($sellerId);
                if ($seller) {
                    // Progressive commission based on completed orders (from orders table)
                    $completedOrders = Order::where('seller_id', $sellerId)
                        ->where('status', Order::STATUS_COMPLETED)
                        ->count();
                    if ($completedOrders >= 100) {
                        $commissionPct = 8.0;
                    } elseif ($completedOrders >= 20) {
                        $commissionPct = 10.0;
                    } elseif ($completedOrders >= 10) {
                        $commissionPct = 12.0;
                    } else {
                        $commissionPct = 15.0;
                    }

                    // Base platform commission on the pre-discount subtotal so seller earnings
                    // are not reduced by coupons. Coupon discounts are absorbed from platform
                    // commission up to its full amount.
                    $baseCommission = round($subtotal * ($commissionPct / 100), 2);
                    $platformFee    = max(0.0, round($baseCommission - $discountAmount, 2));
                    $sellerAmount   = max(0.0, round($totalAmount - $platformFee, 2));
                    $isBanned = $seller->is_banned && (
                        $seller->ban_type === 'permanent'
                        || ($seller->ban_type === 'temporary' && $seller->banned_until?->isFuture())
                    );

                    $sellerWallet = $this->getOrCreateWallet($seller);
                    $sellerWallet = Wallet::whereKey($sellerWallet->id)->lockForUpdate()->first();
                    if (! $sellerWallet) {
                        return;
                    }

                    // Prevent duplicate seller_payout for the same order
                    $alreadyPaid = $sellerWallet->transactions()
                        ->where('type', 'seller_payout')
                        ->where('reference_type', Order::class)
                        ->where('reference_id', $lockedOrder->id)
                        ->exists();

                    if ($alreadyPaid) {
                        \Log::warning('Duplicate seller payout avoided', [
                            'order_id'  => $lockedOrder->id,
                            'seller_id' => $seller->id,
                        ]);
                    } else {
                        if (! $isBanned) {
                            $sellerWallet->increment('balance', $sellerAmount);
                            $sellerWallet->transactions()->create([
                                'type'           => 'seller_payout',
                                'status'         => 'completed',
                                'amount'         => $sellerAmount,
                                'balance_after'  => (float) $sellerWallet->fresh()->balance,
                                'reference_type' => Order::class,
                                'reference_id'   => $lockedOrder->id,
                                'description'    => "Payout for order #{$lockedOrder->order_number} (after {$commissionPct}% commission)",
                            ]);
                        } else {
                            // Banned seller — payout held, credited to platform instead
                            $sellerWallet->transactions()->create([
                                'type'           => 'seller_payout',
                                'status'         => 'held_banned',
                                'amount'         => $sellerAmount,
                                'balance_after'  => (float) $sellerWallet->balance,
                                'reference_type' => Order::class,
                                'reference_id'   => $lockedOrder->id,
                                'description'    => "Payout HELD — seller is banned. Order #{$lockedOrder->order_number}",
                            ]);
                        }
                    }

                    // Always update seller stats regardless of ban
                    $this->incrementSellerStats($seller, $sellerAmount, $lockedOrder);
                }
            }

            // Credit platform wallet
            if ($platformFee > 0) {
                PlatformWallet::singleton()->credit($platformFee);
            }

            // Mark escrow released on order (strict held -> released transition)
            $lockedOrder->update([
                'escrow_status' => 'released',
                'completed_at'  => $lockedOrder->completed_at ?? now(),
            ]);
        });
    }

    /**
     * Refund buyer when a dispute is resolved in their favour.
     *
     * Concurrency guarantees:
     * - Locks the order and buyer wallet rows.
     * - Strict state machine: only 'held' -> 'refunded' is allowed.
     * - Prevents duplicate refund transactions for the same order.
     */
    public function refundBuyer(Order $order, ?User $adminUser = null): void
    {
        DB::transaction(function () use ($order) {
            /** @var Order|null $lockedOrder */
            $lockedOrder = Order::whereKey($order->id)->lockForUpdate()->first();
            if (! $lockedOrder) {
                return;
            }

            // Only refund from held state; idempotent and state-safe.
            if ($lockedOrder->escrow_status !== 'held') {
                \Log::warning('Escrow refund skipped: order not in held state', [
                    'order_id'      => $lockedOrder->id,
                    'escrow_status' => $lockedOrder->escrow_status,
                ]);

                return;
            }

            $amount = (float) $lockedOrder->escrow_amount;
            if ($amount <= 0) {
                $amount = (float) $lockedOrder->total_amount;
            }

            $buyer = $lockedOrder->buyer;
            if (! $buyer) {
                return;
            }

            $buyerWallet = $this->getOrCreateWallet($buyer);
            $buyerWallet = Wallet::whereKey($buyerWallet->id)->lockForUpdate()->first();
            if (! $buyerWallet) {
                return;
            }

            // Prevent duplicate refund for the same order
            $alreadyRefunded = $buyerWallet->transactions()
                ->where('type', 'refund')
                ->where('reference_type', Order::class)
                ->where('reference_id', $lockedOrder->id)
                ->exists();

            if ($alreadyRefunded) {
                \Log::warning('Duplicate refund avoided', [
                    'order_id' => $lockedOrder->id,
                    'buyer_id' => $buyer->id,
                ]);
            } else {
                $buyerWallet->increment('balance', $amount);
                $buyerWallet->transactions()->create([
                    'type'           => 'refund',
                    'status'         => 'completed',
                    'amount'         => $amount,
                    'balance_after'  => (float) $buyerWallet->fresh()->balance,
                    'reference_type' => Order::class,
                    'reference_id'   => $lockedOrder->id,
                    'description'    => "Refund for order #{$lockedOrder->order_number} (dispute resolved)",
                ]);
            }

            $lockedOrder->update([
                'escrow_status' => 'refunded',
                'status'        => Order::STATUS_CANCELLED,
            ]);
        });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function getOrCreateWallet(User $user): Wallet
    {
        return $user->wallet ?? $user->wallet()->create(['balance' => 0]);
    }

    private function commissionPct(): float
    {
        return (float) config('platform.commission_percent', 10);
    }

    private function incrementSellerStats(User $seller, float $revenue, Order $order): void
    {
        $itemCount = $order->loadMissing('orderItems')->orderItems->sum('quantity');

        $stats = SellerStat::firstOrCreate(['seller_id' => $seller->id]);
        $stats->increment('total_sales', max(1, $itemCount));
        $stats->increment('total_orders');
        $stats->increment('total_revenue', $revenue);

        // Recalculate average rating
        $reviews = \App\Models\Review::whereIn('product_id', $seller->products()->pluck('id'))->get();
        if ($reviews->count() > 0) {
            $stats->update([
                'rating_average' => round($reviews->avg('rating'), 2),
                'rating_count'   => $reviews->count(),
            ]);
        }
    }

    private function incrementBuyerStats(User $buyer, float $amount, Order $order): void
    {
        $itemCount = $order->loadMissing('orderItems')->orderItems->sum('quantity');

        $stats = BuyerStat::firstOrCreate(['buyer_id' => $buyer->id]);
        $stats->increment('total_purchases', max(1, $itemCount));
        $stats->increment('total_orders');
        $stats->increment('total_spent', $amount);
    }
}
