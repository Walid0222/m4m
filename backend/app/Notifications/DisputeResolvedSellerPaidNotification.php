<?php

namespace App\Notifications;

use App\Models\Dispute;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DisputeResolvedSellerPaidNotification extends Notification
{
    use Queueable;

    public function __construct(public Dispute $dispute) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $order = $this->dispute->order;
        $amount = (float) ($order?->escrow_amount ?: $order?->total_amount ?? 0);

        return [
            'type'         => 'dispute_seller_paid',
            'dispute_id'   => $this->dispute->id,
            'order_id'     => $this->dispute->order_id,
            'order_number' => $order?->order_number,
            'amount'       => $amount,
            'message'      => 'Dispute resolved. Funds released to your wallet for order #' . ($order?->order_number ?? ''),
        ];
    }
}
