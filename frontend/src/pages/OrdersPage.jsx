import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './OrdersPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function getToken() {
  return localStorage.getItem('m4m_token');
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchOrders() {
      try {
        const res = await fetch(`${API_BASE}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const list = data.data?.data ?? data.data ?? [];
        if (!cancelled) setOrders(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchOrders();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="page-loading">Loading orders…</div>;

  return (
    <div className="orders-page">
      <h1>My Orders</h1>
      {!getToken() ? (
        <p className="orders-auth-msg">Log in to see your orders.</p>
      ) : orders.length === 0 ? (
        <p className="orders-empty">You have no orders yet.</p>
      ) : (
        <ul className="orders-list">
          {orders.map((order) => (
            <li key={order.id} className="order-card">
              <div className="order-header">
                <Link to={`/orders/${order.id}`} className="order-id">
                  Order #{order.id}
                </Link>
                <span className={`order-status ${order.status}`}>{order.status}</span>
              </div>
              <p className="order-total">
                Total: ${Number(order.total_amount ?? 0).toFixed(2)}
              </p>
              {order.order_items?.length > 0 && (
                <p className="order-items-preview">
                  {order.order_items.map((i) => i.product?.name).filter(Boolean).join(', ') || `${order.order_items.length} item(s)`}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
