<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\WalletTransaction;
use App\Models\WithdrawRequest;
use App\Notifications\WithdrawApprovedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WithdrawVerificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $withdrawals = WithdrawRequest::with('user:id,name,email')
            ->where('status', 'pending')
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return $this->success($withdrawals);
    }

    public function verify(Request $request, WithdrawRequest $withdrawRequest): JsonResponse
    {
        if ($withdrawRequest->status !== 'pending') {
            return $this->error('Withdrawal already processed.', 422);
        }

        $validated = $request->validate([
            'action' => ['required', 'in:approve,reject'],
            'rejection_reason' => ['nullable', 'string', 'max:500'],
        ]);

        if ($validated['action'] === 'reject') {
            $withdrawRequest->update([
                'status' => 'cancelled',
                'rejection_reason' => $validated['rejection_reason'] ?? null,
            ]);

            return $this->success($withdrawRequest->fresh(), 'Withdrawal request rejected.');
        }

        $user = $withdrawRequest->user;
        $wallet = $user->wallet;
        if (! $wallet) {
            return $this->error('User has no wallet.', 422);
        }

        $amount = (float) $withdrawRequest->amount;
        if ((float) $wallet->balance < $amount) {
            return $this->error('Insufficient wallet balance to process withdrawal.', 422);
        }

        DB::transaction(function () use ($withdrawRequest, $wallet, $amount) {
            $withdrawRequest->update([
                'status' => 'completed',
                'processed_at' => now(),
            ]);

            $wallet->decrement('balance', $amount);
            $newBalance = (float) $wallet->fresh()->balance;

            $wallet->transactions()->create([
                'type' => 'withdrawal',
                'amount' => -$amount,
                'balance_after' => $newBalance,
                'reference_type' => WithdrawRequest::class,
                'reference_id' => $withdrawRequest->id,
                'description' => 'Withdrawal approved',
            ]);
        });

        $withdrawRequest->user->notify(new WithdrawApprovedNotification(
            (float) $withdrawRequest->amount,
            $withdrawRequest->currency ?? 'USD'
        ));

        return $this->success($withdrawRequest->fresh(['user:id,name,email']), 'Withdrawal approved and processed.');
    }
}
