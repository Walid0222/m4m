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

        // Orders where money is still being processed (held or scheduled for release)
        $processingOrders = Order::where('seller_id', $user->id)
            ->whereIn('escrow_status', ['held', 'pending_release'])
            ->orderByRaw("CASE WHEN release_at IS NULL THEN 1 ELSE 0 END, release_at ASC")
            ->get(['id', 'order_number', 'escrow_amount', 'total_amount', 'release_at', 'status', 'escrow_status']);

        // Orders where funds are under review (disputed)
        $disputedOrders = Order::where('seller_id', $user->id)
            ->where('escrow_status', 'disputed')
            ->latest()
            ->get(['id', 'order_number', 'escrow_amount', 'total_amount', 'release_at', 'status', 'escrow_status']);

        $processingBalance = 0.0;
        $disputedBalance   = 0.0;
        $nextReleaseAt     = null;

        foreach ($processingOrders as $order) {
            $amount = (float) ($order->escrow_amount ?: $order->total_amount);
            $processingBalance += $amount;

            if ($order->release_at && ($nextReleaseAt === null || $order->release_at->lt($nextReleaseAt))) {
                $nextReleaseAt = $order->release_at;
            }
        }

        foreach ($disputedOrders as $order) {
            $amount = (float) ($order->escrow_amount ?: $order->total_amount);
            $disputedBalance += $amount;
        }

        // Total earnings from completed seller payouts
        $totalEarnings = (float) $wallet->transactions()
            ->where('type', 'seller_payout')
            ->sum('amount');

        $pendingPayload = $processingOrders->map(function ($order) {
            $amount = (float) ($order->escrow_amount ?: $order->total_amount);

            return [
                'id'           => $order->id,
                'order_number' => $order->order_number,
                'amount'       => $amount,
                'release_at'   => $order->release_at?->toIso8601String(),
                'status'       => $order->status,
                'escrow_status'=> $order->escrow_status,
            ];
        });

        $disputedPayload = $disputedOrders->map(function ($order) {
            $amount = (float) ($order->escrow_amount ?: $order->total_amount);

            return [
                'id'           => $order->id,
                'order_number' => $order->order_number,
                'amount'       => $amount,
                'release_at'   => $order->release_at?->toIso8601String(),
                'status'       => $order->status,
                'escrow_status'=> $order->escrow_status,
            ];
        });

        return $this->success([
            'wallet_balance'          => (float) $wallet->balance,
            'processing_escrow_balance' => $processingBalance,
            'disputed_escrow_balance' => $disputedBalance,
            'next_release_at'         => $nextReleaseAt?->format('Y-m-d H:i:s'),
            'pending_orders'          => $pendingPayload,
            'disputed_orders'         => $disputedPayload,
            'total_earnings'          => $totalEarnings,
        ]);
    }
}
