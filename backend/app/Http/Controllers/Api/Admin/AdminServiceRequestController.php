<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\OfferType;
use App\Models\ServiceRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminServiceRequestController extends Controller
{
    /**
     * GET /admin/service-requests — list all service requests (optional ?status=).
     */
    public function index(Request $request): JsonResponse
    {
        $query = ServiceRequest::query()
            ->with(['seller:id,name,email', 'category:id,name,slug'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $list = $query->paginate($request->integer('per_page', 20));

        return $this->success($list);
    }

    /**
     * POST /admin/service-requests/{service_request}/approve — create offer type and mark approved.
     */
    public function approve(Request $request, ServiceRequest $service_request): JsonResponse
    {
        if (! $service_request->isPending()) {
            return $this->error('Request is not pending.', 400);
        }

        $baseSlug = Str::slug($service_request->service_name);
        $slug = $baseSlug;
        $n = 1;
        while (OfferType::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . (++$n);
        }

        $offerType = OfferType::create([
            'category_id'  => $service_request->category_id,
            'name'         => $service_request->service_name,
            'slug'         => $slug,
            'description'  => $service_request->description,
            'icon'         => null,
            'status'       => OfferType::STATUS_ACTIVE,
        ]);

        $service_request->update([
            'status'       => ServiceRequest::STATUS_APPROVED,
            'reviewed_by'   => $request->user()->id,
            'reviewed_at'   => now(),
        ]);

        $offerType->load('category:id,name,slug');

        return $this->success([
            'service_request' => $service_request->fresh(['category:id,name,slug']),
            'offer_type'      => $offerType,
        ], 'Service request approved and offer type created.');
    }

    /**
     * POST /admin/service-requests/{service_request}/reject — mark request as rejected (admin_note required).
     */
    public function reject(Request $request, ServiceRequest $service_request): JsonResponse
    {
        if (! $service_request->isPending()) {
            return $this->error('Request is not pending.', 400);
        }

        $validated = $request->validate([
            'admin_note' => ['required', 'string', 'max:2000'],
        ]);

        $service_request->update([
            'status'       => ServiceRequest::STATUS_REJECTED,
            'admin_note'   => $validated['admin_note'],
            'reviewed_by'   => $request->user()->id,
            'reviewed_at'   => now(),
        ]);

        return $this->success(
            $service_request->fresh(['category:id,name,slug']),
            'Service request rejected.'
        );
    }

    /**
     * PUT/PATCH /admin/service-requests/{service_request} — edit pending request.
     */
    public function update(Request $request, ServiceRequest $service_request): JsonResponse
    {
        if (! $service_request->isPending()) {
            return $this->error('Only pending requests can be edited.', 400);
        }

        $validated = $request->validate([
            'service_name' => ['sometimes', 'string', 'max:255'],
            'category_id'  => ['sometimes', 'integer', 'exists:categories,id'],
            'description'  => ['nullable', 'string', 'max:2000'],
        ]);

        $service_request->update($validated);

        return $this->success($service_request->fresh(['category:id,name,slug']), 'Request updated.');
    }

    /**
     * DELETE /admin/service-requests/{service_request} — delete request (pending only).
     */
    public function destroy(ServiceRequest $service_request): JsonResponse
    {
        if (! $service_request->isPending()) {
            return $this->error('Only pending requests can be deleted.', 400);
        }

        $service_request->delete();

        return $this->success(null, 'Service request deleted.');
    }
}
