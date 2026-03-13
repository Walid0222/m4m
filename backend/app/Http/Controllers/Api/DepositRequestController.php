<?php

namespace App\Http\Controllers\Api;

use App\Models\DepositRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepositRequestController extends Controller
{
    private function generateReferenceCode(): string
    {
        do {
            $code = 'M4M-' . strtoupper(bin2hex(random_bytes(3)));
        } while (DepositRequest::where('reference_code', $code)->exists());

        return $code;
    }

    public function index(Request $request): JsonResponse
    {
        $deposits = $request->user()
            ->depositRequests()
            ->latest()
            ->paginate(15);

        return $this->success($deposits);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        // Only buyers (non-sellers) can create deposits
        if ($user->is_seller) {
            return $this->error('Only buyers can create deposits.', 403);
        }

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'payment_method' => ['nullable', 'string', 'max:255'],
        ]);

        $method = $validated['payment_method'] ?? 'bank_transfer';

        // Orange Recharge requires a higher minimum
        if ($method === 'orange_recharge' && (float) $validated['amount'] < 200) {
            return $this->error('Minimum Orange Recharge amount is 200.', 422);
        }

        $deposit = $request->user()->depositRequests()->create([
            'reference_code' => $this->generateReferenceCode(),
            'amount' => $validated['amount'],
            'currency' => $validated['currency'] ?? 'USD',
            'payment_method' => $method,
            'status' => 'pending',
        ]);

        return $this->success([
            'id' => $deposit->id,
            'reference_code' => $deposit->reference_code,
            'amount' => (float) $deposit->amount,
            'currency' => $deposit->currency,
            'status' => $deposit->status,
            'created_at' => $deposit->created_at->toIso8601String(),
        ], 'Deposit request created. Use reference code when making payment.', 201);
    }
}
