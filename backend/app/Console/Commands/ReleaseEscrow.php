<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Services\EscrowService;
use Illuminate\Console\Command;

class ReleaseEscrow extends Command
{
    protected $signature = 'escrow:release';

    protected $description = 'Release escrow payouts that have passed their seller-specific delay.';

    public function __construct(private readonly EscrowService $escrow)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $query = Order::where('escrow_status', 'pending_release')
            ->whereNotNull('release_at')
            ->where('release_at', '<=', now())
            ->whereDoesntHave('dispute');

        $count = 0;

        $query->chunkById(100, function ($orders) use (&$count) {
            foreach ($orders as $order) {
                try {
                    $this->escrow->processScheduledRelease($order);
                    $count++;
                    $this->line("Released escrow for order #{$order->order_number}");
                } catch (\Throwable $e) {
                    $this->error("Failed to release escrow for order #{$order->order_number}: {$e->getMessage()}");
                }
            }
        });

        $this->info("Processed {$count} escrow release(s).");

        return Command::SUCCESS;
    }
}

