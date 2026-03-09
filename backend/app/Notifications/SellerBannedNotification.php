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
        if ($this->banType === 'permanent') {
            $subject = '🚫 Your M4M seller account has been permanently banned';
            $body    = 'Your seller account on M4M has been permanently banned due to a serious violation of our marketplace policies.';
            $next    = 'If you believe this is an error, please contact our support team immediately.';
        } else {
            $subject = '⏸️ Your M4M seller account has been suspended';
            $body    = "Your seller account on M4M has been temporarily suspended until {$this->bannedUntil}.";
            $next    = 'Once the suspension period ends, your account will be automatically reactivated. Please comply with our policies going forward.';
        }

        $mail = (new MailMessage)
            ->subject($subject)
            ->greeting("Hello {$notifiable->name},")
            ->line($body);

        if ($this->reason) {
            $mail->line("**Reason:** {$this->reason}");
        }

        return $mail
            ->line($next)
            ->action('Contact Support', url('/support'))
            ->line('Thank you for your understanding.');
    }

    public function toArray(object $notifiable): array
    {
        if ($this->banType === 'permanent') {
            $notifMsg = '🚫 Your seller account has been permanently banned.';
        } elseif ($this->banType === 'temporary') {
            $notifMsg = "⏸️ Your seller account has been suspended until {$this->bannedUntil}.";
        } else {
            $notifMsg = '⚠️ A moderation action has been taken on your account.';
        }

        if ($this->reason) {
            $notifMsg .= " Reason: {$this->reason}";
        }

        return [
            'type'         => 'seller_banned',
            'ban_type'     => $this->banType,
            'banned_until' => $this->bannedUntil,
            'reason'       => $this->reason,
            'message'      => $notifMsg,
            'link'         => '/profile',
        ];
    }
}
