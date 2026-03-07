import { useState, useEffect } from 'react';
import './WalletPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function getToken() {
  return localStorage.getItem('m4m_token');
}

export default function WalletPage() {
  const [balance, setBalance] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError('Please log in to view your wallet.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchWallet() {
      try {
        const [walletRes, depositsRes] = await Promise.all([
          fetch(`${API_BASE}/wallet`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/deposit-requests`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const walletData = await walletRes.json();
        const depositsData = await depositsRes.json();
        if (!cancelled) {
          if (walletData.data) setBalance(walletData.data);
          else setBalance({ balance: 0, currency: 'USD' });
          const list = depositsData.data?.data ?? depositsData.data ?? [];
          setDeposits(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError('Could not load wallet.');
          setBalance({ balance: 0, currency: 'USD' });
          setDeposits([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchWallet();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="page-loading">Loading wallet…</div>;
  if (error && !balance) return <div className="page-error">{error}</div>;

  const bal = balance?.balance ?? 0;
  const currency = balance?.currency ?? 'USD';

  return (
    <div className="wallet-page">
      <h1>Wallet</h1>
      <div className="wallet-card">
        <p className="wallet-label">Available balance</p>
        <p className="wallet-balance">
          {currency} {Number(bal).toFixed(2)}
        </p>
      </div>

      <section className="wallet-section">
        <h2>Recent deposit requests</h2>
        {deposits.length === 0 ? (
          <p className="wallet-empty">No deposit requests yet.</p>
        ) : (
          <ul className="wallet-deposit-list">
            {deposits.slice(0, 10).map((d) => (
              <li key={d.id}>
                <span className="deposit-ref">{d.reference_code || `#${d.id}`}</span>
                <span className="deposit-amount">{Number(d.amount).toFixed(2)} {d.currency}</span>
                <span className={`deposit-status ${d.status}`}>{d.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
