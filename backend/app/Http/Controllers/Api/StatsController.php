<?php

namespace App\Http\Controllers\Api;

use App\Models\BuyerStat;
use App\Models\Review;
use App\Models\SellerStat;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Order;
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

        $completedOrders = (int) $stats->total_orders;
        $sellerLevel     = (int) floor($completedOrders / 2);

        $successRate        = $this->successRate($user->id);
        $avgResponseMinutes = $this->averageSellerResponseMinutes($user->id);

        // Commission progression
        [$commissionRate, $nextThreshold] = $this->commissionInfo($completedOrders);

        return $this->success([
            'seller_id'                 => $stats->seller_id,
            'total_sales'               => $stats->total_sales,
            'total_orders'              => $stats->total_orders,
            'completed_orders'          => $completedOrders,
            'total_revenue'             => (float) $stats->total_revenue,
            'rating_average'            => (float) $stats->rating_average,
            'rating_count'              => $stats->rating_count,
            'dispute_count'             => $stats->dispute_count,
            'badge'                     => $stats->badge,
            'is_verified'               => (bool) $user->is_verified_seller,
            'seller_level'              => $sellerLevel,
            'success_rate'              => $successRate,
            'avg_response_minutes'      => $avgResponseMinutes,
            'commission_rate'           => $commissionRate,
            'next_commission_threshold' => $nextThreshold,
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

        $completedOrders = (int) ($stats?->total_orders ?? 0);
        $sellerLevel     = (int) floor($completedOrders / 2);

        $successRate        = $this->successRate($sellerId);
        $avgResponseMinutes = $this->averageSellerResponseMinutes($sellerId);

        return $this->success([
            'seller_id'        => $sellerId,
            'total_sales'      => $stats?->total_sales ?? 0,
            'total_orders'     => $completedOrders,
            'rating_average'   => $stats ? (float) $stats->rating_average : 0,
            'rating_count'     => $stats?->rating_count ?? 0,
            'badge'            => $stats?->badge ?? 'new',
            'is_verified'      => (bool) $user->is_verified_seller,
            'seller_level'     => $sellerLevel,
            'success_rate'     => $successRate,
            'avg_response_minutes' => $avgResponseMinutes,
        ]);
    }

    /**
     * Commission rate and next threshold for given completed orders.
     *
     * @return array{0: float, 1: int|null}
     */
    private function commissionInfo(int $completedOrders): array
    {
        if ($completedOrders >= 100) {
            return [8.0, null];
        }
        if ($completedOrders >= 20) {
            return [10.0, 100];
        }
        if ($completedOrders >= 10) {
            return [12.0, 20];
        }

        return [15.0, 10];
    }

    /**
     * Compute seller success rate based on completed vs all non-cancelled orders.
     */
    private function successRate(int $sellerId): ?float
    {
        $total = Order::where('seller_id', $sellerId)
            ->whereNotIn('status', [Order::STATUS_CANCELLED, Order::STATUS_DISPUTE])
            ->count();

        if ($total === 0) {
            return null;
        }

        $completed = Order::where('seller_id', $sellerId)
            ->where('status', Order::STATUS_COMPLETED)
            ->count();

        return round(($completed / $total) * 100, 1);
    }

    /**
     * Approximate average first response time (in minutes) for a seller.
     */
    private function averageSellerResponseMinutes(int $sellerId): ?float
    {
        $conversations = Conversation::query()
            ->where(function ($q) use ($sellerId) {
                $q->where('user_one_id', $sellerId)
                    ->orWhere('user_two_id', $sellerId);
            })
            ->where(function ($q) {
                $q->whereNull('type')->orWhere('type', '!=', 'support');
            })
            ->get();

        if ($conversations->isEmpty()) {
            return null;
        }

        $totalMinutes = 0.0;
        $pairCount    = 0;

        foreach ($conversations as $conversation) {
            $messages = Message::query()
                ->where('conversation_id', $conversation->id)
                ->orderBy('created_at')
                ->get(['user_id', 'created_at']);

            $lastBuyerMessageAt = null;

            foreach ($messages as $message) {
                if ($message->user_id === $sellerId) {
                    if ($lastBuyerMessageAt) {
                        $diffMinutes = $lastBuyerMessageAt->diffInMinutes($message->created_at);
                        $totalMinutes += $diffMinutes;
                        $pairCount++;
                        $lastBuyerMessageAt = null;
                    }
                } else {
                    $lastBuyerMessageAt = $message->created_at;
                }
            }
        }

        if ($pairCount === 0) {
            return null;
        }

        return round($totalMinutes / $pairCount, 1);
    }
}
