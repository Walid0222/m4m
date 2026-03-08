<?php

namespace App\Http\Controllers\Api;

use App\Models\OrderItem;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerProfileController extends Controller
{
    /**
     * Public seller profile with stats (rating, total sales, total reviews).
     */
    public function show(Request $request, User $seller): JsonResponse
    {
        if (! $seller->is_seller) {
            return $this->error('User is not a seller.', 404);
        }

        $productIds = $seller->products()->pluck('id');

        $reviews = Review::whereIn('product_id', $productIds)->get();
        $totalReviews = $reviews->count();
        $rating = $totalReviews > 0
            ? round($reviews->avg('rating'), 1)
            : null;

        $totalSales = OrderItem::whereIn('product_id', $productIds)->sum('quantity');

        $data = [
            'id' => $seller->id,
            'name' => $seller->name,
            'last_activity_at' => $seller->last_activity_at?->toIso8601String(),
            'rating' => $rating,
            'total_sales' => (int) $totalSales,
            'total_reviews' => $totalReviews,
        ];

        return $this->success($data);
    }
}
