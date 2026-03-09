<?php

namespace App\Http\Controllers\Api;

use App\Models\SellerVerification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerVerificationController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->is_seller) {
            return $this->error('Only sellers can request verification.', 403);
        }

        $existing = SellerVerification::where('seller_id', $request->user()->id)->first();

        if ($existing && $existing->status === 'pending') {
            return $this->error('You already have a pending verification request.', 422);
        }

        $validated = $request->validate([
            'id_card_front' => ['required', 'string', 'max:500'],
            'id_card_back' => ['required', 'string', 'max:500'],
            'bank_statement' => ['nullable', 'string', 'max:500'],
        ]);

        if ($existing) {
            $existing->update(array_merge($validated, ['status' => 'pending']));
            return $this->success($existing->fresh(), 'Verification request updated.');
        }

        $verification = SellerVerification::create(array_merge($validated, [
            'seller_id' => $request->user()->id,
            'status' => 'pending',
        ]));

        return $this->success($verification, 'Verification request submitted.', 201);
    }

    public function show(Request $request): JsonResponse
    {
        $verification = SellerVerification::where('seller_id', $request->user()->id)->first();

        if (! $verification) {
            return $this->success(null, 'No verification request found.');
        }

        return $this->success($verification);
    }
}
