<?php

namespace App\Http\Controllers\Api;

use App\Models\Dispute;
use App\Models\DisputeActivity;
use App\Models\DisputeMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DisputeMessageController extends Controller
{
    /**
     * Get the message thread for a dispute.
     */
    public function index(Request $request, Dispute $dispute): JsonResponse
    {
        $user = $request->user();

        if (! $this->canAccessDispute($user, $dispute)) {
            return $this->error('Forbidden.', 403);
        }

        $query = $dispute->messages()->orderBy('created_at');

        if (! $user->is_admin) {
            $query->where('is_internal', false);
        }

        $messages = $query->with(['user:id,name'])->get();

        return $this->success($messages);
    }

    /**
     * Create a new message in the dispute.
     */
    public function store(Request $request, Dispute $dispute): JsonResponse
    {
        $user = $request->user();

        if (! $this->canAccessDispute($user, $dispute)) {
            return $this->error('Forbidden.', 403);
        }

        // Do not allow new messages on resolved / refunded disputes
        if (in_array($dispute->status, ['resolved', 'refunded'], true)) {
            return $this->error('Dispute is already resolved.', 422);
        }

        $validated = $request->validate([
            'body'        => ['required', 'string', 'max:5000'],
            'is_internal' => ['sometimes', 'boolean'],
        ]);

        $role = $this->determineRole($user, $dispute);
        if ($role === null) {
            return $this->error('Forbidden.', 403);
        }

        $isInternal = false;
        if ($user->is_admin) {
            $isInternal = (bool) ($validated['is_internal'] ?? false);
        }

        // Basic XSS hardening – strip HTML tags and trim whitespace
        $body = trim(strip_tags($validated['body']));

        $message = DisputeMessage::create([
            'dispute_id'  => $dispute->id,
            'user_id'     => $user->id,
            'role'        => $role,
            'body'        => $body,
            'is_internal' => $isInternal,
        ]);

        $message->load('user:id,name');

        DisputeActivity::create([
            'dispute_id' => $dispute->id,
            'user_id'    => $user->id,
            'type'       => 'message_posted',
            'data'       => [
                'message_id' => $message->id,
            ],
        ]);

        return $this->success($message, 'Message created.', 201);
    }

    /**
     * Check if the authenticated user can access the dispute.
     */
    protected function canAccessDispute($user, Dispute $dispute): bool
    {
        if ($user->is_admin) {
            return true;
        }

        return $dispute->buyer_id === $user->id
            || $dispute->seller_id === $user->id;
    }

    /**
     * Determine the role of the user in this dispute.
     */
    protected function determineRole($user, Dispute $dispute): ?string
    {
        if ($user->is_admin) {
            return 'admin';
        }

        if ($dispute->buyer_id === $user->id) {
            return 'buyer';
        }

        if ($dispute->seller_id === $user->id) {
            return 'seller';
        }

        return null;
    }
}

