<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Platform Commission
    |--------------------------------------------------------------------------
    | Percentage taken from each completed order before paying out the seller.
    | Example: 10 means 10% → seller receives 90% of the order total.
    */
    'commission_percent' => (float) env('PLATFORM_COMMISSION_PERCENT', 10),

    /*
    |--------------------------------------------------------------------------
    | Auto-Confirm Timeout (hours)
    |--------------------------------------------------------------------------
    | How many hours after an order is marked "delivered" before it is
    | automatically confirmed as "completed" if the buyer does not act.
    */
    'auto_confirm_hours' => (int) env('PLATFORM_AUTO_CONFIRM_HOURS', 24),

    /*
    |--------------------------------------------------------------------------
    | Escrow Release Delay (hours)
    |--------------------------------------------------------------------------
    | Optional extra delay after completion before seller receives funds.
    | Set to 0 to release immediately on completion.
    */
    'escrow_release_delay_hours' => (int) env('PLATFORM_ESCROW_RELEASE_DELAY_HOURS', 0),
];
