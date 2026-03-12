import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, enable2FA, confirm2FA, disable2FA } from '../services/api';
import { useRefresh } from '../contexts/RefreshContext';

async function updateMe(body) {
  const res = await api.patch('/me', body);
  return res.data?.data ?? res.data;
}

export default function SettingsPage() {
  const { user, loading, refreshUser } = useAuth();
  const { setIntervalMs } = useRefresh();
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Interface preferences: global auto refresh
  const [refreshInterval, setRefreshInterval] = useState(15000);

  // 2FA state
  const [twoFAState, setTwoFAState] = useState({ loading: false, enabling: false, secret: null, qrCode: null });
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFADisablePw, setTwoFADisablePw] = useState('');
  const [twoFADisableCode, setTwoFADisableCode] = useState('');
  const [twoFAMessage, setTwoFAMessage] = useState(null);

  useEffect(() => {
    const isBuyer = user && !user.is_admin && !user.is_seller;
    if (isBuyer) {
      setEnabled(user.show_recent_sales_notifications ?? true);
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('platform_auto_refresh');
    if (raw == null) {
      window.localStorage.setItem('platform_auto_refresh', '15000');
      setRefreshInterval(15000);
      return;
    }
    const v = Number(raw);
    if (Number.isFinite(v)) {
      setRefreshInterval(v);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-m4m-purple border-t-transparent rounded-full animate-spin" aria-hidden />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Log in to manage your settings.</p>
      </div>
    );
  }

  const handleToggle = async (checked) => {
    setEnabled(checked);
    setSaving(true);
    setMessage(null);
    try {
      await updateMe({ show_recent_sales_notifications: checked });
      await refreshUser();
      setMessage({ type: 'success', text: 'Preference updated.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to update preference.' });
      // revert on error
      setEnabled((prev) => !prev);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Control your marketplace experience, security, and notification preferences.
        </p>
      </div>

      {/* Interface Preferences */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-900">Interface Preferences</h2>
        <p className="text-xs text-gray-500">
          Automatically refresh platform data such as orders, wallet, disputes and dashboards.
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Auto refresh</label>
          <select
            value={refreshInterval}
            onChange={(e) => {
              const v = Number(e.target.value);
              setRefreshInterval(v);
              if (typeof window !== 'undefined') {
                window.localStorage.setItem('platform_auto_refresh', String(v));
              }
              setIntervalMs(v);
            }}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
          >
            <option value={0}>Off</option>
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
            <option value={15000}>15 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>60 seconds</option>
            <option value={120000}>120 seconds</option>
          </select>
        </div>
      </div>

      {/* Security / Two-Factor Authentication */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-900">Security</h2>
        {twoFAMessage && (
          <div
            className={`text-sm px-3 py-2 rounded-xl ${
              twoFAMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {twoFAMessage.text}
          </div>
        )}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Two-Factor Authentication (2FA)</p>
              <p className="text-xs text-gray-500 mt-1">
                Add an extra layer of security to your account using an authenticator app like Google Authenticator or Authy.
              </p>
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
              user.two_factor_enabled_at ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {user.two_factor_enabled_at ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {!user.two_factor_enabled_at ? (
            <>
              {!twoFAState.secret ? (
                <button
                  type="button"
                  onClick={async () => {
                    setTwoFAMessage(null);
                    setTwoFAState((s) => ({ ...s, loading: true }));
                    try {
                      const data = await enable2FA();
                      setTwoFAState({
                        loading: false,
                        enabling: true,
                        secret: data.secret,
                        qrCode: data.qr_code,
                      });
                    } catch (e) {
                      setTwoFAMessage({ type: 'error', text: e.message || 'Failed to start 2FA setup.' });
                      setTwoFAState({ loading: false, enabling: false, secret: null, qrCode: null });
                    }
                  }}
                  disabled={twoFAState.loading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-m4m-purple text-white text-sm font-semibold hover:bg-m4m-purple-dark disabled:opacity-60"
                >
                  {twoFAState.loading ? 'Starting…' : 'Enable 2FA'}
                </button>
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-gray-600">
                    Scan this QR code using Google Authenticator, Authy, or any TOTP-compatible app. Then enter the 6-digit code to confirm.
                  </p>
                  <div className="rounded-xl border border-dashed border-gray-300 p-3 text-center flex flex-col items-center">
                    {twoFAState.qrCode && (
                      <img
                        src={twoFAState.qrCode}
                        alt="2FA QR Code"
                        className="w-40 h-40 max-w-full mx-auto mb-3"
                      />
                    )}
                    <p className="text-xs text-gray-500 mb-2 break-all">
                      If you cannot scan the QR code, add this key manually in your app:
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <code className="px-2 py-1 rounded-md bg-gray-100 text-xs font-mono break-all">
                        {twoFAState.secret}
                      </code>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(twoFAState.secret)}
                        className="px-2 py-1 rounded-md border border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Authenticator code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        value={twoFACode}
                        onChange={(e) => setTwoFACode(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setTwoFAMessage(null);
                        try {
                          await confirm2FA(twoFACode.trim());
                          await refreshUser();
                          setTwoFAMessage({ type: 'success', text: 'Two-factor authentication enabled.' });
                          setTwoFAState({ loading: false, enabling: false, secret: null, qrCode: null });
                          setTwoFACode('');
                        } catch (e) {
                          setTwoFAMessage({ type: 'error', text: e.message || 'Invalid 2FA code.' });
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-m4m-green text-white text-sm font-semibold hover:bg-m4m-green-hover"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 mt-2">
              <p className="text-xs text-gray-600">
                Two-factor authentication is currently enabled on your account. To disable it, confirm your password and a 6-digit code from your authenticator app.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={twoFADisablePw}
                    onChange={(e) => setTwoFADisablePw(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Authenticator code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={twoFADisableCode}
                    onChange={(e) => setTwoFADisableCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-m4m-purple focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setTwoFAMessage(null);
                  try {
                    await disable2FA({ password: twoFADisablePw, code: twoFADisableCode });
                    await refreshUser();
                    setTwoFAMessage({ type: 'success', text: 'Two-factor authentication disabled.' });
                    setTwoFADisablePw('');
                    setTwoFADisableCode('');
                  } catch (e) {
                    setTwoFAMessage({ type: 'error', text: e.message || 'Failed to disable 2FA.' });
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-semibold border border-red-200 hover:bg-red-100"
              >
                Disable 2FA
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Buyer-only notifications block */}
      {user && !user.is_admin && !user.is_seller && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
          {message && (
            <div
              className={`text-sm px-3 py-2 rounded-xl ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Recent Purchase Notifications
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-md">
                Disable this if you don&apos;t want to see recent purchase popups on the
                marketplace.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle(!enabled)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition-colors ${
                enabled
                  ? 'bg-m4m-purple border-m4m-purple'
                  : 'bg-gray-200 border-gray-300'
              }`}
              aria-pressed={enabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

