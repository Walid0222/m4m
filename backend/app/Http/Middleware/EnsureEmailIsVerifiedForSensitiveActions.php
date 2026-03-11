<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureEmailIsVerifiedForSensitiveActions
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (! $user || ! $user->hasVerifiedEmail()) {
            return response()->json([
                'error' => 'email_not_verified',
                'message' => 'Please verify your email address before continuing.',
            ], 403);
        }

        return $next($request);
    }
}

