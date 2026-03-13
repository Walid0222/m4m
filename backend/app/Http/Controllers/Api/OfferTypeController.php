<?php

namespace App\Http\Controllers\Api;

use App\Models\OfferType;
use App\Models\Product;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfferTypeController extends Controller
{
    /**
     * GET /offer-types — list active offer types, optionally by category.
     */
    public function index(Request $request): JsonResponse
    {
        $query = OfferType::query()
            ->where('status', OfferType::STATUS_ACTIVE)
            ->with('category:id,name,slug');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('service_id')) {
            $query->where('service_id', $request->service_id);
        }

        $offerTypes = $query->orderBy('name')->get();

        return $this->success($offerTypes);
    }

    /**
     * GET /offer-types/search?q= — search offer types by name/slug.
     */
    public function search(Request $request): JsonResponse
    {
        $q = $request->string('q', '')->trim();
        $limit = $request->integer('limit', 20);

        $query = OfferType::query()
            ->where('status', OfferType::STATUS_ACTIVE)
            ->with('category:id,name,slug');

        if ($q !== '') {
            $terms = preg_split('/\s+/', strtolower($q));
            $query->where(function ($qb) use ($q, $terms) {
                $qb->where('name', 'like', "%{$q}%")
                    ->orWhere('slug', 'like', "%{$q}%");
                foreach ($terms as $term) {
                    $qb->orWhere('name', 'like', "%{$term}%")
                        ->orWhere('slug', 'like', "%{$term}%");
                }
            });
        }

        $offerTypes = $query->orderBy('name')->limit($limit)->get();

        return $this->success($offerTypes);
    }

    /**
     * GET /offer-types/{offer_type} — get offer type by slug with products.
     */
    public function show(Request $request, OfferType $offer_type): JsonResponse
    {
        if ($offer_type->status !== OfferType::STATUS_ACTIVE) {
            return $this->error('Service not available.', 404);
        }

        $offer_type->load([
            'category:id,name,slug',
            'service:id,name,slug',
        ]);

        // Sibling offer types for navigation (same service)
        $serviceOfferTypes = [];
        if ($offer_type->service_id) {
            $serviceOfferTypes = OfferType::query()
                ->where('service_id', $offer_type->service_id)
                ->where('status', OfferType::STATUS_ACTIVE)
                ->orderBy('name')
                ->get(['id', 'service_id', 'category_id', 'name', 'slug', 'icon', 'status']);
        }

        $products = Product::query()
            ->where('offer_type_id', $offer_type->id)
            ->where('status', 'active')
            ->with('seller:id,name,avatar,updated_at,is_verified_seller,last_activity_at,created_at,vacation_mode')
            ->withCount([
                'orders as completed_orders_count' => function ($q) {
                    $q->where('status', Order::STATUS_COMPLETED);
                },
                'reviews',
            ])
            ->withAvg('reviews', 'rating')
            ->orderBy('price')
            ->paginate($request->integer('per_page', 24));

        $products->getCollection()->transform(function ($p) {
            return $p->hideAnalyticsForBuyers();
        });

        return $this->success([
            'offer_type'           => $offer_type,
            'products'             => $products,
            'service_offer_types'  => $serviceOfferTypes,
        ]);
    }
}
