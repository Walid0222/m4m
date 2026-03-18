import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Star, ShoppingCart, AlertCircle } from 'lucide-react';
import { isSellerOnline } from '../lib/sellerOnline';
import { VerifiedBadge, SellerSalesBadge } from './SellerBadges';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Single source of truth for product cards across the site.
 * Use this component for all product listings: homepage, flash deals, recommended,
 * recently viewed, seller profile, marketplace, favorites, and offer-type pages.
 *
 * Layout: image (aspect-[4/3]), badges overlay (Instant delivery, Low stock), favorite overlay,
 * title (line-clamp-2), seller info (seller, online, level), price + MAD, Buy button.
 * When sold out: price hidden, grey "Sold out" button only.
 *
 * Props:
 * - product: Product data
 * - isFavorited?: boolean
 * - onToggleFavorite?: () => void
 * - compact?: boolean — smaller layout for horizontal carousels on mobile only
 */
export default function ProductCard({ product, isFavorited = false, onToggleFavorite, compact = false }) {
  const { t } = useLanguage();
  const { id, name, price, seller, stock, is_pinned } = product;
  const [sellerAvatarError, setSellerAvatarError] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [product?.id, product?.images?.[0]]);

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

  // Compact marketplace-style card for horizontal carousels
  if (compact) {
    return (
      <article className="w-[160px] h-[220px] flex flex-col border border-gray-200 rounded-xl bg-white p-2 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        <Link to={`/product/${id}`} className="relative block">
          {/* Badges overlay (featured / stock / instant / low stock) */}
          <div className="absolute inset-x-1 top-1 z-10 flex justify-between items-start text-[10px] font-semibold">
            <div className="flex flex-col gap-1">
              {is_pinned && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400/95 text-amber-900 uppercase tracking-wide">
                  Featured
                </span>
              )}
              {isInstant && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                  <Zap className="w-3 h-3" />
                  <span>{t('product.instant')}</span>
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 items-end">
              {isOutOfStock && (
                <span className="px-1.5 py-0.5 rounded bg-red-500/90 text-white uppercase tracking-wide">
                  {t('product.out_of_stock')}
                </span>
              )}
              {isLowStock && !isOutOfStock && (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  {t('product.low_stock')}
                </span>
              )}
            </div>
          </div>

          {/* Image */}
          <div className="w-full h-24 bg-gray-100 flex items-center justify-center overflow-hidden rounded-md">
            {product.images?.[0] && typeof product.images[0] === 'string' && product.images[0].trim() && !imageError ? (
              <img
                src={product.images[0]}
                alt={name}
                loading="lazy"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[11px]">{t('product.no_image')}</span>
              </div>
            )}
          </div>
        </Link>

        {/* Title */}
        <h3 className="mt-1 text-sm font-medium text-gray-900 line-clamp-2 flex-grow">
          <Link to={`/product/${id}`} className="hover:text-m4m-purple transition-colors">
            {name}
          </Link>
        </h3>

        {/* Seller line: sellername • Online Level 2 */}
        <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
          {seller?.id ? (
            <Link
              to={`/seller/${seller.id}`}
              className="truncate max-w-[70px] hover:text-m4m-purple transition-colors"
              title={sellerDisplayName}
            >
              {sellerDisplayName}
            </Link>
          ) : (
            <span className="truncate max-w-[70px]" title={sellerDisplayName}>
              {sellerDisplayName}
            </span>
          )}
          <span>•</span>
          <span className={online ? 'text-green-600' : 'text-gray-400'}>
            {online ? t('product.online') : t('product.offline')}
          </span>
          {sellerLevel != null && (
            <span className="ml-1 inline-flex items-center px-1 rounded bg-purple-100 text-purple-600 text-[10px]">
              {t('product.seller_level')} {sellerLevel}
            </span>
          )}
        </div>

        {/* Bottom row: price + optional sold-out badge (card itself remains clickable) */}
        <div className="mt-auto pt-1 flex items-center justify-between">
          <p className="flex items-baseline gap-1 text-base font-semibold text-m4m-purple">
            {Math.round(Number(product.price || 0))}{' '}
            <span className="text-xs text-gray-500">MAD</span>
          </p>
          {isOutOfStock && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
              {t('product.sold_out')}
            </span>
          )}
        </div>
      </article>
    );
  }

  // Default (non-compact) full card
  const cardPaddingClass = 'p-3';
  const titleTextClass = 'text-sm';
  const priceTextClass = 'text-base';
  const buyButtonTextClass = 'text-sm';
  const imageWrapperClass = 'relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-gray-100 flex items-center justify-center flex-shrink-0';

  return (
    <article className="h-full bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 overflow-hidden flex flex-col group">
      {/* Product image + overlay badges + favorite/verified badges */}
      <Link to={`/product/${id}`} className="block flex-shrink-0">
        <div className={imageWrapperClass}>
          {/* Top-left badges: featured / stock / instant / low stock */}
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
            {is_pinned && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-400/95 text-amber-900 text-[10px] font-semibold uppercase tracking-wide w-fit">
                {t('common.featured') || 'Featured'}
              </span>
            )}
            {!isOutOfStock && isInstant && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                <Zap className="w-3 h-3" />
                <span>{t('product.instant')}</span>
              </span>
            )}
            {!isOutOfStock && isLowStock && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-800">
                <AlertCircle className="w-3 h-3" />
                <span>{t('product.low_stock')}</span>
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
          {product.images?.[0] && typeof product.images[0] === 'string' && product.images[0].trim() && !imageError ? (
            <img
              src={product.images[0]}
              alt={name}
              loading="lazy"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300 min-h-0"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 text-gray-300 w-full h-full">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">{t('product.no_image')}</span>
            </div>
          )}
        </div>
      </Link>

      <div className={`${cardPaddingClass} flex flex-col flex-1 min-h-0`}>
        {/* Product title */}
        <h3 className={`font-semibold text-gray-900 line-clamp-2 leading-snug ${titleTextClass}`}>
          <Link to={`/product/${id}`} className="hover:text-m4m-purple transition-colors">
            {name}
          </Link>
        </h3>

        {/* Seller info (online status, level) under title */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
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
            {seller?.id ? (
              <Link to={`/seller/${seller.id}`} className="text-xs text-gray-600 hover:text-m4m-purple transition-colors font-medium truncate max-w-[80px]">
                {sellerDisplayName}
              </Link>
            ) : (
              <span className="text-xs text-gray-600 font-medium truncate max-w-[80px]">{sellerDisplayName}</span>
            )}
          </div>
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium flex-shrink-0 ${online ? 'text-green-600' : 'text-gray-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-gray-300'}`} />
            {online ? t('product.online') : t('product.offline')}
          </span>
          {/* Verified badge intentionally only shown on image corner to reduce clutter */}
          <SellerSalesBadge completedSales={completedSales} />
          {sellerLevel != null && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">
              {t('product.seller_level')} {sellerLevel}
            </span>
          )}
          {reviewsCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600">
              <Star className="w-3 h-3" />
              {displayRating != null ? displayRating.toFixed(1) : '—'} ({reviewsCount})
            </span>
          )}
          {offerSales > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">
              <ShoppingCart className="w-3 h-3" />
              {offerSales} {offerSales === 1 ? 'sale' : 'sales'}
            </span>
          )}
        </div>

        {/* Price + optional sold-out badge; card itself is the primary click target */}
        <div className="mt-auto pt-3 flex items-center gap-2 border-t border-gray-100 justify-between">
          <p className={`flex items-baseline gap-1 text-m4m-purple ${priceTextClass} font-semibold`}>
            {Math.round(Number(product.price || 0))}{' '}
            <span className="text-xs text-gray-500">MAD</span>
          </p>
          {isOutOfStock && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
              {t('product.sold_out')}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
