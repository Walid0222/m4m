import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Receipt, Clock, BadgeDollarSign, CheckCircle2, AlertTriangle, ArrowRight, MessageCircle, Send, Share2, ShoppingCart, Banknote, HelpCircle } from 'lucide-react';
import { getAffiliateDashboard, createReferralCode } from '../services/api';

function formatMAD(value) {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

function TooltipIcon({ text }) {
  return (
    <span className="relative inline-flex group ml-0.5 align-middle">
      <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" aria-hidden />
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2.5 py-1.5 text-xs font-normal text-white bg-gray-800 rounded-lg shadow-lg whitespace-nowrap max-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-20 pointer-events-none">
        {text}
      </span>
    </span>
  );
}

const STATUS_EXPLANATIONS = {
  pending: 'Awaiting order completion. Commission released when escrow confirms.',
  paid: 'Commission has been released to you.',
  refunded: 'Sale was reversed. No commission.',
};

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  const styles = {
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    paid: 'bg-green-50 text-green-800 border-green-200',
    refunded: 'bg-red-50 text-red-800 border-red-200',
  };

  const cls = styles[s] || 'bg-gray-50 text-gray-700 border-gray-200';
  const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown';
  const explanation = STATUS_EXPLANATIONS[s];

  return (
    <span className="relative inline-flex group">
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${cls}`}>
        {label}
      </span>
      {explanation && (
        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2.5 py-1.5 text-xs font-normal text-white bg-gray-800 rounded-lg shadow-lg whitespace-nowrap max-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-20 pointer-events-none">
          {explanation}
        </span>
      )}
    </span>
  );
}

export default function AffiliateDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [generating, setGenerating] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAffiliateDashboard();
      setData(res || null);
    } catch (e) {
      setError(e?.message || 'Failed to load affiliate dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      await createReferralCode();
      await loadDashboard();
    } catch (e) {
      setError(e?.message || 'Failed to create referral code.');
    } finally {
      setGenerating(false);
    }
  };

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

  const INITIAL_REFERRALS_SHOWN = 8;
  const [referralsShown, setReferralsShown] = useState(INITIAL_REFERRALS_SHOWN);
  const visibleReferrals = referrals.slice(0, referralsShown);
  const hasMoreReferrals = referralsShown < referrals.length;

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '—';
    }
  };

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {[1, 2, 3].map((i) => (
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
    return window.location.origin + '?ref=' + code;
  };

  const getWhatsAppShareUrl = (referralLink) => {
    const text = `Check this out: ${referralLink}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const getTelegramShareUrl = (referralLink) => {
    return `https://t.me/share/url?url=${encodeURIComponent(referralLink)}`;
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

      {/* How it works - always visible */}
      <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">How it works</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-3">
          {[
            { icon: Share2, label: 'Share your link', step: 1 },
            { icon: ShoppingCart, label: 'Someone buys', step: 2 },
            { icon: CheckCircle2, label: 'Order is completed', step: 3 },
            { icon: Banknote, label: 'You earn money', step: 4 },
          ].map(({ icon: Icon, label, step }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-m4m-purple/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-m4m-purple" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-m4m-purple">Step {step}</span>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!hasAnyData ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-50 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-m4m-purple/10 blur-2xl" />
          <div className="absolute -bottom-14 -right-14 w-44 h-44 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="mx-auto w-14 h-14 rounded-full bg-m4m-purple/10 flex items-center justify-center mb-4 relative">
            <ArrowRight className="w-7 h-7 text-m4m-purple" />
          </div>
          <div className="text-gray-900 font-bold text-xl mb-2">Start earning with referrals</div>
          <div className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed mb-6">
            Share your referral link with friends. When they make a purchase, you earn a commission. Your earnings will appear here once orders are confirmed.
          </div>
          {referralCodes.length === 0 && (
            <button
              type="button"
              onClick={handleGenerateCode}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generating ? 'Creating…' : 'Generate my referral code'}
            </button>
          )}
          <p className="mt-4 text-sm text-gray-500">You earn money when someone buys using your link.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div className="bg-gradient-to-br from-m4m-purple/10 via-white to-white rounded-2xl shadow-sm p-5 border border-gray-50 transition-all duration-200 hover:shadow-md hover:scale-[1.01]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-500 inline-flex items-center">
                    Total Earnings
                    <TooltipIcon text="Money you've earned from completed referral sales." />
                  </div>
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
                  <div className="text-xs font-semibold text-gray-500 inline-flex items-center">
                    Total Orders
                    <TooltipIcon text="Number of sales made through your referral link." />
                  </div>
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
                  <div className="text-xs font-semibold text-gray-500 inline-flex items-center">
                    Pending Earnings
                    <TooltipIcon text="Earnings waiting for order completion. Released when escrow is confirmed." />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{formatMAD(summary.total_pending)} MAD</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-400/5 border border-amber-200 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
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
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">No referral code yet.</p>
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    disabled={generating}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {generating ? 'Creating…' : 'Generate my referral code'}
                  </button>
                </div>
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
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopy(buildReferralLink(c.code))}
                              title="Copy link"
                              className="inline-flex items-center justify-center rounded-xl bg-m4m-purple text-white hover:bg-m4m-purple/90 transition px-3 py-2 text-xs font-semibold shadow-sm disabled:opacity-60"
                              aria-label={`Copy referral link for ${c.code}`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Copy className="w-3.5 h-3.5" />
                                {copiedCode === buildReferralLink(c.code) ? 'Copied' : 'Copy'}
                              </div>
                            </button>
                            <a
                              href={getWhatsAppShareUrl(buildReferralLink(c.code))}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Share on WhatsApp"
                              className="inline-flex items-center justify-center rounded-xl bg-[#25D366] text-white hover:bg-[#20BD5A] transition px-3 py-2 text-xs font-semibold shadow-sm"
                              aria-label={`Share ${c.code} on WhatsApp`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={getTelegramShareUrl(buildReferralLink(c.code))}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Share on Telegram"
                              className="inline-flex items-center justify-center rounded-xl bg-[#0088cc] text-white hover:bg-[#0077b5] transition px-3 py-2 text-xs font-semibold shadow-sm"
                              aria-label={`Share ${c.code} on Telegram`}
                            >
                              <Send className="w-3.5 h-3.5" />
                            </a>
                          </div>
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
                <div className="text-xs text-gray-500">{referrals.length} sale{referrals.length === 1 ? '' : 's'}</div>
              </div>

              {referrals.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-500 font-medium">No referral sales yet</p>
                  <p className="text-sm text-gray-400 mt-1">Commissioned orders will appear here once buyers complete their purchases.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500">
                          <th className="py-2.5 pr-3">
                            <span className="inline-flex items-center">Product<TooltipIcon text="The product or order sold via your link." /></span>
                          </th>
                          <th className="py-2.5 pr-3">
                            <span className="inline-flex items-center">Status<TooltipIcon text="Pending: awaiting completion. Paid: you received the commission. Refunded: sale was reversed." /></span>
                          </th>
                          <th className="py-2.5 pr-3">
                            <span className="inline-flex items-center">Earnings<TooltipIcon text="Your commission for this referral sale." /></span>
                          </th>
                          <th className="py-2.5">
                            <span className="inline-flex items-center">Date<TooltipIcon text="When the referral sale was recorded." /></span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleReferrals.map((r, idx) => (
                          <tr
                            key={r.order_id != null ? `order-${r.order_id}` : `ref-${idx}`}
                            className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 pr-3 font-medium text-gray-900">
                              {r.product_name ?? (r.order_id != null ? `Order #${r.order_id}` : '—')}
                            </td>
                            <td className="py-3 pr-3">
                              <StatusBadge status={r.status} />
                            </td>
                            <td className="py-3 pr-3 font-semibold text-gray-900">
                              {formatMAD(r.affiliate_amount)} MAD
                            </td>
                            <td className="py-3 text-gray-600">
                              {formatShortDate(r.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {hasMoreReferrals && (
                    <div className="mt-3 text-center">
                      <button
                        type="button"
                        onClick={() => setReferralsShown((n) => n + INITIAL_REFERRALS_SHOWN)}
                        className="px-4 py-2 text-sm font-medium text-m4m-purple hover:text-m4m-purple-dark hover:bg-m4m-purple/5 rounded-xl transition-colors"
                      >
                        Show more ({referrals.length - referralsShown} remaining)
                      </button>
                    </div>
                  )}
                </>
              )}

              {referrals.length > 0 && (
                <div className="mt-3 text-xs text-gray-500">
                  Tip: commissions are paid when escrow is released.
                </div>
              )}
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-500 text-center sm:text-left">
            You earn money when someone buys using your link.
          </p>
        </>
      )}
    </div>
  );
}

