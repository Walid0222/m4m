<?php

namespace App\Http\Controllers\Api;

use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    /**
     * GET /announcements
     *
     * Public endpoint returning currently active announcements.
     */
    public function index(Request $request): JsonResponse
    {
        $now   = now();
        $limit = $request->integer('limit', 5);

        $items = Announcement::query()
            ->where('is_active', true)
            ->where(function ($q) use ($now) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
            })
            ->orderByDesc('starts_at')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        return $this->success($items);
    }
}

