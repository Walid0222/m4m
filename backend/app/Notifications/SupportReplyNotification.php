<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class SupportReplyNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $messageBody,
        public int $conversationId
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'support_reply',
            'conversation_id' => $this->conversationId,
            'excerpt' => Str::limit($this->messageBody, 80),
            'message' => 'M4M Support replied to your message.',
            'link' => '/chat',
        ];
    }
}
