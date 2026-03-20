<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\ReferralAttribution;
use App\Models\WalletTransaction;
use App\Services\EscrowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DebugEscrowController extends Controller
{
    /**
     * TEMP: testing-only endpoint. Remove once payout flow is verified.
     *
     * POST /api/v1/debug/release-latest-order
     */
    public function releaseLatestHeldOrder(Request $request, EscrowService $escrow): JsonResponse
    {
        $order = Order::latest()->first();
        if (! $order) {
            return $this->error('No orders found.', 404);
        }

        // Safety: only allow releasing orders that are still held.
        if ($order->escrow_status !== 'held') {
            return $this->error('Latest order is not in held escrow state.', 422);
        }

        $escrow->forceReleaseForDisputeResolution($order);
        $order->refresh();

        // Seller amount: read from wallet transaction created by EscrowService.
        $sellerTxn = WalletTransaction::query()
            ->where('type', 'seller_payout')
            ->where('reference_type', Order::class)
            ->where('reference_id', $order->id)
            ->orderByDesc('id')
            ->first();

        $sellerAmount = $sellerTxn ? (float) $sellerTxn->amount : null;

        // Affiliate / platform share: stored on referral attribution when referral exists.
        $attribution = ReferralAttribution::query()
            ->where('order_id', $order->id)
            ->first();

        $affiliateAmount = $attribution ? (float) ($attribution->affiliate_amount ?? 0) : null;
        $platformFee = $attribution ? (float) ($attribution->platform_fee_amount ?? 0) : null;

        return $this->success([
            'order_id'        => $order->id,
            'escrow_status'   => $order->escrow_status,
            'seller_amount'   => $sellerAmount,
            'platform_fee'    => $platformFee,
            'affiliate_amount' => $affiliateAmount,
            'completed_at'    => $order->completed_at?->toIso8601String(),
            'referral_attribution' => $attribution?->status ?? null,
        ], 'Debug release executed. TEMP endpoint; remove after testing.');
    }
}

