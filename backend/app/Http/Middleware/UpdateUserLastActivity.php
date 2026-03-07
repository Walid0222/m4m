<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UpdateUserLastActivity
{
    /** Consider "online" if activity within this many minutes. */
    private const ACTIVITY_WINDOW_MINUTES = 5;

    /** Only write to DB at most this often (minutes). */
    private const WRITE_THROTTLE_MINUTES = 1;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user) {
            $writeThreshold = now()->subMinutes(self::WRITE_THROTTLE_MINUTES);
            if ($user->last_activity_at === null || $user->last_activity_at < $writeThreshold) {
                $user->update(['last_activity_at' => now()]);
            }
        }

        return $next($request);
    }
}
