<?php

namespace App\Http\Controllers\Api;

use App\Models\AccountDelivery;
use App\Models\Coupon;
use App\Models\ReferralAttribution;
use App\Models\ReferralCode;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductAccount;
use App\Notifications\NewOrderNotification;
use App\Notifications\OrderCompletedNotification;
use App\Notifications\OrderDeliveredNotification;
use App\Services\EscrowService;
use App\Services\SecurityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function __construct(private readonly EscrowService $escrow) {}

    // ─── Buyer: list own orders ───────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()
            ->orders()
            ->with([
                'orderItems.product:id,name,slug,user_id,images,delivery_type',
                'orderItems.product.seller:id,name,avatar,updated_at,is_verified_seller',
                'dispute:id,order_id,status',
            ])
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->success($orders);
    }

    // ─── Order detail (with delivery content) ─────────────────────────────────

    public function show(Request $request, Order $order): JsonResponse
    {
        $user = $request->user();

        // Buyer can always see their own order
        $isBuyer = $order->user_id === $user->id;

        // Admin can see any order
        $isAdmin = (bool) $user->is_admin;

        // Seller can see orders that include their products
        $isSeller = false;
        if ($user->is_seller) {
            $isSeller = $order->orderItems()
                ->whereHas('product', fn ($q) => $q->where('user_id', $user->id))
                ->exists();
        }

        if (! $isBuyer && ! $isAdmin && ! $isSeller) {
            return $this->error('Forbidden.', 403);
        }

        $order->load([
            'orderItems.product:id,name,slug,price,images,delivery_type,delivery_time',
            'orderItems',
            'buyer:id,name',
            'seller:id,name,avatar,updated_at',
            'dispute:id,order_id,status,reason,admin_decision,admin_note',
        ]);

        $payload = $this->orderPayload($order);
        if ($isBuyer) {
            $payload['has_review'] = $order->reviews()->where('user_id', $user->id)->exists();
        }

        return $this->success($payload);
    }

    // ─── Buyer: confirm delivery ──────────────────────────────────────────────

    public function confirmDelivery(Request $request, Order $order): JsonResponse
    {
        if ($order->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }

        if (strtolower($order->status) !== 'delivered') {
            return $this->error('Order must be in delivered status before confirming.', 422);
        }

        DB::transaction(function () use ($order) {
            $order->update([
                'status'       => Order::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);

            $this->escrow->releaseFunds($order);
        });

        $order->load([
            'orderItems.product:id,name,slug,price,images,delivery_type',
            'orderItems',
            'buyer:id,name',
            'seller:id,name',
        ]);

        if ($order->seller) {
            $order->seller->notify(new OrderCompletedNotification($order));
        }
        $request->user()->notify(new OrderCompletedNotification($order));

        return $this->success($this->orderPayload($order), 'Order confirmed. Payment released to seller.');
    }

    // ─── Buyer: place order ───────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items'              => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity'   => ['required', 'integer', 'min:1'],
            'buyer_note'         => ['nullable', 'string', 'max:2000'],
        ]);

        $items      = $validated['items'];
        $productIds = array_column($items, 'product_id');
        $products   = Product::whereIn('id', $productIds)->where('status', 'active')->get()->keyBy('id');

        // Prevent users from purchasing their own products
        $buyer = $request->user();
        foreach ($products as $product) {
            if ($product && (int) $product->user_id === (int) $buyer->id) {
                return $this->error('You cannot purchase your own product.', 422);
            }
        }

        $orderLineItems = [];
        $subtotal       = 0.0;

        // Vacation mode: reject if any product's seller is in vacation mode
        $sellerIds = collect($items)
            ->map(fn ($i) => $products->get($i['product_id'])?->user_id)
            ->filter()
            ->unique()
            ->values();
        $sellersOnVacation = \App\Models\User::whereIn('id', $sellerIds)->where('vacation_mode', true)->exists();
        if ($sellersOnVacation) {
            return $this->error('One or more sellers are currently in vacation mode and cannot accept orders.', 422);
        }

        foreach ($items as $item) {
            $product = $products->get($item['product_id']);
            if (! $product) {
                return $this->error("Product {$item['product_id']} not found or not available.", 422);
            }

            $qty = (int) $item['quantity'];

            // Stock check (use product_accounts for instant delivery)
            if ($product->delivery_type === 'instant') {
                $available = ProductAccount::where('product_id', $product->id)
                    ->where('status', ProductAccount::STATUS_AVAILABLE)
                    ->count();

                if ($available < $qty) {
                    return $this->error("This product is currently out of stock.", 422);
                }
            } else {
                if ($product->stock < $qty) {
                    return $this->error("Insufficient stock for product: {$product->name}. Available: {$product->stock}", 422);
                }
            }

            $unitPrice = (float) ($product->effective_price ?? $product->price);
            $lineTotal = round($unitPrice * $qty, 2);

            $orderLineItems[] = [
                'product'     => $product,
                'product_id'  => $product->id,
                'quantity'    => $qty,
                'unit_price'  => $unitPrice,
                'total_price' => $lineTotal,
            ];
            $subtotal += $lineTotal;
        }

        // Optional coupon code applied at checkout
        $coupon         = null;
        $discountAmount = 0.0;
        $rawCode        = $request->input('coupon_code');

        if (is_string($rawCode) && trim($rawCode) !== '') {
            $code   = strtoupper(trim($rawCode));
            $coupon = Coupon::where('code', $code)->first();

            if (! $coupon) {
                return $this->error('Invalid or expired coupon.', 422);
            }

            if ($coupon->expires_at && $coupon->expires_at->isPast()) {
                return $this->error('This coupon has expired.', 422);
            }

            if ($coupon->max_uses !== null && $coupon->max_uses > 0 && $coupon->uses >= $coupon->max_uses) {
                return $this->error('This coupon has reached its usage limit.', 422);
            }

            $percent = max(0, min(100, (int) $coupon->discount_percent));
            $discountAmount = round($subtotal * ($percent / 100), 2);
        }

        // Optional referral code applied at checkout (non-fatal).
        // If invalid, it is ignored silently.
        // Important: actual validation + max_uses enforcement is done inside the DB transaction.
        $referralCodeStr = null;
        $rawReferralCode = $request->input('referral_code');
        if (is_string($rawReferralCode) && trim($rawReferralCode) !== '') {
            $referralCodeStr = strtoupper(trim($rawReferralCode));
        }

        $finalTotal = max(0.0, round($subtotal - $discountAmount, 2));

        // Lightweight abuse protection for referral attribution.
        // We compute outside the DB transaction, but enforce silently inside it.
        $buyerId = $buyer->id;
        $ip = $request->ip() ?: 'unknown';

        $user   = $request->user();
        $wallet = $user->wallet ?? $user->wallet()->create(['balance' => 0]);

        if ((float) $wallet->balance < $finalTotal) {
            return $this->error('Insufficient wallet balance.', 422);
        }

        $autoConfirmHours = (int) config('platform.auto_confirm_hours', 24);

        $buyerNote = $validated['buyer_note'] ?? null;

        try {
            $order = DB::transaction(function () use ($user, $finalTotal, $subtotal, $orderLineItems, $autoConfirmHours, $coupon, $buyerNote, $referralCodeStr, $buyer, $buyerId, $ip) {
            do {
                $orderNumber = 'M4M-' . strtoupper(Str::random(6));
            } while (Order::where('order_number', $orderNumber)->exists());

            $firstProduct = $orderLineItems[0]['product'];
            $sellerId     = $firstProduct->user_id;
            $deliveryType = $firstProduct->delivery_type ?? 'manual';

            $order = $user->orders()->create([
                'order_number'  => $orderNumber,
                'seller_id'     => $sellerId,
                'delivery_type' => $deliveryType,
                'status'        => Order::STATUS_PROCESSING,
                'total_amount'  => $finalTotal,
                'escrow_amount' => $finalTotal,
                'escrow_status' => 'held',
                'buyer_note'    => $buyerNote,
            ]);

            if ($referralCodeStr) {
                // Lock the referral code row to avoid race conditions with max_uses.
                $referralCode = ReferralCode::where('code', $referralCodeStr)
                    ->lockForUpdate()
                    ->first();

                $isActive = $referralCode && (($referralCode->status ?? 'active') === 'active');
                $isNotExpired = $referralCode && ! ($referralCode->expires_at && $referralCode->expires_at->isPast());
                $isNotSelf = $referralCode && ((int) $referralCode->owner_user_id !== (int) $buyer->id);

                if ($isActive && $isNotExpired && $isNotSelf) {
                    // 1) Prevent same buyer from reusing the same referral.
                    $alreadyAttributed = ReferralAttribution::where('buyer_user_id', $buyerId)
                        ->where('referral_code_id', $referralCode->id)
                        ->exists();

                    if ($alreadyAttributed) {
                        // Silent ignore.
                    } else {
                        // 2) Basic rate limit per IP for referral usage attempts.
                        // Key format: referral:{code}:{ip}
                        $rateKey = sprintf('referral:%s:%s', $referralCodeStr, $ip);
                        $maxAttempts = 5;
                        $decaySeconds = 3600; // 1 hour

                        if (RateLimiter::tooManyAttempts($rateKey, $maxAttempts)) {
                            // Silent ignore.
                        } else {
                            RateLimiter::hit($rateKey, $decaySeconds);

                            // Enforce max_uses and snapshot share percent in the attribution.
                            $maxUses = $referralCode->max_uses;
                            $uses     = $referralCode->uses ?? 0;

                            if (! ($maxUses !== null && (int) $uses >= (int) $maxUses)) {
                                $affiliateSharePercentUsed = (int) $referralCode->affiliate_share_percent;
                                $referralCode->increment('uses');

                                ReferralAttribution::create([
                                    'referral_code_id' => (int) $referralCode->id,
                                    'order_id' => $order->id,
                                    'buyer_user_id' => $user->id,
                                    'status' => 'pending',
                                    'affiliate_share_percent_used' => $affiliateSharePercentUsed,
                                    'pending_at' => now(),
                                ]);
                            }
                        }
                    }
                }
            }

            $isInstant          = false;
            $allDeliveryContent = [];

            foreach ($orderLineItems as $oi) {
                $product     = $oi['product'];
                $credentials = null;

                if ($product->delivery_type === 'instant') {
                    // Pull accounts from product_accounts table
                    $accounts = ProductAccount::where('product_id', $product->id)
                        ->where('status', ProductAccount::STATUS_AVAILABLE)
                        ->lockForUpdate()
                        ->take($oi['quantity'])
                        ->get();

                    if ($accounts->count() < $oi['quantity']) {
                        throw new \RuntimeException("Out of stock for product: {$product->name}");
                    }

                    $credLines = $accounts->pluck('account_data')->toArray();
                    $credentials = implode("\n", $credLines);

                    // Create the order item first so we have its ID
                    $orderItem = $order->orderItems()->create([
                        'product_id'           => $oi['product_id'],
                        'quantity'             => $oi['quantity'],
                        'unit_price'           => $oi['unit_price'],
                        'total_price'          => $oi['total_price'],
                        'delivery_credentials' => $credentials,
                    ]);

                    // Mark accounts as sold and link to order item
                    ProductAccount::whereIn('id', $accounts->pluck('id'))
                        ->update([
                            'status'        => ProductAccount::STATUS_SOLD,
                            'order_item_id' => $orderItem->id,
                        ]);

                    // Sync product stock
                    $product->decrement('stock', $oi['quantity']);

                    $allDeliveryContent[] = $credentials;
                    $isInstant = true;
                } else {
                    // Manual delivery
                    $order->orderItems()->create([
                        'product_id'  => $oi['product_id'],
                        'quantity'    => $oi['quantity'],
                        'unit_price'  => $oi['unit_price'],
                        'total_price' => $oi['total_price'],
                    ]);
                    Product::where('id', $oi['product_id'])->decrement('stock', $oi['quantity']);
                }
            }

            // If a coupon was used, increment its usage counter
            if ($coupon) {
                $coupon->increment('uses');
            }

            // Increment orders_last_3_days for each product (for Trending/Hot badges)
            $productIds = array_unique(array_column($orderLineItems, 'product_id'));
            foreach ($productIds as $pid) {
                $p = Product::find($pid);
                if ($p) {
                    $p = $p->ensureActivityWindow();
                    $p->increment('orders_last_3_days');
                }
            }

            // Escrow hold — debit buyer wallet (lock row and re-check balance)
            $wallet = $user->wallet ?? $user->wallet()->create(['balance' => 0]);
            $wallet = $user->wallet()->lockForUpdate()->first();
            if (! $wallet) {
                throw new \RuntimeException('INSUFFICIENT_WALLET_BALANCE');
            }

            if ((float) $wallet->balance < $finalTotal) {
                throw new \RuntimeException('INSUFFICIENT_WALLET_BALANCE');
            }

            $wallet->decrement('balance', $finalTotal);
            $wallet->transactions()->create([
                'type'           => 'purchase_hold',
                'status'         => 'hold',
                'amount'         => -$finalTotal,
                'balance_after'  => (float) $wallet->fresh()->balance,
                'reference_type' => Order::class,
                'reference_id'   => $order->id,
                'description'    => "Escrow hold for order #{$orderNumber}",
            ]);

            // Instant delivery → delivered immediately
            if ($isInstant) {
                $deliveryContent = implode("\n---\n", $allDeliveryContent);
                $deliveredAt     = now();
                $order->update([
                    'status'          => Order::STATUS_DELIVERED,
                    'delivered_at'    => $deliveredAt,
                    'delivery_content'=> $deliveryContent,
                    'auto_confirm_at' => $deliveredAt->copy()->addHours($autoConfirmHours),
                ]);

                // Log delivery for audit / dispute purposes
                AccountDelivery::create([
                    'order_id'           => $order->id,
                    'product_account_id' => null,
                    'account_data'       => $deliveryContent,
                    'delivered_at'       => $deliveredAt,
                ]);
            }

            return $order;
        });
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'INSUFFICIENT_WALLET_BALANCE') {
                return $this->error('Insufficient wallet balance.', 422);
            }
            throw $e;
        }

        $order->load(['orderItems.product:id,name,slug,user_id,delivery_type']);

        // Notify seller(s)
        $sellerIds = $order->orderItems->pluck('product.user_id')->unique()->filter();
        foreach ($sellerIds as $sid) {
            $seller = \App\Models\User::find($sid);
            if ($seller) {
                $seller->notify(new NewOrderNotification($order));
            }
        }

        // For instant delivery, notify buyer
        if ($order->status === Order::STATUS_DELIVERED) {
            $user->notify(new OrderDeliveredNotification($order));
        }

        SecurityLogService::log($user, 'purchase', $request, [
            'order_id'     => $order->id,
            'order_number' => $order->order_number,
            'amount'       => $finalTotal,
        ]);

        return $this->success($this->orderPayload($order->fresh(['orderItems.product'])), 'Order placed successfully.', 201);
    }

    // ─── Helper: build safe order payload ────────────────────────────────────

    /**
     * Build the public order payload.
     * delivery_content is only included when the caller is the buyer or admin.
     * (Authorization is already enforced before calling this.)
     */
    private function orderPayload(Order $order): array
    {
        $data                     = $order->toArray();
        $data['delivery_content'] = $order->delivery_content;

        // Also attach credentials per order item
        $items = $order->orderItems ?? collect();
        $data['order_items'] = $items->map(function ($item) {
            $arr = $item->toArray();
            $arr['delivery_credentials'] = $item->delivery_credentials;
            return $arr;
        })->values()->toArray();

        return $data;
    }
}
