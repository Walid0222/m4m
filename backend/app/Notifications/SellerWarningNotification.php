<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SellerWarningNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $reason,
        public readonly string $message,
        public readonly int    $warningCount = 1,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('⚠️ Official Warning — M4M Marketplace')
            ->greeting("Hello {$notifiable->name},")
            ->line('You have received an official warning from the M4M moderation team.')
            ->line("**Reason:** {$this->reason}")
            ->line($this->message)
            ->line('Please review and comply with our marketplace policies.')
            ->line("This is warning #{$this->warningCount} on your account. Repeated violations may result in temporary or permanent suspension.")
            ->action('View Seller Dashboard', url('/seller/dashboard'))
            ->line('If you believe this warning was issued in error, please contact our support team.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'          => 'seller_warning',
            'reason'        => $this->reason,
            'message'       => $this->message,
            'warning_count' => $this->warningCount,
            'notification'  => "⚠️ You received a warning: {$this->reason}. {$this->message}",
            'link'          => '/seller/dashboard',
        ];
    }
}
