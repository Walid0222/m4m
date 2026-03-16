import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getOrders, getToken, paginatedItems, createReview } from '../services/api';

const STORAGE_KEY = 'skipped_review_orders';
// Delay before showing popup: 12 hours (order must be completed and older than this)
const REVIEW_DELAY = 12 * 60 * 60 * 1000;

function getSkippedOrderIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((id) => Number(id)).filter((n) => !Number.isNaN(n)) : [];
  } catch {
    return [];
  }
}

function addSkippedOrderId(orderId) {
  const ids = getSkippedOrderIds();
  const id = Number(orderId);
  if (Number.isNaN(id) || ids.includes(id)) return;
  ids.push(id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export default function ReviewReminderPopup() {
  const { user } = useAuth();
  const [orderToRemind, setOrderToRemind] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const showPopupTimeoutRef = useRef(null);

  const findEligibleOrder = useCallback(async () => {
    if (!user || !getToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setOrderToRemind(null);
    setShowPopup(false);
    try {
      const res = await getOrders({ per_page: 50 });
      const orders = paginatedItems(res) ?? [];
      const skipped = getSkippedOrderIds();
      // Only orders that are: completed, not yet reviewed, not skipped, and older than REVIEW_DELAY
      const eligible = orders.filter((o) => {
        const status = (o.status || '').toLowerCase();
        if (status !== 'completed') return false;
        if (o.has_review === true) return false;
        if (skipped.includes(Number(o.id))) return false;
        const createdAt = o.created_at ? new Date(o.created_at).getTime() : 0;
        const orderAge = Date.now() - createdAt;
        if (orderAge <= REVIEW_DELAY) return false;
        const items = o.order_items ?? o.orderItems ?? [];
        if (!items.length) return false;
        return true;
      });

      const first = eligible[0] ?? null;
      if (first) {
        if (showPopupTimeoutRef.current) {
          clearTimeout(showPopupTimeoutRef.current);
          showPopupTimeoutRef.current = null;
        }
        setOrderToRemind(first);
        setRating(5);
        setComment('');
        setReviewError('');
        setShowPopup(false);
        showPopupTimeoutRef.current = setTimeout(() => {
          showPopupTimeoutRef.current = null;
          setShowPopup(true);
        }, REVIEW_DELAY);
      }
    } catch {
      // don't show popup on fetch error
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    findEligibleOrder();
    return () => {
      if (showPopupTimeoutRef.current) {
        clearTimeout(showPopupTimeoutRef.current);
        showPopupTimeoutRef.current = null;
      }
    };
  }, [findEligibleOrder]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    const items = orderToRemind?.order_items ?? orderToRemind?.orderItems ?? [];
    const firstItem = items?.[0];
    const productId = firstItem?.product?.id ?? firstItem?.product_id;
    if (!orderToRemind?.id || !productId || submitting || !getToken()) return;
    setReviewError('');
    setSubmitting(true);
    try {
      await createReview(productId, {
        order_id: orderToRemind.id,
        rating,
        comment: comment.trim() || null,
      });
      addSkippedOrderId(orderToRemind.id);
      setShowPopup(false);
      setOrderToRemind(null);
    } catch (err) {
      setReviewError(err.message || err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (orderToRemind?.id) addSkippedOrderId(orderToRemind.id);
    setShowPopup(false);
    setOrderToRemind(null);
  };

  if (loading || !showPopup || !orderToRemind) return null;

  const items = orderToRemind.order_items ?? orderToRemind.orderItems ?? [];
  const firstItem = items?.[0];
  const product = firstItem?.product;
  const productName = product?.name ?? 'Your order';
  const productImage = product?.images?.[0] ?? null;
  const sellerName = product?.seller?.name ?? 'Seller';
  const unitPrice = firstItem?.unit_price != null ? Number(firstItem.unit_price) : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="review-reminder-title">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 id="review-reminder-title" className="text-lg font-semibold text-gray-900 mb-4">
          How was your purchase?
        </h2>

        <div className="flex gap-4 mb-4">
          <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
            {productImage ? (
              <img src={productImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 truncate">{productName}</p>
            <p className="text-sm text-gray-500 mt-0.5">by {sellerName}</p>
            {unitPrice != null && (
              <p className="text-sm font-semibold text-m4m-purple mt-1">{Math.round(unitPrice)} MAD</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmitReview} className="space-y-4">
          {reviewError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{reviewError}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} star`}
                  className="p-0.5 focus:outline-none focus:ring-2 focus:ring-m4m-purple focus:ring-offset-1 rounded"
                >
                  <span className={`text-2xl ${star <= rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 px-4 py-2.5 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
