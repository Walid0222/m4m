import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { paginatedItems, getToken } from '../lib/api';
import { getMyProducts, createProduct, updateProduct, deleteProduct, getSellerOrders, updateSellerOrderStatus } from '../services/api';
import OrderCard from '../components/OrderCard';
import { getOrderStatusStyle } from '../lib/orderStatus';

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'chart' },
  { id: 'products', label: 'Products', icon: 'box' },
  { id: 'orders', label: 'Orders', icon: 'order' },
];

function StatCard({ title, value, subtitle, icon }) {
  const icons = {
    chart: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    order: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    box: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    dollar: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  return (
    <div className="rounded-xl border border-m4m-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-m4m-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-m4m-black">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-m4m-gray-400">{subtitle}</p>}
        </div>
        <span className="text-m4m-purple/30">{icons[icon] || icons.chart}</span>
      </div>
    </div>
  );
}

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [section, setSection] = useState('overview');
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [form, setForm] = useState({
    title: '',
    game: '',
    description: '',
    price: '',
    stock: '',
    delivery_time: '',
    image: '',
  });

  const fetchProducts = useCallback(async () => {
    if (!getToken() || !user?.is_seller) return;
    setLoadingProducts(true);
    try {
      const data = await getMyProducts();
      const list = paginatedItems(data);
      setProducts(Array.isArray(list) ? list : []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [user?.is_seller]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const fetchOrders = useCallback(async () => {
    if (!getToken() || !user?.is_seller) return;
    setLoadingOrders(true);
    try {
      const data = await getSellerOrders({ per_page: 100 });
      setOrders(paginatedItems(data) ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [user?.is_seller]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!actionMessage) return;
    const t = setTimeout(() => setActionMessage(null), 3000);
    return () => clearTimeout(t);
  }, [actionMessage]);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setFormError('');
    try {
      await updateSellerOrderStatus(orderId, { status: newStatus });
      await fetchOrders();
      setActionMessage({ type: 'success', text: 'Order status updated.' });
    } catch (err) {
      setFormError(err.message || 'Failed to update order status.');
    }
  };

  const sellerProductIds = useMemo(() => products.map((p) => p.id), [products]);
  const activeOrderStatuses = ['paid', 'processing', 'delivered'];
  const totalSales = orders.length;
  const activeOrders = useMemo(
    () => orders.filter((o) => activeOrderStatuses.includes((o.status || '').toLowerCase())).length,
    [orders]
  );
  const earnings = useMemo(() => {
    return orders.reduce((sum, order) => {
      const items = order.order_items ?? order.orderItems ?? [];
      const myTotal = items
        .filter((i) => sellerProductIds.includes(i.product_id))
        .reduce((s, i) => s + Number(i.total_price ?? 0), 0);
      return sum + myTotal;
    }, 0);
  }, [orders, sellerProductIds]);

  const updateForm = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const title = (form.title || '').trim();
    if (!title) {
      setFormError('Title is required.');
      return;
    }
    const price = parseFloat(form.price);
    if (Number.isNaN(price) || price < 0) {
      setFormError('Please enter a valid price.');
      return;
    }
    const stock = parseInt(form.stock, 10);
    if (Number.isNaN(stock) || stock < 0) {
      setFormError('Please enter a valid stock quantity.');
      return;
    }
    const parts = [];
    if ((form.game || '').trim()) parts.push('Game: ' + form.game.trim());
    if ((form.delivery_time || '').trim()) parts.push('Delivery time: ' + form.delivery_time.trim());
    if ((form.description || '').trim()) parts.push(form.description.trim());
    const description = parts.length ? parts.join('\n\n') : null;
    const imageUrl = (form.image || '').trim();
    const images = imageUrl ? [imageUrl] : [];

    setFormSubmitting(true);
    try {
      await createProduct({ name: title, description, price, stock, images, status: 'active' });
      setForm({ title: '', game: '', description: '', price: '', stock: '', delivery_time: '', image: '' });
      setAddProductOpen(false);
      await fetchProducts();
      setActionMessage({ type: 'success', text: 'Product created.' });
    } catch (err) {
      setFormError(err.message || 'Failed to create product.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.name || product.title}"?`)) return;
    try {
      await deleteProduct(product.id);
      await fetchProducts();
      setActionMessage({ type: 'success', text: 'Product deleted.' });
    } catch (err) {
      setFormError(err.message || 'Failed to delete product.');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct({
      id: product.id,
      title: product.name || '',
      description: product.description || '',
      price: product.price != null ? String(product.price) : '',
      stock: product.stock != null ? String(product.stock) : '',
      images: product.images?.[0] || '',
    });
    setFormError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setFormError('');
    const title = (editingProduct.title || '').trim();
    if (!title) {
      setFormError('Title is required.');
      return;
    }
    const price = parseFloat(editingProduct.price);
    if (Number.isNaN(price) || price < 0) {
      setFormError('Please enter a valid price.');
      return;
    }
    const stock = parseInt(editingProduct.stock, 10);
    if (Number.isNaN(stock) || stock < 0) {
      setFormError('Please enter a valid stock quantity.');
      return;
    }
    const imageUrl = (editingProduct.images || '').trim();
    const images = imageUrl ? [imageUrl] : [];

    setFormSubmitting(true);
    try {
      await updateProduct(editingProduct.id, {
        name: title,
        description: editingProduct.description || null,
        price,
        stock,
        images,
      });
      setEditingProduct(null);
      await fetchProducts();
      setActionMessage({ type: 'success', text: 'Product updated.' });
    } catch (err) {
      setFormError(err.message || 'Failed to update product.');
    } finally {
      setFormSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="rounded-2xl border border-m4m-gray-200 bg-white p-8 text-center shadow-sm max-w-md">
          <p className="text-m4m-gray-500">Please log in to access the seller dashboard.</p>
          <Link to="/login" className="mt-4 inline-block px-5 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-light">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!user.is_seller) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="rounded-2xl border border-m4m-gray-200 bg-white p-8 text-center shadow-sm max-w-md">
          <p className="text-m4m-gray-500">Seller access required.</p>
          <Link to="/" className="mt-4 inline-block text-m4m-purple font-medium hover:underline">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-m4m-gray-200 bg-white shrink-0">
        <div className="p-4 border-b border-m4m-gray-200">
          <h2 className="font-bold text-m4m-black text-lg">Seller Dashboard</h2>
          <p className="text-sm text-m4m-gray-500 mt-0.5">{user.name}</p>
        </div>
        <nav className="p-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-colors ${
                section === s.id
                  ? 'bg-m4m-purple text-white'
                  : 'text-m4m-gray-700 hover:bg-m4m-gray-100'
              }`}
            >
              {s.id === 'overview' && (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )}
              {s.id === 'products' && (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              )}
              {s.id === 'orders' && (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              )}
              {s.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-m4m-gray-200">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-m4m-gray-600 hover:text-m4m-purple"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Marketplace
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 bg-m4m-gray-50">
        {actionMessage && (
          <div
            className={`mb-6 p-4 rounded-xl border ${
              actionMessage.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
            role="alert"
          >
            {actionMessage.text}
          </div>
        )}
        {section === 'overview' && (
          <>
            <h1 className="text-xl font-bold text-m4m-black mb-6">Overview</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Total sales"
                value={loadingOrders ? '—' : totalSales}
                subtitle="Orders containing your products"
                icon="order"
              />
              <StatCard
                title="Active orders"
                value={loadingOrders ? '—' : activeOrders}
                subtitle="Paid, processing, or delivered"
                icon="chart"
              />
              <StatCard
                title="Products"
                value={loadingProducts ? '—' : products.length}
                subtitle="Listings"
                icon="box"
              />
              <StatCard
                title="Earnings"
                value={loadingOrders ? '—' : `$${earnings.toFixed(2)}`}
                subtitle="From your items in orders"
                icon="dollar"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-m4m-black mb-4">Recent orders</h2>
              {loadingOrders ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-white border border-m4m-gray-200 animate-pulse" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="rounded-xl border border-m4m-gray-200 bg-white p-8 text-center text-m4m-gray-500">
                  No orders yet.
                </div>
              ) : (
                <ul className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {section === 'products' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h1 className="text-xl font-bold text-m4m-black">Products</h1>
              <button
                type="button"
                onClick={() => { setAddProductOpen(true); setFormError(''); }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Product
              </button>
            </div>

            {addProductOpen && (
              <div className="rounded-xl border border-m4m-gray-200 bg-white p-6 shadow-sm mb-6">
                <h2 className="text-lg font-semibold text-m4m-black mb-4">New product</h2>
                {formError && (
                  <p className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{formError}</p>
                )}
                <form onSubmit={handleAddProductSubmit} className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => updateForm('title', e.target.value)}
                      placeholder="Product title"
                      className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                      maxLength={255}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Game</label>
                    <input
                      type="text"
                      value={form.game}
                      onChange={(e) => updateForm('game', e.target.value)}
                      placeholder="e.g. Fortnite, Minecraft"
                      className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => updateForm('description', e.target.value)}
                      placeholder="Product description"
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Price *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => updateForm('price', e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Stock *</label>
                      <input
                        type="number"
                        min="0"
                        value={form.stock}
                        onChange={(e) => updateForm('stock', e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Delivery time</label>
                    <input
                      type="text"
                      value={form.delivery_time}
                      onChange={(e) => updateForm('delivery_time', e.target.value)}
                      placeholder="e.g. 24 hours, 1-3 days"
                      className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Image URL</label>
                    <input
                      type="url"
                      value={form.image}
                      onChange={(e) => updateForm('image', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setAddProductOpen(false); setFormError(''); }}
                      className="px-4 py-2.5 rounded-lg font-medium border border-m4m-gray-200 text-m4m-gray-700 hover:bg-m4m-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="px-4 py-2.5 rounded-lg font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover disabled:opacity-60"
                    >
                      {formSubmitting ? 'Creating…' : 'Create product'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {editingProduct && (
              <div className="rounded-xl border border-m4m-gray-200 bg-white p-6 shadow-sm mb-6">
                <h2 className="text-lg font-semibold text-m4m-black mb-4">Edit product</h2>
                {formError && (
                  <p className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{formError}</p>
                )}
                <form onSubmit={handleEditSubmit} className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={editingProduct.title}
                      onChange={(e) => setEditingProduct((f) => ({ ...f, title: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                      maxLength={255}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Description</label>
                    <textarea
                      value={editingProduct.description}
                      onChange={(e) => setEditingProduct((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Price *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingProduct.price}
                        onChange={(e) => setEditingProduct((f) => ({ ...f, price: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Stock *</label>
                      <input
                        type="number"
                        min="0"
                        value={editingProduct.stock}
                        onChange={(e) => setEditingProduct((f) => ({ ...f, stock: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Image URL</label>
                    <input
                      type="url"
                      value={editingProduct.images || ''}
                      onChange={(e) => setEditingProduct((f) => ({ ...f, images: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setEditingProduct(null); setFormError(''); }}
                      className="px-4 py-2.5 rounded-lg font-medium border border-m4m-gray-200 text-m4m-gray-700 hover:bg-m4m-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="px-4 py-2.5 rounded-lg font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-light disabled:opacity-60"
                    >
                      {formSubmitting ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loadingProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-64 rounded-xl bg-white border border-m4m-gray-200 animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-xl border border-m4m-gray-200 bg-white p-8 text-center text-m4m-gray-500">
                You have no products yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-m4m-gray-200 bg-white p-4 shadow-sm flex flex-col"
                  >
                    {p.images?.[0] ? (
                      <div className="aspect-[4/3] rounded-lg overflow-hidden bg-m4m-gray-100 mb-3">
                        <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] rounded-lg bg-m4m-gray-100 mb-3 flex items-center justify-center">
                        <span className="text-m4m-gray-500 text-sm">No image</span>
                      </div>
                    )}
                    <h3 className="font-semibold text-m4m-black truncate">{p.name}</h3>
                    <p className="mt-1 text-lg font-bold text-m4m-black">${Number(p.price).toFixed(2)}</p>
                    <p className="text-sm text-m4m-gray-600">Stock: {Number(p.stock ?? 0)}</p>
                    <div className="mt-3 pt-3 border-t border-m4m-gray-100 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditProduct(p)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-m4m-purple text-white hover:bg-m4m-purple-light"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {section === 'orders' && (
          <>
            <h1 className="text-xl font-bold text-m4m-black mb-6">Orders received</h1>
            {formError && (
              <p className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{formError}</p>
            )}
            {loadingOrders ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-white border border-m4m-gray-200 animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-xl border border-m4m-gray-200 bg-white p-8 text-center text-m4m-gray-500">
                No orders yet. Orders for your products will appear here.
              </div>
            ) : (
              <ul className="space-y-4">
                {orders.map((order) => {
                  const status = (order.status || '').toLowerCase();
                  const style = getOrderStatusStyle(order.status);
                  const canSetProcessing = status === 'pending' || status === 'paid';
                  const canSetDelivered = status === 'processing';
                  const items = order.order_items ?? order.orderItems ?? [];
                  const productTitles = items.map((i) => i.product?.name).filter(Boolean).join(', ') || 'Order';
                  return (
                    <li
                      key={order.id}
                      className={`rounded-xl border border-m4m-gray-200 border-l-4 ${style.border} bg-white shadow-sm overflow-hidden`}
                    >
                      <div className="p-4 md:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="font-semibold text-m4m-black">Order #{order.id}</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${style.badge}`}>
                            {style.label}
                          </span>
                        </div>
                        <p className="mt-2 text-m4m-black line-clamp-2">{productTitles}</p>
                        <p className="mt-1 text-sm text-m4m-gray-600">
                          Buyer: {order.buyer?.name ?? '—'}
                        </p>
                        <p className="mt-1 text-lg font-bold text-m4m-black">
                          ${Number(order.total_amount ?? 0).toFixed(2)}
                        </p>
                        <p className="mt-1 text-sm text-m4m-gray-500">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                        </p>
                        {(canSetProcessing || canSetDelivered) && (
                          <div className="mt-4 pt-3 border-t border-m4m-gray-100 flex flex-wrap gap-2">
                            {canSetProcessing && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(order.id, 'processing')}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                              >
                                Mark as Processing
                              </button>
                            )}
                            {canSetDelivered && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700"
                              >
                                Mark as Delivered
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
