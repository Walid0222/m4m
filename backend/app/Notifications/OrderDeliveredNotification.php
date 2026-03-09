<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrderDeliveredNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Order $order) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'     => 'order_delivered',
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
            'message'  => "Your order {$this->order->order_number} has been delivered. Please confirm reception.",
            'link'     => "/orders/{$this->order->id}",
        ];
    }
}
