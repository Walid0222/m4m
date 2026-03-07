<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'order_id',
        'product_id',
        'rating',
        'comment',
    ];

    /** User (buyer) who wrote the review. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Reviewer (alias for user). */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Order being reviewed. */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** Product being reviewed, if specific to a product. */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
