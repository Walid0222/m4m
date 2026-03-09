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
     * GET /admin/support-conversations
     * List all support conversations sorted by most-recent message.
     * Returns: conversation id, user info, last message excerpt, unread count.
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
            ->withCount([
                // Unread = messages not yet read (read_at IS NULL)
                'messages as unread_count' => fn ($q) => $q->whereNull('read_at'),
            ])
            ->latest('updated_at')
            ->paginate($request->integer('per_page', 50));

        // Surface the last_message to top-level for convenience
        $conversations->getCollection()->transform(function ($c) {
            $c->last_message = $c->messages->first();
            $c->user = $c->userOne;
            return $c;
        });

        return $this->success($conversations);
    }

    /**
     * GET /admin/support-conversations/{conversation}
     * Open a specific conversation — returns meta + all messages.
     * Marks every unread user message as read.
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

        // Mark all unread messages as read now that admin has opened the thread
        $conversation->messages()->whereNull('read_at')->update(['read_at' => now()]);

        return $this->success([
            'conversation' => $conversation->load('userOne:id,name,email'),
            'messages'     => $messages,
        ]);
    }

    /**
     * GET /admin/support-conversations/{conversation}/messages
     * Fetch only the messages for a support conversation (lighter endpoint).
     * Marks messages as read.
     */
    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        if ($conversation->type !== 'support') {
            return $this->error('Not a support conversation.', 404);
        }

        $messages = $conversation->messages()
            ->with('sender:id,name,email')
            ->orderBy('created_at')
            ->get();

        $conversation->messages()->whereNull('read_at')->update(['read_at' => now()]);

        return $this->success($messages);
    }

    /**
     * POST /admin/support-conversations/{conversation}/reply
     * Admin sends a reply, notifies the user.
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

        // Bump conversation updated_at so it surfaces to top of admin list
        $conversation->touch();

        // Notify the user who owns this thread
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
