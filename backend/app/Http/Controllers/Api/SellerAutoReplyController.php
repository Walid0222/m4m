<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerAutoReplyController extends Controller
{
    /** GET /seller/auto-reply */
    public function show(Request $request): JsonResponse
    {
        return $this->success([
            'auto_reply_message' => $request->user()->auto_reply_message,
        ]);
    }

    /** PUT /seller/auto-reply */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'auto_reply_message' => ['nullable', 'string', 'max:500'],
        ]);

        $request->user()->update([
            'auto_reply_message' => $validated['auto_reply_message'] ?? null,
        ]);

        return $this->success([
            'auto_reply_message' => $request->user()->fresh()->auto_reply_message,
        ], 'Auto-reply message updated.');
    }
}
