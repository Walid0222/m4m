import { useState, useEffect } from 'react';
import './AdminDashboardPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function getToken() {
  return localStorage.getItem('m4m_token');
}

export default function AdminDashboardPage() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setError('Admin access requires login.');
      return;
    }
    let cancelled = false;
    async function fetchDeposits() {
      try {
        const res = await fetch(`${API_BASE}/admin/deposit-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 403) {
          if (!cancelled) setError('You do not have admin access.');
          return;
        }
        const data = await res.json();
        const list = data.data?.data ?? data.data ?? [];
        if (!cancelled) setDeposits(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setError('Could not load deposit requests.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDeposits();
    return () => { cancelled = true; };
  }, []);

  const handleVerify = async (depositId, action) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/admin/deposit-requests/${depositId}/verify`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setDeposits((d) => d.filter((x) => x.id !== depositId));
      }
    } catch {}
  };

  if (loading && deposits.length === 0)
    return <div className="page-loading">Loading admin dashboard…</div>;

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      <p className="admin-subtitle">Deposit verification</p>

      {error && <div className="admin-error">{error}</div>}

      {!error && (
        <section className="admin-section">
          <h2>Pending deposit requests</h2>
          {deposits.length === 0 ? (
            <p className="admin-empty">No pending deposits.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((d) => (
                    <tr key={d.id}>
                      <td><strong>{d.reference_code || `#${d.id}`}</strong></td>
                      <td>{d.user?.name ?? d.user?.email ?? '—'}</td>
                      <td>{Number(d.amount).toFixed(2)} {d.currency}</td>
                      <td>{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
                      <td>
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="admin-btn approve"
                            onClick={() => handleVerify(d.id, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="admin-btn reject"
                            onClick={() => handleVerify(d.id, 'reject')}
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
