<?php

namespace App\Notifications;

use App\Models\Dispute;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DisputeBuyerRefundedSellerNotification extends Notification
{
    use Queueable;

    public function __construct(public Dispute $dispute) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'         => 'dispute_refunded_to_buyer',
            'dispute_id'   => $this->dispute->id,
            'order_id'     => $this->dispute->order_id,
            'order_number' => $this->dispute->order?->order_number,
            'message'      => 'Dispute resolved. Buyer was refunded. Funds were returned to the buyer after admin review.',
        ];
    }
}
