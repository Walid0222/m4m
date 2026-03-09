<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'reporter_id',
        'reported_product_id',
        'reported_seller_id',
        'type',
        'reason',
        'description',
        'target_name',
        'status',
        'admin_action',
    ];

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function reportedProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'reported_product_id');
    }

    public function reportedSeller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_seller_id');
    }
}
