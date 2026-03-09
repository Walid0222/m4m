<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformWallet extends Model
{
    protected $table = 'platform_wallet';

    protected $fillable = ['balance', 'total_earned'];

    protected function casts(): array
    {
        return [
            'balance' => 'decimal:2',
            'total_earned' => 'decimal:2',
        ];
    }

    /** Get the singleton platform wallet, creating it if it doesn't exist. */
    public static function singleton(): self
    {
        return self::firstOrCreate([], ['balance' => 0, 'total_earned' => 0]);
    }

    public function credit(float $amount): void
    {
        $this->increment('balance', $amount);
        $this->increment('total_earned', $amount);
    }
}
