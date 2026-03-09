<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks seller-action routes for any banned seller.
 *
 * Temporary ban:  seller can still LOGIN and view their account,
 *                 but cannot create/edit products or manage orders.
 * Permanent ban:  same blocked routes + login is also blocked in AuthController.
 *
 * Auto-unban: if ban_type = temporary and banned_until has passed, the ban
 * is cleared transparently here (before potentially blocking the request).
 */
class EnsureSellerNotBanned
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_banned) {
            return $next($request);
        }

        // ── Auto-lift expired temporary ban ──────────────────────────────────
        if ($user->ban_type === 'temporary' && $user->banned_until?->isPast()) {
            $user->update([
                'is_banned'    => false,
                'ban_type'     => null,
                'banned_until' => null,
                'ban_reason'   => null,
            ]);
            return $next($request);
        }

        // ── Still banned — permanent ─────────────────────────────────────────
        if ($user->ban_type === 'permanent') {
            return response()->json([
                'success'    => false,
                'message'    => '🚫 Your account has been permanently banned and cannot perform this action.'
                    . ($user->ban_reason ? ' Reason: ' . $user->ban_reason : ''),
                'ban_type'   => 'permanent',
                'ban_reason' => $user->ban_reason,
            ], 403);
        }

        // ── Still banned — temporary ─────────────────────────────────────────
        if ($user->ban_type === 'temporary') {
            return response()->json([
                'success'      => false,
                'message'      => '⏸️ Your seller account is suspended until '
                    . $user->banned_until->toDateString() . '.'
                    . ($user->ban_reason ? ' Reason: ' . $user->ban_reason : ''),
                'ban_type'     => 'temporary',
                'banned_until' => $user->banned_until->toIso8601String(),
                'ban_reason'   => $user->ban_reason,
            ], 403);
        }

        return $next($request);
    }
}
