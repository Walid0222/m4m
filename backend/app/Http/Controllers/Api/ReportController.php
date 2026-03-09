<?php

namespace App\Http\Controllers\Api;

use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:product,seller'],
            'target_id' => ['required', 'integer'],
            'target_name' => ['nullable', 'string', 'max:255'],
            'reason' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $data = [
            'reporter_id' => $request->user()->id,
            'type' => $validated['type'],
            'reason' => $validated['reason'],
            'description' => $validated['description'] ?? null,
            'target_name' => $validated['target_name'] ?? null,
            'status' => 'pending',
        ];

        if ($validated['type'] === 'product') {
            $data['reported_product_id'] = $validated['target_id'];
        } else {
            $data['reported_seller_id'] = $validated['target_id'];
        }

        $report = Report::create($data);

        return $this->success($report, 'Report submitted.', 201);
    }
}
