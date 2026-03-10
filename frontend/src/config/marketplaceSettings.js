/**
 * Default marketplace settings (frontend).
 * Can be overridden by backend API response when available.
 */
export const DEFAULT_MARKETPLACE_SETTINGS = {
  showViewingIndicator: true,
  hideIfZero: true,
  exactViewerThreshold: 5,
  lowViewerText: '👀 Several people are viewing this item',
};

export const MARKETPLACE_SETTINGS_STORAGE_KEY = 'm4m_marketplace_settings';

/**
 * Merge backend response into defaults (use when API returns settings).
 * @param {Object} backendSettings - optional settings from API
 * @returns {Object} merged settings
 */
export function mergeMarketplaceSettings(backendSettings) {
  if (!backendSettings || typeof backendSettings !== 'object') {
    return { ...DEFAULT_MARKETPLACE_SETTINGS };
  }
  return {
    showViewingIndicator: backendSettings.showViewingIndicator ?? DEFAULT_MARKETPLACE_SETTINGS.showViewingIndicator,
    hideIfZero: backendSettings.hideIfZero ?? DEFAULT_MARKETPLACE_SETTINGS.hideIfZero,
    exactViewerThreshold: Number(backendSettings.exactViewerThreshold ?? DEFAULT_MARKETPLACE_SETTINGS.exactViewerThreshold) || 5,
    lowViewerText: backendSettings.lowViewerText ?? DEFAULT_MARKETPLACE_SETTINGS.lowViewerText,
  };
}
