import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { Lock, BadgeCheck, ShieldCheck, Zap, Flame, Star, Grid2X2, History, Share2 } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ServiceCard from '../components/ServiceCard';
import FAQSection from '../components/FAQSection';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getProducts,
  getProduct,
  getTrendingProducts,
  getServices,
  getCategories,
  getMarketplaceStats,
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

const SORT_OPTIONS_KEYS = [
  { value: 'best_selling', labelKey: 'home.sort_best_selling' },
  { value: 'newest', labelKey: 'home.sort_newest' },
  { value: 'lowest_price', labelKey: 'home.sort_lowest_price' },
  { value: 'highest_price', labelKey: 'home.sort_highest_price' },
  { value: 'highest_rating', labelKey: 'home.sort_highest_rating' },
];
const RATING_OPTIONS_KEYS = [
  { value: '', labelKey: 'home.any_rating' },
  { value: '3', labelKey: 'home.rating_3' },
  { value: '4', labelKey: 'home.rating_4' },
  { value: '5', labelKey: 'home.rating_5' },
];
const PRICE_PRESETS_KEYS = [
  { min: '', max: '', labelKey: 'home.any_price' },
  { min: '0', max: '25', labelKey: 'home.under_25' },
  { min: '25', max: '50', labelKey: 'home.price_25_50' },
  { min: '50', max: '100', labelKey: 'home.price_50_100' },
  { min: '100', max: '', labelKey: 'home.price_100_plus' },
];

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = searchParams.get('search') ?? '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [trending, setTrending] = useState([]);
  const [services, setServices] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [recentlyViewedLoading, setRecentlyViewedLoading] = useState(false);
  const [search, setSearch] = useState(searchFromUrl);
  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const [paginationMeta, setPaginationMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalProducts, setTotalProducts] = useState(null);
  const [marketplaceStats, setMarketplaceStats] = useState(null);

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

  const isMarketplaceOnly = useLocation().pathname === '/marketplace';

  // Load trending and best-selling products (homepage only)
  useEffect(() => {
    if (isMarketplaceOnly) return;
    let cancelled = false;
    setTrendingLoading(true);
    (async () => {
      try {
        const trendingData = await getTrendingProducts({ limit: 8 });
        const norm = (p) => ({ ...p, is_online: p.is_online ?? p.isOnline ?? true });
        if (!cancelled && Array.isArray(trendingData)) {
          setTrending(trendingData.map(norm));
        }
      } catch {
        if (!cancelled) {
          setTrending([]);
        }
      } finally {
        if (!cancelled) setTrendingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isMarketplaceOnly]);

  // Load services for homepage "Browse by service" (homepage only)
  useEffect(() => {
    if (isMarketplaceOnly) return;
    let cancelled = false;
    getServices()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setServices(data);
        else if (!cancelled && data?.data) setServices(data.data);
      })
      .catch(() => { if (!cancelled) setServices([]); });
    return () => { cancelled = true; };
  }, [isMarketplaceOnly]);

  // Load recently viewed products (homepage only)
  useEffect(() => {
    if (isMarketplaceOnly) return;
    let cancelled = false;
    (async () => {
      try {
        setRecentlyViewedLoading(true);
        const STORAGE_KEY = 'recently_viewed_products';
        const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (!raw) {
          if (!cancelled) {
            setRecentlyViewed([]);
            setRecentlyViewedLoading(false);
          }
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }
        const items = Array.isArray(parsed) ? parsed : [];

        const THREE_DAYS_MS = 72 * 60 * 60 * 1000;
        const now = Date.now();

        // One-time cleanup on initial read:
        // Convert ids-only legacy entries into objects, then drop expired ones.
        const cleanedEntries = [];
        const seen = new Set();
        for (const item of items) {
          let id;
          let viewedAt;
          if (item && typeof item === 'object') {
            id = Number(item.id);
            viewedAt = Number(item.viewedAt);
          } else {
            id = Number(item);
            viewedAt = NaN;
          }

          if (!Number.isFinite(id) || seen.has(id)) continue;
          // Missing/invalid viewedAt for legacy data => treat as "now" to avoid surprising expiry.
          const ts = Number.isFinite(viewedAt) ? viewedAt : now;
          if (now - ts >= THREE_DAYS_MS) continue;

          seen.add(id);
          cleanedEntries.push({ id, viewedAt: ts });
        }

        const ids = cleanedEntries.map((e) => e.id);

        if (!ids.length) {
          if (!cancelled) {
            setRecentlyViewed([]);
            setRecentlyViewedLoading(false);
          }
          return;
        }

        // Persist the cleaned list so we don't reprocess expired items later.
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedEntries));

        const normalizedIds = [];
        // (cleanedEntries already dedupes + maintains order)
        normalizedIds.push(...ids);

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
      } finally {
        if (!cancelled) setRecentlyViewedLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isMarketplaceOnly]);

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

  const handleClearRecentlyViewed = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!window.confirm('Clear all recently viewed items?')) return;
    try {
      const STORAGE_KEY = 'recently_viewed_products';
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore (e.g. private mode / storage errors)
    }
    setRecentlyViewed([]);
    setRecentlyViewedLoading(false);
  }, []);

  const sliderRef = useRef(null);
  const scrollRecentlyViewed = (direction) => {
    const el = sliderRef.current;
    if (!el) return;
    const amount = 240;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

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
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') ?? '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'best_selling');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(false);

  // Pagination: page from URL
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1));

  // Sync filter state and page from URL
  useEffect(() => {
    setPriceMin(searchParams.get('min_price') ?? '');
    setPriceMax(searchParams.get('max_price') ?? '');
    setMinRating(searchParams.get('rating') ?? '');
    setSellerId(searchParams.get('seller_id') ?? '');
    setCategoryId(searchParams.get('category_id') ?? '');
    setSort(searchParams.get('sort') || 'best_selling');
    setPage(Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1));
  }, [searchParams]);

  // Load categories and marketplace stats (marketplace page only)
  useEffect(() => {
    if (!isMarketplaceOnly) return;
    let cancelled = false;
    getCategories()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data?.categories ?? data?.data ?? []);
        setCategories(list);
        setTotalProducts(typeof data?.total_products === 'number' ? data.total_products : null);
      })
      .catch(() => { if (!cancelled) { setCategories([]); setTotalProducts(null); } });
    getMarketplaceStats()
      .then((data) => { if (!cancelled && data) setMarketplaceStats(data); })
      .catch(() => { if (!cancelled) setMarketplaceStats(null); });
    return () => { cancelled = true; };
  }, [isMarketplaceOnly]);

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
          ...(categoryId && { category_id: categoryId }),
          ...(sort && { sort }),
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
  }, [search, sellerId, categoryId, sort, page, retryTrigger]);

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

  const handleSortChange = (v) => {
    setSort(v);
    setPage(1);
    updateUrl({ sort: v === 'best_selling' ? undefined : v, page: undefined });
  };

  const clearFilters = () => {
    setPriceMin('');
    setPriceMax('');
    setMinRating('');
    setSellerId('');
    setCategoryId('');
    setSort('best_selling');
    setSearchInput('');
    setSearch('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasActiveFilters = priceMin || priceMax || minRating || sellerId || categoryId || searchInput.trim();

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

  // Pagination page numbers (show max 7: first, ..., window, ..., last)
  const paginationPages = useMemo(() => {
    if (lastPage <= 1) return [];
    const pages = [];
    const windowSize = 5;
    let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    let end = Math.min(lastPage, start + windowSize - 1);
    if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, lastPage]);

  const handleCategoryChange = (id) => {
    setCategoryId(id);
    setPage(1);
    updateUrl({ category_id: id || undefined, page: undefined });
  };

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

  const marketplaceCatalog = (
    <>
      <section className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 mb-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-m4m-black">M4M Marketplace</h1>
            <p className="text-sm text-m4m-gray-500 mt-0.5">Browse and filter digital products</p>
          </div>
          {isMarketplaceOnly && marketplaceStats && (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-m4m-purple/10 text-m4m-purple text-sm font-medium">
                {marketplaceStats.total_products?.toLocaleString() ?? 0} {t('home.stats_products')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-m4m-purple/10 text-m4m-purple text-sm font-medium">
                {marketplaceStats.total_sellers?.toLocaleString() ?? 0} {t('home.stats_sellers')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-sm font-medium">
                <Star className="w-4 h-4 text-amber-500" />
                {marketplaceStats.average_rating ?? '—'} {t('home.rating')}
              </span>
            </div>
          )}
        </div>
        {isMarketplaceOnly && categories.length > 0 && (
          <>
            {/* Mobile: horizontal scroll categories, hide zero-product categories */}
            <div className="mb-3 -mx-4 px-4 overflow-x-auto md:hidden">
              <div className="flex items-center gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => handleCategoryChange('')}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${
                    !categoryId
                      ? 'bg-m4m-purple text-white border-m4m-purple'
                      : 'bg-white text-m4m-gray-700 border-m4m-gray-200'
                  }`}
                >
                  All{totalProducts != null ? ` (${totalProducts})` : ''}
                </button>
                {categories
                  .filter((cat) => (cat.products_count ?? 0) > 0)
                  .map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryChange(String(cat.id))}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${
                        categoryId === String(cat.id)
                          ? 'bg-m4m-purple text-white border-m4m-purple'
                          : 'bg-white text-m4m-gray-700 border-m4m-gray-200'
                      }`}
                    >
                      {cat.name}
                      {cat.products_count != null && (
                        <span className="ml-1 opacity-70">({cat.products_count})</span>
                      )}
                    </button>
                  ))}
              </div>
            </div>

            {/* Desktop: existing pill categories */}
            <div className="hidden md:flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleCategoryChange('')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  !categoryId
                    ? 'bg-m4m-purple text-white'
                    : 'bg-m4m-gray-100 text-m4m-gray-700 hover:bg-m4m-gray-200'
                }`}
              >
                All{totalProducts != null ? ` (${totalProducts})` : ''}
              </button>
              {categories
                .filter((cat) => (cat.products_count ?? 0) > 0)
                .map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(String(cat.id))}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      categoryId === String(cat.id)
                        ? 'bg-m4m-purple text-white'
                        : 'bg-m4m-gray-100 text-m4m-gray-700 hover:bg-m4m-gray-200'
                    }`}
                  >
                    {cat.icon && <span className="mr-1.5">{cat.icon}</span>}
                    {cat.name}
                    {cat.products_count != null && (
                      <span className="ml-1.5 opacity-80">({cat.products_count})</span>
                    )}
                  </button>
                ))}
            </div>
          </>
        )}
        <div className="rounded-2xl border border-m4m-gray-200 bg-white shadow-sm overflow-hidden hidden md:block">
          <div className="p-4 md:p-5 space-y-4 md:space-y-0 md:flex md:flex-wrap md:items-end md:gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0 md:min-w-[280px] md:max-w-md">
              <label htmlFor="marketplace-search" className="block text-xs font-medium text-m4m-gray-500 mb-1.5">{t('home.search')}</label>
              <div className="relative">
                <input
                  id="marketplace-search"
                  type="search"
                  placeholder={t('home.search_placeholder')}
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-m4m-gray-200 bg-m4m-gray-50/50 text-m4m-black placeholder-m4m-gray-400 focus:ring-2 focus:ring-m4m-purple focus:border-transparent focus:bg-white outline-none transition-colors"
                  aria-label={t('home.search_placeholder')}
                />
                <button type="submit" aria-label={t('home.search')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-m4m-gray-400 hover:text-m4m-purple hover:bg-m4m-gray-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
              </div>
            </form>
            <div className="w-full sm:w-auto min-w-0">
              <label htmlFor="filter-seller" className="block text-xs font-medium text-m4m-gray-500 mb-1.5">{t('home.seller')}</label>
              <select id="filter-seller" value={sellerId} onChange={(e) => handleSellerChange(e.target.value)} className="w-full sm:w-[180px] px-3 py-2.5 rounded-xl border border-m4m-gray-200 bg-m4m-gray-50/50 text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple focus:border-transparent focus:bg-white outline-none transition-colors">
                <option value="">{t('home.all_sellers')}</option>
                {uniqueSellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="w-full sm:w-auto">
              <span className="block text-xs font-medium text-m4m-gray-500 mb-1.5">{t('home.price_range')}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <input type="number" min="0" step="0.01" placeholder={t('home.min')} value={priceMin} onChange={(e) => handlePriceMinChange(e.target.value)} className="w-20 px-2.5 py-2 rounded-lg border border-m4m-gray-200 bg-m4m-gray-50/50 text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple focus:bg-white outline-none" />
                  <span className="text-m4m-gray-400 font-medium">–</span>
                  <input type="number" min="0" step="0.01" placeholder={t('home.max')} value={priceMax} onChange={(e) => handlePriceMaxChange(e.target.value)} className="w-20 px-2.5 py-2 rounded-lg border border-m4m-gray-200 bg-m4m-gray-50/50 text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple focus:bg-white outline-none" />
                </div>
                {PRICE_PRESETS_KEYS.slice(1).map((preset) => (
                  <button key={t(preset.labelKey)} type="button" onClick={() => handlePricePreset(preset)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${priceMin === preset.min && priceMax === preset.max ? 'bg-m4m-purple text-white' : 'bg-m4m-gray-100 text-m4m-gray-700 hover:bg-m4m-gray-200'}`}>{t(preset.labelKey)}</button>
                ))}
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <label htmlFor="filter-rating" className="block text-xs font-medium text-m4m-gray-500 mb-1.5">{t('home.rating')}</label>
              <select id="filter-rating" value={minRating} onChange={(e) => handleRatingChange(e.target.value)} className="w-full sm:w-[130px] px-3 py-2.5 rounded-xl border border-m4m-gray-200 bg-m4m-gray-50/50 text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple focus:border-transparent focus:bg-white outline-none transition-colors">
                {RATING_OPTIONS_KEYS.map((opt) => <option key={opt.value || 'any'} value={opt.value}>{t(opt.labelKey)}</option>)}
              </select>
            </div>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="px-3 py-2 rounded-xl text-sm font-medium text-m4m-purple hover:bg-m4m-purple/10 transition-colors border border-m4m-purple/30">{t('home.clear_all')}</button>
            )}
          </div>
        </div>
      </section>
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sticky top-14 z-40 bg-white px-4 py-2 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-m4m-black">
            {t('home.stats_products')}
            {!loading && (
              <span className="ml-2 text-m4m-gray-500 font-normal">
                {total > 0 ? `${from}–${to} of ${total}` : '(0)'}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <label
              htmlFor="filter-sort"
              className="hidden sm:inline-block text-sm font-medium text-m4m-gray-600 whitespace-nowrap"
            >
              Sort by:
            </label>
            <select
              id="filter-sort"
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-3 py-2 rounded-xl border border-m4m-gray-200 bg-white text-m4m-black text-sm font-medium focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none transition-colors"
            >
              {SORT_OPTIONS_KEYS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
            {/* Mobile Filter button opens slide-in drawer */}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-m4m-gray-200 bg-white text-sm font-medium text-m4m-gray-700 hover:bg-m4m-gray-50 md:hidden"
            >
              Filter
            </button>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="rounded-xl border border-m4m-gray-200 bg-white aspect-[3/4] animate-pulse shadow-sm" aria-hidden />)}
          </div>
        ) : fetchError ? (
          <div className="rounded-2xl border border-m4m-gray-200 bg-white py-16 px-6 text-center shadow-sm">
            <p className="text-m4m-gray-600 font-medium">{t('home.something_went_wrong')}</p>
            <p className="text-sm text-m4m-gray-500 mt-1">{t('home.load_products_error')}</p>
            <button type="button" onClick={() => setRetryTrigger((r) => r + 1)} className="mt-4 px-5 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-light transition-colors">{t('home.try_again')}</button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-m4m-gray-200 bg-white py-16 text-center shadow-sm">
            <p className="text-m4m-gray-500">{t('home.no_products_match')}</p>
            <button type="button" onClick={clearFilters} className="mt-4 text-m4m-purple font-medium hover:underline">{t('home.clear_filters')}</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
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
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={!canPrev}
                  className="px-4 py-2.5 rounded-xl font-medium border border-m4m-gray-200 bg-white text-m4m-gray-700 hover:bg-m4m-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {paginationPages.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => goToPage(p)}
                      className={`min-w-[2.5rem] px-2 py-2 rounded-xl font-medium border transition-colors ${
                        p === currentPage
                          ? 'bg-m4m-purple text-white border-m4m-purple'
                          : 'border-m4m-gray-200 bg-white text-m4m-gray-700 hover:bg-m4m-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={!canNext}
                  className="px-4 py-2.5 rounded-xl font-medium border border-m4m-gray-200 bg-white text-m4m-gray-700 hover:bg-m4m-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
                <span className="text-sm text-m4m-gray-500 order-last w-full sm:w-auto text-center sm:text-left">
                  Page {currentPage} of {lastPage}
                </span>
              </div>
            )}
          </>
        )}

        {/* Mobile filter drawer */}
        {isMarketplaceOnly && (
          <div
            className={`fixed inset-0 z-40 md:hidden transition-opacity ${
              mobileFiltersOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Backdrop */}
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileFiltersOpen(false)}
              aria-label={t('home.clear_filters')}
            />
            {/* Drawer */}
            <div
              className={`absolute inset-y-0 right-0 w-full max-w-xs bg-white shadow-xl transform transition-transform ${
                mobileFiltersOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-m4m-gray-200">
                <h3 className="text-sm font-semibold text-m4m-black">{t('home.filters')}</h3>
                <button
                  type="button"
                  className="text-sm text-m4m-gray-500"
                  onClick={() => setMobileFiltersOpen(false)}
                >
                  {t('common.close')}
                </button>
              </div>
              <div className="p-4 space-y-4 text-sm">
                {/* Seller filter */}
                <div>
                  <label
                    htmlFor="mobile-filter-seller"
                    className="block text-xs font-medium text-m4m-gray-500 mb-1.5"
                  >
                    {t('home.seller')}
                  </label>
                  <select
                    id="mobile-filter-seller"
                    value={sellerId}
                    onChange={(e) => handleSellerChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-m4m-gray-200 bg-m4m-gray-50/50 text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple focus:border-transparent focus:bg-white outline-none transition-colors"
                  >
                    <option value="">{t('home.all_sellers')}</option>
                    {uniqueSellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price range */}
                <div>
                  <span className="block text-xs font-medium text-m4m-gray-500 mb-1.5">
                    {t('home.price_range')}
                  </span>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t('home.min')}
                      value={priceMin}
                      onChange={(e) => handlePriceMinChange(e.target.value)}
                      className="w-20 px-2.5 py-2 rounded-lg border border-m4m-gray-200 bg-m4m-gray-50/50 text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple focus:bg-white outline-none"
                    />
                    <span className="text-m4m-gray-400 font-medium">–</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t('home.max')}
                      value={priceMax}
                      onChange={(e) => handlePriceMaxChange(e.target.value)}
                      className="w-20 px-2.5 py-2 rounded-lg border border-m4m-gray-200 bg-m4m-gray-50/50 text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple focus:bg-white outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRICE_PRESETS_KEYS.slice(1).map((preset) => (
                      <button
                        key={t(preset.labelKey)}
                        type="button"
                        onClick={() => handlePricePreset(preset)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          priceMin === preset.min && priceMax === preset.max
                            ? 'bg-m4m-purple text-white'
                            : 'bg-m4m-gray-100 text-m4m-gray-700 hover:bg-m4m-gray-200'
                        }`}
                      >
                        {t(preset.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label
                    htmlFor="mobile-filter-rating"
                    className="block text-xs font-medium text-m4m-gray-500 mb-1.5"
                  >
                    {t('home.rating')}
                  </label>
                  <select
                    id="mobile-filter-rating"
                    value={minRating}
                    onChange={(e) => handleRatingChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-m4m-gray-200 bg-m4m-gray-50/50 text-m4m-black text-sm focus:ring-2 focus:ring-m4m-purple focus:border-transparent focus:bg-white outline-none transition-colors"
                  >
                    {RATING_OPTIONS_KEYS.map((opt) => (
                      <option key={opt.value || 'any'} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full px-3 py-2 rounded-xl text-sm font-medium text-m4m-purple hover:bg-m4m-purple/10 transition-colors border border-m4m-purple/30"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="border-t border-m4m-gray-200 p-4">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full px-4 py-2.5 rounded-xl bg-m4m-purple text-white text-sm font-semibold hover:bg-m4m-purple-dark transition-colors"
                >
                  Apply filters
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );

  return (
    <div className="min-h-screen bg-m4m-gray-50">
      {isMarketplaceOnly ? (
        <div id="marketplace" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {marketplaceCatalog}
          <FAQSection />
        </div>
      ) : (
      <>
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-m4m-purple rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-10 w-96 h-64 bg-purple-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-20 flex flex-col md:flex-row items-center md:items-start justify-center md:justify-between gap-10">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/80 mb-5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Trusted by 10,000+ gamers worldwide
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
              {t("home.hero_title")}
            </h1>
            <p className="text-base md:text-lg text-gray-300 max-w-xl mb-8 mx-auto md:mx-0 leading-relaxed">
              {t("home.hero_subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link
                to="/marketplace"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors"
              >
                {t("home.browse_products")}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                to="/help/how-to-sell"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
              >
                {t("home.become_seller")}
              </Link>
            </div>
            <p className="mt-6 text-sm text-gray-400">
              <span className="inline-flex items-center gap-1 text-amber-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 .587l3.668 7.568L24 9.423l-6 5.847L19.335 24 12 19.897 4.665 24 6 15.27 0 9.423l8.332-1.268z" />
                </svg>
                4.8 average seller rating
              </span>
              <br />
              <span className="text-gray-500">{t("home.trusted_gamers")}</span>
            </p>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 md:gap-6 mt-4">
              {['steam', 'discord', 'netflix', 'spotify', 'fortnite', 'playstation', 'xbox', 'nintendo'].map((slug) => (
                <img
                  key={slug}
                  src={`/services/${slug}.svg`}
                  alt=""
                  className="h-5 sm:h-6 object-contain opacity-70 hover:opacity-100 transition brightness-0 invert"
                />
              ))}
            </div>
          </div>
          {/* Stats */}
          <div className="flex-shrink-0 grid grid-cols-2 gap-3">
            {[
              { labelKey: 'home.stats_products', value: '500+' },
              { labelKey: 'home.stats_sellers', value: '120+' },
              { labelKey: 'home.stats_orders', value: '8K+' },
              { labelKey: 'home.stats_buyers', value: '5K+' },
            ].map(({ labelKey, value }) => (
              <div key={labelKey} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-gray-400 mt-1">{t(labelKey)}</p>
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
              { icon: Lock, titleKey: 'home.trust_secure_marketplace', descKey: 'home.trust_secure_desc' },
              { icon: BadgeCheck, titleKey: 'home.trust_verified_sellers', descKey: 'home.trust_verified_desc' },
              { icon: ShieldCheck, titleKey: 'home.trust_buyer_protection', descKey: 'home.trust_buyer_desc' },
              { icon: Zap, titleKey: 'home.trust_instant_delivery', descKey: 'home.trust_instant_desc' },
            ].map(({ icon: Icon, titleKey, descKey }) => (
              <div key={titleKey} className="p-4 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow flex flex-col gap-2 min-w-0">
                <Icon className="w-6 h-6 text-m4m-purple flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{t(titleKey)}</p>
                  <p className="text-xs text-gray-500 leading-tight hidden sm:block">{t(descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="marketplace" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
       

        {/* Categories / services - homepage only */}
        {!isMarketplaceOnly && services.length > 0 && (
          <section className="mb-6 md:mb-8">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Grid2X2 className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-semibold text-gray-900">{t('home.categories')}</h2>
                </div>
                <div className="h-[2px] w-10 bg-purple-500 rounded mb-4"></div>
                <p className="text-sm text-m4m-gray-500">
                  {t('home.browse_filter')}
                </p>
              </div>
              <Link
                to="/marketplace"
                className="text-sm font-medium text-m4m-purple hover:underline"
              >
                {t('common.see_all')}
              </Link>
            </div>

            {/* Mobile: compact 4-column grid */}
            <div className="grid grid-cols-4 gap-3 sm:hidden">
              {(services || []).slice(0, 8).map((svc) => (
                <Link key={svc.id} to={`/service/${svc.slug}`} className="flex justify-center">
                  <ServiceCard service={svc} />
                </Link>
              ))}
            </div>

            {/* Tablet / desktop: keep grouped layout */}
            <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                        {groupName === 'Services' ? t('home.show_all_services') : t('home.show_all_games')}
                      </button>
                    </div>
                    <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
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

        {/* Recently Viewed - homepage only */}
        {!isMarketplaceOnly && (recentlyViewedLoading || recentlyViewed.length > 0) && (
          <section className="mb-6 md:mb-8">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-semibold text-gray-900">{t('home.recently_viewed')}</h2>
                </div>
                <div className="h-[2px] w-10 bg-purple-500 rounded mb-4"></div>
                <p className="text-sm text-m4m-gray-500">
                  {t('home.browse_filter')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/recently-viewed"
                  className="text-sm font-medium text-m4m-purple hover:underline"
                >
                  {t('common.see_all')}
                </Link>
                <button
                  type="button"
                  onClick={handleClearRecentlyViewed}
                  className="text-xs text-gray-500 hover:text-m4m-purple transition"
                >
                  Clear all
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="relative">
                <div
                  className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-white to-transparent z-10"
                />
                <button
                  type="button"
                  onClick={() => scrollRecentlyViewed('left')}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-20 bg-white shadow-md rounded-full w-8 h-8 flex items-center justify-center"
                  aria-label="Scroll recently viewed left"
                >
                  ←
                </button>
                <div
                  className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent z-10"
                />
                <button
                  type="button"
                  onClick={() => scrollRecentlyViewed('right')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-20 bg-white shadow-md rounded-full w-8 h-8 flex items-center justify-center"
                  aria-label="Scroll recently viewed right"
                >
                  →
                </button>
                <div
                  ref={sliderRef}
                  className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4"
                >
                  {recentlyViewedLoading
                    ? [1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="snap-start flex-shrink-0 w-[180px] sm:w-[220px] md:w-[240px] lg:w-[260px] h-full min-h-[320px] rounded-xl border border-m4m-gray-200 bg-m4m-gray-50 animate-pulse"
                        />
                      ))
                    : recentlyViewed.map((product) => (
                        <div
                          key={product.id}
                          className="snap-start flex-shrink-0 w-[180px] sm:w-[220px] md:w-[240px] lg:w-[260px]"
                        >
                          <ProductCard
                            product={product}
                            isFavorited={favoriteIds.includes(Number(product.id))}
                            onToggleFavorite={user ? () => handleToggleFavorite(product.id) : undefined}
                          />
                        </div>
                      ))}
                </div>
              </div>
            </div>
          </section>
        )}

 {/* Affiliate promotion - homepage only */}
 {!isMarketplaceOnly && (
          <section className="mb-6 md:mb-8">
            <Link
              to="/affiliate/dashboard"
              className="block rounded-xl shadow-lg overflow-hidden bg-gradient-to-br from-purple-950 via-m4m-purple to-blue-950 hover:shadow-xl transition-shadow focus:outline-none focus:ring-2 focus:ring-m4m-purple focus:ring-offset-2"
            >
              <div className="relative px-4 sm:px-6 md:px-8 py-6 sm:py-8 text-center">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-2xl" />
                </div>
                <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                  <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Share2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
                      {t('home.affiliate_title')}
                    </h2>
                    <p className="text-sm sm:text-base text-white/90">
                      {t('home.affiliate_subtitle')}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-white text-m4m-purple hover:bg-white/95 transition-colors">
                    {t('home.affiliate_cta')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Flash Deals - homepage only */}
        {!isMarketplaceOnly && (trendingLoading || trending.length > 0) && (
          <section className="mb-6 md:mb-8">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t('home.flash_deals_title')}
                  </h2>
                </div>
                <div className="h-[2px] w-10 bg-purple-500 rounded mb-4"></div>
                <p className="text-sm text-m4m-gray-500">
                  {t('home.flash_deals_subtitle')}
                </p>
              </div>
              <Link
                to="/marketplace?sort=trending"
                className="text-sm font-medium text-m4m-purple hover:underline"
              >
                {t('common.see_all')}
              </Link>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {trendingLoading
                  ? [1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-full min-h-[320px] rounded-xl border border-m4m-gray-200 bg-m4m-gray-50 animate-pulse"
                      />
                    ))
                  : trending.map((product) => (
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

        <FAQSection />
      </div>
    </>
    )}
    </div>
  );
}
