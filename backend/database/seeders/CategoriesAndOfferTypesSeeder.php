<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

/**
 * Ensures marketplace categories exist only.
 * Services and offer types are defined in ServicesSeeder (single source of truth).
 */
class CategoriesAndOfferTypesSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Streaming', 'slug' => 'streaming', 'icon' => '📺'],
            ['name' => 'Gaming', 'slug' => 'gaming', 'icon' => '🎮'],
            ['name' => 'Gift Cards', 'slug' => 'gift-cards', 'icon' => '🎁'],
            ['name' => 'Software', 'slug' => 'software', 'icon' => '💻'],
            ['name' => 'Social Media', 'slug' => 'social-media', 'icon' => '📱'],
            ['name' => 'Subscriptions', 'slug' => 'subscriptions', 'icon' => '🔄'],
            ['name' => 'Accounts', 'slug' => 'accounts', 'icon' => '👤'],
            ['name' => 'Top Up', 'slug' => 'top-up', 'icon' => '⚡'],
        ];

        foreach ($categories as $cat) {
            Category::firstOrCreate(
                ['slug' => $cat['slug']],
                ['name' => $cat['name'], 'icon' => $cat['icon'] ?? null]
            );
        }
    }
}
