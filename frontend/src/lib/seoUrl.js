export const DEFAULT_SEO_IMAGE_PATH = '/og-default.jpg';

export function getCurrentUrl(fallback = '') {
  if (typeof window !== 'undefined' && window.location?.href) {
    return window.location.href;
  }
  return fallback;
}

/** Absolute URL for Open Graph / Twitter images (empty input uses DEFAULT_SEO_IMAGE_PATH). */
export function seoAbsoluteImageUrl(raw = DEFAULT_SEO_IMAGE_PATH) {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const path =
    raw == null || String(raw).trim() === '' ? DEFAULT_SEO_IMAGE_PATH : String(raw).trim();
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`;
}
