<?php

namespace App\Http\Controllers\Api;

use App\Models\WalletSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletSettingsController extends Controller
{
    /**
     * Return current wallet/withdrawal rules for the authenticated user.
     */
    public function show(Request $request): JsonResponse
    {
        $settings = WalletSetting::current();

        return $this->success([
            'min_withdraw_amount'     => (float) $settings->min_withdraw_amount,
            'max_withdraw_amount'     => (float) $settings->max_withdraw_amount,
            'daily_withdraw_limit'    => (float) $settings->daily_withdraw_limit,
            'withdraw_cooldown_hours' => (int) $settings->withdraw_cooldown_hours,
            'max_pending_requests'    => (int) $settings->max_pending_requests,
        ]);
    }
}

