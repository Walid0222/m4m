<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\OfferType;
use App\Models\Service;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategoriesAndOfferTypesSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            ['name' => 'Streaming', 'slug' => 'streaming', 'icon' => '📺', 'offer_types' => [
                'Netflix Account', 'Netflix Profile', 'Netflix Gift Card',
                'Spotify Premium Account', 'Spotify Premium Upgrade', 'Spotify Family Slot', 'Spotify Gift Card',
                'Shahid VIP Account', 'Shahid VIP Subscription',
                'IPTV Subscription', 'IPTV 3 Months', 'IPTV 6 Months', 'IPTV 12 Months',
                'Disney Plus Account', 'Disney Plus Subscription',
            ]],
            ['name' => 'Gaming', 'slug' => 'gaming', 'icon' => '🎮', 'offer_types' => [
                'Fortnite Account', 'Fortnite Vbucks Top Up', 'Fortnite Gift Card',
                'PUBG Account', 'PUBG UC Top Up',
                'Free Fire Account', 'Free Fire Diamonds Top Up',
                'Steam Account', 'Steam Gift Card',
                'Playstation Account', 'Playstation Gift Card',
                'Xbox Gift Card',
            ]],
            ['name' => 'Gift Cards', 'slug' => 'gift-cards', 'icon' => '🎁', 'offer_types' => [
                'Amazon Gift Card', 'Google Play Gift Card', 'Apple Gift Card',
            ]],
            ['name' => 'Software', 'slug' => 'software', 'icon' => '💻', 'offer_types' => [
                'Canva Pro Account', 'ChatGPT Account', 'Adobe Account', 'Adobe Creative Cloud',
                'Microsoft Office Key', 'Windows License Key',
            ]],
            ['name' => 'Social Media', 'slug' => 'social-media', 'icon' => '📱', 'offer_types' => [
                'Instagram Followers', 'Instagram Likes', 'Instagram Views',
                'TikTok Followers', 'TikTok Likes', 'TikTok Views',
                'YouTube Subscribers', 'YouTube Views', 'YouTube Likes',
            ]],
            ['name' => 'Subscriptions', 'slug' => 'subscriptions', 'icon' => '🔄', 'offer_types' => []],
            ['name' => 'Accounts', 'slug' => 'accounts', 'icon' => '👤', 'offer_types' => []],
            ['name' => 'Top Up', 'slug' => 'top-up', 'icon' => '⚡', 'offer_types' => []],
        ];

        foreach ($data as $cat) {
            $category = Category::firstOrCreate(
                ['slug' => $cat['slug']],
                ['name' => $cat['name'], 'icon' => $cat['icon'] ?? null]
            );
            foreach ($cat['offer_types'] as $name) {
                $serviceSlug = Str::slug($name);

                $service = Service::firstOrCreate(
                    ['slug' => $serviceSlug],
                    [
                        'name'        => $name,
                        'category_id' => $category->id,
                        'icon'        => null,
                    ]
                );

                OfferType::firstOrCreate(
                    ['slug' => $serviceSlug],
                    [
                        'name'        => $name,
                        'category_id' => $category->id,
                        'service_id'  => $service->id,
                        'description' => null,
                        'icon'        => null,
                        'status'      => OfferType::STATUS_ACTIVE,
                    ]
                );
            }
        }
    }
}
