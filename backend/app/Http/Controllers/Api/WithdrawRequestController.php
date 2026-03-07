<?php

namespace App\Http\Controllers\Api;

use App\Models\WithdrawRequest;
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

        $wallet = $request->user()->wallet;
        if (! $wallet) {
            $wallet = $request->user()->wallet()->create(['balance' => 0]);
        }

        if ((float) $wallet->balance < (float) $validated['amount']) {
            return $this->error('Insufficient wallet balance.', 422);
        }

        $withdraw = $request->user()->withdrawRequests()->create([
            'amount' => $validated['amount'],
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
