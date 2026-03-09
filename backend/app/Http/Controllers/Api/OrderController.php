<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\Product;
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

    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()
            ->orders()
            ->with([
                'orderItems.product:id,name,slug,user_id,images',
                'orderItems.product.seller:id,name,is_verified_seller',
                'dispute:id,order_id,status',
            ])
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->success($orders);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        if ($order->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }

        $order->load([
            'orderItems.product:id,name,slug,price,images',
            'orderItems',
            'buyer:id,name',
            'dispute:id,order_id,status,reason',
        ]);

        return $this->success($order);
    }

    public function confirmDelivery(Request $request, Order $order): JsonResponse
    {
        if ($order->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }

        if (strtolower($order->status) !== 'delivered') {
            return $this->error('Order must be in delivered status before confirming.', 422);
        }

        DB::transaction(function () use ($order, $request) {
            $order->update([
                'status'       => Order::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);

            // Release escrow → seller payout + commission
            $this->escrow->releaseFunds($order);
        });

        $order->load([
            'orderItems.product:id,name,slug,price,images',
            'orderItems',
            'buyer:id,name',
            'seller:id,name',
        ]);

        // Notify both parties
        if ($order->seller) {
            $order->seller->notify(new OrderCompletedNotification($order));
        }
        $request->user()->notify(new OrderCompletedNotification($order));

        return $this->success($order, 'Order confirmed. Payment released to seller.');
    }

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

        $orderItems  = [];
        $totalAmount = 0;

        foreach ($items as $item) {
            $product = $products->get($item['product_id']);
            if (! $product) {
                return $this->error("Product {$item['product_id']} not found or not available.", 422);
            }
            $qty = (int) $item['quantity'];
            if ($product->stock < $qty) {
                return $this->error("Insufficient stock for product: {$product->name}. Available: {$product->stock}", 422);
            }
            $unitPrice  = (float) $product->price;
            $lineTotal  = round($unitPrice * $qty, 2);
            $orderItems[] = [
                'product_id'  => $product->id,
                'quantity'    => $qty,
                'unit_price'  => $unitPrice,
                'total_price' => $lineTotal,
            ];
            $totalAmount += $lineTotal;
        }

        $user   = $request->user();
        $wallet = $user->wallet ?? $user->wallet()->create(['balance' => 0]);

        if ((float) $wallet->balance < $totalAmount) {
            return $this->error('Insufficient wallet balance.', 422);
        }

        $autoConfirmHours = (int) config('platform.auto_confirm_hours', 24);

        $order = DB::transaction(function () use ($user, $totalAmount, $orderItems, $products, $autoConfirmHours) {
            do {
                $orderNumber = 'M4M-' . strtoupper(Str::random(6));
            } while (Order::where('order_number', $orderNumber)->exists());

            $firstProduct = $products->get($orderItems[0]['product_id']);
            $sellerId     = $firstProduct?->user_id;

            $order = $user->orders()->create([
                'order_number'    => $orderNumber,
                'seller_id'       => $sellerId,
                'status'          => Order::STATUS_PROCESSING,
                'total_amount'    => $totalAmount,
                'escrow_amount'   => $totalAmount,
                'escrow_status'   => 'held',
                'auto_confirm_at' => now()->addHours($autoConfirmHours + 48), // buffer: delivered_at + 24h; set properly on delivery
            ]);

            $isInstant = false;
            foreach ($orderItems as $oi) {
                $product     = $products->get($oi['product_id']);
                $credentials = null;

                if ($product && $product->delivery_type === 'instant' && $product->delivery_content) {
                    $lines       = array_values(array_filter(explode("\n", trim($product->delivery_content))));
                    $credentials = implode("\n", array_splice($lines, 0, $oi['quantity']));
                    $remaining   = implode("\n", $lines);
                    $product->update([
                        'delivery_content' => $remaining,
                        'stock'            => max(0, $product->stock - $oi['quantity']),
                    ]);
                    $isInstant = true;
                } else {
                    Product::where('id', $oi['product_id'])->decrement('stock', $oi['quantity']);
                }

                $order->orderItems()->create(array_merge($oi, [
                    'delivery_credentials' => $credentials,
                ]));
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

            // Instant delivery → mark delivered immediately + set auto-confirm timer
            if ($isInstant) {
                $deliveredAt = now();
                $order->update([
                    'status'          => Order::STATUS_DELIVERED,
                    'delivered_at'    => $deliveredAt,
                    'auto_confirm_at' => $deliveredAt->addHours($autoConfirmHours),
                ]);
            }

            return $order;
        });

        $order->load(['orderItems.product:id,name,slug,user_id']);

        // Notify seller(s)
        $sellerIds = $order->orderItems->pluck('product.user_id')->unique()->filter();
        foreach ($sellerIds as $sid) {
            $seller = \App\Models\User::find($sid);
            if ($seller) {
                $seller->notify(new NewOrderNotification($order));
            }
        }

        // For instant delivery, also notify the buyer that it's already delivered
        if ($order->status === Order::STATUS_DELIVERED) {
            $user->notify(new OrderDeliveredNotification($order));
        }

        // Security log
        SecurityLogService::log($user, 'purchase', $request, [
            'order_id'     => $order->id,
            'order_number' => $order->order_number,
            'amount'       => $totalAmount,
        ]);

        return $this->success($order->toArray(), 'Order placed successfully.', 201);
    }
}
