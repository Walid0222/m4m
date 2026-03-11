<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class EscrowRefundedToSellerNotification extends Notification
{
    use Queueable;

    public function __construct(public Order $order) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'         => 'escrow_refunded_seller',
            'order_id'     => $this->order->id,
            'order_number' => $this->order->order_number,
            'message'      => 'Order #' . $this->order->order_number . ' refunded to buyer.',
        ];
    }
}
