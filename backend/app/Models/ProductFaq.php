<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductFaq extends Model
{
    protected $fillable = ['product_id', 'question', 'answer'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
