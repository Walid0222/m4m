<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Tasks
|--------------------------------------------------------------------------
*/

// Auto-confirm delivered orders every 15 minutes
Schedule::command('orders:auto-confirm')->everyFifteenMinutes();

// Release escrow payouts whose seller delay has passed
Schedule::command('escrow:release')->everyFifteenMinutes();

// Auto-upgrade sellers based on orders, rating, dispute rate
Schedule::command('sellers:upgrade')->daily();
