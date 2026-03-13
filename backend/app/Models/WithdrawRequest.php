<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class WithdrawRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'amount',
        'currency',
        'status',
        'payment_details',
        'processed_at',
        'rejection_reason',
        'receipt_path',
    ];

    /**
     * The accessors to append to the model's array / JSON form.
     *
     * @var list<string>
     */
    protected $appends = [
        'receipt_url',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'processed_at' => 'datetime',
        ];
    }

    public function getReceiptUrlAttribute(): ?string
    {
        if (! $this->receipt_path) {
            return null;
        }

        try {
            return Storage::disk('public')->url($this->receipt_path);
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** User who requested the withdrawal. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
