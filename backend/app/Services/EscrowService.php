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
     */
    public function holdFunds(Order $order, User $buyer): void
    {
        $wallet = $this->getOrCreateWallet($buyer);
        $amount = (float) $order->total_amount;

        $wallet->decrement('balance', $amount);

        $wallet->transactions()->create([
            'type'           => 'purchase_hold',
            'status'         => 'hold',
            'amount'         => -$amount,
            'balance_after'  => (float) $wallet->fresh()->balance,
            'reference_type' => Order::class,
            'reference_id'   => $order->id,
            'description'    => "Escrow hold for order #{$order->order_number}",
        ]);

        $order->update([
            'escrow_amount' => $amount,
            'escrow_status' => 'held',
        ]);

        // Update buyer stats
        $this->incrementBuyerStats($buyer, $amount, $order);
    }

    /**
     * Release escrow to seller minus platform commission on order completion.
     * Creates: seller_payout + platform_fee transactions.
     */
    public function releaseFunds(Order $order, ?User $adminUser = null): void
    {
        if ($order->escrow_status === 'released') {
            return;
        }

        $totalAmount = (float) $order->escrow_amount;
        if ($totalAmount <= 0) {
            $totalAmount = (float) $order->total_amount;
        }

        $commissionPct   = (float) config('platform.commission_percent', 10);
        $platformFee     = round($totalAmount * ($commissionPct / 100), 2);
        $sellerAmount    = round($totalAmount - $platformFee, 2);

        $sellerId = $order->seller_id;
        if (! $sellerId) {
            // Fallback: get seller from first order item
            $order->loadMissing('orderItems.product');
            $sellerId = $order->orderItems->first()?->product?->user_id;
        }

        DB::transaction(function () use ($order, $sellerId, $sellerAmount, $platformFee, $totalAmount) {
            // Pay seller
            if ($sellerId) {
                $seller = User::find($sellerId);
                if ($seller) {
                    $sellerWallet = $this->getOrCreateWallet($seller);
                    $sellerWallet->increment('balance', $sellerAmount);
                    $sellerWallet->transactions()->create([
                        'type'           => 'seller_payout',
                        'status'         => 'completed',
                        'amount'         => $sellerAmount,
                        'balance_after'  => (float) $sellerWallet->fresh()->balance,
                        'reference_type' => Order::class,
                        'reference_id'   => $order->id,
                        'description'    => "Payout for order #{$order->order_number} (after {$this->commissionPct()}% commission)",
                    ]);

                    // Update seller stats
                    $this->incrementSellerStats($seller, $sellerAmount, $order);
                }
            }

            // Credit platform wallet
            if ($platformFee > 0) {
                PlatformWallet::singleton()->credit($platformFee);
            }

            // Mark escrow released on order
            $order->update([
                'escrow_status' => 'released',
                'completed_at'  => now(),
            ]);
        });
    }

    /**
     * Refund buyer when a dispute is resolved in their favour.
     */
    public function refundBuyer(Order $order, ?User $adminUser = null): void
    {
        if ($order->escrow_status === 'refunded') {
            return;
        }

        $amount = (float) $order->escrow_amount;
        if ($amount <= 0) {
            $amount = (float) $order->total_amount;
        }

        $buyer = $order->buyer;
        if (! $buyer) {
            return;
        }

        DB::transaction(function () use ($order, $buyer, $amount) {
            $buyerWallet = $this->getOrCreateWallet($buyer);
            $buyerWallet->increment('balance', $amount);
            $buyerWallet->transactions()->create([
                'type'           => 'refund',
                'status'         => 'completed',
                'amount'         => $amount,
                'balance_after'  => (float) $buyerWallet->fresh()->balance,
                'reference_type' => Order::class,
                'reference_id'   => $order->id,
                'description'    => "Refund for order #{$order->order_number} (dispute resolved)",
            ]);

            $order->update([
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
