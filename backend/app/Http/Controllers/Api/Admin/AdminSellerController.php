<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\User;
use App\Notifications\SellerBannedNotification;
use App\Notifications\SellerUnbannedNotification;
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

        // In-app notification + email
        $seller->notify(new SellerBannedNotification(
            banType: $validated['type'],
            bannedUntil: $bannedUntil?->toDateString(),
            reason: $validated['reason'] ?? null,
        ));

        return $this->success($seller->fresh(), 'Seller banned.');
    }

    public function unban(User $seller): JsonResponse
    {
        $seller->update([
            'is_banned'    => false,
            'ban_type'     => null,
            'banned_until' => null,
        ]);

        $seller->notify(new SellerUnbannedNotification());

        return $this->success($seller->fresh(), 'Seller unbanned.');
    }
}
