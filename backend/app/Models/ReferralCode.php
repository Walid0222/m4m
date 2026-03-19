<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralCode extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_user_id',
        'code',
        'affiliate_share_percent',
        'status',
        'expires_at',
        'max_uses',
        'uses',
    ];

    protected $casts = [
        'affiliate_share_percent' => 'integer',
        'max_uses' => 'integer',
        'uses' => 'integer',
        'expires_at' => 'datetime',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function attributions(): HasMany
    {
        return $this->hasMany(ReferralAttribution::class, 'referral_code_id');
    }
}

