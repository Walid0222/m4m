<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\ReferralAttribution;
use App\Models\ReferralCode;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAffiliateController extends Controller
{
    /**
     * Platform-wide affiliate statistics and lists for admin dashboard.
     *
     * GET /admin/affiliates
     */
    public function index(Request $request): JsonResponse
    {
        $totalCommissionsPaid = (float) ReferralAttribution::where('status', 'paid')
            ->sum(DB::raw('COALESCE(affiliate_amount, 0)'));

        $totalPendingCommissions = (float) ReferralAttribution::where('status', 'pending')
            ->sum(DB::raw('COALESCE(affiliate_amount, 0)'));

        $totalOrdersWithReferral = ReferralAttribution::count();

        $totalReferralCodes = ReferralCode::count();

        $topAffiliatesRows = ReferralAttribution::query()
            ->join('referral_codes', 'referral_attributions.referral_code_id', '=', 'referral_codes.id')
            ->where('referral_attributions.status', 'paid')
            ->select(
                'referral_codes.owner_user_id as user_id',
                DB::raw('SUM(COALESCE(referral_attributions.affiliate_amount, 0)) as total_earned'),
                DB::raw('COUNT(*) as orders_count')
            )
            ->groupBy('referral_codes.owner_user_id')
            ->orderByDesc('total_earned')
            ->limit(20)
            ->get();

        $ownerIds = $topAffiliatesRows->pluck('user_id')->unique()->filter()->values()->all();
        $usersById = User::whereIn('id', $ownerIds)->get(['id', 'name', 'email'])->keyBy('id');

        $topAffiliates = $topAffiliatesRows->map(function ($row) use ($usersById) {
            $user = $usersById[$row->user_id] ?? null;

            return [
                'user_id' => (int) $row->user_id,
                'name' => $user?->name ?? '—',
                'email' => $user?->email ?? '—',
                'total_earned' => (float) $row->total_earned,
                'orders_count' => (int) $row->orders_count,
            ];
        })->values()->all();

        $paidByCode = ReferralAttribution::query()
            ->where('status', 'paid')
            ->select('referral_code_id', DB::raw('SUM(COALESCE(affiliate_amount, 0)) as total_earned'))
            ->groupBy('referral_code_id')
            ->get()
            ->keyBy('referral_code_id');

        $referralCodes = ReferralCode::with('owner:id,name,email')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(function (ReferralCode $code) use ($paidByCode) {
                $earned = $paidByCode[$code->id]?->total_earned ?? 0;

                return [
                    'code' => $code->code,
                    'owner_id' => (int) $code->owner_user_id,
                    'owner_name' => $code->owner?->name ?? '—',
                    'uses' => (int) ($code->uses ?? 0),
                    'total_earned' => (float) $earned,
                    'status' => $code->status ?? 'active',
                    'created_at' => $code->created_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        $attributions = ReferralAttribution::query()
            ->with(['referralCode:id,code,owner_user_id'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(function (ReferralAttribution $attr) {
                $referralCode = $attr->referralCode;

                return [
                    'order_id' => (int) $attr->order_id,
                    'referral_code' => $referralCode?->code ?? '—',
                    'buyer_id' => (int) $attr->buyer_user_id,
                    'affiliate_id' => $referralCode ? (int) $referralCode->owner_user_id : null,
                    'affiliate_amount' => (float) ($attr->affiliate_amount ?? 0),
                    'status' => $attr->status ?? 'pending',
                    'created_at' => $attr->created_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        return $this->success([
            'total_commissions_paid' => $totalCommissionsPaid,
            'total_orders_with_referral' => $totalOrdersWithReferral,
            'total_referral_codes' => $totalReferralCodes,
            'total_pending_commissions' => $totalPendingCommissions,
            'top_affiliates' => $topAffiliates,
            'referral_codes' => $referralCodes,
            'attributions' => $attributions,
        ]);
    }
}
