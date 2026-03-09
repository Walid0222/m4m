<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Services\SecurityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->is_banned && ($user->ban_type === 'permanent' || ($user->banned_until && $user->banned_until->isFuture()))) {
            return $this->error('Your account has been banned.', 403);
        }

        $user->tokens()->where('name', 'auth')->delete();
        $token = $user->createToken('auth')->plainTextToken;

        SecurityLogService::log($user, 'login', $request);

        return $this->success([
            'user' => $this->userFields($user),
            'token' => $token,
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

    private function userFields(User $user): array
    {
        return $user->only([
            'id', 'name', 'email', 'is_seller', 'is_admin',
            'is_verified_seller', 'is_banned', 'ban_type', 'banned_until',
            'last_activity_at',
        ]);
    }
}
