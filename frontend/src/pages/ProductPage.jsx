import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getProduct,
  getProducts,
  getRecommendedProducts,
  createOrder,
  createConversation,
  createReview,
  getWallet,
  getOrders,
  getToken,
  paginatedItems,
  toggleFavorite,
  getFavoriteIds,
} from '../services/api';
import { isSellerOnline } from '../lib/sellerOnline';
import { getSellerSalesBadge } from '../lib/sellerBadge';
import { VerifiedBadge, SellerSalesBadge } from '../components/SellerBadges';
import ReportModal from '../components/ReportModal';
import ProductCard from '../components/ProductCard';
import { useMarketplaceSettings } from '../contexts/MarketplaceSettingsContext';
import { DEFAULT_MARKETPLACE_SETTINGS } from '../config/marketplaceSettings';

const VIEWED_PRODUCTS_KEY = 'viewed_products';
const VIEW_COOLDOWN_MS = 30 * 60 * 1000;

function getViewedProducts() {
  try {
    const raw = localStorage.getItem(VIEWED_PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markProductViewed(productId) {
  try {
    const viewed = getViewedProducts();
    viewed[String(productId)] = Date.now();
    localStorage.setItem(VIEWED_PRODUCTS_KEY, JSON.stringify(viewed));
  } catch { /* ignore */ }
}

function wasProductViewedRecently(productId) {
  const viewed = getViewedProducts();
  const ts = viewed[String(productId)];
  if (!ts) return false;
  return (Date.now() - ts) < VIEW_COOLDOWN_MS;
}

const FEATURE_ICONS = {
  mac: { label: 'Works on Mac', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> },
  linux: { label: 'Works on Linux', icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489.109.699.439 1.304.968 1.754.177.15.359.283.546.408-.584 1.12-.99 2.376-.993 3.627-.006 1.773 1.175 3.225 2.99 3.308 1.804.083 2.876-1.196 3.393-2.645.17-.478.279-.988.322-1.521.026-.318.05-.636.065-.954.01-.233.014-.47.014-.704 0-.237-.004-.47-.013-.703-.002-.06.002-.119.013-.178.072-.367.272-.705.583-.963.328-.271.732-.422 1.2-.422.463 0 .861.149 1.188.42.314.257.515.598.589.966.011.06.015.12.013.18-.009.233-.013.466-.013.7 0 .234.004.467.014.697.016.317.039.636.065.955.043.532.153 1.043.322 1.52.517 1.45 1.589 2.728 3.393 2.645 1.815-.083 2.996-1.535 2.99-3.308-.003-1.25-.408-2.507-.993-3.628.187-.125.37-.258.547-.408.529-.45.859-1.055.968-1.754.123-.805-.009-1.657-.287-2.489-.589-1.771-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.491 1.056-5.965-3.17-6.298-.165-.013-.325-.021-.48-.021z"/></svg> },
  global: { label: 'Global access', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  instant: { label: 'Instant delivery', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
  assurance: { label: '30-day assurance', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
};

function PurchaseConfirmModal({
  product,
  quantity,
  onConfirm,
  onCancel,
  isLoading,
  couponCode,
  onCouponCodeChange,
  onApplyCoupon,
  couponError,
  discountAmount,
  subtotal,
  finalTotal,
  isCheckingCoupon,
  buyerNote,
  onBuyerNoteChange,
}) {
  const seller = product.seller || {};
  const salesBadge = getSellerSalesBadge(seller.completed_sales ?? seller.completedSales ?? 0);
  const isVerified = seller.is_verified === true || seller.is_verified === 1;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onCancel}>
      <div className="rounded-2xl bg-white shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm your purchase</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Before completing your purchase, please check the seller reviews and product description carefully.
          </p>
        </div>
        {/* Seller trust info */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 mb-4 flex items-start gap-2">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div className="text-xs text-blue-700 space-y-1">
            {isVerified && <p>✅ <strong>Verified seller</strong> — identity confirmed by M4M team.</p>}
            {salesBadge && <p>🏅 <strong>{salesBadge.label}</strong> — seller has a strong track record.</p>}
            {seller.seller_level != null && (
              <p>🎯 <strong>Seller Level:</strong> {seller.seller_level}</p>
            )}
            {!isVerified && !salesBadge && seller.seller_level == null && (
              <p>ℹ️ Check seller reviews before purchasing. Sellers with badges and higher levels have proven track records.</p>
            )}
          </div>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 mb-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Product</span>
            <span className="font-medium text-gray-900 text-right max-w-[60%] line-clamp-1">{product.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Quantity</span>
            <span className="font-medium text-gray-900">{quantity}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600 border-t border-gray-200 pt-2 mt-2">
            <span>Subtotal</span>
            <span className="font-medium text-gray-900">{Number(subtotal || 0).toFixed(2)} MAD</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex flex-col">
              <span className="font-medium text-gray-700">Coupon code</span>
              <span className="text-[11px] text-gray-500">
                Apply a valid coupon to reduce your total. Seller earnings are not reduced.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => onCouponCodeChange(e.target.value)}
                placeholder="WELCOME10"
                className="w-28 px-2 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-m4m-purple outline-none"
              />
              <button
                type="button"
                onClick={onApplyCoupon}
                disabled={isCheckingCoupon || !couponCode.trim()}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark disabled:opacity-60"
              >
                {isCheckingCoupon ? 'Checking…' : 'Apply'}
              </button>
            </div>
          </div>
          {couponError && (
            <p className="text-[11px] text-red-600 mt-1">{couponError}</p>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-green-700 mt-1">
              <span>Coupon discount</span>
              <span>-{Number(discountAmount || 0).toFixed(2)} MAD</span>
            </div>
          )}
          <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
            <span className="font-semibold text-gray-900">Final total</span>
            <span className="font-bold text-gray-900">{Number(finalTotal || 0).toFixed(2)} MAD</span>
          </div>
          {onBuyerNoteChange && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <label className="block text-xs font-medium text-gray-700 mb-1">Order note (optional)</label>
              <textarea
                value={buyerNote || ''}
                onChange={(e) => onBuyerNoteChange(e.target.value)}
                placeholder="e.g. Please deliver as soon as possible."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-m4m-purple outline-none resize-none"
              />
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={isLoading} className="flex-1 py-3 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-70 transition-colors">
            {isLoading ? 'Processing…' : 'Confirm purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { marketplaceSettings } = useMarketplaceSettings();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [userOrders, setUserOrders] = useState([]);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewOrderId, setReviewOrderId] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [similarProducts, setSimilarProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [viewers, setViewers] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favToggling, setFavToggling] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);
  const [buyerNote, setBuyerNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchProduct() {
      if (!id) return;
      setLoading(true);
      setSelectedImageIndex(0);
      try {
        const recordView = !wasProductViewedRecently(id);
        if (recordView) markProductViewed(id);
        const data = await getProduct(id, { record_view: recordView ? 1 : 0 });
        if (!cancelled) setProduct(data);
      } catch {
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProduct();
    return () => { cancelled = true; };
  }, [id]);

  // Check if product is in favorites
  useEffect(() => {
    if (!id || !getToken()) return;
    let cancelled = false;
    getFavoriteIds().then((ids) => {
      if (!cancelled && Array.isArray(ids)) {
        setIsFavorited(ids.includes(Number(id)) || ids.includes(String(id)));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const handleToggleFavorite = async () => {
    if (!getToken() || favToggling) return;
    setFavToggling(true);
    try {
      const result = await toggleFavorite(id);
      setIsFavorited(result?.favorited ?? !isFavorited);
    } catch { /* ignore */ } finally {
      setFavToggling(false);
    }
  };

  // Fetch similar products (same seller)
  useEffect(() => {
    if (!product?.seller?.id) return;
    let cancelled = false;
    getProducts({ seller_id: product.seller.id, per_page: 5 })
      .then((res) => {
        if (cancelled) return;
        const list = paginatedItems(res) ?? [];
        setSimilarProducts(list.filter((p) => String(p.id) !== String(id)).slice(0, 4));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [product?.seller?.id, id]);

  // Mock viewers for social proof (could be replaced by API)
  useEffect(() => {
    if (!product?.id) return;
    const interval = setInterval(() => {
      setViewers((v) => (Math.random() > 0.3 ? Math.floor(Math.random() * 12) : 0));
    }, 8000);
    setViewers(Math.floor(Math.random() * 10));
    return () => clearInterval(interval);
  }, [product?.id]);

  // Fetch recommended products (global)
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getRecommendedProducts(id, { limit: 8 })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : paginatedItems(res);
        const arr = Array.isArray(list) ? list : [];
        setRecommendedProducts(arr.filter((p) => String(p.id) !== String(id)).slice(0, 8));
      })
      .catch(() => {
        if (!cancelled) setRecommendedProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Track recently viewed products in localStorage (last 10)
  useEffect(() => {
    const productId = product?.id;
    if (!productId) return;
    try {
      const STORAGE_KEY = 'recently_viewed_products';
      const raw = localStorage.getItem(STORAGE_KEY);
      let existing = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) existing = parsed;
        } catch {
          existing = [];
        }
      }
      const idNum = Number(productId);
      const deduped = existing
        .map((v) => Number(v))
        .filter((v) => !Number.isNaN(v) && v !== idNum);
      deduped.unshift(idNum);
      const limited = deduped.slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    } catch {
      // ignore storage errors (e.g. private mode)
    }
  }, [product?.id]);

  useEffect(() => {
    if (!user || !getToken() || !product?.id) { setUserOrders([]); return; }
    let cancelled = false;
    getOrders({ per_page: 100 })
      .then((res) => { if (!cancelled) { const o = paginatedItems(res) ?? []; setUserOrders(Array.isArray(o) ? o : []); } })
      .catch(() => { if (!cancelled) setUserOrders([]); });
    return () => { cancelled = true; };
  }, [user, product?.id]);

  const eligibleOrders = useMemo(() => {
    if (!product?.id || !userOrders.length) return [];
    const reviewedOrderIds = new Set(
      (product.reviews ?? []).filter((r) => Number(r.user_id) === Number(user?.id)).map((r) => r.order_id)
    );
    return userOrders.filter((o) => {
      if ((o.status || '').toLowerCase() !== 'completed') return false;
      if (reviewedOrderIds.has(o.id)) return false;
      const items = o.order_items ?? o.orderItems ?? [];
      return items.some((i) => Number(i.product_id) === Number(product.id));
    });
  }, [product?.id, product?.reviews, user?.id, userOrders]);

  const isBestPrice = useMemo(() => {
    if (!product) return false;
    const currentPrice = Number(product.effective_price ?? product.price ?? 0);
    const allProducts = [product, ...similarProducts, ...recommendedProducts];
    const prices = allProducts.map((p) => Number(p.effective_price ?? p.price ?? 0)).filter((n) => n > 0);
    if (prices.length === 0) return false;
    const min = Math.min(...prices);
    return currentPrice <= min;
  }, [product, similarProducts, recommendedProducts]);

  const settings = marketplaceSettings ?? DEFAULT_MARKETPLACE_SETTINGS;

  const viewerText = useMemo(() => {
    if (!settings?.showViewingIndicator) return null;
    if (viewers === 0) return null;
    const threshold = settings?.exactViewerThreshold ?? 5;
    if (viewers < threshold) return settings?.lowViewerText ?? '👀 Several people are viewing this item';
    return `👀 ${viewers} people viewing this item`;
  }, [viewers, settings?.showViewingIndicator, settings?.exactViewerThreshold, settings?.lowViewerText]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!product || !reviewOrderId || !user || !getToken()) return;
    setReviewError('');
    setSubmittingReview(true);
    try {
      const newReview = await createReview(product.id, {
        order_id: parseInt(reviewOrderId, 10),
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });
      setProduct((prev) => prev ? { ...prev, reviews: [...(prev.reviews ?? []), { ...newReview, reviewer: newReview.reviewer || { name: user.name } }] } : prev);
      setReviewFormOpen(false);
      setReviewComment('');
      setReviewRating(5);
      setReviewOrderId('');
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBuyClick = () => {
    if (!user || !getToken()) { navigate('/login'); return; }
    if (!product) return;
    if (Number(product.stock ?? 0) <= 0) { setError('Out of stock.'); return; }
    if (product.seller?.vacation_mode) { setError('Seller is in vacation mode.'); return; }
    setError('');
    setShowConfirmModal(true);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponChecking(true);
    setCouponError('');
    try {
      const { previewCoupon } = await import('../services/api');
      const info = await previewCoupon(couponCode.trim());
      setCouponInfo(info);
      setCouponError('');
    } catch (err) {
      setCouponInfo(null);
      setCouponError(err.message || 'Invalid or expired coupon.');
    } finally {
      setCouponChecking(false);
    }
  };

  const handleBuyConfirm = async () => {
    setShowConfirmModal(false);
    if (!product) return;
    setBuying(true);
    try {
      const wallet = await getWallet();
      const balance = Number(wallet?.balance ?? 0);
      const baseUnitPrice = Number(product.effective_price ?? product.price ?? 0);
      const subtotal = baseUnitPrice * quantity;
      const pct = couponInfo?.discount_percent ?? 0;
      const discount = pct > 0 ? Math.max(0, Math.min(subtotal, (subtotal * pct) / 100)) : 0;
      const total = Math.max(0, subtotal - discount);
      if (balance < total) { setError('Insufficient wallet balance.'); setBuying(false); return; }
      await createOrder([{ product_id: product.id, quantity }], couponInfo ? couponCode.trim() : null, buyerNote?.trim() || null);
      setProduct((prev) => prev ? { ...prev, stock: Math.max(0, Number(prev.stock ?? 0) - quantity) } : prev);
      // Immediately refresh wallet balance in the Navbar
      try {
        window.dispatchEvent(new Event('wallet:refresh'));
      } catch {
        // ignore; wallet will still refresh on next global tick
      }
      navigate('/orders');
    } catch (err) {
      setError(err.message || 'Purchase failed');
    } finally {
      setBuying(false);
    }
  };

  const handleChatSeller = async () => {
    const sellerData = product?.seller;
    if (!user || !getToken()) { navigate('/login', { state: { from: `/product/${id}` } }); return; }
    if (!product || !sellerData?.id || sellerData.id === user.id) return;
    setError('');
    setChatting(true);
    try {
      const conversation = await createConversation({ other_user_id: sellerData.id, product_id: product.id });
      const convId = conversation?.id;
      if (convId) navigate(`/chat?conversation=${convId}`);
      else navigate('/chat');
    } catch (err) {
      setError(err.message || 'Could not start chat');
    } finally {
      setChatting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-xl bg-gray-100 aspect-square animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-5 bg-gray-100 rounded w-1/2 animate-pulse" />
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-gray-500 mb-4">Product not found.</p>
        <Link to="/" className="text-m4m-purple font-medium hover:underline">Back to Marketplace</Link>
      </div>
    );
  }

  const seller = product.seller || {};
  const price = Number(product.price || 0);
  const effectivePrice = Number(product.effective_price ?? product.price ?? 0);
  const stock = Number(product.stock ?? 0);
  const isOutOfStock = stock <= 0;
  const completedSales = seller.completed_sales ?? seller.completedSales ?? 0;
  const salesBadge = getSellerSalesBadge(completedSales);
  const isSellerVerified =
    seller.is_verified === true ||
    seller.is_verified === 1 ||
    seller.is_verified_seller === true ||
    seller.is_verified_seller === 1;
  const sellerLevel = typeof seller.seller_level === 'number' ? seller.seller_level : null;
  const reviews = product.reviews ?? [];
  const reviewsCount = reviews.length || Number(product.reviews_count ?? 0);
  const avgRatingFromReviews = reviewsCount > 0
    ? (reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length
      : Number(product.reviews_avg_rating ?? 0))
    : null;
  const displayRating = reviewsCount > 0 && avgRatingFromReviews != null ? Number(avgRatingFromReviews) : null;
  const sellerOnline = isSellerOnline(seller);
  const sellerMemberSince =
    seller.member_since || seller.created_at || seller.createdAt || null;
  const sellerMemberSinceLabel =
    sellerMemberSince
      ? new Date(sellerMemberSince).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
        })
      : null;
  const isFlashActive = product.is_flash_active === true;
  const images = product.images && product.images.length > 0 ? product.images : [];
  const mainImage = images[selectedImageIndex] || images[0];

  // Parse feature flags
  const features = product.features ?? product.feature_icons ?? [];
  const deliveryType = product.delivery_type;
  const deliveryTime = product.delivery_time;
  const sellerReminder = product.seller_reminder ?? product.reminder_message;
  const isInstantDelivery = deliveryType === 'instant' || (typeof deliveryTime === 'string' && deliveryTime.toLowerCase().includes('instant'));

  const lastSeenLabel = (() => {
    const at = seller.last_activity_at;
    if (!at) return null;
    const ts = new Date(at).getTime();
    if (Number.isNaN(ts)) return null;
    const diffMs = Date.now() - ts;
    const diffMin = Math.max(0, Math.round(diffMs / 60000));
    if (diffMin < 2) return 'Online';
    if (diffMin < 60) return `Last seen ${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    const diffHours = Math.round(diffMin / 60);
    return `Last seen ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  })();

  const sellerSuccessRate = seller.success_rate ?? seller.success_rate_percent ?? null;
  const sellerCompletedOrders = Number(seller.completed_sales ?? seller.completedSales ?? 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Confirm modal */}
      {showConfirmModal && (
        <PurchaseConfirmModal
          product={product}
          quantity={quantity}
          onConfirm={handleBuyConfirm}
          onCancel={() => setShowConfirmModal(false)}
          isLoading={buying}
          couponCode={couponCode}
          onCouponCodeChange={(value) => {
            setCouponCode(value);
            setCouponError('');
            // Clear applied coupon info when code changes
            setCouponInfo(null);
          }}
          onApplyCoupon={handleApplyCoupon}
          couponError={couponError}
          discountAmount={(() => {
            const baseUnitPrice = Number(product.effective_price ?? product.price ?? 0);
            const subtotal = baseUnitPrice * quantity;
            const pct = couponInfo?.discount_percent ?? 0;
            if (!pct || subtotal <= 0) return 0;
            return Math.max(0, Math.min(subtotal, (subtotal * pct) / 100));
          })()}
          subtotal={(() => {
            const baseUnitPrice = Number(product.effective_price ?? product.price ?? 0);
            return baseUnitPrice * quantity;
          })()}
          finalTotal={(() => {
            const baseUnitPrice = Number(product.effective_price ?? product.price ?? 0);
            const subtotal = baseUnitPrice * quantity;
            const pct = couponInfo?.discount_percent ?? 0;
            const discount = pct ? Math.max(0, Math.min(subtotal, (subtotal * pct) / 100)) : 0;
            return Math.max(0, subtotal - discount);
          })()}
          isCheckingCoupon={couponChecking}
          buyerNote={buyerNote}
          onBuyerNoteChange={setBuyerNote}
        />
      )}

      {/* Report modal */}
      {reportOpen && (
        <ReportModal
          type="product"
          targetName={product.name}
          onSubmit={(reason, description) =>
            import('../services/api').then(({ submitReport: sr }) =>
              sr({
                type: 'product',
                target_id: product.id,
                target_name: product.name,
                reason,
                description,
                reporter: user ? { id: user.id, name: user.name, email: user.email } : null,
              })
            )
          }
          onClose={() => setReportOpen(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-12">
        {/* Left: image + reviews */}
        <div className="space-y-6">
          {/* Product image — max 400px, not full-screen */}
          <div className="space-y-3">
            <div className="rounded-2xl border border-gray-200 overflow-hidden bg-gray-100 aspect-[4/3] max-h-80 flex items-center justify-center">
              {mainImage ? (
                <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-sm">No image</span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((src, i) => (
                  <button key={i} type="button" onClick={() => setSelectedImageIndex(i)} className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${selectedImageIndex === i ? 'border-m4m-purple ring-2 ring-m4m-purple/30' : 'border-gray-200 hover:border-gray-300'}`}>
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Warranty */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
            <div>✔ Account warranty</div>
            <div>✔ Instant replacement if invalid</div>
            <div>✔ Seller support included</div>
          </div>

          <div className="border-t border-gray-200 my-6" />

          {/* Delivery instructions */}
          {product.delivery_instructions && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">How to use this product</h2>
              <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{product.delivery_instructions}</div>
            </div>
          )}

          <div className="border-t border-gray-200 my-6" />

          {/* Product FAQ */}
          {product.faqs && product.faqs.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Product FAQ</h2>
              <div className="space-y-4">
                {product.faqs.map((faq) => (
                  <div key={faq.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                    <p className="text-sm font-medium text-gray-900">Q: {faq.question}</p>
                    <p className="text-sm text-gray-600 mt-1">A: {faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 my-6" />

          {/* Reviews */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Reviews {reviews.length > 0 && <span className="text-gray-400 font-normal text-base">({reviews.length})</span>}</h2>
              {user && eligibleOrders.length > 0 && !reviewFormOpen && (
                <button type="button" onClick={() => { setReviewFormOpen(true); setReviewError(''); setReviewOrderId(eligibleOrders[0]?.id || ''); }} className="px-4 py-2 rounded-xl font-medium bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors text-sm">
                  Write a review
                </button>
              )}
            </div>
            {reviewFormOpen && user && eligibleOrders.length > 0 && (
              <form onSubmit={handleSubmitReview} className="rounded-2xl border border-gray-200 bg-white p-5 mb-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Leave a review</h3>
                {reviewError && <p className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{reviewError}</p>}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select your order</label>
                    <div className="space-y-2">
                      {eligibleOrders.map((o) => {
                        const items = o.order_items ?? o.orderItems ?? [];
                        const thisItem = items.find((i) => Number(i.product_id) === Number(product.id));
                        const img = thisItem?.product?.images?.[0] ?? product.images?.[0];
                        const sellerName = thisItem?.product?.seller?.name ?? seller?.name ?? 'Seller';
                        const orderRef = `M4M-${String(o.id).padStart(6, '0')}`;
                        const isSelected = reviewOrderId === String(o.id);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setReviewOrderId(String(o.id))}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${isSelected ? 'border-m4m-purple bg-purple-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                          >
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                              {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg></div>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs text-gray-500">by {sellerName}</p>
                              <p className="text-xs text-gray-400 font-mono">{orderRef} · {o.created_at ? new Date(o.created_at).toLocaleDateString() : ''}</p>
                            </div>
                            {isSelected && <svg className="w-5 h-5 text-m4m-purple flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l3-3z" clipRule="evenodd" /></svg>}
                          </button>
                        );
                      })}
                    </div>
                    {/* Hidden input for form validation */}
                    <input type="hidden" value={reviewOrderId} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setReviewRating(star)} aria-label={`${star} star`} className="p-0.5">
                          <span className={`text-2xl ${star <= reviewRating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
                    <textarea rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Share your experience..." className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-m4m-purple outline-none resize-none" />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setReviewFormOpen(false); setReviewError(''); }} className="px-4 py-2.5 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
                    <button type="submit" disabled={submittingReview} className="px-5 py-2.5 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 text-sm">{submittingReview ? 'Submitting…' : 'Submit review'}</button>
                  </div>
                </div>
              </form>
            )}
            {reviews.length > 0 ? (
              <ul className="space-y-3">
                {reviews.map((review) => (
                  <li key={review.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-sm font-semibold text-m4m-purple flex-shrink-0">
                        {(review.reviewer?.name || review.user?.name || '?').charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm">{review.reviewer?.name || review.user?.name || 'Anonymous'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-amber-400 text-sm">{'★'.repeat(Math.min(5, Math.max(0, Math.round(review.rating || 0))))}</span>
                          <span className="text-gray-300 text-sm">{'★'.repeat(5 - Math.min(5, Math.max(0, Math.round(review.rating || 0))))}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span className="text-green-600">✔ Verified purchase</span>
                          {review.created_at && (
                            <span>{new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</span>
                          )}
                        </div>
                        {review.comment && <p className="text-gray-600 mt-2 text-sm leading-relaxed">{review.comment}</p>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 py-10 text-center">
                <p className="text-gray-400 text-sm">No reviews yet. Be the first to review after purchase.</p>
              </div>
            )}
          </section>
        </div>

        {/* Right: product info + purchase */}
        <div className="space-y-5">
          {/* Title + actions */}
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{product.name}</h1>
              <div className="flex items-center gap-2 shrink-0">
                {getToken() && (
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    disabled={favToggling}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${isFavorited ? 'text-pink-600 border-pink-200 bg-pink-50 hover:bg-pink-100' : 'text-gray-400 border-gray-200 hover:border-pink-300 hover:text-pink-500'}`}
                    title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg className="w-4 h-4" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {isFavorited ? 'Saved' : 'Save'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-400 border border-gray-200 hover:border-red-300 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                  Report
                </button>
              </div>
            </div>
            {/* Product header: rating, reviews, verified, sales */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
              <span className="text-amber-400" aria-hidden>
                {'★'.repeat(Math.min(5, Math.max(0, Math.round(displayRating ?? 0))))}
                <span className="text-gray-300">{'★'.repeat(5 - Math.min(5, Math.max(0, Math.round(displayRating ?? 0))))}</span>
              </span>
              <span>({reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'})</span>
              {isSellerVerified && (
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">✔ Verified</span>
              )}
              {(Number(product.completed_orders_count ?? product.sales ?? 0) > 0) && (
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-medium">
                  🔥 {product.completed_orders_count ?? product.sales ?? 0} sold
                </span>
              )}
            </div>
            {/* Dynamic badge: Low Stock (not analytics) */}
            {(() => {
              const stockNum = Number(product.stock ?? 0);
              const isLowStock = stockNum > 0 && stockNum <= 5;
              if (!isLowStock) return null;
              return (
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-800">
                    🟢 Low Stock
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Price */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {isFlashActive ? (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-semibold text-gray-400 line-through">
                      {Number(product.price || 0).toFixed(2)} MAD
                    </p>
                    <p className="text-3xl font-extrabold text-red-600">
                      {Number(product.effective_price ?? product.price ?? 0).toFixed(2)}{' '}
                      <span className="text-xl font-semibold text-red-500">MAD</span>
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                    Limited-time flash deal
                  </p>
                </div>
              ) : (
                <p className="text-3xl font-bold text-gray-900">
                  {Number(product.price || 0).toFixed(2)} <span className="text-xl font-semibold text-gray-500">MAD</span>
                </p>
              )}
              {isBestPrice && (
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                  ⭐ Best price
                </span>
              )}
            </div>
            {settings?.showViewingIndicator && viewerText && (
              <span className="text-xs text-gray-500 mt-1">
                {viewerText}
              </span>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-sm font-medium ${
                  isOutOfStock ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {isOutOfStock ? '✕ Out of stock' : `✓ ${stock} in stock`}
              </span>
              {deliveryTime && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {deliveryTime}
                </span>
              )}
            </div>
          </div>

          {/* Feature icons */}
          {features.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {features.map((f) => {
                const feat = FEATURE_ICONS[f];
                if (!feat) return null;
                return (
                  <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-m4m-purple text-xs font-medium">
                    {feat.icon}
                    {feat.label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Vacation mode banner */}
          {seller.vacation_mode && (
            <div className="rounded-xl bg-amber-100 border border-amber-300 p-4 flex gap-3">
              <span className="text-xl shrink-0">🏖️</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-900">Seller temporarily unavailable</p>
                <p className="text-xs text-amber-800 mt-0.5">This seller is currently in vacation mode and cannot accept new orders.</p>
              </div>
            </div>
          )}

          {/* Instant delivery notice */}
          {isInstantDelivery && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex gap-3">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <div>
                <p className="text-sm font-semibold text-green-800">Instant Delivery</p>
                <p className="text-xs text-green-700 mt-0.5">This product uses Instant Delivery. Account credentials will appear automatically after purchase.</p>
              </div>
            </div>
          )}

          {/* Seller info box */}
          {sellerReminder && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">Seller note</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">{sellerReminder}</p>
              </div>
            </div>
          )}

          {/* Seller card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <Link to={`/seller/${seller.id}`} className="flex items-center gap-3 group">
                <span className="w-10 h-10 rounded-full bg-m4m-purple text-white flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                  {seller?.avatar ? (
                    <img
                      src={`${seller.avatar}?v=${seller.updated_at || Date.now()}`}
                      alt="seller avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (seller.name?.charAt(0)?.toUpperCase() || 'S')
                  )}
                </span>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm group-hover:text-m4m-purple transition-colors">{seller.name || 'Seller'}</p>
                    {isSellerVerified && <VerifiedBadge />}
                  </div>
                  <div className="mt-0.5">
                    <SellerSalesBadge completedSales={seller.completed_sales ?? seller.completedSales ?? 0} />
                  </div>
                  {sellerMemberSinceLabel && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Member since:{' '}
                      <span className="font-medium text-gray-900">{sellerMemberSinceLabel}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">View seller profile</p>
                </div>
              </Link>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${sellerOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sellerOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                {lastSeenLabel || (sellerOnline ? 'Online' : 'Last seen recently')}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              {sellerLevel != null && <div>Level {sellerLevel} seller</div>}
              {sellerSuccessRate != null && <div>{Number(sellerSuccessRate).toFixed(0)}% success rate</div>}
              {sellerCompletedOrders > 0 && <div>{sellerCompletedOrders} orders completed</div>}
            </div>
            <button type="button" onClick={handleChatSeller} disabled={chatting || !seller?.id} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium border border-gray-200 text-gray-700 hover:border-m4m-purple hover:text-m4m-purple transition-colors text-sm disabled:opacity-60 mt-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {chatting ? 'Opening chat…' : 'Chat with seller'}
            </button>
          </div>

          {/* Purchase section */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <input
              type="number"
              min={1}
              max={stock || 1}
              value={quantity}
              disabled={isOutOfStock}
              onChange={(e) => setQuantity(Math.max(1, Math.min(stock, parseInt(e.target.value, 10) || 1)))}
              className="w-24 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none disabled:bg-gray-50 disabled:text-gray-400 mb-4"
            />
            <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
              <span>Total</span>
              <span className="font-bold text-gray-900 text-base">{(Number(price || 0) * Number(quantity || 1)).toFixed(2)} MAD</span>
            </div>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <button
              type="button"
              onClick={handleBuyClick}
              disabled={buying || isOutOfStock || seller.vacation_mode}
              className="w-full py-3.5 rounded-xl font-bold text-base bg-green-600 text-white hover:bg-green-700 hover:text-white active:bg-green-700 active:text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {buying ? 'Processing…' : isOutOfStock ? 'Out of stock' : seller.vacation_mode ? 'Seller on vacation' : 'BUY NOW'}
            </button>
            {!user && (
              <p className="text-xs text-gray-400 text-center mt-2">You need to <Link to="/login" className="text-m4m-purple font-medium hover:underline">sign in</Link> to purchase</p>
            )}

            {/* Trust badges */}
            <div className="mt-4 text-sm text-gray-600 space-y-1">
              <div>🔒 Secure payment</div>
              <div>⚡ {product.delivery_type === 'instant' ? 'Instant delivery' : 'Delivery as described'}</div>
              <div>🛡 Buyer protection</div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar products */}
      {similarProducts.length > 0 && (
        <section className="mt-12 pt-10 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-5">More from this seller</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {similarProducts.map((p) => (
              <div key={p.id} className="transition transform duration-200 hover:scale-105 hover:shadow-xl rounded-xl">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommended products */}
      {recommendedProducts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-5">Recommended for you</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recommendedProducts.map((p) => (
              <div key={p.id} className="transition transform duration-200 hover:scale-105 hover:shadow-xl rounded-xl">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
