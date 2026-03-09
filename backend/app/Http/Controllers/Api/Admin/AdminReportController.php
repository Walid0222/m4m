<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Controller;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Report::with(['reporter:id,name,email', 'reportedProduct:id,name,slug', 'reportedSeller:id,name,email'])
            ->latest();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        $reports = $query->paginate($request->integer('per_page', 20));

        return $this->success($reports);
    }

    public function resolve(Request $request, Report $report): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['required', 'in:ignore,delete_product,warn_seller,suspend_seller,ban_seller'],
        ]);

        $action = $validated['action'];

        if ($action === 'delete_product' && $report->reported_product_id) {
            Product::where('id', $report->reported_product_id)->delete();
        }

        if (in_array($action, ['warn_seller', 'suspend_seller', 'ban_seller']) && $report->reported_seller_id) {
            $seller = User::find($report->reported_seller_id);
            if ($seller) {
                if ($action === 'suspend_seller') {
                    $seller->update([
                        'is_banned' => true,
                        'ban_type' => 'temporary',
                        'banned_until' => now()->addDays(7),
                    ]);
                } elseif ($action === 'ban_seller') {
                    $seller->update([
                        'is_banned' => true,
                        'ban_type' => 'permanent',
                        'banned_until' => null,
                    ]);
                }
            }
        }

        $report->update(['status' => 'resolved', 'admin_action' => $action]);

        return $this->success($report, 'Report resolved.');
    }
}
