import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function AuthPage() {
  const location = useLocation();
  const fromPath = location.state?.from?.pathname ?? '/';
  const sellerIntent = location.state?.sellerIntent === true;
  const { t } = useLanguage();

  const [isLogin, setIsLogin] = useState(!sellerIntent);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [banInfo, setBanInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFaUserId, setTwoFaUserId] = useState(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const { login, register, refreshUser } = useAuth();
  const navigate = useNavigate();
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
          setError(t('auth.passwords_do_not_match'));
          setSubmitting(false);
          return;
        }
        await register(name, email, password, passwordConfirmation);
        if (sellerIntent) {
          navigate('/help/how-to-sell', { replace: true });
        } else {
          navigate(fromPath, { replace: true });
        }
        return;
      } else if (isLogin && requires2FA) {
        // Second step: submit 2FA code
        const { login2fa } = await import('../services/api');
        const payload = await login2fa(twoFaUserId, twoFaCode.trim());
        console.log('2FA RESPONSE:', payload);
        if (!payload?.user) {
          setError(t('auth.invalid_2fa'));
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
      setError(err.message || t('common.something_went_wrong'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12 bg-m4m-gray-50">
      <div className="w-full max-w-md rounded-2xl border border-m4m-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-m4m-black mb-2 text-center">
          {isLogin ? (requires2FA ? t('auth.two_factor') : t('auth.sign_in')) : t('auth.create_account')}
        </h1>
        <p className="text-m4m-gray-500 text-center mb-6">
          {isLogin
            ? (requires2FA
              ? t('auth.enter_2fa_code')
              : t('auth.welcome_back'))
            : t('auth.join_m4m')}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {banInfo && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm space-y-1">
              {banInfo.ban_type === 'permanent' ? (
                <p className="font-semibold">{t('auth.banned_permanent')}</p>
              ) : (
                <p className="font-semibold">{t('auth.banned_temporary')}</p>
              )}
              {banInfo.ban_reason && <p><span className="font-medium">{t('auth.reason')}</span> {banInfo.ban_reason}</p>}
              {banInfo.ban_type === 'temporary' && banInfo.banned_until && (
                <p><span className="font-medium">{t('auth.suspension_ends')}</span> {new Date(banInfo.banned_until).toLocaleString()}</p>
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
                {t('auth.name')}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                placeholder={t('auth.placeholder_name')}
              />
            </div>
          )}
          {!requires2FA && (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-m4m-gray-700 mb-1">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                  placeholder={t('auth.placeholder_email')}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-m4m-gray-700 mb-1">
                  {t('auth.password')}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                  placeholder={t('auth.placeholder_password')}
                />
                {isLogin && (
                  <div className="mt-2">
                    <Link
                      to="/forgot-password"
                      className="text-xs text-m4m-purple hover:underline"
                    >
                      {t('auth.forgot_password')}
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
                  {t('auth.enter_2fa_label')}
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
                  placeholder={t('auth.placeholder_2fa')}
                />
                <p className="mt-1 text-xs text-m4m-gray-500">
                  {t('auth.authenticator_help')}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => { setRequires2FA(false); setTwoFaCode(''); setTwoFaUserId(null); }}
                  className="text-xs text-m4m-gray-500 hover:text-m4m-purple"
                >
                  {t('auth.back_to_login')}
                </button>
              </div>
            </div>
          )}
          {!isLogin && (
            <div>
              <label htmlFor="password_confirmation" className="block text-sm font-medium text-m4m-gray-700 mb-1">
                {t('auth.confirm_password')}
              </label>
              <input
                id="password_confirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-m4m-gray-200 bg-white text-m4m-black focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                placeholder={t('auth.placeholder_password')}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg font-semibold bg-m4m-purple text-white hover:bg-m4m-purple-dark disabled:opacity-60 transition-colors"
          >
            {submitting
              ? t('auth.please_wait')
              : isLogin
                ? (requires2FA ? t('auth.verify_code') : t('auth.sign_in'))
                : t('auth.create_account')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-m4m-gray-500">
          {isLogin ? t('auth.dont_have_account') : t('auth.already_have_account')}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); setRequires2FA(false); setTwoFaCode(''); setTwoFaUserId(null); }}
            className="text-m4m-purple font-medium hover:underline"
          >
            {isLogin ? t('auth.sign_up') : t('auth.sign_in')}
          </button>
        </p>
        <p className="mt-4 text-center">
          <Link to="/" className="text-sm text-m4m-gray-500 hover:text-m4m-purple">
            {t('auth.back_to_marketplace')}
          </Link>
        </p>
      </div>
    </div>
  );
}
