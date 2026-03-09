<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\OrderItem;
use App\Notifications\OrderDeliveredNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->is_seller) {
            return $this->error('Forbidden. Seller access required.', 403);
        }

        $orderIds = OrderItem::whereIn('product_id', $request->user()->products()->pluck('id'))
            ->distinct()
            ->pluck('order_id');

        $orders = Order::whereIn('id', $orderIds)
            ->with(['orderItems.product:id,name,slug', 'buyer:id,name'])
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->success($orders);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        if (! $request->user()->is_seller) {
            return $this->error('Forbidden. Seller access required.', 403);
        }

        $sellerProductIds = $request->user()->products()->pluck('id');
        $hasItems = $order->orderItems()->whereIn('product_id', $sellerProductIds)->exists();

        if (! $hasItems) {
            return $this->error('Order not found or you are not the seller.', 404);
        }

        $order->load(['orderItems.product:id,name,slug,user_id', 'buyer:id,name']);
        $order->order_items = $order->orderItems->filter(fn ($item) => $sellerProductIds->contains($item->product_id))->values();

        return $this->success($order);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        if (! $request->user()->is_seller) {
            return $this->error('Forbidden. Seller access required.', 403);
        }

        $sellerProductIds = $request->user()->products()->pluck('id');
        $hasItems = $order->orderItems()->whereIn('product_id', $sellerProductIds)->exists();

        if (! $hasItems) {
            return $this->error('Order not found or you are not the seller.', 404);
        }

        $validated = $request->validate([
            'status' => ['required', 'in:processing,delivered,cancelled'],
        ]);

        $updates = ['status' => $validated['status']];

        if ($validated['status'] === 'delivered' && ! $order->delivered_at) {
            $autoConfirmHours = (int) config('platform.auto_confirm_hours', 24);
            $updates['delivered_at']    = now();
            $updates['auto_confirm_at'] = now()->addHours($autoConfirmHours);
        }

        $order->update($updates);

        // Notify buyer when order is marked delivered
        if ($validated['status'] === 'delivered') {
            $order->load('buyer');
            if ($order->buyer) {
                $order->buyer->notify(new OrderDeliveredNotification($order));
            }
        }

        return $this->success($order->fresh(), 'Order status updated.');
    }
}
