<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class WithdrawApprovedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public float $amount,
        public string $currency
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'withdraw_approved',
            'amount' => $this->amount,
            'currency' => $this->currency,
            'message' => "Your withdrawal of {$this->currency} " . number_format($this->amount, 2) . " has been approved.",
        ];
    }
}
