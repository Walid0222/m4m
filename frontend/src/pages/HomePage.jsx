import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ServiceCard from '../components/ServiceCard';
import { useAuth } from '../contexts/AuthContext';
import {
  getProducts,
  getProduct,
  getTrendingProducts,
  getServices,
  paginatedItems,
  getFavoriteIds,
  toggleFavorite,
  getToken,
} from '../services/api';

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Ahmed Karim',
    avatar: 'A',
    comment: 'خدمة ممتازة وسريعة جداً! حصلت على حسابي في دقائق. سأعود بالتأكيد للشراء مجدداً.',
    rating: 5,
    date: 'Feb 2026',
    flag: '🇲🇦',
  },
  {
    id: 2,
    name: 'Lucas Moreau',
    avatar: 'L',
    comment: 'Super marketplace, j\'ai acheté plusieurs produits sans aucun problème. Le vendeur était très réactif et professionnel.',
    rating: 5,
    date: 'Jan 2026',
    flag: '🇫🇷',
  },
  {
    id: 3,
    name: 'Jordan Smith',
    avatar: 'J',
    comment: 'Absolutely love this platform! The instant delivery feature is a game changer. Got my account credentials in seconds.',
    rating: 5,
    date: 'Mar 2026',
    flag: '🇺🇸',
  },
  {
    id: 4,
    name: 'Youssef Benali',
    avatar: 'Y',
    comment: 'منصة موثوقة ومنظمة. الدعم ممتاز والأسعار معقولة. أنصح الجميع بالتسوق من هنا.',
    rating: 4,
    date: 'Feb 2026',
    flag: '🇩🇿',
  },
  {
    id: 5,
    name: 'Camille Dupont',
    avatar: 'C',
    comment: 'Très bonne expérience d\'achat. La vérification des vendeurs donne confiance. Je recommande vivement M4M.',
    rating: 5,
    date: 'Mar 2026',
    flag: '🇧🇪',
  },
  {
    id: 6,
    name: 'Tyler Brooks',
    avatar: 'T',
    comment: 'Fast, reliable and trustworthy. The escrow-like deposit system makes me feel safe spending money here.',
    rating: 4,
    date: 'Jan 2026',
    flag: '🇬🇧',
  },
];

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
  const reviews = p.reviews ?? [];
  const count = p.reviews_count ?? reviews.length;
  if (count === 0) return null;
  const avg = p.reviews_avg_rating ?? (reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length
    : null);
  return avg != null ? Number(avg) : null;
}

export default function HomePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = searchParams.get('search') ?? '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [trending, setTrending] = useState([]);
  const [services, setServices] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [search, setSearch] = useState(searchFromUrl);
  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const [paginationMeta, setPaginationMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [favoriteIds, setFavoriteIds] = useState([]);

  // Sync search input with URL when URL changes (e.g. back button)
  useEffect(() => {
    setSearch(searchFromUrl);
    setSearchInput(searchFromUrl);
  }, [searchFromUrl]);

  // Load favorites once for logged-in users
  useEffect(() => {
    if (!getToken() || !user) {
      setFavoriteIds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const ids = await getFavoriteIds();
        if (!cancelled && Array.isArray(ids)) {
          setFavoriteIds(ids.map((v) => Number(v)));
        }
      } catch {
        if (!cancelled) setFavoriteIds([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Load trending products (public)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getTrendingProducts({ limit: 8 });
        if (!cancelled && Array.isArray(data)) {
          setTrending(
            data.map((p) => ({
              ...p,
              is_online: p.is_online ?? p.isOnline ?? true,
            }))
          );
        }
      } catch {
        if (!cancelled) {
          setTrending([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load services for homepage grid
  useEffect(() => {
    let cancelled = false;
    getServices()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setServices(data);
        else if (!cancelled && data?.data) setServices(data.data);
      })
      .catch(() => { if (!cancelled) setServices([]); });
    return () => { cancelled = true; };
  }, []);

  // Load recently viewed products from localStorage and fetch details
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const STORAGE_KEY = 'recently_viewed_products';
        const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (!raw) {
          if (!cancelled) setRecentlyViewed([]);
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }
        const ids = Array.isArray(parsed) ? parsed : [];
        if (!ids.length) {
          if (!cancelled) setRecentlyViewed([]);
          return;
        }

        const normalizedIds = [];
        const seen = new Set();
        ids.forEach((v) => {
          const n = Number(v);
          if (!Number.isNaN(n) && !seen.has(n)) {
            seen.add(n);
            normalizedIds.push(n);
          }
        });

        if (!normalizedIds.length) {
          if (!cancelled) setRecentlyViewed([]);
          return;
        }

        const results = await Promise.all(
          normalizedIds.map((id) =>
            getProduct(id, { record_view: 0 }).catch(() => null)
          )
        );

        if (cancelled) return;

        const products = results
          .map((p, index) => (p ? { ...p, _recentIndex: index } : null))
          .filter(Boolean)
          .sort((a, b) => a._recentIndex - b._recentIndex)
          .map((p) => ({
            ...p,
            is_online: p.is_online ?? p.isOnline ?? true,
          }));

        setRecentlyViewed(products);
      } catch {
        if (!cancelled) setRecentlyViewed([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleFavorite = useCallback(
    async (productId) => {
      if (!getToken()) return;
      setFavoriteIds((prev) => {
        const idNum = Number(productId);
        return prev.includes(idNum) ? prev.filter((id) => id !== idNum) : [...prev, idNum];
      });
      try {
        const res = await toggleFavorite(productId);
        const shouldBeFav = !!res?.favorited;
        const idNum = Number(productId);
        setFavoriteIds((prev) =>
          shouldBeFav ? (prev.includes(idNum) ? prev : [...prev, idNum]) : prev.filter((id) => id !== idNum)
        );
      } catch {
        // revert on failure
        setFavoriteIds((prev) => {
          const idNum = Number(productId);
          return prev.includes(idNum) ? prev.filter((id) => id !== idNum) : [...prev, idNum];
        });
      }
    },
    []
  );

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

  // Group services into two main marketplace columns: Services / Games
  const groupedServices = useMemo(() => {
    const groups = {
      Services: [],
      Games: [],
    };

    (services || []).forEach((svc) => {
      const slug = (svc.slug || svc.name || '').toLowerCase();
      const serviceSlugs = [
        'chatgpt',
        'discord',
        'instagram',
        'netflix',
        'spotify',
        'tiktok',
        'youtube',
        'canva',
        'figma',
        'adobe',
        'disney-plus',
        'primevideo',
      ];
      const gameSlugs = [
        'fortnite',
        'pubg',
        'playstation',
        'steam',
        'xbox',
        'roblox',
        'minecraft',
        'riotgames',
        'ubisoft',
        'nintendo',
      ];

      if (serviceSlugs.some((k) => slug.includes(k))) {
        groups.Services.push(svc);
      } else if (gameSlugs.some((k) => slug.includes(k))) {
        groups.Games.push(svc);
      }
    });

    return groups;
  }, [services]);

  return (
    <div className="min-h-screen bg-m4m-gray-50">
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-m4m-purple rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-10 w-96 h-64 bg-purple-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/80 mb-5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Trusted by 10,000+ gamers worldwide
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
              Discover the{' '}
              <span className="text-m4m-purple-light">favorite marketplace</span>
              {' '}for game services & products
            </h1>
            <p className="text-base md:text-lg text-gray-400 max-w-xl mb-8 mx-auto md:mx-0">
              With worldwide gamers enjoying game accounts, credits, and digital goods — all delivered safely and instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <a
                href="#marketplace"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors"
              >
                Browse Products
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <a
                href="#reviews"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
              >
                See Reviews
              </a>
            </div>
          </div>
          {/* Stats */}
          <div className="flex-shrink-0 grid grid-cols-2 gap-3">
            {[
              { label: 'Products', value: '500+' },
              { label: 'Sellers', value: '120+' },
              { label: 'Orders', value: '8K+' },
              { label: 'Happy Buyers', value: '5K+' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {[
              { icon: '🔒', title: 'Secure marketplace', desc: 'All transactions are encrypted & protected' },
              { icon: '✅', title: 'Verified sellers', desc: 'Sellers are reviewed and badge-approved' },
              { icon: '🛡️', title: 'Buyer protection', desc: 'Full refund if you don\'t receive your order' },
              { icon: '⚡', title: 'Instant delivery', desc: 'Many products delivered automatically' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 leading-tight hidden sm:block">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="marketplace" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Browse by service (grouped like modern marketplaces) */}
        {services.length > 0 && (
          <section className="mb-8 md:mb-10">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-m4m-black">Browse by service</h2>
              <p className="text-xs text-m4m-gray-500 hidden sm:block">
                Jump straight into your favorite platforms
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {Object.entries(groupedServices).map(([groupName, items]) => {
                if (!items || items.length === 0) return null;
                return (
                  <div key={groupName} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-m4m-gray-800 tracking-wide uppercase">
                        {groupName}
                      </h3>
                      <button
                        type="button"
                        className="text-[11px] font-medium text-m4m-purple hover:underline"
                      >
                        {groupName === 'Services' ? 'Show all services →' : 'Show all games →'}
                      </button>
                    </div>

                    {/* Mobile: horizontal scroll */}
                    <div className="md:hidden flex gap-3 overflow-x-auto pb-1">
                      {items.map((svc) => (
                        <Link key={svc.id} to={`/service/${svc.slug}`} className="min-w-[90px]">
                          <ServiceCard service={svc} />
                        </Link>
                      ))}
                    </div>

                    {/* Tablet / Desktop: compact 7-column grid */}
                    <div className="hidden md:grid grid-cols-7 gap-3">
                      {items.map((svc) => (
                        <Link key={svc.id} to={`/service/${svc.slug}`} className="flex justify-center">
                          <ServiceCard service={svc} />
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Flash Deals / Trending products */}
        {trending.length > 0 && (
          <section className="mb-6 md:mb-8">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-m4m-black">🔥 Flash Deals</h2>
              <p className="text-xs text-m4m-gray-500">
                Limited-time discounts on popular products
              </p>
            </div>
            <div className="rounded-2xl border border-m4m-gray-200 bg-white p-4 md:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {trending.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isFavorited={favoriteIds.includes(Number(product.id))}
                    onToggleFavorite={user ? () => handleToggleFavorite(product.id) : undefined}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Recently Viewed products */}
        {recentlyViewed.length > 0 && (
          <section className="mb-6 md:mb-8">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-m4m-black">Recently Viewed</h2>
              <p className="text-xs text-m4m-gray-500">
                Products you opened recently on M4M
              </p>
            </div>
            <div className="rounded-2xl border border-m4m-gray-200 bg-white p-4 md:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {recentlyViewed.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isFavorited={favoriteIds.includes(Number(product.id))}
                    onToggleFavorite={user ? () => handleToggleFavorite(product.id) : undefined}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

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
                  <ProductCard
                    key={product.id}
                    product={product}
                    isFavorited={favoriteIds.includes(Number(product.id))}
                    onToggleFavorite={user ? () => handleToggleFavorite(product.id) : undefined}
                  />
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

      {/* Community Reviews */}
      <section id="reviews" className="bg-white border-t border-gray-100 py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">What our community says</h2>
            <p className="mt-2 text-gray-500">Real reviews from real buyers around the world</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-6 flex flex-col gap-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className={`w-4 h-4 ${i < t.rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed flex-1">&ldquo;{t.comment}&rdquo;</p>
                <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                  <span className="w-9 h-9 rounded-full bg-m4m-purple text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {t.avatar}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{t.flag} {t.name}</p>
                    <p className="text-xs text-gray-400">{t.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
