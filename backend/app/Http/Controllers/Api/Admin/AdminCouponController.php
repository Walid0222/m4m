<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCouponController extends Controller
{
    public function index(): JsonResponse
    {
        $coupons = Coupon::query()
            ->orderByDesc('created_at')
            ->paginate(25);

        return $this->success($coupons);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'             => ['required', 'string', 'max:50', 'unique:coupons,code'],
            'discount_percent' => ['required', 'integer', 'min:1', 'max:100'],
            'max_uses'         => ['nullable', 'integer', 'min:1'],
            'expires_at'       => ['nullable', 'date'],
        ]);

        $coupon = Coupon::create([
            'code'             => strtoupper($validated['code']),
            'discount_percent' => $validated['discount_percent'],
            'max_uses'         => $validated['max_uses'] ?? null,
            'expires_at'       => $validated['expires_at'] ?? null,
        ]);

        return $this->success($coupon, 'Coupon created.', 201);
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        $coupon->delete();

        return $this->success(null, 'Coupon deleted.', 204);
    }
}

