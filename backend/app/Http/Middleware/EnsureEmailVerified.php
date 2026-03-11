<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureEmailVerified
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (! $user || ! $user->hasVerifiedEmail()) {
            return response()->json([
                'error' => 'email_not_verified',
                'message' => 'Please verify your email address before using the platform.',
            ], 403);
        }

        return $next($request);
    }
}

