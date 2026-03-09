<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuyerStat extends Model
{
    use HasFactory;

    protected $table = 'buyer_stats';

    protected $fillable = [
        'buyer_id',
        'total_purchases',
        'total_orders',
        'total_spent',
        'reviews_given',
        'dispute_count',
    ];

    protected function casts(): array
    {
        return [
            'total_spent' => 'decimal:2',
        ];
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    /** Buyer badge based on total_purchases. */
    public function getBadgeAttribute(): string
    {
        return match (true) {
            $this->total_purchases >= 100 => '100+',
            $this->total_purchases >= 50  => '50+',
            $this->total_purchases >= 10  => '10+',
            $this->total_purchases >= 1   => '1+',
            default                       => 'new',
        };
    }
}
