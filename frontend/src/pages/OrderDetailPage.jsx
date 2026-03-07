import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getToken } from '../lib/api';
import { getOrder, confirmOrderDelivery } from '../services/api';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/orders" className="text-sm text-m4m-purple hover:underline mb-6 inline-block">
        ← Back to Orders
      </Link>
      <h1 className="text-2xl font-bold text-m4m-black mb-2">Order #{order.id}</h1>
      <p className="text-m4m-gray-500 mb-2">
        Status: <span className="capitalize font-medium text-m4m-black">{order.status}</span>
      </p>
      {(order.status || '').toLowerCase() === 'delivered' && (
        <div className="mb-6">
          <button
            type="button"
            onClick={handleConfirmDelivery}
            disabled={confirming}
            className="px-5 py-2.5 rounded-xl font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover disabled:opacity-60"
          >
            {confirming ? 'Confirming…' : 'Confirm delivery'}
          </button>
        </div>
      )}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="rounded-xl border border-m4m-gray-200 overflow-hidden">
        <ul className="divide-y divide-m4m-gray-200">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3 flex justify-between items-center">
              <div>
                <p className="font-medium text-m4m-black">{item.product?.name ?? 'Product'}</p>
                <p className="text-sm text-m4m-gray-500">
                  Qty: {item.quantity} × ${Number(item.unit_price ?? 0).toFixed(2)}
                </p>
              </div>
              <p className="font-semibold">${Number(item.total_price ?? 0).toFixed(2)}</p>
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 bg-m4m-gray-100 font-bold text-m4m-black flex justify-between">
          <span>Total</span>
          <span>${Number(order.total_amount ?? 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
