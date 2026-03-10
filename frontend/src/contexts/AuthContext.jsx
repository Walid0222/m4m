import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import * as api from '../services/api';

const AuthContext = createContext(null);

/** Returns the localStorage key scoped to the given user id, or a generic fallback. */
function avatarKey(userId) {
  return userId ? `m4m_avatar_${userId}` : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // avatar is always null until a user is loaded — prevents cross-user bleed
  const [avatar, setAvatarState] = useState(null);

  /** Load avatar from localStorage for the given user id. */
  const syncAvatar = useCallback((userId) => {
    const key = avatarKey(userId);
    setAvatarState(key ? (localStorage.getItem(key) || null) : null);
  }, []);

  const setAvatar = useCallback((dataUrl) => {
    const key = avatarKey(user?.id);
    if (!key) return;
    if (dataUrl) localStorage.setItem(key, dataUrl);
    else localStorage.removeItem(key);
    setAvatarState(dataUrl || null);
  }, [user?.id]);

  const loadUser = useCallback(async () => {
    if (!api.getToken()) {
      setUser(null);
      setAvatarState(null); // clear avatar when no token
      setLoading(false);
      return;
    }
    try {
      const data = await api.getMe();
      setUser(data);
      syncAvatar(data?.id);
    } catch {
      api.setToken(null);
      setUser(null);
      setAvatarState(null);
    } finally {
      setLoading(false);
    }
  }, [syncAvatar]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Handle 401 from API (token expired/invalid)
  useEffect(() => {
    const handler = () => {
      api.setToken(null);
      setUser(null);
      setAvatarState(null);
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  // Handle 403 banned response — log out and store ban info for login page display
  useEffect(() => {
    const handler = (e) => {
      api.setToken(null);
      setUser(null);
      setAvatarState(null);
      const detail = e.detail ?? {};
      // Store ban info so LoginPage can surface the message
      try {
        sessionStorage.setItem('m4m_ban_info', JSON.stringify(detail));
      } catch { /* ignore */ }
    };
    window.addEventListener('auth:banned', handler);
    return () => window.removeEventListener('auth:banned', handler);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password);
    const data = res?.data;
    if (data?.user) {
      setUser(data.user);
      syncAvatar(data.user.id);
    }
    return data;
  }, [syncAvatar]);

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
    if (data?.user) {
      setUser(data.user);
      syncAvatar(data.user.id); // new user has no avatar → sets null cleanly
    }
    return data;
  }, [syncAvatar]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      api.setToken(null);
    }
    setUser(null);
    setAvatarState(null); // always clear avatar on logout
  }, []);

  // Normalize API avatar URL (backend may return http://localhost without port)
  const apiAvatar = user?.avatar
    ? user.avatar.replace('http://localhost/', 'http://localhost:8000/')
    : null;

  const displayAvatar = apiAvatar || avatar;

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser: loadUser,
    avatar: displayAvatar,
    setAvatar,
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
 * Protects seller-only routes. Requires login; redirects non-sellers to homepage.
 */
export function SellerRoute({ children }) {
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

  if (!user.is_seller) {
    return <Navigate to="/" replace />;
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
