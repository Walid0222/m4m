<?php

namespace App\Notifications;

use App\Models\Report;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SellerReportNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Report $report) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $target = $this->report->reported_product_id
            ? "your product \"{$this->report->target_name}\""
            : 'your seller profile';

        return [
            'type'       => 'seller_report',
            'report_id'  => $this->report->id,
            'reason'     => $this->report->reason,
            'target'     => $target,
            'message'    => "⚠️ A report has been submitted against {$target}. Reason: {$this->report->reason}",
            'link'       => '/seller-dashboard?section=reports',
        ];
    }
}
