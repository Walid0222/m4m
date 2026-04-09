<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()->where('status', 'active')->whereSellerVisibleInPublicCatalog();

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('seller_id')) {
            $query->where('user_id', $request->seller_id)
                ->orderByDesc('is_pinned');
        }

        if ($request->filled('category_id')) {
            $query->whereHas('offerType', function ($q) use ($request) {
                $q->where('category_id', $request->category_id);
            });
        }

        $query->with('seller:id,name,avatar,updated_at,is_verified_seller,last_activity_at,created_at,vacation_mode')
            ->withCount([
                'orders as completed_orders_count' => function ($q) {
                    $q->where('status', Order::STATUS_COMPLETED);
                },
                'reviews',
            ])
            ->withAvg('reviews', 'rating');

        $sort = $request->string('sort')->toString();
        switch ($sort) {
            case 'newest':
                $query->latest();
                break;
            case 'lowest_price':
                $query->orderBy('price', 'asc');
                break;
            case 'highest_price':
                $query->orderBy('price', 'desc');
                break;
            case 'best_selling':
                $query->orderByDesc('completed_orders_count')->orderByDesc('created_at');
                break;
            case 'highest_rating':
                $query->orderByDesc('reviews_avg_rating')->orderByDesc('created_at');
                break;
            default:
                $query->latest();
                break;
        }

        $products = $query->paginate(min($request->integer('per_page', 15), 100));

        $products->getCollection()->transform(fn ($p) => $this->hideAnalyticsFromProduct($p));

        return $this->success($products);
    }

    /**
     * GET /products/best-selling
     *
     * Return top 8 products ordered by completed orders count.
     */
    public function bestSelling(Request $request): JsonResponse
    {
        $limit = min($request->integer('limit', 8), 16);

        $products = Product::query()
            ->where('status', 'active')
            ->whereSellerVisibleInPublicCatalog()
            ->with('seller:id,name,avatar,updated_at,is_verified_seller,last_activity_at,created_at,vacation_mode')
            ->withCount([
                'orders as completed_orders_count' => function ($q) {
                    $q->where('status', Order::STATUS_COMPLETED);
                },
                'reviews',
            ])
            ->withAvg('reviews', 'rating')
            ->orderByDesc('completed_orders_count')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(fn ($p) => $this->hideAnalyticsFromProduct($p));

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
            ->whereSellerVisibleInPublicCatalog()
            ->with('seller:id,name,avatar,updated_at,is_verified_seller,last_activity_at,created_at,vacation_mode')
            ->withCount([
                'orders as completed_orders_count' => function ($q) {
                    $q->where('status', Order::STATUS_COMPLETED);
                },
                'reviews',
            ])
            ->withAvg('reviews', 'rating')
            ->orderByDesc('completed_orders_count')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(fn ($p) => $this->hideAnalyticsFromProduct($p));

        return $this->success($products);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        if ($product->status !== 'active') {
            return $this->error('Product not available.', 404);
        }

        if (! Product::query()->whereKey($product->id)->whereSellerVisibleInPublicCatalog()->exists()) {
            return $this->error('Product not available.', 404);
        }

        if ($request->boolean('record_view', true)) {
            $product = $product->ensureActivityWindow();
            $product->increment('views');
            $product->increment('views_last_3_days');
        }
        $product->load([
            'seller:id,name,avatar,updated_at,is_verified_seller,last_activity_at,created_at,vacation_mode',
            'reviews.reviewer:id,name',
            'faqs',
        ]);

        if ($product->seller) {
            $completedForFeeTier = Order::where('seller_id', $product->seller->id)
                ->where('status', Order::STATUS_COMPLETED)
                ->count();
            $product->seller->setAttribute('completed_orders', $completedForFeeTier);
        }

        return $this->success($this->hideAnalyticsFromProduct($product));
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
            ->whereSellerVisibleInPublicCatalog()
            ->where('id', '!=', $product->id)
            ->with('seller:id,name,avatar,updated_at,is_verified_seller,last_activity_at,created_at,vacation_mode')
            ->withCount([
                'orders as completed_orders_count' => function ($q) {
                    $q->where('status', Order::STATUS_COMPLETED);
                },
                'reviews',
            ])
            ->withAvg('reviews', 'rating');

        // Prefer products from the same seller when possible
        if ($product->user_id) {
            $query->orderByRaw('CASE WHEN user_id = ? THEN 0 ELSE 1 END', [$product->user_id]);
        }

        $products = $query
            ->orderByDesc('completed_orders_count')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(fn ($p) => $this->hideAnalyticsFromProduct($p));

        return $this->success($products);
    }

    public function myIndex(Request $request): JsonResponse
    {
        $this->authorizeSeller($request);

        $products = $request->user()
            ->products()
            ->with(['faqs', 'offerType:id,category_id,service_id,name,slug', 'offerType.category:id,name', 'offerType.service:id,name,slug'])
            ->withCount('orders')
            ->orderByDesc('is_pinned')
            ->latest()
            ->paginate(min($request->integer('per_page', 15), 100));

        return $this->success($products);
    }

    public function search(Request $request): JsonResponse
    {
        $q = $request->string('q', '')->trim();
        $query = Product::query()->where('status', 'active')->whereSellerVisibleInPublicCatalog();

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

        $products = $query->with('seller:id,name,is_verified_seller,last_activity_at,created_at,vacation_mode')
            ->withCount([
                'orders as completed_orders_count' => function ($q) {
                    $q->where('status', Order::STATUS_COMPLETED);
                },
                'reviews',
            ])
            ->withAvg('reviews', 'rating')
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn ($p) => $this->hideAnalyticsFromProduct($p));

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
            'offer_type_id' => ['required', 'integer', 'exists:offer_types,id'],
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
            'delivery_instructions' => ['nullable', 'string', 'max:5000'],
            'seller_reminder' => ['nullable', 'string', 'max:2000'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:100'],
            'is_pinned' => ['sometimes', 'boolean'],
            'faqs' => ['nullable', 'array'],
            'faqs.*.question' => ['required_with:faqs.*', 'string', 'max:500'],
            'faqs.*.answer' => ['required_with:faqs.*', 'string', 'max:2000'],
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

        $faqs = $validated['faqs'] ?? null;
        unset($validated['faqs']);

        // When pinning a new product: only one product per seller can be pinned
        if (! empty($validated['is_pinned'])) {
            $request->user()->products()->update(['is_pinned' => false]);
        }

        $product = $request->user()->products()->create($validated);

        if (! empty($faqs)) {
            foreach ($faqs as $faq) {
                $product->faqs()->create([
                    'question' => $faq['question'],
                    'answer' => $faq['answer'],
                ]);
            }
        }

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
            $this->productWithStock($product->fresh()->load('faqs')),
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
            'offer_type_id' => ['sometimes', 'integer', 'exists:offer_types,id'],
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
            'delivery_instructions' => ['nullable', 'string', 'max:5000'],
            'seller_reminder' => ['nullable', 'string', 'max:2000'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:100'],
            'is_pinned' => ['sometimes', 'boolean'],
            'faqs' => ['nullable', 'array'],
            'faqs.*.question' => ['required_with:faqs.*', 'string', 'max:500'],
            'faqs.*.answer' => ['required_with:faqs.*', 'string', 'max:2000'],
        ]);

        $isInstant = ($validated['delivery_type'] ?? $my_product->delivery_type) === 'instant';
        $faqs = $validated['faqs'] ?? null;
        unset($validated['faqs']);

        // When pinning: only one product per seller can be pinned
        if (isset($validated['is_pinned']) && $validated['is_pinned'] === true) {
            $my_product->user->products()
                ->where('id', '!=', $my_product->id)
                ->update(['is_pinned' => false]);
        }

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

        if (isset($faqs)) {
            $my_product->faqs()->delete();
            foreach ($faqs as $faq) {
                $my_product->faqs()->create([
                    'question' => $faq['question'],
                    'answer' => $faq['answer'],
                ]);
            }
        }

        return $this->success($this->productWithStock($my_product->fresh()->load('faqs')), 'Product updated.');
    }

    public function destroy(Request $request, Product $my_product): JsonResponse
    {
        if ($my_product->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }

        $my_product->delete();

        return $this->success(null, 'Product deleted.', 204);
    }

    /**
     * POST /products/{product}/pin
     *
     * Toggle pin: if product is not pinned, pin it (unpins others first).
     * If already pinned, unpin it.
     */
    public function pin(Request $request, Product $product): JsonResponse
    {
        if (! $request->user()->is_seller) {
            return $this->error('Forbidden. Seller access required.', 403);
        }

        if ($product->user_id !== $request->user()->id) {
            return $this->error('Forbidden. You can only pin your own products.', 403);
        }

        if ($product->is_pinned) {
            $product->update(['is_pinned' => false]);
            return $this->success($this->productWithStock($product->fresh()->load('faqs')), 'Product unpinned.');
        }

        // Unpin all products from this seller
        $request->user()->products()->update(['is_pinned' => false]);
        $product->update(['is_pinned' => true]);

        return $this->success($this->productWithStock($product->fresh()->load('faqs')), 'Product pinned.');
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
            ->paginate(min($request->integer('per_page', 50), 100));

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

    private function hideAnalyticsFromProduct(Product $product): Product
    {
        return $product->hideAnalyticsForBuyers();
    }
}
