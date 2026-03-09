import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import {
  paginatedItems,
  getToken,
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerOrders,
  updateSellerOrderStatus,
  deliverOrder,
  getWallet,
  getSellerVerification,
  submitSellerVerification,
  getSellerWarnings,
} from '../services/api';
import OrderCard from '../components/OrderCard';
import { getOrderStatusStyle } from '../lib/orderStatus';

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'chart' },
  { id: 'products', label: 'Products', icon: 'box' },
  { id: 'orders', label: 'Orders', icon: 'order' },
  { id: 'verification', label: 'Get Verified', icon: 'verify' },
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

function VerificationSection({ user }) {
  const isVerified = user?.is_verified_seller === true || user?.is_verified_seller === 1
    || user?.is_verified === true || user?.is_verified === 1;

  const [idFront, setIdFront] = useState('');
  const [idBack, setIdBack] = useState('');
  const [bankStatement, setBankStatement] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Verification status fetched from API: null (loading) | false (none) | object
  const [verificationRequest, setVerificationRequest] = useState(null);
  const [loadingVerif, setLoadingVerif] = useState(true);

  // Load existing verification request on mount
  useEffect(() => {
    if (!getToken()) { setLoadingVerif(false); return; }
    getSellerVerification()
      .then((data) => setVerificationRequest(data ?? false))
      .catch(() => setVerificationRequest(false))
      .finally(() => setLoadingVerif(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idFront.trim() || !idBack.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await submitSellerVerification({
        id_card_front: idFront.trim(),
        id_card_back: idBack.trim(),
        bank_statement: bankStatement.trim() || undefined,
      });
      setVerificationRequest(result);
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isVerified) {
    return (
      <div>
        <h1 className="text-xl font-bold text-m4m-black mb-6">Seller Verification</h1>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-xl font-bold text-green-800 mb-1">You are a Verified Seller ✅</p>
          <p className="text-green-700 text-sm">Your identity has been confirmed by the M4M team. A verified badge is displayed on your profile and products.</p>
        </div>
      </div>
    );
  }

  // Pending request — show persistent message until admin acts
  const isPending = !loadingVerif && verificationRequest && verificationRequest.status === 'pending';
  const isRejected = !loadingVerif && verificationRequest && verificationRequest.status === 'rejected';

  if (loadingVerif) {
    return (
      <div>
        <h1 className="text-xl font-bold text-m4m-black mb-6">Seller Verification</h1>
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (isPending) {
    return (
      <div>
        <h1 className="text-xl font-bold text-m4m-black mb-6">Seller Verification</h1>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl font-bold text-blue-800 mb-1">Verification under review</p>
          <p className="text-blue-700 text-sm max-w-md mx-auto">
            Your verification request has been submitted and is under review by M4M administration.
            You will be notified when your account is approved or if further information is needed.
          </p>
          <p className="text-blue-500 text-xs mt-3">
            Submitted on {verificationRequest.created_at ? new Date(verificationRequest.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-m4m-black mb-2">Get Verified</h1>
      <p className="text-m4m-gray-500 text-sm mb-6">Become a Verified Seller to build trust with buyers and increase your sales.</p>

      {isRejected && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-6 text-sm text-red-800">
          ❌ Your previous verification request was rejected. You may submit a new one below with updated documents.
        </div>
      )}

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: '🏅', title: 'Verified badge', desc: 'A blue checkmark badge appears on your profile and all your products.' },
          { icon: '📈', title: 'More visibility', desc: 'Verified sellers are ranked higher in search results.' },
          { icon: '🛡️', title: 'Buyer trust', desc: 'Buyers feel safer purchasing from verified sellers.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className="text-2xl">{icon}</span>
            <p className="font-semibold text-gray-900 mt-2 text-sm">{title}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 text-sm text-amber-800">
        <p className="font-semibold mb-2">How verification works:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Submit your national ID card (front and back).</li>
          <li>Optionally attach a bank statement for faster approval.</li>
          <li>The M4M admin team reviews your documents within 1–3 business days.</li>
          <li>Once approved, a ✅ Verified badge appears on your profile and products.</li>
        </ol>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 mb-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">National ID card — front <span className="text-red-500">*</span></label>
          <p className="text-xs text-gray-400 mb-2">Paste a publicly accessible image URL (e.g. from Imgur).</p>
          <input type="url" value={idFront} onChange={(e) => setIdFront(e.target.value)} placeholder="https://i.imgur.com/your-id-front.jpg" required
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none" />
          {idFront && <img src={idFront} alt="ID front preview" className="mt-2 h-20 rounded-lg object-contain bg-gray-100 border" onError={(e) => { e.target.style.display = 'none'; }} />}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">National ID card — back <span className="text-red-500">*</span></label>
          <input type="url" value={idBack} onChange={(e) => setIdBack(e.target.value)} placeholder="https://i.imgur.com/your-id-back.jpg" required
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none" />
          {idBack && <img src={idBack} alt="ID back preview" className="mt-2 h-20 rounded-lg object-contain bg-gray-100 border" onError={(e) => { e.target.style.display = 'none'; }} />}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank statement <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="url" value={bankStatement} onChange={(e) => setBankStatement(e.target.value)} placeholder="https://i.imgur.com/bank-statement.jpg"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none" />
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-500">
          🔒 Your documents are confidential and will only be reviewed by the M4M admin team. They will never be shared with third parties.
        </div>
        <button type="submit" disabled={submitting || !idFront.trim() || !idBack.trim()}
          className="w-full py-3 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark disabled:opacity-60 transition-colors">
          {submitting ? 'Submitting…' : 'Submit verification request'}
        </button>
      </form>
    </div>
  );
}

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [section, setSection] = useState(() => {
    const s = searchParams.get('section');
    return SECTIONS.some((x) => x.id === s) ? s : 'overview';
  });
  const [sellerWarnings, setSellerWarnings] = useState([]);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [orderStatusConfirm, setOrderStatusConfirm] = useState(null); // { orderId, status }
  const [deliverModal, setDeliverModal] = useState(null);             // { orderId, orderNumber }
  const [deliverContent, setDeliverContent] = useState('');
  const [deliverSubmitting, setDeliverSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    game: '',
    description: '',
    price: '',
    stock: '',
    delivery_type: 'manual',
    delivery_time: '',
    delivery_content: '',
    image_urls: '',
    features: [],
    seller_reminder: '',
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

  const fetchWallet = useCallback(async () => {
    if (!getToken()) return;
    try {
      const data = await getWallet();
      setWalletBalance(data?.balance ?? 0);
    } catch {
      setWalletBalance(0);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Fetch admin warnings for this seller
  const fetchWarnings = useCallback(async () => {
    if (!getToken() || !user?.is_seller) return;
    try {
      const data = await getSellerWarnings();
      setSellerWarnings(Array.isArray(data) ? data : (data?.warnings ?? []));
    } catch {
      setSellerWarnings([]);
    }
  }, [user?.is_seller]);

  useEffect(() => {
    fetchWarnings();
  }, [fetchWarnings]);

  useEffect(() => {
    if (!actionMessage) return;
    const t = setTimeout(() => setActionMessage(null), 3000);
    return () => clearTimeout(t);
  }, [actionMessage]);

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    setOrderStatusConfirm({ orderId, status: newStatus });
  };

  const handleOrderStatusConfirm = async () => {
    if (!orderStatusConfirm) return;
    const { orderId, status: newStatus } = orderStatusConfirm;
    setOrderStatusConfirm(null);
    setFormError('');
    try {
      await updateSellerOrderStatus(orderId, { status: newStatus });
      await fetchOrders();
      setActionMessage({ type: 'success', text: 'Order status updated.' });
    } catch (err) {
      setFormError(err.message || 'Failed to update order status.');
    }
  };

  const handleDeliverOpen = (order) => {
    setDeliverContent('');
    setDeliverModal({ orderId: order.id, orderNumber: order.order_number ?? order.id });
  };

  const handleDeliverSubmit = async () => {
    if (!deliverModal || !deliverContent.trim()) return;
    setDeliverSubmitting(true);
    setFormError('');
    try {
      await deliverOrder(deliverModal.orderId, deliverContent.trim());
      setDeliverModal(null);
      setDeliverContent('');
      await fetchOrders();
      setActionMessage({ type: 'success', text: 'Delivery sent! Order marked as delivered.' });
    } catch (err) {
      setFormError(err.message || 'Failed to send delivery.');
    } finally {
      setDeliverSubmitting(false);
    }
  };

  const sellerProductIds = useMemo(() => products.map((p) => p.id), [products]);
  const activeOrderStatuses = ['paid', 'processing', 'delivered'];
  const completedOrderStatuses = ['completed'];

  const totalSales = useMemo(() => {
    return orders.filter((o) => {
      const status = (o.status || '').toLowerCase();
      return !['cancelled', 'dispute'].includes(status);
    }).length;
  }, [orders]);

  const activeOrders = useMemo(
    () => orders.filter((o) => activeOrderStatuses.includes((o.status || '').toLowerCase())).length,
    [orders]
  );

  const completedOrders = useMemo(
    () => orders.filter((o) => completedOrderStatuses.includes((o.status || '').toLowerCase())).length,
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

  const salesHistoryData = useMemo(() => {
    const byDate = new Map();
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      byDate.set(key, { date: key, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), revenue: 0 });
    }
    orders.forEach((order) => {
      const status = (order.status || '').toLowerCase();
      if (['cancelled', 'dispute'].includes(status)) return;
      const items = order.order_items ?? order.orderItems ?? [];
      const myTotal = items
        .filter((i) => sellerProductIds.includes(i.product_id))
        .reduce((s, i) => s + Number(i.total_price ?? 0), 0);
      if (myTotal <= 0) return;
      const key = (order.created_at || '').toString().slice(0, 10);
      if (byDate.has(key)) {
        byDate.get(key).revenue += myTotal;
      }
    });
    return Array.from(byDate.values());
  }, [orders, sellerProductIds]);

  const updateForm = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const title = (form.title || '').trim();
    if (!title) { setFormError('Title is required.'); return; }
    const price = parseFloat(form.price);
    if (Number.isNaN(price) || price < 0) { setFormError('Please enter a valid price.'); return; }

    // Instant delivery: stock = number of lines in delivery_content
    const deliveryContent = (form.delivery_content || '').trim();
    const deliveryLines = deliveryContent ? deliveryContent.split('\n').filter((l) => l.trim()) : [];
    const isInstant = form.delivery_type === 'instant';
    let stock;
    if (isInstant) {
      stock = deliveryLines.length;
    } else {
      stock = parseInt(form.stock, 10);
      if (Number.isNaN(stock) || stock < 0) { setFormError('Please enter a valid stock quantity.'); return; }
    }

    const parts = [];
    if ((form.game || '').trim()) parts.push('Game: ' + form.game.trim());
    if ((form.description || '').trim()) parts.push(form.description.trim());
    const description = parts.length ? parts.join('\n\n') : null;
    const images = (form.image_urls || '').split('\n').map((u) => u.trim()).filter(Boolean);

    setFormSubmitting(true);
    try {
      await createProduct({
        name: title,
        description,
        price,
        stock,
        images,
        status: 'active',
        delivery_type: form.delivery_type,
        delivery_time: (form.delivery_time || '').trim() || null,
        delivery_content: isInstant ? deliveryContent : null,
        features: form.features,
        seller_reminder: (form.seller_reminder || '').trim() || null,
      });
      setForm({ title: '', game: '', description: '', price: '', stock: '', delivery_type: 'manual', delivery_time: '', delivery_content: '', image_urls: '', features: [], seller_reminder: '' });
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

  const DELIVERY_TIME_OPTIONS = [
    '5 minutes', '15 minutes', '30 minutes',
    '1 hour', '24 hours', '48 hours',
  ];
  const FEATURE_OPTIONS = [
    { id: 'mac', label: 'Works on Mac' },
    { id: 'linux', label: 'Works on Linux' },
    { id: 'global', label: 'Global access' },
    { id: 'assurance', label: '30-day assurance' },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col md:flex-row">
      {/* Order status confirm modal */}
      {orderStatusConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="rounded-2xl bg-white shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm status change</h3>
            <p className="text-sm text-gray-600 mb-6">
              Change order <strong>#{orderStatusConfirm.orderId}</strong> status to <strong className="capitalize">{orderStatusConfirm.status}</strong>?
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setOrderStatusConfirm(null)} className="flex-1 py-2.5 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="button" onClick={handleOrderStatusConfirm} className="flex-1 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {/* Manual delivery modal */}
      {deliverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="rounded-2xl bg-white shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Send Delivery</h3>
            <p className="text-sm text-gray-500 mb-4">
              Order <strong>{deliverModal.orderNumber}</strong> — Enter the account credentials for the buyer.
            </p>
            {formError && (
              <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg p-2">{formError}</p>
            )}
            <textarea
              value={deliverContent}
              onChange={(e) => setDeliverContent(e.target.value)}
              placeholder={"email:password\n\nOr any delivery information for the buyer"}
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none resize-y mb-4"
            />
            <p className="text-xs text-gray-500 mb-4">
              ⚠️ This information will be sent to the buyer and stored securely. The order will be marked as delivered immediately.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDeliverModal(null); setDeliverContent(''); setFormError(''); }}
                className="flex-1 py-2.5 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeliverSubmit}
                disabled={deliverSubmitting || !deliverContent.trim()}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 transition-colors"
              >
                {deliverSubmitting ? 'Sending…' : '📤 Send Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              {s.id === 'verification' && (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              )}
              <span className="flex-1">{s.label}</span>
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
        {/* Admin warnings banner */}
        {sellerWarnings.length > 0 && (
          <div className="mb-6 space-y-3">
            {sellerWarnings.map((w) => (
              <div key={w.id} className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-800 text-sm">⚠ Warning from M4M Administration</p>
                  {w.reason && <p className="text-sm text-amber-700 mt-0.5"><span className="font-medium">Reason:</span> {w.reason}</p>}
                  {w.message && <p className="text-sm text-amber-700 mt-0.5">{w.message}</p>}
                  <p className="text-xs text-amber-600 mt-1">Please review marketplace rules to avoid further action.</p>
                </div>
                {w.created_at && (
                  <p className="text-xs text-amber-500 shrink-0">{new Date(w.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {section === 'overview' && (
          <>
            <h1 className="text-xl font-bold text-m4m-black mb-6">Overview</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Total sales"
                value={loadingOrders ? '—' : totalSales}
                subtitle="Orders with your products"
                icon="order"
              />
              <StatCard
                title="Active orders"
                value={loadingOrders ? '—' : activeOrders}
                subtitle="Paid, processing, or delivered"
                icon="chart"
              />
              <StatCard
                title="Completed orders"
                value={loadingOrders ? '—' : completedOrders}
                subtitle="Buyer confirmed delivery"
                icon="order"
              />
              <StatCard
                title="Wallet balance"
                value={walletBalance != null ? `${Number(walletBalance).toFixed(2)} MAD` : '—'}
                subtitle="Available balance"
                icon="dollar"
              />
            </div>
            <div className="rounded-xl border border-m4m-gray-200 bg-white p-6 shadow-sm mb-8">
                <h2 className="text-lg font-semibold text-m4m-black mb-4">Sales history (last 7 days)</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesHistoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#737373" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#737373" tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5' }}
                      />
                      <Bar dataKey="revenue" fill="#6d28d9" radius={[4, 4, 0, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
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
                    <input type="text" value={form.title} onChange={(e) => updateForm('title', e.target.value)} placeholder="Product title" maxLength={255} className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Game</label>
                    <input type="text" value={form.game} onChange={(e) => updateForm('game', e.target.value)} placeholder="e.g. Fortnite, Minecraft" className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Description</label>
                    <textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="Product description" rows={3} className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Price (MAD) *</label>
                    <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => updateForm('price', e.target.value)} placeholder="0.00" className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none" />
                  </div>

                  {/* Delivery type */}
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-2">Delivery type</label>
                    <div className="flex gap-3">
                      {['manual', 'instant'].map((dt) => (
                        <button key={dt} type="button" onClick={() => updateForm('delivery_type', dt)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors capitalize ${form.delivery_type === dt ? 'bg-m4m-purple text-white border-m4m-purple' : 'bg-white border-m4m-gray-200 text-m4m-gray-700 hover:bg-m4m-gray-50'}`}>
                          {dt === 'instant' ? '⚡ Instant delivery' : '📦 Manual delivery'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Instant: delivery content */}
                  {form.delivery_type === 'instant' ? (
                    <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                      <label className="block text-sm font-semibold text-green-800 mb-1">
                        Delivery content <span className="font-normal text-green-600">(one item per line)</span>
                      </label>
                      <p className="text-xs text-green-700 mb-2">Each line = 1 unit of stock. e.g.: <code className="bg-green-100 px-1 rounded">email:password</code></p>
                      <textarea value={form.delivery_content} onChange={(e) => { updateForm('delivery_content', e.target.value); }} placeholder={"email1:password1\nemail2:password2\nemail3:password3"} rows={5} className="w-full px-3 py-2 rounded-lg border border-green-300 text-gray-900 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-y font-mono" />
                      <p className="text-xs text-green-600 mt-1">
                        Stock: <strong>{form.delivery_content.split('\n').filter((l) => l.trim()).length} items</strong>
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Stock *</label>
                      <input type="number" min="0" value={form.stock} onChange={(e) => updateForm('stock', e.target.value)} placeholder="0" className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none" />
                    </div>
                  )}

                  {/* Delivery time */}
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-2">Delivery time</label>
                    <div className="flex flex-wrap gap-2">
                      {DELIVERY_TIME_OPTIONS.map((opt) => (
                        <button key={opt} type="button" onClick={() => updateForm('delivery_time', form.delivery_time === opt ? '' : opt)} className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${form.delivery_time === opt ? 'bg-m4m-purple text-white border-m4m-purple' : 'bg-white border-m4m-gray-200 text-m4m-gray-700 hover:bg-m4m-gray-50'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feature icons */}
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-2">Features</label>
                    <div className="flex flex-wrap gap-2">
                      {FEATURE_OPTIONS.map((f) => {
                        const selected = form.features.includes(f.id);
                        return (
                          <button key={f.id} type="button" onClick={() => updateForm('features', selected ? form.features.filter((x) => x !== f.id) : [...form.features, f.id])} className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${selected ? 'bg-m4m-purple text-white border-m4m-purple' : 'bg-white border-m4m-gray-200 text-m4m-gray-700 hover:bg-m4m-gray-50'}`}>
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Image URLs */}
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Image URLs <span className="font-normal text-m4m-gray-400">(one per line)</span></label>
                    <textarea value={form.image_urls} onChange={(e) => updateForm('image_urls', e.target.value)} placeholder={"https://example.com/image1.jpg\nhttps://example.com/image2.jpg"} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none resize-none font-mono text-sm" />
                  </div>

                  {/* Seller reminder */}
                  <div>
                    <label className="block text-sm font-medium text-m4m-gray-700 mb-1">Seller note / reminder <span className="font-normal text-m4m-gray-400">(shown to buyers on product page)</span></label>
                    <textarea value={form.seller_reminder} onChange={(e) => updateForm('seller_reminder', e.target.value)} placeholder="e.g. Please provide your game username after purchase." rows={2} className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none resize-none" />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setAddProductOpen(false); setFormError(''); }} className="px-4 py-2.5 rounded-lg font-medium border border-m4m-gray-200 text-m4m-gray-700 hover:bg-m4m-gray-50">Cancel</button>
                    <button type="submit" disabled={formSubmitting} className="px-4 py-2.5 rounded-lg font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover disabled:opacity-60">
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
                    <p className="mt-1 text-lg font-bold text-m4m-black">{Number(p.price).toFixed(2)} MAD</p>
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
                  // Detect if any item is manual delivery
                  const hasManualItem = items.some((i) => i.product?.delivery_type !== 'instant');
                  const hasInstantItem = items.some((i) => i.product?.delivery_type === 'instant');
                  // For manual orders in processing: show "Send Delivery" instead of "Mark as Delivered"
                  const canSendDelivery = canSetDelivered && hasManualItem;
                  return (
                    <li
                      key={order.id}
                      className={`rounded-xl border border-m4m-gray-200 border-l-4 ${style.border} bg-white shadow-sm overflow-hidden`}
                    >
                      <div className="p-4 md:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="font-mono font-semibold text-m4m-black">
                            {order.order_number ?? `M4M-${String(order.id).padStart(6, '0')}`}
                          </span>
                          <div className="flex items-center gap-2">
                            {hasInstantItem && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">⚡ Instant</span>
                            )}
                            {hasManualItem && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">📦 Manual</span>
                            )}
                            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${style.badge}`}>
                              {style.label}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-m4m-black line-clamp-2">{productTitles}</p>
                        <p className="mt-1 text-sm text-m4m-gray-600">
                          Buyer: {order.buyer?.name ?? '—'}
                        </p>
                        <p className="mt-1 text-lg font-bold text-m4m-black">
                          {Number(order.total_amount ?? 0).toFixed(2)} MAD
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
                            {canSendDelivery ? (
                              <button
                                type="button"
                                onClick={() => handleDeliverOpen(order)}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700"
                              >
                                📤 Send Delivery
                              </button>
                            ) : canSetDelivered && (
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

        {section === 'verification' && (
          <VerificationSection user={user} />
        )}
      </main>
    </div>
  );
}
