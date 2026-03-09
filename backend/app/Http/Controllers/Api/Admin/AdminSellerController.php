<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\User;
use App\Notifications\SellerBannedNotification;
use App\Notifications\SellerUnbannedNotification;
use App\Services\AdminLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSellerController extends Controller
{
    public function ban(Request $request, User $seller): JsonResponse
    {
        $validated = $request->validate([
            'type'   => ['required', 'in:temporary,permanent'],
            'days'   => ['nullable', 'integer', 'min:1'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $bannedUntil = $validated['type'] === 'temporary'
            ? now()->addDays($validated['days'] ?? 7)
            : null;

        $seller->update([
            'is_banned'    => true,
            'ban_type'     => $validated['type'],
            'banned_until' => $bannedUntil,
        ]);

        // Revoke all active tokens so the seller is immediately logged out
        $seller->tokens()->delete();

        $seller->notify(new SellerBannedNotification(
            banType: $validated['type'],
            bannedUntil: $bannedUntil?->toDateString(),
            reason: $validated['reason'] ?? null,
        ));

        AdminLogService::log(
            $request->user(),
            'ban_seller',
            "Banned seller {$seller->name} ({$validated['type']})" . ($validated['reason'] ? ": {$validated['reason']}" : ''),
            $seller->id
        );

        return $this->success($seller->fresh(), 'Seller banned.');
    }

    public function unban(Request $request, User $seller): JsonResponse
    {
        $seller->update([
            'is_banned'    => false,
            'ban_type'     => null,
            'banned_until' => null,
        ]);

        $seller->notify(new SellerUnbannedNotification());

        AdminLogService::log(
            $request->user(),
            'unban_seller',
            "Unbanned seller {$seller->name}",
            $seller->id
        );

        return $this->success($seller->fresh(), 'Seller unbanned.');
    }
}
