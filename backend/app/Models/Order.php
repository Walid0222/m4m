<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'seller_id',
        'order_number',
        'status',
        'total_amount',
        'escrow_amount',
        'escrow_status',
        'delivered_at',
        'completed_at',
        'auto_confirm_at',
        'delivery_content',
        'delivery_type',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'escrow_amount' => 'decimal:2',
            'delivered_at' => 'datetime',
            'completed_at' => 'datetime',
            'auto_confirm_at' => 'datetime',
        ];
    }

    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_DISPUTE = 'dispute';

    /** Buyer who placed the order. */
    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Line items in this order. */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** Products in this order (via order items). */
    public function products(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'order_items')
            ->withPivot('quantity', 'unit_price', 'total_price')
            ->withTimestamps();
    }

    /**
     * Sellers involved in this order (distinct users who own the products).
     * Ensure orderItems.product.seller are loaded: $order->load('orderItems.product.seller')
     */
    public function getSellersAttribute(): \Illuminate\Support\Collection
    {
        return $this->orderItems->loadMissing('product.seller')->pluck('product.seller')->unique('id')->values();
    }

    /** Conversation about this order, if any. */
    public function conversation(): HasOne
    {
        return $this->hasOne(Conversation::class);
    }

    /** Reviews for this order. */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /** Seller who fulfilled this order. */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    /** Active dispute for this order, if any. */
    public function dispute(): HasOne
    {
        return $this->hasOne(Dispute::class);
    }
}
