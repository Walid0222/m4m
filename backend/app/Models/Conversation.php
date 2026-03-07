<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_one_id',
        'user_two_id',
        'order_id',
        'product_id',
    ];

    /** First participant. */
    public function userOne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_one_id');
    }

    /** Second participant. */
    public function userTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_two_id');
    }

    /** Order this conversation is about, if any. */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** Product this conversation is about, if any. */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** Messages in this conversation. */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /** Get the other participant for a given user. */
    public function otherParticipant(User $user): ?User
    {
        if ($this->user_one_id === $user->id) {
            return $this->userTwo;
        }
        if ($this->user_two_id === $user->id) {
            return $this->userOne;
        }

        return null;
    }
}
