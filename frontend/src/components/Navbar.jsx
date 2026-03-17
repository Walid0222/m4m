import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingCart,
  PackageCheck,
  MessageCircle,
  Wallet,
  Banknote,
  RotateCcw,
  Scale,
  AlertTriangle,
  ShieldCheck,
  ShieldX,
  UserCheck,
  UserX,
  Bell,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useBalanceVisibility } from '../contexts/BalanceVisibilityContext';
import { useAuth } from '../contexts/AuthContext';
import { getWallet, getNotifications, markNotificationRead, searchOfferTypes, getToken, getSellerWarnings, toggleVacationMode, getConversationsUnreadTotal } from '../services/api';
import { useRefresh } from '../contexts/RefreshContext';
import { getCategoryColor } from '../lib/categoryColor';

function highlightSearchInName(name, searchQuery) {
  const q = (searchQuery || '').trim();
  if (!q || !name) return name;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const parts = name.split(new RegExp(`(${escaped})`, 'gi'));
    if (parts.length === 1) return name;
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <span key={i} className="font-semibold bg-m4m-purple/20 text-m4m-purple rounded px-0.5">{part}</span>
      ) : (
        part
      )
    );
  } catch {
    return name;
  }
}

export default function Navbar() {
  const { user, logout, avatar, refreshUser } = useAuth();
  const { tick } = useRefresh();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const searchRef = useRef(null);
  const suggestAbortRef = useRef(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [warningCount, setWarningCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showAggregatedOrders, setShowAggregatedOrders] = useState(false);
  const [chatUnreadTotal, setChatUnreadTotal] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [vacationToggleLoading, setVacationToggleLoading] = useState(false);
  const profileRef = useRef(null);
  const desktopNotificationsRef = useRef(null);
  const mobileNotificationsRef = useRef(null);
  const { showBalance, toggleShowBalance } = useBalanceVisibility();

  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  const refreshWallet = useCallback(async () => {
    if (!user || !getToken()) {
      setWalletBalance(null);
      return;
    }
    let cancelled = false;
    try {
      const d = await getWallet();
      if (!cancelled && d != null) {
        const available = d.available_balance ?? d.balance;
        setWalletBalance(available);
      }
    } catch {
      // ignore; wallet can be refreshed again later
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  // Fetch unread admin warnings count for sellers
  useEffect(() => {
    if (!user?.is_seller || !getToken()) { setWarningCount(0); return; }
    let cancelled = false;
    getSellerWarnings().then((data) => {
      if (!cancelled) {
        const list = Array.isArray(data) ? data : (data?.warnings ?? []);
        setWarningCount(list.filter((w) => !w.is_read).length);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  // Clear notifications and chat unread when user logs out / changes
  useEffect(() => {
    if (!user || !getToken()) {
      setNotifications([]);
      setChatUnreadTotal(0);
    }
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    if (!user || !getToken()) return;
    let cancelled = false;
    try {
      const list = await getNotifications();
      if (!cancelled && Array.isArray(list)) {
        setNotifications(list);
      }
    } catch {
      // ignore; will retry on next tick
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  const refreshChatUnread = useCallback(async () => {
    if (!user || !getToken()) {
      setChatUnreadTotal(0);
      return;
    }
    let cancelled = false;
    try {
      const data = await getConversationsUnreadTotal();
      if (!cancelled && data && typeof data.total === 'number') {
        setChatUnreadTotal(data.total);
      }
    } catch {
      if (!cancelled) setChatUnreadTotal(0);
    }
    return () => { cancelled = true; };
  }, [user]);

  // Auto-refresh notifications and chat unread when global refresh tick advances
  useEffect(() => {
    if (!tick) return;
    refreshNotifications();
    refreshWallet();
    refreshChatUnread();
  }, [tick, refreshNotifications, refreshWallet, refreshChatUnread]);

  useEffect(() => {
    if (notificationsOpen && user && getToken()) {
      refreshNotifications();
    }
  }, [notificationsOpen, user, refreshNotifications]);

  // Allow other parts of the app to force a notification refresh via a DOM event
  useEffect(() => {
    const handler = () => {
      refreshNotifications();
    };
    window.addEventListener('notifications:refresh', handler);
    return () => window.removeEventListener('notifications:refresh', handler);
  }, [refreshNotifications]);

  useEffect(() => {
    refreshChatUnread();
  }, [refreshChatUnread]);

  useEffect(() => {
    const handler = () => refreshChatUnread();
    window.addEventListener('chat:refresh', handler);
    return () => window.removeEventListener('chat:refresh', handler);
  }, [refreshChatUnread]);

  // Allow other parts of the app to force a wallet refresh via a DOM event
  useEffect(() => {
    const handler = () => {
      refreshWallet();
    };
    window.addEventListener('wallet:refresh', handler);
    return () => window.removeEventListener('wallet:refresh', handler);
  }, [refreshWallet]);

  useEffect(() => {
    function outside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      const insideDesktop = desktopNotificationsRef.current?.contains(e.target);
      const insideMobile = mobileNotificationsRef.current?.contains(e.target);
      if (!insideDesktop && !insideMobile) setNotificationsOpen(false);
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  // Autocomplete: fetch offer types (service catalog) when query changes
  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    setSuggestionLoading(true);
    try {
      const result = await searchOfferTypes({ q, limit: 10 });
      const items = Array.isArray(result) ? result : [];
      setSuggestions(items);
      setShowSuggestions(items.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const t = setTimeout(() => fetchSuggestions(q), 300);
    return () => clearTimeout(t);
  }, [searchQuery, fetchSuggestions]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setShowSuggestions(false);
    navigate(q ? `/?search=${encodeURIComponent(q)}` : '/');
    setMobileMenuOpen(false);
  };

  const handleSuggestionClick = (offerType) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/offer-type/${offerType.slug}`);
    setMobileMenuOpen(false);
  };

  const rawBalanceDisplay =
    walletBalance !== null ? `${Number(walletBalance).toFixed(2)} MAD` : '—';
  const balanceDisplay =
    rawBalanceDisplay !== '—' && !showBalance ? '••••• MAD' : rawBalanceDisplay;

  // Group notifications for display (aggregate new_order into a single item)
  const displayNotifications = useMemo(() => {
    const newOrders = [];
    const others = [];

    notifications.forEach((n) => {
      const type = n.type || n.data?.type;
      if (type === 'new_order') {
        newOrders.push(n);
      } else if (type !== 'new_message') {
        // Keep existing behavior: hide chat notifications from the dropdown
        others.push(n);
      }
    });

    if (newOrders.length === 0) {
      return others;
    }

    const count = newOrders.length;
    const message =
      count === 1 ? '1 new order received' : `${count} new orders received`;
    const aggregate = {
      kind: 'aggregated_new_orders',
      id: 'agg_new_orders',
      type: 'new_order',
      message,
      count,
      items: newOrders,
    };

    // For now, show aggregate first; others follow as usual
    return [aggregate, ...others];
  }, [notifications]);

  const unreadMessages = chatUnreadTotal;
  const unreadCount = notifications.filter((n) => {
    const type = n.type || n.data?.type;
    return type !== 'new_message' && !n.read_at;
  }).length;

  function getNotificationLink(n) {
    const data = n.data || {};
    // Prefer explicit link from backend when provided
    if (n.link) return n.link;
    if (data.link) return data.link;

    const type = n.type || data.type;
    if (type === 'new_order') return '/seller-dashboard';
    if (type === 'new_message' && data.conversation_id) return `/chat?conversation=${data.conversation_id}`;
    if (type === 'order_delivered') return '/orders';
    if (type === 'deposit_approved' || type === 'withdraw_approved') return '/wallet';
    return null;
  }

  function getNotificationIcon(type) {
    const baseClass = 'flex-shrink-0';
    const size = 18;
    switch (type) {
      case 'new_order':
        return <ShoppingCart size={size} className={`${baseClass} text-amber-500`} />;
      case 'order_delivered':
      case 'order_completed':
        return <PackageCheck size={size} className={`${baseClass} text-green-500`} />;
      case 'new_message':
      case 'support_reply':
        return <MessageCircle size={size} className={`${baseClass} text-blue-500`} />;
      case 'deposit_approved':
      case 'escrow_payout_released':
        return <Wallet size={size} className={`${baseClass} text-green-500`} />;
      case 'withdraw_approved':
        return <Banknote size={size} className={`${baseClass} text-gray-600`} />;
      case 'dispute_refunded':
      case 'escrow_refunded_buyer':
      case 'escrow_refunded_seller':
        return <RotateCcw size={size} className={`${baseClass} text-green-500`} />;
      case 'dispute_opened':
      case 'dispute_seller_paid':
      case 'dispute_resolved_buyer_loses':
      case 'dispute_refunded_to_buyer':
        return <Scale size={size} className={`${baseClass} text-amber-500`} />;
      case 'seller_warning':
      case 'seller_report':
        return <AlertTriangle size={size} className={`${baseClass} text-amber-500`} />;
      case 'seller_banned':
        return <UserX size={size} className={`${baseClass} text-red-500`} />;
      case 'seller_unbanned':
        return <UserCheck size={size} className={`${baseClass} text-green-500`} />;
      case 'verification_approved':
        return <ShieldCheck size={size} className={`${baseClass} text-green-500`} />;
      case 'verification_rejected':
        return <ShieldX size={size} className={`${baseClass} text-red-500`} />;
      case 'escrow_payout_delayed':
        return <Bell size={size} className={`${baseClass} text-amber-500`} />;
      default:
        return null;
    }
  }

  function getNotificationDisplay(n) {
    const type = n.type || n.data?.type;
    const data = n.data || {};
    let message = data.message || n.message || 'Notification';
    if (
      (type === 'dispute_refunded' || type === 'escrow_refunded_buyer') &&
      typeof data.amount === 'number'
    ) {
      message = `Your refund of MAD ${Number(data.amount).toFixed(2)} has been processed.`;
    }
    const icon = getNotificationIcon(type);
    return { icon, message };
  }

  const isAggregatedNewOrders = (n) => n && n.kind === 'aggregated_new_orders';

  async function handleOrderNotificationClick(item) {
    // Mark this specific notification as read if needed
    if (!item.read_at) {
      try {
        await markNotificationRead(item.id);
        setNotifications((prev) =>
          prev.map((x) =>
            x.id === item.id ? { ...x, read_at: new Date().toISOString() } : x
          )
        );
      } catch {
        // ignore; state will sync on next refresh
      }
    }
    setNotificationsOpen(false);
    setMobileMenuOpen(false);
    navigate('/seller-dashboard');
  }

  async function handleNotificationClick(n) {
    const link = getNotificationLink(n);
    if (!n.read_at) {
      try {
        await markNotificationRead(n.id);
        setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
      } catch {}
    }
    setNotificationsOpen(false);
    setMobileMenuOpen(false);
    if (link) navigate(link);
  }

  const closeAll = () => { setProfileOpen(false); setMobileMenuOpen(false); };

  const DropdownLink = ({ to, icon, children, className = '' }) => (
    <Link
      to={to}
      onClick={closeAll}
      className={`flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors ${className}`}
    >
      {icon}
      {children}
    </Link>
  );

  const showVacationBanner = user?.is_seller && (user?.vacation_mode === true || user?.vacation_mode === 1);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      {/* Vacation mode banner for sellers */}
      {showVacationBanner && (
        <div className="bg-amber-100 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5">
            <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="text-amber-600 shrink-0" aria-hidden>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.29 3.86L1.82 18a1 1 0 00.86 1.5h18.64a1 1 0 00.86-1.5L13.71 3.86a1 1 0 00-1.72 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-amber-900">Vacation Mode Enabled</p>
                  <p className="text-xs text-amber-800 mt-0.5">Your products are temporarily unavailable to buyers. Disable vacation mode to resume sales.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (vacationToggleLoading) return;
                  setVacationToggleLoading(true);
                  try {
                    const updated = await toggleVacationMode();
                    if (updated) await refreshUser?.();
                  } catch {
                    /* show error via toast if desired */
                  } finally {
                    setVacationToggleLoading(false);
                  }
                }}
                disabled={vacationToggleLoading}
                className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-200 text-amber-900 hover:bg-amber-300 transition-colors border border-amber-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {vacationToggleLoading ? 'Updating…' : 'Disable vacation mode'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 md:h-16 gap-3 md:gap-4">

          {/* Logo */}
          <Link to="/" onClick={closeAll} className="flex-shrink-0 text-xl font-bold text-m4m-purple">
            M4M
          </Link>

          {/* Center: search with autocomplete */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-auto" ref={searchRef}>
            <div className="relative w-full">
              <input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className="w-full h-10 pl-4 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-m4m-purple focus:border-transparent text-sm"
                aria-label="Search products"
                autoComplete="off"
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-m4m-purple transition-colors" aria-label="Search">
                {suggestionLoading
                  ? <span className="w-4 h-4 border-2 border-gray-300 border-t-m4m-purple rounded-full animate-spin block" />
                  : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                }
              </button>
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {suggestions.map((ot) => (
                    <button
                      key={ot.id}
                      type="button"
                      onMouseDown={() => handleSuggestionClick(ot)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-purple-100 flex-shrink-0 flex items-center justify-center text-purple-600 text-sm">
                        {ot.icon || (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10l9 4 9-4V7" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {highlightSearchInName(ot.service?.name ? `${ot.service.name} ${ot.name}` : ot.name, searchQuery)}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getCategoryColor(ot.category?.slug)}`}>
                            {ot.category?.name || 'Service'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                  <button
                    type="submit"
                    className="w-full px-4 py-2.5 text-sm text-m4m-purple font-medium text-center hover:bg-purple-50 border-t border-gray-100 transition-colors"
                  >
                    See all results for &quot;{searchQuery}&quot; →
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-1 ml-auto">
            {user && (
              <>
                {/* Wallet badge */}
                <Link to="/wallet" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-m4m-purple hover:bg-purple-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span
                    className={`transition-all duration-200 ease-out ${
                      showBalance ? 'opacity-100 blur-0' : 'opacity-80 blur-sm'
                    }`}
                  >
                    {balanceDisplay}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleShowBalance(); }}
                    className="ml-1 text-m4m-purple hover:text-m4m-purple-dark"
                    aria-label={showBalance ? 'Hide balance' : 'Show balance'}
                  >
                    {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </Link>

                {/* Seller admin-warning indicator */}
                {user.is_seller && warningCount > 0 && (
                  <Link
                    to="/seller-dashboard"
                    className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors text-amber-700 bg-amber-50 hover:bg-amber-100"
                    title={`${warningCount} unread warning(s) from M4M Administration`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="hidden lg:inline">Warnings</span>
                    <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {warningCount > 99 ? '99+' : warningCount}
                    </span>
                  </Link>
                )}

                {/* Notification bell */}
                <div className="relative" ref={desktopNotificationsRef}>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen((o) => !o)}
                    className="relative p-2 rounded-xl text-gray-500 hover:text-m4m-purple hover:bg-purple-50 transition-colors"
                    aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl bg-white border border-gray-200 shadow-xl py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="font-semibold text-gray-900">Notifications</span>
                        {unreadCount > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{unreadCount} new</span>}
                      </div>
                      {displayNotifications.length === 0 ? (
                        <p className="px-4 py-8 text-sm text-gray-400 text-center">No notifications yet.</p>
                      ) : (
                        <ul>
                          {displayNotifications.map((n) => {
                            if (isAggregatedNewOrders(n)) {
                              const { icon } = getNotificationDisplay({ type: 'new_order', data: {} });
                              return (
                                <li key={n.id}>
                                  <button
                                    type="button"
                                    onClick={() => setShowAggregatedOrders((prev) => !prev)}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3"
                                  >
                                    <div className="flex items-center gap-3">
                                      {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm text-gray-800 line-clamp-2">{n.message}</p>
                                      </div>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                      {showAggregatedOrders ? 'Hide' : 'View'}
                                    </span>
                                  </button>
                                  {showAggregatedOrders && (
                                    <div className="border-t border-gray-100 bg-gray-50">
                                      {n.items.map((item) => (
                                        <button
                                          key={item.id}
                                          type="button"
                                          onClick={() => handleOrderNotificationClick(item)}
                                          className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 transition-colors flex items-center justify-between text-xs ${
                                            !item.read_at ? 'bg-purple-50' : ''
                                          }`}
                                        >
                                          <div className="flex flex-col">
                                            <span className="font-medium text-gray-800">
                                              Order #{item.data?.order_id ?? item.data?.order_number ?? item.data?.order_id}
                                            </span>
                                            <span className="text-[11px] text-gray-500">
                                              {item.created_at
                                                ? new Date(item.created_at).toLocaleString()
                                                : ''}
                                            </span>
                                          </div>
                                          <span className="ml-3 font-semibold text-gray-900">
                                            {typeof item.data?.total_amount === 'number'
                                              ? `${Number(item.data.total_amount).toFixed(2)} MAD`
                                              : ''}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </li>
                              );
                            }

                            const { icon, message } = getNotificationDisplay(n);
                            return (
                              <li key={n.id}>
                                <button
                                  type="button"
                                  onClick={() => handleNotificationClick(n)}
                                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 ${!n.read_at ? 'bg-purple-50' : ''}`}
                                >
                                  {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm text-gray-800 line-clamp-2">{message}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</p>
                                  </div>
                                  {!n.read_at && <span className="w-2 h-2 rounded-full bg-m4m-purple flex-shrink-0 mt-2" />}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Messages icon (chat) */}
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false);
                    setProfileOpen(false);
                    setMobileMenuOpen(false);
                    navigate('/chat');
                  }}
                  className="relative p-2 rounded-xl text-gray-500 hover:text-m4m-purple hover:bg-purple-50 transition-colors"
                  aria-label={unreadMessages > 0 ? `${unreadMessages} unread messages` : 'Messages'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M5 20l2.586-2.586A2 2 0 018.828 17H19a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11l2-2" />
                  </svg>
                  {unreadMessages > 0 && (
                    <span className="absolute top-1 right-1 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </button>
              </>
            )}

            {/* Profile dropdown / Login button */}
            <div className="relative" ref={profileRef}>
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => setProfileOpen((o) => !o)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    aria-expanded={profileOpen}
                  >
                    <span className="w-8 h-8 rounded-full bg-m4m-purple text-white flex items-center justify-center text-sm font-bold overflow-hidden">
                      {avatar
                        ? <img
                            src={user?.updated_at ? `${avatar}?v=${encodeURIComponent(user.updated_at)}` : avatar}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        : (user.name?.charAt(0)?.toUpperCase() || '?')
                      }
                    </span>
                    <span className="hidden lg:inline max-w-[96px] truncate text-gray-700">{user.name}</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-gray-200 shadow-xl py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                      <DropdownLink to="/profile" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}>My Profile</DropdownLink>
                      <DropdownLink to="/orders" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}>My Orders</DropdownLink>
                      <DropdownLink to="/favorites" icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>}>My Favorites</DropdownLink>
                      {user.is_admin ? (
                        <DropdownLink to="/admin?tab=disputes" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}>Disputes</DropdownLink>
                      ) : user.is_seller ? (
                        <DropdownLink to="/seller-disputes" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}>Disputes</DropdownLink>
                      ) : (
                        <DropdownLink to="/disputes" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}>My Disputes</DropdownLink>
                      )}
                      <DropdownLink to="/chat" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}>Messages</DropdownLink>
                      <DropdownLink to="/wallet" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}>Wallet</DropdownLink>
                      <DropdownLink to="/settings" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}>Settings</DropdownLink>
                      {user.is_seller && (
                        <DropdownLink to="/seller-dashboard" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}>Seller Dashboard</DropdownLink>
                      )}
                      {user.is_admin && (
                        <DropdownLink to="/admin" className="text-amber-600" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}>Admin Panel</DropdownLink>
                      )}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button
                          type="button"
                          onClick={() => { closeAll(); logout(); }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Log out
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Link to="/login" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors">
                  Log in
                </Link>
              )}
            </div>
          </div>

          {/* Mobile right: bell + hamburger */}
          <div className="flex md:hidden items-center gap-1 ml-auto">
            {user && (
              <div className="relative" ref={mobileNotificationsRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((o) => !o)}
                  className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
                  aria-label="Notifications"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-2xl bg-white border border-gray-200 shadow-xl z-50">
                    <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900 text-sm">Notifications</div>
                      {displayNotifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-400 text-center">No notifications.</p>
                    ) : (
                      <ul>
                          {displayNotifications.map((n) => {
                          const { icon, message } = getNotificationDisplay(n);
                          return (
                            <li key={n.id}>
                              <button type="button" onClick={() => handleNotificationClick(n)} className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 ${!n.read_at ? 'bg-purple-50' : ''}`}>
                                {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
                                <p className="text-sm text-gray-800 line-clamp-2">{message}</p>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen
                ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              }
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white py-3">
            <form onSubmit={handleSearch} className="px-4 mb-3">
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-4 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-m4m-purple text-sm"
                  aria-label="Search products"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-m4m-purple" aria-label="Search">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>

            <nav className="px-2 flex flex-col gap-0.5">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 mb-1">
                    <span className="w-9 h-9 rounded-full bg-m4m-purple text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                      {avatar
                        ? <img
                            src={user?.updated_at ? `${avatar}?v=${encodeURIComponent(user.updated_at)}` : avatar}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        : (user.name?.charAt(0)?.toUpperCase() || '?')
                      }
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  {[
                    { to: '/profile', label: 'My Profile' },
                    { to: '/orders', label: 'My Orders' },
                    { to: '/chat', label: 'Messages' },
                    { to: '/wallet', label: `Wallet — ${balanceDisplay}` },
                    ...(user.is_seller ? [{ to: '/seller-dashboard', label: 'Seller Dashboard' }] : []),
                    ...(user.is_admin ? [{ to: '/admin', label: 'Admin Panel' }] : []),
                  ].map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={closeAll}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => { closeAll(); logout(); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors mt-1"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={closeAll} className="mx-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors">
                  Log in
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
