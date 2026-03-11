<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $wallet = $user->wallet;

        if (! $wallet) {
            $wallet = $user->wallet()->create(['balance' => 0]);
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

        // Pending escrow funds for this user as seller
        $pendingEscrow = 0.0;
        $nextReleaseAt = null;
        if ($user->is_seller) {
            $pendingOrders = Order::where('seller_id', $user->id)
                ->where('escrow_status', 'pending_release')
                ->get(['escrow_amount', 'total_amount', 'release_at']);

            foreach ($pendingOrders as $order) {
                $amount = (float) ($order->escrow_amount ?: $order->total_amount);
                $pendingEscrow += $amount;

                if ($order->release_at && ($nextReleaseAt === null || $order->release_at->lt($nextReleaseAt))) {
                    $nextReleaseAt = $order->release_at;
                }
            }
        }

        return $this->success([
            'balance' => (float) $wallet->balance,
            'currency' => $wallet->currency ?? 'USD',
            'transactions' => $transactions,
            'pending_escrow_balance' => $pendingEscrow,
            'next_release_at' => $nextReleaseAt?->toIso8601String(),
        ]);
    }
}
