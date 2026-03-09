<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerVacationController extends Controller
{
    /**
     * POST /seller/vacation-mode
     *
     * Toggle vacation mode for the authenticated seller.
     * If vacation_mode = true → set to false
     * If vacation_mode = false → set to true
     */
    public function toggle(Request $request): JsonResponse
    {
        if (! $request->user()->is_seller) {
            return $this->error('Forbidden. Seller access required.', 403);
        }

        $user = $request->user();
        $user->update(['vacation_mode' => ! $user->vacation_mode]);

        return $this->success($user->fresh(), 'Vacation mode updated.');
    }
}
