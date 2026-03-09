<?php

namespace App\Http\Controllers\Api;

use App\Models\SellerWarning;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerWarningsController extends Controller
{
    /**
     * GET /seller/warnings
     *
     * Return all warnings for the authenticated seller.
     * Marks unread warnings as read once fetched.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $warnings = SellerWarning::where('seller_id', $user->id)
            ->with('admin:id,name')
            ->latest()
            ->get();

        $unreadCount = $warnings->where('is_read', false)->count();

        // Mark all as read now that seller has seen them
        SellerWarning::where('seller_id', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return $this->success([
            'warnings'     => $warnings,
            'unread_count' => $unreadCount,
            'total'        => $warnings->count(),
        ]);
    }

    /**
     * GET /seller/moderation-status
     *
     * Full moderation status for the authenticated seller.
     * Used by the frontend to render the appropriate ban/warning banner.
     *
     * Response shape:
     * {
     *   status: "active" | "warned" | "temporary_ban" | "permanent_ban",
     *   is_banned: bool,
     *   ban_type: string|null,
     *   ban_reason: string|null,
     *   banned_until: "YYYY-MM-DD"|null,
     *   warning_count: int,
     *   unread_warnings: int,
     *   latest_warning: { reason, message, created_at }|null,
     *   banner: string|null,   // human-readable message for the UI
     * }
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        // Auto-lift expired temporary bans
        if ($user->is_banned && $user->ban_type === 'temporary' && $user->banned_until?->isPast()) {
            $user->update([
                'is_banned'    => false,
                'ban_type'     => null,
                'banned_until' => null,
                'ban_reason'   => null,
            ]);
        }

        // Refresh after potential unban
        $user->refresh();

        $unreadWarnings = SellerWarning::where('seller_id', $user->id)
            ->where('is_read', false)
            ->count();

        $latestWarning = SellerWarning::where('seller_id', $user->id)
            ->latest()
            ->first(['reason', 'message', 'created_at']);

        // Determine status
        if ($user->is_banned && $user->ban_type === 'permanent') {
            $status = 'permanent_ban';
            $banner = '🚫 Your account has been permanently banned.'
                . ($user->ban_reason ? ' Reason: ' . $user->ban_reason : '');
        } elseif ($user->is_banned && $user->ban_type === 'temporary') {
            $status = 'temporary_ban';
            $banner = '⏸️ Your seller account is suspended until '
                . $user->banned_until?->toDateString() . '.'
                . ($user->ban_reason ? ' Reason: ' . $user->ban_reason : '');
        } elseif ($user->warning_count > 0) {
            $status = 'warned';
            $banner = $latestWarning
                ? '⚠️ Warning from M4M Administration. Reason: ' . $latestWarning->reason
                    . ' — ' . $latestWarning->message
                    . ' Repeated violations may result in suspension.'
                : '⚠️ You have received warnings on your account. Please review our policies.';
        } else {
            $status = 'active';
            $banner = null;
        }

        return $this->success([
            'status'          => $status,
            'is_banned'       => (bool) $user->is_banned,
            'ban_type'        => $user->ban_type,
            'ban_reason'      => $user->ban_reason,
            'banned_until'    => $user->banned_until?->toDateString(),
            'warning_count'   => (int) ($user->warning_count ?? 0),
            'unread_warnings' => $unreadWarnings,
            'latest_warning'  => $latestWarning,
            'banner'          => $banner,
        ]);
    }
}
