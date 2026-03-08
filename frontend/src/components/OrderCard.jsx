import { Link } from 'react-router-dom';
import { getOrderStatusStyle } from '../lib/orderStatus';

export default function OrderCard({ order, onConfirmDelivery, confirmingOrderId, onChatSeller, chattingSellerId }) {
  const items = order.order_items ?? order.orderItems ?? [];
  const style = getOrderStatusStyle(order.status);
  const statusLower = (order.status || '').toLowerCase();
  const isDelivered = statusLower === 'delivered';
  const isConfirming = confirmingOrderId === order.id;

  const productTitles = items.map((i) => i.product?.name).filter(Boolean);
  const productTitle = productTitles.length > 0
    ? (productTitles.length === 1 ? productTitles[0] : productTitles.join(', '))
    : 'Order';

  const sellerNames = [...new Set(items.map((i) => i.product?.seller?.name).filter(Boolean))];
  const sellerName = sellerNames.length > 0
    ? (sellerNames.length === 1 ? sellerNames[0] : sellerNames.join(', '))
    : '—';

  const sellerId = items.map((i) => i.product?.seller?.id).find(Boolean);
  const isChatting = chattingSellerId === sellerId;

  const price = Number(order.total_amount ?? 0);
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : '—';

  const handleConfirmClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isConfirming || !onConfirmDelivery) return;
    onConfirmDelivery(order.id);
  };

  const handleChatSellerClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isChatting || !onChatSeller || !sellerId) return;
    onChatSeller(sellerId);
  };

  return (
    <li
      className={`rounded-xl border border-m4m-gray-200 border-l-4 ${style.border} bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden`}
    >
      <Link to={`/orders/${order.id}`} className="block p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-semibold text-m4m-black">
            Order #{order.id}
          </span>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold capitalize shrink-0 ${style.badge}`}>
            {style.label}
          </span>
        </div>
        <p className="mt-3 text-m4m-black font-medium line-clamp-2">
          {productTitle}
        </p>
        <p className="mt-1 text-sm text-m4m-gray-600">
          Seller: {sellerName}
        </p>
        <p className="mt-2 text-lg font-bold text-m4m-black">
          ${price.toFixed(2)}
        </p>
        <p className="mt-1 text-sm text-m4m-gray-500">
          {orderDate}
        </p>
      </Link>
      {(sellerId && onChatSeller) || (isDelivered && onConfirmDelivery) ? (
        <div className="px-4 md:px-5 pb-4 md:pb-5 pt-0 flex flex-wrap items-center gap-2">
          {sellerId && onChatSeller && (
            <button
              type="button"
              onClick={handleChatSellerClick}
              disabled={isChatting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-light disabled:opacity-70 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isChatting ? 'Opening…' : 'Chat Seller'}
            </button>
          )}
          {isDelivered && onConfirmDelivery && (
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={isConfirming}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover disabled:opacity-70 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isConfirming ? 'Confirming…' : 'Confirm Delivery'}
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}
