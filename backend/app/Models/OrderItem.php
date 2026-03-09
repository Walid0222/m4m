<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    protected $table = 'order_items';

    protected $fillable = [
        'order_id',
        'product_id',
        'quantity',
        'unit_price',
        'total_price',
        'delivery_credentials',
    ];

    protected function casts(): array
    {
        return [
            'unit_price' => 'decimal:2',
            'total_price' => 'decimal:2',
        ];
    }

    /** Order this line item belongs to. */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** Product ordered. */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
