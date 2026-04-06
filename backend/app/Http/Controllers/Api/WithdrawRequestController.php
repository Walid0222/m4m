<?php

namespace App\Http\Controllers\Api;

use App\Models\WalletSetting;
use App\Models\WithdrawRequest;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WithdrawRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $withdrawals = $request->user()
            ->withdrawRequests()
            ->latest()
            ->paginate(15);

        return $this->success($withdrawals);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'payment_details' => ['required', 'string', 'max:1000'],
            'current_password' => ['nullable', 'string'],
            'two_factor_code' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        // Log only non-sensitive fields to avoid credential/payment leakage.
        \Log::info('Withdraw request', [
            'user_id' => $user->id,
            'amount' => $validated['amount'] ?? null,
        ]);
        // Step-up authentication: require 2FA code if enabled, otherwise current password.
        if ($user->two_factor_enabled_at) {
            if (! $request->filled('two_factor_code')) {
                return response()->json([
                    'message' => 'Two-factor authentication code is required.',
                ], 422);
            }

            $secret = \Illuminate\Support\Facades\Crypt::decryptString($user->two_factor_secret);
            $totp = \OTPHP\TOTP::create($secret);

            if (! $totp->verify($request->input('two_factor_code'))) {
                return response()->json([
                    'message' => 'Invalid two-factor authentication code.',
                ], 422);
            }
        } else {
            if (
                ! $request->filled('current_password')
                || ! \Illuminate\Support\Facades\Hash::check($request->input('current_password'), $user->password)
            ) {
                return response()->json([
                    'message' => 'Current password is incorrect.',
                ], 422);
            }
        }

        $settings = WalletSetting::current();

        $amount = (float) $validated['amount'];

        // Enforce configurable min/max withdraw amounts
        if ($amount < (float) $settings->min_withdraw_amount) {
            return $this->error("Minimum withdrawal amount is {$settings->min_withdraw_amount}.", 422);
        }
        if ($settings->max_withdraw_amount > 0 && $amount > (float) $settings->max_withdraw_amount) {
            return $this->error("Maximum withdrawal amount is {$settings->max_withdraw_amount}.", 422);
        }

        try {
            $withdraw = DB::transaction(function () use ($user, $validated, $amount) {
                $settings = WalletSetting::current();

                $wallet = $user->wallet;
                if (! $wallet) {
                    $wallet = $user->wallet()->create(['balance' => 0]);
                }
                $wallet = $user->wallet()->lockForUpdate()->first();
                if (! $wallet) {
                    throw new \RuntimeException('NO_WALLET');
                }

                // Re-check policy under wallet lock so concurrent requests cannot bypass limits.
                if ((float) $settings->daily_withdraw_limit > 0) {
                    $today = Carbon::now()->startOfDay();
                    $todayTotal = (float) WithdrawRequest::where('user_id', $user->id)
                        ->where('created_at', '>=', $today)
                        ->whereIn('status', ['pending', 'completed'])
                        ->sum('amount');

                    if ($todayTotal + $amount > (float) $settings->daily_withdraw_limit) {
                        throw new \RuntimeException('DAILY_LIMIT');
                    }
                }

                if ((int) $settings->max_pending_requests > 0) {
                    $pendingCount = WithdrawRequest::where('user_id', $user->id)
                        ->where('status', 'pending')
                        ->count();
                    if ($pendingCount >= (int) $settings->max_pending_requests) {
                        throw new \RuntimeException('MAX_PENDING');
                    }
                }

                if ((int) $settings->withdraw_cooldown_hours > 0) {
                    $lastRequest = WithdrawRequest::where('user_id', $user->id)
                        ->orderByDesc('created_at')
                        ->first();

                    if ($lastRequest) {
                        $cooldownUntil = $lastRequest->created_at->copy()->addHours((int) $settings->withdraw_cooldown_hours);
                        if ($cooldownUntil->isFuture()) {
                            $hoursRemaining = Carbon::now()->diffInHours($cooldownUntil);
                            throw new \RuntimeException('COOLDOWN:'.$hoursRemaining);
                        }
                    }
                }

                $pendingTotal = (float) WithdrawRequest::where('user_id', $user->id)
                    ->where('status', 'pending')
                    ->sum('amount');

                $balance = (float) $wallet->balance;
                if ($balance - $pendingTotal < $amount) {
                    throw new \RuntimeException('PENDING_EXCEEDS_BALANCE');
                }

                return $user->withdrawRequests()->create([
                    'amount' => $amount,
                    'currency' => $validated['currency'] ?? 'USD',
                    'payment_details' => $validated['payment_details'],
                    'status' => 'pending',
                ]);
            });
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'NO_WALLET') {
                return $this->error('User has no wallet.', 422);
            }
            if ($e->getMessage() === 'PENDING_EXCEEDS_BALANCE') {
                return $this->error('You already have pending withdrawal requests that exceed your available balance.', 422);
            }
            if ($e->getMessage() === 'DAILY_LIMIT') {
                return $this->error('Daily withdrawal limit exceeded.', 422);
            }
            if ($e->getMessage() === 'MAX_PENDING') {
                return $this->error('You have too many pending withdrawal requests. Please wait for existing requests to be processed.', 422);
            }
            if (str_starts_with($e->getMessage(), 'COOLDOWN:')) {
                $hoursRemaining = (int) substr($e->getMessage(), strlen('COOLDOWN:'));

                return $this->error(
                    "You must wait {$hoursRemaining} more hour(s) before creating another withdrawal request.",
                    422
                );
            }
            throw $e;
        }

        return $this->success([
            'id' => $withdraw->id,
            'amount' => (float) $withdraw->amount,
            'currency' => $withdraw->currency,
            'status' => $withdraw->status,
            'created_at' => $withdraw->created_at->toIso8601String(),
        ], 'Withdrawal request submitted.', 201);
    }
}
