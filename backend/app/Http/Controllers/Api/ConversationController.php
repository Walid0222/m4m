<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\Message;
use App\Notifications\NewMessageNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $conversations = Conversation::where('type', 'regular')
            ->where(function ($q) use ($userId) {
                $q->where('user_one_id', $userId)->orWhere('user_two_id', $userId);
            })
            ->with(['userOne:id,name,last_activity_at', 'userTwo:id,name,last_activity_at', 'order:id,status', 'product:id,name'])
            ->withCount(['messages'])
            ->latest('updated_at')
            ->paginate($request->integer('per_page', 15));

        $conversations->getCollection()->transform(function (Conversation $c) use ($request) {
            $c->other_user = $c->user_one_id === $request->user()->id ? $c->userTwo : $c->userOne;
            return $c;
        });

        return $this->success($conversations);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'other_user_id' => ['required', 'integer', 'exists:users,id'],
            'order_id' => ['nullable', 'integer', 'exists:orders,id'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
        ]);

        $me = $request->user()->id;
        $other = $validated['other_user_id'];
        if ($me === $other) {
            return $this->error('Cannot start conversation with yourself.', 422);
        }

        $userOneId = min($me, $other);
        $userTwoId = max($me, $other);

        $isNew = ! Conversation::where([
            'user_one_id' => $userOneId,
            'user_two_id' => $userTwoId,
        ])->exists();

        $conversation = Conversation::firstOrCreate(
            [
                'user_one_id' => $userOneId,
                'user_two_id' => $userTwoId,
                'order_id' => $validated['order_id'] ?? null,
                'product_id' => $validated['product_id'] ?? null,
            ],
            ['type' => 'regular']
        );

        // If new conversation and the other party is a seller with an auto-reply message, post it
        if ($isNew) {
            $otherUser = \App\Models\User::find($other);
            if ($otherUser && $otherUser->is_seller && ! empty($otherUser->auto_reply_message)) {
                $conversation->messages()->create([
                    'sender_id' => $otherUser->id,
                    'body'      => $otherUser->auto_reply_message,
                ]);
            }
        }

        $conversation->load(['userOne:id,name,last_activity_at', 'userTwo:id,name,last_activity_at', 'order:id', 'product:id,name']);

        return $this->success($conversation->toArray(), 'Conversation ready.', 201);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $userId = $request->user()->id;
        $isSupportConvo = $conversation->type === 'support' && $conversation->user_one_id === $userId;
        if (! $isSupportConvo && $conversation->user_one_id !== $userId && $conversation->user_two_id !== $userId) {
            return $this->error('Forbidden.', 403);
        }

        $conversation->load(['userOne:id,name,last_activity_at', 'userTwo:id,name,last_activity_at', 'order:id,status', 'product:id,name']);
        $conversation->other_user = $conversation->user_one_id === $userId ? $conversation->userTwo : $conversation->userOne;

        $messages = $conversation->messages()
            ->with('sender:id,name')
            ->latest()
            ->paginate($request->integer('per_page', 50));

        return $this->success([
            'conversation' => $conversation,
            'messages' => $messages,
        ]);
    }

    public function storeMessage(Request $request, Conversation $conversation): JsonResponse
    {
        $userId = $request->user()->id;
        $isSupportConvo = $conversation->type === 'support' && $conversation->user_one_id === $userId;
        if (! $isSupportConvo && $conversation->user_one_id !== $userId && $conversation->user_two_id !== $userId) {
            return $this->error('Forbidden.', 403);
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $message = $conversation->messages()->create([
            'user_id' => $userId,
            'body' => $validated['body'],
        ]);

        $message->load('sender:id,name');

        $conversation->touch();

        $otherUserId = $conversation->user_one_id === $userId ? $conversation->user_two_id : $conversation->user_one_id;
        $otherUser = \App\Models\User::find($otherUserId);
        if ($otherUser) {
            $otherUser->notify(new NewMessageNotification($message));
        }

        broadcast(new MessageSent($message))->toOthers();

        return $this->success($message->toArray(), 'Message sent.', 201);
    }
}
