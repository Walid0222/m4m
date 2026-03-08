import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getWallet, getOrders, paginatedItems, getToken } from '../services/api';

export default function UserProfilePage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const handleOpenEdit = () => setEditOpen(true);

  useEffect(() => {
    if (!user || !getToken()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      getWallet().catch(() => null),
      getOrders({ per_page: 500 }).catch(() => ({ data: [] })),
    ]).then(([walletData, ordersData]) => {
      if (cancelled) return;
      setWallet(walletData);
      const list = paginatedItems(ordersData);
      setOrders(Array.isArray(list) ? list : []);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  // Edit profile: placeholder until backend adds PATCH /me

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-m4m-gray-500 mb-4">Log in to view your profile.</p>
        <Link to="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-light">
          Sign in
        </Link>
      </div>
    );
  }

  const balance = wallet != null ? Number(wallet.balance ?? 0) : null;
  const totalOrders = orders.length;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <h1 className="text-2xl font-bold text-m4m-black mb-6">My Profile</h1>

      <div className="rounded-2xl border border-m4m-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Profile header */}
        <div className="p-6 md:p-8 border-b border-m4m-gray-200 bg-gradient-to-br from-m4m-gray-50 to-white">
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-full bg-m4m-purple text-white flex items-center justify-center text-2xl font-bold shrink-0">
              {user.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-m4m-black">{user.name || 'User'}</h2>
              <p className="text-m4m-gray-600 truncate">{user.email}</p>
              <button
                type="button"
                onClick={handleOpenEdit}
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-m4m-purple hover:text-m4m-purple-dark"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit profile
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 divide-x divide-m4m-gray-200">
          <div className="p-6 text-center">
            <p className="text-sm font-medium text-m4m-gray-500">Wallet balance</p>
            <p className="mt-1 text-2xl font-bold text-m4m-black">
              {loading ? '—' : balance != null ? `$${balance.toFixed(2)}` : '—'}
            </p>
            <Link to="/wallet" className="mt-2 inline-block text-sm text-m4m-purple hover:underline">
              View wallet
            </Link>
          </div>
          <div className="p-6 text-center">
            <p className="text-sm font-medium text-m4m-gray-500">Total orders</p>
            <p className="mt-1 text-2xl font-bold text-m4m-black">
              {loading ? '—' : totalOrders}
            </p>
            <Link to="/orders" className="mt-2 inline-block text-sm text-m4m-purple hover:underline">
              View orders
            </Link>
          </div>
        </div>
      </div>

      {/* Edit profile modal - placeholder until PATCH /me exists */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setEditOpen(false)}>
          <div className="rounded-2xl bg-white shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-m4m-black mb-4">Edit profile</h3>
            <p className="text-m4m-gray-600 mb-6">Profile editing will be available soon.</p>
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="w-full py-2.5 rounded-lg font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-light"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
