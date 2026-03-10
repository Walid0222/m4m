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
        'offer_type_id',
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
        'delivery_instructions',
        'features',
        'views',
        'views_last_3_days',
        'orders_last_3_days',
        'activity_reset_at',
        'is_pinned',
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
            'views'             => 'integer',
            'views_last_3_days' => 'integer',
            'orders_last_3_days'=> 'integer',
            'activity_reset_at' => 'datetime',
            'is_pinned'         => 'boolean',
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

    /** Offer type (service type) this product belongs to. */
    public function offerType(): BelongsTo
    {
        return $this->belongsTo(OfferType::class);
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

    /** FAQ entries for this product. */
    public function faqs(): HasMany
    {
        return $this->hasMany(ProductFaq::class);
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

    /** Hide internal analytics for buyer-facing responses. */
    public function hideAnalyticsForBuyers(): self
    {
        $this->makeHidden([
            'views',
            'views_last_3_days',
            'orders_last_3_days',
            'activity_reset_at',
            'completed_orders_count',
            'orders_count',
        ]);

        return $this;
    }

    /**
     * Ensure activity window is valid; reset if expired.
     * Returns the product (refreshed after possible reset).
     */
    public function ensureActivityWindow(): self
    {
        $resetAt = $this->activity_reset_at;
        if ($resetAt && now()->gt($resetAt)) {
            $this->update([
                'views_last_3_days'  => 0,
                'orders_last_3_days' => 0,
                'activity_reset_at'  => now()->addDays(3),
            ]);
            return $this->fresh();
        }
        if (! $resetAt) {
            $this->update(['activity_reset_at' => now()->addDays(3)]);
            return $this->fresh();
        }
        return $this;
    }
}
