<?php

namespace App\Http\Controllers\Api;

use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    /** Hard cap when ?all=1 is used (seller catalog); avoids unbounded public queries. */
    private const CATALOG_MAX = 2000;

    /**
     * GET /services — list services (homepage uses default slice; seller flows may pass ?all=1).
     *
     * Optional:
     * - ?featured=1 — featured only, ordered for homepage
     * - ?all=1 — full catalog up to CATALOG_MAX (seller product wizard, etc.)
     * Default: first 50 by name (legacy lightweight list for generic callers)
     */
    public function index(Request $request): JsonResponse
    {
        if ($request->boolean('featured')) {
            $services = Service::query()
                ->where('is_featured', true)
                ->orderByRaw('display_order IS NULL, display_order ASC')
                ->orderBy('name')
                ->limit(50)
                ->get();

            return $this->success($services);
        }

        if ($request->boolean('all')) {
            $services = Service::query()
                ->orderBy('name')
                ->limit(self::CATALOG_MAX)
                ->get();

            return $this->success($services);
        }

        $services = Service::query()->orderBy('name')->limit(50)->get();

        return $this->success($services);
    }

    /**
     * GET /services/{service} — get service by slug with its offer types (active only).
     */
    public function show(Request $request, Service $service): JsonResponse
    {
        $service->load([
            'offerTypes' => fn ($q) => $q->where('status', \App\Models\OfferType::STATUS_ACTIVE)->orderBy('name'),
        ]);

        return $this->success($service);
    }
}
