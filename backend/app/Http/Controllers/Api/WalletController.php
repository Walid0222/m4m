<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $wallet = $request->user()->wallet;

        if (! $wallet) {
            $wallet = $request->user()->wallet()->create(['balance' => 0]);
        }

        $transactions = $wallet->transactions()
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'type' => $t->type,
                'amount' => (float) $t->amount,
                'balance_after' => $t->balance_after !== null ? (float) $t->balance_after : null,
                'description' => $t->description,
                'created_at' => $t->created_at?->toISOString(),
            ]);

        return $this->success([
            'balance' => (float) $wallet->balance,
            'currency' => $wallet->currency ?? 'USD',
            'transactions' => $transactions,
        ]);
    }
}
