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
    const payload = await api.login(email, password);
    console.log('LOGIN RESPONSE:', payload);
    if (payload?.requires_2fa) {
      // 2FA step will be handled by AuthPage using the raw response.
      return payload;
    }
    if (payload?.user) {
      setUser(payload.user);
      syncAvatar(payload.user.id);
    }
    return payload;
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

  const displayAvatar = user?.avatar || avatar;

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
function EmailVerificationRequiredScreen() {
  const { user, refreshUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState(null);

  const handleResend = async () => {
    setSending(true);
    setMessage(null);
    try {
      await api.api.post('/email/resend');
      setMessage({ type: 'success', text: 'Verification email sent successfully.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || e.message || 'Failed to resend verification email.' });
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      await refreshUser();
      setMessage({ type: 'info', text: 'Refreshed account status.' });
    } catch {
      setMessage({ type: 'error', text: 'Could not refresh account status.' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-800 p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300 mb-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-3 10H6a2 2 0 01-2-2V8a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Verify your email</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              We sent a verification email to your inbox{user?.email ? ` (${user.email})` : ''}.
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              Please check your email and click the verification link to activate your account. If you cannot find the email, check your spam folder.
            </p>
          </div>
          {message && (
            <p
              className={`text-xs ${
                message.type === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : message.type === 'error'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {message.text}
            </p>
          )}
          <div className="w-full flex flex-col sm:flex-row gap-3 mt-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={sending}
              className="inline-flex justify-center items-center flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {sending ? 'Sending…' : 'Resend verification email'}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex justify-center items-center flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 transition-colors"
            >
              {refreshing ? 'Refreshing…' : 'Refresh status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  // If user is logged in but not verified, show verification required screen
  if (!user.email_verified_at) {
    return <EmailVerificationRequiredScreen />;
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
