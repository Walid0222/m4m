import { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import './HomePage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchProducts() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        const res = await fetch(`${API_BASE}/products?${params}`);
        const data = await res.json();
        if (!cancelled && data.data?.data) {
          setProducts(data.data.data.map((p) => ({
            ...p,
            rating: p.rating ?? 4.2,
            isOnline: p.is_online ?? true,
          })));
        } else if (!cancelled && Array.isArray(data.data)) {
          setProducts(data.data.map((p) => ({
            ...p,
            rating: p.rating ?? 4.2,
            isOnline: p.is_online ?? true,
          })));
        } else if (!cancelled) {
          setProducts([]);
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProducts();
    return () => { cancelled = true; };
  }, [search]);

  return (
    <div className="home-page">
      <section className="home-hero">
        <h1>M4M Marketplace</h1>
        <p>Discover products from trusted sellers</p>
        <div className="home-search">
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="home-search-input"
            aria-label="Search products"
          />
        </div>
      </section>

      <section className="home-products">
        <h2 className="section-title">Products</h2>
        {loading ? (
          <div className="home-loading">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="home-empty">No products found. Try a different search.</div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
