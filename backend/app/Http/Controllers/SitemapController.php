<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    /**
     * Dynamic sitemap for public indexable marketplace URLs (SPA routes).
     */
    public function index(): Response
    {
        $configured = rtrim((string) config('app.url'), '/');
        $base = $configured !== '' ? $configured : rtrim((string) request()->getSchemeAndHttpHost(), '/');

        $lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];

        $lines[] = $this->urlXml($base.'/', now());

        Product::query()
            ->where('status', 'active')
            ->select(['id', 'updated_at'])
            ->orderBy('id')
            ->cursor()
            ->each(function (Product $product) use (&$lines, $base) {
                $lines[] = $this->urlXml(
                    $base.'/product/'.$product->id,
                    $product->updated_at ?? now()
                );
            });

        Service::query()
            ->whereNotNull('slug')
            ->where('slug', '!=', '')
            ->select(['slug', 'updated_at'])
            ->orderBy('slug')
            ->cursor()
            ->each(function (Service $service) use (&$lines, $base) {
                $lines[] = $this->urlXml(
                    $base.'/service/'.rawurlencode($service->slug),
                    $service->updated_at ?? now()
                );
            });

        User::query()
            ->where('is_seller', true)
            ->select(['id', 'updated_at'])
            ->orderBy('id')
            ->cursor()
            ->each(function (User $user) use (&$lines, $base) {
                $lines[] = $this->urlXml(
                    $base.'/seller/'.$user->id,
                    $user->updated_at ?? now()
                );
            });

        $lines[] = '</urlset>';

        $body = implode("\n", $lines)."\n";

        return response($body, 200)->header('Content-Type', 'application/xml; charset=UTF-8');
    }

    private function urlXml(string $loc, \DateTimeInterface $lastmod): string
    {
        $locEsc = htmlspecialchars($loc, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $lmEsc = htmlspecialchars($lastmod->format(\DateTimeInterface::ATOM), ENT_XML1 | ENT_QUOTES, 'UTF-8');

        return '  <url>'."\n"
            .'    <loc>'.$locEsc.'</loc>'."\n"
            .'    <lastmod>'.$lmEsc.'</lastmod>'."\n"
            .'    <changefreq>daily</changefreq>'."\n"
            .'    <priority>0.8</priority>'."\n"
            .'  </url>';
    }
}
