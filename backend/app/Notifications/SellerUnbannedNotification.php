<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SellerUnbannedNotification extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your M4M seller account has been reinstated')
            ->greeting("Hello {$notifiable->name},")
            ->line('Good news! Your seller account on M4M has been reinstated.')
            ->line('You can now log in and resume selling on the marketplace.')
            ->action('Go to Marketplace', url('/'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'seller_unbanned',
            'message' => 'Your seller account has been reinstated. You can now sell on M4M again.',
            'link' => '/seller/dashboard',
        ];
    }
}
