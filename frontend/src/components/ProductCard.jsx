import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isSellerOnline } from '../lib/sellerOnline';
import { VerifiedBadge, SellerSalesBadge } from './SellerBadges';

/**
 * Product card used on HomePage, seller profile, favorites, etc.
 *
 * Optional favorites props:
 * - isFavorited: boolean
 * - onToggleFavorite: () => void
 */
export default function ProductCard({ product, isFavorited = false, onToggleFavorite }) {
  const { id, name, price, seller, stock, is_pinned } = product;
  const [sellerAvatarError, setSellerAvatarError] = useState(false);
  const isOutOfStock = Number(stock ?? 0) <= 0;
  const sellerName = seller?.name ?? 'Seller';
  const sellerDisplayName = seller?.username ?? seller?.name ?? 'Seller';
  const rawSellerAvatar = seller?.avatar || null;
  const sellerAvatarSrc = rawSellerAvatar
    ? `${rawSellerAvatar}?v=${seller?.updated_at || Date.now()}`
    : '/default-avatar.png';
  const online = isSellerOnline(seller);
  const reviewsCount = product.reviews_count ?? product.reviews?.length ?? 0;
  const avgRating = product.reviews_avg_rating ?? product.rating;
  const displayRating = reviewsCount > 0 && avgRating != null ? Number(avgRating) : null;

  const stockNum = Number(stock ?? 0);
  const isLowStock = stockNum > 0 && stockNum <= 5;
  const isInstant = product.delivery_type === 'instant';

  const offerSales = Number(product.completed_orders_count ?? product.sales ?? 0);
  const completedSales = seller?.completed_sales ?? seller?.completedSales ?? 0;
  const isVerified =
    seller?.is_verified === true ||
    seller?.is_verified === 1 ||
    seller?.is_verified_seller === true ||
    seller?.is_verified_seller === 1;
  const sellerLevel = typeof seller?.seller_level === 'number' ? seller.seller_level : null;

  return (
    <article className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col group">
      {/* Product image + favorite/verified badges */}
      <Link to={`/product/${id}`} className="block flex-shrink-0 relative">
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {is_pinned && (
            <span className="px-2 py-0.5 rounded-lg bg-amber-400/95 text-amber-900 text-[10px] font-semibold uppercase tracking-wide w-fit">
              ⭐ Featured
            </span>
          )}
          {isOutOfStock && (
            <span className="px-2 py-0.5 rounded-lg bg-red-500/90 text-white text-[10px] font-semibold uppercase tracking-wide w-fit">
              Out of stock
            </span>
          )}
        </div>
        {isVerified && (
          <span className="absolute top-2 right-2 z-10">
            <VerifiedBadge />
          </span>
        )}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite();
            }}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            className={`absolute bottom-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors ${
              isFavorited
                ? 'bg-pink-500 text-white'
                : 'bg-white/95 text-gray-400 hover:bg-pink-50 hover:text-pink-500'
            }`}
          >
            <svg className="w-4 h-4" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
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

        {/* Dynamic badges: Instant delivery / Low stock */}
        {(isInstant || isLowStock) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {isInstant && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                ⚡ Instant Delivery
              </span>
            )}
            {isLowStock && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-800">
                🟢 Low Stock
              </span>
            )}
          </div>
        )}

        {/* Seller info row: avatar + name */}
        <div className="mt-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
            {!sellerAvatarError && sellerAvatarSrc ? (
              <img
                src={sellerAvatarSrc}
                alt="seller avatar"
                className="w-6 h-6 rounded-full object-cover"
                onError={() => setSellerAvatarError(true)}
              />
            ) : (
              <span className="text-xs font-semibold text-gray-500">
                {(sellerName || 'S').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 flex-1">
            {seller?.id ? (
              <Link to={`/seller/${seller.id}`} className="text-xs text-gray-600 hover:text-m4m-purple transition-colors font-medium truncate max-w-[100px]">
                {sellerDisplayName}
              </Link>
            ) : (
              <span className="text-xs text-gray-600 font-medium truncate">{sellerDisplayName}</span>
            )}
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${online ? 'text-green-600' : 'text-gray-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-gray-300'}`} />
              {online ? 'Online' : 'Offline'}
            </span>
            {isVerified && <VerifiedBadge />}
          </div>
        </div>

        {/* Sales badge + Rating */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <SellerSalesBadge completedSales={completedSales} />
          {sellerLevel != null && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">
              Lv {sellerLevel}
            </span>
          )}
          <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
            {reviewsCount > 0 ? (
              <>
                <span className="text-amber-400">⭐</span>
                <span>
                  {displayRating != null ? displayRating.toFixed(1) : 'New'} ({reviewsCount}{' '}
                  {reviewsCount === 1 ? 'review' : 'reviews'})
                </span>
              </>
            ) : (
              <span className="text-gray-500">No reviews yet</span>
            )}
            {offerSales > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-gray-500">
                <span>🛒</span>
                <span>
                  {offerSales} {offerSales === 1 ? 'sale' : 'sales'}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Price + BUY */}
        <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
          <p className="font-bold text-gray-900">
            {Number(product.price || 0).toFixed(2)} <span className="text-xs font-semibold text-gray-400">MAD</span>
          </p>
          <Link
            to={`/product/${id}`}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
              isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-default'
                : 'bg-m4m-purple text-white hover:bg-m4m-purple-dark hover:text-white active:bg-m4m-purple-dark active:text-white'
            }`}
          >
            {isOutOfStock ? 'Sold out' : 'Buy now'}
          </Link>
        </div>
      </div>
    </article>
  );
}
