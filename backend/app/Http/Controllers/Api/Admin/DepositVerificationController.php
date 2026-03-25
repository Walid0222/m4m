<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\DepositRequest;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Notifications\DepositApprovedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DepositVerificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $deposits = DepositRequest::with('user:id,name,email')
            ->where('status', 'pending')
            ->latest()
            ->paginate(min($request->integer('per_page', 20), 100));

        return $this->success($deposits);
    }

    public function verify(Request $request, DepositRequest $depositRequest): JsonResponse
    {
        if ($depositRequest->status !== 'pending') {
            return $this->error('Deposit already processed.', 422);
        }

        $validated = $request->validate([
            'action' => ['required', 'in:approve,reject'],
            'payment_reference' => ['nullable', 'string', 'max:255'],
        ]);

        if ($validated['action'] === 'reject') {
            $depositRequest->update([
                'status' => 'cancelled',
                'payment_reference' => $validated['payment_reference'] ?? $depositRequest->payment_reference,
            ]);

            return $this->success($depositRequest->fresh(), 'Deposit request rejected.');
        }

        DB::transaction(function () use ($depositRequest) {
            $depositRequest->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            $wallet = $depositRequest->user->wallet;
            if (! $wallet) {
                $wallet = $depositRequest->user->wallet()->create(['balance' => 0]);
            }

            $amount = (float) $depositRequest->amount;

            // Apply commission for Orange Recharge deposits (12%)
            $credited = $depositRequest->payment_method === 'orange_recharge'
                ? round($amount * 0.88, 2)
                : $amount;

            $wallet->increment('balance', $credited);
            $newBalance = (float) $wallet->fresh()->balance;

            $wallet->transactions()->create([
                'type' => 'deposit',
                'amount' => $credited,
                'balance_after' => $newBalance,
                'reference_type' => DepositRequest::class,
                'reference_id' => $depositRequest->id,
                'description' => "Deposit verified - {$depositRequest->reference_code}",
            ]);
        });

        $depositRequest->user->notify(new DepositApprovedNotification(
            (float) $depositRequest->amount,
            $depositRequest->currency ?? 'USD',
            $depositRequest->reference_code ?? ''
        ));

        return $this->success($depositRequest->fresh(['user:id,name,email']), 'Deposit approved and wallet credited.');
    }
}
