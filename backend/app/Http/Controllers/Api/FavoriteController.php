<?php

namespace App\Http\Controllers\Api;

use App\Models\Favorite;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    /** GET /favorites — list authenticated user's favorites */
    public function index(Request $request): JsonResponse
    {
        $favorites = Favorite::where('user_id', $request->user()->id)
            ->with(['product' => function ($q) {
                $q->with(['seller:id,name,is_verified_seller,last_activity_at']);
                $q->withCount([
                    'orderItems as completed_sales' => function ($q) {
                        $q->whereHas('order', fn ($o) => $o->where('status', 'completed'));
                    },
                    'orders as completed_orders_count' => function ($q) {
                        $q->where('status', \App\Models\Order::STATUS_COMPLETED);
                    },
                    'reviews',
                ])
                ->withAvg('reviews', 'rating');
            }])
            ->latest('created_at')
            ->paginate($request->integer('per_page', 24));

        $favorites->getCollection()->transform(function ($fav) {
            if ($fav->product) {
                $fav->product->hideAnalyticsForBuyers();
            }
            return $fav;
        });

        return $this->success($favorites);
    }

    /** POST /favorites/{product} — toggle favorite */
    public function toggle(Request $request, Product $product): JsonResponse
    {
        $userId = $request->user()->id;
        $existing = Favorite::where('user_id', $userId)->where('product_id', $product->id)->first();

        if ($existing) {
            $existing->delete();
            return $this->success(['favorited' => false], 'Removed from favorites.');
        }

        Favorite::create(['user_id' => $userId, 'product_id' => $product->id]);
        return $this->success(['favorited' => true], 'Added to favorites.', 201);
    }

    /** DELETE /favorites/{product} — remove favorite */
    public function destroy(Request $request, Product $product): JsonResponse
    {
        Favorite::where('user_id', $request->user()->id)
            ->where('product_id', $product->id)
            ->delete();

        return $this->success(null, 'Removed from favorites.');
    }

    /** GET /favorites/ids — just the product IDs (for quick UI checks) */
    public function ids(Request $request): JsonResponse
    {
        $ids = Favorite::where('user_id', $request->user()->id)->pluck('product_id');
        return $this->success($ids);
    }
}
