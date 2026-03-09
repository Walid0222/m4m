import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ReportModal from '../components/ReportModal';
import { VerifiedBadge, SellerSalesBadge } from '../components/SellerBadges';
import { isSellerOnline } from '../lib/sellerOnline';
import { getProducts, getSellerProfile, paginatedItems, submitReport } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function StatBadge({ label, value }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xl font-bold text-m4m-black">{value}</span>
      <span className="text-xs text-m4m-gray-500">{label}</span>
    </div>
  );
}

export default function SellerProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

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
            is_verified: profileRes.is_verified,
            completed_sales: profileRes.completed_sales ?? profileRes.total_sales ?? 0,
          });
        } else {
          const fallback = arr[0]?.seller ?? { id: Number(id), name: 'Seller', last_activity_at: null };
          setSeller(fallback);
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
      <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-m4m-purple border-t-transparent rounded-full animate-spin" aria-hidden />
      </div>
    );
  }

  const online = isSellerOnline(seller);
  const sellerRating = seller?.rating != null ? Number(seller.rating) : null;
  const isVerified = seller?.is_verified === true || seller?.is_verified === 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">

      {/* Report modal */}
      {showReport && (
        <ReportModal
          type="seller"
          targetName={seller?.name}
          onSubmit={async (reason, description) => {
            await submitReport({
              type: 'seller',
              target_id: id,
              target_name: seller?.name,
              reason,
              description,
              reporter: user ? { id: user.id, name: user.name, email: user.email } : null,
            });
          }}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Seller header card */}
      <div className="rounded-2xl border border-m4m-gray-200 bg-white shadow-sm overflow-hidden mb-8">
        <div className="p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Avatar + Name */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-m4m-purple text-white flex items-center justify-center text-2xl md:text-3xl font-bold shrink-0">
                {seller?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-m4m-black">{seller?.name || 'Seller'}</h1>
                  {isVerified && <VerifiedBadge size="lg" />}
                </div>
                <SellerSalesBadge completedSales={seller?.completed_sales ?? seller?.total_sales ?? 0} size="lg" />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {/* Online status */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {online ? 'Online' : 'Offline'}
                  </span>
                  {/* Rating */}
                  {sellerRating != null && sellerRating > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                      <span className="text-amber-500">★</span>
                      {sellerRating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats + Report button */}
            <div className="flex flex-col gap-4 items-end shrink-0">
              <div className="flex gap-6 sm:gap-10 border-t sm:border-t-0 sm:border-l border-m4m-gray-200 pt-4 sm:pt-0 sm:pl-8">
                <StatBadge label="Total sales" value={seller?.total_sales ?? 0} />
                <StatBadge label="Reviews" value={seller?.total_reviews ?? 0} />
                <StatBadge label="Products" value={products.length} />
              </div>
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                Report seller
              </button>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        {isVerified && (
          <div className="px-6 md:px-8 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-2">
            <VerifiedBadge />
            <p className="text-xs text-blue-700">
              This seller has been identity-verified by the M4M team. Their documents have been reviewed and confirmed.
            </p>
          </div>
        )}
      </div>

      {/* Products grid */}
      <section>
        <h2 className="text-lg font-semibold text-m4m-black mb-4">
          Listed products
          {products.length > 0 && <span className="ml-2 text-sm font-normal text-m4m-gray-500">({products.length})</span>}
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl border border-m4m-gray-200 bg-m4m-gray-50 aspect-[3/4] animate-pulse" aria-hidden />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-m4m-gray-200 bg-white p-12 text-center">
            <p className="text-m4m-gray-500">No products listed yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  ...p,
                  seller: {
                    ...(p.seller ?? {}),
                    ...seller,
                    id: seller?.id ?? p.seller?.id,
                    name: seller?.name ?? p.seller?.name,
                  },
                  rating: p.rating ?? sellerRating,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
