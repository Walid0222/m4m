import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getToken, getOrder, confirmOrderDelivery, openDispute, updateSellerOrderNote, createReview } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import OrderProgressTracker from '../components/OrderProgressTracker';
import { useRefresh } from '../contexts/RefreshContext';

export default function OrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tick } = useRefresh();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('product_invalid');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState('');
  const [sellerNoteEditing, setSellerNoteEditing] = useState(false);
  const [sellerNoteDraft, setSellerNoteDraft] = useState('');
  const [sellerNoteSaving, setSellerNoteSaving] = useState(false);
  const [sellerNoteError, setSellerNoteError] = useState('');
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [autoConfirmText, setAutoConfirmText] = useState('');

  useEffect(() => {
    if (!id || !getToken()) {
      setLoading(false);
      setError('Log in to view order.');
      return;
    }
    let cancelled = false;
    async function fetchOrder() {
      try {
        const data = await getOrder(id);
        if (!cancelled) setOrder(data);
        if (!cancelled) setError('');
      } catch (e) {
        if (!cancelled) setError(e.status === 403 ? 'Access denied.' : 'Order not found.');
        if (!cancelled) setOrder(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchOrder();
    return () => { cancelled = true; };
  }, [id]);

  // Auto-refresh order details when global refresh tick advances
  useEffect(() => {
    if (!tick) return;
    if (!id || !getToken()) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getOrder(id);
        if (!cancelled) {
          setOrder(data);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.status === 403 ? 'Access denied.' : 'Order not found.');
          setOrder(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [tick, id]);

  // Live auto-confirmation countdown based on auto_confirm_at
  useEffect(() => {
    if (!order?.auto_confirm_at) {
      setAutoConfirmText('');
      return;
    }
    const target = new Date(order.auto_confirm_at);
    const update = () => {
      const now = new Date();
      const diffMs = target.getTime() - now.getTime();
      if (diffMs <= 0) {
        setAutoConfirmText('');
        return;
      }
      const totalMinutes = Math.floor(diffMs / 60000);
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;
      const parts = [];
      if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
      if (hours > 0 || days > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
      parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
      setAutoConfirmText(parts.join(' '));
    };
    update();
    const idTimer = setInterval(update, 60000);
    return () => clearInterval(idTimer);
  }, [order?.auto_confirm_at]);

  const handleConfirmDelivery = async () => {
    if (!order || confirming) return;
    setConfirming(true);
    setError('');
    try {
      const updated = await confirmOrderDelivery(order.id);
      setOrder(updated);
    } catch (e) {
      setError(e.message || 'Could not confirm delivery.');
    } finally {
      setConfirming(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenDispute = async (e) => {
    e.preventDefault();
    if (!order || disputeSubmitting) return;
    setDisputeSubmitting(true);
    setDisputeError('');
    try {
      const dispute = await openDispute({
        order_id: order.id,
        reason: disputeReason,
        description: disputeDesc,
      });
      setDisputeOpen(false);
      if (dispute?.id) {
        navigate(`/disputes/${dispute.id}`);
        return;
      }
      const updated = await getOrder(id);
      setOrder(updated);
    } catch (err) {
      setDisputeError(err.message || 'Could not open dispute.');
    } finally {
      setDisputeSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-m4m-gray-500">
        Loading order…
      </div>
    );
  }
  if (error && !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-m4m-gray-500">{error}</p>
        <Link to="/orders" className="mt-4 inline-block text-m4m-purple font-medium hover:underline">
          Back to Orders
        </Link>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-m4m-gray-500">{error || 'Order not found.'}</p>
        <Link to="/orders" className="mt-4 inline-block text-m4m-purple font-medium hover:underline">
          Back to Orders
        </Link>
      </div>
    );
  }

  const items = order.order_items ?? order.orderItems ?? [];
  const status = (order.status || '').toLowerCase();
  const isDelivered = status === 'delivered';
  const isCompleted = status === 'completed';
  const isDisputed = status === 'disputed' || status === 'dispute';
  const isBuyer = !user?.is_seller || order.user_id === user?.id;
  // Only allow disputes after delivery or completion; hide for finalized escrow.
  const canDispute =
    isBuyer &&
    (status === 'delivered' || status === 'completed') &&
    !isDisputed &&
    order.escrow_status !== 'released' &&
    order.escrow_status !== 'refunded';

  const isSellerOfOrder = user?.is_seller && Number(order.seller_id) === Number(user?.id);

  const handleSaveSellerNote = async () => {
    if (!order || sellerNoteSaving) return;
    setSellerNoteSaving(true);
    setSellerNoteError('');
    try {
      const updated = await updateSellerOrderNote(order.id, sellerNoteDraft ?? '');
      setOrder(updated);
      setSellerNoteEditing(false);
      setSellerNoteDraft('');
    } catch (err) {
      setSellerNoteError(err.message || 'Failed to save note.');
    } finally {
      setSellerNoteSaving(false);
    }
  };

  const productId = items[0]?.product_id ?? items[0]?.product?.id;
  const canLeaveReview = isCompleted && isBuyer && !order.has_review && productId;

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!order || !productId || submittingReview || !getToken()) return;
    setReviewError('');
    setSubmittingReview(true);
    try {
      await createReview(productId, {
        order_id: order.id,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });
      setOrder((prev) => prev ? { ...prev, has_review: true } : prev);
      setReviewFormOpen(false);
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Delivery content: order-level (instant delivery stores here) or per item
  const orderDeliveryContent = order.delivery_content ?? null;
  const itemCredentials = items.map((i) => i.delivery_credentials).filter(Boolean).join('\n');
  const deliveryContent = orderDeliveryContent || itemCredentials || null;

  // Delivery type from order or first item's product
  const deliveryType = order.delivery_type
    ?? items[0]?.product?.delivery_type
    ?? 'manual';
  const deliveryTime = items[0]?.product?.delivery_time ?? null;

  const hasCredentials = Boolean(deliveryContent);
  const showDeliverySection = isDelivered || isCompleted || hasCredentials;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/orders" className="text-sm text-m4m-purple hover:underline mb-6 inline-block">
        ← Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-m4m-black">
          Order #{order.order_number ?? order.id}
        </h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusBadge(status)}`}>
          {status}
        </span>
      </div>

      <OrderProgressTracker status={status} />

      {/* Confirm delivery + auto-confirm countdown (buyer view) */}
      {isDelivered && isBuyer && (
        <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
          <p className="text-sm text-green-800 mb-3 font-medium">
            Your order has been delivered. Please review the delivery before confirming.
          </p>
          <button
            type="button"
            onClick={handleConfirmDelivery}
            disabled={confirming}
            className="px-5 py-2.5 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {confirming ? 'Confirming…' : 'Confirm Delivery'}
          </button>
          {autoConfirmText && (
            <div className="mt-3 text-xs sm:text-sm text-green-900">
              <p className="font-medium">Auto confirmation in</p>
              <p className="mt-0.5 font-semibold">{autoConfirmText}</p>
              <p className="mt-0.5 text-green-800">
                If you do nothing, the order will automatically be confirmed after 3 days.
              </p>
            </div>
          )}
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {/* Disputed status banner — buyer view */}
      {isDisputed && isBuyer && (
        <div className={`mb-6 p-4 rounded-xl border text-sm ${
          order.dispute?.admin_decision === 'refund_buyer'
            ? 'bg-green-50 border-green-200 text-green-800'
            : order.dispute?.admin_decision === 'release_seller'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {!order.dispute?.admin_decision ? (
            <>
              <p className="font-semibold">Dispute submitted</p>
              <p className="mt-0.5">The funds are secured in escrow while our team reviews the case.</p>
            </>
          ) : (
            <>
              <p className="font-semibold mb-1">Our team reviewed the dispute.</p>
              <p className="mb-0.5">
                <span className="font-medium">Decision:</span>{' '}
                {order.dispute?.admin_decision === 'refund_buyer' ? 'Buyer refunded' : 'Seller payment released'}
              </p>
              {order.dispute?.admin_note && (
                <p className="mb-0.5">
                  <span className="font-medium">Reason:</span> {order.dispute.admin_note}
                </p>
              )}
            </>
          )}
          <Link to="/disputes" className="mt-2 inline-block text-xs font-semibold hover:underline">View dispute status →</Link>
        </div>
      )}

      {/* Disputed status banner — seller view */}
      {isDisputed && isSellerOfOrder && (
        <div className={`mb-6 p-4 rounded-xl border text-sm ${
          order.escrow_status === 'released'
            ? 'bg-green-50 border-green-200 text-green-800'
            : order.escrow_status === 'refunded'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {!order.dispute?.admin_decision ? (
            <>
              <p className="font-semibold">Status: Under dispute</p>
              <p className="mt-0.5">Escrow amount: {Number(order.escrow_amount ?? order.total_amount ?? 0).toFixed(2)} MAD</p>
              <p className="mt-2">
                This order is currently under dispute. Funds are temporarily locked until the case is reviewed by the M4M administration.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold mb-1">Dispute resolved</p>
              <p className="mt-0.5">Escrow amount: {Number(order.escrow_amount ?? order.total_amount ?? 0).toFixed(2)} MAD</p>
              <p className="mb-0.5">
                <span className="font-medium">Decision:</span>{' '}
                {order.dispute?.admin_decision === 'refund_buyer' ? 'Buyer refunded' : 'Seller payment released'}
              </p>
              {order.dispute?.admin_note && (
                <p className="mb-0.5">
                  <span className="font-medium">Reason:</span> {order.dispute.admin_note}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Open Dispute button */}
      {canDispute && !disputeOpen && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setDisputeOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Open Dispute
          </button>
          <p className="text-xs text-gray-400 mt-1">Use this if the delivery is wrong or not working.</p>
        </div>
      )}

      {/* Dispute form */}
      {disputeOpen && (
        <form onSubmit={handleOpenDispute} className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <h3 className="font-semibold text-red-800 mb-4">Open a Dispute</h3>
          {disputeError && <p className="text-sm text-red-600 mb-3">{disputeError}</p>}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reason</label>
            <select
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="product_invalid">Product is invalid / not working</option>
              <option value="account_not_working">Account credentials don&apos;t work</option>
              <option value="wrong_delivery">Wrong product delivered</option>
              <option value="seller_did_not_deliver">Seller did not deliver</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Description (optional)</label>
            <textarea
              value={disputeDesc}
              onChange={(e) => setDisputeDesc(e.target.value)}
              rows={3}
              placeholder="Describe the issue..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={disputeSubmitting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {disputeSubmitting ? 'Submitting…' : 'Submit Dispute'}
            </button>
            <button
              type="button"
              onClick={() => { setDisputeOpen(false); setDisputeError(''); }}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Leave review (completed order, buyer, no review yet) */}
      {canLeaveReview && !reviewFormOpen && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => { setReviewFormOpen(true); setReviewError(''); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors"
          >
            <span>★</span>
            Leave review
          </button>
        </div>
      )}
      {canLeaveReview && reviewFormOpen && (
        <form onSubmit={handleSubmitReview} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Leave a review</h3>
          {reviewError && <p className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{reviewError}</p>}
          <div className="space-y-4">
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
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-m4m-purple outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setReviewFormOpen(false); setReviewError(''); }}
                className="px-4 py-2.5 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReview}
                className="px-5 py-2.5 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 text-sm"
              >
                {submittingReview ? 'Submitting…' : 'Submit review'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── Delivery information section ─────────────────────────────────── */}
      {showDeliverySection && (
        <div className={`mb-6 rounded-xl border overflow-hidden ${hasCredentials ? 'border-green-300 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className={`px-4 py-3 flex items-center justify-between ${hasCredentials ? 'bg-green-100 border-b border-green-200' : 'bg-amber-100 border-b border-amber-200'}`}>
            <span className={`font-semibold text-sm ${hasCredentials ? 'text-green-900' : 'text-amber-900'}`}>
              {hasCredentials ? '🔑 Delivery Information' : '⏳ Waiting for Delivery'}
            </span>
            {deliveryType === 'instant' && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                ⚡ Instant Delivery
              </span>
            )}
          </div>

          <div className="px-4 py-4">
            {hasCredentials ? (
              <>
                <p className="text-xs text-green-700 mb-3">
                  Keep these credentials safe. Do not share them with anyone.
                </p>
                <div className="relative">
                  <pre className="bg-white rounded-lg border border-green-200 p-4 text-sm font-mono text-gray-900 whitespace-pre-wrap break-all select-all">
                    {deliveryContent}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy(deliveryContent)}
                    className="absolute top-2 right-2 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                {/* Per-item credentials if multiple products */}
                {items.length > 1 && items.some((i) => i.delivery_credentials) && (
                  <div className="mt-4 space-y-3">
                    {items.map((item) => item.delivery_credentials ? (
                      <div key={item.id} className="rounded-lg border border-green-200 overflow-hidden">
                        <div className="bg-green-100 px-3 py-2 text-xs font-medium text-green-900">
                          {item.product?.name ?? 'Product'}
                        </div>
                        <pre className="p-3 text-sm font-mono text-gray-900 whitespace-pre-wrap bg-white">
                          {item.delivery_credentials}
                        </pre>
                      </div>
                    ) : null)}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Seller will deliver soon.</p>
                <p className="text-amber-700">
                  {deliveryTime
                    ? `Expected delivery time: ${deliveryTime}`
                    : 'The seller will send your delivery details shortly.'}
                </p>
                <p className="mt-2 text-xs text-amber-600">
                  You will be notified when the delivery is ready.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Order items ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-m4m-gray-200 overflow-hidden">
        <ul className="divide-y divide-m4m-gray-200">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3 flex justify-between items-center">
              <div>
                <p className="font-medium text-m4m-black">{item.product?.name ?? 'Product'}</p>
                <p className="text-sm text-m4m-gray-500">
                  Qty: {item.quantity} × {Number(item.unit_price ?? 0).toFixed(2)} MAD
                </p>
                {item.product?.delivery_type && (
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${item.product.delivery_type === 'instant' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {item.product.delivery_type === 'instant' ? 'Instant' : 'Manual'}
                  </span>
                )}
              </div>
              <p className="font-semibold">{Number(item.total_price ?? 0).toFixed(2)} MAD</p>
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 bg-m4m-gray-100 font-bold text-m4m-black flex justify-between">
          <span>Total</span>
          <span>{Number(order.total_amount ?? 0).toFixed(2)} MAD</span>
        </div>
      </div>

      {/* Order Notes */}
      <div className="mt-6 rounded-xl border border-m4m-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-m4m-gray-100 border-b border-m4m-gray-200">
          <h3 className="font-semibold text-m4m-black">Order Notes</h3>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-m4m-gray-500 mb-1">Buyer Note</p>
            <p className="text-sm text-m4m-black">
              {order.buyer_note ? order.buyer_note : <span className="text-m4m-gray-400 italic">None</span>}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-m4m-gray-500 mb-1">Seller Note</p>
            {isSellerOfOrder ? (
              <div>
                {sellerNoteEditing ? (
                  <div>
                    <textarea
                      value={sellerNoteDraft}
                      onChange={(e) => setSellerNoteDraft(e.target.value)}
                      placeholder="e.g. Activation instructions included."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-m4m-purple outline-none resize-none mb-2"
                    />
                    {sellerNoteError && <p className="text-sm text-red-600 mb-2">{sellerNoteError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveSellerNote}
                        disabled={sellerNoteSaving}
                        className="px-4 py-2 rounded-lg bg-m4m-purple text-white text-sm font-medium hover:bg-m4m-purple-dark disabled:opacity-60"
                      >
                        {sellerNoteSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSellerNoteEditing(false); setSellerNoteDraft(''); setSellerNoteError(''); }}
                        className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-m4m-black">
                      {order.seller_note ? order.seller_note : <span className="text-m4m-gray-400 italic">None</span>}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setSellerNoteEditing(true); setSellerNoteDraft(order.seller_note ?? ''); }}
                      className="mt-2 text-xs font-medium text-m4m-purple hover:underline"
                    >
                      Add / Edit note
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-m4m-black">
                {order.seller_note ? order.seller_note : <span className="text-m4m-gray-400 italic">None</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Completed info */}
      {isCompleted && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600">
          Order completed. Funds have been released to the seller.
        </div>
      )}
    </div>
  );
}

function statusBadge(status) {
  const map = {
    pending: 'bg-gray-100 text-gray-700',
    processing: 'bg-blue-100 text-blue-700',
    delivered: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    dispute: 'bg-red-100 text-red-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700';
}
