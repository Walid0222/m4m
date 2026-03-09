<?php

namespace App\Http\Controllers\Api;

use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    /**
     * Preview a coupon by code for the authenticated user.
     * Does not increment usage; actual use happens during checkout.
     */
    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
        ]);

        $code = strtoupper(trim($data['code']));

        $coupon = Coupon::where('code', $code)->first();
        if (! $coupon) {
            return $this->error('Invalid or expired coupon.', 422);
        }

        if ($coupon->expires_at && $coupon->expires_at->isPast()) {
            return $this->error('This coupon has expired.', 422);
        }

        if ($coupon->max_uses !== null && $coupon->max_uses > 0 && $coupon->uses >= $coupon->max_uses) {
            return $this->error('This coupon has reached its usage limit.', 422);
        }

        return $this->success([
            'code'             => $coupon->code,
            'discount_percent' => (int) $coupon->discount_percent,
            'max_uses'         => $coupon->max_uses,
            'uses'             => $coupon->uses,
            'expires_at'       => $coupon->expires_at?->toIso8601String(),
        ]);
    }
}

