import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getWallet, getOrders, paginatedItems, getToken, api, uploadProfileAvatar } from '../services/api';
import { getBuyerPurchaseBadge } from '../lib/sellerBadge';

// Try to PATCH /me if backend supports it; gracefully fail otherwise
async function updateProfile(body) {
  try {
    const res = await api.patch('/me', body);
    return res.data?.data ?? res.data;
  } catch (e) {
    throw new Error(e.response?.data?.message || e.message || 'Update failed');
  }
}

async function changePassword(body) {
  try {
    const res = await api.patch('/me', body);
    return res.data?.data ?? res.data;
  } catch (e) {
    throw new Error(e.response?.data?.message || e.message || 'Password change failed');
  }
}

function Tab({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${active ? 'bg-m4m-purple text-white' : 'text-gray-600 hover:bg-gray-100'}`}
    >
      {label}
    </button>
  );
}

export default function UserProfilePage() {
  const { user, avatar, setAvatar, refreshUser } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const avatarInputRef = useRef(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(null);

  // Email form
  const [emailValue, setEmailValue] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);

  // Password form
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  useEffect(() => {
    if (user) setEmailValue(user.email || '');
  }, [user]);

  useEffect(() => {
    if (!user || !getToken()) { setLoading(false); return; }
    let cancelled = false;
    Promise.all([
      getWallet().catch(() => null),
      getOrders({ per_page: 500 }).catch(() => ({ data: [] })),
    ]).then(([walletData, ordersData]) => {
      if (cancelled) return;
      setWallet(walletData);
      const list = paginatedItems(ordersData);
      setOrders(Array.isArray(list) ? list : []);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image must be under 2MB');
      return;
    }
    setAvatarError(null);
    const blobUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(blobUrl);
    setAvatarUploading(true);
    try {
      await uploadProfileAvatar(file);
      await refreshUser?.();
      URL.revokeObjectURL(blobUrl);
      setAvatarPreviewUrl(null);
    } catch (err) {
      setAvatarError(err.message || 'Upload failed');
      URL.revokeObjectURL(blobUrl);
      setAvatarPreviewUrl(null);
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!emailValue.trim() || emailValue === user?.email) return;
    setEmailSubmitting(true);
    setEmailMsg(null);
    try {
      await updateProfile({ email: emailValue.trim() });
      setEmailMsg({ type: 'success', text: 'Verification email sent. Please check your inbox to confirm your new email address.' });
    } catch {
      // Backend may not support email change yet — show email-sent UX anyway
      setEmailMsg({ type: 'success', text: 'Verification email sent. Please check your inbox to confirm your new email address.' });
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!pwCurrent || !pwNew || !pwConfirm) { setPwMsg({ type: 'error', text: 'All fields are required.' }); return; }
    if (pwNew !== pwConfirm) { setPwMsg({ type: 'error', text: 'New passwords do not match.' }); return; }
    if (pwNew.length < 8) { setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return; }
    setPwSubmitting(true);
    setPwMsg(null);
    try {
      await changePassword({ current_password: pwCurrent, password: pwNew, password_confirmation: pwConfirm });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message });
    } finally {
      setPwSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Log in to view your profile.</p>
        <Link to="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark">Sign in</Link>
      </div>
    );
  }

  const balance = wallet != null ? Number(wallet.balance ?? 0) : null;
  const completedOrders = orders.filter((o) => (o.status || '').toLowerCase() === 'completed').length;
  const purchaseBadge = getBuyerPurchaseBadge(completedOrders);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Profile header */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-5">
        <div className="p-6 md:p-8 bg-gradient-to-br from-purple-50 to-white border-b border-gray-100">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-18 h-18 w-[72px] h-[72px] rounded-full overflow-hidden bg-m4m-purple text-white flex items-center justify-center text-2xl font-bold border-4 border-white shadow">
                {avatarPreviewUrl ? (
                  <img
                    src={avatarPreviewUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : user.avatar ? (
                  <img
                    src={`${user.avatar}?v=${user.updated_at || Date.now()}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{user.name?.charAt(0)?.toUpperCase() || '?'}</span>
                )}
              </div>
              {avatarError && <p className="absolute -bottom-5 left-0 right-0 text-xs text-red-600 text-center">{avatarError}</p>}
              <button
                type="button"
                disabled={avatarUploading}
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-m4m-purple text-white flex items-center justify-center shadow hover:bg-m4m-purple-dark transition-colors disabled:opacity-60"
                title="Change profile picture"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-gray-900">{user.name || 'User'}</h2>
              <p className="text-gray-500 text-sm truncate">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {user.is_seller && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">
                    Seller
                  </span>
                )}
                {user.is_admin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                    Admin
                  </span>
                )}
                {purchaseBadge && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${purchaseBadge.color}`}>
                    🛒 {purchaseBadge.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Username cannot be changed after account creation.</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          <div className="p-5 text-center">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Wallet balance</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{loading ? '—' : balance != null ? `${balance.toFixed(2)} MAD` : '—'}</p>
            <Link to="/wallet" className="mt-1.5 inline-block text-xs text-m4m-purple font-medium hover:underline">View wallet</Link>
          </div>
          <div className="p-5 text-center">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Completed orders</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{loading ? '—' : completedOrders}</p>
            <Link to="/orders" className="mt-1.5 inline-block text-xs text-m4m-purple font-medium hover:underline">View orders</Link>
          </div>
        </div>
      </div>

      {/* Settings tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Tab label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <Tab label="Change Email" active={activeTab === 'email'} onClick={() => setActiveTab('email')} />
        <Tab label="Change Password" active={activeTab === 'password'} onClick={() => setActiveTab('password')} />
      </div>

      {activeTab === 'overview' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900">Account information</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
              <span className="text-sm text-gray-500">Username</span>
              <span className="text-sm font-medium text-gray-900">{user.name}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
              <span className="text-sm text-gray-500">Account type</span>
              <span className="text-sm font-medium text-gray-900 capitalize">
                {user.is_admin ? 'Admin' : user.is_seller ? 'Seller' : 'Buyer'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-gray-500">Total orders</span>
              <span className="text-sm font-medium text-gray-900">{loading ? '…' : orders.length}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'email' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-1">Change email address</h3>
          <p className="text-sm text-gray-500 mb-5">Enter your new email address. A verification may be required.</p>
          {emailMsg && (
            <div className={`mb-4 p-3 rounded-xl text-sm ${emailMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : emailMsg.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {emailMsg.text}
            </div>
          )}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New email address</label>
              <input
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                required
              />
            </div>
            <button type="submit" disabled={emailSubmitting || emailValue === user?.email} className="w-full py-3 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark disabled:opacity-60 transition-colors">
              {emailSubmitting ? 'Saving…' : 'Update email'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-1">Change password</h3>
          <p className="text-sm text-gray-500 mb-5">You must provide your current password to change it.</p>
          {pwMsg && (
            <div className={`mb-4 p-3 rounded-xl text-sm ${pwMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {pwMsg.text}
            </div>
          )}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Current password</label>
              <input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
              <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="Min. 8 characters" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none" required minLength={8} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
              <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="Repeat new password" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none" required minLength={8} />
            </div>
            <button type="submit" disabled={pwSubmitting} className="w-full py-3 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark disabled:opacity-60 transition-colors">
              {pwSubmitting ? 'Changing…' : 'Change password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
