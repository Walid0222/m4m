<?php

namespace App\Http\Controllers\Api;

use App\Models\Conversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportController extends Controller
{
    /**
     * Get or create the support conversation for the authenticated user.
     */
    public function getOrCreate(Request $request): JsonResponse
    {
        $user = $request->user();

        $conversation = Conversation::where('type', 'support')
            ->where('user_one_id', $user->id)
            ->first();

        if (! $conversation) {
            $conversation = Conversation::create([
                'user_one_id' => $user->id,
                'user_two_id' => null,
                'type' => 'support',
            ]);
        }

        $conversation->load(['messages' => function ($q) {
            $q->with('sender:id,name,email')->orderBy('created_at');
        }]);

        return $this->success($conversation);
    }

    /**
     * Send a message to the support conversation.
     */
    public function sendMessage(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $conversation = Conversation::where('type', 'support')
            ->where('user_one_id', $user->id)
            ->first();

        if (! $conversation) {
            $conversation = Conversation::create([
                'user_one_id' => $user->id,
                'user_two_id' => null,
                'type' => 'support',
            ]);
        }

        $message = $conversation->messages()->create([
            'user_id' => $user->id,
            'body' => $validated['body'],
        ]);

        $message->load('sender:id,name,email');

        return $this->success($message, 'Message sent.', 201);
    }

    /**
     * Get all messages for the user's support conversation.
     */
    public function messages(Request $request): JsonResponse
    {
        $user = $request->user();

        $conversation = Conversation::where('type', 'support')
            ->where('user_one_id', $user->id)
            ->first();

        if (! $conversation) {
            return $this->success([]);
        }

        $messages = $conversation->messages()
            ->with('sender:id,name,email')
            ->orderBy('created_at')
            ->get();

        return $this->success($messages);
    }
}
