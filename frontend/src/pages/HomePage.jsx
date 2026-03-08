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

const SEARCH_DEBOUNCE_MS = 400;
const PRODUCTS_PER_PAGE = 12;

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
  const [fetchError, setFetchError] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [search, setSearch] = useState(searchFromUrl);
  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const [paginationMeta, setPaginationMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });

  // Sync search input with URL when URL changes (e.g. back button)
  useEffect(() => {
    setSearch(searchFromUrl);
    setSearchInput(searchFromUrl);
  }, [searchFromUrl]);

  // Debounced search: after user stops typing, update search and URL (reset to page 1)
  useEffect(() => {
    const trimmed = searchInput.trim();
    const t = setTimeout(() => {
      setSearch(trimmed);
      setPage(1);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (trimmed) next.set('search', trimmed);
        else next.delete('search');
        next.delete('page');
        return next;
      }, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput, setSearchParams]);

  // Filter state (client-side)
  const [priceMin, setPriceMin] = useState(searchParams.get('min_price') ?? '');
  const [priceMax, setPriceMax] = useState(searchParams.get('max_price') ?? '');
  const [minRating, setMinRating] = useState(searchParams.get('rating') ?? '');
  const [sellerId, setSellerId] = useState(searchParams.get('seller_id') ?? '');

  // Pagination: page from URL
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1));

  // Sync filter state and page from URL
  useEffect(() => {
    setPriceMin(searchParams.get('min_price') ?? '');
    setPriceMax(searchParams.get('max_price') ?? '');
    setMinRating(searchParams.get('rating') ?? '');
    setSellerId(searchParams.get('seller_id') ?? '');
    setPage(Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1));
  }, [searchParams]);

  // Fetch products with pagination (per_page=12, page)
  useEffect(() => {
    let cancelled = false;
    setFetchError(false);
    async function fetchProducts() {
      setLoading(true);
      try {
        const result = await getProducts({
          per_page: PRODUCTS_PER_PAGE,
          page,
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
          setPaginationMeta({
            currentPage: result?.current_page ?? 1,
            lastPage: result?.last_page ?? 1,
            total: result?.total ?? 0,
          });
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setFetchError(true);
          setPaginationMeta({ currentPage: 1, lastPage: 1, total: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProducts();
    return () => { cancelled = true; };
  }, [search, sellerId, page, retryTrigger]);

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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchInput.trim();
    setSearch(q);
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (q) next.set('search', q);
      else next.delete('search');
      next.delete('page');
      return next;
    }, { replace: true });
  };

  const handleSearchChange = (value) => {
    setSearchInput(value);
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
    setPage(1);
    updateUrl({ seller_id: v || undefined, page: undefined });
  };

  const clearFilters = () => {
    setPriceMin('');
    setPriceMax('');
    setMinRating('');
    setSellerId('');
    setSearchInput('');
    setSearch('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasActiveFilters = priceMin || priceMax || minRating || sellerId || searchInput.trim();

  const goToPage = (newPage) => {
    const p = Math.max(1, Math.min(newPage, paginationMeta.lastPage));
    setPage(p);
    updateUrl({ page: p === 1 ? undefined : p });
  };

  const { currentPage, lastPage, total } = paginationMeta;
  const canPrev = currentPage > 1;
  const canNext = currentPage < lastPage;
  const from = total === 0 ? 0 : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const to = Math.min(currentPage * PRODUCTS_PER_PAGE, total);

  return (
    <div className="min-h-screen bg-m4m-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Z2U-style top section: search + filters in one card */}
        <section className="mb-6 md:mb-8">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h1 className="text-xl md:text-2xl font-bold text-m4m-black">M4M Marketplace</h1>
            <p className="text-sm text-m4m-gray-500">Products update as you filter</p>
          </div>
          <div className="rounded-2xl border border-m4m-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 space-y-4 md:space-y-0 md:flex md:flex-wrap md:items-end md:gap-4">
              {/* Search bar */}
              <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0 md:min-w-[280px] md:max-w-md">
                <label htmlFor="marketplace-search" className="block text-xs font-medium text-m4m-gray-500 mb-1.5">
                  Search
                </label>
                <div className="relative">
                  <input
                    id="marketplace-search"
                    type="search"
                    placeholder="Search products..."
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-m4m-gray-200 bg-m4m-gray-50/50 text-m4m-black placeholder-m4m-gray-400 focus:ring-2 focus:ring-m4m-purple focus:border-transparent focus:bg-white outline-none transition-colors"
                    aria-label="Search products"
                  />
                  <button
                    type="submit"
                    aria-label="Search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-m4m-gray-400 hover:text-m4m-purple hover:bg-m4m-gray-100 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </form>

              {/* Category (Seller) filter */}
              <div className="w-full sm:w-auto min-w-0">
                <label htmlFor="filter-category" className="block text-xs font-medium text-m4m-gray-500 mb-1.5">
                  Category
                </label>
                <select
                  id="filter-category"
                  value={sellerId}
                  onChange={(e) => handleSellerChange(e.target.value)}
                  className="w-full sm:w-[180px] px-3 py-2.5 rounded-xl border border-m4m-gray-200 bg-m4m-gray-50/50 text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple focus:border-transparent focus:bg-white outline-none transition-colors"
                >
                  <option value="">All sellers</option>
                  {uniqueSellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price range filter */}
              <div className="w-full sm:w-auto">
                <span className="block text-xs font-medium text-m4m-gray-500 mb-1.5">Price range</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Min"
                      value={priceMin}
                      onChange={(e) => handlePriceMinChange(e.target.value)}
                      className="w-20 px-2.5 py-2 rounded-lg border border-m4m-gray-200 bg-m4m-gray-50/50 text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple focus:bg-white outline-none"
                    />
                    <span className="text-m4m-gray-400 font-medium">–</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Max"
                      value={priceMax}
                      onChange={(e) => handlePriceMaxChange(e.target.value)}
                      className="w-20 px-2.5 py-2 rounded-lg border border-m4m-gray-200 bg-m4m-gray-50/50 text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple focus:bg-white outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRICE_PRESETS.slice(1).map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handlePricePreset(preset)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          priceMin === preset.min && priceMax === preset.max
                            ? 'bg-m4m-purple text-white'
                            : 'bg-m4m-gray-100 text-m4m-gray-700 hover:bg-m4m-gray-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rating filter */}
              <div className="w-full sm:w-auto">
                <label htmlFor="filter-rating" className="block text-xs font-medium text-m4m-gray-500 mb-1.5">
                  Rating
                </label>
                <select
                  id="filter-rating"
                  value={minRating}
                  onChange={(e) => handleRatingChange(e.target.value)}
                  className="w-full sm:w-[130px] px-3 py-2.5 rounded-xl border border-m4m-gray-200 bg-m4m-gray-50/50 text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple focus:border-transparent focus:bg-white outline-none transition-colors"
                >
                  {RATING_OPTIONS.map((opt) => (
                    <option key={opt.value || 'any'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-m4m-purple hover:bg-m4m-purple/10 transition-colors border border-m4m-purple/30"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Product grid */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-m4m-black">
              Products
              {!loading && (
                <span className="ml-2 text-m4m-gray-500 font-normal">
                  {total > 0 ? `${from}–${to} of ${total}` : `(0)`}
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-m4m-gray-200 bg-white aspect-[3/4] animate-pulse shadow-sm"
                  aria-hidden
                />
              ))}
            </div>
          ) : fetchError ? (
            <div className="rounded-2xl border border-m4m-gray-200 bg-white py-16 px-6 text-center shadow-sm">
              <p className="text-m4m-gray-600 font-medium">Something went wrong</p>
              <p className="text-sm text-m4m-gray-500 mt-1">We couldn’t load products. Try again.</p>
              <button
                type="button"
                onClick={() => setRetryTrigger((t) => t + 1)}
                className="mt-4 px-5 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-light transition-colors"
              >
                Try again
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-m4m-gray-200 bg-white py-16 text-center shadow-sm">
              <p className="text-m4m-gray-500">No products match your filters.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-m4m-purple font-medium hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {lastPage > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={!canPrev}
                    className="px-4 py-2.5 rounded-xl font-medium border border-m4m-gray-200 bg-white text-m4m-gray-700 hover:bg-m4m-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-m4m-gray-500">
                    Page {currentPage} of {lastPage}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={!canNext}
                    className="px-4 py-2.5 rounded-xl font-medium border border-m4m-gray-200 bg-white text-m4m-gray-700 hover:bg-m4m-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
