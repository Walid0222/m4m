<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerWarning extends Model
{
    use HasFactory;

    protected $fillable = [
        'seller_id',
        'admin_id',
        'reason',
        'message',
        'is_read',
        'dismissed_at',
    ];

    protected function casts(): array
    {
        return [
            'is_read'      => 'boolean',
            'dismissed_at' => 'datetime',
        ];
    }

    /**
     * Guard against invalid string values being written into dismissed_at.
     * Accepts null or any value Laravel can cast to a datetime; coerces the
     * known bad literal "dismissed_at" back to null.
     */
    public function setDismissedAtAttribute($value): void
    {
        if ($value === 'dismissed_at') {
            $this->attributes['dismissed_at'] = null;
            return;
        }

        $this->attributes['dismissed_at'] = $value;
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
