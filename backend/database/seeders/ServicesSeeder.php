<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Service;
use App\Models\OfferType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ServicesSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            // Streaming
            ['name' => 'Netflix', 'slug' => 'netflix', 'icon' => '/services/netflix.svg', 'offer_types' => [
                'Netflix Account', 'Netflix Profile', 'Netflix Gift Card',
            ]],
            ['name' => 'Disney+', 'slug' => 'disney-plus', 'icon' => '/services/disneyplus.svg', 'offer_types' => [
                'Disney Plus Account', 'Disney Plus Subscription',
            ]],
            ['name' => 'Prime Video', 'slug' => 'primevideo', 'icon' => '/services/primevideo.svg', 'offer_types' => [
                'Prime Video Account', 'Prime Video Subscription',
            ]],
            ['name' => 'Apple TV', 'slug' => 'appletv', 'icon' => '/services/appletv.svg', 'offer_types' => []],
            ['name' => 'Spotify', 'slug' => 'spotify', 'icon' => '/services/spotify.svg', 'offer_types' => [
                'Spotify Premium Account', 'Spotify Premium Upgrade', 'Spotify Family Slot', 'Spotify Gift Card',
            ]],
            ['name' => 'YouTube', 'slug' => 'youtube', 'icon' => '/services/youtube.svg', 'offer_types' => []],

            // Social / Communication
            ['name' => 'Instagram', 'slug' => 'instagram', 'icon' => '/services/instagram.svg', 'offer_types' => [
                'Instagram Followers', 'Instagram Likes', 'Instagram Views',
            ]],
            ['name' => 'TikTok', 'slug' => 'tiktok', 'icon' => '/services/tiktok.svg', 'offer_types' => [
                'TikTok Followers', 'TikTok Likes', 'TikTok Views',
            ]],
            ['name' => 'Discord', 'slug' => 'discord', 'icon' => '/services/discord.svg', 'offer_types' => [
                'Discord Nitro', 'Discord Server Members', 'Discord Boost',
            ]],

            // AI & Software
            ['name' => 'ChatGPT', 'slug' => 'chatgpt', 'icon' => '/services/chatgpt.svg', 'offer_types' => [
                'ChatGPT Plus Account', 'ChatGPT API Key', 'ChatGPT Account',
            ]],
            ['name' => 'Canva', 'slug' => 'canva', 'icon' => '/services/canva.svg', 'offer_types' => [
                'Canva Pro Account',
            ]],
            ['name' => 'Figma', 'slug' => 'figma', 'icon' => '/services/figma.svg', 'offer_types' => []],
            ['name' => 'Adobe', 'slug' => 'adobe', 'icon' => '/services/adobe.svg', 'offer_types' => [
                'Adobe Account',
            ]],

            // Games
            ['name' => 'Fortnite', 'slug' => 'fortnite', 'icon' => '/services/fortnite.svg', 'offer_types' => [
                'Fortnite Account', 'Fortnite Vbucks Top Up', 'Fortnite Gift Card',
            ]],
            ['name' => 'PUBG', 'slug' => 'pubg', 'icon' => '/services/pubg.svg', 'offer_types' => [
                'PUBG Account', 'PUBG UC Top Up', 'PUBG Mobile UC',
            ]],
            ['name' => 'Steam', 'slug' => 'steam', 'icon' => '/services/steam.svg', 'offer_types' => [
                'Steam Account', 'Steam Gift Card', 'Steam Wallet Code',
            ]],
            ['name' => 'Xbox', 'slug' => 'xbox', 'icon' => '/services/xbox.svg', 'offer_types' => [
                'Xbox Account', 'Xbox Gift Card', 'Xbox Game Pass',
            ]],
            ['name' => 'PlayStation', 'slug' => 'playstation', 'icon' => '/services/playstation.svg', 'offer_types' => [
                'PlayStation Account', 'PlayStation Gift Card', 'PSN Gift Card',
            ]],
            ['name' => 'Roblox', 'slug' => 'roblox', 'icon' => '/services/roblox.svg', 'offer_types' => []],
            ['name' => 'Minecraft', 'slug' => 'minecraft', 'icon' => '/services/minecraft.svg', 'offer_types' => []],
            ['name' => 'Riot Games', 'slug' => 'riotgames', 'icon' => '/services/riotgames.svg', 'offer_types' => []],
            ['name' => 'Ubisoft', 'slug' => 'ubisoft', 'icon' => '/services/ubisoft.svg', 'offer_types' => []],
            ['name' => 'Battle.net', 'slug' => 'battlenet', 'icon' => '/services/battlenet.svg', 'offer_types' => []],
            ['name' => 'Nintendo', 'slug' => 'nintendo', 'icon' => '/services/nintendo.svg', 'offer_types' => []],
        ];

        $defaultCategoryId = Category::first()?->id ?? Category::firstOrCreate(
            ['slug' => 'services'],
            ['name' => 'Services', 'icon' => '📦']
        )->id;

        foreach ($data as $item) {
            $service = Service::firstOrCreate(
                ['slug' => $item['slug']],
                ['name' => $item['name'], 'icon' => $item['icon'] ?? null]
            );

            foreach ($item['offer_types'] as $name) {
                $slug = Str::slug($name);
                $offerType = OfferType::firstOrCreate(
                    ['slug' => $slug],
                    [
                        'service_id'   => $service->id,
                        'category_id'  => $defaultCategoryId,
                        'name'         => $name,
                        'description'  => null,
                        'icon'         => null,
                        'status'       => OfferType::STATUS_ACTIVE,
                    ]
                );
                if (! $offerType->service_id) {
                    $offerType->update(['service_id' => $service->id]);
                }
            }
        }
    }
}
