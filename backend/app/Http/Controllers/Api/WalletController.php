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

        return $this->success([
            'balance' => (float) $wallet->balance,
            'currency' => $wallet->currency,
        ]);
    }
}
