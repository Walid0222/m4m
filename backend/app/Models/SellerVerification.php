<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerVerification extends Model
{
    use HasFactory;

    protected $fillable = [
        'seller_id',
        'id_card_front',
        'id_card_back',
        'selfie_with_id',
        'bank_statement',
        'status',
    ];

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }
}
