<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Api\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    /**
     * Verify a user's email address without requiring an authenticated session.
     *
     * This is API-friendly and avoids redirects / route('login') usage.
     */
    public function verify(Request $request, $id, $hash): JsonResponse
    {
        /** @var User|null $user */
        $user = User::find($id);
        if (! $user) {
            return response()->json([
                'message' => 'Invalid verification link',
            ], 400);
        }

        // Ensure the hash in the URL matches the user's email for verification.
        $expectedHash = sha1($user->getEmailForVerification());
        if (! hash_equals((string) $hash, (string) $expectedHash)) {
            return response()->json([
                'message' => 'Invalid verification link',
            ], 400);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email already verified',
            ], 409);
        }

        $user->markEmailAsVerified();

        return response()->json([
            'message' => 'Email verified successfully',
        ], 200);
    }

    /**
     * Resend the email verification notification.
     */
    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email already verified',
            ], 409);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Verification email sent',
        ], 200);
    }
}

