import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ReportModal from '../components/ReportModal';
import { VerifiedBadge, SellerSalesBadge } from '../components/SellerBadges';
import { getProducts, getSellerProfile, getPublicSellerStats, paginatedItems, submitReport, getFavoriteIds, toggleFavorite, getToken, createConversation } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

function getLastSeenLabel(lastActivityAt) {
  if (!lastActivityAt) return 'Offline';

  const now = new Date();
  const last = new Date(lastActivityAt);

  const diffMs = now - last;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 2) return 'Online';

  if (diffMin < 60)
    return `Last seen ${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMin / 60);

  if (diffHours < 24)
    return `Last seen ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 1)
    return 'Last seen yesterday';

  return `Last seen ${diffDays} days ago`;
}

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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [stats, setStats] = useState(null);
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
      if (prev.includes(Number(productId))) return prev.filter((i) => i !== Number(productId));
      return [...prev, Number(productId)];
    });
    try {
      await toggleFavorite(productId);
    } catch {
      setFavoriteIds((prev) => prev.filter((i) => i !== Number(productId)));
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const [profileRes, productsRes, statsRes] = await Promise.all([
          getSellerProfile(id).catch(() => null),
          getProducts({ seller_id: id, per_page: 100 }),
          getPublicSellerStats(id).catch(() => null),
        ]);
        if (cancelled) return;
        const list = paginatedItems(productsRes);
        const arr = Array.isArray(list) ? list : [];
        setProducts(arr);
        if (statsRes) {
          setStats(statsRes);
        } else {
          setStats(null);
        }

        if (profileRes) {
          setSeller({
            id: profileRes.id,
            name: profileRes.name,
            avatar: profileRes.avatar ?? null,
            updated_at: profileRes.updated_at ?? null,
            last_activity_at: profileRes.last_activity_at,
            member_since: profileRes.member_since ?? profileRes.created_at ?? null,
            rating: profileRes.rating,
            total_sales: statsRes?.total_sales ?? profileRes.total_sales ?? 0,
            total_reviews: profileRes.total_reviews ?? 0,
            is_verified: profileRes.is_verified_seller ?? profileRes.is_verified,
            is_verified_seller: profileRes.is_verified_seller ?? profileRes.is_verified,
            completed_sales:
              statsRes?.total_sales ?? profileRes.completed_sales ?? profileRes.total_sales ?? 0,
            seller_level: statsRes?.seller_level ?? profileRes.seller_level ?? null,
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

  const handleChatSeller = useCallback(async () => {
    if (!seller?.id) return;
    if (!user || !getToken()) {
      navigate('/login', { state: { from: `/seller/${seller?.id ?? id}` } });
      return;
    }
    if (user.id === seller.id) return;
    try {
      const conversation = await createConversation({ other_user_id: seller.id });
      const convId = conversation?.id;
      if (convId) navigate(`/chat?conversation=${convId}`);
      else navigate('/chat');
    } catch {
      // Silently ignore chat errors on profile page
    }
  }, [seller?.id, user, navigate, id]);

  if (loading && !seller) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-m4m-purple border-t-transparent rounded-full animate-spin" aria-hidden />
      </div>
    );
  }

  const lastSeenLabel = getLastSeenLabel(seller?.last_activity_at);
  const online = lastSeenLabel === 'Online';
  const sellerRating = seller?.rating != null ? Number(seller.rating) : null;
  const isVerified =
    seller?.is_verified === true ||
    seller?.is_verified === 1 ||
    seller?.is_verified_seller === true ||
    seller?.is_verified_seller === 1;
  const sellerLevel = typeof seller?.seller_level === 'number' ? seller.seller_level : null;
  const successRate =
    typeof stats?.success_rate === 'number' ? `${stats.success_rate.toFixed(1)}%` : '—';
  const avgResponse =
    typeof stats?.avg_response_minutes === 'number'
      ? `${stats.avg_response_minutes.toFixed(1)} min`
      : '—';

  const memberSinceLabel =
    seller?.member_since
      ? new Date(seller.member_since).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
        })
      : null;

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
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-m4m-purple text-white flex items-center justify-center text-2xl md:text-3xl font-bold shrink-0 overflow-hidden">
                {seller?.avatar ? (
                  <img
                    src={`${seller.avatar}?v=${seller.updated_at || Date.now()}`}
                    alt="seller avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (seller?.name?.charAt(0)?.toUpperCase() || 'S')
                )}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-m4m-black">{seller?.name || 'Seller'}</h1>
                  {isVerified && <VerifiedBadge size="lg" />}
                  {sellerLevel != null && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                      {t('product.seller_level')} {sellerLevel}
                    </span>
                  )}
                </div>
                <SellerSalesBadge completedSales={seller?.completed_sales ?? seller?.total_sales ?? 0} size="lg" />
                {lastSeenLabel && (
                  <p className="mt-1 text-xs text-m4m-gray-500">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${online ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {lastSeenLabel}
                    </span>
                  </p>
                )}
                {memberSinceLabel && (
                  <p className="mt-1 text-xs text-m4m-gray-500">
                    {t('product.member_since')}: <span className="font-medium text-m4m-black">{memberSinceLabel}</span>
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {/* Rating */}
                  {sellerRating != null && sellerRating > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                      <span className="text-amber-500">★</span>
                      {sellerRating != null ? sellerRating.toFixed(1) : 'New'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats + Actions */}
            <div className="flex flex-col gap-4 items-end shrink-0">
              <div className="flex gap-6 sm:gap-10 border-t sm:border-t-0 sm:border-l border-m4m-gray-200 pt-4 sm:pt-0 sm:pl-8">
                <StatBadge label="Total sales" value={seller?.total_sales ?? 0} />
                <StatBadge label="Reviews" value={seller?.total_reviews ?? 0} />
                <StatBadge label="Products" value={products.length} />
                <StatBadge label="Success rate" value={successRate} />
                <StatBadge label="Avg. response" value={avgResponse} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleChatSeller}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-m4m-purple hover:bg-m4m-purple-dark transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M5 20l2.586-2.586A2 2 0 018.828 17H19a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11l2-2" />
                  </svg>
                  {t('product.chat_with_seller')}
                </button>
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
      {loading ? (
        <section>
          <h2 className="text-lg font-semibold text-m4m-black mb-4">Listed products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl border border-m4m-gray-200 bg-m4m-gray-50 aspect-[3/4] animate-pulse" aria-hidden />
            ))}
          </div>
        </section>
      ) : products.length === 0 ? (
        <section>
          <h2 className="text-lg font-semibold text-m4m-black mb-4">Listed products</h2>
          <div className="relative px-3 py-2 text-center">
            <p className="text-m4m-gray-500">No products listed yet.</p>
          </div>
        </section>
      ) : (
        <>
          {/* Featured product (pinned) */}
          {products.some((p) => p.is_pinned) && (() => {
            const pinned = products.find((p) => p.is_pinned);
            return (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-m4m-black mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center text-amber-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 .587l3.668 7.568L24 9.423l-6 5.847L19.335 24 12 19.897 4.665 24 6 15.27 0 9.423l8.332-1.268z" />
                    </svg>
                  </span>
                  Featured Product
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                  <ProductCard
                    key={pinned.id}
                    product={{
                      ...pinned,
                      seller: {
                        ...(pinned.seller ?? {}),
                        ...seller,
                        id: seller?.id ?? pinned.seller?.id,
                        name: seller?.name ?? pinned.seller?.name,
                      },
                    }}
                    isFavorited={favoriteIds.includes(Number(pinned.id))}
                    onToggleFavorite={user ? () => handleToggleFavorite(pinned.id) : undefined}
                  />
                </div>
              </section>
            );
          })()}
          {/* Other products (or all when none pinned) */}
          <section>
            <h2 className="text-lg font-semibold text-m4m-black mb-4">
              {products.some((p) => p.is_pinned) ? 'Other products' : 'Listed products'}
              <span className="ml-2 text-sm font-normal text-m4m-gray-500">
                ({products.some((p) => p.is_pinned) ? products.filter((p) => !p.is_pinned).length : products.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {products.filter((p) => !p.is_pinned).map((p) => (
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
                  }}
                  isFavorited={favoriteIds.includes(Number(p.id))}
                  onToggleFavorite={user ? () => handleToggleFavorite(p.id) : undefined}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
