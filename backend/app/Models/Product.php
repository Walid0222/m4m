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
        'is_flash_deal',
        'flash_price',
        'flash_start',
        'flash_end',
        'delivery_time',
        'delivery_type',
        'delivery_content',
        'seller_reminder',
        'features',
    ];

    protected function casts(): array
    {
        return [
            'price'        => 'decimal:2',
            'flash_price'  => 'decimal:2',
            'is_flash_deal'=> 'boolean',
            'flash_start'  => 'datetime',
            'flash_end'    => 'datetime',
            'images'       => 'array',
            'features'     => 'array',
        ];
    }

    protected $appends = [
        'is_flash_active',
        'effective_price',
    ];

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

    /** Account stock entries for instant-delivery products. */
    public function accounts(): HasMany
    {
        return $this->hasMany(ProductAccount::class);
    }

    /** Available (unsold) account stock. */
    public function availableAccounts(): HasMany
    {
        return $this->hasMany(ProductAccount::class)->where('status', ProductAccount::STATUS_AVAILABLE);
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

    public function getIsFlashActiveAttribute(): bool
    {
        if (! $this->is_flash_deal) {
            return false;
        }

        $now = now();

        if ($this->flash_start && $now->lt($this->flash_start)) {
            return false;
        }

        if ($this->flash_end && $now->gt($this->flash_end)) {
            return false;
        }

        return (bool) $this->flash_price && (float) $this->flash_price < (float) $this->price;
    }

    public function getEffectivePriceAttribute(): float
    {
        if ($this->is_flash_active) {
            return (float) $this->flash_price;
        }

        return (float) $this->price;
    }
}
