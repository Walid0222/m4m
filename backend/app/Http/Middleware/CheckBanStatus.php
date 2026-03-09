<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Applied to ALL authenticated routes.
 *
 * Permanent ban  → block every request (frontend intercepts 403+ban_type and logs user out).
 * Temporary ban  → auto-lift if expired; otherwise allow request to pass through.
 *                  The more restrictive EnsureSellerNotBanned middleware blocks seller actions.
 */
class CheckBanStatus
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_banned) {
            return $next($request);
        }

        // Auto-lift expired temporary ban
        if ($user->ban_type === 'temporary' && $user->banned_until?->isPast()) {
            $user->update([
                'is_banned'    => false,
                'ban_type'     => null,
                'banned_until' => null,
                'ban_reason'   => null,
            ]);
            return $next($request);
        }

        // Permanent ban — revoke all tokens and block every request
        if ($user->ban_type === 'permanent') {
            // Revoke tokens so further requests also fail at auth level
            $user->tokens()->delete();

            return response()->json([
                'success'    => false,
                'message'    => 'Your account has been permanently banned by M4M administration.'
                    . ($user->ban_reason ? ' Reason: ' . $user->ban_reason : ''),
                'ban_type'   => 'permanent',
                'ban_reason' => $user->ban_reason,
            ], 403);
        }

        // Temporary ban — allow request (seller-action routes are blocked by EnsureSellerNotBanned)
        return $next($request);
    }
}
