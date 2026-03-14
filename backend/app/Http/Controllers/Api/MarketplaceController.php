<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class MarketplaceController extends Controller
{
    /**
     * GET /marketplace/stats — public marketplace statistics for trust signals.
     */
    public function stats(): JsonResponse
    {
        $totalProducts = Product::where('status', 'active')->count();
        $totalSellers = User::where('is_seller', true)->count();
        $avg = Review::avg('rating');
        $averageRating = $avg !== null ? round((float) $avg, 1) : null;

        return $this->success([
            'total_products' => $totalProducts,
            'total_sellers'  => $totalSellers,
            'average_rating' => $averageRating,
        ]);
    }
}
