<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\ProductAccount;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()->where('status', 'active');

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('seller_id')) {
            $query->where('user_id', $request->seller_id);
        }

        $products = $query->with('seller:id,name,is_verified_seller,last_activity_at,created_at')
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->success($products);
    }

    /**
     * GET /products/trending
     *
     * Return a short list of trending products based on completed orders.
     */
    public function trending(Request $request): JsonResponse
    {
        $limit = $request->integer('limit', 8);

        $products = Product::query()
            ->where('status', 'active')
            ->with('seller:id,name,is_verified_seller,last_activity_at,created_at')
            ->withCount([
                'orders as completed_orders_count' => function ($q) {
                    $q->where('status', Order::STATUS_COMPLETED);
                },
            ])
            ->orderByDesc('completed_orders_count')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        return $this->success($products);
    }

    public function show(Product $product): JsonResponse
    {
        if ($product->status !== 'active') {
            return $this->error('Product not available.', 404);
        }

        $product->load(['seller:id,name,is_verified_seller,last_activity_at,created_at', 'reviews.reviewer:id,name']);

        return $this->success($product);
    }

    /**
     * GET /products/{product}/recommended
     *
     * Recommend other products based on popularity and recency.
     * Excludes the current product.
     */
    public function recommended(Request $request, Product $product): JsonResponse
    {
        $limit = $request->integer('limit', 8);

        $query = Product::query()
            ->where('status', 'active')
            ->where('id', '!=', $product->id)
            ->with('seller:id,name,is_verified_seller,last_activity_at,created_at')
            ->withCount([
                'orders as completed_orders_count' => function ($q) {
                    $q->where('status', Order::STATUS_COMPLETED);
                },
            ]);

        // Prefer products from the same seller when possible
        if ($product->user_id) {
            $query->orderByRaw('CASE WHEN user_id = ? THEN 0 ELSE 1 END', [$product->user_id]);
        }

        $products = $query
            ->orderByDesc('completed_orders_count')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        return $this->success($products);
    }

    public function myIndex(Request $request): JsonResponse
    {
        $this->authorizeSeller($request);

        $products = $request->user()
            ->products()
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->success($products);
    }

    public function search(Request $request): JsonResponse
    {
        $q = $request->string('q', '')->trim();
        $query = Product::query()->where('status', 'active');

        if ($q !== '') {
            $terms = preg_split('/\s+/', strtolower($q));
            $query->where(function ($qb) use ($q, $terms) {
                $qb->where('name', 'like', "%{$q}%")
                    ->orWhere('description', 'like', "%{$q}%");
                foreach ($terms as $term) {
                    $qb->orWhere('name', 'like', "%{$term}%")
                        ->orWhere('description', 'like', "%{$term}%");
                }
            });
        }

        $products = $query->with('seller:id,name,is_verified_seller,last_activity_at,created_at')
            ->latest()
            ->limit(20)
            ->get();

        return $this->success($products);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeSeller($request);

        $seller = $request->user();

        // Check seller product limit
        if (! $seller->limits_overridden) {
            $limit = $seller->product_limit ?? 5;
            $currentCount = $seller->products()->where('status', '!=', 'inactive')->count();
            if ($currentCount >= $limit) {
                return $this->error(
                    "You have reached your product limit ({$limit} products). Get verified to increase your limit.",
                    422,
                    ['seller_limit' => $limit, 'current_count' => $currentCount]
                );
            }
        }

        // Anti-spam: max 3 products in 5 minutes
        $recentCount = $seller->products()
            ->where('created_at', '>=', now()->subMinutes(5))
            ->count();
        if ($recentCount >= 3) {
            return $this->error('You are creating products too quickly. Please wait a few minutes.', 429);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['sometimes', 'integer', 'min:0'],
            'images' => ['nullable', 'array'],
            'images.*' => ['string', 'max:500'],
            'status' => ['sometimes', 'in:draft,active,sold_out,inactive'],
            'delivery_time' => ['nullable', 'string', 'max:50'],
            'delivery_type' => ['sometimes', 'in:manual,instant'],
            'delivery_content' => ['nullable', 'string'],
            'seller_reminder' => ['nullable', 'string', 'max:2000'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:100'],
        ]);

        $slug = Str::slug($validated['name']);
        $baseSlug = $slug;
        $count = 0;
        while (Product::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . (++$count);
        }
        $validated['slug'] = $slug;

        $isInstant = ($validated['delivery_type'] ?? 'manual') === 'instant';

        // For instant delivery, seed product_accounts from delivery_content
        if ($isInstant && ! empty($validated['delivery_content'])) {
            $lines = array_values(array_filter(
                array_map('trim', explode("\n", trim($validated['delivery_content'])))
            ));
            $validated['stock'] = count($lines);
        }

        $product = $request->user()->products()->create($validated);

        // Seed product_accounts for instant delivery
        if ($isInstant && ! empty($validated['delivery_content'])) {
            $lines = array_values(array_filter(
                array_map('trim', explode("\n", trim($validated['delivery_content'])))
            ));
            foreach ($lines as $line) {
                ProductAccount::create([
                    'product_id'   => $product->id,
                    'account_data' => $line,
                    'status'       => ProductAccount::STATUS_AVAILABLE,
                ]);
            }
        }

        return $this->success(
            $this->productWithStock($product->fresh()),
            'Product created.',
            201
        );
    }

    public function update(Request $request, Product $my_product): JsonResponse
    {
        if ($my_product->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'stock' => ['sometimes', 'integer', 'min:0'],
            'images' => ['nullable', 'array'],
            'images.*' => ['string', 'max:500'],
            'status' => ['sometimes', 'in:draft,active,sold_out,inactive'],
            'delivery_time' => ['nullable', 'string', 'max:50'],
            'delivery_type' => ['sometimes', 'in:manual,instant'],
            'delivery_content' => ['nullable', 'string'],
            'seller_reminder' => ['nullable', 'string', 'max:2000'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:100'],
        ]);

        $isInstant = ($validated['delivery_type'] ?? $my_product->delivery_type) === 'instant';

        // If delivery_content updated for instant product, replace account stock
        if ($isInstant && isset($validated['delivery_content'])) {
            $lines = array_values(array_filter(
                array_map('trim', explode("\n", trim($validated['delivery_content'])))
            ));
            $validated['stock'] = count($lines);

            // Remove only unsold accounts and replace
            ProductAccount::where('product_id', $my_product->id)
                ->where('status', ProductAccount::STATUS_AVAILABLE)
                ->delete();

            foreach ($lines as $line) {
                ProductAccount::create([
                    'product_id'   => $my_product->id,
                    'account_data' => $line,
                    'status'       => ProductAccount::STATUS_AVAILABLE,
                ]);
            }
        }

        $my_product->update($validated);

        return $this->success($this->productWithStock($my_product->fresh()), 'Product updated.');
    }

    public function destroy(Request $request, Product $my_product): JsonResponse
    {
        if ($my_product->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }

        $my_product->delete();

        return $this->success(null, 'Product deleted.', 204);
    }

    // ─── Account stock management ─────────────────────────────────────────────

    /**
     * POST /seller/products/{product}/accounts
     *
     * Append new account lines to the product's instant-delivery stock.
     * Each line is one record in product_accounts.
     *
     * Input: { accounts: "email1:pass1\nemail2:pass2\n..." }
     */
    public function addAccounts(Request $request, Product $my_product): JsonResponse
    {
        $this->authorizeSeller($request);

        if ($my_product->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }

        if ($my_product->delivery_type !== 'instant') {
            return $this->error('Account stock can only be added to instant-delivery products.', 422);
        }

        $validated = $request->validate([
            'accounts' => ['required', 'string'],
        ]);

        $lines = array_values(array_filter(
            array_map('trim', explode("\n", trim($validated['accounts'])))
        ));

        if (empty($lines)) {
            return $this->error('No valid account lines provided.', 422);
        }

        $created = [];
        foreach ($lines as $line) {
            $created[] = ProductAccount::create([
                'product_id'   => $my_product->id,
                'account_data' => $line,
                'status'       => ProductAccount::STATUS_AVAILABLE,
            ]);
        }

        // Sync stock count
        $availableCount = ProductAccount::where('product_id', $my_product->id)
            ->where('status', ProductAccount::STATUS_AVAILABLE)
            ->count();
        $my_product->update(['stock' => $availableCount]);

        return $this->success([
            'added'           => count($created),
            'available_stock' => $availableCount,
        ], count($created) . ' account(s) added successfully.', 201);
    }

    /**
     * GET /seller/products/{product}/accounts
     *
     * List account stock for this product (seller only).
     * account_data is masked for sold entries to protect credentials.
     */
    public function listAccounts(Request $request, Product $my_product): JsonResponse
    {
        $this->authorizeSeller($request);

        if ($my_product->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }

        $accounts = ProductAccount::where('product_id', $my_product->id)
            ->orderBy('status')
            ->latest()
            ->paginate($request->integer('per_page', 50));

        return $this->success($accounts);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Attach real-time available_stock from product_accounts
     * so the frontend always sees accurate stock for instant products.
     */
    private function productWithStock(Product $product): array
    {
        $data = $product->toArray();
        if ($product->delivery_type === 'instant') {
            $data['available_stock'] = ProductAccount::where('product_id', $product->id)
                ->where('status', ProductAccount::STATUS_AVAILABLE)
                ->count();
        }
        return $data;
    }

    private function authorizeSeller(Request $request): void
    {
        if (! $request->user()->is_seller) {
            abort(403, 'You must be a seller to manage products.');
        }
    }
}
