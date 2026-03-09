import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
  paginatedItems,
} from '../services/api';

const TABS = [
  { id: 'deposits', label: 'Deposits' },
  { id: 'withdrawals', label: 'Withdrawals' },
  { id: 'reports', label: 'Reports' },
  { id: 'verification', label: 'Verifications' },
  { id: 'support', label: '💬 Support Chat' },
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

function TabButton({ id, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-m4m-purple text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
    >
      {label}
    </button>
  );
}

/* ── Deposits ─────────────────────────────────────────────────────────────── */
function DepositsPanel() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);

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
    } catch { setFlash({ type: 'error', text: 'Action failed.' }); }
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <>
      <Flash msg={flash} />
      <h2 className="text-base font-semibold text-gray-900 mb-4">Deposit requests</h2>
      {deposits.length === 0 ? <p className="text-gray-400 text-sm">No deposit requests.</p> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>{['User', 'Amount', 'Reference', 'Status', 'Date', 'Actions'].map((h) => <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {deposits.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">{d.user?.name ?? d.user?.email ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{Number(d.amount).toFixed(2)} MAD</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.reference_code || `#${d.id}`}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${d.status === 'completed' ? 'bg-green-100 text-green-700' : d.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{d.status ?? 'pending'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handle(d.id, 'approve')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors">Approve</button>
                      <button onClick={() => handle(d.id, 'reject')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">Reject</button>
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

  useEffect(() => {
    let c = false;
    getAdminWithdrawRequests().then((r) => { if (!c) setItems(paginatedItems(r) ?? []); }).catch(() => {}).finally(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, []);

  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 3000); return () => clearTimeout(t); }, [flash]);

  const handle = async (id, action) => {
    try {
      await verifyAdminWithdraw(id, action);
      setItems((w) => w.filter((x) => x.id !== id));
      setFlash({ type: 'success', text: action === 'approve' ? 'Withdrawal approved.' : 'Withdrawal rejected.' });
    } catch { setFlash({ type: 'error', text: 'Action failed.' }); }
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <>
      <Flash msg={flash} />
      <h2 className="text-base font-semibold text-gray-900 mb-4">Withdraw requests</h2>
      {items.length === 0 ? <p className="text-gray-400 text-sm">No pending withdrawals.</p> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>{['User', 'Amount', 'Payment details', 'Date', 'Actions'].map((h) => <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {items.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-3">{w.user?.name ?? w.user?.email ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{Number(w.amount).toFixed(2)} MAD</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={w.payment_details}>{w.payment_details || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handle(w.id, 'approve')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors">Approve</button>
                      <button onClick={() => handle(w.id, 'reject')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">Reject</button>
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getAdminReports();
      setReports(paginatedItems(r) ?? []);
    } catch { setReports([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 3000); return () => clearTimeout(t); }, [flash]);

  const handleAction = async (reportId, action) => {
    try {
      await resolveAdminReport(reportId, action);
      setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: action === 'ignore' ? 'ignored' : 'resolved', admin_action: action } : r));
      setFlash({ type: 'success', text: `Action "${action}" applied.` });
      setExpanded(null);
    } catch { setFlash({ type: 'error', text: 'Action failed.' }); }
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
                            onClick={() => handleAction(r.id, a.id)}
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
    } catch { setFlash({ type: 'error', text: 'Action failed.' }); }
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <>
      <Flash msg={flash} />
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
                        onClick={() => handle(req.id, 'approved')}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => handle(req.id, 'rejected')}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'National ID — Front', url: req.id_front_url ?? req.national_id_front },
                    { label: 'National ID — Back', url: req.id_back_url ?? req.national_id_back },
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

/* ── Support store helpers (mirror of ChatPage helpers, same key) ─────────── */
const SUPPORT_STORE_KEY = 'm4m_support_store';

function readSupportStore() {
  try { return JSON.parse(localStorage.getItem(SUPPORT_STORE_KEY) || '{}'); } catch { return {}; }
}

function writeSupportStore(store) {
  localStorage.setItem(SUPPORT_STORE_KEY, JSON.stringify(store));
}

/* ── Support Chat Panel ───────────────────────────────────────────────────── */
function SupportChatPanel({ adminUser }) {
  const [userThreads, setUserThreads] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Read global support store and build thread list
  const loadAllThreads = useCallback(() => {
    const store = readSupportStore();
    const threads = Object.values(store)
      .filter((t) => t.msgs && t.msgs.length > 0)
      .map((t) => {
        const unreadCount = t.msgs.filter(
          (m) => m._from !== 'admin' && m.user_id !== 'admin' && !m._readByAdmin
        ).length;
        const lastMsg = t.msgs[t.msgs.length - 1];
        return { ...t, unreadCount, lastMsg };
      })
      .sort((a, b) => new Date(b.lastMsg?.created_at || 0) - new Date(a.lastMsg?.created_at || 0));
    setUserThreads(threads);
  }, []);

  // Initial load + poll every 3 seconds for new user messages
  useEffect(() => {
    loadAllThreads();
    const interval = setInterval(loadAllThreads, 3000);
    return () => clearInterval(interval);
  }, [loadAllThreads]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [selectedUserId, userThreads]);

  // Focus reply input when thread is selected
  useEffect(() => {
    if (selectedUserId) inputRef.current?.focus();
  }, [selectedUserId]);

  const selectedThread = userThreads.find((t) => t.userId === selectedUserId);

  // Mark all user messages as read when admin opens a thread
  useEffect(() => {
    if (!selectedUserId) return;
    const store = readSupportStore();
    if (!store[selectedUserId]) return;
    store[selectedUserId].msgs = store[selectedUserId].msgs.map((m) =>
      m._from !== 'admin' && m.user_id !== 'admin' ? { ...m, _readByAdmin: true } : m
    );
    writeSupportStore(store);
    loadAllThreads();
  }, [selectedUserId, loadAllThreads]);

  const sendReply = () => {
    if (!replyText.trim() || !selectedUserId) return;
    const store = readSupportStore();
    if (!store[selectedUserId]) return;
    const reply = {
      id: `admin_${Date.now()}`,
      body: replyText.trim(),
      _from: 'admin',
      user_id: 'admin',
      sender: { id: 'admin', name: adminUser?.name || 'M4M Support', email: adminUser?.email },
      created_at: new Date().toISOString(),
    };
    store[selectedUserId].msgs = [...store[selectedUserId].msgs, reply];
    writeSupportStore(store);
    setReplyText('');
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
                onClick={() => setSelectedUserId(t.userId)}
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
                  <p className="text-xs text-gray-400">{selectedThread.msgs.length} message{selectedThread.msgs.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 min-h-0 bg-gray-50/40">
              {selectedThread.msgs.map((m) => {
                const isAdminMsg = m._from === 'admin' || m.user_id === 'admin';
                return (
                  <div key={m.id} className={`flex ${isAdminMsg ? 'justify-end' : 'justify-start'}`}>
                    <div className="flex flex-col max-w-[75%]">
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                        isAdminMsg
                          ? 'bg-m4m-purple text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm shadow-sm'
                      }`}>
                        {m.body}
                      </div>
                      <span className={`text-[10px] text-gray-400 mt-0.5 ${isAdminMsg ? 'text-right' : 'text-left'}`}>
                        {isAdminMsg ? (adminUser?.name || 'M4M Support') : (selectedThread.userName || 'User')}
                        {m.created_at && ` · ${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    </div>
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
                  placeholder={`Reply to ${selectedThread.userName || 'user'} as M4M Support…`}
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

/* ── Main admin page ──────────────────────────────────────────────────────── */
export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('deposits');

  if (!getToken()) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">
        Admin access requires login.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage deposits, withdrawals, reports, and seller verifications.
          {user?.name && <span className="ml-1 text-m4m-purple font-medium">({user.name})</span>}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-7">
        {TABS.map((t) => (
          <TabButton key={t.id} {...t} active={activeTab === t.id} onClick={setActiveTab} />
        ))}
      </div>

      {/* Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6 shadow-sm">
        {activeTab === 'deposits' && <DepositsPanel />}
        {activeTab === 'withdrawals' && <WithdrawalsPanel />}
        {activeTab === 'reports' && <ReportsPanel />}
        {activeTab === 'verification' && <VerificationPanel />}
        {activeTab === 'support' && <SupportChatPanel adminUser={user} />}
      </div>
    </div>
  );
}
