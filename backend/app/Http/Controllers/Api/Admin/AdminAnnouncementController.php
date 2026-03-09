<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAnnouncementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $announcements = Announcement::query()
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 25));

        return $this->success($announcements);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'     => ['required', 'string', 'max:255'],
            'body'      => ['required', 'string', 'max:5000'],
            'type'      => ['sometimes', 'string', 'in:info,warning,success,promo'],
            'is_active' => ['sometimes', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at'   => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);

        $announcement = Announcement::create([
            'title'     => $validated['title'],
            'body'      => $validated['body'],
            'type'      => $validated['type'] ?? 'info',
            'is_active' => $validated['is_active'] ?? true,
            'starts_at' => $validated['starts_at'] ?? null,
            'ends_at'   => $validated['ends_at'] ?? null,
        ]);

        return $this->success($announcement, 'Announcement created.', 201);
    }

    public function update(Request $request, Announcement $announcement): JsonResponse
    {
        $validated = $request->validate([
            'title'     => ['sometimes', 'string', 'max:255'],
            'body'      => ['sometimes', 'string', 'max:5000'],
            'type'      => ['sometimes', 'string', 'in:info,warning,success,promo'],
            'is_active' => ['sometimes', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at'   => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);

        $announcement->update($validated);

        return $this->success($announcement->fresh(), 'Announcement updated.');
    }

    public function destroy(Announcement $announcement): JsonResponse
    {
        $announcement->delete();

        return $this->success(null, 'Announcement deleted.', 204);
    }
}
