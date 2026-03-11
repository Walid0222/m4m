import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function EmailVerificationBanner() {
  const { user, refreshUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState(null);

  if (!user || user.email_verified_at) {
    return null;
  }

  const handleResend = async () => {
    setSending(true);
    setMessage(null);
    try {
      await api.post('/email/resend');
      setMessage({ type: 'success', text: 'Verification email sent successfully.' });
    } catch (e) {
      setMessage({
        type: 'error',
        text: e.response?.data?.message || e.message || 'Failed to resend verification email.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      await refreshUser();
    } catch {
      setMessage({ type: 'error', text: 'Could not refresh account status.' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-900 px-4 sm:px-6 py-3">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-3 10H6a2 2 0 01-2-2V8a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2z"
                />
              </svg>
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold">Verify your email address</p>
            <p className="mt-0.5 text-xs sm:text-sm">
              We sent a verification email to your inbox{user.email ? ` (${user.email})` : ''}. Please click the link in the email to activate
              your account. If you cannot find the email, check your spam folder.
            </p>
            {message && (
              <p
                className={`mt-1 text-xs ${
                  message.type === 'success'
                    ? 'text-green-700'
                    : message.type === 'error'
                    ? 'text-red-700'
                    : 'text-yellow-900'
                }`}
              >
                {message.text}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="inline-flex justify-center items-center px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-60 transition-colors"
          >
            {sending ? 'Sending…' : 'Resend verification email'}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex justify-center items-center px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium border border-yellow-300 text-yellow-900 bg-yellow-50 hover:bg-yellow-100 disabled:opacity-60 transition-colors"
          >
            {refreshing ? 'Refreshing…' : 'Refresh status'}
          </button>
        </div>
      </div>
    </div>
  );
}

