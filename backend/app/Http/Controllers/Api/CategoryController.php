<?php

namespace App\Http\Controllers\Api;

use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    /**
     * GET /categories — list all categories with offer types.
     */
    public function index(): JsonResponse
    {
        $categories = Category::with('offerTypes:id,category_id,name,slug')
            ->orderBy('name')
            ->get();

        return $this->success($categories);
    }
}
