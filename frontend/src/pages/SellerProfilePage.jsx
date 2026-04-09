import { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getCurrentUrl, seoAbsoluteImageUrl } from '../lib/seoUrl';
import { ChevronRight, FolderOpen, LayoutGrid, Package } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ReportModal from '../components/ReportModal';
import { VerifiedBadge, SellerSalesBadge } from '../components/SellerBadges';
import { getProducts, getSellerProfile, getPublicSellerStats, getOfferTypes, getServices, getReviews, paginatedItems, submitReport, getFavoriteIds, toggleFavorite, getToken, createConversation } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const SEO_DEFAULT_DESCRIPTION = 'Buy digital products instantly on M4M Marketplace.';

function seoSellerPageUrl(sellerId) {
  if (typeof window === 'undefined') return '';
  const sid = sellerId != null ? String(sellerId).trim() : '';
  if (!sid) return `${window.location.origin}/`;
  return `${window.location.origin}/seller/${encodeURIComponent(sid)}`;
}

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
  const [offerTypes, setOfferTypes] = useState([]);
  const [services, setServices] = useState([]);
  const [activeService, setActiveService] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsLastPage, setReviewsLastPage] = useState(1);
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
        const [profileRes, productsRes, statsRes, offerTypesRes, servicesRes] = await Promise.all([
          getSellerProfile(id).catch(() => null),
          getProducts({ seller_id: id, per_page: 100 }),
          getPublicSellerStats(id).catch(() => null),
          getOfferTypes().catch(() => []),
          getServices().catch(() => []),
        ]);
        if (cancelled) return;
        const list = paginatedItems(productsRes);
        const arr = Array.isArray(list) ? list : [];
        setProducts(arr);
        setOfferTypes(Array.isArray(offerTypesRes) ? offerTypesRes : []);
        setServices(Array.isArray(servicesRes) ? servicesRes : []);
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

  useLayoutEffect(() => {
    setReviewsPage(1);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getReviews({ seller_id: id, per_page: 3, page: reviewsPage })
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data;
        const list = payload?.data;
        const last = payload?.last_page;
        setReviews(Array.isArray(list) ? list : []);
        setReviewsLastPage(last || 1);
      })
      .catch(() => {
        if (!cancelled) {
          setReviews([]);
          setReviewsLastPage(1);
        }
      });
    return () => { cancelled = true; };
  }, [id, reviewsPage]);

  useEffect(() => {
    setActiveService(null);
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

  // Offer type id -> service_id mapping (for grouping by service)
  const offerTypeIdToServiceId = useMemo(() => {
    const map = {};
    (offerTypes || []).forEach((ot) => {
      if (ot?.id != null && ot?.service_id != null) map[Number(ot.id)] = Number(ot.service_id);
    });
    return map;
  }, [offerTypes]);

  // Offer type id -> name (for marketplace-style search)
  const offerTypeMap = useMemo(() => {
    const map = {};
    (offerTypes || []).forEach((ot) => {
      if (ot?.id != null) map[Number(ot.id)] = ot.name || '';
    });
    return map;
  }, [offerTypes]);

  // Service id -> real service name (from GET /services)
  const serviceMap = useMemo(() => {
    const map = {};
    (services || []).forEach((s) => {
      if (s?.id != null) map[Number(s.id)] = s.name || 'Other';
    });
    return map;
  }, [services]);

  // Filter unpinned products: name, description, service name, offer type name (trim + lowercase)
  const filteredProducts = useMemo(() => {
    const unpinned = products.filter((p) => !p.is_pinned);
    const q = (search || '').trim().toLowerCase();
    if (!q) return unpinned;

    return unpinned.filter((p) => {
      const name = String(p.name ?? '').toLowerCase();
      const desc = String(p.description ?? '').toLowerCase();
      const otId = p.offer_type_id != null ? Number(p.offer_type_id) : null;
      const offerTypeName = otId != null ? String(offerTypeMap[otId] ?? '').toLowerCase() : '';
      const serviceId = otId != null ? offerTypeIdToServiceId[otId] : undefined;
      const serviceName =
        serviceId != null ? String(serviceMap[serviceId] ?? '').toLowerCase() : '';

      return (
        name.includes(q) ||
        desc.includes(q) ||
        offerTypeName.includes(q) ||
        serviceName.includes(q)
      );
    });
  }, [products, search, offerTypeMap, offerTypeIdToServiceId, serviceMap]);

  // Group filtered products by service_id (via offer_type_id -> service_id)
  const groupedByService = useMemo(() => {
    const groups = {};
    filteredProducts.forEach((p) => {
      const serviceId = p.offer_type_id != null
        ? (offerTypeIdToServiceId[Number(p.offer_type_id)] ?? '__other__')
        : '__other__';
      const key = serviceId === null ? '__other__' : serviceId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [filteredProducts, offerTypeIdToServiceId]);

  // Service order: by service name, then "other"
  const serviceOrder = useMemo(() => {
    const ids = Object.keys(groupedByService)
      .filter((k) => k !== '__other__')
      .map(Number)
      .sort((a, b) => {
        const na = serviceMap[a] || '';
        const nb = serviceMap[b] || '';
        return na.localeCompare(nb);
      });
    if (groupedByService['__other__']?.length) ids.push('__other__');
    return ids;
  }, [groupedByService, serviceMap]);

  // Products to display when a service is selected (filtered by activeService)
  const productsToDisplay = useMemo(() => {
    if (activeService == null) return [];
    if (activeService === '__other__') return groupedByService['__other__'] || [];
    return groupedByService[activeService] || [];
  }, [activeService, groupedByService]);

  const pinnedProduct = useMemo(() => products.find((p) => p.is_pinned), [products]);

  // Featured pin: which service bucket it belongs to (for placement inside service view)
  const pinnedServiceKey = useMemo(() => {
    if (!pinnedProduct) return null;
    if (pinnedProduct.offer_type_id == null) return '__other__';
    const sid = offerTypeIdToServiceId[Number(pinnedProduct.offer_type_id)];
    return sid != null ? sid : '__other__';
  }, [pinnedProduct, offerTypeIdToServiceId]);

  const showFeaturedInServiceView = useMemo(() => {
    if (activeService == null || !pinnedProduct || pinnedServiceKey == null) return false;
    if (activeService === '__other__') return pinnedServiceKey === '__other__';
    return Number(activeService) === Number(pinnedServiceKey);
  }, [activeService, pinnedProduct, pinnedServiceKey]);

  const sellerSeoFallback = seoSellerPageUrl(id);
  const currentUrl = getCurrentUrl(sellerSeoFallback);

  const sellerForSeo = !loading && seller ? seller : null;
  const sellerNameSafe =
    sellerForSeo?.name != null && String(sellerForSeo.name).trim() !== ''
      ? String(sellerForSeo.name).trim()
      : '';
  const sellerPageTitle = sellerNameSafe ? `${sellerNameSafe} | M4M Marketplace` : 'M4M Marketplace';
  const sellerMetaDescription = sellerNameSafe
    ? `Shop products from ${sellerNameSafe} on M4M Marketplace. Verified sellers and secure checkout.`
    : SEO_DEFAULT_DESCRIPTION;
  const sellerOgDescription = sellerNameSafe
    ? `Shop products from ${sellerNameSafe} on M4M Marketplace. Verified sellers and secure checkout.`
    : SEO_DEFAULT_DESCRIPTION;
  const sellerOgTitle = sellerNameSafe || 'M4M Marketplace';
  const sellerOgImage = seoAbsoluteImageUrl(sellerForSeo?.avatar);

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
    <>
      <Helmet>
        <title>{sellerPageTitle}</title>
        <meta name="description" content={sellerMetaDescription} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={currentUrl} />
        <meta property="og:title" content={sellerOgTitle} />
        <meta property="og:description" content={sellerOgDescription} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:image" content={sellerOgImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={sellerOgTitle} />
        <meta name="twitter:description" content={sellerOgDescription} />
        <meta name="twitter:image" content={sellerOgImage} />
      </Helmet>
      {loading && !seller ? (
        <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-m4m-purple border-t-transparent rounded-full animate-spin" aria-hidden />
        </div>
      ) : (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-10">

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
      <div className="rounded-2xl border border-m4m-gray-200 bg-white shadow-sm overflow-hidden">
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

{/* Seller feedback & reviews — bottom of page */}
<div className="rounded-2xl border border-m4m-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-m4m-gray-500 mb-1">Reputation</p>
          <div className="flex flex-col lg:flex-row lg:items-start gap-8">
            <div className="flex items-center gap-6 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-4xl md:text-5xl font-bold text-m4m-black">
                  {sellerRating != null && sellerRating > 0 ? sellerRating.toFixed(1) : '—'}
                </span>
                <span className="text-3xl md:text-4xl text-amber-400" aria-hidden>
                  ★
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-m4m-black">
                  Based on {seller?.total_reviews ?? 0} review{(seller?.total_reviews ?? 0) === 1 ? '' : 's'}
                </p>
                {sellerRating != null && sellerRating >= 4.5 && (
                  <p className="text-xs text-green-600 font-medium mt-0.5">Highly rated seller</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 lg:gap-6 flex-1">
              {successRate !== '—' && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-100">
                  <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">Success rate {successRate}</span>
                </div>
              )}
              {avgResponse !== '—' && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-100">
                  <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-blue-800">Avg. response {avgResponse}</span>
                </div>
              )}
              {memberSinceLabel && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-100">
                  <svg className="w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-800">Member since {memberSinceLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-m4m-gray-100">
            <h3 className="text-base font-semibold text-m4m-black mb-4">Recent feedback</h3>
            {reviews.length > 0 ? (
              <>
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="flex gap-3 p-3 rounded-xl bg-m4m-gray-50/50 hover:bg-m4m-gray-50 transition-colors">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-m4m-purple/10 flex items-center justify-center text-xs font-semibold text-m4m-purple">
                        {(r.buyer || 'B').charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-m4m-gray-600">{r.buyer || 'Buyer'}</span>
                          <span className="text-amber-500 text-xs" aria-label={`${r.rating} out of 5 stars`}>
                            {'★'.repeat(Math.min(5, Math.max(0, Math.round(r.rating) || 0)))}{'☆'.repeat(5 - Math.min(5, Math.max(0, Math.round(r.rating) || 0)))}
                          </span>
                          {r.created_at && (
                            <span className="text-xs text-m4m-gray-400">
                              {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {r.product_name && (
                          <p className="text-xs text-m4m-gray-500 mt-0.5">Product: {r.product_name}</p>
                        )}
                        {r.comment && <p className="text-sm text-m4m-black mt-1">{r.comment}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={reviewsPage <= 1}
                    onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                    className="rounded-full border border-m4m-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-m4m-black shadow-sm transition-colors hover:bg-m4m-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-m4m-gray-600 tabular-nums">
                    Page {reviewsPage} of {reviewsLastPage}
                  </span>
                  <button
                    type="button"
                    disabled={reviewsPage >= reviewsLastPage}
                    onClick={() => setReviewsPage((p) => p + 1)}
                    className="rounded-full border border-m4m-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-m4m-black shadow-sm transition-colors hover:bg-m4m-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <p className="text-m4m-gray-500 text-sm py-4">No reviews yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Search — directly under seller header, full width */}
      {!loading && products.filter((p) => !p.is_pinned).length > 0 && (
        <section className="w-full" aria-label="Search seller listings">
          <div className="rounded-2xl border border-m4m-gray-200 bg-gradient-to-b from-m4m-gray-50/90 to-white p-4 md:p-6 shadow-sm">
            <label htmlFor="seller-products-search" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-m4m-gray-500">
              Search this store
            </label>
            <input
              id="seller-products-search"
              type="search"
              placeholder={t('home.search_placeholder') || 'Search products...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-2 border-m4m-gray-200 bg-white px-5 py-3.5 text-base text-m4m-black shadow-inner placeholder:text-m4m-gray-400 transition-colors focus:border-m4m-purple focus:outline-none focus:ring-4 focus:ring-m4m-purple/15"
              aria-label="Search products"
            />
          </div>
        </section>
      )}

      {/* Products & catalog */}
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
          {/* Service folder cards OR products grid — keyed for transition */}
          <div
            key={activeService == null ? 'seller-catalog-folders' : `seller-catalog-${activeService}`}
            className="wizard-step-animate"
          >
            {activeService == null ? (
              serviceOrder.length > 0 ? (
                <section className="space-y-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-m4m-gray-500">
                        Store catalog
                      </p>
                      <h2 className="text-xl font-bold text-m4m-black mt-1">Browse by service</h2>
                      <p className="text-sm text-m4m-gray-500 mt-1 max-w-xl">
                        Select a category to see this seller&apos;s listings.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
                    {serviceOrder.map((serviceKey) => {
                      const items = groupedByService[serviceKey] || [];
                      if (items.length === 0) return null;
                      const isOther = serviceKey === '__other__';
                      const serviceName = isOther
                        ? 'Other products'
                        : (serviceMap[serviceKey] || 'Other');
                      const Icon = isOther ? Package : FolderOpen;
                      return (
                        <button
                          key={serviceKey}
                          type="button"
                          onClick={() => setActiveService(serviceKey)}
                          className="group relative flex min-h-[168px] flex-col gap-4 rounded-2xl border border-m4m-gray-200/90 bg-gradient-to-br from-white via-white to-m4m-gray-50/90 p-6 sm:p-7 text-left shadow-sm outline-none ring-m4m-purple/0 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-m4m-purple/45 hover:shadow-lg hover:shadow-m4m-purple/10 focus-visible:ring-2 focus-visible:ring-m4m-purple/40 active:translate-y-0 active:scale-[0.99] motion-reduce:hover:translate-y-0 motion-reduce:transition-none md:min-h-[188px]"
                        >
                          <span
                            className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-m4m-purple/0 via-m4m-purple/40 to-m4m-purple/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            aria-hidden
                          />
                          <div className="flex w-full items-start justify-between gap-3">
                            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-m4m-purple/10 text-m4m-purple ring-1 ring-m4m-purple/15 transition-transform duration-300 ease-out group-hover:scale-105 group-hover:bg-m4m-purple/[0.14]">
                              <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                            </span>
                            <span className="inline-flex shrink-0 items-center rounded-full border border-m4m-gray-200/80 bg-m4m-gray-50 px-2.5 py-1 text-xs font-bold tabular-nums text-m4m-gray-700 transition-colors duration-300 group-hover:border-m4m-purple/25 group-hover:bg-m4m-purple/10 group-hover:text-m4m-purple-dark">
                              {items.length}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <span className="block text-lg font-semibold leading-snug text-m4m-black transition-colors duration-200 group-hover:text-m4m-purple-dark line-clamp-2">
                              {serviceName}
                            </span>
                            <span className="flex items-center gap-1 text-sm font-medium text-m4m-purple opacity-90 transition-all duration-300 group-hover:gap-2 group-hover:opacity-100">
                              View listings
                              <ChevronRight
                                className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"
                                aria-hidden
                              />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : search.trim() ? (
                <section className="rounded-2xl border border-m4m-gray-200 bg-m4m-gray-50/50 px-6 py-10 text-center">
                  <p className="text-m4m-gray-600">No products match your search.</p>
                </section>
              ) : null
            ) : (
              <section className="space-y-6">
                <div className="flex flex-col gap-4 border-b border-m4m-gray-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveService(null)}
                    className="group inline-flex w-fit items-center gap-2 rounded-xl border border-m4m-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-m4m-purple shadow-sm transition-all duration-200 hover:border-m4m-purple/40 hover:bg-m4m-purple/5 hover:shadow-md active:scale-[0.98]"
                  >
                    <svg
                      className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to services
                  </button>
                  <div className="flex items-start gap-3 sm:justify-end">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-m4m-purple/10 text-m4m-purple">
                      <LayoutGrid className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-m4m-black">
                        {activeService === '__other__'
                          ? 'Other products'
                          : (serviceMap[activeService] || 'Other')}
                      </h2>
                      <p className="text-sm text-m4m-gray-500">
                        {productsToDisplay.length} listing{productsToDisplay.length === 1 ? '' : 's'} in this service
                      </p>
                    </div>
                  </div>
                </div>
                {showFeaturedInServiceView && pinnedProduct && (
                  <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white p-4 md:p-5">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-m4m-black">
                      <span className="inline-flex items-center justify-center text-amber-400">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path d="M12 .587l3.668 7.568L24 9.423l-6 5.847L19.335 24 12 19.897 4.665 24 6 15.27 0 9.423l8.332-1.268z" />
                        </svg>
                      </span>
                      Featured in this service
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                      <ProductCard
                        key={pinnedProduct.id}
                        product={{
                          ...pinnedProduct,
                          seller: {
                            ...(pinnedProduct.seller ?? {}),
                            ...seller,
                            id: seller?.id ?? pinnedProduct.seller?.id,
                            name: seller?.name ?? pinnedProduct.seller?.name,
                          },
                        }}
                        isFavorited={favoriteIds.includes(Number(pinnedProduct.id))}
                        onToggleFavorite={user ? () => handleToggleFavorite(pinnedProduct.id) : undefined}
                      />
                    </div>
                  </section>
                )}
                {productsToDisplay.length > 0 ? (
                  <div className="overflow-x-auto md:overflow-visible -mx-4 sm:mx-0 px-4 sm:px-0">
                    <div className="flex md:grid gap-4 md:gap-6 min-w-0 md:grid-cols-2 lg:grid-cols-4 md:min-w-0">
                      {productsToDisplay.map((p) => (
                        <div
                          key={p.id}
                          className="flex-shrink-0 w-[260px] sm:w-[280px] md:w-auto md:min-w-0 transition-opacity duration-300"
                        >
                          <ProductCard
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
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-m4m-gray-200 bg-m4m-gray-50/80 px-4 py-8 text-center text-m4m-gray-600">
                    No products in this category.
                  </p>
        )}
      </section>
            )}
          </div>

          {/* Featured — after service catalog when browsing all services */}
          {activeService == null && pinnedProduct && (
            <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-white p-5 md:p-8 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-m4m-black md:text-xl">
                <span className="inline-flex items-center justify-center text-amber-400">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M12 .587l3.668 7.568L24 9.423l-6 5.847L19.335 24 12 19.897 4.665 24 6 15.27 0 9.423l8.332-1.268z" />
                  </svg>
                </span>
                Featured product
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                <ProductCard
                  key={pinnedProduct.id}
                  product={{
                    ...pinnedProduct,
                    seller: {
                      ...(pinnedProduct.seller ?? {}),
                      ...seller,
                      id: seller?.id ?? pinnedProduct.seller?.id,
                      name: seller?.name ?? pinnedProduct.seller?.name,
                    },
                  }}
                  isFavorited={favoriteIds.includes(Number(pinnedProduct.id))}
                  onToggleFavorite={user ? () => handleToggleFavorite(pinnedProduct.id) : undefined}
                />
              </div>
            </section>
          )}
        </>
      )}

      
    </div>
      )}
    </>
  );
}
