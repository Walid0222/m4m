import { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'm4m_balance_visibility';

const BalanceVisibilityContext = createContext({
  showBalance: false,
  // eslint-disable-next-line no-unused-vars
  toggleShowBalance: () => {},
});

export function BalanceVisibilityProvider({ children }) {
  const [showBalance, setShowBalance] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw === '1';
    } catch {
      return false;
    }
  });

  const toggleShowBalance = useCallback(() => {
    setShowBalance((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  }, []);

  return (
    <BalanceVisibilityContext.Provider value={{ showBalance, toggleShowBalance }}>
      {children}
    </BalanceVisibilityContext.Provider>
  );
}

export function useBalanceVisibility() {
  return useContext(BalanceVisibilityContext);
}

