import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSeller, setIsSeller] = useState(false);
  const [error, setError] = useState('');
  const [banInfo, setBanInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFaUserId, setTwoFaUserId] = useState(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const { login, register, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from?.pathname ?? '/';

  // Display ban message if redirected here after a ban 403
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('m4m_ban_info');
      if (raw) {
        setBanInfo(JSON.parse(raw));
        sessionStorage.removeItem('m4m_ban_info');
      }
    } catch { /* ignore */ }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isLogin && !requires2FA) {
        const data = await login(email, password);
        console.log('LOGIN RESPONSE (AuthPage):', data);
        if (data?.requires_2fa && data.user_id) {
          setRequires2FA(true);
          setTwoFaUserId(data.user_id);
          setSubmitting(false);
          return;
        }
        navigate(fromPath, { replace: true });
        return;
      } else if (!isLogin) {
        if (password !== passwordConfirmation) {
          setError('Passwords do not match');
          setSubmitting(false);
          return;
        }
        await register(name, email, password, passwordConfirmation, isSeller);
      } else if (isLogin && requires2FA) {
        // Second step: submit 2FA code
        const { login2fa } = await import('../services/api');
        const payload = await login2fa(twoFaUserId, twoFaCode.trim());
        console.log('2FA RESPONSE:', payload);
        if (!payload?.user) {
          setError('Invalid 2FA code.');
          setSubmitting(false);
          return;
        }
        await refreshUser();
        navigate(fromPath, { replace: true });
        return;
      } else {
        navigate(fromPath, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12 bg-m4m-gray-50">
      <div className="w-full max-w-md rounded-2xl border border-m4m-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-m4m-black mb-2 text-center">
          {isLogin ? (requires2FA ? 'Two-Factor Authentication' : 'Sign in') : 'Create account'}
        </h1>
        <p className="text-m4m-gray-500 text-center mb-6">
          {isLogin
            ? (requires2FA
              ? 'Enter the 6-digit code from your authenticator app to continue.'
              : 'Welcome back to M4M')
            : 'Join M4M Marketplace'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {banInfo && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm space-y-1">
              {banInfo.ban_type === 'permanent' ? (
                <p className="font-semibold">🚫 Your account has been permanently banned by M4M administration.</p>
              ) : (
                <p className="font-semibold">⏸ Your account is temporarily suspended.</p>
              )}
              {banInfo.ban_reason && <p><span className="font-medium">Reason:</span> {banInfo.ban_reason}</p>}
              {banInfo.ban_type === 'temporary' && banInfo.banned_until && (
                <p><span className="font-medium">Suspension ends:</span> {new Date(banInfo.banned_until).toLocaleString()}</p>
              )}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-m4m-gray-700 mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                placeholder="Your name"
              />
            </div>
          )}
          {!requires2FA && (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-m4m-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-m4m-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                  placeholder="••••••••"
                />
                {isLogin && (
                  <div className="mt-2">
                    <Link
                      to="/forgot-password"
                      className="text-xs text-m4m-purple hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
          {requires2FA && (
            <div className="space-y-3">
              <div>
                <label htmlFor="twofa" className="block text-sm font-medium text-m4m-gray-700 mb-1">
                  Enter the 6-digit authenticator code
                </label>
                <input
                  id="twofa"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                  placeholder="123456"
                />
                <p className="mt-1 text-xs text-m4m-gray-500">
                  Open your authenticator app (Google Authenticator, Authy, etc.) and enter the current code for your M4M account.
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => { setRequires2FA(false); setTwoFaCode(''); setTwoFaUserId(null); }}
                  className="text-xs text-m4m-gray-500 hover:text-m4m-purple"
                >
                  ← Back to login
                </button>
              </div>
            </div>
          )}
          {!isLogin && (
            <>
              <div>
                <label htmlFor="password_confirmation" className="block text-sm font-medium text-m4m-gray-700 mb-1">
                  Confirm password
                </label>
                <input
                  id="password_confirmation"
                  type="password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                  placeholder="••••••••"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSeller}
                  onChange={(e) => setIsSeller(e.target.checked)}
                  className="rounded border-m4m-gray-300 text-m4m-purple focus:ring-m4m-purple"
                />
                <span className="text-sm text-m4m-gray-700">I want to sell on M4M</span>
              </label>
            </>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover disabled:opacity-60 transition-colors"
          >
            {submitting
              ? 'Please wait…'
              : isLogin
                ? (requires2FA ? 'Verify code' : 'Sign in')
                : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-m4m-gray-500">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); setRequires2FA(false); setTwoFaCode(''); setTwoFaUserId(null); }}
            className="text-m4m-purple font-medium hover:underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
        <p className="mt-4 text-center">
          <Link to="/" className="text-sm text-m4m-gray-500 hover:text-m4m-purple">
            ← Back to Marketplace
          </Link>
        </p>
      </div>
    </div>
  );
}
