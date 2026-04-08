<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\OfferType;
use App\Models\Service;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ServicesSeeder extends Seeder
{
    /** Streaming / OTT style (video and broad subscription platforms in marketplace). */
    private const STREAMING_OFFERS = ['Account', 'Premium', 'Subscription', 'Family Plan', 'Code', 'Gift Card', 'Trial'];

    /** Music & audio subscription platforms. */
    private const MUSIC_SUB_OFFERS = ['Account', 'Premium', 'Subscription', 'Family Plan', 'Code', 'Gift Card', 'Trial'];

    /** Productivity / AI / software. */
    private const SOFTWARE_OFFERS = ['Account', 'Premium', 'Subscription', 'License Key', 'Code', 'Trial'];

    /** Games & platforms. */
    private const GAMING_OFFERS = ['Account', 'Code', 'Gift Card', 'Top Up'];

    /** Social growth / marketing style listings. */
    private const SOCIAL_OFFERS = ['Account', 'Followers', 'Likes', 'Views', 'Members', 'Boost'];

    /** Pure gift-card storefronts (no duplicate PC/console platform rows). */
    private const GIFT_CARD_OFFERS = ['Gift Card', 'Code', 'Account'];

    /** Digital top-up / wallet style. */
    private const TOPUP_OFFERS = ['Top Up', 'Code', 'Gift Card'];

    /**
     * Brand-centric catalog. Offer type slugs: slug(name + ' ' + service.slug), then -2, -3 if global collision.
     */
    public function run(): void
    {
        $categorySlugs = [
            'streaming', 'subscriptions', 'social-media', 'software', 'gaming', 'gift-cards', 'top-up',
        ];
        $categoryIds = [];
        foreach ($categorySlugs as $cs) {
            $categoryIds[$cs] = Category::query()->where('slug', $cs)->value('id');
        }
        $fallbackCategoryId = Category::query()->orderBy('id')->value('id');
        $subscriptionsId = $categoryIds['subscriptions'] ?: $categoryIds['streaming'] ?: $fallbackCategoryId;
        $giftCardsId = $categoryIds['gift-cards'] ?: $fallbackCategoryId;
        $topUpId = $categoryIds['top-up'] ?: $fallbackCategoryId;

        $data = [
            // —— A. Streaming & video ——
            ['category_slug' => 'streaming', 'name' => 'Netflix', 'slug' => 'netflix', 'icon' => '/services/netflix.svg', 'offer_types' => array_values(array_unique(array_merge(
                ['Account', 'Profile'], self::STREAMING_OFFERS
            )))],
            ['category_slug' => 'streaming', 'name' => 'Disney+', 'slug' => 'disney-plus', 'icon' => '/services/disneyplus.svg', 'offer_types' => self::STREAMING_OFFERS],
            ['category_slug' => 'streaming', 'name' => 'Amazon Prime Video', 'slug' => 'primevideo', 'icon' => '/services/primevideo.svg', 'offer_types' => self::STREAMING_OFFERS],
            ['category_slug' => 'streaming', 'name' => 'Apple TV', 'slug' => 'appletv', 'icon' => '/services/appletv.svg', 'offer_types' => self::STREAMING_OFFERS],
            ['category_slug' => 'streaming', 'name' => 'YouTube', 'slug' => 'youtube', 'icon' => '/services/youtube.svg', 'offer_types' => self::SOCIAL_OFFERS],
            ['category_slug' => 'streaming', 'name' => 'YouTube Premium', 'slug' => 'youtube-premium', 'icon' => '/services/youtube.svg', 'offer_types' => self::STREAMING_OFFERS],
            ['category_slug' => 'streaming', 'name' => 'HBO Max', 'slug' => 'hbo-max', 'icon' => null, 'offer_types' => self::STREAMING_OFFERS],
            ['category_slug' => 'streaming', 'name' => 'Crunchyroll', 'slug' => 'crunchyroll', 'icon' => null, 'offer_types' => self::STREAMING_OFFERS],
            ['category_slug' => 'streaming', 'name' => 'Shahid', 'slug' => 'shahid', 'icon' => null, 'offer_types' => self::STREAMING_OFFERS],
            ['category_slug' => 'streaming', 'name' => 'OSN+', 'slug' => 'osn-plus', 'icon' => null, 'offer_types' => self::STREAMING_OFFERS],
            ['category_slug' => 'streaming', 'name' => 'Paramount+', 'slug' => 'paramount-plus', 'icon' => null, 'offer_types' => self::STREAMING_OFFERS],
            ['category_slug' => 'streaming', 'name' => 'Hulu', 'slug' => 'hulu', 'icon' => null, 'offer_types' => self::STREAMING_OFFERS],
            ['category_slug' => 'streaming', 'name' => 'DAZN', 'slug' => 'dazn', 'icon' => null, 'offer_types' => self::STREAMING_OFFERS],
            ['category_slug' => 'streaming', 'name' => 'Mubi', 'slug' => 'mubi', 'icon' => null, 'offer_types' => self::STREAMING_OFFERS],
            ['category_slug' => 'streaming', 'name' => 'IPTV', 'slug' => 'iptv', 'icon' => null, 'offer_types' => ['Account', 'Subscription', 'Code', 'Trial']],

            // —— A. Music subscriptions ——
            ['category_slug' => 'subscriptions', 'name' => 'Spotify', 'slug' => 'spotify', 'icon' => '/services/spotify.svg', 'offer_types' => array_values(array_unique(array_merge(
                self::MUSIC_SUB_OFFERS, ['Upgrade', 'Family Slot']
            )))],
            ['category_slug' => 'subscriptions', 'name' => 'Apple Music', 'slug' => 'apple-music', 'icon' => '/services/apple.svg', 'offer_types' => self::MUSIC_SUB_OFFERS],
            ['category_slug' => 'subscriptions', 'name' => 'Tidal', 'slug' => 'tidal', 'icon' => null, 'offer_types' => self::MUSIC_SUB_OFFERS],
            ['category_slug' => 'subscriptions', 'name' => 'SoundCloud', 'slug' => 'soundcloud', 'icon' => null, 'offer_types' => self::MUSIC_SUB_OFFERS],
            ['category_slug' => 'subscriptions', 'name' => 'Deezer', 'slug' => 'deezer', 'icon' => null, 'offer_types' => self::MUSIC_SUB_OFFERS],

            // —— D. Social / communities ——
            ['category_slug' => 'social-media', 'name' => 'Instagram', 'slug' => 'instagram', 'icon' => '/services/instagram.svg', 'offer_types' => self::SOCIAL_OFFERS],
            ['category_slug' => 'social-media', 'name' => 'TikTok', 'slug' => 'tiktok', 'icon' => '/services/tiktok.svg', 'offer_types' => self::SOCIAL_OFFERS],
            ['category_slug' => 'social-media', 'name' => 'Facebook', 'slug' => 'facebook', 'icon' => null, 'offer_types' => self::SOCIAL_OFFERS],
            ['category_slug' => 'social-media', 'name' => 'Telegram', 'slug' => 'telegram', 'icon' => null, 'offer_types' => ['Account', 'Premium', 'Members', 'Code']],
            ['category_slug' => 'social-media', 'name' => 'Discord', 'slug' => 'discord', 'icon' => '/services/discord.svg', 'offer_types' => ['Account', 'Premium', 'Members', 'Boost', 'Code', 'Gift Card', 'Trial']],
            ['category_slug' => 'social-media', 'name' => 'Snapchat', 'slug' => 'snapchat', 'icon' => null, 'offer_types' => ['Account', 'Premium', 'Members', 'Boost', 'Code']],
            ['category_slug' => 'social-media', 'name' => 'Twitch', 'slug' => 'twitch', 'icon' => '/services/twitch.svg', 'offer_types' => ['Account', 'Followers', 'Views', 'Subscription', 'Boost', 'Gift Card', 'Code']],
            ['category_slug' => 'social-media', 'name' => 'X', 'slug' => 'x-twitter', 'icon' => null, 'offer_types' => self::SOCIAL_OFFERS],

            // —— B. AI / software / productivity ——
            ['category_slug' => 'software', 'name' => 'ChatGPT', 'slug' => 'chatgpt', 'icon' => '/services/chatgpt.svg', 'offer_types' => array_values(array_unique(array_merge(
                self::SOFTWARE_OFFERS, ['API Key']
            )))],
            ['category_slug' => 'software', 'name' => 'Claude', 'slug' => 'claude', 'icon' => null, 'offer_types' => self::SOFTWARE_OFFERS],
            ['category_slug' => 'software', 'name' => 'Gemini', 'slug' => 'gemini', 'icon' => null, 'offer_types' => self::SOFTWARE_OFFERS],
            ['category_slug' => 'software', 'name' => 'Midjourney', 'slug' => 'midjourney', 'icon' => null, 'offer_types' => self::SOFTWARE_OFFERS],
            ['category_slug' => 'software', 'name' => 'Canva', 'slug' => 'canva', 'icon' => '/services/canva.svg', 'offer_types' => self::SOFTWARE_OFFERS],
            ['category_slug' => 'software', 'name' => 'Adobe', 'slug' => 'adobe', 'icon' => '/services/adobe.svg', 'offer_types' => self::SOFTWARE_OFFERS],
            ['category_slug' => 'software', 'name' => 'CapCut', 'slug' => 'capcut', 'icon' => null, 'offer_types' => self::SOFTWARE_OFFERS],
            ['category_slug' => 'software', 'name' => 'Grammarly', 'slug' => 'grammarly', 'icon' => null, 'offer_types' => self::SOFTWARE_OFFERS],
            ['category_slug' => 'software', 'name' => 'Duolingo', 'slug' => 'duolingo', 'icon' => null, 'offer_types' => self::SOFTWARE_OFFERS],
            ['category_slug' => 'software', 'name' => 'Notion', 'slug' => 'notion', 'icon' => null, 'offer_types' => self::SOFTWARE_OFFERS],
            ['category_slug' => 'software', 'name' => 'Figma', 'slug' => 'figma', 'icon' => '/services/figma.svg', 'offer_types' => self::SOFTWARE_OFFERS],
            ['category_slug' => 'software', 'name' => 'Microsoft 365', 'slug' => 'microsoft-365', 'icon' => null, 'offer_types' => self::SOFTWARE_OFFERS],
            ['category_slug' => 'software', 'name' => 'Windows', 'slug' => 'windows', 'icon' => null, 'offer_types' => ['License Key', 'Account', 'Code', 'Trial']],
            ['category_slug' => 'software', 'name' => 'Microsoft Office', 'slug' => 'microsoft-office', 'icon' => null, 'offer_types' => ['License Key', 'Account', 'Subscription', 'Code', 'Trial']],
            ['category_slug' => 'software', 'name' => 'VPN Service', 'slug' => 'vpn-service', 'icon' => null, 'offer_types' => ['Account', 'Subscription', 'Code', 'Trial']],

            // —— C. Gaming / platforms ——
            ['category_slug' => 'gaming', 'name' => 'Steam', 'slug' => 'steam', 'icon' => '/services/steam.svg', 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'PlayStation', 'slug' => 'playstation', 'icon' => '/services/playstation.svg', 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Xbox', 'slug' => 'xbox', 'icon' => '/services/xbox.svg', 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Nintendo', 'slug' => 'nintendo', 'icon' => '/services/nintendo.svg', 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Roblox', 'slug' => 'roblox', 'icon' => '/services/roblox.svg', 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Minecraft', 'slug' => 'minecraft', 'icon' => '/services/minecraft.svg', 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Riot Games', 'slug' => 'riotgames', 'icon' => '/services/riotgames.svg', 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'League of Legends', 'slug' => 'league-of-legends', 'icon' => null, 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Valorant', 'slug' => 'valorant', 'icon' => null, 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Ubisoft', 'slug' => 'ubisoft', 'icon' => '/services/ubisoft.svg', 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Battle.net', 'slug' => 'battlenet', 'icon' => '/services/battlenet.svg', 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'EA', 'slug' => 'ea', 'icon' => null, 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Epic Games', 'slug' => 'epic-games', 'icon' => null, 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Fortnite', 'slug' => 'fortnite', 'icon' => '/services/fortnite.svg', 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'PUBG', 'slug' => 'pubg', 'icon' => '/services/pubg.svg', 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Free Fire', 'slug' => 'free-fire', 'icon' => null, 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Clash of Clans', 'slug' => 'clash-of-clans', 'icon' => null, 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Clash Royale', 'slug' => 'clash-royale', 'icon' => null, 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Brawl Stars', 'slug' => 'brawl-stars', 'icon' => null, 'offer_types' => self::GAMING_OFFERS],
            ['category_slug' => 'gaming', 'name' => 'Call of Duty', 'slug' => 'call-of-duty', 'icon' => null, 'offer_types' => self::GAMING_OFFERS],

            // —— E. Gift cards (retail cards; platform cards stay under gaming/streaming services) ——
            ['category_slug' => 'gift-cards', 'name' => 'Amazon', 'slug' => 'amazon', 'icon' => null, 'offer_types' => self::GIFT_CARD_OFFERS],
            ['category_slug' => 'gift-cards', 'name' => 'Google Play', 'slug' => 'google-play', 'icon' => '/services/googleplay.svg', 'offer_types' => self::GIFT_CARD_OFFERS],
            ['category_slug' => 'gift-cards', 'name' => 'Apple Gift Card', 'slug' => 'apple-gift-card', 'icon' => '/services/apple.svg', 'offer_types' => self::GIFT_CARD_OFFERS],

            // —— F. Top-up hub ——
            ['category_slug' => 'top-up', 'name' => 'Mobile recharge', 'slug' => 'mobile-recharge', 'icon' => null, 'offer_types' => self::TOPUP_OFFERS],
        ];

        foreach ($data as $item) {
            $catKey = $item['category_slug'];
            $categoryId = match ($catKey) {
                'subscriptions' => (int) ($categoryIds['subscriptions'] ?: $subscriptionsId),
                'gift-cards' => (int) ($giftCardsId),
                'top-up' => (int) ($topUpId),
                default => (int) ($categoryIds[$catKey] ?: $fallbackCategoryId),
            };
            if (! $categoryId) {
                $categoryId = (int) $fallbackCategoryId;
            }

            $service = Service::query()->firstOrCreate(
                ['slug' => $item['slug']],
                [
                    'name' => $item['name'],
                    'icon' => $item['icon'] ?? null,
                    'category_id' => $categoryId,
                ]
            );

            if ((int) $service->category_id !== $categoryId) {
                $service->update(['category_id' => $categoryId]);
            }

            $this->ensureOfferTypesForService($service, $categoryId, $item['offer_types'] ?? []);
        }
    }

    /**
     * Idempotent per (service_id, name): align category/status; create with non-colliding slug.
     */
    private function ensureOfferTypesForService(Service $service, int $categoryId, array $names): void
    {
        foreach ($names as $name) {
            $name = trim((string) $name);
            if ($name === '') {
                continue;
            }

            $existing = OfferType::query()
                ->where('service_id', $service->id)
                ->whereRaw('LOWER(name) = ?', [Str::lower($name)])
                ->first();

            if ($existing) {
                $existing->update([
                    'category_id' => $categoryId,
                    'status' => OfferType::STATUS_ACTIVE,
                ]);

                continue;
            }

            $baseSlug = Str::slug($name.' '.$service->slug);
            $slug = $baseSlug;
            $n = 1;
            while (OfferType::query()->where('slug', $slug)->exists()) {
                $slug = $baseSlug.'-'.(++$n);
            }

            OfferType::query()->create([
                'name' => $name,
                'slug' => $slug,
                'service_id' => $service->id,
                'category_id' => $categoryId,
                'description' => null,
                'icon' => null,
                'status' => OfferType::STATUS_ACTIVE,
            ]);
        }
    }
}
