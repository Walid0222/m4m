<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\WalletSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = WalletSetting::current();

        return $this->success($settings);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'min_withdraw_amount'     => ['nullable', 'numeric', 'min:0'],
            'max_withdraw_amount'     => ['nullable', 'numeric', 'min:0'],
            'daily_withdraw_limit'    => ['nullable', 'numeric', 'min:0'],
            'withdraw_cooldown_hours' => ['nullable', 'integer', 'min:0'],
            'max_pending_requests'    => ['nullable', 'integer', 'min:0'],
        ]);

        $settings = WalletSetting::current();
        $settings->fill(array_filter($validated, static fn ($value) => $value !== null));
        $settings->save();

        return $this->success($settings->fresh(), 'Wallet settings updated.');
    }
}

