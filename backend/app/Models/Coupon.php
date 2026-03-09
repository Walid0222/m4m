<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'discount_percent',
        'max_uses',
        'uses',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'discount_percent' => 'integer',
            'max_uses'         => 'integer',
            'uses'             => 'integer',
            'expires_at'       => 'datetime',
        ];
    }
}

