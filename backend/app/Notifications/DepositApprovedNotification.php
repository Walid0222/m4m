<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DepositApprovedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public float $amount,
        public string $currency,
        public string $referenceCode
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'deposit_approved',
            'amount' => $this->amount,
            'currency' => $this->currency,
            'reference_code' => $this->referenceCode,
            'message' => "Your deposit of {$this->currency} " . number_format($this->amount, 2) . " has been approved.",
        ];
    }
}
