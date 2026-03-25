<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\SellerVerification;
use App\Notifications\VerificationStatusNotification;
use App\Services\AdminLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminVerificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SellerVerification::with('seller:id,name,email,is_verified_seller')->latest();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $verifications = $query->paginate(min($request->integer('per_page', 20), 100));

        return $this->success($verifications);
    }

    public function approve(Request $request, SellerVerification $verification): JsonResponse
    {
        if ($verification->status === 'approved') {
            return $this->error('Already approved.', 422);
        }

        $verification->update(['status' => 'approved']);
        $verification->seller()->update(['is_verified_seller' => true]);

        $seller = $verification->seller()->first();
        if ($seller) {
            $seller->notify(new VerificationStatusNotification('approved'));
            AdminLogService::log(
                $request->user(),
                'approve_verification',
                "Approved verification for seller {$seller->name}",
                $seller->id
            );
        }

        return $this->success(
            $verification->load('seller:id,name,email,is_verified_seller'),
            'Verification approved.'
        );
    }

    public function reject(Request $request, SellerVerification $verification): JsonResponse
    {
        if ($verification->status === 'rejected') {
            return $this->error('Already rejected.', 422);
        }

        $verification->update(['status' => 'rejected']);
        $verification->seller()->update(['is_verified_seller' => false]);

        $seller = $verification->seller()->first();
        if ($seller) {
            $seller->notify(new VerificationStatusNotification('rejected'));
            AdminLogService::log(
                $request->user(),
                'reject_verification',
                "Rejected verification for seller {$seller->name}",
                $seller->id
            );
        }

        return $this->success(
            $verification->load('seller:id,name,email'),
            'Verification rejected.'
        );
    }
}
