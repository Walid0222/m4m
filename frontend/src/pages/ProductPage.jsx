import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getProduct,
  createOrder,
  createConversation,
  createReview,
  getWallet,
  getOrders,
  getToken,
  paginatedItems,
} from '../services/api';
import { isSellerOnline } from '../lib/sellerOnline';

function getRating(product) {
  const r = product?.rating;
  if (typeof r === 'number' && r >= 0) return r;
  if (r != null) return parseFloat(r) || 0;
  return null;
}

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    async function fetchProduct() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getProduct(id);
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

  // Fetch user's orders to check if they can leave a review
  useEffect(() => {
    if (!user || !getToken() || !product?.id) {
      setUserOrders([]);
      return;
    }
    let cancelled = false;
    getOrders({ per_page: 100 })
      .then((res) => {
        if (cancelled) return;
        const orders = paginatedItems(res) ?? [];
        setUserOrders(Array.isArray(orders) ? orders : []);
      })
      .catch(() => {
        if (!cancelled) setUserOrders([]);
      });
    return () => { cancelled = true; };
  }, [user, product?.id]);

  const eligibleOrders = useMemo(() => {
    if (!product?.id || !userOrders.length) return [];
    const reviewedOrderIds = new Set(
      (product.reviews ?? [])
        .filter((r) => Number(r.user_id) === Number(user?.id))
        .map((r) => r.order_id)
    );
    return userOrders.filter((o) => {
      if ((o.status || '').toLowerCase() !== 'completed') return false;
      if (reviewedOrderIds.has(o.id)) return false;
      const items = o.order_items ?? o.orderItems ?? [];
      return items.some((i) => Number(i.product_id) === Number(product.id));
    });
  }, [product?.id, product?.reviews, user?.id, userOrders]);

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
      setProduct((prev) =>
        prev
          ? {
              ...prev,
              reviews: [...(prev.reviews ?? []), { ...newReview, reviewer: newReview.reviewer || { name: user.name } }],
            }
          : prev
      );
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

  const handleBuy = async () => {
    if (!user || !getToken()) {
      navigate('/login');
      return;
    }
    if (!product || quantity < 1) return;

    const currentStock = Number(product.stock ?? 0);
    if (currentStock <= 0) {
      setError('Out of stock.');
      return;
    }

    setError('');
    setBuying(true);
    try {
      const wallet = await getWallet();
      const balance = Number(wallet?.balance ?? 0);
      const total = quantity * Number(product.price ?? 0);
      if (balance < total) {
        setError('Insufficient wallet balance.');
        setBuying(false);
        return;
      }
      await createOrder([{ product_id: product.id, quantity }]);
      // Optimistically decrease local stock so UI reflects the purchase
      setProduct((prev) =>
        prev
          ? {
              ...prev,
              stock: Math.max(0, Number(prev.stock ?? 0) - quantity),
            }
          : prev
      );
      navigate('/orders');
    } catch (err) {
      setError(err.message || 'Purchase failed');
    } finally {
      setBuying(false);
    }
  };

  const handleChatSeller = async () => {
    const sellerData = product?.seller;
    if (!user || !getToken()) {
      navigate('/login', { state: { from: `/product/${id}` } });
      return;
    }
    if (!product || !sellerData?.id) return;
    if (sellerData.id === user.id) return;
    setError('');
    setChatting(true);
    try {
      const conversation = await createConversation({
        other_user_id: sellerData.id,
        product_id: product.id,
      });
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
          <div className="rounded-xl bg-m4m-gray-100 aspect-square animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-m4m-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-5 bg-m4m-gray-100 rounded w-1/2 animate-pulse" />
            <div className="h-10 bg-m4m-gray-200 rounded w-24 animate-pulse" />
            <div className="h-4 bg-m4m-gray-100 rounded w-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-m4m-gray-500 mb-4">Product not found.</p>
        <Link to="/" className="text-m4m-purple font-medium hover:underline">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const seller = product.seller || {};
  const price = Number(product.price || 0);
  const stock = Number(product.stock ?? 0);
  const isOutOfStock = stock <= 0;
  const rating = getRating(product);
  const reviews = product.reviews ?? [];
  const avgRatingFromReviews =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length
      : null;
  const displayRating = rating != null ? rating : avgRatingFromReviews ?? null;
  const sellerOnline = isSellerOnline(seller);
  const images = product.images && product.images.length > 0 ? product.images : [];
  const mainImage = images[selectedImageIndex] || images[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product image(s) */}
        <div className="space-y-3">
          <div className="rounded-xl border border-m4m-gray-200 overflow-hidden bg-m4m-gray-100 aspect-square flex items-center justify-center">
            {mainImage ? (
              <img
                src={mainImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-m4m-gray-500">No image</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImageIndex(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImageIndex === i
                      ? 'border-m4m-purple ring-2 ring-m4m-purple/30'
                      : 'border-m4m-gray-200 hover:border-m4m-gray-300'
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-m4m-black">
            {product.name}
          </h1>

          {/* Seller profile + online status */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              to={`/seller/${seller.id}`}
              className="flex items-center gap-3 rounded-xl border border-m4m-gray-200 bg-white p-3 hover:border-m4m-purple hover:shadow-sm transition-all w-full sm:w-auto"
            >
              <span className="w-10 h-10 rounded-full bg-m4m-purple text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {seller.name?.charAt(0)?.toUpperCase() || 'S'}
              </span>
              <div className="text-left min-w-0">
                <p className="font-medium text-m4m-black truncate">{seller.name || 'Seller'}</p>
                <p className="text-xs text-m4m-gray-500">View profile</p>
              </div>
            </Link>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                sellerOnline ? 'bg-green-100 text-green-800' : 'bg-m4m-gray-100 text-m4m-gray-600'
              }`}
              title={sellerOnline ? 'Seller is online' : 'Seller is offline'}
            >
              <span
                className={`w-2 h-2 rounded-full ${sellerOnline ? 'bg-green-500' : 'bg-m4m-gray-400'}`}
                aria-hidden
              />
              {sellerOnline ? 'Online' : 'Offline'}
            </span>
            <button
              type="button"
              onClick={handleChatSeller}
              disabled={chatting || !seller?.id}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-white border border-m4m-gray-200 text-m4m-black hover:border-m4m-purple hover:text-m4m-purple transition-colors disabled:opacity-60"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {chatting ? 'Opening…' : 'Chat seller'}
            </button>
          </div>

          {/* Rating */}
          <div className="mt-4 flex items-center gap-2" aria-label={displayRating != null ? `Rating: ${displayRating.toFixed(1)} out of 5` : 'No rating yet'}>
            <span className="text-amber-500" aria-hidden>★</span>
            <span className="text-m4m-gray-700 font-medium">
              {displayRating != null ? `${displayRating.toFixed(1)}` : 'No rating yet'}
            </span>
            {reviews.length > 0 && (
              <span className="text-sm text-m4m-gray-500">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
            )}
          </div>

          {/* Price & stock */}
          <p className="mt-4 text-2xl font-bold text-m4m-black">${price.toFixed(2)}</p>
          <p className="mt-1 text-sm text-m4m-gray-500">
            In stock: {stock}
          </p>
          {isOutOfStock && (
            <p className="mt-1 text-sm font-medium text-red-600">
              Out of stock
            </p>
          )}

          {/* Description */}
          {product.description && (
            <div className="mt-6 pt-6 border-t border-m4m-gray-200">
              <h2 className="text-lg font-semibold text-m4m-black mb-2">Description</h2>
              <p className="text-m4m-gray-700 whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          {/* Buy section */}
          <div className="mt-8 pt-6 border-t border-m4m-gray-200">
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-m4m-gray-700">Quantity</span>
                <input
                  type="number"
                  min={1}
                  max={stock}
                  value={quantity}
                  disabled={isOutOfStock}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Math.min(stock, parseInt(e.target.value, 10) || 1)))
                  }
                  className="w-24 px-3 py-2.5 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none disabled:bg-m4m-gray-50 disabled:text-m4m-gray-400"
                />
              </label>
              <button
                type="button"
                onClick={handleBuy}
                disabled={buying || isOutOfStock}
                className="px-8 py-3 rounded-lg font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {buying ? 'Processing…' : 'BUY'}
              </button>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Reviews section */}
      <section className="mt-12 pt-10 border-t border-m4m-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-m4m-black">Reviews</h2>
          {user && eligibleOrders.length > 0 && !reviewFormOpen && (
            <button
              type="button"
              onClick={() => { setReviewFormOpen(true); setReviewError(''); setReviewOrderId(eligibleOrders[0]?.id || ''); }}
              className="px-4 py-2 rounded-xl font-medium bg-m4m-purple text-white hover:bg-m4m-purple-light transition-colors"
            >
              Write a review
            </button>
          )}
        </div>

        {/* Review form for eligible buyers */}
        {reviewFormOpen && user && eligibleOrders.length > 0 && (
          <form
            onSubmit={handleSubmitReview}
            className="rounded-xl border border-m4m-gray-200 bg-white p-6 mb-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-m4m-black mb-4">Leave a review</h3>
            {reviewError && (
              <p className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{reviewError}</p>
            )}
            <div className="space-y-4 max-w-xl">
              <div>
                <label htmlFor="review-order" className="block text-sm font-medium text-m4m-gray-700 mb-1">
                  Order
                </label>
                <select
                  id="review-order"
                  value={reviewOrderId}
                  onChange={(e) => setReviewOrderId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                >
                  <option value="">Select order</option>
                  {eligibleOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      Order #{o.id} – {o.created_at ? new Date(o.created_at).toLocaleDateString() : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-m4m-gray-700 mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 focus:outline-none"
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      <span
                        className={`text-2xl ${
                          star <= reviewRating ? 'text-amber-500' : 'text-m4m-gray-200'
                        }`}
                      >
                        ★
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="review-comment" className="block text-sm font-medium text-m4m-gray-700 mb-1">
                  Comment (optional)
                </label>
                <textarea
                  id="review-comment"
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience..."
                  className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none resize-none placeholder-m4m-gray-400"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setReviewFormOpen(false); setReviewError(''); }}
                  className="px-4 py-2.5 rounded-lg font-medium border border-m4m-gray-200 text-m4m-gray-700 hover:bg-m4m-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-6 py-2.5 rounded-lg font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover disabled:opacity-60"
                >
                  {submittingReview ? 'Submitting…' : 'Submit review'}
                </button>
              </div>
            </div>
          </form>
        )}

        {product.reviews && product.reviews.length > 0 ? (
          <ul className="space-y-4">
            {product.reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-xl border border-m4m-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-full bg-m4m-purple/20 flex items-center justify-center text-sm font-semibold text-m4m-purple flex-shrink-0">
                    {(review.reviewer?.name || review.user?.name || '?').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-m4m-black">
                      {review.reviewer?.name || review.user?.name || 'Anonymous'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-amber-500" aria-label={`${review.rating || 0} out of 5 stars`}>
                        {'★'.repeat(Math.min(5, Math.max(0, Math.round(review.rating || 0))))}
                        {'☆'.repeat(5 - Math.min(5, Math.max(0, Math.round(review.rating || 0))))}
                      </span>
                      {review.created_at && (
                        <span className="text-sm text-m4m-gray-500">
                          {new Date(review.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    {review.comment && (
                      <p className="text-m4m-gray-700 mt-2 text-sm leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-m4m-gray-200 bg-m4m-gray-50 py-12 text-center">
            <p className="text-m4m-gray-500">
              {user
                ? 'No reviews yet. Complete a purchase and confirm delivery to leave a review.'
                : 'No reviews yet. Sign in and complete a purchase to leave a review.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
