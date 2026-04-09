<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Services\SecurityLogService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:users,name'],
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

        // Send email verification
        $user->sendEmailVerificationNotification();

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
            return response()->json([
                'error' => 'too_many_requests',
                'message' => 'Too many authentication attempts. Please try again later.',
            ], 429);
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

        $blocked = $this->loginBanGate($user);
        if ($blocked !== null) {
            return $blocked;
        }

        // If 2FA is enabled, do not issue token yet; ask for TOTP code.
        if ($user->two_factor_secret && $user->two_factor_enabled_at) {
            return response()->json([
                'requires_2fa' => true,
                'user_id'      => $user->id,
            ]);
        }

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

    public function login2fa(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id'      => ['required', 'integer'],
            'code'         => ['required', 'string'],
        ]);

        $user = User::find($data['user_id']);
        if (! $user || ! $user->two_factor_secret || ! $user->two_factor_enabled_at) {
            return $this->error('Two-factor authentication is not enabled.', 422);
        }

        $secret = \Illuminate\Support\Facades\Crypt::decryptString($user->two_factor_secret);
        $totp = \OTPHP\TOTP::create($secret);

        if (! $totp->verify($data['code'])) {
            SecurityLogService::log($user, 'login_2fa_failed', $request);
            return $this->error('Invalid 2FA code.', 422);
        }

        $blocked = $this->loginBanGate($user);
        if ($blocked !== null) {
            return $blocked;
        }

        $user->tokens()->where('name', 'auth')->delete();
        $token = $user->createToken('auth')->plainTextToken;

        if ($user->fraud_score !== null && $user->fraud_score > 0) {
            $user->update(['fraud_score' => 0]);
        }

        SecurityLogService::log($user, 'login_2fa_success', $request);

        return $this->success([
            'user'       => $this->userFields($user),
            'token'      => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function loginGoogle(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_token' => ['required', 'string'],
        ]);

        $google = $this->verifyGoogleIdToken($data['id_token']);
        if ($google === null) {
            return $this->error('Invalid Google login token.', 422);
        }

        $email = $google['email'] ?? null;
        $googleId = $google['sub'] ?? null;
        $name = trim((string) ($google['name'] ?? ''));
        $emailVerified = ($google['email_verified'] ?? 'false') === 'true';

        if (! $email || ! $googleId) {
            return $this->error('Google account data is incomplete.', 422);
        }

        $user = User::where('google_id', $googleId)->first();

        if (! $user) {
            $existing = User::where('email', $email)->first();

            if ($existing && $existing->google_id && hash_equals((string) $existing->google_id, (string) $googleId)) {
                $user = $existing;
            } elseif ($existing && ! $existing->google_id) {
                // Safety rule: never auto-link or auto-merge password accounts.
                return $this->error('This email already exists. Please sign in with password for now.', 422);
            } elseif ($existing && $existing->google_id && ! hash_equals((string) $existing->google_id, (string) $googleId)) {
                return $this->error('This email already exists. Please sign in with password for now.', 422);
            } else {
                try {
                    $user = DB::transaction(function () use ($name, $email, $googleId, $emailVerified) {
                        $newUser = User::create([
                            'name' => $name !== '' ? Str::limit($name, 255) : Str::before($email, '@'),
                            'email' => $email,
                            'password' => Hash::make(Str::random(64)),
                            'google_id' => $googleId,
                            'auth_provider' => 'google',
                            'is_admin' => false,
                            'is_seller' => false,
                            'email_verified_at' => $emailVerified ? now() : null,
                        ]);
                        $newUser->wallet()->create(['balance' => 0]);

                        return $newUser;
                    });
                } catch (QueryException $e) {
                    if (! $this->isUniqueConstraintViolation($e)) {
                        throw $e;
                    }
                    $user = User::where('google_id', $googleId)->first();
                    if (! $user) {
                        throw $e;
                    }
                }
            }
        }

        $blocked = $this->loginBanGate($user);
        if ($blocked !== null) {
            return $blocked;
        }

        // Same 2FA policy as regular login: do not issue token yet.
        if ($user->two_factor_secret && $user->two_factor_enabled_at) {
            return response()->json([
                'requires_2fa' => true,
                'user_id'      => $user->id,
            ]);
        }

        $user->tokens()->where('name', 'auth')->delete();
        $token = $user->createToken('auth')->plainTextToken;

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
        $oldEmail = $user->email;
        $validated = $request->validate([
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'password' => ['sometimes', 'confirmed', Password::defaults()],
            'two_factor_code' => ['nullable', 'string'],
            'current_password' => ['nullable', 'string'],
            'is_seller' => ['sometimes', 'boolean'],
            'show_recent_sales_notifications' => ['sometimes', 'boolean'],
            'vacation_mode' => ['sometimes', 'boolean'],
        ]);

        // If email is being changed, require step-up authentication.
        if ($request->filled('email') && $request->input('email') !== $oldEmail) {
            if ($user->two_factor_enabled_at) {
                if (! $request->filled('two_factor_code')) {
                    return $this->error('Two-factor authentication code is required.', 422);
                }

                $secret = \Illuminate\Support\Facades\Crypt::decryptString($user->two_factor_secret);
                $totp = \OTPHP\TOTP::create($secret);

                if (! $totp->verify($request->input('two_factor_code'))) {
                    return $this->error('Invalid two-factor authentication code.', 422);
                }
            } else {
                if (
                    ! $request->filled('current_password')
                    || ! Hash::check($request->input('current_password'), $user->password)
                ) {
                    return $this->error('Current password is incorrect.', 422);
                }
            }
        }

        if (array_key_exists('password', $validated)) {
            if (! $request->filled('current_password') || ! Hash::check($request->input('current_password'), $user->password)) {
                return $this->error('Current password is incorrect.', 422);
            }

            $validated['password'] = Hash::make($validated['password']);
            SecurityLogService::log($user, 'password_change', $request);
        }

        $user->update($validated);

        // If email changed, reset verification, log, send email, and harden sessions.
        if (array_key_exists('email', $validated) && $validated['email'] !== $oldEmail) {
            $user->email_verified_at = null;
            $user->save();

            SecurityLogService::log(
                $user,
                'email_change',
                $request,
                ['new_email' => $validated['email']]
            );

            $user->sendEmailVerificationNotification();

            $user->tokens()->delete();
        }

        return $this->success($this->userFields($user->fresh()), 'Profile updated.');
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:5120'], // 5 MB (kilobytes)
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

    /**
     * Shared login / login2fa gate: auto-lift expired temporary bans, then block active sanctions.
     *
     * @return JsonResponse|null 403 response if login must be denied; null if allowed to proceed.
     */
    private function loginBanGate(User $user): ?JsonResponse
    {
        if ($user->is_banned && $user->ban_type === 'temporary' && $user->banned_until?->isPast()) {
            $user->update([
                'is_banned'    => false,
                'ban_type'     => null,
                'banned_until' => null,
                'ban_reason'   => null,
            ]);
            $user->refresh();
        }

        if (! $user->is_banned) {
            return null;
        }

        if ($user->ban_type === 'permanent') {
            return $this->error(
                '🚫 Your account has been permanently banned.'
                    . ($user->ban_reason ? ' Reason: ' . $user->ban_reason : ''),
                403
            );
        }

        if ($user->ban_type === 'temporary') {
            return $this->error(
                '⏸️ Your seller account is suspended until '
                    . $user->banned_until?->toDateString() . '.'
                    . ($user->ban_reason ? ' Reason: ' . $user->ban_reason : ''),
                403
            );
        }

        return $this->error('Your account cannot log in at this time.', 403);
    }

    private function isUniqueConstraintViolation(QueryException $e): bool
    {
        return ($e->errorInfo[0] ?? '') === '23000';
    }

    private function verifyGoogleIdToken(string $idToken): ?array
    {
        $clientId = (string) config('services.google.client_id');
        if ($clientId === '') {
            return null;
        }

        try {
            $response = Http::timeout(8)->get('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $idToken,
            ]);
        } catch (\Throwable $e) {
            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        $payload = $response->json();
        if (! is_array($payload)) {
            return null;
        }

        $aud = (string) ($payload['aud'] ?? '');
        $iss = (string) ($payload['iss'] ?? '');
        $exp = (int) ($payload['exp'] ?? 0);
        if ($aud !== $clientId) {
            return null;
        }
        if (! in_array($iss, ['accounts.google.com', 'https://accounts.google.com'], true)) {
            return null;
        }
        if ($exp <= now()->timestamp) {
            return null;
        }

        return $payload;
    }

    private function userFields(User $user): array
    {
        $fields = $user->only([
            'id', 'name', 'email', 'avatar', 'is_seller', 'is_admin',
            'is_verified_seller', 'is_banned', 'ban_type', 'banned_until',
            'ban_reason', 'warning_count', 'last_activity_at',
            'auto_reply_message', 'product_limit', 'limits_overridden',
            'show_recent_sales_notifications',
            'vacation_mode',
            'two_factor_enabled_at',
            'email_verified_at',
            'updated_at',
        ]);
        return $fields;
    }
}
