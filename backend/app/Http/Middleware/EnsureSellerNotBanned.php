<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSellerNotBanned
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if (! $user->is_banned) {
            return $next($request);
        }

        // Permanent ban
        if ($user->ban_type === 'permanent') {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been permanently banned.',
                'ban_type' => 'permanent',
            ], 403);
        }

        // Temporary ban: check if still active
        if ($user->ban_type === 'temporary' && $user->banned_until?->isFuture()) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is suspended until ' . $user->banned_until->toDateString() . '.',
                'ban_type' => 'temporary',
                'banned_until' => $user->banned_until->toIso8601String(),
            ], 403);
        }

        // Temporary ban expired — automatically lift it
        $user->update([
            'is_banned'    => false,
            'ban_type'     => null,
            'banned_until' => null,
        ]);

        return $next($request);
    }
}
