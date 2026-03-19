import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { getProduct, getFavoriteIds, toggleFavorite, getToken } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'recently_viewed_products';

export default function RecentlyViewedPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState([]);

  useEffect(() => {
    if (!getToken() || !user) {
      setFavoriteIds([]);
      return;
    }
    let cancelled = false;
    getFavoriteIds()
      .then((ids) => {
        if (!cancelled && Array.isArray(ids)) setFavoriteIds(ids.map((v) => Number(v)));
      })
      .catch(() => { if (!cancelled) setFavoriteIds([]); });
    return () => { cancelled = true; };
  }, [user]);

  const handleToggleFavorite = useCallback(async (productId) => {
    if (!getToken()) return;
    setFavoriteIds((prev) => {
      if (prev.includes(Number(productId))) return prev.filter((id) => id !== Number(productId));
      return [...prev, Number(productId)];
    });
    try {
      await toggleFavorite(productId);
    } catch {
      setFavoriteIds((prev) => prev.filter((id) => id !== Number(productId)));
    }
  }, []);

  const handleClearRecentlyViewed = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!window.confirm('Clear all recently viewed items?')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore (e.g. private mode / storage errors)
    }
    setProducts([]);
    setLoading(false);
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

  useEffect(() => {
    if (loading || products.length === 0) return;
    const el = sliderRef.current;
    if (!el) return;

    let intervalId;
    const amount = 240;

    const tick = () => {
      el.scrollBy({ left: amount, behavior: 'smooth' });
    };

    const stop = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = undefined;
    };
    const start = () => {
      stop();
      intervalId = setInterval(tick, 3000);
    };

    const onMouseEnter = () => stop();
    const onMouseLeave = () => start();

    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);
    start();

    return () => {
      stop();
      el.removeEventListener('mouseenter', onMouseEnter);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [loading, products.length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (!raw) {
          if (!cancelled) setProducts([]);
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

        // One-time cleanup on initial read.
        // Supports legacy ids-only format and the new { id, viewedAt } format.
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

        const normalizedIds = cleanedEntries.map((e) => e.id);

        if (!normalizedIds.length) {
          if (!cancelled) setProducts([]);
          return;
        }

        // Persist the cleaned list.
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedEntries));

        const results = await Promise.all(
          normalizedIds.map((id) => getProduct(id, { record_view: 0 }).catch(() => null))
        );
        if (cancelled) return;
        const list = results
          .filter(Boolean)
          .map((p, index) => ({ ...p, _recentIndex: index }))
          .sort((a, b) => a._recentIndex - b._recentIndex)
          .map((p) => ({ ...p, is_online: p.is_online ?? p.isOnline ?? true }));
        setProducts(list);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <div className="flex items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Recently Viewed</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Products you opened recently on M4M
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/marketplace"
            className="text-sm font-medium text-m4m-purple hover:underline"
          >
            Browse marketplace
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

      {products.length === 0 && !loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-gray-500">No recently viewed products.</p>
          <Link
            to="/marketplace"
            className="inline-block mt-4 text-m4m-purple font-medium hover:underline"
          >
            Browse marketplace
          </Link>
        </div>
      ) : (
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
            ref={sliderRef}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4"
          >
            {loading
              ? [...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="snap-start flex-shrink-0 w-[180px] sm:w-[220px] md:w-[240px] lg:w-[260px] h-full min-h-[320px] rounded-xl border border-m4m-gray-200 bg-m4m-gray-50 animate-pulse"
                  />
                ))
              : products.map((product) => (
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
        </div>
      )}
    </div>
  );
}
