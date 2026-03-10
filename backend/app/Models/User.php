<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'avatar',
        'password',
        'is_seller',
        'is_admin',
        'is_banned',
        'ban_type',
        'banned_until',
        'ban_reason',
        'warning_count',
        'fraud_score',
        'is_verified_seller',
        'last_activity_at',
        'auto_reply_message',
        'product_limit',
        'limits_overridden',
        'show_recent_sales_notifications',
        'vacation_mode',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The accessors to append to the model's array / JSON form.
     *
     * @var list<string>
     */
    protected $appends = [
        'seller_level',
        'member_since',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_activity_at' => 'datetime',
            'banned_until' => 'datetime',
            'password' => 'hashed',
            'is_seller' => 'boolean',
            'is_admin' => 'boolean',
            'is_banned' => 'boolean',
            'is_verified_seller' => 'boolean',
            'show_recent_sales_notifications' => 'boolean',
            'vacation_mode' => 'boolean',
        ];
    }

    /** User's wallet (one-to-one). */
    public function wallet(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Wallet::class);
    }

    /** Orders where this user is the buyer. */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /** Products listed by this user (seller). */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /** Service requests (seller requesting new offer types). */
    public function serviceRequests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class, 'seller_id');
    }

    /** Deposit requests. */
    public function depositRequests(): HasMany
    {
        return $this->hasMany(DepositRequest::class);
    }

    /** Withdrawal requests. */
    public function withdrawRequests(): HasMany
    {
        return $this->hasMany(WithdrawRequest::class);
    }

    /** Reviews written by this user. */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /** Conversations where this user is user_one. */
    public function conversationsAsUserOne(): HasMany
    {
        return $this->hasMany(Conversation::class, 'user_one_id');
    }

    /** Conversations where this user is user_two. */
    public function conversationsAsUserTwo(): HasMany
    {
        return $this->hasMany(Conversation::class, 'user_two_id');
    }

    /** Messages sent by this user. */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /** Seller verification request. */
    public function sellerVerification(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(SellerVerification::class, 'seller_id');
    }

    /** Reports filed by this user. */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class, 'reporter_id');
    }

    /** Seller statistics. */
    public function sellerStats(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(SellerStat::class, 'seller_id');
    }

    /** Buyer statistics. */
    public function buyerStats(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(BuyerStat::class, 'buyer_id');
    }

    /** Disputes raised by this user as buyer. */
    public function disputes(): HasMany
    {
        return $this->hasMany(Dispute::class, 'buyer_id');
    }

    /** Warnings issued to this seller. */
    public function warnings(): HasMany
    {
        return $this->hasMany(SellerWarning::class, 'seller_id');
    }

    /** Full moderation action history for this seller. */
    public function moderationActions(): HasMany
    {
        return $this->hasMany(SellerModerationAction::class, 'seller_id');
    }

    /** Database notifications (override to use app model). */
    public function notifications(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Notification::class, 'notifiable')->orderByDesc('created_at');
    }

    /** Favorites saved by this user. */
    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    /**
     * Numeric seller level based on completed orders.
     * Formula: level = floor(total_completed_orders / 2)
     */
    public function getSellerLevelAttribute(): int
    {
        $completedOrders = $this->sellerStats?->total_orders ?? 0;
        return (int) floor($completedOrders / 2);
    }

    /**
     * Member since date based on user creation time.
     */
    public function getMemberSinceAttribute(): ?string
    {
        return $this->created_at?->toIso8601String();
    }
}
