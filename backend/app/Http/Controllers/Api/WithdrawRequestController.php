<?php

namespace App\Http\Controllers\Api;

use App\Models\WalletSetting;
use App\Models\WithdrawRequest;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        ]);

        $user = $request->user();
        $settings = WalletSetting::current();

        $amount = (float) $validated['amount'];

        // Enforce configurable min/max withdraw amounts
        if ($amount < (float) $settings->min_withdraw_amount) {
            return $this->error("Minimum withdrawal amount is {$settings->min_withdraw_amount}.", 422);
        }
        if ($settings->max_withdraw_amount > 0 && $amount > (float) $settings->max_withdraw_amount) {
            return $this->error("Maximum withdrawal amount is {$settings->max_withdraw_amount}.", 422);
        }

        // Enforce daily withdraw limit (sum of today's pending+completed plus this amount)
        if ((float) $settings->daily_withdraw_limit > 0) {
            $today = Carbon::now()->startOfDay();
            $todayTotal = $user->withdrawRequests()
                ->where('created_at', '>=', $today)
                ->whereIn('status', ['pending', 'completed'])
                ->sum('amount');

            if ($todayTotal + $amount > (float) $settings->daily_withdraw_limit) {
                return $this->error('Daily withdrawal limit exceeded.', 422);
            }
        }

        // Enforce max pending withdraw requests
        if ((int) $settings->max_pending_requests > 0) {
            $pendingCount = $user->withdrawRequests()->where('status', 'pending')->count();
            if ($pendingCount >= (int) $settings->max_pending_requests) {
                return $this->error('You have too many pending withdrawal requests. Please wait for existing requests to be processed.', 422);
            }
        }

        // Enforce cooldown between withdrawals
        if ((int) $settings->withdraw_cooldown_hours > 0) {
            $lastRequest = $user->withdrawRequests()
                ->orderByDesc('created_at')
                ->first();

            if ($lastRequest) {
                $cooldownUntil = $lastRequest->created_at->copy()->addHours((int) $settings->withdraw_cooldown_hours);
                if ($cooldownUntil->isFuture()) {
                    $hoursRemaining = Carbon::now()->diffInHours($cooldownUntil);
                    return $this->error(
                        "You must wait {$hoursRemaining} more hour(s) before creating another withdrawal request.",
                        422
                    );
                }
            }
        }

        $wallet = $user->wallet;
        if (! $wallet) {
            $wallet = $user->wallet()->create(['balance' => 0]);
        }

        if ((float) $wallet->balance < $amount) {
            return $this->error('Insufficient wallet balance.', 422);
        }

        $withdraw = $user->withdrawRequests()->create([
            'amount' => $amount,
            'currency' => $validated['currency'] ?? 'USD',
            'payment_details' => $validated['payment_details'],
            'status' => 'pending',
        ]);

        return $this->success([
            'id' => $withdraw->id,
            'amount' => (float) $withdraw->amount,
            'currency' => $withdraw->currency,
            'status' => $withdraw->status,
            'created_at' => $withdraw->created_at->toIso8601String(),
        ], 'Withdrawal request submitted.', 201);
    }
}
