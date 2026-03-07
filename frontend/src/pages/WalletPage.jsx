import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  getWallet,
  getDepositRequests,
  getWithdrawRequests,
  createDepositRequest,
  createWithdrawRequest,
  paginatedItems,
  getToken,
} from '../services/api';

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
      setBalance(walletResult ?? { balance: 0, currency: 'USD', transactions: [] });
      setDeposits(paginatedItems(depositsResult));
      setWithdrawals(paginatedItems(withdrawalsResult));
      setError(null);
    } catch (e) {
      setError('Could not load wallet.');
      setBalance({ balance: 0, currency: 'USD', transactions: [] });
      setDeposits([]);
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);
  return { balance, deposits, withdrawals, loading, error, refresh };
}

function ActivityCard({ item, currency = 'USD' }) {
  const isApi = item._fromApi === true;
  const isCredit = isApi ? Number(item.amount) >= 0 : item.type === 'deposit';
  const amount = Math.abs(Number(item.amount));
  const typeLabel = isApi
    ? (item.type || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : (item.type === 'deposit' ? 'Deposit' : 'Withdrawal');
  return (
    <li className="rounded-xl border border-m4m-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isCredit ? 'bg-green-100 text-green-700' : 'bg-m4m-gray-100 text-m4m-gray-700'
            }`}
          >
            {isCredit ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            )}
          </span>
          <div>
            <p className="font-medium text-m4m-black">
              {typeLabel}
              {!isApi && item.reference && (
                <span className="ml-2 font-mono text-sm text-m4m-gray-500">{item.reference}</span>
              )}
            </p>
            <p className="text-sm text-m4m-gray-500">
              {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}
            </p>
            {isApi && item.description && (
              <p className="text-sm text-m4m-gray-600 mt-0.5">{item.description}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className={`font-semibold ${isCredit ? 'text-green-600' : 'text-m4m-black'}`}>
            {isCredit ? '+' : '-'}{currency} {amount.toFixed(2)}
          </p>
          {!isApi && item.status && (
            <span
              className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                item.status === 'completed' ? 'bg-green-100 text-green-800' : item.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {item.status}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

export default function WalletPage() {
  const {
    balance,
    deposits,
    withdrawals,
    loading,
    error,
    refresh,
  } = useWalletData();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDetails, setWithdrawDetails] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  const currency = balance?.currency ?? 'USD';
  const bal = Number(balance?.balance ?? 0);

  // Transaction history: from API (wallet.transactions) when available, else merge deposit/withdraw requests
  const transactionHistory = useMemo(() => {
    const apiTx = balance?.transactions;
    if (Array.isArray(apiTx) && apiTx.length >= 0) {
      return apiTx.map((t) => ({
        id: `tx-${t.id}`,
        type: t.type,
        amount: Number(t.amount),
        balance_after: t.balance_after != null ? Number(t.balance_after) : null,
        description: t.description ?? t.type,
        created_at: t.created_at,
        _fromApi: true,
      }));
    }
    const list = [
      ...deposits.map((d) => ({
        id: `d-${d.id}`,
        type: 'deposit',
        amount: Number(d.amount),
        currency: d.currency ?? 'USD',
        status: d.status,
        reference: d.reference_code,
        created_at: d.created_at,
        _fromApi: false,
      })),
      ...withdrawals.map((w) => ({
        id: `w-${w.id}`,
        type: 'withdraw',
        amount: Number(w.amount),
        currency: w.currency ?? 'USD',
        status: w.status,
        created_at: w.created_at,
        _fromApi: false,
      })),
    ];
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }, [balance?.transactions, deposits, withdrawals]);

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 1 || !getToken()) return;
    setDepositSubmitting(true);
    setDepositSuccess(null);
    try {
      const data = await createDepositRequest({ amount, currency: 'USD' });
      setDepositSuccess(
        data?.reference_code
          ? { reference: data.reference_code, amount: data.amount }
          : { error: 'Request sent. Check deposit requests below.' }
      );
      setDepositAmount('');
      await refresh();
    } catch (err) {
      setDepositSuccess({ error: err.message });
    } finally {
      setDepositSubmitting(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 1 || !withdrawDetails.trim() || !getToken()) {
      setWithdrawError('Amount and payment details are required.');
      return;
    }
    if (amount > bal) {
      setWithdrawError('Insufficient balance.');
      return;
    }
    setWithdrawSubmitting(true);
    setWithdrawError('');
    try {
      await createWithdrawRequest({
        amount,
        currency: 'USD',
        payment_details: withdrawDetails.trim(),
      });
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
          <div className="h-8 bg-m4m-gray-200 rounded w-32" />
          <div className="h-32 bg-m4m-gray-100 rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-m4m-gray-100 rounded-xl" />
            <div className="h-24 bg-m4m-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !balance) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="rounded-2xl border border-m4m-gray-200 bg-white p-8 shadow-sm">
          <p className="text-m4m-gray-600 mb-4">{error}</p>
          <Link to="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-light transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <h1 className="text-2xl font-bold text-m4m-black mb-6">Wallet</h1>

      {/* Wallet balance */}
      <section className="mb-8">
        <div className="rounded-2xl border border-m4m-gray-200 bg-gradient-to-br from-m4m-gray-50 to-white p-6 md:p-8 shadow-lg">
          <p className="text-sm font-medium text-m4m-gray-500 uppercase tracking-wide">Available balance</p>
          <p className="mt-2 text-3xl md:text-4xl font-bold text-m4m-black">
            {currency} {bal.toFixed(2)}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => { setDepositOpen(true); setDepositSuccess(null); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Deposit
            </button>
            <button
              type="button"
              onClick={() => { setWithdrawOpen(true); setWithdrawError(''); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-white border-2 border-m4m-gray-200 text-m4m-black hover:border-m4m-purple hover:text-m4m-purple transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              Withdraw
            </button>
          </div>
        </div>
      </section>

      {/* Deposit requests */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-m4m-black mb-4">Deposit requests</h2>
        {deposits.length === 0 ? (
          <div className="rounded-xl border border-m4m-gray-200 bg-white p-6 text-center text-m4m-gray-500">
            No deposit requests yet. Use the Deposit button above to create one.
          </div>
        ) : (
          <ul className="space-y-3">
            {deposits.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-m4m-gray-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3"
              >
                <span className="font-mono font-medium">{d.reference_code || `#${d.id}`}</span>
                <span className="text-m4m-black font-semibold">
                  {Number(d.amount).toFixed(2)} {d.currency ?? 'USD'}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                    d.status === 'completed' ? 'bg-green-100 text-green-800' : d.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {d.status}
                </span>
                {d.created_at && (
                  <span className="text-sm text-m4m-gray-500 w-full md:w-auto">
                    {new Date(d.created_at).toLocaleString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Withdraw requests */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-m4m-black mb-4">Withdraw requests</h2>
        {withdrawals.length === 0 ? (
          <div className="rounded-xl border border-m4m-gray-200 bg-white p-6 text-center text-m4m-gray-500">
            No withdrawal requests yet. Use the Withdraw button above to request a payout.
          </div>
        ) : (
          <ul className="space-y-3">
            {withdrawals.map((w) => (
              <li
                key={w.id}
                className="rounded-xl border border-m4m-gray-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3"
              >
                <span className="text-m4m-black font-semibold">
                  {Number(w.amount).toFixed(2)} {w.currency ?? 'USD'}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                    w.status === 'completed' ? 'bg-green-100 text-green-800' : w.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {w.status}
                </span>
                {w.created_at && (
                  <span className="text-sm text-m4m-gray-500 w-full md:w-auto">
                    {new Date(w.created_at).toLocaleString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Transaction history */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-m4m-black mb-4">Transaction history</h2>
        {transactionHistory.length === 0 ? (
          <div className="rounded-2xl border border-m4m-gray-200 bg-white p-8 md:p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-m4m-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-m4m-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-m4m-gray-500">No transactions yet.</p>
            <p className="text-sm text-m4m-gray-400 mt-1">Deposits and withdrawals will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {transactionHistory.map((item) => (
              <ActivityCard key={item.id} item={item} currency={currency} />
            ))}
          </ul>
        )}
      </section>

      {/* Deposit modal */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDepositOpen(false)}>
          <div className="rounded-2xl bg-white shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-m4m-black">
                {depositSuccess?.reference ? 'Bank transfer details' : 'Deposit'}
              </h3>
              <button type="button" onClick={() => setDepositOpen(false)} className="p-2 rounded-lg text-m4m-gray-500 hover:bg-m4m-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {depositSuccess?.reference ? (
              <div className="space-y-5">
                <p className="text-sm text-m4m-gray-600">
                  <strong>You must send a bank transfer with the reference below.</strong> An admin will verify your deposit later and credit your wallet.
                </p>
                <div className="rounded-xl bg-m4m-gray-50 border border-m4m-gray-200 p-4">
                  <p className="text-xs font-medium text-m4m-gray-500 uppercase tracking-wide mb-1">Unique reference code (use in your bank transfer)</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xl font-bold font-mono text-m4m-black tracking-wide select-all">
                      {depositSuccess.reference}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(depositSuccess.reference);
                      }}
                      className="flex-shrink-0 px-3 py-2 rounded-lg border border-m4m-gray-200 text-sm font-medium text-m4m-gray-700 hover:bg-m4m-gray-100"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-m4m-gray-500 mt-2">Format: M4M-XXXXXX — include this exact reference in the transfer so we can match your payment.</p>
                </div>
                <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                  <p className="text-xs font-medium text-green-800 uppercase tracking-wide mb-1">Amount to send</p>
                  <p className="text-2xl font-bold text-green-800">
                    {currency} {Number(depositSuccess.amount).toFixed(2)}
                  </p>
                </div>
                <p className="text-xs text-m4m-gray-500">
                  Your deposit will appear as &quot;Pending&quot; in Deposit requests until an admin verifies it.
                </p>
                <button
                  type="button"
                  onClick={() => { setDepositOpen(false); setDepositSuccess(null); setDepositAmount(''); }}
                  className="w-full py-3 rounded-xl font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover"
                >
                  Done
                </button>
              </div>
            ) : depositSuccess?.error ? (
              <p className="text-sm text-red-600 mb-4">{depositSuccess.error}</p>
            ) : null}

            {!depositSuccess?.reference && (
              <form onSubmit={handleDeposit}>
                <p className="text-sm text-m4m-gray-600 mb-4">
                  Enter the amount you want to deposit. We&apos;ll generate a unique reference code <strong>M4M-XXXXXX</strong>. You must include it in your bank transfer; an admin will verify the deposit later.
                </p>
                <label className="block text-sm font-medium text-m4m-gray-700 mb-2">Amount ({currency})</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none mb-4"
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setDepositOpen(false)} className="flex-1 py-3 rounded-xl font-medium border border-m4m-gray-200 text-m4m-gray-700 hover:bg-m4m-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={depositSubmitting} className="flex-1 py-3 rounded-xl font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover disabled:opacity-60">
                    {depositSubmitting ? 'Submitting…' : 'Request deposit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Withdraw modal */}
      {withdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setWithdrawOpen(false)}>
          <div className="rounded-2xl bg-white shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-m4m-black">Withdraw</h3>
              <button type="button" onClick={() => setWithdrawOpen(false)} className="p-2 rounded-lg text-m4m-gray-500 hover:bg-m4m-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-sm text-m4m-gray-500 mb-4">Available: {currency} {bal.toFixed(2)}</p>
            {withdrawError && <p className="text-sm text-red-600 mb-4">{withdrawError}</p>}
            <form onSubmit={handleWithdraw}>
              <label className="block text-sm font-medium text-m4m-gray-700 mb-2">Amount ({currency})</label>
              <input
                type="number"
                min="1"
                step="0.01"
                max={bal}
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none mb-4"
              />
              <label className="block text-sm font-medium text-m4m-gray-700 mb-2">Payment details (e.g. bank account, e-wallet)</label>
              <textarea
                rows={3}
                placeholder="Enter where to send the funds"
                value={withdrawDetails}
                onChange={(e) => setWithdrawDetails(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-m4m-gray-200 text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none resize-none mb-4"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setWithdrawOpen(false)} className="flex-1 py-3 rounded-xl font-medium border border-m4m-gray-200 text-m4m-gray-700 hover:bg-m4m-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={withdrawSubmitting} className="flex-1 py-3 rounded-xl font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-light disabled:opacity-60">
                  {withdrawSubmitting ? 'Submitting…' : 'Request withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
