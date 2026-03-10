import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

async function updateMe(body) {
  const res = await api.patch('/me', body);
  return res.data?.data ?? res.data;
}

export default function SettingsPage() {
  const { user, loading, refreshUser } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const isBuyer = user && !user.is_admin && !user.is_seller;
    if (isBuyer) {
      setEnabled(user.show_recent_sales_notifications ?? true);
    }
  }, [user]);

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
          Control your marketplace experience and notification preferences.
        </p>
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

