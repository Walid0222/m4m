<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountDelivery extends Model
{
    public $timestamps = false;

    protected $fillable = ['order_id', 'product_account_id', 'account_data', 'delivered_at'];

    protected function casts(): array
    {
        return ['delivered_at' => 'datetime'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function productAccount(): BelongsTo
    {
        return $this->belongsTo(ProductAccount::class);
    }
}
