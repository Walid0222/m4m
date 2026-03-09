<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'account_data',
        'status',
        'order_item_id',
    ];

    public const STATUS_AVAILABLE = 'available';
    public const STATUS_SOLD      = 'sold';

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }
}
