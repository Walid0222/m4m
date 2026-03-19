<?php

namespace App\Http\Controllers\Api;

use App\Models\ReferralAttribution;
use App\Models\ReferralCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AffiliateController extends Controller
{
    /**
     * Create or return existing referral code for the authenticated user.
     * POST /referral-code/create
     */
    public function createReferralCode(Request $request): JsonResponse
    {
        $user = $request->user();

        $existing = ReferralCode::where('owner_user_id', $user->id)->first();
        if ($existing) {
            return $this->success([
                'code' => $existing->code,
                'created' => false,
            ]);
        }

        $attempts = 0;
        $maxAttempts = 20;
        do {
            $length = random_int(6, 8);
            $code = strtoupper(Str::random($length));
            $exists = ReferralCode::where('code', $code)->exists();
            $attempts++;
        } while ($exists && $attempts < $maxAttempts);

        if ($exists) {
            return $this->error('Could not generate unique code. Please try again.', 500);
        }

        $referralCode = ReferralCode::create([
            'owner_user_id' => $user->id,
            'code' => $code,
            'status' => 'active',
        ]);

        return $this->success([
            'code' => $referralCode->code,
            'created' => true,
        ]);
    }

    /**
     * Affiliate / referral dashboard (aggregated stats).
     *
     * Returns only data for referral codes owned by the authenticated user.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();

        $codes = ReferralCode::query()
            ->where('owner_user_id', $user->id)
            ->get(['id', 'code', 'uses']);

        if ($codes->isEmpty()) {
            return $this->success([
                'total_earnings' => 0.0,
                'total_orders' => 0,
                'total_pending' => 0.0,
                'total_paid' => 0,
                'total_refunded' => 0,
                'referral_codes' => [],
                'referrals' => [],
            ]);
        }

        $codeIds = $codes->pluck('id')->all();

        $totalOrders = ReferralAttribution::whereIn('referral_code_id', $codeIds)->count();

        $totalEarnings = (float) ReferralAttribution::whereIn('referral_code_id', $codeIds)
            ->where('status', 'paid')
            ->sum(DB::raw('COALESCE(affiliate_amount, 0)'));

        $totalPending = (float) ReferralAttribution::whereIn('referral_code_id', $codeIds)
            ->where('status', 'pending')
            ->sum(DB::raw('COALESCE(affiliate_amount, 0)'));

        $totalPaidCount = ReferralAttribution::whereIn('referral_code_id', $codeIds)
            ->where('status', 'paid')
            ->count();

        $totalRefundedCount = ReferralAttribution::whereIn('referral_code_id', $codeIds)
            ->where('status', 'refunded')
            ->count();

        $paidByCode = ReferralAttribution::query()
            ->select('referral_code_id', DB::raw('SUM(COALESCE(affiliate_amount, 0)) as total_earned'))
            ->whereIn('referral_code_id', $codeIds)
            ->where('status', 'paid')
            ->groupBy('referral_code_id')
            ->get()
            ->keyBy('referral_code_id');

        $referralCodesPayload = $codes->map(function (ReferralCode $code) use ($paidByCode) {
            $earned = $paidByCode[$code->id]->total_earned ?? 0;

            return [
                'code' => $code->code,
                'uses' => (int) $code->uses,
                'total_earned' => (float) $earned,
            ];
        })->values();

        $referralsPayload = ReferralAttribution::query()
            ->whereIn('referral_code_id', $codeIds)
            ->orderByDesc('created_at')
            ->get(['order_id', 'buyer_user_id', 'status', 'affiliate_amount', 'created_at'])
            ->map(function ($attr) {
                return [
                    'order_id' => (int) $attr->order_id,
                    'buyer_id' => (int) $attr->buyer_user_id,
                    'status' => $attr->status,
                    'affiliate_amount' => (float) ($attr->affiliate_amount ?? 0),
                    'created_at' => $attr->created_at?->toIso8601String(),
                ];
            })
            ->values();

        return $this->success([
            'total_earnings' => $totalEarnings,
            'total_orders' => (int) $totalOrders,
            'total_pending' => $totalPending,
            'total_paid' => (int) $totalPaidCount,
            'total_refunded' => (int) $totalRefundedCount,
            'referral_codes' => $referralCodesPayload,
            'referrals' => $referralsPayload,
        ]);
    }
}

