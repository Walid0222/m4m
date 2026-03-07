const ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns true if the seller has activity in the last 5 minutes (green dot).
 * Otherwise false (gray dot). Uses seller.last_activity_at from API.
 * @param {{ last_activity_at?: string | number | null } | null} seller
 * @returns {boolean}
 */
export function isSellerOnline(seller) {
  const at = seller?.last_activity_at;
  if (at == null) return false;
  const ts = typeof at === 'number' ? at : new Date(at).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < ONLINE_WINDOW_MS;
}
