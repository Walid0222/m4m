import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'platform_auto_refresh';
const DEFAULT_INTERVAL_MS = 15000;

const RefreshContext = createContext({
  tick: 0,
  intervalMs: DEFAULT_INTERVAL_MS,
  // eslint-disable-next-line no-unused-vars
  setIntervalMs: (_ms) => {},
});

export function RefreshProvider({ children }) {
  const [tick, setTick] = useState(0);
  const [intervalMs, setIntervalMsState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_INTERVAL_MS;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) {
      window.localStorage.setItem(STORAGE_KEY, String(DEFAULT_INTERVAL_MS));
      return DEFAULT_INTERVAL_MS;
    }
    const v = Number(raw);
    if (Number.isFinite(v) && v >= 0) {
      return v;
    }
    return DEFAULT_INTERVAL_MS;
  });

  // Persist interval changes back to localStorage
  const setIntervalMs = useCallback((ms) => {
    const value = Number(ms);
    const next = Number.isFinite(value) && value >= 0 ? value : DEFAULT_INTERVAL_MS;
    setIntervalMsState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    }
  }, []);

  // Global tick timer (pauses when tab is hidden)
  useEffect(() => {
    // Server-side or non-DOM environment: simple interval without visibility handling
    if (typeof document === 'undefined') {
      if (!intervalMs || intervalMs <= 0) return undefined;
      const id = setInterval(() => {
        setTick((prev) => prev + 1);
      }, intervalMs);
      return () => clearInterval(id);
    }

    let id;

    const start = () => {
      if (!intervalMs || intervalMs <= 0) return;
      if (document.hidden) return;
      if (id) clearInterval(id);
      id = setInterval(() => {
        setTick((prev) => prev + 1);
      }, intervalMs);
    };

    const stop = () => {
      if (id) {
        clearInterval(id);
        id = undefined;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    // Start immediately if tab is visible
    start();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stop();
    };
  }, [intervalMs]);

  const value = {
    tick,
    intervalMs,
    setIntervalMs,
  };

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  return useContext(RefreshContext);
}

export default RefreshContext;

