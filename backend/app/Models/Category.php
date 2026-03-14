<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Category extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug', 'icon'];

    public function offerTypes(): HasMany
    {
        return $this->hasMany(OfferType::class);
    }

    /** Products via offer types (for counting active products per category). */
    public function products(): HasManyThrough
    {
        return $this->hasManyThrough(
            Product::class,
            OfferType::class,
            'category_id',
            'offer_type_id',
            'id',
            'id'
        );
    }
}
