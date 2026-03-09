import { Link } from 'react-router-dom';
import { isSellerOnline } from '../lib/sellerOnline';
import { VerifiedBadge, SellerSalesBadge } from './SellerBadges';

export default function ProductCard({ product }) {
  const { id, name, price, seller, rating, stock } = product;
  const isOutOfStock = Number(stock ?? 0) <= 0;
  const sellerName = seller?.name ?? 'Seller';
  const online = isSellerOnline(seller);
  const displayRating = typeof rating === 'number' ? rating : parseFloat(rating) || 0;

  const completedSales = seller?.completed_sales ?? seller?.completedSales ?? 0;
  const isVerified = seller?.is_verified === true || seller?.is_verified === 1;

  return (
    <article className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col group">
      {/* Product image */}
      <Link to={`/product/${id}`} className="block flex-shrink-0 relative">
        {isOutOfStock && (
          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-red-500/90 text-white text-[10px] font-semibold uppercase tracking-wide">
            Out of stock
          </span>
        )}
        {isVerified && (
          <span className="absolute top-2 right-2 z-10">
            <VerifiedBadge />
          </span>
        )}
        <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-3.5 flex flex-col flex-1">
        {/* Product title */}
        <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug text-sm">
          <Link to={`/product/${id}`} className="hover:text-m4m-purple transition-colors">
            {name}
          </Link>
        </h3>

        {/* Seller info row */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {seller?.id ? (
            <Link to={`/seller/${seller.id}`} className="text-xs text-gray-500 hover:text-m4m-purple transition-colors font-medium truncate max-w-[100px]">
              {sellerName}
            </Link>
          ) : (
            <span className="text-xs text-gray-500 font-medium">{sellerName}</span>
          )}
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${online ? 'text-green-600' : 'text-gray-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-gray-300'}`} />
            {online ? 'Online' : 'Offline'}
          </span>
          {isVerified && <VerifiedBadge />}
        </div>

        {/* Sales badge + Rating */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <SellerSalesBadge completedSales={completedSales} />
          <div className="flex items-center gap-0.5" aria-label={`Rating: ${displayRating}`}>
            <span className="text-amber-400 text-xs">★</span>
            <span className="text-xs font-medium text-gray-600">
              {displayRating > 0 ? displayRating.toFixed(1) : '—'}
            </span>
          </div>
        </div>

        {/* Price + BUY */}
        <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
          <p className="font-bold text-gray-900">
            {Number(price).toFixed(2)} <span className="text-xs font-semibold text-gray-400">MAD</span>
          </p>
          <Link
            to={`/product/${id}`}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
              isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-default'
                : 'bg-m4m-purple text-white hover:bg-m4m-purple-dark'
            }`}
          >
            {isOutOfStock ? 'Sold out' : 'Buy now'}
          </Link>
        </div>
      </div>
    </article>
  );
}
