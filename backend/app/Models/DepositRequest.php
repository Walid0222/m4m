<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepositRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'reference_code',
        'amount',
        'currency',
        'status',
        'payment_method',
        'payment_reference',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'completed_at' => 'datetime',
        ];
    }

    /** User who requested the deposit. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
