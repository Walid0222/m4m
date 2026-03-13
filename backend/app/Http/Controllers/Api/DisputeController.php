<?php

namespace App\Http\Controllers\Api;

use App\Models\BuyerStat;
use App\Models\Dispute;
use App\Models\DisputeActivity;
use App\Models\Order;
use App\Models\SellerStat;
use App\Notifications\DisputeOpenedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DisputeController extends Controller
{
    /**
     * Buyer opens a dispute on a delivered/completed order.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id'    => ['required', 'integer', 'exists:orders,id'],
            'reason'      => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:3000'],
        ]);

        $order = Order::find($validated['order_id']);

        if (! $order || $order->user_id !== $request->user()->id) {
            return $this->error('You are not the buyer of this order.', 403);
        }

        // Only allow disputes after seller has delivered (or order is already completed).
        if (! in_array($order->status, [Order::STATUS_DELIVERED, Order::STATUS_COMPLETED], true)) {
            return $this->error('You cannot open a dispute before the seller delivers the order.', 422);
        }

        if (Dispute::where('order_id', $order->id)->where('status', '!=', 'resolved')->exists()) {
            return $this->error('A dispute for this order is already open.', 422);
        }

        if ($order->escrow_status === 'released' || $order->escrow_status === 'refunded') {
            return $this->error('Dispute cannot be opened for finalized orders.', 422);
        }

        $sellerId = $order->seller_id;
        if (! $sellerId) {
            $order->loadMissing('orderItems.product');
            $sellerId = $order->orderItems->first()?->product?->user_id;
        }

        $dispute = Dispute::create([
            'order_id'    => $order->id,
            'buyer_id'    => $request->user()->id,
            'seller_id'   => $sellerId,
            'reason'      => $validated['reason'],
            'description' => $validated['description'] ?? null,
            'status'      => 'open',
        ]);

        // Put order in disputed state; block escrow auto-release
        $order->update([
            'status'        => Order::STATUS_DISPUTE,
            'escrow_status' => 'disputed',
        ]);

        // Update dispute counts
        BuyerStat::firstOrCreate(['buyer_id' => $request->user()->id])->increment('dispute_count');
        if ($sellerId) {
            SellerStat::firstOrCreate(['seller_id' => $sellerId])->increment('dispute_count');
        }

        $dispute->load(['buyer:id,name', 'seller:id,name', 'order:id,order_number,total_amount']);
        $dispute->buyer?->notify(new DisputeOpenedNotification($dispute));
        $dispute->seller?->notify(new DisputeOpenedNotification($dispute));

        DisputeActivity::create([
            'dispute_id' => $dispute->id,
            'user_id'    => $request->user()->id,
            'type'       => 'dispute_opened',
            'data'       => [
                'order_id' => $dispute->order_id,
            ],
        ]);

        return $this->success($dispute, 'Dispute opened.', 201);
    }

    /**
     * List disputes for the current user (buyer or seller).
     * Buyer: GET /disputes (default)
     * Seller: GET /disputes?seller=1
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $query = $request->boolean('seller')
            ? Dispute::where('seller_id', $userId)
            : Dispute::where('buyer_id', $userId);

        $disputes = $query
            ->with(['order:id,order_number,total_amount,status', 'buyer:id,name', 'seller:id,name'])
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->success($disputes);
    }

    /**
     * View a single dispute (buyer or seller can view their own).
     */
    public function show(Request $request, Dispute $dispute): JsonResponse
    {
        $userId = $request->user()->id;
        if ($dispute->buyer_id !== $userId && $dispute->seller_id !== $userId) {
            return $this->error('Forbidden.', 403);
        }

        $dispute->load(['order:id,order_number,total_amount,status', 'buyer:id,name', 'seller:id,name']);

        return $this->success($dispute);
    }

    /**
     * List activities for a dispute (buyer, seller, admin).
     */
    public function activities(Request $request, Dispute $dispute): JsonResponse
    {
        $user = $request->user();
        if (! $user->is_admin && $dispute->buyer_id !== $user->id && $dispute->seller_id !== $user->id) {
            return $this->error('Forbidden.', 403);
        }

        $activities = $dispute->activities()
            ->orderBy('created_at')
            ->with(['user:id,name'])
            ->get(['id', 'dispute_id', 'user_id', 'type', 'data', 'created_at']);

        return $this->success($activities);
    }
}
