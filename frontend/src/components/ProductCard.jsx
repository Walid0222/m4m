import { Link } from 'react-router-dom';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const { id, name, price, seller, rating = 0, isOnline = true } = product;
  const sellerName = seller?.name ?? 'Seller';

  return (
    <article className="product-card">
      <div className="product-card-body">
        <h3 className="product-card-title">
          <Link to={`/product/${id}`}>{name}</Link>
        </h3>
        <p className="product-card-seller">
          <Link to={`/seller/${seller?.id ?? id}`}>{sellerName}</Link>
        </p>
        <div className="product-card-meta">
          <span className={`product-card-status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <span className="product-card-rating" aria-label={`Rating: ${rating} out of 5`}>
            ★ {typeof rating === 'number' ? rating.toFixed(1) : rating}
          </span>
        </div>
        <p className="product-card-price">${Number(price).toFixed(2)}</p>
        <Link to={`/product/${id}`} className="product-card-buy">
          Buy
        </Link>
      </div>
    </article>
  );
}
