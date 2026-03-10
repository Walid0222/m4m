<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Services\SecurityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'is_seller' => ['sometimes', 'boolean'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_seller' => $validated['is_seller'] ?? false,
        ]);

        $user->wallet()->create(['balance' => 0]);

        // Log registration and check for banned multi-accounts
        $regLog = SecurityLogService::log($user, 'register', $request);
        $bannedMatches = SecurityLogService::detectMultiAccount($user, $request);
        if (! empty($bannedMatches)) {
            SecurityLogService::flagUser($user, 'Possible multi-account: shares IP/device with banned user(s)');
        }

        $token = $user->createToken('auth')->plainTextToken;

        return $this->success([
            'user' => $this->userFields($user),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Registered successfully', 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $request->email)->first();

        // If we can identify the user and they have exceeded fraud_score threshold, block login.
        if ($user && ($user->fraud_score ?? 0) > 20) {
            return $this->error('Too many authentication attempts. Please try again later.', 429);
        }

        if (! $user || ! Hash::check($request->password, $user->password)) {
            if ($user) {
                // Increment fraud score and log failed attempt for this user.
                $user->increment('fraud_score');
                SecurityLogService::log($user, 'login_failed', $request, [
                    'reason' => 'invalid_credentials',
                ]);
            }

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Auto-lift expired temporary bans before login check
        if ($user->is_banned && $user->ban_type === 'temporary' && $user->banned_until?->isPast()) {
            $user->update([
                'is_banned'    => false,
                'ban_type'     => null,
                'banned_until' => null,
                'ban_reason'   => null,
            ]);
        }

        // Permanent ban — cannot login at all
        if ($user->is_banned && $user->ban_type === 'permanent') {
            return $this->error(
                '🚫 Your account has been permanently banned.'
                    . ($user->ban_reason ? ' Reason: ' . $user->ban_reason : ''),
                403
            );
        }

        // Temporary ban — allow login so seller can see suspension message
        // (seller-action routes are protected by EnsureSellerNotBanned middleware)

        $user->tokens()->where('name', 'auth')->delete();
        $token = $user->createToken('auth')->plainTextToken;

        // Reset fraud score on successful login and log the event.
        if ($user->fraud_score !== null && $user->fraud_score > 0) {
            $user->update(['fraud_score' => 0]);
        }
        SecurityLogService::log($user, 'login', $request);

        return $this->success([
            'user'       => $this->userFields($user),
            'token'      => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(null, 'Logged out successfully');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->success($this->userFields($request->user()));
    }

    public function updateMe(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'password' => ['sometimes', 'confirmed', Password::defaults()],
            'is_seller' => ['sometimes', 'boolean'],
            'show_recent_sales_notifications' => ['sometimes', 'boolean'],
            'vacation_mode' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        if (isset($validated['password'])) {
            SecurityLogService::log($user, 'password_change', $request);
        }

        $user->update($validated);

        return $this->success($this->userFields($user->fresh()), 'Profile updated.');
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:2048'], // 2MB
        ]);

        $user = $request->user();
        $file = $request->file('avatar');

        if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $file->store('avatars', 'public');
        $user->update(['avatar' => $path]);

        return $this->success($this->userFields($user->fresh()), 'Avatar updated.');
    }

    private function userFields(User $user): array
    {
        $fields = $user->only([
            'id', 'name', 'email', 'is_seller', 'is_admin',
            'is_verified_seller', 'is_banned', 'ban_type', 'banned_until',
            'ban_reason', 'warning_count', 'last_activity_at',
            'auto_reply_message', 'product_limit', 'limits_overridden',
            'show_recent_sales_notifications',
            'vacation_mode',
            'updated_at',
        ]);
        if (array_key_exists('avatar', $user->getAttributes()) && $user->avatar) {
            $fields['avatar'] = Storage::disk('public')->url($user->avatar);
        } else {
            $fields['avatar'] = $user->avatar;
        }
        return $fields;
    }
}
