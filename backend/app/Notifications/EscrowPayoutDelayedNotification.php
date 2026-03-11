<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class EscrowPayoutDelayedNotification extends Notification
{
    use Queueable;

    public function __construct(public Order $order, public int $hours) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'         => 'escrow_payout_delayed',
            'order_id'     => $this->order->id,
            'order_number' => $this->order->order_number,
            'hours'        => $this->hours,
            'message'      => 'Order #' . $this->order->order_number . ' payout delayed by ' . $this->hours . ' hours.',
        ];
    }
}
