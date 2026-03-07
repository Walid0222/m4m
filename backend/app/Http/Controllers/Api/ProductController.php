<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
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

        $products = $query->with('seller:id,name')
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->success($products);
    }

    public function show(Product $product): JsonResponse
    {
        if ($product->status !== 'active') {
            return $this->error('Product not available.', 404);
        }

        $product->load('seller:id,name');

        return $this->success($product);
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

    public function store(Request $request): JsonResponse
    {
        $this->authorizeSeller($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'images' => ['nullable', 'array'],
            'images.*' => ['string', 'max:500'],
            'status' => ['sometimes', 'in:draft,active,sold_out,inactive'],
        ]);

        $slug = Str::slug($validated['name']);
        $baseSlug = $slug;
        $count = 0;
        while (Product::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . (++$count);
        }
        $validated['slug'] = $slug;

        $product = $request->user()->products()->create($validated);

        return $this->success($product->fresh(), 'Product created.', 201);
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
        ]);

        $my_product->update($validated);

        return $this->success($my_product->fresh(), 'Product updated.');
    }

    public function destroy(Request $request, Product $my_product): JsonResponse
    {
        if ($my_product->user_id !== $request->user()->id) {
            return $this->error('Forbidden.', 403);
        }

        $my_product->delete();

        return $this->success(null, 'Product deleted.', 204);
    }

    private function authorizeSeller(Request $request): void
    {
        if (! $request->user()->is_seller) {
            abort(403, 'You must be a seller to manage products.');
        }
    }
}
