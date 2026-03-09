<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\SellerModerationAction;
use App\Models\SellerWarning;
use App\Models\User;
use App\Notifications\SellerBannedNotification;
use App\Notifications\SellerUnbannedNotification;
use App\Notifications\SellerWarningNotification;
use App\Services\AdminLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSellerController extends Controller
{
    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Log to both admin_logs and seller_moderation_actions.
     */
    private function logModeration(
        User $admin,
        User $seller,
        string $action,
        ?string $reason,
        ?int $days = null,
        ?\DateTimeInterface $bannedUntil = null
    ): void {
        // Moderation history
        SellerModerationAction::create([
            'seller_id'    => $seller->id,
            'admin_id'     => $admin->id,
            'action'       => $action,
            'reason'       => $reason,
            'days'         => $days,
            'banned_until' => $bannedUntil,
        ]);

        // Admin action log
        AdminLogService::log(
            $admin,
            $action,
            "Action '{$action}' on seller {$seller->name} (#{$seller->id})"
                . ($reason ? ": {$reason}" : ''),
            $seller->id
        );
    }

    // ─── Warn ────────────────────────────────────────────────────────────────

    /**
     * POST /admin/sellers/{seller}/warn
     *
     * Issue a formal warning — seller stays active.
     */
    public function warn(Request $request, User $seller): JsonResponse
    {
        $validated = $request->validate([
            'reason'  => ['required', 'string', 'max:100'],
            'message' => ['required', 'string', 'max:1000'],
        ]);

        $warning = SellerWarning::create([
            'seller_id' => $seller->id,
            'admin_id'  => $request->user()->id,
            'reason'    => $validated['reason'],
            'message'   => $validated['message'],
        ]);

        $seller->increment('warning_count');
        $newCount = $seller->fresh()->warning_count;

        $seller->notify(new SellerWarningNotification(
            reason: $validated['reason'],
            message: $validated['message'],
            warningCount: $newCount,
        ));

        $this->logModeration(
            $request->user(), $seller,
            'warn',
            $validated['reason']
        );

        return $this->success([
            'warning'       => $warning->load('admin:id,name'),
            'warning_count' => $newCount,
        ], "Warning issued to {$seller->name}.", 201);
    }

    // ─── Temporary ban ───────────────────────────────────────────────────────

    /**
     * POST /admin/sellers/{seller}/temporary-ban
     *
     * Suspend a seller for N days. They can still login to see the message.
     */
    public function temporaryBan(Request $request, User $seller): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
            'days'   => ['required', 'integer', 'min:1', 'max:365'],
        ]);

        $bannedUntil = now()->addDays((int) $validated['days']);

        $seller->update([
            'is_banned'    => true,
            'ban_type'     => 'temporary',
            'banned_until' => $bannedUntil,
            'ban_reason'   => $validated['reason'],
        ]);

        // Revoke active tokens → force re-login so they see the banner
        $seller->tokens()->delete();

        $seller->notify(new SellerBannedNotification(
            banType: 'temporary',
            bannedUntil: $bannedUntil->toDateString(),
            reason: $validated['reason'],
        ));

        $this->logModeration(
            $request->user(), $seller,
            'temporary_ban',
            $validated['reason'],
            (int) $validated['days'],
            $bannedUntil
        );

        return $this->success(
            $this->sellerDetail($seller->fresh()),
            "Seller {$seller->name} suspended for {$validated['days']} day(s)."
        );
    }

    // ─── Permanent ban ────────────────────────────────────────────────────────

    /**
     * POST /admin/sellers/{seller}/permanent-ban
     *
     * Permanently ban — seller cannot login.
     */
    public function permanentBan(Request $request, User $seller): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $seller->update([
            'is_banned'    => true,
            'ban_type'     => 'permanent',
            'banned_until' => null,
            'ban_reason'   => $validated['reason'],
        ]);

        // Revoke all tokens immediately
        $seller->tokens()->delete();

        $seller->notify(new SellerBannedNotification(
            banType: 'permanent',
            bannedUntil: null,
            reason: $validated['reason'],
        ));

        $this->logModeration(
            $request->user(), $seller,
            'permanent_ban',
            $validated['reason']
        );

        return $this->success(
            $this->sellerDetail($seller->fresh()),
            "Seller {$seller->name} has been permanently banned."
        );
    }

    // ─── Generic ban (backward compat) ────────────────────────────────────────

    /**
     * POST /admin/sellers/{seller}/ban
     *
     * Legacy endpoint — kept for backward compatibility.
     * Accepts { type: "temporary"|"permanent", days?, reason? }
     */
    public function ban(Request $request, User $seller): JsonResponse
    {
        $validated = $request->validate([
            'type'   => ['required', 'in:temporary,permanent'],
            'days'   => ['nullable', 'integer', 'min:1', 'max:365'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        if ($validated['type'] === 'temporary') {
            $request->merge(['days' => $validated['days'] ?? 7]);
            return $this->temporaryBan($request, $seller);
        }

        $request->merge(['reason' => $validated['reason'] ?? 'No reason provided.']);
        return $this->permanentBan($request, $seller);
    }

    // ─── Unban ───────────────────────────────────────────────────────────────

    /**
     * POST /admin/sellers/{seller}/unban
     */
    public function unban(Request $request, User $seller): JsonResponse
    {
        $seller->update([
            'is_banned'    => false,
            'ban_type'     => null,
            'banned_until' => null,
            'ban_reason'   => null,
        ]);

        $seller->notify(new SellerUnbannedNotification());

        $this->logModeration(
            $request->user(), $seller,
            'unban',
            null
        );

        return $this->success(
            $this->sellerDetail($seller->fresh()),
            "Seller {$seller->name} has been unbanned."
        );
    }

    // ─── Warnings list ────────────────────────────────────────────────────────

    /**
     * GET /admin/sellers/{seller}/warnings
     */
    public function warnings(Request $request, User $seller): JsonResponse
    {
        $warnings = SellerWarning::where('seller_id', $seller->id)
            ->with('admin:id,name')
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return $this->success($warnings);
    }

    // ─── Moderation history ───────────────────────────────────────────────────

    /**
     * GET /admin/sellers/{seller}/moderation-history
     */
    public function moderationHistory(Request $request, User $seller): JsonResponse
    {
        $history = SellerModerationAction::where('seller_id', $seller->id)
            ->with('admin:id,name')
            ->latest()
            ->paginate($request->integer('per_page', 30));

        return $this->success($history);
    }

    // ─── Admin seller list ────────────────────────────────────────────────────

    /**
     * GET /admin/sellers
     *
     * List all sellers with moderation status.
     * Supports ?status=active|banned|suspended&search=
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::where('is_seller', true)
            ->withCount([
                'reports as reports_count'  => fn ($q) => $q->where('status', 'pending'),
                'disputes as disputes_count' => fn ($q) => $q->whereIn('status', ['open', 'under_review']),
            ])
            ->with('sellerStats:seller_id,total_sales,rating_average,rating_count');

        // Status filter
        if ($request->filled('status')) {
            match ($request->status) {
                'banned'    => $query->where('is_banned', true)->where('ban_type', 'permanent'),
                'suspended' => $query->where('is_banned', true)->where('ban_type', 'temporary'),
                'warned'    => $query->where('warning_count', '>', 0)->where('is_banned', false),
                'active'    => $query->where('is_banned', false),
                default     => null,
            };
        }

        // Search
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn ($qb) => $qb->where('name', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%"));
        }

        $sellers = $query->latest()->paginate($request->integer('per_page', 30));

        $sellers->getCollection()->transform(fn ($s) => $this->sellerDetail($s));

        return $this->success($sellers);
    }

    // ─── Single seller detail ─────────────────────────────────────────────────

    /**
     * GET /admin/sellers/{seller}
     */
    public function show(Request $request, User $seller): JsonResponse
    {
        $seller->loadCount([
            'reports as reports_count'   => fn ($q) => $q->where('status', 'pending'),
            'disputes as disputes_count' => fn ($q) => $q->whereIn('status', ['open', 'under_review']),
        ]);
        $seller->load('sellerStats:seller_id,total_sales,rating_average,rating_count');

        return $this->success($this->sellerDetail($seller));
    }

    // ─── Internal shape normaliser ────────────────────────────────────────────

    private function sellerDetail(User $seller): array
    {
        // Determine readable status
        if (! $seller->is_banned) {
            $status = $seller->warning_count > 0 ? 'warned' : 'active';
        } elseif ($seller->ban_type === 'permanent') {
            $status = 'permanent_ban';
        } else {
            $status = 'temporary_ban';
        }

        return [
            'seller_id'     => $seller->id,
            'name'          => $seller->name,
            'email'         => $seller->email,
            'status'        => $status,
            'is_banned'     => (bool) $seller->is_banned,
            'ban_type'      => $seller->ban_type,
            'ban_reason'    => $seller->ban_reason,
            'banned_until'  => $seller->banned_until?->toDateString(),
            'warning_count' => (int) ($seller->warning_count ?? 0),
            'is_verified'   => (bool) $seller->is_verified_seller,
            'reports_count' => $seller->reports_count ?? 0,
            'disputes_count'=> $seller->disputes_count ?? 0,
            'sales_count'   => $seller->sellerStats?->total_sales ?? 0,
            'rating'        => $seller->sellerStats?->rating_average ?? null,
            'created_at'    => $seller->created_at?->toDateString(),
        ];
    }
}
