import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getFavorites, removeFavorite, paginatedItems } from '../services/api';
import ProductCard from '../components/ProductCard';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFavorites({ per_page: 48 });
      const items = paginatedItems(data) ?? [];
      // Each item has a `product` nested object
      setFavorites(items);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemove = async (productId) => {
    setRemoving(productId);
    try {
      await removeFavorite(productId);
      setFavorites((prev) => prev.filter((f) => f.product_id !== productId));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
          <p className="text-sm text-gray-500">Products you saved for later</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-6 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-pink-50 flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-pink-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No favorites yet</h2>
          <p className="text-gray-500 mb-6">Browse products and click the heart icon to save them here.</p>
          <Link
            to="/"
            className="px-6 py-2.5 rounded-xl bg-m4m-purple text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            Browse Marketplace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {favorites.map((fav) => {
            const product = fav.product;
            if (!product) return null;
            return (
              <div key={fav.id} className="relative group">
                <ProductCard
                  product={product}
                  isFavorited
                  onToggleFavorite={() => handleRemove(product.id)}
                />
                <button
                  onClick={() => handleRemove(product.id)}
                  disabled={removing === product.id}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-pink-500 hover:bg-pink-50 hover:text-pink-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove from favorites"
                >
                  {removing === product.id ? (
                    <span className="w-3 h-3 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
