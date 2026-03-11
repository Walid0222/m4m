<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\Dispute;
use App\Models\Order;
use App\Notifications\DisputeBuyerRefundedSellerNotification;
use App\Notifications\DisputeRefundedNotification;
use App\Notifications\DisputeResolvedBuyerLosesNotification;
use App\Notifications\DisputeResolvedSellerPaidNotification;
use App\Services\AdminLogService;
use App\Services\EscrowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDisputeController extends Controller
{
    public function __construct(private readonly EscrowService $escrow) {}

    /**
     * List all disputes with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Dispute::with([
            'buyer:id,name,email',
            'seller:id,name,email',
            'order:id,order_number,total_amount,escrow_amount,status,escrow_status,delivery_content,created_at',
        ])->latest();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $disputes = $query->paginate($request->integer('per_page', 20));

        return $this->success($disputes);
    }

    /**
     * View a single dispute.
     */
    public function show(Dispute $dispute): JsonResponse
    {
        $dispute->load([
            'buyer:id,name,email',
            'seller:id,name,email',
            'order:id,order_number,total_amount,escrow_amount,status,escrow_status,delivery_content,created_at',
        ]);

        return $this->success($dispute);
    }

    /**
     * Resolve a dispute: refund buyer OR release funds to seller.
     * @deprecated Use release or refund endpoints instead.
     */
    public function resolve(Request $request, Dispute $dispute): JsonResponse
    {
        if (in_array($dispute->status, ['resolved', 'refunded'])) {
            return $this->error('Dispute already resolved.', 422);
        }

        $validated = $request->validate([
            'decision'    => ['required', 'in:refund_buyer,release_seller,release_to_seller'],
            'admin_note'  => ['required', 'string', 'max:2000'],
        ]);

        $decision = $validated['decision'] === 'release_to_seller' ? 'release_seller' : $validated['decision'];
        if ($decision === 'refund_buyer') {
            return $this->refund($request, $dispute);
        }

        return $this->release($request, $dispute);
    }

    /**
     * Release funds to seller (dispute resolved in seller's favour).
     */
    public function release(Request $request, Dispute $dispute): JsonResponse
    {
        if (in_array($dispute->status, ['resolved', 'refunded'])) {
            return $this->error('Dispute already resolved.', 422);
        }

        $validated = $request->validate([
            'admin_note' => ['required', 'string', 'max:2000'],
        ]);

        $order = $dispute->order;
        $admin = $request->user();

        $this->escrow->forceReleaseForDisputeResolution($order);

        $dispute->update([
            'status'         => 'resolved',
            'admin_decision' => 'release_seller',
            'admin_note'     => $validated['admin_note'],
            'resolved_by'    => $admin->id,
            'resolved_at'    => now(),
        ]);

        AdminLogService::log($admin, 'resolve_dispute', "Dispute #{$dispute->id} released to seller. {$validated['admin_note']}", null, null, $order->id);

        $dispute->seller?->notify(new DisputeResolvedSellerPaidNotification($dispute->load('order')));
        $dispute->buyer?->notify(new DisputeResolvedBuyerLosesNotification($dispute->load('order')));

        return $this->success(
            $dispute->fresh()->load(['buyer:id,name', 'seller:id,name', 'order:id,order_number,status,escrow_status']),
            'Funds released to seller.'
        );
    }

    /**
     * Refund buyer (dispute resolved in buyer's favour).
     */
    public function refund(Request $request, Dispute $dispute): JsonResponse
    {
        if (in_array($dispute->status, ['resolved', 'refunded'])) {
            return $this->error('Dispute already resolved.', 422);
        }

        $validated = $request->validate([
            'admin_note' => ['required', 'string', 'max:2000'],
        ]);

        $order = $dispute->order;
        $admin = $request->user();

        $this->escrow->refundBuyer($order);

        $dispute->update([
            'status'         => 'refunded',
            'admin_decision' => 'refund_buyer',
            'admin_note'     => $validated['admin_note'],
            'resolved_by'    => $admin->id,
            'resolved_at'    => now(),
        ]);

        AdminLogService::log($admin, 'resolve_dispute', "Dispute #{$dispute->id} refunded to buyer. {$validated['admin_note']}", null, null, $order->id);

        $dispute->buyer?->notify(new DisputeRefundedNotification($dispute->load('order')));
        $dispute->seller?->notify(new DisputeBuyerRefundedSellerNotification($dispute->load('order')));

        return $this->success(
            $dispute->fresh()->load(['buyer:id,name', 'seller:id,name', 'order:id,order_number,status,escrow_status']),
            'Refund issued to buyer.'
        );
    }
}
