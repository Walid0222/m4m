<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function store(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $order = Order::findOrFail($validated['order_id']);
        if ($order->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }
        if (strtolower($order->status) !== 'completed') {
            return $this->error('Order must be completed before you can leave a review.', 422);
        }
        if (! $order->orderItems()->where('product_id', $product->id)->exists()) {
            return $this->error('This order does not contain this product.', 422);
        }
        if ($order->reviews()->where('product_id', $product->id)->exists()) {
            return $this->error('You have already reviewed this product for this order.', 422);
        }

        $review = Review::create([
            'user_id' => $request->user()->id,
            'order_id' => $order->id,
            'product_id' => $product->id,
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null,
        ]);

        $review->load('reviewer:id,name');

        return $this->success($review, 'Review submitted.', 201);
    }
}
