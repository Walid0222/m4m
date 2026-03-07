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

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()
            ->orders()
            ->with(['orderItems.product:id,name,slug,user_id', 'orderItems.product.seller:id,name'])
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->success($orders);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        if ($order->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }

        $order->load(['orderItems.product:id,name,slug,price', 'buyer:id,name']);

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
        $order->load(['orderItems.product:id,name,slug,price', 'buyer:id,name']);

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

        $order = DB::transaction(function () use ($user, $totalAmount, $orderItems, $wallet) {
            $order = $user->orders()->create([
                'status' => Order::STATUS_PAID,
                'total_amount' => $totalAmount,
            ]);

            foreach ($orderItems as $oi) {
                $order->orderItems()->create($oi);
                Product::where('id', $oi['product_id'])->decrement('stock', $oi['quantity']);
            }

            $wallet->decrement('balance', $totalAmount);
            $wallet->transactions()->create([
                'type' => 'order_payment',
                'amount' => -$totalAmount,
                'balance_after' => $wallet->fresh()->balance,
                'reference_type' => Order::class,
                'reference_id' => $order->id,
                'description' => "Payment for order #{$order->id}",
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
