<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerStat extends Model
{
    use HasFactory;

    protected $table = 'seller_stats';

    protected $fillable = [
        'seller_id',
        'total_sales',
        'total_orders',
        'total_revenue',
        'rating_average',
        'rating_count',
        'dispute_count',
    ];

    protected function casts(): array
    {
        return [
            'total_revenue' => 'decimal:2',
            'rating_average' => 'decimal:2',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    /** Seller badge based on total_sales. */
    public function getBadgeAttribute(): string
    {
        return match (true) {
            $this->total_sales >= 1000 => '1000+',
            $this->total_sales >= 500  => '500+',
            $this->total_sales >= 100  => '100+',
            $this->total_sales >= 10   => '10+',
            $this->total_sales >= 1    => '1+',
            default                    => 'new',
        };
    }
}
