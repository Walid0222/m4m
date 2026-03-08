import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { isSellerOnline } from '../lib/sellerOnline';
import { getProducts, getSellerProfile, paginatedItems } from '../services/api';

function StatBadge({ label, value }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-bold text-m4m-black">{value}</span>
      <span className="text-xs text-m4m-gray-500">{label}</span>
    </div>
  );
}

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
        const [profileRes, productsRes] = await Promise.all([
          getSellerProfile(id).catch(() => null),
          getProducts({ seller_id: id, per_page: 100 }),
        ]);
        if (cancelled) return;
        const list = paginatedItems(productsRes);
        const arr = Array.isArray(list) ? list : [];
        setProducts(arr);
        if (profileRes) {
          setSeller({
            id: profileRes.id,
            name: profileRes.name,
            last_activity_at: profileRes.last_activity_at,
            rating: profileRes.rating,
            total_sales: profileRes.total_sales ?? 0,
            total_reviews: profileRes.total_reviews ?? 0,
          });
        } else {
          setSeller(arr[0]?.seller ?? { id: Number(id), name: 'Seller', last_activity_at: null });
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

  if (loading && !seller) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="w-8 h-8 border-2 border-m4m-purple border-t-transparent rounded-full animate-spin" aria-hidden />
        </div>
      </div>
    );
  }

  const online = isSellerOnline(seller);
  const sellerRating = seller?.rating != null ? Number(seller.rating) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Seller profile card */}
      <div className="rounded-2xl border border-m4m-gray-200 bg-white shadow-sm overflow-hidden mb-8">
        <div className="p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-m4m-purple text-white flex items-center justify-center text-2xl md:text-3xl font-bold shrink-0">
                {seller?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-m4m-black">{seller?.name || 'Seller'}</h1>
                <p className="text-m4m-gray-500 mt-0.5">Seller profile</p>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
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
                  {sellerRating != null && (
                    <span
                      className="inline-flex items-center gap-1.5 text-sm text-m4m-gray-700"
                      aria-label={`Rating: ${sellerRating} out of 5`}
                    >
                      <span className="text-amber-500">★</span>
                      <span className="font-semibold">{sellerRating.toFixed(1)}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Stats */}
            <div className="flex gap-8 sm:gap-12 sm:ml-auto pt-4 sm:pt-0 sm:border-l-0 border-t border-m4m-gray-200 sm:border-t-0 sm:pl-8">
              <StatBadge label="Total sales" value={seller?.total_sales ?? 0} />
              <StatBadge label="Reviews" value={seller?.total_reviews ?? 0} />
              <StatBadge label="Products" value={products.length} />
            </div>
          </div>
        </div>
      </div>

      {/* Products grid */}
      <section>
        <h2 className="text-xl font-semibold text-m4m-black mb-4">Products</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-m4m-gray-200 bg-m4m-gray-50 aspect-[3/4] animate-pulse" aria-hidden />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-m4m-gray-200 bg-white p-12 md:p-16 text-center">
            <p className="text-m4m-gray-500">No products listed yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={{ ...p, seller, rating: p.rating ?? sellerRating }} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
