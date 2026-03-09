<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\Conversation;
use App\Notifications\SupportReplyNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSupportController extends Controller
{
    /**
     * List all support conversations (newest first).
     * Returns last message and unread count so the admin can triage quickly.
     */
    public function index(Request $request): JsonResponse
    {
        $conversations = Conversation::where('type', 'support')
            ->with([
                'userOne:id,name,email,last_activity_at',
                'messages' => function ($q) {
                    $q->latest()
                      ->limit(1)
                      ->select('id', 'conversation_id', 'user_id', 'body', 'read_at', 'created_at');
                },
            ])
            ->withCount(['messages as unread_count' => function ($q) {
                // Count user messages (not admin) that haven't been read yet
                $q->whereNull('read_at');
            }])
            ->latest('updated_at')
            ->paginate($request->integer('per_page', 30));

        return $this->success($conversations);
    }

    /**
     * Open a specific support conversation, returning all messages.
     * Marks all unread user messages as read so unread_count resets.
     */
    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        if ($conversation->type !== 'support') {
            return $this->error('Not a support conversation.', 404);
        }

        $messages = $conversation->messages()
            ->with('sender:id,name,email')
            ->orderBy('created_at')
            ->get();

        // Mark every unread message as read now that admin has opened the thread
        $conversation->messages()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return $this->success([
            'conversation' => $conversation->load('userOne:id,name,email'),
            'messages'     => $messages,
        ]);
    }

    /**
     * Admin sends a reply in a support conversation.
     * Creates a DB notification for the user so they know support responded.
     */
    public function reply(Request $request, Conversation $conversation): JsonResponse
    {
        if ($conversation->type !== 'support') {
            return $this->error('Not a support conversation.', 404);
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $message = $conversation->messages()->create([
            'user_id' => $request->user()->id,
            'body'    => $validated['body'],
        ]);

        $message->load('sender:id,name,email');
        $conversation->touch();

        // Notify the user who owns this support thread
        $user = $conversation->userOne;
        if ($user) {
            $user->notify(new SupportReplyNotification(
                messageBody: $validated['body'],
                conversationId: $conversation->id,
            ));
        }

        return $this->success($message, 'Reply sent.', 201);
    }
}
