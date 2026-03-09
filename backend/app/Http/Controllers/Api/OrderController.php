<?php

namespace App\Http\Controllers\Api;

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
                'orderItems.product.seller:id,name,is_verified_seller',
                'dispute:id,order_id,status',
            ])
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->success($orders);
    }

    // ─── Buyer: order detail (with delivery content) ──────────────────────────

    public function show(Request $request, Order $order): JsonResponse
    {
        if ($order->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }

        $order->load([
            'orderItems.product:id,name,slug,price,images,delivery_type,delivery_time',
            'orderItems',
            'buyer:id,name',
            'seller:id,name',
            'dispute:id,order_id,status,reason',
        ]);

        return $this->success($this->orderPayload($order));
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
        ]);

        $items      = $validated['items'];
        $productIds = array_column($items, 'product_id');
        $products   = Product::whereIn('id', $productIds)->where('status', 'active')->get()->keyBy('id');

        $orderLineItems = [];
        $totalAmount    = 0;

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

            $unitPrice = (float) $product->price;
            $lineTotal = round($unitPrice * $qty, 2);

            $orderLineItems[] = [
                'product'    => $product,
                'product_id' => $product->id,
                'quantity'   => $qty,
                'unit_price' => $unitPrice,
                'total_price'=> $lineTotal,
            ];
            $totalAmount += $lineTotal;
        }

        $user   = $request->user();
        $wallet = $user->wallet ?? $user->wallet()->create(['balance' => 0]);

        if ((float) $wallet->balance < $totalAmount) {
            return $this->error('Insufficient wallet balance.', 422);
        }

        $autoConfirmHours = (int) config('platform.auto_confirm_hours', 24);

        $order = DB::transaction(function () use ($user, $totalAmount, $orderLineItems, $autoConfirmHours) {
            do {
                $orderNumber = 'M4M-' . strtoupper(Str::random(6));
            } while (Order::where('order_number', $orderNumber)->exists());

            $firstProduct = $orderLineItems[0]['product'];
            $sellerId     = $firstProduct->user_id;
            $deliveryType = $firstProduct->delivery_type ?? 'manual';

            $order = $user->orders()->create([
                'order_number'    => $orderNumber,
                'seller_id'       => $sellerId,
                'delivery_type'   => $deliveryType,
                'status'          => Order::STATUS_PROCESSING,
                'total_amount'    => $totalAmount,
                'escrow_amount'   => $totalAmount,
                'escrow_status'   => 'held',
                'auto_confirm_at' => now()->addHours($autoConfirmHours + 48),
            ]);

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

            // Escrow hold — debit buyer wallet
            $wallet = $user->wallet;
            $wallet->decrement('balance', $totalAmount);
            $wallet->transactions()->create([
                'type'           => 'purchase_hold',
                'status'         => 'hold',
                'amount'         => -$totalAmount,
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
            }

            return $order;
        });

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
            'amount'       => $totalAmount,
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
