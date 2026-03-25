<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\SellerVerification;
use App\Notifications\VerificationStatusNotification;
use App\Services\AdminLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Handles the exact URL shape the React frontend uses:
 *   GET  /admin/verification-requests
 *   PATCH /admin/verification-requests/{id}   { action: 'approved' | 'rejected' }
 *
 * The existing AdminVerificationController (separate approve/reject endpoints) is
 * kept as-is for backward compatibility.
 */
class AdminVerificationRequestController extends Controller
{
    /**
     * List all verification requests, with seller info.
     * Supports ?status= filter.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SellerVerification::with('seller:id,name,email,is_verified_seller,last_activity_at')
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $verifications = $query->paginate(min($request->integer('per_page', 50), 100));

        // Normalise field names so the frontend can use either id_card_front or
        // national_id_front — it renders whichever it finds first.
        $verifications->getCollection()->transform(function ($v) {
            $v->national_id_front     = $v->id_card_front;
            $v->national_id_back      = $v->id_card_back;
            $v->bank_statement_url    = $v->bank_statement;
            return $v;
        });

        return $this->success($verifications);
    }

    /**
     * Approve or reject a verification request.
     *
     * PATCH /admin/verification-requests/{id}
     * Body: { "action": "approved" | "rejected" }
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $verification = SellerVerification::findOrFail($id);

        $validated = $request->validate([
            'action' => ['required', 'in:approved,rejected'],
        ]);

        $action = $validated['action'];

        if ($verification->status === $action) {
            return $this->error("Request is already {$action}.", 422);
        }

        $verification->update(['status' => $action]);

        $isApproved = $action === 'approved';
        $verification->seller()->update(['is_verified_seller' => $isApproved]);

        $seller = $verification->seller()->first();
        if ($seller) {
            $seller->notify(new VerificationStatusNotification($action));

            AdminLogService::log(
                $request->user(),
                $isApproved ? 'approve_verification' : 'reject_verification',
                ($isApproved ? 'Approved' : 'Rejected') . " verification for seller {$seller->name}",
                $seller->id
            );
        }

        // Append normalised aliases for the frontend card renderer
        $verification->national_id_front  = $verification->id_card_front;
        $verification->national_id_back   = $verification->id_card_back;
        $verification->bank_statement_url = $verification->bank_statement;

        return $this->success(
            $verification->load('seller:id,name,email,is_verified_seller'),
            $isApproved ? 'Verification approved.' : 'Verification rejected.'
        );
    }
}
