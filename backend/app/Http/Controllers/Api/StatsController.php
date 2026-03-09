<?php

namespace App\Http\Controllers\Api;

use App\Models\BuyerStat;
use App\Models\Review;
use App\Models\SellerStat;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatsController extends Controller
{
    /**
     * Return seller stats + badge for the authenticated seller.
     */
    public function sellerStats(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->is_seller) {
            return $this->error('Seller access required.', 403);
        }

        $stats = SellerStat::firstOrCreate(['seller_id' => $user->id]);

        // Recalculate rating live
        $reviews = Review::whereIn('product_id', $user->products()->pluck('id'))->get();
        if ($reviews->count() > 0) {
            $stats->update([
                'rating_average' => round($reviews->avg('rating'), 2),
                'rating_count'   => $reviews->count(),
            ]);
            $stats->refresh();
        }

        return $this->success([
            'seller_id'      => $stats->seller_id,
            'total_sales'    => $stats->total_sales,
            'total_orders'   => $stats->total_orders,
            'total_revenue'  => (float) $stats->total_revenue,
            'rating_average' => (float) $stats->rating_average,
            'rating_count'   => $stats->rating_count,
            'dispute_count'  => $stats->dispute_count,
            'badge'          => $stats->badge,
            'is_verified'    => (bool) $user->is_verified_seller,
        ]);
    }

    /**
     * Return buyer stats + badge for the authenticated user.
     */
    public function buyerStats(Request $request): JsonResponse
    {
        $user  = $request->user();
        $stats = BuyerStat::firstOrCreate(['buyer_id' => $user->id]);

        return $this->success([
            'buyer_id'        => $stats->buyer_id,
            'total_purchases' => $stats->total_purchases,
            'total_orders'    => $stats->total_orders,
            'total_spent'     => (float) $stats->total_spent,
            'reviews_given'   => $stats->reviews_given,
            'dispute_count'   => $stats->dispute_count,
            'badge'           => $stats->badge,
        ]);
    }

    /**
     * Return public seller stats for a given seller (used on seller profile page).
     */
    public function publicSellerStats(int $sellerId): JsonResponse
    {
        $stats = SellerStat::where('seller_id', $sellerId)->first();
        $user  = \App\Models\User::find($sellerId);

        if (! $user || ! $user->is_seller) {
            return $this->error('Seller not found.', 404);
        }

        return $this->success([
            'seller_id'      => $sellerId,
            'total_sales'    => $stats?->total_sales ?? 0,
            'rating_average' => $stats ? (float) $stats->rating_average : 0,
            'rating_count'   => $stats?->rating_count ?? 0,
            'badge'          => $stats?->badge ?? 'new',
            'is_verified'    => (bool) $user->is_verified_seller,
        ]);
    }
}
