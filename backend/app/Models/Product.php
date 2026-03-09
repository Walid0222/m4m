<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'description',
        'price',
        'stock',
        'images',
        'status',
        'delivery_time',
        'delivery_type',
        'delivery_content',
        'seller_reminder',
        'features',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'images' => 'array',
            'features' => 'array',
        ];
    }

    /** Seller who owns the product. */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Order items (purchases) of this product. */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** Orders that include this product (via order items). */
    public function orders(): \Illuminate\Database\Eloquent\Relations\HasManyThrough
    {
        return $this->hasManyThrough(Order::class, OrderItem::class, 'product_id', 'id', 'id', 'order_id');
    }

    /** Reviews for this product. */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /** Conversations about this product. */
    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }
}
