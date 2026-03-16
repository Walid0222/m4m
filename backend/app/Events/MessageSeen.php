<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSeen implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @var int[]
     */
    public array $messageIds;
    public int $conversationId;
    public int $userId;

    /**
     * @param int[] $messageIds
     */
    public function __construct(array $messageIds, int $conversationId, int $userId)
    {
        $this->messageIds = $messageIds;
        $this->conversationId = $conversationId;
        $this->userId = $userId;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.' . $this->conversationId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.seen';
    }

    public function broadcastWith(): array
    {
        return [
            'messageIds'     => $this->messageIds,
            'conversationId' => $this->conversationId,
            'userId'         => $this->userId,
        ];
    }
}

