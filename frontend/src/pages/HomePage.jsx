import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { getProducts, paginatedItems } from '../services/api';

const RATING_OPTIONS = [
  { value: '', label: 'Any rating' },
  { value: '3', label: '3+ stars' },
  { value: '4', label: '4+ stars' },
  { value: '5', label: '5 stars' },
];

const PRICE_PRESETS = [
  { min: '', max: '', label: 'Any price' },
  { min: '0', max: '25', label: 'Under $25' },
  { min: '25', max: '50', label: '$25 – $50' },
  { min: '50', max: '100', label: '$50 – $100' },
  { min: '100', max: '', label: '$100+' },
];

function getProductRating(p) {
  const r = p.rating;
  if (typeof r === 'number' && r >= 0) return r;
  if (r != null) return parseFloat(r) || 0;
  return 4;
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = searchParams.get('search') ?? '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchFromUrl);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter state (client-side)
  const [priceMin, setPriceMin] = useState(searchParams.get('min_price') ?? '');
  const [priceMax, setPriceMax] = useState(searchParams.get('max_price') ?? '');
  const [minRating, setMinRating] = useState(searchParams.get('rating') ?? '');
  const [sellerId, setSellerId] = useState(searchParams.get('seller_id') ?? '');

  // Sync search input with URL
  useEffect(() => {
    setSearch(searchFromUrl);
  }, [searchFromUrl]);

  // Sync filter state from URL
  useEffect(() => {
    setPriceMin(searchParams.get('min_price') ?? '');
    setPriceMax(searchParams.get('max_price') ?? '');
    setMinRating(searchParams.get('rating') ?? '');
    setSellerId(searchParams.get('seller_id') ?? '');
  }, [searchParams]);

  // Fetch products (API supports search + seller_id)
  useEffect(() => {
    let cancelled = false;
    async function fetchProducts() {
      setLoading(true);
      try {
        const result = await getProducts({
          per_page: 100,
          ...(search && { search }),
          ...(sellerId && { seller_id: sellerId }),
        });
        if (!cancelled) {
          const list = paginatedItems(result);
          setProducts(
            (Array.isArray(list) ? list : []).map((p) => ({
              ...p,
              rating: p.rating ?? getProductRating(p),
              is_online: p.is_online ?? p.isOnline ?? true,
            }))
          );
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProducts();
    return () => { cancelled = true; };
  }, [search, sellerId]);

  // Unique sellers from current product list (for seller filter dropdown when not filtering by seller)
  const uniqueSellers = useMemo(() => {
    const seen = new Map();
    products.forEach((p) => {
      const s = p.seller;
      if (s?.id && !seen.has(s.id)) seen.set(s.id, s.name || 'Seller');
    });
    return Array.from(seen.entries(), ([id, name]) => ({ id, name }));
  }, [products]);

  // Apply client-side filters (price, rating)
  const filteredProducts = useMemo(() => {
    const minP = priceMin === '' ? -Infinity : parseFloat(priceMin) || -Infinity;
    const maxP = priceMax === '' ? Infinity : parseFloat(priceMax) || Infinity;
    const minR = minRating === '' ? 0 : parseFloat(minRating) || 0;

    return products.filter((p) => {
      const price = Number(p.price) || 0;
      const rating = getProductRating(p);
      if (price < minP || price > maxP) return false;
      if (rating < minR) return false;
      return true;
    });
  }, [products, priceMin, priceMax, minRating]);

  const updateUrl = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value != null && value !== '') next.set(key, String(value));
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    updateUrl({ search: value || undefined });
  };

  const handlePricePreset = (preset) => {
    setPriceMin(preset.min);
    setPriceMax(preset.max);
    updateUrl({
      min_price: preset.min || undefined,
      max_price: preset.max || undefined,
    });
  };

  const handlePriceMinChange = (v) => {
    setPriceMin(v);
    updateUrl({ min_price: v || undefined });
  };

  const handlePriceMaxChange = (v) => {
    setPriceMax(v);
    updateUrl({ max_price: v || undefined });
  };

  const handleRatingChange = (v) => {
    setMinRating(v);
    updateUrl({ rating: v || undefined });
  };

  const handleSellerChange = (v) => {
    setSellerId(v);
    updateUrl({ seller_id: v || undefined });
  };

  const clearFilters = () => {
    setPriceMin('');
    setPriceMax('');
    setMinRating('');
    setSellerId('');
    setSearchParams(new URLSearchParams(searchParams.get('search') ? { search: searchParams.get('search') } : {}), {
      replace: true,
    });
  };

  const hasActiveFilters = priceMin || priceMax || minRating || sellerId;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Header + Search */}
      <section className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-m4m-black mb-2">M4M Marketplace</h1>
        <p className="text-m4m-gray-500 mb-4 md:mb-6">Discover products from trusted sellers</p>
        <form
          onSubmit={(e) => { e.preventDefault(); }}
          className="max-w-xl"
        >
          <div className="relative">
            <input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-4 py-3 pr-10 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black placeholder-m4m-gray-500 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
              aria-label="Search products"
            />
            <button
              type="button"
              aria-label="Search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-m4m-gray-500 hover:text-m4m-purple hover:bg-m4m-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>
      </section>

      {/* Filters bar */}
      <section className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="md:hidden flex items-center gap-2 px-4 py-2 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black font-medium text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-m4m-purple" />
            )}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-m4m-purple hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div
          className={`grid gap-4 md:gap-6 ${filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'} md:grid-rows-[1fr]`}
        >
          <div className="overflow-hidden">
            <div className="flex flex-wrap items-end gap-4 md:gap-6 p-4 md:p-0 md:py-2 rounded-xl md:rounded-none bg-m4m-gray-50 md:bg-transparent border border-m4m-gray-200 md:border-0">
              {/* Price */}
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-medium text-m4m-gray-500 mb-1">Price</label>
                <div className="flex flex-wrap gap-2">
                  {PRICE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handlePricePreset(preset)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        priceMin === preset.min && priceMax === preset.max
                          ? 'bg-m4m-purple text-white'
                          : 'bg-white border border-m4m-gray-200 text-m4m-gray-700 hover:bg-m4m-gray-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => handlePriceMinChange(e.target.value)}
                    className="w-24 px-2 py-1.5 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple outline-none"
                  />
                  <span className="text-m4m-gray-400">–</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => handlePriceMaxChange(e.target.value)}
                    className="w-24 px-2 py-1.5 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple outline-none"
                  />
                </div>
              </div>

              {/* Rating */}
              <div className="w-full sm:w-auto">
                <label htmlFor="filter-rating" className="block text-xs font-medium text-m4m-gray-500 mb-1">
                  Min. rating
                </label>
                <select
                  id="filter-rating"
                  value={minRating}
                  onChange={(e) => handleRatingChange(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple outline-none min-w-[120px]"
                >
                  {RATING_OPTIONS.map((opt) => (
                    <option key={opt.value || 'any'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seller */}
              <div className="w-full sm:w-auto">
                <label htmlFor="filter-seller" className="block text-xs font-medium text-m4m-gray-500 mb-1">
                  Seller
                </label>
                <select
                  id="filter-seller"
                  value={sellerId}
                  onChange={(e) => handleSellerChange(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple outline-none min-w-[140px]"
                >
                  <option value="">All sellers</option>
                  {uniqueSellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-m4m-black">
            Products
            {!loading && (
              <span className="ml-2 text-m4m-gray-500 font-normal">
                ({filteredProducts.length})
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-m4m-gray-200 bg-m4m-gray-50 aspect-[3/4] animate-pulse"
                aria-hidden
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-m4m-gray-200 bg-m4m-gray-50 py-16 text-center">
            <p className="text-m4m-gray-500">No products match your filters. Try different search or filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-m4m-purple font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
