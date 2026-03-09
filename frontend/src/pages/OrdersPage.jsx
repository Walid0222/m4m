import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getOrders, confirmOrderDelivery, createConversation, paginatedItems, getToken } from '../services/api';
import OrderCard from '../components/OrderCard';
import { ORDER_STATUSES } from '../lib/orderStatus';

export default function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const [chattingSellerId, setChattingSellerId] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      setOrders([]);
      return;
    }
    setFetchError(false);
    setLoading(true);
    try {
      const result = await getOrders();
      setOrders(paginatedItems(result));
    } catch {
      setOrders([]);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleConfirmDelivery = useCallback(async (orderId) => {
    setConfirmingOrderId(orderId);
    try {
      await confirmOrderDelivery(orderId);
      await fetchOrders();
    } catch {
      setConfirmingOrderId(null);
    } finally {
      setConfirmingOrderId(null);
    }
  }, [fetchOrders]);

  const handleChatSeller = useCallback(async (sellerId) => {
    if (!user || !getToken()) {
      navigate('/login', { state: { from: '/orders' } });
      return;
    }
    if (user.id === sellerId) return;
    setChattingSellerId(sellerId);
    try {
      const conversation = await createConversation({ other_user_id: sellerId });
      const convId = conversation?.id;
      setChattingSellerId(null);
      if (convId) navigate(`/chat?conversation=${convId}`);
      else navigate('/chat');
    } catch {
      setChattingSellerId(null);
    }
  }, [user, navigate]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (statusFilter) {
      list = list.filter((o) => (o.status || '').toLowerCase() === statusFilter.toLowerCase());
    }
    const sorted = [...list].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === 'oldest' ? da - db : db - da;
    });
    return sorted;
  }, [orders, statusFilter, sortOrder]);

  const deliveredOrders = useMemo(
    () => orders.filter((o) => (o.status || '').toLowerCase() === 'delivered'),
    [orders]
  );
  const firstDeliveredOrder = deliveredOrders[0] ?? null;
  const isConfirmingFirst = firstDeliveredOrder && confirmingOrderId === firstDeliveredOrder.id;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <h1 className="text-2xl font-bold text-m4m-black mb-6">My Orders</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-m4m-gray-200 bg-white h-32 animate-pulse"
              aria-hidden
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <h1 className="text-2xl font-bold text-m4m-black mb-6">My Orders</h1>

      {!user ? (
        <div className="rounded-2xl border border-m4m-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-m4m-gray-500 mb-4">
            Log in to view your orders.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-light transition-colors"
          >
            Sign in
          </Link>
        </div>
      ) : fetchError ? (
        <div className="rounded-2xl border border-m4m-gray-200 bg-white p-8 md:p-12 text-center shadow-sm">
          <p className="text-m4m-gray-600 font-medium">Something went wrong</p>
          <p className="text-sm text-m4m-gray-500 mt-1">We couldn’t load your orders. Please try again.</p>
          <button
            type="button"
            onClick={fetchOrders}
            className="mt-4 px-5 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-light transition-colors"
          >
            Try again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-m4m-gray-200 bg-white p-8 md:p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-m4m-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-m4m-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <p className="text-m4m-gray-600 font-medium">No orders yet</p>
          <p className="text-sm text-m4m-gray-500 mt-1">Your orders will appear here after you make a purchase.</p>
          <Link to="/" className="mt-6 inline-block text-m4m-purple font-medium hover:underline">
            Browse marketplace
          </Link>
        </div>
      ) : (
        <>
          {deliveredOrders.length > 0 && (
            <div className="mb-6 p-4 rounded-xl border border-orange-200 bg-orange-50 flex flex-wrap items-center gap-3">
              <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-orange-800 font-medium text-sm">
                  {deliveredOrders.length === 1
                    ? '✅ Your order has been delivered!'
                    : `✅ ${deliveredOrders.length} orders have been delivered!`}
                </p>
                <p className="text-orange-600 text-xs mt-0.5">
                  Tip: Only confirm once you have verified the credentials. Orders auto-confirm after 7 days.
                </p>
              </div>
              {firstDeliveredOrder && (
                <Link
                  to={`/orders/${firstDeliveredOrder.id}`}
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                >
                  View Order
                </Link>
              )}
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="order-status-filter" className="block text-sm font-medium text-m4m-gray-700 mb-2">
                Filter by status
              </label>
              <select
                id="order-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-m4m-gray-200 bg-white text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none min-w-[180px]"
              >
                {ORDER_STATUSES.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="order-sort" className="block text-sm font-medium text-m4m-gray-700 mb-2">
                Sort by
              </label>
              <select
                id="order-sort"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-m4m-gray-200 bg-white text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none min-w-[160px]"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-m4m-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="text-m4m-gray-500">No orders match the selected status.</p>
              <button
                type="button"
                onClick={() => setStatusFilter('')}
                className="mt-3 text-m4m-purple font-medium hover:underline"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onConfirmDelivery={handleConfirmDelivery}
                  confirmingOrderId={confirmingOrderId}
                  onChatSeller={handleChatSeller}
                  chattingSellerId={chattingSellerId}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
