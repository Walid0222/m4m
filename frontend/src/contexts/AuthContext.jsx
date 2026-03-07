import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import * as api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!api.getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.getMe();
      setUser(data);
    } catch {
      api.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password);
    const data = res?.data;
    if (data?.user) setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (nameOrPayload, email, password, passwordConfirmation, isSeller) => {
    const payload =
      typeof nameOrPayload === 'object' && nameOrPayload !== null && 'email' in nameOrPayload
        ? nameOrPayload
        : {
            name: nameOrPayload,
            email,
            password,
            password_confirmation: passwordConfirmation,
            is_seller: isSeller,
          };
    const res = await api.register(payload);
    const data = res?.data;
    if (data?.user) setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Clear auth state even if API call fails (e.g. network)
      api.setToken(null);
    }
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser: loadUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * Protects routes that require authentication.
 * Redirects to /login when not logged in, preserving the intended URL in state.
 */
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-m4m-purple border-t-transparent rounded-full animate-spin" aria-hidden />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/**
 * Protects admin-only routes. Requires login; redirects non-admins to homepage.
 */
export function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-m4m-purple border-t-transparent rounded-full animate-spin" aria-hidden />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.is_admin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
