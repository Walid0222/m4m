import { useState, useEffect, useCallback } from 'react';
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
        const ids = Array.isArray(parsed) ? parsed : [];
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
          if (!cancelled) setProducts([]);
          return;
        }
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
        <Link
          to="/marketplace"
          className="text-sm font-medium text-m4m-purple hover:underline"
        >
          Browse marketplace
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-[340px] rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isFavorited={favoriteIds.includes(Number(product.id))}
              onToggleFavorite={user ? () => handleToggleFavorite(product.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
