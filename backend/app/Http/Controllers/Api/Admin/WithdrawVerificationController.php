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
        $validated = $request->validate([
            'action' => ['required', 'in:approve,reject'],
            'rejection_reason' => ['nullable', 'string', 'max:500'],
        ]);

        if ($validated['action'] === 'reject') {
            // Simple state transition: pending -> cancelled
            if ($withdrawRequest->status !== 'pending') {
                return $this->error('Withdrawal already processed.', 422);
            }

            $withdrawRequest->update([
                'status' => 'cancelled',
                'rejection_reason' => $validated['rejection_reason'] ?? null,
            ]);

            return $this->success($withdrawRequest->fresh(), 'Withdrawal request rejected.');
        }

        try {
            DB::transaction(function () use (&$withdrawRequest, $validated) {
                // Lock the withdraw request row and re-check status inside the transaction
                $withdrawRequest = WithdrawRequest::whereKey($withdrawRequest->id)->lockForUpdate()->first();
                if (! $withdrawRequest || $withdrawRequest->status !== 'pending') {
                    throw new \RuntimeException('WITHDRAWAL_ALREADY_PROCESSED');
                }

                $user = $withdrawRequest->user;
                $wallet = $user->wallet;
                if (! $wallet) {
                    throw new \RuntimeException('NO_WALLET');
                }

                $wallet = $user->wallet()->lockForUpdate()->first();
                if (! $wallet) {
                    throw new \RuntimeException('NO_WALLET');
                }

                $amount = (float) $withdrawRequest->amount;
                if ((float) $wallet->balance < $amount) {
                    throw new \RuntimeException('INSUFFICIENT_WALLET_BALANCE');
                }

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
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'WITHDRAWAL_ALREADY_PROCESSED') {
                return $this->error('Withdrawal already processed.', 422);
            }
            if ($e->getMessage() === 'NO_WALLET') {
                return $this->error('User has no wallet.', 422);
            }
            if ($e->getMessage() === 'INSUFFICIENT_WALLET_BALANCE') {
                return $this->error('Insufficient wallet balance to process withdrawal.', 422);
            }
            throw $e;
        }

        $withdrawRequest->user->notify(new WithdrawApprovedNotification(
            (float) $withdrawRequest->amount,
            $withdrawRequest->currency ?? 'USD'
        ));

        return $this->success($withdrawRequest->fresh(['user:id,name,email']), 'Withdrawal approved and processed.');
    }
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
