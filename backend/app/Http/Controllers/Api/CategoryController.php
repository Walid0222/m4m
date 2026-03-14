<?php

namespace App\Http\Controllers\Api;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    /**
     * GET /categories — list all categories with offer types and product counts.
     * Returns total_products (all active) and per-category products_count.
     */
    public function index(): JsonResponse
    {
        $totalProducts = Product::where('status', 'active')->count();

        $categories = Category::with('offerTypes:id,category_id,name,slug')
            ->withCount(['products as products_count' => fn ($q) => $q->where('products.status', 'active')])
            ->orderBy('name')
            ->get();

        return $this->success([
            'total_products' => $totalProducts,
            'categories'     => $categories,
        ]);
    }
}
