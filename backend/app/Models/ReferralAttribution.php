<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralAttribution extends Model
{
    use HasFactory;

    protected $fillable = [
        'referral_code_id',
        'order_id',
        'buyer_user_id',
        'status',
        'affiliate_share_percent_used',
        'pending_at',
        'paid_at',
        'refunded_at',
        'platform_fee_amount',
        'affiliate_amount',
        'platform_net_amount',
    ];

    protected $casts = [
        'affiliate_share_percent_used' => 'integer',
        'pending_at' => 'datetime',
        'paid_at' => 'datetime',
        'refunded_at' => 'datetime',
        'platform_fee_amount' => 'decimal:2',
        'affiliate_amount' => 'decimal:2',
        'platform_net_amount' => 'decimal:2',
    ];

    public function referralCode(): BelongsTo
    {
        return $this->belongsTo(ReferralCode::class, 'referral_code_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_user_id');
    }
}

