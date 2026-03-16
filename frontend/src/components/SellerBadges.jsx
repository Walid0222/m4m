/**
 * Shared badge components used site-wide for seller and buyer trust indicators.
 */
import { Trophy, ShoppingCart } from 'lucide-react';
import { getSellerSalesBadge, getBuyerPurchaseBadge } from '../lib/sellerBadge';

/** Blue checkmark verified badge */
export function VerifiedBadge({ size = 'sm' }) {
  const cls = size === 'lg'
    ? 'px-2.5 py-1 text-xs gap-1'
    : 'px-1.5 py-0.5 text-[10px] gap-0.5';
  return (
    <span className={`inline-flex items-center rounded-full bg-blue-100 text-blue-700 font-semibold ${cls}`}>
      <svg className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      Verified
    </span>
  );
}

/** Seller sales badge (1+, 10+, 100+, 500+, 1000+) */
export function SellerSalesBadge({ completedSales, size = 'sm' }) {
  const badge = getSellerSalesBadge(completedSales);
  if (!badge) return null;
  const cls = size === 'lg'
    ? 'px-2.5 py-1 text-xs gap-1'
    : 'px-1.5 py-0.5 text-[10px] gap-0.5';
  const iconCls = size === 'lg' ? 'w-4 h-4 flex-shrink-0' : 'w-3 h-3 flex-shrink-0';
  return (
    <span className={`inline-flex items-center rounded-full font-bold ${badge.color} ${cls}`}>
      <Trophy className={iconCls} />
      {badge.label}
    </span>
  );
}

/** Buyer purchase badge */
export function BuyerPurchaseBadge({ completedPurchases, size = 'sm' }) {
  const badge = getBuyerPurchaseBadge(completedPurchases);
  if (!badge) return null;
  const cls = size === 'lg'
    ? 'px-2.5 py-1 text-xs'
    : 'px-1.5 py-0.5 text-[10px]';
  return (
    <span className={`inline-flex items-center rounded-full font-bold ${badge.color} ${cls}`}>
      <ShoppingCart className="w-3 h-3 mr-1" />
      {badge.label}
    </span>
  );
}

/** Convenience: seller info row — name + online dot + verified + sales badge */
export function SellerTrustRow({ seller, size = 'sm', showName = false, className = '' }) {
  if (!seller) return null;
  const isVerified =
    seller.is_verified === true ||
    seller.is_verified === 1 ||
    seller.is_verified_seller === true ||
    seller.is_verified_seller === 1;
  const completedSales = seller.completed_sales ?? seller.completedSales ?? 0;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {showName && (
        <span className={`font-medium text-gray-900 ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>{seller.name}</span>
      )}
      {isVerified && <VerifiedBadge size={size} />}
      <SellerSalesBadge completedSales={completedSales} size={size} />
    </div>
  );
}
