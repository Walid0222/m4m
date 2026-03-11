<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\SellerStat;
use App\Models\User;
use Illuminate\Console\Command;

class UpgradeSellers extends Command
{
    protected $signature = 'sellers:upgrade';

    protected $description = 'Automatically upgrade seller levels based on orders, rating, and dispute rate.';

    public function handle(): int
    {
        $sellers = User::where('is_seller', true)->get();
        $upgraded = 0;

        foreach ($sellers as $seller) {
            $stats = SellerStat::firstOrCreate(['seller_id' => $seller->id]);
            $completedOrders = Order::where('seller_id', $seller->id)
                ->where('status', Order::STATUS_COMPLETED)
                ->count();
            $rating = (float) ($stats->rating_average ?? 0);
            $disputeCount = (int) ($stats->dispute_count ?? 0);
            $disputeRate = $completedOrders > 0
                ? round(($disputeCount / $completedOrders) * 100, 2)
                : 0;

            $currentLevel = $seller->getRawOriginal('seller_level') ?? 'new';
            $newLevel = $currentLevel;

            if ($completedOrders >= 200 && $rating >= 4.7 && $disputeRate < 2) {
                $newLevel = 'trusted';
            } elseif ($completedOrders >= 50 && $rating >= 4.5 && $disputeRate < 5) {
                $newLevel = 'verified';
            }

            if ($newLevel !== $currentLevel) {
                $seller->update(['seller_level' => $newLevel]);
                $upgraded++;
                $this->line("Upgraded seller #{$seller->id} ({$seller->email}) to {$newLevel}");
            }
        }

        $this->info("Upgraded {$upgraded} seller(s).");

        return Command::SUCCESS;
    }
}
