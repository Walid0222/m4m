<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\Order;
use App\Services\EscrowService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminEscrowController extends Controller
{
    public function __construct(private readonly EscrowService $escrow)
    {
    }

    /**
     * Return admin escrow overview: total pending, count, orders.
     */
    public function index(Request $request): JsonResponse
    {
        $orders = Order::where('escrow_status', 'pending_release')
            ->with('seller:id,name,email')
            ->orderBy('release_at')
            ->get();

        $totalPendingEscrow = 0.0;
        $items = [];

        foreach ($orders as $order) {
            $amount = (float) ($order->escrow_amount ?: $order->total_amount);
            $totalPendingEscrow += $amount;
            $items[] = [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'seller' => $order->seller ? [
                    'id' => $order->seller->id,
                    'name' => $order->seller->name,
                    'email' => $order->seller->email,
                ] : null,
                'amount' => $amount,
                'release_at' => $order->release_at?->toIso8601String(),
                'status' => $order->status,
                'escrow_status' => $order->escrow_status,
            ];
        }

        return $this->success([
            'total_pending_escrow' => $totalPendingEscrow,
            'pending_orders_count' => $orders->count(),
            'orders_pending_release' => $items,
        ]);
    }

    /**
     * Force immediate payout for an order (admin override).
     */
    public function release(Request $request, Order $order): JsonResponse
    {
        try {
            DB::transaction(function () use ($order) {
                $locked = Order::whereKey($order->id)->lockForUpdate()->first();
                if (! $locked || $locked->escrow_status !== 'pending_release') {
                    throw new \RuntimeException('ORDER_NOT_PENDING_RELEASE');
                }
                $locked->update(['release_at' => now()]);
                $this->escrow->processScheduledRelease($locked);
            });
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'ORDER_NOT_PENDING_RELEASE') {
                return $this->error('Order is not in pending release state.', 422);
            }
            throw $e;
        }

        $order->load(['seller', 'orderItems']);
        $amount = (float) ($order->escrow_amount ?: $order->total_amount);
        $order->seller?->notify(new \App\Notifications\EscrowPayoutReleasedNotification($order, $amount));

        return $this->success($order->fresh(['seller:id,name,email']), 'Escrow released.');
    }

    /**
     * Extend release_at by 48 hours (admin hold).
     */
    public function hold(Request $request, Order $order): JsonResponse
    {
        try {
            DB::transaction(function () use ($order) {
                $locked = Order::whereKey($order->id)->lockForUpdate()->first();
                if (! $locked || $locked->escrow_status !== 'pending_release') {
                    throw new \RuntimeException('ORDER_NOT_PENDING_RELEASE');
                }
                $newReleaseAt = $locked->release_at
                    ? $locked->release_at->copy()->addHours(48)
                    : Carbon::now()->addHours(48);
                $locked->update(['release_at' => $newReleaseAt]);
            });
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'ORDER_NOT_PENDING_RELEASE') {
                return $this->error('Order is not in pending release state.', 422);
            }
            throw $e;
        }

        $order->seller?->notify(new \App\Notifications\EscrowPayoutDelayedNotification($order, 48));

        return $this->success($order->fresh(['seller:id,name,email']), 'Release extended by 48 hours.');
    }

    /**
     * Refund buyer (admin override).
     */
    public function refund(Request $request, Order $order): JsonResponse
    {
        try {
            DB::transaction(function () use ($order) {
                $locked = Order::whereKey($order->id)->lockForUpdate()->first();
                if (! $locked) {
                    throw new \RuntimeException('ORDER_NOT_FOUND');
                }
                if (! in_array($locked->escrow_status, ['held', 'pending_release', 'disputed'], true)) {
                    throw new \RuntimeException('ORDER_NOT_REFUNDABLE');
                }
                $this->escrow->refundBuyer($locked, $request->user());
            });
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'ORDER_NOT_FOUND') {
                return $this->error('Order not found.', 404);
            }
            if ($e->getMessage() === 'ORDER_NOT_REFUNDABLE') {
                return $this->error('Order is not in a refundable state.', 422);
            }
            throw $e;
        }

        $order->load(['buyer', 'seller']);
        $order->buyer?->notify(new \App\Notifications\EscrowRefundedToBuyerNotification($order));
        $order->seller?->notify(new \App\Notifications\EscrowRefundedToSellerNotification($order));

        return $this->success($order->fresh(['seller:id,name,email', 'buyer:id,name,email']), 'Buyer refunded.');
    }
}
