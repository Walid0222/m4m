<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletSetting extends Model
{
    protected $table = 'wallet_settings';

    protected $fillable = [
        'min_withdraw_amount',
        'max_withdraw_amount',
        'daily_withdraw_limit',
        'withdraw_cooldown_hours',
        'max_pending_requests',
    ];

    /**
     * Returns the singleton wallet settings row, creating it with sane defaults if missing.
     */
    public static function current(): self
    {
        /** @var self|null $settings */
        $settings = static::query()->latest('id')->first();
        if ($settings) {
            return $settings;
        }

        return static::create([
            'min_withdraw_amount'     => 50,
            'max_withdraw_amount'     => 2000,
            'daily_withdraw_limit'    => 5000,
            'withdraw_cooldown_hours' => 24,
            'max_pending_requests'    => 3,
        ]);
    }
}

