<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\Dispute;
use App\Models\Order;
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
            'order:id,order_number,total_amount,escrow_amount,status',
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
            'order:id,order_number,total_amount,escrow_amount,status,escrow_status',
        ]);

        return $this->success($dispute);
    }

    /**
     * Resolve a dispute: refund buyer OR release funds to seller.
     */
    public function resolve(Request $request, Dispute $dispute): JsonResponse
    {
        if (in_array($dispute->status, ['resolved', 'refunded'])) {
            return $this->error('Dispute already resolved.', 422);
        }

        $validated = $request->validate([
            'decision'    => ['required', 'in:refund_buyer,release_to_seller'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $order = $dispute->order;

        if ($validated['decision'] === 'refund_buyer') {
            $this->escrow->refundBuyer($order);
            $dispute->update([
                'status'         => 'refunded',
                'admin_decision' => 'refund_buyer',
                'resolved_by'    => $request->user()->id,
                'resolved_at'    => now(),
            ]);
            $statusLabel = 'Refund issued to buyer.';
        } else {
            $this->escrow->releaseFunds($order);
            $order->update([
                'status'       => Order::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);
            $dispute->update([
                'status'         => 'resolved',
                'admin_decision' => 'release_to_seller',
                'resolved_by'    => $request->user()->id,
                'resolved_at'    => now(),
            ]);
            $statusLabel = 'Funds released to seller.';
        }

        AdminLogService::log(
            $request->user(),
            'resolve_dispute',
            "Dispute #{$dispute->id} for order #{$order->order_number}: {$validated['decision']}" .
                ($validated['description'] ? " — {$validated['description']}" : ''),
            null,
            null,
            $order->id
        );

        return $this->success(
            $dispute->fresh()->load(['buyer:id,name', 'seller:id,name', 'order:id,order_number,status']),
            $statusLabel
        );
    }
}
