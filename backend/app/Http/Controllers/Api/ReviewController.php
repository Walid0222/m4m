<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * GET /reviews?seller_id={id}&page=1&per_page=3
     *
     * Paginated reviews for a seller's products (public).
     * Products are owned by the seller via products.user_id.
     */
    public function index(Request $request): JsonResponse
    {
        $sellerId = $request->integer('seller_id', 0);
        if ($sellerId <= 0) {
            return $this->error('seller_id is required.', 422);
        }

        $seller = User::find($sellerId);
        if (! $seller || ! $seller->is_seller) {
            return $this->error('Seller not found.', 404);
        }

        $perPage = min(max($request->integer('per_page', 3), 1), 50);

        $paginator = Review::query()
            ->with(['product:id,name', 'reviewer:id,name'])
            ->whereHas('product', fn ($q) => $q->where('user_id', $sellerId))
            ->latest()
            ->paginate($perPage);

        $items = $paginator->getCollection()->map(function (Review $r) {
            $name = $r->reviewer?->name ?? 'Buyer';
            $anon = strlen($name) >= 2
                ? (mb_substr($name, 0, 1) . '***' . mb_substr($name, -1))
                : 'B***r';

            return [
                'id'           => $r->id,
                'rating'       => (int) $r->rating,
                'comment'      => $r->comment,
                'created_at'   => $r->created_at?->toIso8601String(),
                'product_name' => $r->product?->name,
                'buyer'        => $anon,
            ];
        })->values()->all();

        return $this->success([
            'data'         => $items,
            'current_page' => $paginator->currentPage(),
            'last_page'    => $paginator->lastPage(),
            'total'        => $paginator->total(),
            'per_page'     => $paginator->perPage(),
        ]);
    }

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
