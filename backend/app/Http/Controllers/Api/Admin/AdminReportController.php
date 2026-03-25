<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\Product;
use App\Models\Report;
use App\Models\SellerWarning;
use App\Models\User;
use App\Notifications\SellerBannedNotification;
use App\Notifications\SellerWarningNotification;
use App\Services\AdminLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminReportController extends Controller
{
    /**
     * GET /admin/reports
     * Supports ?status= and ?type= filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Report::with([
            'reporter:id,name,email',
            'reportedProduct:id,name,slug',
            'reportedSeller:id,name,email',
        ])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $reports = $query->paginate(min($request->integer('per_page', 50), 100));

        $reports->getCollection()->transform(function ($r) {
            $r->target_id   = $r->reported_product_id ?? $r->reported_seller_id;
            $r->target_name = $r->target_name
                ?? $r->reportedProduct?->name
                ?? $r->reportedSeller?->name;
            return $r;
        });

        return $this->success($reports);
    }

    /**
     * Normalise the frontend's short action names to internal canonical names.
     *
     * Frontend sends: ignore | warn | suspend | ban | delete
     *                 (also accepts the long forms for backward compat)
     * Internal:       ignore | warn_seller | suspend_seller | ban_seller | delete_product
     */
    private function normaliseAction(string $raw): string
    {
        return match ($raw) {
            'warn'           => 'warn_seller',
            'suspend'        => 'suspend_seller',
            'ban'            => 'ban_seller',
            'delete'         => 'delete_product',
            default          => $raw,   // already canonical or 'ignore'
        };
    }

    /**
     * PATCH /admin/reports/{id}            ← shape the React frontend uses
     * POST  /admin/reports/{id}/resolve     ← backward compatibility
     * POST  /admin/reports/{id}/action      ← alias requested by user spec
     *
     * Body: { "action": "ignore|warn|suspend|ban|delete" }
     *   (also accepts the long forms: warn_seller, ban_seller, etc.)
     */
    public function update(Request $request, Report $report): JsonResponse
    {
        return $this->applyAction($request, $report);
    }

    public function resolve(Request $request, Report $report): JsonResponse
    {
        return $this->applyAction($request, $report);
    }

    public function action(Request $request, Report $report): JsonResponse
    {
        return $this->applyAction($request, $report);
    }

    // ─── shared logic ────────────────────────────────────────────────────────

    private function applyAction(Request $request, Report $report): JsonResponse
    {
        $validated = $request->validate([
            'action' => [
                'required',
                'in:ignore,warn,suspend,ban,delete,'
                  . 'warn_seller,suspend_seller,ban_seller,delete_product',
            ],
        ]);

        $raw    = $validated['action'];
        $action = $this->normaliseAction($raw);
        $admin  = $request->user();

        // ── Delete product ─────────────────────────────────────────────────
        if ($action === 'delete_product' && $report->reported_product_id) {
            $product = Product::find($report->reported_product_id);
            if ($product) {
                $product->delete();
                AdminLogService::log(
                    $admin,
                    'delete_product',
                    "Deleted product #{$product->id} ({$product->name}) via report #{$report->id}",
                    null,
                    $product->id
                );
            }
        }

        // ── Seller actions ──────────────────────────────────────────────────
        if (in_array($action, ['warn_seller', 'suspend_seller', 'ban_seller'])) {
            $sellerId = $report->reported_seller_id
                ?? ($report->reportedProduct?->user_id);

            if ($sellerId) {
                $seller = User::find($sellerId);
                if ($seller) {
                    $this->applySellerPenalty($seller, $action, $admin, $report->id);
                }
            }
        }

        $report->update([
            'status'       => $action === 'ignore' ? 'ignored' : 'resolved',
            'admin_action' => $raw,   // store the exact value the admin sent
            'resolved_at'  => now(),
        ]);

        AdminLogService::log(
            $admin,
            'resolve_report',
            "Resolved report #{$report->id} with action: {$raw}"
        );

        return $this->success(
            $report->fresh()->load([
                'reporter:id,name,email',
                'reportedProduct:id,name',
                'reportedSeller:id,name',
            ]),
            "Report resolved with action: {$raw}."
        );
    }

    /**
     * Apply a penalty to a seller with notification and token revocation.
     */
    private function applySellerPenalty(User $seller, string $action, User $admin, int $reportId): void
    {
        if ($action === 'warn_seller') {
            // Create a proper warning record
            $warningMsg = "A report was filed against your account (report #{$reportId}). "
                . "Please review our marketplace policies and ensure your listings comply.";
            SellerWarning::create([
                'seller_id' => $seller->id,
                'admin_id'  => $admin->id,
                'reason'    => 'Report violation',
                'message'   => $warningMsg,
            ]);
            $seller->increment('warning_count');
            $newCount = $seller->fresh()->warning_count;
            $seller->notify(new SellerWarningNotification(
                reason: 'Report violation',
                message: $warningMsg,
                warningCount: $newCount,
            ));
            AdminLogService::log(
                $admin,
                'warn_seller',
                "Warned seller {$seller->name} (report #{$reportId})",
                $seller->id
            );
            return;
        }

        if ($action === 'suspend_seller') {
            $bannedUntil = now()->addDays(7);
            $seller->update([
                'is_banned'    => true,
                'ban_type'     => 'temporary',
                'banned_until' => $bannedUntil,
                'ban_reason'   => "Suspended following report #{$reportId}.",
            ]);
            $seller->tokens()->delete();
            $seller->notify(new SellerBannedNotification(
                banType: 'temporary',
                bannedUntil: $bannedUntil->toDateString(),
                reason: "Your account was suspended following a report (#{$reportId})."
            ));
            AdminLogService::log(
                $admin,
                'ban_seller',
                "Suspended seller {$seller->name} 7 days (report #{$reportId})",
                $seller->id
            );
            return;
        }

        if ($action === 'ban_seller') {
            $seller->update([
                'is_banned'    => true,
                'ban_type'     => 'permanent',
                'banned_until' => null,
                'ban_reason'   => "Permanently banned following report #{$reportId}.",
            ]);
            $seller->tokens()->delete();
            $seller->notify(new SellerBannedNotification(
                banType: 'permanent',
                bannedUntil: null,
                reason: "Your account was permanently banned following a report (#{$reportId})."
            ));
            AdminLogService::log(
                $admin,
                'ban_seller',
                "Permanently banned seller {$seller->name} (report #{$reportId})",
                $seller->id
            );
        }
    }
}
