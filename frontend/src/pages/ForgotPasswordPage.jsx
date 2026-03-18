import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const res = await forgotPassword(email.trim());
      const msg = res?.message || 'If that email exists, a password reset link has been sent.';
      setMessage(msg);
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
          {t('auth.forgot_password_title')}
        </h1>
        <p className="text-m4m-gray-500 text-center mb-6">
          {t('auth.forgot_password_intro')}
        </p>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg font-semibold bg-m4m-green text-white hover:bg-m4m-green-hover disabled:opacity-60 transition-colors"
          >
            {submitting ? t('auth.please_wait') : t('auth.send_reset_link')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-m4m-gray-500">
          {t('auth.remembered_password')}{' '}
          <Link to="/login" className="text-m4m-purple font-medium hover:underline">
            {t('auth.back_to_login_link')}
          </Link>
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

