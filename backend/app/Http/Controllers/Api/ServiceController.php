<?php

namespace App\Http\Controllers\Api;

use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    /**
     * GET /services — list all services (for homepage grid).
     */
    public function index(Request $request): JsonResponse
    {
        $services = Service::query()
            ->orderBy('name')
            ->get();

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
