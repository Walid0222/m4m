<?php

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;

class BroadcastServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Broadcast::routes(['middleware' => ['auth:sanctum']]);

        Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
            $conversation = \App\Models\Conversation::find($conversationId);

            return $conversation
                && ($conversation->user_one_id === $user->id || $conversation->user_two_id === $user->id);
        });
    }
}
