<?php

namespace App\Http\Controllers\Api;

use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    /**
     * GET /services — list all services (for homepage grid).
     * Optional: ?featured=1 — returns only featured services ordered by display_order (no fallback).
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
