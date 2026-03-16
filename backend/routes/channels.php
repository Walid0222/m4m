<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::routes([
    'middleware' => ['api', 'auth:sanctum']
]);
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('conversation.{conversation}', function ($user, $conversationId) {

    \Log::info('Broadcast auth test', [
        'user_id' => $user?->id,
        'conversation_id' => $conversationId
    ]);

    return true;
});
