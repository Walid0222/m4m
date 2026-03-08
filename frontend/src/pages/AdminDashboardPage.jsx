import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getToken,
  getAdminDepositRequests,
  getAdminWithdrawRequests,
  verifyAdminDeposit,
  verifyAdminWithdraw,
  paginatedItems,
} from '../services/api';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [activeTab, setActiveTab] = useState('deposits');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flashMessage, setFlashMessage] = useState(null);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      setError('Admin access requires login.');
      return;
    }
    let cancelled = false;
    async function fetchData() {
      try {
        const [depRes, wdRes] = await Promise.all([
          getAdminDepositRequests().catch(() => ({ data: [] })),
          getAdminWithdrawRequests().catch(() => ({ data: [] })),
        ]);
        if (!cancelled) {
          setDeposits(paginatedItems(depRes) ?? []);
          setWithdrawals(paginatedItems(wdRes) ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          if (e.status === 403) setError('You do not have admin access.');
          else setError('Could not load requests.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!flashMessage) return;
    const t = setTimeout(() => setFlashMessage(null), 3000);
    return () => clearTimeout(t);
  }, [flashMessage]);

  const handleVerifyDeposit = async (depositId, action) => {
    try {
      await verifyAdminDeposit(depositId, action);
      setDeposits((d) => d.filter((x) => x.id !== depositId));
      setFlashMessage({ type: 'success', text: action === 'approve' ? 'Deposit approved and wallet credited.' : 'Deposit rejected.' });
    } catch {
      setFlashMessage({ type: 'error', text: 'Action failed. Please try again.' });
    }
  };

  const handleVerifyWithdraw = async (withdrawId, action) => {
    try {
      await verifyAdminWithdraw(withdrawId, action);
      setWithdrawals((w) => w.filter((x) => x.id !== withdrawId));
      setFlashMessage({ type: 'success', text: action === 'approve' ? 'Withdrawal approved.' : 'Withdrawal rejected.' });
    } catch {
      setFlashMessage({ type: 'error', text: 'Action failed. Please try again.' });
    }
  };

  if (loading && deposits.length === 0 && withdrawals.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-m4m-gray-500">
        Loading admin dashboard…
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-m4m-black mb-2">Admin Dashboard</h1>
      <p className="text-m4m-gray-500 mb-6">Deposit and withdrawal verification</p>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {flashMessage && (
        <div
          className={`mb-6 p-4 rounded-xl border ${
            flashMessage.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
          role="alert"
        >
          {flashMessage.text}
        </div>
      )}

      {!error && (
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('deposits')}
            className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'deposits' ? 'bg-m4m-purple text-white' : 'bg-m4m-gray-100 text-m4m-gray-700 hover:bg-m4m-gray-200'}`}
          >
            Deposit requests
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'withdrawals' ? 'bg-m4m-purple text-white' : 'bg-m4m-gray-100 text-m4m-gray-700 hover:bg-m4m-gray-200'}`}
          >
            Withdraw requests
          </button>
        </div>
      )}

      {!error && activeTab === 'deposits' && (
        <section>
          <h2 className="text-lg font-semibold text-m4m-black mb-4">Deposit requests</h2>
          {deposits.length === 0 ? (
            <p className="text-m4m-gray-500">No deposit requests.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-m4m-gray-200">
              <table className="min-w-full divide-y divide-m4m-gray-200">
                <thead className="bg-m4m-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-m4m-black">User</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-m4m-black">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-m4m-black">Reference</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-m4m-black">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-m4m-black">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-m4m-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-m4m-gray-200">
                  {deposits.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3 text-sm">{d.user?.name ?? d.user?.email ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">{Number(d.amount).toFixed(2)} {d.currency ?? 'USD'}</td>
                      <td className="px-4 py-3 font-mono text-sm">{d.reference_code || `#${d.id}`}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${d.status === 'completed' ? 'bg-green-100 text-green-800' : d.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                          {d.status ?? 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleVerifyDeposit(d.id, 'approve')}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-m4m-green text-white hover:bg-m4m-green-hover"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifyDeposit(d.id, 'reject')}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {!error && activeTab === 'withdrawals' && (
        <section>
          <h2 className="text-lg font-semibold text-m4m-black mb-4">Pending withdraw requests</h2>
          {withdrawals.length === 0 ? (
            <p className="text-m4m-gray-500">No pending withdrawals.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-m4m-gray-200">
              <table className="min-w-full divide-y divide-m4m-gray-200">
                <thead className="bg-m4m-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-m4m-black">User</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-m4m-black">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-m4m-black">Payment details</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-m4m-black">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-m4m-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-m4m-gray-200">
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td className="px-4 py-3 text-sm">{w.user?.name ?? w.user?.email ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">{Number(w.amount).toFixed(2)} {w.currency}</td>
                      <td className="px-4 py-3 text-sm max-w-xs truncate" title={w.payment_details}>{w.payment_details || '—'}</td>
                      <td className="px-4 py-3 text-sm">{w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleVerifyWithdraw(w.id, 'approve')}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-m4m-green text-white hover:bg-m4m-green-hover"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifyWithdraw(w.id, 'reject')}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
