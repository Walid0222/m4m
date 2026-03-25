<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\OrderItem;
use App\Notifications\OrderDeliveredNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerOrderController extends Controller
{
    // ─── List seller orders ───────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->is_seller) {
            return $this->error('Forbidden. Seller access required.', 403);
        }

        $orderIds = OrderItem::whereIn('product_id', $request->user()->products()->pluck('id'))
            ->distinct()
            ->pluck('order_id');

        $orders = Order::whereIn('id', $orderIds)
            ->with([
                'orderItems.product:id,name,slug,delivery_type,delivery_time',
                'buyer:id,name',
                'dispute:id,order_id,admin_note,admin_decision,status',
            ])
            ->latest()
            ->paginate(min($request->integer('per_page', 15), 100));

        return $this->success($orders);
    }

    // ─── Single order detail (seller view) ────────────────────────────────────

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

        $order->load(['orderItems.product:id,name,slug,user_id,delivery_type,delivery_time', 'buyer:id,name']);
        $order->order_items = $order->orderItems
            ->filter(fn ($i) => $sellerProductIds->contains($i->product_id))
            ->values();

        return $this->success($order);
    }

    // ─── Update order status ──────────────────────────────────────────────────

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

        // Only allow transition to "delivered"; forbid setting processing, cancelled, or completed (state machine).
        if (in_array($validated['status'], ['processing', 'cancelled', 'completed'], true)) {
            return $this->error('This status cannot be set via this endpoint. Only marking as delivered is allowed.', 422);
        }

        $currentStatus = strtolower((string) $order->status);
        $allowedFromForDelivered = ['processing', 'pending', 'paid'];
        if ($validated['status'] === 'delivered' && ! in_array($currentStatus, $allowedFromForDelivered, true)) {
            return $this->error('Order can only be marked as delivered when its current status is processing, pending, or paid.', 422);
        }

        // Manual delivery: don't allow marking "delivered" without sending credentials first.
        // If the product is manual delivery and no delivery_content yet, require the deliver endpoint.
        $firstItem = $order->orderItems()->whereIn('product_id', $sellerProductIds)->with('product')->first();
        $isManual  = $firstItem?->product?->delivery_type !== 'instant';

        if ($validated['status'] === 'delivered' && $isManual && empty($order->delivery_content)) {
            return $this->error(
                'Please send the delivery content first using the deliver endpoint before marking as delivered.',
                422
            );
        }

        $updates = ['status' => $validated['status']];

        if ($validated['status'] === 'delivered' && ! $order->delivered_at) {
            $autoConfirmHours = (int) config('platform.auto_confirm_hours', 24);
            $updates['delivered_at']    = now();
            $updates['auto_confirm_at'] = now()->addHours($autoConfirmHours);
        }

        $order->update($updates);

        if ($validated['status'] === 'delivered') {
            $order->load('buyer');
            if ($order->buyer) {
                $order->buyer->notify(new OrderDeliveredNotification($order));
            }
        }

        return $this->success($order->fresh(), 'Order status updated.');
    }

    // ─── Manual delivery: seller sends credentials ────────────────────────────

    /**
     * POST /seller/orders/{order}/deliver
     *
     * Seller provides the delivery content (account credentials) for a
     * manual-delivery order. Automatically marks the order as delivered.
     *
     * Input: { delivery_content: "email:password\n..." }
     */
    public function deliver(Request $request, Order $order): JsonResponse
    {
        if (! $request->user()->is_seller) {
            return $this->error('Forbidden. Seller access required.', 403);
        }

        $sellerProductIds = $request->user()->products()->pluck('id');
        $hasItems = $order->orderItems()->whereIn('product_id', $sellerProductIds)->exists();

        if (! $hasItems) {
            return $this->error('Order not found or you are not the seller.', 404);
        }

        // Only manual delivery orders
        $firstItem = $order->orderItems()->whereIn('product_id', $sellerProductIds)->with('product')->first();
        if ($firstItem?->product?->delivery_type === 'instant') {
            return $this->error('Instant delivery orders are fulfilled automatically.', 422);
        }

        if (! in_array(strtolower($order->status), ['processing', 'pending', 'paid'])) {
            return $this->error('This order cannot be delivered in its current status.', 422);
        }

        $validated = $request->validate([
            'delivery_content' => ['required', 'string', 'max:5000'],
        ]);

        $autoConfirmHours = (int) config('platform.auto_confirm_hours', 24);
        $deliveredAt      = now();

        $order->update([
            'delivery_content' => $validated['delivery_content'],
            'status'           => Order::STATUS_DELIVERED,
            'delivered_at'     => $deliveredAt,
            'auto_confirm_at'  => $deliveredAt->copy()->addHours($autoConfirmHours),
        ]);

        // Log delivery for audit / dispute purposes
        \App\Models\AccountDelivery::create([
            'order_id'           => $order->id,
            'product_account_id' => null,
            'account_data'       => $validated['delivery_content'],
            'delivered_at'       => $deliveredAt,
        ]);

        // Notify buyer
        $order->load('buyer');
        if ($order->buyer) {
            $order->buyer->notify(new OrderDeliveredNotification($order));
        }

        return $this->success($order->fresh(), 'Delivery sent successfully. Order marked as delivered.');
    }

    // ─── Update seller note ──────────────────────────────────────────────────

    /**
     * PATCH /seller/orders/{order}/note
     *
     * Seller can add or update a note on the order.
     */
    public function updateNote(Request $request, Order $order): JsonResponse
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
            'seller_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $order->update(['seller_note' => $validated['seller_note'] ?? null]);

        return $this->success($order->fresh(), 'Seller note updated.');
    }
}
