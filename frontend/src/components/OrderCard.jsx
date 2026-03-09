import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrderStatusStyle } from '../lib/orderStatus';
import { VerifiedBadge, SellerSalesBadge } from './SellerBadges';

function ConfirmDeliveryModal({ onConfirm, onCancel, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <div className="rounded-2xl bg-white shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Confirm Delivery</h3>
        <p className="text-sm text-gray-600 text-center mb-1">
          By confirming, you acknowledge that you have received your order and are satisfied with the delivery.
        </p>
        <p className="text-xs text-gray-400 text-center mb-6">
          Note: Orders may be automatically confirmed after a period of time if no action is taken.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-70 transition-colors"
          >
            {isLoading ? 'Confirming…' : 'Yes, Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderCard({ order, onConfirmDelivery, confirmingOrderId, onChatSeller, chattingSellerId }) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const items = order.order_items ?? order.orderItems ?? [];
  const style = getOrderStatusStyle(order.status);
  const statusLower = (order.status || '').toLowerCase();
  const isDelivered = statusLower === 'delivered';
  const isConfirming = confirmingOrderId === order.id;

  // M4M-XXXXXX format
  const orderRef = `M4M-${String(order.id).padStart(6, '0')}`;

  const firstItem = items[0] ?? null;
  const firstProduct = firstItem?.product ?? null;
  const firstProductId = firstProduct?.id ?? null;
  const productTitle = firstProduct?.name ?? (items.length > 1 ? `${items.length} items` : 'Order');

  const sellerId = items.map((i) => i.product?.seller?.id).find(Boolean);
  const sellerName = items.map((i) => i.product?.seller?.name).find(Boolean) ?? '—';
  const sellerObj = items.map((i) => i.product?.seller).find(Boolean);
  const sellerIsVerified = sellerObj?.is_verified === true || sellerObj?.is_verified === 1;
  const sellerCompletedSales = sellerObj?.completed_sales ?? sellerObj?.completedSales ?? 0;
  const isChatting = chattingSellerId === sellerId;

  const price = Number(order.total_amount ?? 0);
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : '—';

  const handleChatSellerClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isChatting || !onChatSeller || !sellerId) return;
    onChatSeller(sellerId);
  };

  const handleConfirmRequest = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirmModal(true);
  };

  const handleConfirmConfirm = () => {
    setShowConfirmModal(false);
    onConfirmDelivery(order.id);
  };

  return (
    <>
      {showConfirmModal && (
        <ConfirmDeliveryModal
          onConfirm={handleConfirmConfirm}
          onCancel={() => setShowConfirmModal(false)}
          isLoading={isConfirming}
        />
      )}
      <li className={`rounded-xl border border-gray-200 border-l-4 ${style.border} bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden`}>
        <Link to={`/orders/${order.id}`} className="block p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="font-mono text-sm font-bold text-gray-500">{orderRef}</span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${style.badge}`}>
              {style.label}
            </span>
          </div>

          {/* Product name */}
          {firstProductId ? (
            <p
              className="font-semibold text-gray-900 line-clamp-1 hover:text-m4m-purple transition-colors"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/product/${firstProductId}`; }}
            >
              {productTitle}
            </p>
          ) : (
            <p className="font-semibold text-gray-900 line-clamp-1">{productTitle}</p>
          )}
          {items.length > 1 && (
            <p className="text-xs text-gray-400 mt-0.5">+{items.length - 1} more items</p>
          )}

          {/* Seller */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-gray-500">Seller:</span>
            {sellerId ? (
              <span
                className="text-sm font-medium text-m4m-purple cursor-pointer"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/seller/${sellerId}`; }}
              >
                {sellerName}
              </span>
            ) : (
              <span className="text-sm text-gray-600">{sellerName}</span>
            )}
            {sellerIsVerified && <VerifiedBadge />}
            <SellerSalesBadge completedSales={sellerCompletedSales} />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-lg font-bold text-gray-900">{price.toFixed(2)} MAD</span>
            <span className="text-xs text-gray-400">{orderDate}</span>
          </div>

          {isDelivered && (
            <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-orange-50 border border-orange-200">
              <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-orange-700 font-medium">
                Your order has been delivered. Please confirm receipt.
              </p>
            </div>
          )}
        </Link>

        {/* Action buttons */}
        {((sellerId && onChatSeller) || (isDelivered && onConfirmDelivery)) && (
          <div className="px-4 md:px-5 pb-4 pt-0 flex flex-wrap items-center gap-2 border-t border-gray-100">
            {sellerId && onChatSeller && (
              <button
                type="button"
                onClick={handleChatSellerClick}
                disabled={isChatting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-70 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {isChatting ? 'Opening…' : 'Chat Seller'}
              </button>
            )}
            {isDelivered && onConfirmDelivery && (
              <button
                type="button"
                onClick={handleConfirmRequest}
                disabled={isConfirming}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-70 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isConfirming ? 'Confirming…' : 'Confirm Delivery'}
              </button>
            )}
          </div>
        )}
      </li>
    </>
  );
}
