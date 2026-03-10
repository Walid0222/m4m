import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DEFAULT_MARKETPLACE_SETTINGS,
  MARKETPLACE_SETTINGS_STORAGE_KEY,
  mergeMarketplaceSettings,
} from '../config/marketplaceSettings';
import { getSettings } from '../services/api';

const MarketplaceSettingsContext = createContext(null);

function loadStored() {
  try {
    const raw = localStorage.getItem(MARKETPLACE_SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return mergeMarketplaceSettings(parsed);
  } catch {
    return null;
  }
}

export function MarketplaceSettingsProvider({ children }) {
  const [marketplaceSettings, setMarketplaceSettingsState] = useState(() => {
    const stored = loadStored();
    return stored ?? { ...DEFAULT_MARKETPLACE_SETTINGS };
  });

  const setMarketplaceSettings = useCallback((next) => {
    setMarketplaceSettingsState((prev) => {
      const nextState = typeof next === 'function' ? next(prev) : next;
      const merged = mergeMarketplaceSettings({ ...prev, ...nextState });
      try {
        localStorage.setItem(MARKETPLACE_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // ignore
      }
      return merged;
    });
  }, []);

  useEffect(() => {
    getSettings()
      .then((apiData) => {
        if (apiData && typeof apiData === 'object') {
          setMarketplaceSettingsState((prev) =>
            mergeMarketplaceSettings({ ...DEFAULT_MARKETPLACE_SETTINGS, ...apiData, ...prev })
          );
        }
      })
      .catch(() => {});
  }, []);

  const value = { marketplaceSettings, setMarketplaceSettings };
  return (
    <MarketplaceSettingsContext.Provider value={value}>
      {children}
    </MarketplaceSettingsContext.Provider>
  );
}

export function useMarketplaceSettings() {
  const ctx = useContext(MarketplaceSettingsContext);
  if (!ctx) {
    return {
      marketplaceSettings: { ...DEFAULT_MARKETPLACE_SETTINGS },
      setMarketplaceSettings: () => {},
    };
  }
  return ctx;
}
