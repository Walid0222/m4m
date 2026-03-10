import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getWallet,
  getDepositRequests,
  getWithdrawRequests,
  createDepositRequest,
  createWithdrawRequest,
  getWalletSettings,
  paginatedItems,
  getToken,
} from '../services/api';

const CURRENCY = 'MAD';
const REQUESTS_PAGE_SIZE = 4;

function useWalletData() {
  const [balance, setBalance] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = async () => {
    if (!getToken()) {
      setError('Please log in to view your wallet.');
      setLoading(false);
      return;
    }
    try {
      const [walletResult, depositsResult, withdrawalsResult] = await Promise.all([
        getWallet(),
        getDepositRequests().catch(() => ({ data: [] })),
        getWithdrawRequests().catch(() => ({ data: [] })),
      ]);
      setBalance(walletResult ?? { balance: 0, currency: CURRENCY, transactions: [] });
      setDeposits(paginatedItems(depositsResult));
      setWithdrawals(paginatedItems(withdrawalsResult));
      setError(null);
    } catch {
      setError('Could not load wallet.');
      setBalance({ balance: 0, currency: CURRENCY, transactions: [] });
      setDeposits([]);
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);
  return { balance, deposits, withdrawals, loading, error, refresh };
}

function StatusBadge({ status }) {
  const styles = {
    completed: 'bg-green-100 text-green-800',
    approved: 'bg-green-100 text-green-800',
    pending: 'bg-amber-100 text-amber-800',
    cancelled: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
  };
  const cls = styles[(status || '').toLowerCase()] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status || 'unknown'}
    </span>
  );
}

function ActivityCard({ item }) {
  const isApi = item._fromApi === true;
  const isCredit = isApi ? Number(item.amount) >= 0 : item.type === 'deposit';
  const amount = Math.abs(Number(item.amount));
  const typeLabel = isApi
    ? (item.type || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : (item.type === 'deposit' ? 'Deposit' : 'Withdrawal');

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isCredit ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
          {isCredit
            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
          }
        </span>
        <div>
          <p className="font-medium text-gray-900 text-sm">
            {typeLabel}
            {!isApi && item.reference && (
              <span className="ml-2 font-mono text-xs text-gray-400">{item.reference}</span>
            )}
          </p>
          {isApi && item.description && (
            <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold text-sm ${isCredit ? 'text-green-600' : 'text-gray-900'}`}>
          {isCredit ? '+' : '-'}{CURRENCY} {amount.toFixed(2)}
        </p>
        {!isApi && item.status && <StatusBadge status={item.status} />}
      </div>
    </li>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <div className="rounded-2xl bg-white shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button" onClick={onConfirm} className="flex-1 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors">Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { user } = useAuth();
  const { balance, deposits, withdrawals, loading, error, refresh } = useWalletData();

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(null);
  const [depositConfirmPending, setDepositConfirmPending] = useState(false);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDetails, setWithdrawDetails] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawConfirmPending, setWithdrawConfirmPending] = useState(false);

  const [walletSettings, setWalletSettings] = useState(null);
  const [walletSettingsError, setWalletSettingsError] = useState('');

  const [depositsVisible, setDepositsVisible] = useState(REQUESTS_PAGE_SIZE);
  const [withdrawalsVisible, setWithdrawalsVisible] = useState(REQUESTS_PAGE_SIZE);

  const bal = Number(balance?.balance ?? 0);
  const isSeller = user?.is_seller === true || user?.is_seller === 1;

  const transactionHistory = useMemo(() => {
    const apiTx = balance?.transactions;
    if (Array.isArray(apiTx) && apiTx.length >= 0) {
      return apiTx.map((t) => ({
        id: `tx-${t.id}`,
        type: t.type,
        amount: Number(t.amount),
        description: t.description ?? t.type,
        created_at: t.created_at,
        _fromApi: true,
      }));
    }
    const list = [
      ...deposits.map((d) => ({ id: `d-${d.id}`, type: 'deposit', amount: Number(d.amount), status: d.status, reference: d.reference_code, created_at: d.created_at, _fromApi: false })),
      ...withdrawals.map((w) => ({ id: `w-${w.id}`, type: 'withdraw', amount: Number(w.amount), status: w.status, created_at: w.created_at, _fromApi: false })),
    ];
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }, [balance?.transactions, deposits, withdrawals]);

  useEffect(() => {
    if (!getToken()) return;
    getWalletSettings()
      .then((settings) => {
        setWalletSettings(settings);
        setWalletSettingsError('');
      })
      .catch(() => {
        setWalletSettings(null);
        setWalletSettingsError('Could not load withdrawal rules. You can still request withdrawals, but some limits may apply.');
      });
  }, []);

  const handleDepositSubmitRequest = (e) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 1) return;
    setDepositConfirmPending(true);
  };

  const handleDepositConfirm = async () => {
    setDepositConfirmPending(false);
    const amount = parseFloat(depositAmount);
    if (!amount || !getToken()) return;
    setDepositSubmitting(true);
    setDepositSuccess(null);
    try {
      const data = await createDepositRequest({ amount, currency: CURRENCY });
      setDepositSuccess(
        data?.reference_code
          ? { reference: data.reference_code, amount: data.amount }
          : { error: 'Request sent. Check deposit requests below.' }
      );
      setDepositAmount('');
      await refresh();
    } catch (err) {
      setDepositSuccess({ error: err.message || 'Something went wrong.' });
    } finally {
      setDepositSubmitting(false);
    }
  };

  const handleWithdrawSubmitRequest = (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 1 || !withdrawDetails.trim()) {
      setWithdrawError('Amount and payment details are required.');
      return;
    }
    if (amount > bal) {
      setWithdrawError('Insufficient balance.');
      return;
    }
    if (walletSettings) {
      const { min_withdraw_amount, max_withdraw_amount } = walletSettings;
      if (min_withdraw_amount && amount < Number(min_withdraw_amount)) {
        setWithdrawError(`Minimum withdrawal amount is ${Number(min_withdraw_amount).toFixed(2)} ${CURRENCY}.`);
        return;
      }
      if (max_withdraw_amount && amount > Number(max_withdraw_amount)) {
        setWithdrawError(`Maximum withdrawal amount is ${Number(max_withdraw_amount).toFixed(2)} ${CURRENCY}.`);
        return;
      }
    }
    setWithdrawError('');
    setWithdrawConfirmPending(true);
  };

  const handleWithdrawConfirm = async () => {
    setWithdrawConfirmPending(false);
    const amount = parseFloat(withdrawAmount);
    setWithdrawSubmitting(true);
    setWithdrawError('');
    try {
      await createWithdrawRequest({ amount, currency: CURRENCY, payment_details: withdrawDetails.trim() });
      setWithdrawAmount('');
      setWithdrawDetails('');
      setWithdrawOpen(false);
      await refresh();
    } catch (err) {
      setWithdrawError(err.message || 'Withdrawal failed');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-36 bg-gray-100 rounded-2xl" />
          <div className="h-24 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !balance) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-gray-600 mb-4">{error}</p>
          <Link to="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors">Sign in</Link>
        </div>
      </div>
    );
  }

  const visibleDeposits = deposits.slice(0, depositsVisible);
  const visibleWithdrawals = withdrawals.slice(0, withdrawalsVisible);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Wallet</h1>

      {/* Balance card */}
      <section className="mb-8">
        <div className="rounded-2xl bg-gradient-to-br from-m4m-purple to-purple-900 p-6 md:p-8 shadow-lg text-white">
          <p className="text-sm font-medium text-purple-200 uppercase tracking-wide">Available balance</p>
          <p className="mt-2 text-4xl md:text-5xl font-bold">
            {bal.toFixed(2)} <span className="text-2xl font-semibold text-purple-200">{CURRENCY}</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => { setDepositOpen(true); setDepositSuccess(null); setDepositAmount(''); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-white text-m4m-purple hover:bg-purple-50 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Deposit
            </button>
            {isSeller && (
              <button
                type="button"
                onClick={() => { setWithdrawOpen(true); setWithdrawError(''); setWithdrawAmount(''); setWithdrawDetails(''); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-white/10 border border-white/30 text-white hover:bg-white/20 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                Withdraw
              </button>
            )}
          </div>
          {!isSeller && (
            <p className="mt-3 text-xs text-purple-300">Withdrawals are available for sellers only. Become a seller to unlock this feature.</p>
          )}
        </div>
      </section>

      {/* Deposit requests */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Deposit requests</h2>
        {deposits.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 text-sm">
            No deposit requests yet. Click Deposit above to create one.
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {visibleDeposits.map((d) => (
                <li key={d.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-wrap items-center gap-3">
                  <span className="font-mono font-semibold text-sm text-gray-700">{d.reference_code || `#${d.id}`}</span>
                  <span className="font-semibold text-gray-900 text-sm">{Number(d.amount).toFixed(2)} {CURRENCY}</span>
                  <StatusBadge status={d.status} />
                  {d.created_at && <span className="text-xs text-gray-400 ml-auto">{new Date(d.created_at).toLocaleString()}</span>}
                </li>
              ))}
            </ul>
            {deposits.length > depositsVisible && (
              <button
                type="button"
                onClick={() => setDepositsVisible((v) => v + REQUESTS_PAGE_SIZE)}
                className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                See more ({deposits.length - depositsVisible} remaining)
              </button>
            )}
          </>
        )}
      </section>

      {/* Withdraw requests — only show for sellers */}
      {isSeller && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Withdraw requests</h2>
          <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
            <strong>How withdrawals work:</strong> Submit a withdrawal request with your payment details. An admin will review and process your request within 1–3 business days. Funds will be transferred to the account you provide.
          </div>
          {walletSettings && (
            <div className="mb-4 rounded-xl bg-gray-50 border border-gray-200 p-4 text-xs text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">Withdrawal rules</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Minimum withdrawal: {Number(walletSettings.min_withdraw_amount).toFixed(2)} {CURRENCY}</li>
                <li>Maximum per request: {Number(walletSettings.max_withdraw_amount).toFixed(2)} {CURRENCY}</li>
                <li>Daily withdrawal limit: {Number(walletSettings.daily_withdraw_limit).toFixed(2)} {CURRENCY}</li>
                <li>Cooldown between requests: {Number(walletSettings.withdraw_cooldown_hours)} hour(s)</li>
                <li>Maximum pending requests: {Number(walletSettings.max_pending_requests)}</li>
              </ul>
            </div>
          )}
          {walletSettingsError && (
            <p className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {walletSettingsError}
            </p>
          )}
          {withdrawals.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 text-sm">
              No withdrawal requests yet.
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {visibleWithdrawals.map((w) => (
                  <li key={w.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-gray-900 text-sm">{Number(w.amount).toFixed(2)} {CURRENCY}</span>
                    <StatusBadge status={w.status} />
                    {w.created_at && <span className="text-xs text-gray-400 ml-auto">{new Date(w.created_at).toLocaleString()}</span>}
                  </li>
                ))}
              </ul>
              {withdrawals.length > withdrawalsVisible && (
                <button
                  type="button"
                  onClick={() => setWithdrawalsVisible((v) => v + REQUESTS_PAGE_SIZE)}
                  className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  See more ({withdrawals.length - withdrawalsVisible} remaining)
                </button>
              )}
            </>
          )}
        </section>
      )}

      {/* Transaction history */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Transaction history</h2>
          <div className="relative group">
            <button
              type="button"
              className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center hover:bg-purple-100 hover:text-purple-700 transition-colors"
              aria-label="Platform commission information"
            >
              ℹ
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-lg z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-center leading-relaxed">
              M4M marketplace takes a <strong>10% commission</strong> from each completed order. The remaining 90% is credited to your wallet as a seller payout.
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
            </div>
          </div>
        </div>
        {transactionHistory.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-gray-400 text-sm">No transactions yet.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {transactionHistory.map((item) => (
              <ActivityCard key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>

      {/* Deposit modal */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDepositOpen(false)}>
          <div className="rounded-2xl bg-white shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">
                {depositSuccess?.reference ? 'Bank transfer details' : 'Deposit funds'}
              </h3>
              <button type="button" onClick={() => setDepositOpen(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {depositSuccess?.reference ? (
              <div className="space-y-5">
                <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                  <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2">Your unique reference code</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-2xl font-bold font-mono text-gray-900 tracking-widest select-all">{depositSuccess.reference}</code>
                    <button type="button" onClick={() => navigator.clipboard?.writeText(depositSuccess.reference)} className="px-3 py-1.5 rounded-lg border border-green-300 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors">Copy</button>
                  </div>
                  <p className="text-xs text-green-700 mt-2">Include this exact reference in your bank transfer so we can match your payment.</p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Amount to send</p>
                  <p className="text-2xl font-bold text-gray-900">{Number(depositSuccess.amount).toFixed(2)} <span className="text-lg text-gray-500">{CURRENCY}</span></p>
                </div>
                <p className="text-xs text-gray-400">Your deposit will show as "Pending" until an admin verifies the payment. This usually takes 1 business day.</p>
                <button type="button" onClick={() => { setDepositOpen(false); setDepositSuccess(null); }} className="w-full py-3 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark transition-colors">Done</button>
              </div>
            ) : depositSuccess?.error ? (
              <div>
                <p className="text-sm text-red-600 mb-4">{depositSuccess.error}</p>
                <button type="button" onClick={() => setDepositSuccess(null)} className="text-sm text-m4m-purple font-medium">Try again</button>
              </div>
            ) : (
              <form onSubmit={handleDepositSubmitRequest}>
                <p className="text-sm text-gray-600 mb-5">
                  Enter the amount you want to deposit. We&apos;ll give you a unique reference code <strong>M4M-XXXXXX</strong> that you must include in your bank transfer.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount ({CURRENCY})</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none mb-5"
                  required
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setDepositOpen(false)} className="flex-1 py-3 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={depositSubmitting} className="flex-1 py-3 rounded-xl font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover disabled:opacity-60 transition-colors">
                    {depositSubmitting ? 'Processing…' : 'Continue'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Withdraw modal */}
      {withdrawOpen && isSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setWithdrawOpen(false)}>
          <div className="rounded-2xl bg-white shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">Withdraw funds</h3>
              <button type="button" onClick={() => setWithdrawOpen(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="rounded-xl bg-purple-50 border border-purple-200 p-3 mb-5">
              <p className="text-sm text-purple-800 font-medium">Available: <span className="font-bold">{bal.toFixed(2)} {CURRENCY}</span></p>
            </div>
            {withdrawError && <p className="text-sm text-red-600 mb-4">{withdrawError}</p>}
            <form onSubmit={handleWithdrawSubmitRequest}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount ({CURRENCY})</label>
              <input
                type="number"
                min="1"
                step="0.01"
                max={bal}
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none mb-4"
                required
              />
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment details</label>
              <p className="text-xs text-gray-400 mb-2">Enter your bank account number, IBAN, or e-wallet address.</p>
              <textarea
                rows={3}
                placeholder="Bank: IBAN / Account number..."
                value={withdrawDetails}
                onChange={(e) => setWithdrawDetails(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none resize-none mb-5"
                required
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setWithdrawOpen(false)} className="flex-1 py-3 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={withdrawSubmitting} className="flex-1 py-3 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark disabled:opacity-60 transition-colors">
                  {withdrawSubmitting ? 'Submitting…' : 'Request withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit confirm dialog */}
      {depositConfirmPending && (
        <ConfirmModal
          title="Confirm deposit request"
          message={`You are about to create a deposit request for ${parseFloat(depositAmount).toFixed(2)} ${CURRENCY}. After confirming, you will receive a reference code to use in your bank transfer.`}
          onConfirm={handleDepositConfirm}
          onCancel={() => setDepositConfirmPending(false)}
        />
      )}

      {/* Withdraw confirm dialog */}
      {withdrawConfirmPending && (
        <ConfirmModal
          title="Confirm withdrawal request"
          message={`You are about to request a withdrawal of ${parseFloat(withdrawAmount).toFixed(2)} ${CURRENCY}. An admin will review and process it within 1–3 business days.`}
          onConfirm={handleWithdrawConfirm}
          onCancel={() => setWithdrawConfirmPending(false)}
        />
      )}
    </div>
  );
}
