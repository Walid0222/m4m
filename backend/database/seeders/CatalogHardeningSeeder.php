<?php

namespace Database\Seeders;

use App\Models\OfferType;
use App\Models\Service;
use Illuminate\Database\Seeder;

class CatalogHardeningSeeder extends Seeder
{
    /**
     * Idempotent data repair: cosmetic normalization + category alignment for offer types linked to services.
     * Brand catalog growth lives in ServicesSeeder — avoid duplicating offer-type definitions here.
     */
    public function run(): void
    {
        Service::query()->where('slug', 'spotify')->update(['name' => 'Spotify']);

        $mismatches = OfferType::query()
            ->select('offer_types.id', 'services.category_id as service_category_id')
            ->join('services', 'services.id', '=', 'offer_types.service_id')
            ->whereColumn('offer_types.category_id', '!=', 'services.category_id')
            ->get();

        foreach ($mismatches as $row) {
            OfferType::query()
                ->whereKey($row->id)
                ->update(['category_id' => (int) $row->service_category_id]);
        }
    }
}
