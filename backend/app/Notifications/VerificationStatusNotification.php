<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerificationStatusNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $status // 'approved' | 'rejected'
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        if ($this->status === 'approved') {
            return (new MailMessage)
                ->subject('Your M4M seller verification has been approved')
                ->greeting("Hello {$notifiable->name},")
                ->line('Congratulations! Your seller verification request has been approved.')
                ->line('You now have a "Verified Seller" badge visible on your profile and products.')
                ->action('View Your Profile', url('/seller/dashboard'));
        }

        return (new MailMessage)
            ->subject('Your M4M seller verification was not approved')
            ->greeting("Hello {$notifiable->name},")
            ->line('We have reviewed your seller verification request and unfortunately it could not be approved at this time.')
            ->line('Please ensure your submitted documents are clear, valid, and up to date.')
            ->line('You may submit a new verification request with updated documents.')
            ->action('Resubmit Request', url('/seller/dashboard'));
    }

    public function toArray(object $notifiable): array
    {
        if ($this->status === 'approved') {
            return [
                'type' => 'verification_approved',
                'message' => 'Your seller verification has been approved. You are now a Verified Seller!',
                'link' => '/seller/dashboard',
            ];
        }

        return [
            'type' => 'verification_rejected',
            'message' => 'Your seller verification request was not approved. Please resubmit with valid documents.',
            'link' => '/seller/dashboard',
        ];
    }
}
