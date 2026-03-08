import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { isSellerOnline } from '../lib/sellerOnline';
import { getProducts, paginatedItems } from '../services/api';

export default function SellerProfilePage() {
  const { id } = useParams();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const result = await getProducts({ seller_id: id, per_page: 100 });
        const list = paginatedItems(result);
        const arr = Array.isArray(list) ? list : [];
        if (!cancelled) {
          setProducts(arr);
          setSeller(arr[0]?.seller ?? { id: Number(id), name: 'Seller' });
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setSeller({ id: Number(id), name: 'Seller' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [id]);

  const sellerRating = useMemo(() => {
    if (seller?.rating != null) {
      const r = Number(seller.rating);
      return Number.isNaN(r) ? null : r;
    }
    const withRating = products.filter((p) => p.rating != null && !Number.isNaN(Number(p.rating)));
    if (withRating.length === 0) return null;
    const sum = withRating.reduce((s, p) => s + Number(p.rating), 0);
    return sum / withRating.length;
  }, [seller?.rating, products]);

  if (loading && !seller) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-m4m-gray-500">
        Loading seller…
      </div>
    );
  }

  const online = isSellerOnline(seller);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl border border-m4m-gray-200 shadow-sm p-6 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-m4m-purple text-white flex items-center justify-center text-2xl font-bold shrink-0">
            {seller?.name?.charAt(0)?.toUpperCase() || 'S'}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-m4m-black">{seller?.name || 'Seller'}</h1>
            <p className="text-m4m-gray-500 mt-0.5">Seller profile</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap" aria-label={`Rating: ${sellerRating != null ? sellerRating.toFixed(1) : 'No rating'} out of 5`}>
              <span className="text-amber-500" aria-hidden>★</span>
              <span className="text-sm font-semibold text-m4m-gray-700">
                {sellerRating != null ? sellerRating.toFixed(1) : '—'}
              </span>
              <span className="text-sm text-m4m-gray-500">rating</span>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ml-auto shrink-0 ${
              online ? 'bg-green-100 text-green-800' : 'bg-m4m-gray-100 text-m4m-gray-600'
            }`}
            title={online ? 'Seller is online' : 'Seller is offline'}
          >
            <span
              className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-m4m-gray-400'}`}
              aria-hidden
            />
            {online ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-m4m-black mb-4">Products</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-m4m-gray-200 bg-m4m-gray-50 aspect-[3/4] animate-pulse" aria-hidden />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-m4m-gray-200 bg-white p-12 text-center">
            <p className="text-m4m-gray-500">No products listed yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={{ ...p, seller, rating: p.rating ?? sellerRating }} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
