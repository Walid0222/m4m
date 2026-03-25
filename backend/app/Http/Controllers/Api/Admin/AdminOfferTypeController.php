<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\Category;
use App\Models\OfferType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminOfferTypeController extends Controller
{
    /**
     * GET /admin/offer-types — list all offer types (admin, includes disabled).
     */
    public function index(Request $request): JsonResponse
    {
        $query = OfferType::query()->with([
            'category:id,name,slug',
            'service:id,name,slug',
        ]);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $list = $query->orderBy('name')->paginate(min($request->integer('per_page', 50), 100));

        return $this->success($list);
    }

    /**
     * POST /admin/offer-types — create offer type.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'service_id'  => ['required', 'integer', 'exists:services,id'],
            'description' => ['nullable', 'string', 'max:2000'],
            'status'      => ['sometimes', 'string', 'in:active,disabled'],
        ]);

        $baseSlug = Str::slug($validated['name']);
        $slug = $baseSlug;
        $n = 1;
        while (OfferType::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . (++$n);
        }

        $offerType = OfferType::create([
            'category_id'  => $validated['category_id'],
            'service_id'   => $validated['service_id'],
            'name'         => $validated['name'],
            'slug'         => $slug,
            'description'  => $validated['description'] ?? null,
            'icon'         => null,
            'status'       => $validated['status'] ?? OfferType::STATUS_ACTIVE,
        ]);

        $offerType->load('category:id,name,slug');

        return $this->success($offerType, 'Offer type created.', 201);
    }

    /**
     * GET /admin/offer-types/{id} — show one.
     */
    public function show(int $id): JsonResponse
    {
        $offer_type = OfferType::findOrFail($id);
        $offer_type->load('category:id,name,slug');

        return $this->success($offer_type);
    }

    /**
     * PUT/PATCH /admin/offer-types/{id} — update (including enable/disable).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $offer_type = OfferType::findOrFail($id);

        $validated = $request->validate([
            'name'        => ['sometimes', 'string', 'max:255'],
            'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'service_id'  => ['sometimes', 'integer', 'exists:services,id'],
            'description' => ['nullable', 'string', 'max:2000'],
            'status'      => ['sometimes', 'string', 'in:active,disabled'],
        ]);

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
            $base = $validated['slug'];
            $n = 1;
            while (OfferType::where('slug', $validated['slug'])->where('id', '!=', $offer_type->id)->exists()) {
                $validated['slug'] = $base . '-' . (++$n);
            }
        }

        $offer_type->update($validated);

        return $this->success($offer_type->fresh(['category:id,name,slug']), 'Offer type updated.');
    }

    /**
     * DELETE /admin/offer-types/{id} — delete (only if no products use it, or force).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $offer_type = OfferType::findOrFail($id);
        $count = $offer_type->products()->count();
        if ($count > 0 && ! $request->boolean('force')) {
            return $this->error("Cannot delete: {$count} product(s) use this offer type. Use force=1 to delete anyway.", 400);
        }

        $offer_type->delete();

        return $this->success(null, 'Offer type deleted.');
    }
}
