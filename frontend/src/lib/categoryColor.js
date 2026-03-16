/**
 * Returns Tailwind classes for a category badge based on slug.
 * Uses a small palette and a hash so any number of categories get a stable color.
 */
const BADGE_PALETTE = [
  'bg-purple-100 text-purple-800',
  'bg-blue-100 text-blue-800',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-teal-100 text-teal-800',
  'bg-pink-100 text-pink-800',
  'bg-indigo-100 text-indigo-800',
  'bg-rose-100 text-rose-800',
];

function hashSlug(slug) {
  if (!slug || typeof slug !== 'string') return 0;
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getCategoryColor(categorySlug) {
  const index = hashSlug(categorySlug ?? '') % BADGE_PALETTE.length;
  return BADGE_PALETTE[index];
}
