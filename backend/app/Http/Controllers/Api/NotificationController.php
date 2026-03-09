<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->limit(60)
            ->get()
            ->map(function ($n) {
                $data = is_array($n->data) ? $n->data : (json_decode($n->data, true) ?? []);

                return [
                    'id'         => $n->id,
                    'type'       => $data['type'] ?? 'unknown',
                    'message'    => $data['message'] ?? null,
                    'link'       => $data['link'] ?? null,
                    'data'       => $data,
                    'read'       => $n->read_at !== null,
                    'read_at'    => $n->read_at?->toIso8601String(),
                    'created_at' => $n->created_at->toIso8601String(),
                ];
            });

        // Return the array directly — the Navbar checks Array.isArray(list)
        return $this->success($notifications);
    }

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->where('id', $id)->first();

        if (! $notification) {
            return $this->error('Notification not found.', 404);
        }

        $notification->markAsRead();

        return $this->success(null, 'Marked as read.');
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return $this->success(null, 'All marked as read.');
    }
}
