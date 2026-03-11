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

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
