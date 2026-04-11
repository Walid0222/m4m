<?php

namespace App\Http\Controllers\Api;

use App\Models\DepositRequest;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

        if ($request->filled('transaction_code')) {
            $request->merge(['transaction_code' => trim((string) $request->input('transaction_code'))]);
        }

        $method = $request->input('payment_method') ?? 'bank_transfer';

        $rules = [
            'amount' => ['required', 'numeric', 'min:1'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'payment_method' => ['nullable', Rule::in(['bank_transfer', 'orange_recharge', 'cashplus', 'wafacash'])],
        ];
        if (in_array($method, ['cashplus', 'wafacash'], true)) {
            $rules['transaction_code'] = ['required', 'string', 'max:191', Rule::unique('deposit_requests', 'transaction_code')];
            $rules['receipt_image'] = ['required', 'file', 'image', 'max:5120'];
        }

        $validated = $request->validate($rules);

        $method = $validated['payment_method'] ?? 'bank_transfer';

        // Orange Recharge requires a higher minimum
        if ($method === 'orange_recharge' && (float) $validated['amount'] < 200) {
            return $this->error('Minimum Orange Recharge amount is 200.', 422);
        }

        $payload = [
            'reference_code' => $this->generateReferenceCode(),
            'amount' => $validated['amount'],
            'currency' => $validated['currency'] ?? 'USD',
            'payment_method' => $method,
            'status' => 'pending',
        ];
        if (in_array($method, ['cashplus', 'wafacash'], true)) {
            $payload['transaction_code'] = $validated['transaction_code'];
            $payload['receipt_image'] = $request->file('receipt_image')->store('deposit-receipts', 'public');
        }

        try {
            $deposit = $request->user()->depositRequests()->create($payload);
        } catch (QueryException $e) {
            if (($e->errorInfo[0] ?? '') === '23000' && in_array($method, ['cashplus', 'wafacash'], true)) {
                return $this->error('The given data was invalid.', 422, [
                    'transaction_code' => ['This transaction code has already been used.'],
                ]);
            }
            throw $e;
        }

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
