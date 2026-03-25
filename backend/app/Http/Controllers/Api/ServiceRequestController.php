<?php

namespace App\Http\Controllers\Api;

use App\Models\ServiceRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceRequestController extends Controller
{
    /**
     * GET /service-requests — list current user's (seller) service requests.
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->is_seller) {
            return $this->error('You must be a seller to view service requests.', 403);
        }

        $requests = ServiceRequest::query()
            ->where('seller_id', $request->user()->id)
            ->with('category:id,name,slug')
            ->latest()
            ->paginate(min($request->integer('per_page', 20), 100));

        return $this->success($requests);
    }

    /**
     * POST /service-requests — create a new service request (seller).
     */
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->is_seller) {
            return $this->error('You must be a seller to request a new service type.', 403);
        }

        $validated = $request->validate([
            'service_name' => ['required', 'string', 'max:255'],
            'category_id'  => ['required', 'integer', 'exists:categories,id'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $serviceRequest = ServiceRequest::create([
            'seller_id'    => $request->user()->id,
            'service_name' => $validated['service_name'],
            'category_id'  => $validated['category_id'],
            'description'  => $validated['description'] ?? null,
            'status'       => ServiceRequest::STATUS_PENDING,
        ]);

        $serviceRequest->load('category:id,name,slug');

        return $this->success($serviceRequest, 'Service request submitted.', 201);
    }
}
