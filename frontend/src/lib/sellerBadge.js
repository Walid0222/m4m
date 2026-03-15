/**
 * Returns a badge label and color class based on completed sales count.
 */
export function getSellerSalesBadge(completedSales) {
  const n = Number(completedSales ?? 0);
  if (n >= 1000) return { label: '1000+ sales', color: 'bg-yellow-400 text-yellow-900', tier: 'legendary' };
  if (n >= 500)  return { label: '500+ sales',  color: 'bg-purple-600 text-white',       tier: 'master' };
  if (n >= 100)  return { label: '100+ sales',  color: 'bg-indigo-600 text-white',       tier: 'expert' };
  if (n >= 50)   return { label: '50+ sales',   color: 'bg-blue-600 text-white',         tier: 'established' };
  if (n >= 30)   return { label: '30+ sales',   color: 'bg-cyan-600 text-white',         tier: 'growing' };
  if (n >= 20)   return { label: '20+ sales',   color: 'bg-teal-600 text-white',         tier: 'rising' };
  if (n >= 10)   return { label: '10+ sales',   color: 'bg-green-600 text-white',        tier: 'active' };
  if (n >= 5)    return { label: '5+ sales',    color: 'bg-slate-600 text-white',        tier: 'beginner' };
  if (n >= 1)    return { label: '1+ sales',    color: 'bg-gray-500 text-white',         tier: 'new' };
  return null;
}

export function getBuyerPurchaseBadge(completedPurchases) {
  const n = Number(completedPurchases ?? 0);
  if (n >= 100) return { label: '100+ purchases', color: 'bg-purple-600 text-white' };
  if (n >= 50)  return { label: '50+ purchases',  color: 'bg-blue-600 text-white' };
  if (n >= 10)  return { label: '10+ purchases',  color: 'bg-green-600 text-white' };
  if (n >= 1)   return { label: '1+ purchase',    color: 'bg-gray-500 text-white' };
  return null;
}
