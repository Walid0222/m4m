import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import './SellerProfilePage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function SellerProfilePage() {
  const { id } = useParams();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/products?seller_id=${id}`);
        const data = await res.json();
        const list = data.data?.data ?? data.data ?? [];
        if (!cancelled && Array.isArray(list)) {
          setProducts(list.map((p) => ({ ...p, rating: 4.2, isOnline: true })));
          if (list[0]?.seller) setSeller(list[0].seller);
          else setSeller({ id: Number(id), name: 'Seller' });
        } else if (!cancelled) {
          setProducts([]);
          setSeller({ id: Number(id), name: 'Seller' });
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setSeller({ id: Number(id), name: 'Seller' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) fetchData();
    return () => { cancelled = true; };
  }, [id]);

  if (loading && !seller) return <div className="page-loading">Loading seller…</div>;

  return (
    <div className="seller-page">
      <div className="seller-profile-card">
        <div className="seller-avatar">{seller?.name?.charAt(0)?.toUpperCase() || 'S'}</div>
        <h1 className="seller-name">{seller?.name || 'Seller'}</h1>
        <p className="seller-meta">
          <span className="seller-status online">Online</span>
          <span className="seller-rating">★ 4.8</span>
        </p>
      </div>

      <section className="seller-products">
        <h2>Listings</h2>
        {loading ? (
          <div className="page-loading">Loading products…</div>
        ) : products.length === 0 ? (
          <p className="seller-empty">No products listed yet.</p>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={{ ...p, seller }} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
