<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSecurityLog extends Model
{
    use HasFactory;

    protected $table = 'user_security_logs';

    protected $fillable = [
        'user_id',
        'ip_address',
        'device',
        'location',
        'country',
        'user_agent',
        'action',
        'metadata',
        'flagged',
        'flag_reason',
    ];

    protected function casts(): array
    {
        return [
            'metadata'    => 'array',
            'flagged'     => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
