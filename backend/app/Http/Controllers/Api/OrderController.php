<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Wallet;
use App\Notifications\NewOrderNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()
            ->orders()
            ->with(['orderItems.product:id,name,slug,user_id,images', 'orderItems.product.seller:id,name,is_verified_seller'])
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->success($orders);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        if ($order->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }

        $order->load(['orderItems.product:id,name,slug,price,images', 'orderItems', 'buyer:id,name']);

        return $this->success($order);
    }

    public function confirmDelivery(Request $request, Order $order): JsonResponse
    {
        if ($order->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }

        if (strtolower($order->status) !== 'delivered') {
            return $this->error('Order must be delivered before you can confirm.', 422);
        }

        $order->update(['status' => Order::STATUS_COMPLETED]);
        $order->load(['orderItems.product:id,name,slug,price,images', 'orderItems', 'buyer:id,name']);

        return $this->success($order, 'Order marked as completed.');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $items = $validated['items'];
        $productIds = array_column($items, 'product_id');
        $products = Product::whereIn('id', $productIds)->where('status', 'active')->get()->keyBy('id');

        $orderItems = [];
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
            $unitPrice = (float) $product->price;
            $lineTotal = round($unitPrice * $qty, 2);
            $orderItems[] = [
                'product_id' => $product->id,
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'total_price' => $lineTotal,
            ];
            $totalAmount += $lineTotal;
        }

        $user = $request->user();
        $wallet = $user->wallet;
        if (! $wallet) {
            $wallet = $user->wallet()->create(['balance' => 0]);
        }

        if ((float) $wallet->balance < $totalAmount) {
            return $this->error('Insufficient wallet balance.', 422);
        }

        $order = DB::transaction(function () use ($user, $totalAmount, $orderItems, $wallet, $products) {
            // Generate unique order number M4M-XXXXXX
            do {
                $orderNumber = 'M4M-' . strtoupper(Str::random(6));
            } while (Order::where('order_number', $orderNumber)->exists());

            // Determine primary seller (first product's seller)
            $firstProductId = $orderItems[0]['product_id'];
            $firstProduct = $products->get($firstProductId);
            $sellerId = $firstProduct?->user_id;

            $order = $user->orders()->create([
                'order_number' => $orderNumber,
                'seller_id' => $sellerId,
                'status' => Order::STATUS_PAID,
                'total_amount' => $totalAmount,
            ]);

            $isInstant = false;
            foreach ($orderItems as $oi) {
                $product = $products->get($oi['product_id']);
                $credentials = null;

                if ($product && $product->delivery_type === 'instant' && $product->delivery_content) {
                    $lines = array_values(array_filter(explode("\n", trim($product->delivery_content))));
                    $credentials = implode("\n", array_splice($lines, 0, $oi['quantity']));
                    // Remove used credentials from the product
                    $remaining = implode("\n", $lines);
                    $product->update([
                        'delivery_content' => $remaining,
                        'stock' => max(0, $product->stock - $oi['quantity']),
                    ]);
                    $isInstant = true;
                } else {
                    Product::where('id', $oi['product_id'])->decrement('stock', $oi['quantity']);
                }

                $order->orderItems()->create(array_merge($oi, [
                    'delivery_credentials' => $credentials,
                ]));
            }

            // Auto-mark delivered for instant delivery
            if ($isInstant) {
                $order->update(['status' => Order::STATUS_DELIVERED]);
            }

            $wallet->decrement('balance', $totalAmount);
            $wallet->transactions()->create([
                'type' => 'order_payment',
                'amount' => -$totalAmount,
                'balance_after' => $wallet->fresh()->balance,
                'reference_type' => Order::class,
                'reference_id' => $order->id,
                'description' => "Payment for order #{$order->order_number}",
            ]);

            return $order;
        });

        $order->load(['orderItems.product:id,name,slug,user_id']);

        $sellerIds = $order->orderItems->pluck('product.user_id')->unique()->filter();
        foreach ($sellerIds as $sellerId) {
            $seller = \App\Models\User::find($sellerId);
            if ($seller) {
                $seller->notify(new NewOrderNotification($order));
            }
        }

        return $this->success($order->toArray(), 'Order placed successfully.', 201);
    }
}
