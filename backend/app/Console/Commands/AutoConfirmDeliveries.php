<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Notifications\OrderCompletedNotification;
use App\Services\EscrowService;
use Illuminate\Console\Command;

class AutoConfirmDeliveries extends Command
{
    protected $signature   = 'orders:auto-confirm';
    protected $description = 'Automatically confirm delivered orders whose auto_confirm_at deadline has passed';

    public function __construct(private readonly EscrowService $escrow)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $orders = Order::where('status', Order::STATUS_DELIVERED)
            ->where('auto_confirm_at', '<=', now())
            ->whereNull('completed_at')
            ->get();

        $count = 0;
        foreach ($orders as $order) {
            try {
                // Wrap status change + escrow release in a transaction with row-level locking
                \DB::transaction(function () use ($order) {
                    /** @var Order|null $locked */
                    $locked = Order::whereKey($order->id)->lockForUpdate()->first();
                    if (! $locked) {
                        return;
                    }

                    // Re-check that order is still eligible for auto-confirm
                    if (
                        $locked->status !== Order::STATUS_DELIVERED
                        || $locked->auto_confirm_at === null
                        || $locked->auto_confirm_at->isFuture()
                        || $locked->completed_at !== null
                    ) {
                        \Log::warning('Auto-confirm skipped: order no longer eligible', [
                            'order_id'      => $locked->id,
                            'status'        => $locked->status,
                            'auto_confirm_at' => $locked->auto_confirm_at,
                            'completed_at'  => $locked->completed_at,
                        ]);

                        return;
                    }

                    $locked->update([
                        'status'       => Order::STATUS_COMPLETED,
                        'completed_at' => now(),
                    ]);

                    $this->escrow->releaseFunds($locked);
                });

                // Notify buyer and seller
                $order->load(['buyer', 'seller']);
                if ($order->buyer) {
                    $order->buyer->notify(new OrderCompletedNotification($order));
                }
                if ($order->seller) {
                    $order->seller->notify(new OrderCompletedNotification($order));
                }

                $count++;
                $this->line("Auto-confirmed order #{$order->order_number}");
            } catch (\Throwable $e) {
                $this->error("Failed to auto-confirm order #{$order->order_number}: {$e->getMessage()}");
            }
        }

        $this->info("Auto-confirmed {$count} order(s).");

        return Command::SUCCESS;
    }
}
