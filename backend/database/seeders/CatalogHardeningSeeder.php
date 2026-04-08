<?php

namespace Database\Seeders;

use App\Models\OfferType;
use App\Models\Service;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CatalogHardeningSeeder extends Seeder
{
    /**
     * Canonical offer types we want available for key subscription-like services.
     *
     * @var array<int, string>
     */
    private array $canonicalOfferTypes = [
        'Account',
        'Premium',
        'Subscription',
        'Family Plan',
        'Code',
        'Gift Card',
    ];

    /**
     * Service slugs that must have canonical offer types.
     *
     * @var array<int, string>
     */
    private array $targetServiceSlugs = [
        'chatgpt',
        'youtube-premium',
        'apple-music',
        'tidal',
        'soundcloud',
    ];

    public function run(): void
    {
        // Cosmetic normalization that is safe and idempotent.
        Service::query()->where('slug', 'spotify')->update(['name' => 'Spotify']);

        // 1) Category alignment repair: service-linked offer types follow service category.
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

        // 2) Ensure canonical offer types for selected existing services.
        $services = Service::query()
            ->whereIn('slug', $this->targetServiceSlugs)
            ->get(['id', 'name', 'slug', 'category_id']);

        foreach ($services as $service) {
            if (! $service->category_id) {
                // Safety: do not create dangling offer types without a category.
                continue;
            }

            foreach ($this->canonicalOfferTypes as $offerTypeName) {
                $this->ensureOfferTypeForService($service->id, $service->slug, (int) $service->category_id, $offerTypeName);
            }
        }
    }

    private function ensureOfferTypeForService(int $serviceId, string $serviceSlug, int $categoryId, string $name): void
    {
        // Prefer matching by service_id + canonical name (case-insensitive) to avoid duplicates.
        $existing = OfferType::query()
            ->where('service_id', $serviceId)
            ->whereRaw('LOWER(name) = ?', [Str::lower($name)])
            ->first();

        if ($existing) {
            $existing->update([
                'category_id' => $categoryId,
                'status' => OfferType::STATUS_ACTIVE,
            ]);

            return;
        }

        $baseSlug = Str::slug($name.' '.$serviceSlug);
        $slug = $baseSlug;
        $n = 1;
        while (OfferType::query()->where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.(++$n);
        }

        OfferType::query()->create([
            'name' => $name,
            'slug' => $slug,
            'service_id' => $serviceId,
            'category_id' => $categoryId,
            'description' => null,
            'icon' => null,
            'status' => OfferType::STATUS_ACTIVE,
        ]);
    }
}

