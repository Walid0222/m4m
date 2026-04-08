<?php

namespace App\Http\Controllers\Api;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
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
            // Backward-compatible: frontend currently sends `code`.
            'code' => ['nullable', 'string', 'max:50'],
            // New key name (per spec).
            'coupon_code' => ['nullable', 'string', 'max:50'],
            // Optional pricing inputs (only needed for computed preview).
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'quantity' => ['nullable', 'integer', 'min:1'],
        ]);

        $rawCode = $data['coupon_code'] ?? $data['code'] ?? null;
        if (! is_string($rawCode) || trim($rawCode) === '') {
            return $this->error('Coupon code is required.', 422);
        }

        $code = strtoupper(trim($rawCode));

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

        // If product_id + quantity are provided, compute real capped discount preview.
        $canCompute = isset($data['product_id'], $data['quantity']) && $data['product_id'] && $data['quantity'];

        $subtotal = 0.0;
        $requestedDiscount = 0.0;
        $appliedDiscount = 0.0;
        $discountCapped = false;
        $finalTotal = 0.0;

        if ($canCompute) {
            /** @var Product|null $product */
            $product = Product::find((int) $data['product_id']);
            if ($product) {
                $qty = (int) $data['quantity'];
                $unitPrice = (float) ($product->effective_price ?? $product->price);
                $subtotal = round($unitPrice * $qty, 2);

                $sellerId = (int) $product->user_id;
                $completedOrders = Order::where('seller_id', $sellerId)
                    ->where('status', Order::STATUS_COMPLETED)
                    ->count();

                // Must stay in sync with OrderController::commissionPercentForSeller().
                $commissionPct = $completedOrders >= 10 ? 8.0 : 5.0;

                $baseCommission = round($subtotal * ($commissionPct / 100), 2);

                $percent = max(0, min(100, (int) $coupon->discount_percent));
                $requestedDiscount = round($subtotal * ($percent / 100), 2);
                $appliedDiscount = min($requestedDiscount, $baseCommission);
                $discountCapped = $requestedDiscount > $appliedDiscount;

                $finalTotal = max(0.0, round($subtotal - $appliedDiscount, 2));
            }
        }

        $response = [
            'code'             => $coupon->code,
            'discount_percent' => (int) $coupon->discount_percent,
            'max_uses'         => $coupon->max_uses,
            'uses'             => $coupon->uses,
            'expires_at'       => $coupon->expires_at?->toIso8601String(),
        ];

        // Always include computed fields (either real computed values or zeros).
        // Frontend can ignore these when it only needs discount_percent.
        $response['subtotal'] = $subtotal;
        $response['requested_discount'] = $requestedDiscount;
        $response['applied_discount'] = $appliedDiscount;
        $response['discount_capped'] = $discountCapped;
        $response['final_total'] = $finalTotal;

        return $this->success($response);
    }
}

