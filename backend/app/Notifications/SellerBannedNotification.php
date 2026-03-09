<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SellerBannedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $banType,
        public ?string $bannedUntil = null,
        public ?string $reason = null
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $subject = $this->banType === 'permanent'
            ? 'Your M4M seller account has been permanently banned'
            : 'Your M4M seller account has been suspended';

        $body = $this->banType === 'permanent'
            ? 'Your seller account on M4M has been permanently banned due to a violation of our marketplace policies.'
            : "Your seller account on M4M has been temporarily suspended until {$this->bannedUntil}.";

        $mail = (new MailMessage)
            ->subject($subject)
            ->greeting("Hello {$notifiable->name},")
            ->line($body);

        if ($this->reason) {
            $mail->line("Reason: {$this->reason}");
        }

        $mail->line('If you believe this is a mistake, please contact our support team.')
             ->line('Thank you for understanding.');

        return $mail;
    }

    public function toArray(object $notifiable): array
    {
        $message = $this->banType === 'permanent'
            ? 'Your seller account has been permanently banned.'
            : "Your seller account has been suspended until {$this->bannedUntil}.";

        return [
            'type' => 'seller_banned',
            'ban_type' => $this->banType,
            'banned_until' => $this->bannedUntil,
            'reason' => $this->reason,
            'message' => $message,
            'link' => '/profile',
        ];
    }
}
