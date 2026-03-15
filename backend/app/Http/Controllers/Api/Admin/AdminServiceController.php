<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminServiceController extends Controller
{
    /**
     * GET /admin/services — list all services.
     */
    public function index(Request $request): JsonResponse
    {
        $services = Service::query()->orderBy('name')->get();

        return $this->success($services);
    }

    /**
     * POST /admin/services — create service.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:50'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
        ]);

        $slug = Str::slug($validated['name']);
        $base = $slug;
        $n = 1;
        while (Service::where('slug', $slug)->exists()) {
            $slug = $base . '-' . (++$n);
        }

        $service = Service::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'icon' => $validated['icon'] ?? null,
            'category_id' => $validated['category_id'] ?? null,
        ]);

        return $this->success($service, 'Service created.', 201);
    }

    /**
     * PUT/PATCH /admin/services/{id} — update service.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $service = Service::findOrFail($id);

        if ($request->has('category_id') && $request->input('category_id') === '') {
            $request->merge(['category_id' => null]);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:50'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
        ]);

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
            $base = $validated['slug'];
            $n = 1;
            while (Service::where('slug', $validated['slug'])->where('id', '!=', $service->id)->exists()) {
                $validated['slug'] = $base . '-' . (++$n);
            }
        }

        $service->update($validated);

        return $this->success($service->fresh(), 'Service updated.');
    }

    /**
     * DELETE /admin/services/{id} — delete service.
     */
    public function destroy(int $id): JsonResponse
    {
        $service = Service::findOrFail($id);
        $service->offerTypes()->update(['service_id' => null]);
        $service->delete();

        return $this->success(null, 'Service deleted.');
    }
}
