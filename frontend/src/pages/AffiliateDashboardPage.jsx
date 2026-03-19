import { useEffect, useMemo, useState } from 'react';
import { Copy, Receipt, Clock, BadgeDollarSign, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { getAffiliateDashboard } from '../services/api';

function formatMAD(value) {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  const styles = {
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    paid: 'bg-green-50 text-green-800 border-green-200',
    refunded: 'bg-red-50 text-red-800 border-red-200',
  };

  const cls = styles[s] || 'bg-gray-50 text-gray-700 border-gray-200';

  const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function AffiliateDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await getAffiliateDashboard();
        if (!mounted) return;
        setData(res || null);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load affiliate dashboard.');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const d = data || {};
    return {
      total_earnings: Number(d.total_earnings ?? 0),
      total_orders: Number(d.total_orders ?? 0),
      total_pending: Number(d.total_pending ?? 0),
      total_paid: Number(d.total_paid ?? 0),
      total_refunded: Number(d.total_refunded ?? 0),
    };
  }, [data]);

  const referralCodes = data?.referral_codes ?? [];
  const referrals = data?.referrals ?? [];

  const handleCopy = async (textToCopy) => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedCode(textToCopy);
      window.setTimeout(() => setCopiedCode((prev) => (prev === textToCopy ? null : prev)), 1200);
    } catch {
      // Fallback for environments where clipboard API is blocked.
      try {
        const el = document.createElement('textarea');
        el.value = textToCopy;
        el.setAttribute('readonly', 'true');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopiedCode(textToCopy);
        window.setTimeout(() => setCopiedCode((prev) => (prev === textToCopy ? null : prev)), 1200);
      } catch {
        // Silent (UX: not fatal)
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-40 rounded bg-gray-200 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-4">
              <div className="h-4 w-20 rounded bg-gray-200 animate-pulse mb-3" />
              <div className="h-7 w-24 rounded bg-gray-200 animate-pulse mb-2" />
              <div className="h-4 w-14 rounded bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-4">
            <div className="h-5 w-28 rounded bg-gray-200 animate-pulse mb-3" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded bg-gray-100 animate-pulse mb-2" />
            ))}
          </div>
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-4">
            <div className="h-5 w-28 rounded bg-gray-200 animate-pulse mb-3" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded bg-gray-100 animate-pulse mb-2" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
          <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
            <AlertTriangle className="w-5 h-5" />
            Failed to load affiliate dashboard
          </div>
          <div className="text-sm text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  const hasAnyData = referralCodes.length > 0 || referrals.length > 0;

  const buildReferralLink = (code) => {
    if (!code) return '';
    if (typeof window === 'undefined') return `?ref=${code}`;
    return `${window.location.origin}?ref=${code}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Copy success toast */}
      {copiedCode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]">
          <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-m4m-purple/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-m4m-purple" />
            </div>
            <div className="text-sm font-semibold text-gray-900">Copied to clipboard</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-m4m-purple" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Affiliate Dashboard</h1>
        </div>
        <div className="text-xs text-gray-500">
          {referralCodes.length > 0 ? `${referralCodes.length} referral code(s)` : 'No referral code yet'}
        </div>
      </div>

      {!hasAnyData ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-50 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-m4m-purple/10 blur-2xl" />
          <div className="absolute -bottom-14 -right-14 w-44 h-44 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="mx-auto w-12 h-12 rounded-full bg-m4m-purple/10 flex items-center justify-center mb-4 relative">
            <ArrowRight className="w-5 h-5 text-m4m-purple" />
          </div>
          <div className="text-gray-900 font-bold text-lg mb-1">No referrals yet</div>
          <div className="text-sm text-gray-500 max-w-md mx-auto">
            Share your referral link to start earning commissions. Your dashboard will update automatically as orders are released.
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-gradient-to-br from-m4m-purple/10 via-white to-white rounded-2xl shadow-sm p-5 border border-gray-50 transition-all duration-200 hover:shadow-md hover:scale-[1.01]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-500">Total Earnings</div>
                  <div className="text-2xl font-bold text-gray-900">{formatMAD(summary.total_earnings)} MAD</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-m4m-purple/20 to-purple-500/10 border border-m4m-purple/15 flex items-center justify-center">
                  <BadgeDollarSign className="w-5 h-5 text-m4m-purple" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900/5 via-white to-white rounded-2xl shadow-sm p-5 border border-gray-50 transition-all duration-200 hover:shadow-md hover:scale-[1.01]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-500">Total Orders</div>
                  <div className="text-2xl font-bold text-gray-900">{summary.total_orders}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-900/5 to-m4m-purple/10 border border-gray-100 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-gray-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-400/10 via-white to-white rounded-2xl shadow-sm p-5 border border-gray-50 transition-all duration-200 hover:shadow-md hover:scale-[1.01]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-500">Pending Earnings</div>
                  <div className="text-2xl font-bold text-gray-900">{formatMAD(summary.total_pending)} MAD</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-400/5 border border-amber-200 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 via-white to-white rounded-2xl shadow-sm p-5 border border-gray-50 transition-all duration-200 hover:shadow-md hover:scale-[1.01]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-500">Paid Earnings</div>
                  <div className="text-2xl font-bold text-gray-900">{formatMAD(summary.total_paid)} MAD</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/15 to-green-500/5 border border-green-200 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Referral codes */}
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-50 p-5">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-2">
                  <BadgeDollarSign className="w-4 h-4 text-m4m-purple" />
                  <h2 className="font-bold text-gray-900">Referral Codes</h2>
                </div>
              </div>

              {referralCodes.length === 0 ? (
                <div className="text-sm text-gray-500">No codes yet.</div>
              ) : (
                <div className="space-y-2">
                  {referralCodes.map((c) => (
                    <div key={c.code} className="border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-all duration-200">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900 tracking-wide">{c.code}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Uses: <span className="font-semibold text-gray-700">{c.uses}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Total earned: <span className="font-semibold text-gray-700">{formatMAD(c.total_earned)} MAD</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(buildReferralLink(c.code))}
                            className="inline-flex items-center justify-center rounded-xl bg-m4m-purple text-white hover:bg-m4m-purple/90 transition px-3 py-2 text-xs font-semibold shadow-sm disabled:opacity-60"
                            aria-label={`Copy referral link for ${c.code}`}
                          >
                            <div className="flex items-center gap-2">
                              <Copy className="w-3.5 h-3.5" />
                              {copiedCode === buildReferralLink(c.code) ? 'Copied' : 'Copy Link'}
                            </div>
                          </button>

                          <div className="text-[11px] text-gray-500">
                            {buildReferralLink(c.code).slice(0, 18)}...
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Referrals table */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-50 p-5">
              <div className="flex items-center justify-between mb-3 gap-3">
                <h2 className="font-bold text-gray-900">Referrals</h2>
                <div className="text-xs text-gray-500">{referrals.length} record(s)</div>
              </div>

              {referrals.length === 0 ? (
                <div className="text-sm text-gray-500">No referrals yet.</div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto max-h-[420px] rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="sticky top-0 z-10 bg-white/90 backdrop-blur text-left text-xs font-semibold text-gray-500">
                        <th className="py-2 pr-2">Order ID</th>
                        <th className="py-2 pr-2">Buyer ID</th>
                        <th className="py-2 pr-2">Status</th>
                        <th className="py-2 pr-2">Amount</th>
                        <th className="py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map((r) => (
                        <tr
                          key={r.order_id}
                          className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 pr-2 font-semibold text-gray-900">{r.order_id}</td>
                          <td className="py-3 pr-2 text-gray-700">{r.buyer_id}</td>
                          <td className="py-3 pr-2">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="py-3 pr-2 font-semibold text-gray-900">
                            {formatMAD(r.affiliate_amount)} MAD
                          </td>
                          <td className="py-3">
                            {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {referrals.length > 0 && (
                <div className="mt-3 text-xs text-gray-500">
                  Tip: commissions are paid when escrow is released.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

