import { Link } from 'react-router-dom';
import { getOrderStatusStyle } from '../lib/orderStatus';

export default function OrderCard({ order }) {
  const items = order.order_items ?? order.orderItems ?? [];
  const style = getOrderStatusStyle(order.status);

  const productTitles = items.map((i) => i.product?.name).filter(Boolean);
  const productTitle = productTitles.length > 0
    ? (productTitles.length === 1 ? productTitles[0] : productTitles.join(', '))
    : 'Order';

  const sellerNames = [...new Set(items.map((i) => i.product?.seller?.name).filter(Boolean))];
  const sellerName = sellerNames.length > 0
    ? (sellerNames.length === 1 ? sellerNames[0] : sellerNames.join(', '))
    : '—';

  const price = Number(order.total_amount ?? 0);
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : '—';

  return (
    <li
      className={`rounded-xl border border-m4m-gray-200 border-l-4 ${style.border} bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden`}
    >
      <Link to={`/orders/${order.id}`} className="block p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-semibold text-m4m-black">
            Order #{order.id}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${style.badge}`}>
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
    </li>
  );
}
