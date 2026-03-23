import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams, useNavigationType } from 'react-router-dom';
import {
  LayoutDashboard,
  Scale,
  Wallet,
  ArrowDownToLine,
  Flag,
  ShieldCheck,
  CircleDot,
  Package,
  Tag,
  Megaphone,
  Users,
  MessageCircle,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import { useRefresh } from '../contexts/RefreshContext';
import { useMarketplaceSettings } from '../contexts/MarketplaceSettingsContext';
import {
  getToken,
  getAdminDepositRequests,
  getAdminWithdrawRequests,
  verifyAdminDeposit,
  verifyAdminWithdraw,
  getAdminReports,
  resolveAdminReport,
  getAdminVerificationRequests,
  resolveVerificationRequest,
  getAdminSupportConversations,
  getAdminSupportMessages,
  sendAdminSupportReply,
  getAdminDisputes,
  resolveAdminDispute,
  releaseAdminDispute,
  refundAdminDispute,
  getAdminStats,
  getAdminCoupons,
  createAdminCoupon,
  deleteAdminCoupon,
  getAdminAnnouncements,
  createAdminAnnouncement,
  updateAdminAnnouncement,
  deleteAdminAnnouncement,
  getAdminEscrow,
  adminReleaseOrderEscrow,
  adminHoldOrderEscrow,
  adminRefundOrderEscrow,
  getAdminServiceRequests,
  approveServiceRequest,
  rejectServiceRequest,
  updateAdminServiceRequest,
  deleteAdminServiceRequest,
  getCategories,
  getAdminServices,
  createAdminService,
  updateAdminService,
  deleteAdminService,
  getAdminOfferTypes,
  createAdminOfferType,
  updateAdminOfferType,
  deleteAdminOfferType,
  getAdminAffiliates,
  paginatedItems,
} from '../services/api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'escrow', label: 'Escrow Monitoring', icon: Scale },
  { id: 'deposits', label: 'Deposits', icon: Wallet },
  { id: 'withdrawals', label: 'Withdrawals', icon: ArrowDownToLine },
  { id: 'reports', label: 'Reports', icon: Flag },
  { id: 'disputes', label: 'Disputes', icon: Scale },
  { id: 'verification', label: 'Verifications', icon: ShieldCheck },
  { id: 'service-requests', label: 'Service requests', icon: CircleDot },
  { id: 'services', label: 'Service Management', icon: Package },
  { id: 'coupons', label: 'Coupons', icon: Tag },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'affiliates', label: 'Affiliates', icon: Users },
  { id: 'support', label: 'Support Chat', icon: MessageCircle },
  { id: 'marketplace-settings', label: 'Marketplace', icon: Settings },
];

const REPORT_FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'product', label: 'Products' },
  { id: 'seller', label: 'Sellers' },
];

function Flash({ msg }) {
  if (!msg) return null;
  return (
    <div className={`mb-6 p-4 rounded-xl border text-sm ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`} role="alert">
      {msg.text}
    </div>
  );
}

function TabButton({ id, label, active, onClick, badgeCount }) {
  const showBadge = !active && Number(badgeCount) > 0;
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-m4m-purple text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
    >
      <span className="inline-flex items-center gap-1">
        <span>{label}</span>
        {showBadge && (
          <span className="min-w-[18px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </span>
    </button>
  );
}

/* ── Deposits ─────────────────────────────────────────────────────────────── */
function DepositsPanel() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const [confirm, setConfirm] = useState(null); // { id, action }

  useEffect(() => {
    let c = false;
    getAdminDepositRequests().then((r) => { if (!c) setDeposits(paginatedItems(r) ?? []); }).catch(() => {}).finally(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, []);

  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 3000); return () => clearTimeout(t); }, [flash]);

  const handle = async (id, action) => {
    try {
      await verifyAdminDeposit(id, action);
      setDeposits((d) => d.filter((x) => x.id !== id));
      setFlash({ type: 'success', text: action === 'approve' ? 'Deposit approved.' : 'Deposit rejected.' });
      setConfirm(null);
    } catch { setFlash({ type: 'error', text: 'Action failed.' }); }
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <>
      <Flash msg={flash} />
      {confirm && (
        <ConfirmModal
          title={confirm.action === 'approve' ? 'Approve deposit' : 'Reject deposit'}
          message={
            confirm.action === 'approve'
              ? 'Are you sure you want to approve this deposit? Funds will be credited to the user\'s wallet.'
              : 'Are you sure you want to reject this deposit request?'
          }
          confirmLabel={confirm.action === 'approve' ? 'Approve' : 'Reject'}
          onConfirm={() => handle(confirm.id, confirm.action)}
          onCancel={() => setConfirm(null)}
        />
      )}
      <h2 className="text-base font-semibold text-gray-900 mb-4">Deposit requests</h2>
      {deposits.length === 0 ? <p className="text-gray-400 text-sm">No deposit requests.</p> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>{['User', 'Amount', 'Method', 'Reference', 'Status', 'Date', 'Actions'].map((h) => <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {deposits.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">
                    {d.user ? (
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{d.user.name || d.user.email || '—'}</p>
                        {d.user.email && (
                          <p className="text-xs text-gray-500">{d.user.email}</p>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{Number(d.amount).toFixed(2)} MAD</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                      {d.payment_method === 'orange_recharge' ? 'Orange Recharge' : 'Bank transfer'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {d.payment_method === 'bank_transfer' ? (d.reference_code || `#${d.id}`) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${d.status === 'completed' ? 'bg-green-100 text-green-700' : d.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{d.status ?? 'pending'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setConfirm({ id: d.id, action: 'approve' })} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors">Approve</button>
                      <button onClick={() => setConfirm({ id: d.id, action: 'reject' })} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ── Withdrawals ──────────────────────────────────────────────────────────── */
function WithdrawalsPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState({});
  const [confirm, setConfirm] = useState(null); // { id, action }

  useEffect(() => {
    let c = false;
    getAdminWithdrawRequests().then((r) => { if (!c) setItems(paginatedItems(r) ?? []); }).catch(() => {}).finally(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, []);

  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 3000); return () => clearTimeout(t); }, [flash]);

  const handle = async (id, action) => {
    try {
      await verifyAdminWithdraw(id, { action, receipt: selectedReceipt[id] });
      setItems((w) => w.filter((x) => x.id !== id));
      setFlash({ type: 'success', text: action === 'approve' ? 'Withdrawal approved.' : 'Withdrawal rejected.' });
      setSelectedReceipt((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });
      setConfirm(null);
    } catch { setFlash({ type: 'error', text: 'Action failed.' }); }
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <>
      <Flash msg={flash} />
      {confirm && (
        <ConfirmModal
          title={confirm.action === 'approve' ? 'Approve withdrawal' : 'Reject withdrawal'}
          message={
            confirm.action === 'approve'
              ? 'Are you sure you want to approve this withdrawal? This will deduct funds from the seller\'s wallet.'
              : 'Are you sure you want to reject this withdrawal request?'
          }
          confirmLabel={confirm.action === 'approve' ? 'Approve' : 'Reject'}
          onConfirm={() => handle(confirm.id, confirm.action)}
          onCancel={() => setConfirm(null)}
        />
      )}
      <h2 className="text-base font-semibold text-gray-900 mb-4">Withdraw requests</h2>
      {items.length === 0 ? <p className="text-gray-400 text-sm">No pending withdrawals.</p> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['User', 'Amount', 'Payment details', 'Date', 'Receipt', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
                {items.map((w) => {
                  const file = selectedReceipt[w.id];
                  return (
                    <tr key={w.id}>
                      <td className="px-4 py-3">{w.user?.name ?? w.user?.email ?? '—'}</td>
                      <td className="px-4 py-3 font-medium">{Number(w.amount).toFixed(2)} MAD</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={w.payment_details}>
                        {w.payment_details || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-600">
                            <span className="block mb-1">Upload receipt</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg"
                              onChange={(e) =>
                                setSelectedReceipt((prev) => ({
                                  ...prev,
                                  [w.id]: e.target.files?.[0] || undefined,
                                }))
                              }
                              className="block text-xs text-gray-500"
                            />
                          </label>
                          {file && (
                            <span className="text-[11px] text-gray-500 truncate max-w-[180px]">
                              {file.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirm({ id: w.id, action: 'approve' })}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setConfirm({ id: w.id, action: 'reject' })}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ── Escrow Monitoring ────────────────────────────────────────────────────── */
function EscrowPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const [acting, setActing] = useState(null);
  const [confirm, setConfirm] = useState(null); // { orderId, action: 'release'|'hold'|'refund' }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getAdminEscrow();
      setData(r);
    } catch { setData(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 3000); return () => clearTimeout(t); }, [flash]);

  const handleRelease = async (orderId) => {
    setActing(orderId);
    try {
      await adminReleaseOrderEscrow(orderId);
      setFlash({ type: 'success', text: 'Escrow released.' });
      load();
      setConfirm(null);
    } catch { setFlash({ type: 'error', text: 'Release failed.' }); }
    finally { setActing(null); }
  };

  const handleHold = async (orderId) => {
    setActing(orderId);
    try {
      await adminHoldOrderEscrow(orderId);
      setFlash({ type: 'success', text: 'Release extended by 48 hours.' });
      load();
      setConfirm(null);
    } catch { setFlash({ type: 'error', text: 'Hold failed.' }); }
    finally { setActing(null); }
  };

  const handleRefund = async (orderId) => {
    setActing(orderId);
    try {
      await adminRefundOrderEscrow(orderId);
      setFlash({ type: 'success', text: 'Buyer refunded.' });
      load();
      setConfirm(null);
    } catch { setFlash({ type: 'error', text: 'Refund failed.' }); }
    finally { setActing(null); }
  };

  const runEscrowAction = () => {
    if (!confirm) return;
    if (confirm.action === 'release') handleRelease(confirm.orderId);
    else if (confirm.action === 'hold') handleHold(confirm.orderId);
    else if (confirm.action === 'refund') handleRefund(confirm.orderId);
  };

  const ESCROW_MESSAGES = {
    release: 'This action will release funds to the seller.',
    hold: 'Release will be extended by 48 hours. Use this if the order needs more time.',
    refund: 'Are you sure you want to refund the buyer? Funds will be returned and the seller will not receive payment.',
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  const orders = data?.orders_pending_release ?? [];
  const total = data?.total_pending_escrow ?? 0;
  const count = data?.pending_orders_count ?? 0;

  return (
    <>
      <Flash msg={flash} />
      {confirm && (
        <ConfirmModal
          title={confirm.action === 'release' ? 'Release escrow' : confirm.action === 'hold' ? 'Hold escrow' : 'Refund buyer'}
          message={ESCROW_MESSAGES[confirm.action]}
          confirmLabel={confirm.action === 'release' ? 'Release' : confirm.action === 'hold' ? 'Hold 48h' : 'Refund buyer'}
          confirmDanger={confirm.action === 'refund'}
          onConfirm={runEscrowAction}
          onCancel={() => setConfirm(null)}
          loading={acting === confirm.orderId}
        />
      )}
      <h2 className="text-base font-semibold text-gray-900 mb-4">Escrow Monitoring</h2>
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-amber-50/50 p-4">
          <p className="text-xs text-gray-500 mb-0.5">Total pending escrow</p>
          <p className="text-xl font-bold text-amber-700">{Number(total).toFixed(2)} MAD</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs text-gray-500 mb-0.5">Orders pending release</p>
          <p className="text-xl font-bold text-gray-900">{count}</p>
        </div>
      </div>
      {orders.length === 0 ? (
        <p className="text-gray-400 text-sm">No escrow orders (held or pending release).</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Order', 'Seller', 'Amount', 'Release at', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.order_id}>
                  <td className="px-4 py-3 font-medium">#{o.order_number ?? o.order_id}</td>
                  <td className="px-4 py-3">{o.seller?.name ?? o.seller?.email ?? '—'}</td>
                  <td className="px-4 py-3">{Number(o.amount).toFixed(2)} MAD</td>
                  <td className="px-4 py-3 text-gray-500">{o.release_at ? new Date(o.release_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.escrow_status === 'held' ? 'bg-blue-100 text-blue-700' : o.escrow_status === 'disputed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {o.escrow_status === 'held' ? 'Waiting buyer confirmation' : o.escrow_status === 'pending_release' ? 'Pending release' : (o.escrow_status ?? '—')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {o.escrow_status === 'pending_release' && (
                        <>
                          <button
                            onClick={() => setConfirm({ orderId: o.order_id, action: 'release' })}
                            disabled={acting === o.order_id}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                          >
                            {acting === o.order_id ? '…' : 'Release now'}
                          </button>
                          <button
                            onClick={() => setConfirm({ orderId: o.order_id, action: 'hold' })}
                            disabled={acting === o.order_id}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
                          >
                            Hold 48h
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setConfirm({ orderId: o.order_id, action: 'refund' })}
                        disabled={acting === o.order_id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                      >
                        Refund buyer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ── Reports ──────────────────────────────────────────────────────────────── */
const REPORT_ACTIONS = [
  { id: 'ignore', label: 'Ignore', cls: 'bg-gray-200 text-gray-700 hover:bg-gray-300' },
  { id: 'warn', label: 'Warn seller', cls: 'bg-amber-500 text-white hover:bg-amber-600' },
  { id: 'suspend', label: 'Suspend', cls: 'bg-orange-600 text-white hover:bg-orange-700' },
  { id: 'ban', label: 'Ban', cls: 'bg-red-700 text-white hover:bg-red-800' },
  { id: 'delete', label: 'Delete listing', cls: 'bg-red-600 text-white hover:bg-red-700' },
];

function ReportsPanel() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [flash, setFlash] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [confirm, setConfirm] = useState(null); // { reportId, action, report }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getAdminReports();
      setReports(paginatedItems(r) ?? []);
    } catch { setReports([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 3000); return () => clearTimeout(t); }, [flash]);

  const handleAction = async (reportId, action) => {
    try {
      await resolveAdminReport(reportId, action);
      setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: action === 'ignore' ? 'ignored' : 'resolved', admin_action: action } : r));
      setFlash({ type: 'success', text: `Action "${action}" applied.` });
      setExpanded(null);
      setConfirm(null);
    } catch { setFlash({ type: 'error', text: 'Action failed.' }); }
  };

  const MODERATION_MESSAGES = {
    ignore: 'This report will be marked as ignored with no action taken.',
    warn: 'The seller will receive a warning.',
    suspend: 'The seller will be suspended.',
    ban: 'The seller will be banned from the marketplace.',
    delete: 'The product listing will be permanently deleted.',
  };

  const filtered = reports.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !r.status || r.status === 'pending';
    if (filter === 'resolved') return r.status === 'resolved' || r.status === 'ignored';
    if (filter === 'product') return r.type === 'product';
    if (filter === 'seller') return r.type === 'seller';
    return true;
  });

  const REASON_LABELS = { scam: 'Scam / Fraud', fake_product: 'Fake product', abuse: 'Abuse / Harassment', other: 'Other' };

  return (
    <>
      <Flash msg={flash} />
      {confirm && (
        <ConfirmModal
          title={`Confirm: ${REPORT_ACTIONS.find((a) => a.id === confirm.action)?.label ?? confirm.action}`}
          message={MODERATION_MESSAGES[confirm.action] ?? `Apply action "${confirm.action}" to this report?`}
          confirmLabel={REPORT_ACTIONS.find((a) => a.id === confirm.action)?.label ?? 'Confirm'}
          confirmDanger={['ban', 'delete'].includes(confirm.action)}
          onConfirm={() => handleAction(confirm.reportId, confirm.action)}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-base font-semibold text-gray-900">Reports</h2>
        <div className="flex flex-wrap gap-1.5">
          {REPORT_FILTER_OPTIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f.id ? 'bg-m4m-purple text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f.label}
              {f.id !== 'all' && (
                <span className="ml-1 opacity-70">
                  ({reports.filter((r) => {
                    if (f.id === 'pending') return !r.status || r.status === 'pending';
                    if (f.id === 'resolved') return r.status === 'resolved' || r.status === 'ignored';
                    if (f.id === 'product') return r.type === 'product';
                    if (f.id === 'seller') return r.type === 'seller';
                    return true;
                  }).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Loading…</p>
        : filtered.length === 0 ? <p className="text-gray-400 text-sm">No reports in this category.</p>
        : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const isResolved = r.status === 'resolved' || r.status === 'ignored';
              return (
                <div key={r.id} className={`rounded-xl border p-4 ${isResolved ? 'border-gray-100 bg-gray-50' : 'border-red-100 bg-white'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Type badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${r.type === 'seller' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {r.type ?? 'product'}
                        </span>
                        {/* Reason */}
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">
                          {REASON_LABELS[r.reason] ?? r.reason ?? 'Unknown'}
                        </span>
                        {/* Status */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isResolved ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>
                          {r.status ?? 'Pending'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Target ID: {r.target_id ?? '—'}
                        {r.target_name && <span className="text-gray-500 font-normal"> · {r.target_name}</span>}
                      </p>
                      {r.reporter?.name && <p className="text-xs text-gray-400">Reported by: {r.reporter.name}</p>}
                      <p className="text-xs text-gray-400">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</p>
                    </div>
                    {!isResolved && (
                      <button
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        className="text-xs font-medium text-m4m-purple hover:underline flex-shrink-0"
                      >
                        {expanded === r.id ? 'Hide actions ↑' : 'Take action ↓'}
                      </button>
                    )}
                    {isResolved && r.admin_action && (
                      <span className="text-xs text-gray-400 italic">Action: {r.admin_action}</span>
                    )}
                  </div>

                  {/* Description */}
                  {r.description && (
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-2.5 border border-gray-100 line-clamp-3">{r.description}</p>
                  )}

                  {/* Actions panel */}
                  {expanded === r.id && !isResolved && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2 font-medium">Select an action:</p>
                      <div className="flex flex-wrap gap-2">
                        {REPORT_ACTIONS.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => setConfirm({ reportId: r.id, action: a.id, report: r })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${a.cls}`}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      }
    </>
  );
}

/* ── Seller verification ──────────────────────────────────────────────────── */
function VerificationPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const [confirm, setConfirm] = useState(null); // { id, action }

  useEffect(() => {
    let c = false;
    getAdminVerificationRequests().then((r) => { if (!c) setRequests(paginatedItems(r) ?? []); }).catch(() => {}).finally(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, []);

  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 3000); return () => clearTimeout(t); }, [flash]);

  const handle = async (id, action) => {
    try {
      await resolveVerificationRequest(id, action);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: action } : r));
      setFlash({ type: 'success', text: action === 'approved' ? 'Seller verified. Badge will appear on their profile.' : 'Request rejected.' });
      setConfirm(null);
    } catch { setFlash({ type: 'error', text: 'Action failed.' }); }
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <>
      <Flash msg={flash} />
      {confirm && (
        <ConfirmModal
          title={confirm.action === 'approved' ? 'Approve verification' : 'Reject verification'}
          message={
            confirm.action === 'approved'
              ? 'Are you sure you want to approve this seller verification? The verified badge will appear on their profile.'
              : 'Are you sure you want to reject this verification request?'
          }
          confirmLabel={confirm.action === 'approved' ? 'Approve' : 'Reject'}
          onConfirm={() => handle(confirm.id, confirm.action)}
          onCancel={() => setConfirm(null)}
        />
      )}
      <h2 className="text-base font-semibold text-gray-900 mb-4">Seller verification requests</h2>
      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">No pending verification requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const isPending = !req.status || req.status === 'pending';
            return (
              <div key={req.id} className={`rounded-xl border p-5 ${isPending ? 'border-blue-100 bg-white' : req.status === 'approved' ? 'border-green-100 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{req.seller?.name ?? `Seller #${req.seller_id ?? req.id}`}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${isPending ? 'bg-amber-100 text-amber-700' : req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {req.status ?? 'pending'}
                      </span>
                    </div>
                    {req.seller?.email && <p className="text-xs text-gray-400">{req.seller.email}</p>}
                    <p className="text-xs text-gray-400">{req.created_at ? new Date(req.created_at).toLocaleString() : ''}</p>
                  </div>
                  {isPending && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirm({ id: req.id, action: 'approved' })}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setConfirm({ id: req.id, action: 'rejected' })}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'National ID — Front', url: req.id_front_url ?? req.national_id_front },
                    { label: 'National ID — Back', url: req.id_back_url ?? req.national_id_back },
                    { label: 'Selfie holding ID', url: req.selfie_with_id_url ?? req.selfie_with_id },
                    { label: 'Bank statement (optional)', url: req.bank_statement_url ?? req.bank_statement },
                  ].map(({ label, url }) => (
                    <div key={label}>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={url}
                            alt={label}
                            className="w-full h-28 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                          <div className="hidden w-full h-28 rounded-lg border border-gray-200 bg-gray-50 items-center justify-center text-xs text-gray-400">
                            Could not load image
                          </div>
                        </a>
                      ) : (
                        <div className="w-full h-28 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                          Not provided
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ── Service requests (sellers requesting new offer types) ───────────────── */
function ServiceRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectModal, setRejectModal] = useState(null); // { id, service_name }
  const [rejectNote, setRejectNote] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [categories, setCategories] = useState([]);
  const [editForm, setEditForm] = useState({ service_name: '', category_id: '', description: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(null); // { action: 'approve'|'delete', id, service_name }

  const load = useCallback(() => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter } : {};
    getAdminServiceRequests(params)
      .then((r) => setRequests(paginatedItems(r) ?? []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 4000); return () => clearTimeout(t); }, [flash]);
  useEffect(() => {
    if (editingRequest) {
      getCategories().then((d) => setCategories(Array.isArray(d) ? d : (d?.categories ?? d?.data ?? []))).catch(() => setCategories([]));
      setEditForm({
        service_name: editingRequest.service_name || '',
        category_id: String(editingRequest.category_id || ''),
        description: editingRequest.description || '',
      });
    }
  }, [editingRequest]);

  const handleApprove = async (id) => {
    try {
      await approveServiceRequest(id);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'approved' } : r));
      setFlash({ type: 'success', text: 'Request approved. New offer type created.' });
      setConfirm(null);
      } catch {
      setFlash({ type: 'error', text: 'Approve failed.' });
    }
  };

  const openRejectModal = (req) => {
    setRejectModal({ id: req.id, service_name: req.service_name });
    setRejectNote('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal || !rejectNote.trim()) return;
    setRejectSubmitting(true);
    try {
      await rejectServiceRequest(rejectModal.id, { admin_note: rejectNote.trim() });
      setRequests((prev) => prev.map((r) => r.id === rejectModal.id ? { ...r, status: 'rejected', admin_note: rejectNote.trim() } : r));
      setRejectModal(null);
      setRejectNote('');
      setFlash({ type: 'success', text: 'Request rejected.' });
    } catch {
      setFlash({ type: 'error', text: 'Reject failed.' });
      } finally {
      setRejectSubmitting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingRequest) return;
    if (!editForm.service_name.trim() || !editForm.category_id) return;
    setEditSubmitting(true);
    try {
      const updated = await updateAdminServiceRequest(editingRequest.id, {
        service_name: editForm.service_name.trim(),
        category_id: parseInt(editForm.category_id, 10),
        description: editForm.description.trim() || undefined,
      });
      setRequests((prev) => prev.map((r) => r.id === editingRequest.id ? { ...r, ...updated } : r));
      setEditingRequest(null);
      setFlash({ type: 'success', text: 'Request updated.' });
    } catch {
      setFlash({ type: 'error', text: 'Update failed.' });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (req) => {
    try {
      await deleteAdminServiceRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      setFlash({ type: 'success', text: 'Request deleted.' });
      setConfirm(null);
    } catch {
      setFlash({ type: 'error', text: 'Delete failed.' });
    }
  };

  if (loading && requests.length === 0) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <>
      <Flash msg={flash} />
      {confirm && (
        <ConfirmModal
          title={confirm.action === 'approve' ? 'Approve service request' : 'Delete service request'}
          message={
            confirm.action === 'approve'
              ? 'Are you sure you want to approve this service request? A new offer type will be created.'
              : `Delete service request "${confirm.service_name}"? This action cannot be undone.`
          }
          confirmLabel={confirm.action === 'approve' ? 'Approve' : 'Delete'}
          confirmDanger={confirm.action === 'delete'}
          onConfirm={() => (confirm.action === 'approve' ? handleApprove(confirm.id) : handleDelete({ id: confirm.id, service_name: confirm.service_name }))}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-base font-semibold text-gray-900">Service requests</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-700"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">No service requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const isPending = req.status === 'pending';
            const isEditing = editingRequest?.id === req.id;
            return (
              <div
                key={req.id}
                className={`rounded-xl border p-4 md:p-5 ${isPending ? 'border-blue-100 bg-white' : req.status === 'approved' ? 'border-green-100 bg-green-50' : 'border-gray-100 bg-gray-50'}`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editForm.service_name}
                      onChange={(e) => setEditForm((f) => ({ ...f, service_name: e.target.value }))}
                      placeholder="Service name"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                    <select
                      value={editForm.category_id}
                      onChange={(e) => setEditForm((f) => ({ ...f, category_id: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Description"
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditingRequest(null)} className="px-3 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">Cancel</button>
                      <button type="button" onClick={handleEditSave} disabled={editSubmitting || !editForm.service_name.trim() || !editForm.category_id} className="px-3 py-2 rounded-lg text-sm bg-m4m-purple text-white hover:bg-purple-600 disabled:opacity-60">Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{req.service_name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${isPending ? 'bg-amber-100 text-amber-700' : req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {req.status}
                          </span>
                        </div>
                        {req.category && <p className="text-xs text-gray-500">Category: {req.category.name}</p>}
                        {req.seller && <p className="text-xs text-gray-400">Requested by: {req.seller.name} {req.seller.email && `(${req.seller.email})`}</p>}
                        <p className="text-xs text-gray-400 mt-1">{req.created_at ? new Date(req.created_at).toLocaleString() : ''}</p>
                        {req.description && <p className="text-sm text-gray-600 mt-2">{req.description}</p>}
                      </div>
                      {isPending && (
                        <div className="flex flex-wrap gap-2 flex-shrink-0">
                          <button type="button" onClick={() => setConfirm({ action: 'approve', id: req.id })} className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors">Approve</button>
                          <button type="button" onClick={() => openRejectModal(req)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors">Reject</button>
                          <button type="button" onClick={() => setEditingRequest(req)} className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Edit</button>
                          <button type="button" onClick={() => setConfirm({ action: 'delete', id: req.id, service_name: req.service_name })} className="px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Delete</button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !rejectSubmitting && setRejectModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject Service Request</h3>
            <p className="text-sm text-gray-500 mb-4">{rejectModal.service_name}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rejection note (required) *</label>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. This service already exists as Amazon Prime Video Account. Please use the existing offer type."
              rows={4}
              maxLength={2000}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setRejectModal(null)} disabled={rejectSubmitting} className="px-4 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleRejectSubmit} disabled={rejectSubmitting || !rejectNote.trim()} className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">{rejectSubmitting ? 'Rejecting…' : 'Reject'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Service Management (services + offer types CRUD) ──────────────────── */
function ServiceManagementPanel() {
  const [services, setServices] = useState([]);
  const [offerTypes, setOfferTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', category_id: '', service_id: '', description: '', status: 'active' });
  const [submitting, setSubmitting] = useState(false);
  const [servicesEditingId, setServicesEditingId] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', icon: '', category_id: '', is_featured: false, display_order: '', homepage_image: '' });
  const [serviceCreateOpen, setServiceCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState(null); // { type: 'offer'|'service', item }

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getAdminServices(),
      getAdminOfferTypes({ per_page: 200, ...(categoryFilter ? { category_id: categoryFilter } : {}) }),
      getCategories(),
    ])
      .then(([svcRes, otRes, catRes]) => {
        setServices(Array.isArray(svcRes) ? svcRes : (svcRes?.data ?? []));
        setOfferTypes(paginatedItems(otRes) ?? []);
        setCategories(Array.isArray(catRes) ? catRes : (catRes?.categories ?? catRes?.data ?? []));
      })
      .catch(() => { setServices([]); setOfferTypes([]); setCategories([]); })
      .finally(() => setLoading(false));
  }, [categoryFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 4000); return () => clearTimeout(t); }, [flash]);

  const openCreate = () => {
    setForm({ name: '', category_id: '', service_id: '', description: '', status: 'active' });
    setCreateOpen(true);
  };

  const openEdit = (ot) => {
    setEditingId(ot.id);
    setForm({
      name: ot.name || '',
      category_id: String(ot.category_id || ''),
      service_id: ot.service_id ? String(ot.service_id) : '',
      description: ot.description || '',
      status: ot.status || 'active',
    });
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.category_id || !form.service_id) return;
    setSubmitting(true);
    try {
      await createAdminOfferType({
        name: form.name.trim(),
        category_id: parseInt(form.category_id, 10),
        service_id: parseInt(form.service_id, 10),
        description: form.description.trim() || undefined,
        status: form.status,
      });
      setCreateOpen(false);
      load();
      setFlash({ type: 'success', text: 'Offer type created.' });
    } catch {
      setFlash({ type: 'error', text: 'Create failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim() || !form.category_id || !form.service_id) return;
    setSubmitting(true);
    try {
      await updateAdminOfferType(editingId, {
        name: form.name.trim(),
        category_id: parseInt(form.category_id, 10),
        service_id: parseInt(form.service_id, 10),
        description: form.description.trim() || undefined,
        status: form.status,
      });
      setEditingId(null);
      load();
      setFlash({ type: 'success', text: 'Service updated.' });
    } catch {
      setFlash({ type: 'error', text: 'Update failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (ot) => {
    const next = ot.status === 'active' ? 'disabled' : 'active';
    try {
      await updateAdminOfferType(ot.id, { status: next });
      setOfferTypes((prev) => prev.map((o) => o.id === ot.id ? { ...o, status: next } : o));
      setFlash({ type: 'success', text: next === 'active' ? 'Service enabled.' : 'Service disabled.' });
    } catch {
      setFlash({ type: 'error', text: 'Update failed.' });
    }
  };

  const handleDelete = async (ot) => {
    try {
      await deleteAdminOfferType(ot.id);
      setOfferTypes((prev) => prev.filter((o) => o.id !== ot.id));
      setFlash({ type: 'success', text: 'Offer type deleted.' });
      setConfirm(null);
    } catch (e) {
      setFlash({ type: 'error', text: e?.message || 'Delete failed.' });
    }
  };

  const handleServiceCreate = async () => {
    if (!serviceForm.name.trim()) return;
    setSubmitting(true);
    try {
      await createAdminService({
        name: serviceForm.name.trim(),
        icon: serviceForm.icon.trim() || undefined,
        category_id: serviceForm.category_id ? parseInt(serviceForm.category_id, 10) : null,
        is_featured: !!serviceForm.is_featured,
        display_order: serviceForm.display_order !== '' && serviceForm.display_order != null ? parseInt(serviceForm.display_order, 10) : null,
        homepage_image: serviceForm.homepage_image?.trim() || null,
      });
      setServiceCreateOpen(false);
      setServiceForm({ name: '', icon: '', category_id: '', is_featured: false, display_order: '', homepage_image: '' });
      load();
      setFlash({ type: 'success', text: 'Service added.' });
    } catch {
      setFlash({ type: 'error', text: 'Create failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleServiceUpdate = async () => {
    if (!servicesEditingId || !serviceForm.name.trim()) return;
    setSubmitting(true);
    try {
      await updateAdminService(servicesEditingId, {
        name: serviceForm.name.trim(),
        icon: serviceForm.icon.trim() || undefined,
        category_id: serviceForm.category_id ? parseInt(serviceForm.category_id, 10) : null,
        is_featured: !!serviceForm.is_featured,
        display_order: serviceForm.display_order !== '' && serviceForm.display_order != null ? parseInt(serviceForm.display_order, 10) : null,
        homepage_image: serviceForm.homepage_image?.trim() || null,
      });
      setServicesEditingId(null);
      load();
      setFlash({ type: 'success', text: 'Service updated.' });
    } catch {
      setFlash({ type: 'error', text: 'Update failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleServiceDelete = async (svc) => {
    try {
      await deleteAdminService(svc.id);
      setServices((prev) => prev.filter((s) => s.id !== svc.id));
      setFlash({ type: 'success', text: 'Service deleted.' });
      setConfirm(null);
    } catch {
      setFlash({ type: 'error', text: 'Delete failed.' });
    }
  };

  return (
    <>
      <Flash msg={flash} />
      {confirm && (
        <ConfirmModal
          title={confirm.type === 'offer' ? 'Delete offer type' : 'Delete service'}
          message={
            confirm.type === 'offer'
              ? `Delete "${confirm.item.name}"? Products using it may be affected. This action cannot be undone.`
              : `Delete service "${confirm.item.name}"? This action cannot be undone.`
          }
          confirmLabel="Delete"
          confirmDanger
          onConfirm={() => (confirm.type === 'offer' ? handleDelete(confirm.item) : handleServiceDelete(confirm.item))}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Services (Spotify, Netflix, etc.) */}
      <section className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900">Services</h2>
          <button type="button" onClick={() => { setServiceCreateOpen(true); setServiceForm({ name: '', icon: '', category_id: '', is_featured: false, display_order: '', homepage_image: '' }); }} className="px-4 py-2 rounded-xl text-sm font-semibold bg-m4m-purple text-white hover:bg-purple-600">Add service</button>
        </div>
        {serviceCreateOpen && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4 flex flex-wrap items-end gap-3">
            <input type="text" value={serviceForm.name} onChange={(e) => setServiceForm((f) => ({ ...f, name: e.target.value }))} placeholder="Service name" className="px-3 py-2 rounded-lg border border-gray-200 text-sm w-48" />
            <input type="text" value={serviceForm.icon} onChange={(e) => setServiceForm((f) => ({ ...f, icon: e.target.value }))} placeholder="Icon (path)" className="px-3 py-2 rounded-lg border border-gray-200 text-sm w-24" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select value={serviceForm.category_id} onChange={(e) => setServiceForm((f) => ({ ...f, category_id: e.target.value }))} className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white w-40">
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!serviceForm.is_featured} onChange={(e) => setServiceForm((f) => ({ ...f, is_featured: e.target.checked }))} className="rounded border-gray-300" />
              Featured
            </label>
            <input type="number" value={serviceForm.display_order} onChange={(e) => setServiceForm((f) => ({ ...f, display_order: e.target.value }))} placeholder="Order" className="px-3 py-2 rounded-lg border border-gray-200 text-sm w-20" />
            <input type="text" value={serviceForm.homepage_image} onChange={(e) => setServiceForm((f) => ({ ...f, homepage_image: e.target.value }))} placeholder="Homepage image URL" className="px-3 py-2 rounded-lg border border-gray-200 text-sm w-40" />
            <button type="button" onClick={handleServiceCreate} disabled={submitting || !serviceForm.name.trim()} className="px-3 py-2 rounded-lg text-sm bg-m4m-purple text-white disabled:opacity-60">Create</button>
            <button type="button" onClick={() => setServiceCreateOpen(false)} className="px-3 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">Cancel</button>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {services.map((svc) => (
            <div key={svc.id} className="rounded-xl border border-gray-200 bg-white p-3 flex items-center justify-between gap-2">
              {servicesEditingId === svc.id ? (
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center">
                  <input type="text" value={serviceForm.name} onChange={(e) => setServiceForm((f) => ({ ...f, name: e.target.value }))} className="flex-1 min-w-0 px-2 py-1.5 rounded border border-gray-200 text-sm" placeholder="Name" />
                  <input type="text" value={serviceForm.icon} onChange={(e) => setServiceForm((f) => ({ ...f, icon: e.target.value }))} placeholder="Icon" className="w-20 px-2 py-1.5 rounded border border-gray-200 text-sm" />
                  <select value={serviceForm.category_id} onChange={(e) => setServiceForm((f) => ({ ...f, category_id: e.target.value }))} className="px-2 py-1.5 rounded border border-gray-200 text-sm bg-white min-w-0 w-32">
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                    <input type="checkbox" checked={!!serviceForm.is_featured} onChange={(e) => setServiceForm((f) => ({ ...f, is_featured: e.target.checked }))} className="rounded border-gray-300" />
                    Featured
                  </label>
                  <input type="number" value={serviceForm.display_order} onChange={(e) => setServiceForm((f) => ({ ...f, display_order: e.target.value }))} placeholder="Order" className="w-16 px-2 py-1.5 rounded border border-gray-200 text-sm" />
                  <input type="text" value={serviceForm.homepage_image} onChange={(e) => setServiceForm((f) => ({ ...f, homepage_image: e.target.value }))} placeholder="Homepage image" className="flex-1 min-w-0 px-2 py-1.5 rounded border border-gray-200 text-sm" />
                  <div className="flex gap-1 flex-shrink-0">
                    <button type="button" onClick={handleServiceUpdate} disabled={submitting} className="text-sm text-m4m-purple font-medium">Save</button>
                    <button type="button" onClick={() => setServicesEditingId(null)} className="text-sm text-gray-500">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-xl flex-shrink-0">
                    {svc.icon || (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10l9 4 9-4V7" />
                      </svg>
                    )}
                  </span>
                  <span className="font-medium text-gray-900 truncate text-sm">{svc.name}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    <button type="button" onClick={() => { setServicesEditingId(svc.id); setServiceForm({ name: svc.name || '', icon: svc.icon || '', category_id: svc.category_id != null ? String(svc.category_id) : '', is_featured: !!svc.is_featured, display_order: svc.display_order != null ? String(svc.display_order) : '', homepage_image: svc.homepage_image || '' }); }} className="p-1 text-gray-500 hover:bg-gray-100 rounded text-xs">Edit</button>
                    <button type="button" onClick={() => setConfirm({ type: 'service', item: svc })} className="p-1 text-red-600 hover:bg-red-50 rounded text-xs">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Offer types */}
      <section>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-base font-semibold text-gray-900">Offer types</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-700"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button type="button" onClick={openCreate} className="px-4 py-2 rounded-xl text-sm font-semibold bg-m4m-purple text-white hover:bg-purple-600">Add offer type</button>
        </div>
      </div>

      {createOpen && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Create offer type</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Gift Card, Account, Top up" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
                <option value="">Select</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service *</label>
              <select value={form.service_id} onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
                <option value="">Select</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleCreate} disabled={submitting || !form.name.trim() || !form.category_id || !form.service_id} className="px-4 py-2 rounded-lg text-sm font-semibold bg-m4m-purple text-white hover:bg-purple-600 disabled:opacity-60">Create</button>
          </div>
        </div>
      )}

      {loading && offerTypes.length === 0 ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : offerTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">No services.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {offerTypes.map((ot) => (
            <div key={ot.id} className="rounded-xl border border-gray-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
              {editingId === ot.id ? (
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <select value={form.service_id} onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
                    <option value="">Service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full md:col-span-4 px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none" />
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditingId(null)} className="px-3 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={handleUpdate} disabled={submitting} className="px-3 py-2 rounded-lg text-sm bg-m4m-purple text-white hover:bg-purple-600 disabled:opacity-60">Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {ot.service?.name && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {ot.service.name}
                        </span>
                      )}
                      <span className="font-medium text-gray-900">
                        {ot.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{ot.category?.name} · {ot.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleToggleStatus(ot)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${ot.status === 'active' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}>
                      {ot.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button type="button" onClick={() => openEdit(ot)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50">Edit</button>
                    <button type="button" onClick={() => setConfirm({ type: 'offer', item: ot })} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      </section>
    </>
  );
}

/* ── Support store helpers (localStorage fallback when API unavailable) ─── */
const SUPPORT_STORE_KEY = 'm4m_support_store';

function readSupportStore() {
  try { return JSON.parse(localStorage.getItem(SUPPORT_STORE_KEY) || '{}'); } catch { return {}; }
}

function writeSupportStore(store) {
  localStorage.setItem(SUPPORT_STORE_KEY, JSON.stringify(store));
}

/** Merge API conversations with any localStorage threads not yet in the DB */
function mergeThreads(apiThreads, localStore) {
  const byId = {};
  // Start from API threads
  apiThreads.forEach((t) => {
    const uid = t.user?.id ?? t.user_one_id;
    if (!uid) return;
    const msgs = (t.messages ?? []).map((m) => ({
      id: m.id,
      body: m.body,
      _from: m.user_id === uid ? 'user' : 'admin',
      user_id: m.user_id,
      sender: m.sender,
      created_at: m.created_at,
      _readByAdmin: !!m.read_at,
    }));
    byId[uid] = {
      conversationId: t.id,
      userId: String(uid),
      userName: t.user?.name ?? `User #${uid}`,
      userEmail: t.user?.email ?? '',
      msgs,
      unreadCount: t.unread_count ?? 0,
      lastMsg: msgs[msgs.length - 1],
    };
  });

  // Overlay any localStorage-only threads (created before backend was wired)
  Object.entries(localStore).forEach(([uid, lt]) => {
    if (!byId[uid] && lt.msgs?.length > 0) {
      const unreadCount = lt.msgs.filter(
        (m) => m._from !== 'admin' && m.user_id !== 'admin' && !m._readByAdmin
      ).length;
      byId[uid] = {
        conversationId: null,
        userId: uid,
        userName: lt.userName ?? `User #${uid}`,
        userEmail: lt.userEmail ?? '',
        msgs: lt.msgs,
        unreadCount,
        lastMsg: lt.msgs[lt.msgs.length - 1],
      };
    }
  });

  return Object.values(byId).sort(
    (a, b) => new Date(b.lastMsg?.created_at || 0) - new Date(a.lastMsg?.created_at || 0)
  );
}

/* ── Support Chat Panel ───────────────────────────────────────────────────── */
function SupportChatPanel({ adminUser }) {
  const [userThreads, setUserThreads] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigationType = useNavigationType();


  // Load all threads: try API first, fall back to localStorage
  const loadAllThreads = useCallback(async () => {
    try {
      const res = await getAdminSupportConversations({ per_page: 50 });
      const apiThreads = res?.data ?? (Array.isArray(res) ? res : []);
      const merged = mergeThreads(apiThreads, readSupportStore());
      setUserThreads(merged);
    } catch {
      // API unavailable — use localStorage only
      const store = readSupportStore();
      const threads = Object.values(store)
        .filter((t) => t.msgs?.length > 0)
        .map((t) => {
          const unreadCount = t.msgs.filter(
            (m) => m._from !== 'admin' && m.user_id !== 'admin' && !m._readByAdmin
          ).length;
          const lastMsg = t.msgs[t.msgs.length - 1];
          return { ...t, conversationId: null, unreadCount, lastMsg };
        })
        .sort((a, b) => new Date(b.lastMsg?.created_at || 0) - new Date(a.lastMsg?.created_at || 0));
      setUserThreads(threads);
    }
  }, []);

  // Load messages for the selected thread
  const loadMessages = useCallback(async (convId, userId) => {
    if (convId) {
      try {
        const msgs = await getAdminSupportMessages(convId);
        const arr = Array.isArray(msgs) ? msgs : msgs?.data ?? [];
        setThreadMessages(arr.map((m) => ({
          id: m.id,
          body: m.body,
          _from: m.user_id === userId ? 'user' : 'admin',
          user_id: m.user_id,
          sender: m.sender,
          created_at: m.created_at,
          _readByAdmin: !!m.read_at,
        })));
        return;
      } catch { /* fall through to localStorage */ }
    }
    // Fallback: localStorage
    const store = readSupportStore();
    setThreadMessages(store[userId]?.msgs ?? []);
  }, []);

  useEffect(() => {
    loadAllThreads();
  }, [loadAllThreads]);

  // Auto-scroll
  useEffect(() => {
    if (navigationType === 'POP') return;
  
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end'
    });
  }, [threadMessages, navigationType]);

  // Focus input when thread selected
  useEffect(() => {
    if (selectedUserId) inputRef.current?.focus();
  }, [selectedUserId]);

  const selectedThread = userThreads.find((t) => t.userId === selectedUserId);

  // Open a thread: load its messages and mark as read
  const openThread = useCallback(async (thread) => {
    setSelectedUserId(thread.userId);
    setSelectedConvId(thread.conversationId ?? null);
    await loadMessages(thread.conversationId, thread.userId);

    // Mark read in localStorage
    const store = readSupportStore();
    if (store[thread.userId]) {
      store[thread.userId].msgs = store[thread.userId].msgs.map((m) =>
        m._from !== 'admin' && m.user_id !== 'admin' ? { ...m, _readByAdmin: true } : m
      );
      writeSupportStore(store);
    }
    loadAllThreads();
  }, [loadMessages, loadAllThreads]);

  const sendReply = async () => {
    if (!replyText.trim() || !selectedUserId || sending) return;
    setSending(true);
    const body = replyText.trim();

    // Optimistic update
    const optimistic = {
      id: `admin_${Date.now()}`,
      body,
      _from: 'admin',
      user_id: 'admin',
      sender: { id: 'admin', name: adminUser?.name || 'M4M Support', email: adminUser?.email },
      created_at: new Date().toISOString(),
    };
    setThreadMessages((prev) => [...prev, optimistic]);
    setReplyText('');

    if (selectedConvId) {
      try {
        await sendAdminSupportReply(selectedConvId, body);
      } catch {
        // Persist to localStorage as fallback
        const store = readSupportStore();
        if (store[selectedUserId]) {
          store[selectedUserId].msgs = [...(store[selectedUserId].msgs ?? []), optimistic];
          writeSupportStore(store);
        }
      }
    } else {
      // No conversation in DB yet — save to localStorage only
      const store = readSupportStore();
      if (store[selectedUserId]) {
        store[selectedUserId].msgs = [...(store[selectedUserId].msgs ?? []), optimistic];
        writeSupportStore(store);
      }
    }

    setSending(false);
    loadAllThreads();
  };

  const totalUnread = userThreads.reduce((s, t) => s + t.unreadCount, 0);

  return (
    <div className="flex min-h-[560px] -m-1 overflow-hidden rounded-xl">
      {/* ── Thread list ─────────────────────────────────────────────── */}
      <div className="w-56 md:w-64 border-r border-gray-200 flex flex-col shrink-0 bg-gray-50">
        <div className="px-4 py-3.5 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Support threads</h3>
            {totalUnread > 0 && (
              <span className="min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {totalUnread}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {userThreads.length} user{userThreads.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
          {userThreads.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-xs text-gray-400">No support messages yet.</p>
              <p className="text-[10px] text-gray-300 mt-1">Messages from users will appear here.</p>
            </div>
          ) : (
            userThreads.map((t) => (
                          <button
                key={t.userId}
                            type="button"
                onClick={() => openThread(t)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                  selectedUserId === t.userId
                    ? 'bg-m4m-purple text-white shadow-sm'
                    : 'hover:bg-white hover:shadow-sm text-gray-900'
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                  selectedUserId === t.userId ? 'bg-white/20 text-white' : 'bg-m4m-purple/10 text-m4m-purple'
                }`}>
                  {(t.userName || t.userId)?.charAt(0)?.toUpperCase() || '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs font-semibold truncate ${selectedUserId === t.userId ? 'text-white' : 'text-gray-900'}`}>
                      {t.userName || `User #${t.userId}`}
                    </p>
                    {t.unreadCount > 0 && (
                      <span className="flex-shrink-0 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                  {t.userEmail && (
                    <p className={`text-[10px] truncate ${selectedUserId === t.userId ? 'text-white/60' : 'text-gray-400'}`}>
                      {t.userEmail}
                    </p>
                  )}
                  <p className={`text-[10px] truncate mt-0.5 ${selectedUserId === t.userId ? 'text-white/70' : 'text-gray-500'}`}>
                    {t.lastMsg?.body?.substring(0, 30)}{t.lastMsg?.body?.length > 30 ? '…' : ''}
                  </p>
                </div>
                          </button>
            ))
          )}
        </div>
      </div>

      {/* ── Message area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {!selectedThread ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 p-8">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">Select a conversation</p>
            <p className="text-xs text-gray-400 text-center max-w-xs">
              User support messages appear here. Select a thread to read and reply.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-3 bg-white shrink-0">
              <span className="w-9 h-9 rounded-full bg-m4m-purple/10 text-m4m-purple flex items-center justify-center text-sm font-bold flex-shrink-0">
                {(selectedThread.userName || selectedThread.userId)?.charAt(0)?.toUpperCase() || '?'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{selectedThread.userName || `User #${selectedThread.userId}`}</p>
                <div className="flex items-center gap-2">
                  {selectedThread.userEmail && (
                    <p className="text-xs text-gray-400">{selectedThread.userEmail}</p>
                  )}
                  <span className="text-xs text-gray-300">·</span>
                  <p className="text-xs text-gray-400">User ID: {selectedThread.userId}</p>
                  <span className="text-xs text-gray-300">·</span>
                  <p className="text-xs text-gray-400">{threadMessages.length} message{threadMessages.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 min-h-0 bg-gray-50/40">
              {threadMessages.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">No messages yet.</p>
              )}
              {threadMessages.map((m) => {
                const senderId = m.user_id ?? m.sender?.id;
                const adminId = adminUser?.id ?? 'admin';
                const isAdminMsg = senderId === adminId;
                const senderName = m.sender?.name || selectedThread?.userName || 'User';
                const senderAvatar = m.sender?.avatar || null;
                const adminAvatar = adminUser?.avatar || null;

                return (
                  <div
                    key={m.id}
                    className={`flex items-end ${isAdminMsg ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isAdminMsg && (
                      <span className="w-7 h-7 rounded-full bg-m4m-purple/10 text-m4m-purple flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 overflow-hidden">
                        {senderAvatar ? (
                          <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
                        ) : (
                          (senderName || '').charAt(0).toUpperCase() || '?'
                        )}
                      </span>
                    )}

                    <div className="flex flex-col max-w-[75%]">
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                          isAdminMsg
                            ? 'bg-m4m-purple text-white rounded-br-sm'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        {m.body}
                      </div>
                      <span
                        className={`text-[10px] text-gray-400 mt-0.5 ${
                          isAdminMsg ? 'text-right' : 'text-left'
                        }`}
                      >
                        {isAdminMsg
                          ? (m.sender?.name || adminUser?.name || 'M4M Support')
                          : senderName}
                        {m.created_at &&
                          ` · ${new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`}
                      </span>
                    </div>

                    {isAdminMsg && (
                      <span className="w-7 h-7 rounded-full bg-m4m-purple/10 text-m4m-purple flex items-center justify-center text-xs font-bold ml-2 flex-shrink-0 overflow-hidden">
                        {adminAvatar ? (
                          <img
                            src={adminAvatar}
                            alt={adminUser?.name || 'M4M Support'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (adminUser?.name || 'M4M Support').charAt(0).toUpperCase()
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder={`Reply to ${selectedThread?.userName || 'user'} as M4M Support…`}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none bg-gray-50 focus:bg-white transition-colors"
                />
                          <button
                            type="button"
                  onClick={sendReply}
                  disabled={!replyText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-m4m-purple text-white text-sm font-semibold hover:bg-m4m-purple-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                          >
                  Send
                          </button>
                        </div>
              <p className="text-[10px] text-gray-400 mt-1.5 px-1">
                Replying as <span className="font-medium">{adminUser?.name || 'M4M Support'}</span> · Enter to send
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Overview (stats) ─────────────────────────────────────────────────────── */
function OverviewPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
    </div>
  );

  if (!stats) return <p className="text-gray-500 text-sm">Could not load statistics.</p>;

  const cards = [
    { label: 'Total Users', value: stats.users?.total ?? 0, color: 'bg-blue-50 text-blue-700', icon: 'users' },
    { label: 'Total Sellers', value: stats.users?.sellers ?? 0, color: 'bg-purple-50 text-purple-700', icon: 'store' },
    { label: 'Verified Sellers', value: stats.users?.verified_sellers ?? 0, color: 'bg-green-50 text-green-700', icon: 'shield-check' },
    { label: 'Banned Users', value: stats.users?.banned ?? 0, color: 'bg-red-50 text-red-700', icon: 'ban' },
    { label: 'Total Orders', value: stats.orders?.total ?? 0, color: 'bg-indigo-50 text-indigo-700', icon: 'package' },
    { label: 'Completed Orders', value: stats.orders?.completed ?? 0, color: 'bg-emerald-50 text-emerald-700', icon: 'check-circle' },
    { label: 'Disputed Orders', value: stats.orders?.disputed ?? 0, color: 'bg-orange-50 text-orange-700', icon: 'alert-triangle' },
    { label: 'Platform Revenue', value: `${Number(stats.platform?.total_revenue ?? 0).toFixed(2)} MAD`, color: 'bg-yellow-50 text-yellow-700', icon: 'wallet' },
  ];

  const pending = [
    { label: 'Pending Reports', value: stats.moderation?.pending_reports ?? 0 },
    { label: 'Pending Verifications', value: stats.moderation?.pending_verifications ?? 0 },
    { label: 'Pending Deposits', value: stats.moderation?.pending_deposits ?? 0 },
    { label: 'Pending Withdrawals', value: stats.moderation?.pending_withdraws ?? 0 },
  ];

  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-4">Platform Statistics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, color, icon }) => (
          <div key={label} className={`rounded-xl p-4 ${color}`}>
            <p className="text-2xl mb-1">
              {icon === 'users' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20h6M3 20h5v-2a4 4 0 00-3-3.87M16 7a4 4 0 11-8 0 4 4 0 018 0zM5 14a4 4 0 014-4h6a4 4 0 014 4" /></svg>}
              {icon === 'store' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l1-5h16l1 5M4 9h16v10H4zM9 13h6" /></svg>}
              {icon === 'shield-check' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l8 4v5c0 5-3.5 9-8 9s-8-4-8-9V7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" /></svg>}
              {icon === 'ban' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636A9 9 0 005.636 18.364 9 9 0 0018.364 5.636z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12" /></svg>}
              {icon === 'package' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10l9 4 9-4V7" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v10" /></svg>}
              {icon === 'check-circle' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>}
              {icon === 'alert-triangle' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.29 3.86L1.82 18a1 1 0 00.86 1.5h18.64a1 1 0 00.86-1.5L13.71 3.86a1 1 0 00-1.72 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01" /></svg>}
              {icon === 'wallet' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16v10H4z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7l2-3h10l2 3" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12h2v2h-2z" /></svg>}
            </p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
          </div>
        ))}
      </div>
      <h2 className="font-semibold text-gray-900 mb-3">Pending Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {pending.map(({ label, value }) => (
          <div key={label} className={`rounded-xl p-4 border ${value > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
            <p className={`text-xl font-bold ${value > 0 ? 'text-red-600' : 'text-gray-600'}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Disputes ─────────────────────────────────────────────────────────────── */
const DISPUTE_STATUS_STYLE = {
  open:         'bg-yellow-100 text-yellow-700',
  under_review: 'bg-blue-100 text-blue-700',
  resolved:     'bg-green-100 text-green-700',
  refunded:     'bg-purple-100 text-purple-700',
};

function DisputesPanel() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { disputeId, action: 'release' | 'refund' }
  const [adminNote, setAdminNote] = useState('');
  const [adminNoteError, setAdminNoteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminDisputes({ per_page: 50 });
      setDisputes(paginatedItems(data) ?? []);
    } catch { setDisputes([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 3000); return () => clearTimeout(t); }, [flash]);

  const openActionModal = (e, disputeId, action) => {
    e.stopPropagation();
    setActionModal({ disputeId, action });
    setAdminNote('');
    setAdminNoteError('');
  };

  const handleResolveWithNote = async () => {
    if (!actionModal) return;
    const note = (adminNote || '').trim();
    if (!note) {
      setAdminNoteError('Admin note is required before taking action.');
      return;
    }
    setResolving(actionModal.disputeId);
    setAdminNoteError('');
    try {
      if (actionModal.action === 'release') {
        await releaseAdminDispute(actionModal.disputeId, { admin_note: note });
        setDisputes((prev) => prev.map((d) => d.id === actionModal.disputeId ? { ...d, status: 'resolved', admin_decision: 'release_seller', admin_note: note } : d));
        setFlash({ type: 'success', text: 'Funds released to seller.' });
      } else {
        await refundAdminDispute(actionModal.disputeId, { admin_note: note });
        setDisputes((prev) => prev.map((d) => d.id === actionModal.disputeId ? { ...d, status: 'refunded', admin_decision: 'refund_buyer', admin_note: note } : d));
        setFlash({ type: 'success', text: 'Buyer refunded.' });
      }
      setActionModal(null);
      setExpanded(null);
    } catch (e) {
      setFlash({ type: 'error', text: e.message || 'Action failed.' });
    } finally {
      setResolving(null);
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-400">Loading disputes…</div>;

  return (
    <div>
      <Flash msg={flash} />
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !resolving && setActionModal(null)}>
          <div className="rounded-2xl bg-white shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-2">
              {actionModal.action === 'release' ? 'Release funds to seller' : 'Refund buyer'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">You must provide an admin note before taking this action.</p>
            <textarea
              value={adminNote}
              onChange={(e) => { setAdminNote(e.target.value); setAdminNoteError(''); }}
              placeholder="Enter your decision rationale..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
              disabled={!!resolving}
            />
            {adminNoteError && <p className="mt-1 text-sm text-red-600">{adminNoteError}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => !resolving && setActionModal(null)}
                disabled={!!resolving}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolveWithNote}
                disabled={!!resolving}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-white disabled:opacity-50 ${
                  actionModal.action === 'release' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {resolving ? 'Processing…' : actionModal.action === 'release' ? 'Release to Seller' : 'Refund Buyer'}
              </button>
            </div>
          </div>
        </div>
      )}
      <h2 className="font-semibold text-gray-900 mb-4">Disputes ({disputes.length})</h2>
      {disputes.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No disputes found.</p>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <div key={d.id} className={`rounded-xl border overflow-hidden ${
              d.status === 'open' ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'
            }`}>
              <div
                className="p-4 flex flex-wrap items-start justify-between gap-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${DISPUTE_STATUS_STYLE[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {d.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-gray-900">Order: {d.order?.order_number ?? `#${d.order_id}`}</p>
                  <p className="text-xs text-gray-500">Buyer: {d.buyer?.name ?? d.buyer?.email ?? '—'} · Seller: {d.seller?.name ?? d.seller?.email ?? '—'}</p>
                  <p className="text-sm text-gray-700 mt-1">
                    Amount: {Number(d.order?.total_amount ?? d.order?.escrow_amount ?? 0).toFixed(2)} MAD
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {d.order?.created_at ? new Date(d.order.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''} · Reason: {d.reason}
                  </p>
                </div>
                <p className="text-xs text-gray-400 shrink-0">{d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}</p>
              </div>

              {expanded === d.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  {d.description && <p className="text-sm text-gray-600 mb-3"><span className="font-medium">Description:</span> {d.description}</p>}
                  {d.order?.delivery_content && (
                    <div className="mb-4 p-3 rounded-lg bg-gray-100 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Delivery content</p>
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words font-mono">{d.order.delivery_content}</pre>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Link
                      to={`/disputes/${d.id}`}
                      className="inline-block px-4 py-2 rounded-lg bg-gray-700 text-white text-sm font-semibold hover:bg-gray-800"
                    >
                      Investigate
                    </Link>
                  </div>
                  {!d.admin_decision && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={(e) => openActionModal(e, d.id, 'refund')}
                        disabled={resolving === d.id}
                        className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
                      >
                        ↩ Refund Buyer
                      </button>
                      <button
                        onClick={(e) => openActionModal(e, d.id, 'release')}
                        disabled={resolving === d.id}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                      >
                        → Release to Seller
                      </button>
                    </div>
                  )}
                  {d.admin_decision && (
                    <div>
                      <p className="text-sm text-gray-600">
                        Decision: {d.admin_decision === 'refund_buyer' ? 'Buyer was refunded' : 'Funds released to seller'}
                      </p>
                      {d.admin_note && <p className="text-sm text-gray-500 mt-1 italic">Note: {d.admin_note}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Coupons ────────────────────────────────────────────────────────────────── */
function CouponsPanel() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAdminCoupons()
      .then((res) => {
        if (cancelled) return;
        setCoupons(paginatedItems(res) ?? []);
      })
      .catch(() => {
        if (!cancelled) setCoupons([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmedCode = code.trim();
    const pct = parseInt(discount, 10);
    if (!trimmedCode || Number.isNaN(pct) || pct <= 0 || pct > 100) {
      setFlash({ type: 'error', text: 'Please enter a valid code and discount (1–100%).' });
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        code: trimmedCode,
        discount_percent: pct,
      };
      const m = maxUses.trim();
      if (m) body.max_uses = parseInt(m, 10) || null;
      if (expiresAt) body.expires_at = new Date(expiresAt).toISOString();
      const created = await createAdminCoupon(body);
      setCoupons((prev) => [created, ...prev]);
      setCode('');
      setDiscount('');
      setMaxUses('');
      setExpiresAt('');
      setFlash({ type: 'success', text: 'Coupon created.' });
    } catch (err) {
      setFlash({ type: 'error', text: err.message || 'Failed to create coupon.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminCoupon(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      setFlash({ type: 'success', text: 'Coupon deleted.' });
      setConfirm(null);
    } catch (err) {
      setFlash({ type: 'error', text: err.message || 'Failed to delete coupon.' });
    }
  };

  return (
    <div>
      <Flash msg={flash} />
      {confirm && (
        <ConfirmModal
          title="Delete coupon"
          message="Delete this coupon? This action cannot be undone."
          confirmLabel="Delete"
          confirmDanger
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
        {/* Create coupon form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Create coupon</h2>
          <p className="text-xs text-gray-500 mb-4">
            Create discount codes to reward buyers. Example: <span className="font-mono">WELCOME10</span> for 10% off.
          </p>
          <form onSubmit={handleCreate} className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={50}
                placeholder="WELCOME10"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Discount %</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="10"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max uses</label>
                <input
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="e.g. 100 (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expires at</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Creating…' : 'Create coupon'}
            </button>
          </form>
        </div>

        {/* Coupon list */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Coupons</h2>
            {loading && <span className="text-xs text-gray-400">Loading…</span>}
          </div>
          {(!loading && coupons.length === 0) ? (
            <p className="text-sm text-gray-400">No coupons created yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Code', 'Discount', 'Uses', 'Max uses', 'Expires at', ''].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-gray-600 text-xs">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {coupons.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2.5 font-mono text-xs">{c.code}</td>
                      <td className="px-4 py-2.5">{c.discount_percent}%</td>
                      <td className="px-4 py-2.5">{c.uses ?? 0}</td>
                      <td className="px-4 py-2.5">{c.max_uses ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {c.expires_at ? new Date(c.expires_at).toLocaleString() : 'No expiry'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setConfirm({ id: c.id })}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Affiliates ─────────────────────────────────────────────────────────────── */
function AffiliatesPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getAdminAffiliates()
      .then((res) => {
        if (!cancelled) setData(res || null);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Failed to load affiliate data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  const d = data || {};
  const formatMAD = (v) => (typeof v === 'number' ? v.toFixed(2) : '0.00');

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-4">Affiliate Overview</h2>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .843-3 1.882 0 1.04 1.343 1.882 3 1.882s3 .843 3 1.882c0 1.04-1.343 1.882-3 1.882m0-7.528V6m0 9.528V18m0 3c5.523 0 10-3.134 10-7s-4.477-7-10-7S2 7.134 2 11s4.477 7 10 7z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Commissions Paid</p>
            <p className="text-xl font-semibold text-gray-900">{formatMAD(d.total_commissions_paid)} MAD</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Commissions</p>
            <p className="text-xl font-semibold text-gray-900">{formatMAD(d.total_pending_commissions)} MAD</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Orders with Referral</p>
            <p className="text-xl font-semibold text-gray-900">{d.total_orders_with_referral ?? 0}</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Referral Codes</p>
            <p className="text-xl font-semibold text-gray-900">{d.total_referral_codes ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Top Affiliates */}
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Top Affiliates</h3>
      <div className="overflow-x-auto rounded-xl border border-gray-200 mb-6">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['User', 'Email', 'Total Earned', 'Orders Count'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {(d.top_affiliates || []).length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No affiliates yet.</td></tr>
            ) : (
              (d.top_affiliates || []).map((a, i) => (
                <tr key={a.user_id ?? i}>
                  <td className="px-4 py-3 font-medium text-gray-900">{a.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{a.email ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{formatMAD(a.total_earned)} MAD</td>
                  <td className="px-4 py-3">{a.orders_count ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Referral Codes */}
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Referral Codes</h3>
      <div className="overflow-x-auto rounded-xl border border-gray-200 mb-6">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Code', 'Owner', 'Uses', 'Total Earned', 'Status', 'Created At'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {(d.referral_codes || []).length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No referral codes yet.</td></tr>
            ) : (
              (d.referral_codes || []).map((c, i) => (
                <tr key={c.code ?? i}>
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{c.code ?? '—'}</td>
                  <td className="px-4 py-3">{c.owner_name ?? '—'}</td>
                  <td className="px-4 py-3">{c.uses ?? 0}</td>
                  <td className="px-4 py-3 font-medium">{formatMAD(c.total_earned)} MAD</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${(c.status || 'active') === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{c.status ?? 'active'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Attributions */}
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Attributions</h3>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Order ID', 'Code', 'Buyer', 'Affiliate', 'Amount', 'Status', 'Date'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {(d.attributions || []).length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">No attributions yet.</td></tr>
            ) : (
              (d.attributions || []).map((a, i) => (
                <tr key={`${a.order_id}-${a.created_at}-${i}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{a.order_id ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-gray-700">{a.referral_code ?? '—'}</td>
                  <td className="px-4 py-3">{a.buyer_id ?? '—'}</td>
                  <td className="px-4 py-3">{a.affiliate_id ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{formatMAD(a.affiliate_amount)} MAD</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${a.status === 'paid' ? 'bg-green-100 text-green-700' : a.status === 'refunded' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{a.status ?? 'pending'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Announcements ──────────────────────────────────────────────────────────── */
function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(() => {
    getAdminAnnouncements()
      .then((res) => setAnnouncements(paginatedItems(res) ?? []))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      setFlash({ type: 'error', text: 'Title and message are required.' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await createAdminAnnouncement({ title: t, body: b, is_active: isActive });
      setAnnouncements((prev) => [created, ...prev]);
      setTitle('');
      setBody('');
      setIsActive(true);
      setFlash({ type: 'success', text: 'Announcement created.' });
    } catch (err) {
      setFlash({ type: 'error', text: err.message || 'Failed to create.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id, updates) => {
    try {
      const updated = await updateAdminAnnouncement(id, updates);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditing(null);
      setFlash({ type: 'success', text: 'Announcement updated.' });
    } catch (err) {
      setFlash({ type: 'error', text: err.message || 'Failed to update.' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      setFlash({ type: 'success', text: 'Announcement deleted.' });
      setConfirm(null);
    } catch (err) {
      setFlash({ type: 'error', text: err.message || 'Failed to delete.' });
    }
  };

  return (
    <div>
      <Flash msg={flash} />
      {confirm && (
        <ConfirmModal
          title="Delete announcement"
          message="Delete this announcement? This action cannot be undone."
          confirmLabel="Delete"
          confirmDanger
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Create announcement</h2>
          <p className="text-xs text-gray-500 mb-4">Announcements appear as a full-width banner above the navbar when active.</p>
          <form onSubmit={handleCreate} className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} placeholder="Marketplace Announcement" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="e.g. New seller commission tiers available." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none resize-none" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300 text-m4m-purple" />
                Active (shown as banner above navbar)
              </label>
            </div>
            <button type="submit" disabled={submitting} className="w-full mt-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark disabled:opacity-60 transition-colors">
              {submitting ? 'Creating…' : 'Create announcement'}
            </button>
          </form>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Announcements</h2>
            {loading && <span className="text-xs text-gray-400">Loading…</span>}
          </div>
          {(!loading && announcements.length === 0) ? (
            <p className="text-sm text-gray-400">No announcements yet.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">{a.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{a.body}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className={a.is_active ? 'text-green-600' : 'text-gray-400'}>{a.is_active ? 'Active' : 'Inactive'}</span>
                        {a.created_at && <span>{new Date(a.created_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdate(a.id, { is_active: !a.is_active })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${a.is_active ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {a.is_active ? 'Disable' : 'Activate'}
                      </button>
                      <button type="button" onClick={() => setEditing(editing?.id === a.id ? null : { ...a })} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
                        {editing?.id === a.id ? 'Cancel' : 'Edit'}
                      </button>
                      <button type="button" onClick={() => setConfirm({ id: a.id })} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100">
                        Delete
                      </button>
                    </div>
                  </div>
                  {editing?.id === a.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                      <input type="text" value={editing.title} onChange={(e) => setEditing((x) => ({ ...x, title: e.target.value }))} placeholder="Title" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      <textarea value={editing.body} onChange={(e) => setEditing((x) => ({ ...x, body: e.target.value }))} rows={2} placeholder="Message" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none" />
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing((x) => ({ ...x, is_active: e.target.checked }))} className="rounded" />
                        Active
                      </label>
                      <button type="button" onClick={() => handleUpdate(a.id, { title: editing.title, body: editing.body, is_active: editing.is_active })} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-m4m-purple text-white hover:bg-m4m-purple-dark">
                        Save
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Marketplace settings (People Viewing indicator) ──────────────────────── */
function MarketplaceSettingsPanel() {
  const { marketplaceSettings, setMarketplaceSettings } = useMarketplaceSettings();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Marketplace settings</h2>
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 space-y-5 max-w-xl">
        <h3 className="text-base font-medium text-gray-800">People Viewing indicator</h3>
        <p className="text-sm text-gray-600">
          Control the &quot;People viewing this item&quot; message on product pages.
        </p>

        <div className="flex items-center justify-between gap-4">
          <label htmlFor="viewing-indicator-toggle" className="text-sm font-medium text-gray-700">
            Enable People Viewing Indicator
          </label>
          <button
            id="viewing-indicator-toggle"
            type="button"
            role="switch"
            aria-checked={marketplaceSettings.showViewingIndicator}
            onClick={() => setMarketplaceSettings({ showViewingIndicator: !marketplaceSettings.showViewingIndicator })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-m4m-purple focus:ring-offset-2 ${marketplaceSettings.showViewingIndicator ? 'bg-m4m-purple' : 'bg-gray-200'}`}
          >
            <span
              className={`pointer-events-none absolute top-0.5 left-1 inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition ${marketplaceSettings.showViewingIndicator ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {marketplaceSettings.showViewingIndicator ? 'ON — indicator is shown on product pages.' : 'OFF — indicator is hidden.'}
        </p>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={marketplaceSettings.hideIfZero}
            onChange={(e) => setMarketplaceSettings({ hideIfZero: e.target.checked })}
            className="rounded border-gray-300 text-m4m-purple focus:ring-m4m-purple"
          />
          <span className="text-sm font-medium text-gray-700">Hide indicator if viewers = 0</span>
        </label>

        <div>
          <label htmlFor="exact-viewer-threshold" className="block text-sm font-medium text-gray-700 mb-1">
            Exact viewer count threshold
          </label>
          <input
            id="exact-viewer-threshold"
            type="number"
            min={1}
            max={20}
            value={marketplaceSettings.exactViewerThreshold ?? 5}
            onChange={(e) => setMarketplaceSettings({ exactViewerThreshold: Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 5)) })}
            className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Below this count: show &quot;Several people...&quot;. From this count up: show &quot;X people viewing...&quot; (default: 5).
          </p>
        </div>

        <div>
          <label htmlFor="low-viewer-message" className="block text-sm font-medium text-gray-700 mb-1">
            Low viewer message
          </label>
          <input
            id="low-viewer-message"
            type="text"
            value={marketplaceSettings.lowViewerText ?? ''}
            onChange={(e) => setMarketplaceSettings({ lowViewerText: e.target.value })}
            placeholder="👀 Several people are viewing this item"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Shown when viewer count is below the threshold.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Main admin page ──────────────────────────────────────────────────────── */
const VALID_ADMIN_TABS = ['overview', 'deposits', 'escrow', 'withdrawals', 'reports', 'disputes', 'verification', 'service-requests', 'services', 'coupons', 'announcements', 'affiliates', 'support', 'marketplace-settings'];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => (VALID_ADMIN_TABS.includes(tabFromUrl) ? tabFromUrl : 'overview'));
  const [refreshToken, setRefreshToken] = useState(0);
  const { tick } = useRefresh();
  const [pendingCounts, setPendingCounts] = useState({
    deposits: 0,
    withdrawals: 0,
    disputes: 0,
    verification: 0,
    'service-requests': 0,
    reports: 0,
  });
  const [adminStats, setAdminStats] = useState({
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    openDisputes: 0,
    unreadSupportMessages: 0,
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (VALID_ADMIN_TABS.includes(tabFromUrl)) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  // Auto-refresh pending counts for badges using admin stats + global refresh token
  useEffect(() => {
    if (!user?.is_admin) return;
    let cancelled = false;
    (async () => {
      try {
        const stats = await getAdminStats();
        if (cancelled || !stats) return;
        const moderation = stats.moderation || {};
        const orders = stats.orders || {};
        setPendingCounts({
          deposits: moderation.pending_deposits ?? 0,
          withdrawals: moderation.pending_withdraws ?? 0,
          disputes: orders.disputed ?? 0,
          verification: moderation.pending_verifications ?? 0,
          'service-requests': moderation.pending_service_requests ?? 0,
          reports: moderation.pending_reports ?? 0,
        });
        setAdminStats({
          pendingDeposits: moderation.pending_deposits ?? 0,
          pendingWithdrawals: moderation.pending_withdraws ?? 0,
          openDisputes: orders.disputed ?? 0,
          unreadSupportMessages: stats.support?.unread_messages ?? 0,
        });
      } catch {
        // silently ignore; badges will not update until next successful fetch
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshToken, user?.is_admin]);

  useEffect(() => {
    if (!user?.is_admin) return;
    if (!tick) return;
    setRefreshToken((t) => t + 1);
  }, [tick, user?.is_admin]);

  if (!getToken()) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">
        Admin access requires login.
      </div>
    );
  }

  const getBadgeForTab = (id) => {
    if (!user?.is_admin) return 0;
    if (id === 'deposits') return pendingCounts.deposits || 0;
    if (id === 'withdrawals') return pendingCounts.withdrawals || 0;
    if (id === 'disputes') return pendingCounts.disputes || 0;
    if (id === 'verification') return pendingCounts.verification || 0;
    if (id === 'service-requests') return pendingCounts['service-requests'] || 0;
    if (id === 'reports') return pendingCounts.reports || 0;
    if (id === 'support') return adminStats?.unreadSupportMessages ?? 0;
    return 0;
  };

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto w-64 border-r border-gray-200 bg-white md:shrink-0 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-gray-200">
          <p className="text-sm text-gray-500 mt-0.5">
            {user?.name ? (
              <span className="text-m4m-purple font-medium">{user.name}</span>
            ) : (
              'Admin'
            )}
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {TABS.map((t) => {
            const { id, label, icon: Icon } = t;
            const isActive = activeTab === id;
            const badgeCount = getBadgeForTab(id);
            const showBadge = !isActive && Number(badgeCount) > 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  setSearchParams({ tab: id }, { replace: true });
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-colors ${
                  isActive ? 'bg-m4m-purple text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {Icon && <Icon className="w-5 h-5 shrink-0" aria-hidden />}
                <span className="flex-1 flex items-center gap-2 truncate">
                  {label}
                  {showBadge && (
                    <span className="min-w-[18px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 flex-shrink-0 transition-opacity duration-200">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-m4m-purple transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Marketplace
          </Link>
        </div>
      </aside>

      <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((o) => !o)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
                aria-label="Toggle menu"
              >
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">
                Manage deposits, withdrawals, reports, disputes and verifications.
                {user?.name && <span className="ml-1 text-m4m-purple font-medium">({user.name})</span>}
              </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setRefreshToken((t) => t + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19A9 9 0 0119 5" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Overview metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Deposits Pending */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .843-3 1.882 0 1.04 1.343 1.882 3 1.882s3 .843 3 1.882c0 1.04-1.343 1.882-3 1.882m0-7.528V6m0 9.528V18m0 3c5.523 0 10-3.134 10-7s-4.477-7-10-7S2 7.134 2 11s4.477 7 10 7z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Deposits pending</p>
                <p className="text-xl font-semibold text-gray-900">
                  {adminStats?.pendingDeposits ?? '—'}
                </p>
              </div>
            </div>

            {/* Withdrawals Pending */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .843-3 1.882 0 1.04 1.343 1.882 3 1.882s3 .843 3 1.882C15 14.686 13.657 15.529 12 15.529m0-7.529V4m0 11.529V20m8-8a8 8 0 11-16 0 8 8 0 0116 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Withdrawals pending</p>
                <p className="text-xl font-semibold text-gray-900">
                  {adminStats?.pendingWithdrawals ?? '—'}
                </p>
              </div>
            </div>

            {/* Open Disputes */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m6 2v-2M4 11h16M5 19h14a1 1 0 00.96-.73l2-7A1 1 0 0021 10H3a1 1 0 00-.96 1.27l2 7A1 1 0 005 19zm7-9V5a2 2 0 114 0v5" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Open disputes</p>
                <p className="text-xl font-semibold text-gray-900">
                  {adminStats?.openDisputes ?? '—'}
                </p>
              </div>
            </div>

            {/* Unread Support Messages */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12a9 9 0 11-18 0 9 9 0 018.25-8.96A7 7 0 0120 10v1.5a2.5 2.5 0 01-2.5 2.5H17l-2 2v-2h-1" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Unread support messages</p>
                <p className="text-xl font-semibold text-gray-900">
                  {adminStats?.unreadSupportMessages ?? '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Panel */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 md:p-6">
            {activeTab === 'overview' && <OverviewPanel />}
            {activeTab === 'deposits' && <DepositsPanel />}
            {activeTab === 'escrow' && <EscrowPanel />}
            {activeTab === 'withdrawals' && <WithdrawalsPanel />}
            {activeTab === 'reports' && <ReportsPanel />}
            {activeTab === 'disputes' && <DisputesPanel />}
            {activeTab === 'verification' && <VerificationPanel />}
            {activeTab === 'service-requests' && <ServiceRequestsPanel />}
            {activeTab === 'services' && <ServiceManagementPanel />}
            {activeTab === 'coupons' && <CouponsPanel />}
            {activeTab === 'announcements' && <AnnouncementsPanel />}
            {activeTab === 'affiliates' && <AffiliatesPanel />}
            {activeTab === 'support' && (
              <div className="flex flex-col gap-3 h-full">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Support Inbox</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Manage conversations with buyers and sellers.
                  </p>
                </div>
                <div className="flex-1 min-h-0">
                  <SupportChatPanel adminUser={user} />
                </div>
              </div>
            )}
            {activeTab === 'marketplace-settings' && <MarketplaceSettingsPanel />}
          </div>
        </div>
      </main>
    </div>
  );
}
