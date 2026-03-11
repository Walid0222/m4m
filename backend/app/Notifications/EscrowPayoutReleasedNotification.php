<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class EscrowPayoutReleasedNotification extends Notification
{
    use Queueable;

    public function __construct(public Order $order, public float $amount) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'         => 'escrow_payout_released',
            'order_id'     => $this->order->id,
            'order_number' => $this->order->order_number,
            'amount'       => $this->amount,
            'message'      => 'Order #' . $this->order->order_number . ' payout released.',
        ];
    }
}
