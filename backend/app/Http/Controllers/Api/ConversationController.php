<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Events\UserTyping;
use App\Events\MessageDelivered;
use App\Events\MessageSeen;
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
            ->with(['userOne:id,name,last_activity_at,avatar', 'userTwo:id,name,last_activity_at,avatar', 'order:id,status', 'product:id,name'])
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

        $conversation = Conversation::firstOrCreate(
            [
                'user_one_id' => $userOneId,
                'user_two_id' => $userTwoId,
                'order_id' => $validated['order_id'] ?? null,
                'product_id' => $validated['product_id'] ?? null,
            ],
            ['type' => 'regular']
        );

        // If this conversation row was just created and the other party is a seller with an auto-reply,
        // send the auto-reply once for this conversation.
        if ($conversation->wasRecentlyCreated) {
            $otherUser = \App\Models\User::find($other);
            if ($otherUser && $otherUser->is_seller && ! empty($otherUser->auto_reply_message)) {
                $conversation->messages()->create([
                    'user_id' => $otherUser->id,
                    'body'    => $otherUser->auto_reply_message,
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

        $conversation->load(['userOne:id,name,last_activity_at,avatar', 'userTwo:id,name,last_activity_at,avatar', 'order:id,status', 'product:id,name']);
        $conversation->other_user = $conversation->user_one_id === $userId ? $conversation->userTwo : $conversation->userOne;

        // Mark incoming messages as read for the current user (regular conversations only)
        if (! $isSupportConvo) {
            $conversation->messages()
                ->where('user_id', '!=', $userId)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        $messages = $conversation->messages()
            ->with('sender:id,name,avatar')
            ->latest()
            ->paginate($request->integer('per_page', 20));

        // Mark as delivered: any messages from the other user that are still in 'sent' status
        if (! $isSupportConvo) {
            $deliveredIds = $conversation->messages()
                ->where('user_id', '!=', $userId)
                ->where('status', 'sent')
                ->pluck('id')
                ->all();

            if (! empty($deliveredIds)) {
                $conversation->messages()
                    ->whereIn('id', $deliveredIds)
                    ->update(['status' => 'delivered']);

                foreach ($deliveredIds as $mid) {
                    \Log::info('MessageDelivered broadcast', [
                        'message_id'      => $mid,
                        'conversation_id' => $conversation->id,
                        'delivered_to'    => $userId,
                    ]);

                    broadcast(new MessageDelivered(
                        messageId: $mid,
                        conversationId: $conversation->id,
                        userId: $userId,
                    ))->toOthers();
                }
            }
        }

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
            'body'    => $validated['body'],
            'status'  => 'sent',
        ]);

        $message->load('sender:id,name,avatar');

        $conversation->touch();

        $otherUserId = $conversation->user_one_id === $userId ? $conversation->user_two_id : $conversation->user_one_id;
        $otherUser = \App\Models\User::find($otherUserId);
        if ($otherUser) {
            $otherUser->notify(new NewMessageNotification($message));
        }

        broadcast(new MessageSent($message))->toOthers();

        return $this->success($message->toArray(), 'Message sent.', 201);
    }

    public function typing(Request $request, Conversation $conversation): JsonResponse
    {
        $userId = $request->user()->id;
        $isSupportConvo = $conversation->type === 'support' && $conversation->user_one_id === $userId;
        if (! $isSupportConvo && $conversation->user_one_id !== $userId && $conversation->user_two_id !== $userId) {
            return $this->error('Forbidden.', 403);
        }

        \Log::info('Typing event fired', [
            'conversation_id' => $conversation->id,
            'user_id' => $userId,
        ]);

        broadcast(new UserTyping($conversation->id, $userId))->toOthers();

        return $this->success(null, 'Typing event dispatched.');
    }

    public function seen(Request $request, Conversation $conversation): JsonResponse
    {
        $userId = $request->user()->id;
        $isSupportConvo = $conversation->type === 'support' && $conversation->user_one_id === $userId;
        if (! $isSupportConvo && $conversation->user_one_id !== $userId && $conversation->user_two_id !== $userId) {
            return $this->error('Forbidden.', 403);
        }

        \Log::info('SEEN endpoint reached', [
            'conversation' => $conversation->id,
            'user'         => $userId,
        ]);

        $ids = $conversation->messages()
            ->where('user_id', '!=', $userId)
            // TEMP: remove read_at filter for debugging
            // ->whereNull('read_at')
            ->pluck('id')
            ->all();

        \Log::info('SEEN messageIds', $ids);

        if (! empty($ids)) {
            $now = now();
            $conversation->messages()
                ->whereIn('id', $ids)
                ->update([
                    'read_at' => $now,
                    'status'  => 'seen',
                ]);

            \Log::info('Broadcasting MessageSeen event', [
                'message_ids'     => $ids,
                'conversation_id' => $conversation->id,
                'seen_by'         => $userId,
            ]);

            broadcast(new MessageSeen(
                messageIds: $ids,
                conversationId: $conversation->id,
                userId: $userId,
            ))->toOthers();
        }

        return $this->success(null, 'Messages marked as seen.');
    }
}
