import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './ProductPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function fetchProduct() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/products/${id}`);
        const data = await res.json();
        if (!cancelled && data.data) setProduct(data.data);
        else if (!cancelled) setProduct(null);
      } catch {
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) fetchProduct();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="page-loading">Loading product…</div>;
  if (!product) return <div className="page-error">Product not found.</div>;

  const seller = product.seller || {};
  const price = Number(product.price || 0);
  const stock = Number(product.stock ?? 0);

  return (
    <div className="product-page">
      <div className="product-page-grid">
        <div className="product-page-media">
          <div className="product-page-image-placeholder">
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.name} />
            ) : (
              <span>No image</span>
            )}
          </div>
        </div>
        <div className="product-page-detail">
          <h1 className="product-page-title">{product.name}</h1>
          <p className="product-page-seller-line">
            Sold by <Link to={`/seller/${seller.id}`}>{seller.name || 'Seller'}</Link>
          </p>
          <p className="product-page-price">${price.toFixed(2)}</p>
          <p className="product-page-stock">In stock: {stock}</p>
          {product.description && (
            <div className="product-page-description">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>
          )}
          <div className="product-page-actions">
            <label className="product-page-qty">
              Quantity
              <input
                type="number"
                min={1}
                max={stock}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </label>
            <button type="button" className="product-page-buy">
              Buy now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
