<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerEscrowController extends Controller
{
    /**
     * Return escrow overview for the authenticated seller.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->is_seller) {
            return $this->error('Seller access required.', 403);
        }

        $wallet = $user->wallet;
        if (! $wallet) {
            $wallet = $user->wallet()->create(['balance' => 0]);
        }

        $pendingOrders = Order::where('seller_id', $user->id)
            ->where('escrow_status', 'pending_release')
            ->orderBy('release_at')
            ->get(['id', 'order_number', 'escrow_amount', 'total_amount', 'release_at', 'status']);

        $pendingEscrowBalance = 0.0;
        $nextReleaseAt = null;

        foreach ($pendingOrders as $order) {
            $amount = (float) ($order->escrow_amount ?: $order->total_amount);
            $pendingEscrowBalance += $amount;

            if ($order->release_at && ($nextReleaseAt === null || $order->release_at->lt($nextReleaseAt))) {
                $nextReleaseAt = $order->release_at;
            }
        }

        $payload = $pendingOrders->map(function ($order) {
            $amount = (float) ($order->escrow_amount ?: $order->total_amount);

            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'amount' => $amount,
                'release_at' => $order->release_at?->toIso8601String(),
                'status' => $order->status,
            ];
        });

        return $this->success([
            'wallet_balance' => (float) $wallet->balance,
            'pending_escrow_balance' => $pendingEscrowBalance,
            'next_release_at' => $nextReleaseAt?->format('Y-m-d H:i:s'),
            'pending_orders' => $payload,
        ]);
    }
}
