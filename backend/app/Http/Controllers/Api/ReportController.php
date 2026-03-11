<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    // ─── Submit a report ─────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type'        => ['required', 'in:product,seller'],
            'target_id'   => ['required', 'integer'],
            'target_name' => ['nullable', 'string', 'max:255'],
            'reason'      => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $data = [
            'reporter_id' => $request->user()->id,
            'type'        => $validated['type'],
            'reason'      => $validated['reason'],
            'description' => $validated['description'] ?? null,
            'target_name' => $validated['target_name'] ?? null,
            'status'      => 'pending',
        ];

        $sellerId = null;

        if ($validated['type'] === 'product') {
            $data['reported_product_id'] = $validated['target_id'];
            // Find seller of the product
            $product  = Product::find($validated['target_id']);
            $sellerId = $product?->user_id;
        } else {
            $data['reported_seller_id'] = $validated['target_id'];
            $sellerId = $validated['target_id'];
        }

        $report = Report::create($data);

        // Do not notify the reported user directly; reports are handled by admins only.
        // Admin actions (warnings / bans) will still generate their own notifications.

        return $this->success($report, 'Report submitted.', 201);
    }

    // ─── Seller: view reports against their products/profile ─────────────────

    /**
     * GET /seller/reports
     *
     * Returns all reports where:
     *  - reported_seller_id = auth seller
     *  - OR reported_product_id belongs to one of auth seller's products
     */
    public function sellerIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->is_seller) {
            return $this->error('Seller access required.', 403);
        }

        $productIds = Product::where('user_id', $user->id)->pluck('id');

        $reports = Report::where('reported_seller_id', $user->id)
            ->orWhereIn('reported_product_id', $productIds)
            ->with([
                'reporter:id,name',
                'reportedProduct:id,name,slug',
            ])
            ->latest()
            ->paginate($request->integer('per_page', 20));

        // Add unread count helper (pending reports the seller hasn't acted on)
        $pendingCount = Report::where('status', 'pending')
            ->where(function ($q) use ($user, $productIds) {
                $q->where('reported_seller_id', $user->id)
                    ->orWhereIn('reported_product_id', $productIds);
            })
            ->count();

        return $this->success([
            'reports'       => $reports,
            'pending_count' => $pendingCount,
        ]);
    }
}
