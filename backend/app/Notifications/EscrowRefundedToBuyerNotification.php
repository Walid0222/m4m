<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class EscrowRefundedToBuyerNotification extends Notification
{
    use Queueable;

    public function __construct(public Order $order) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $amount = (float) ($this->order->escrow_amount ?: $this->order->total_amount);

        return [
            'type'    => 'escrow_refunded_buyer',
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
            'amount'  => $amount,
            'message' => 'Refund processed. Funds returned to your wallet for order #' . $this->order->order_number,
        ];
    }
}
