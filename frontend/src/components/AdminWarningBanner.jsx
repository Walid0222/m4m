import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getToken } from '../services/api';
import {
  getSellerWarnings,
  dismissSellerWarning,
  getNotifications,
  markNotificationRead,
} from '../services/api';
import { AlertTriangle, X as XIcon } from 'lucide-react';

/**
 * Normalizes seller-warnings API response to a list of { id, reason, message, date, source }.
 */
function normalizeSellerWarnings(data) {
  const raw = Array.isArray(data) ? data : (data?.warnings ?? []);
  return raw.map((w) => ({
    id: w.id,
    reason: w.reason ?? '',
    message: w.message ?? '',
    date: w.created_at ?? null,
    source: 'seller',
  }));
}

/**
 * Normalizes notifications (type seller_warning) to same shape.
 */
function normalizeNotificationWarnings(list) {
  if (!Array.isArray(list)) return [];
  const warnings = list.filter(
    (n) => (n.type || n.data?.type) === 'seller_warning' && !n.read
  );
  return warnings.map((n) => {
    const data = n.data || {};
    return {
      id: n.id,
      reason: data.reason ?? '',
      message: data.message ?? '',
      date: n.created_at ?? data.created_at ?? null,
      source: 'notification',
    };
  });
}

export default function AdminWarningBanner() {
  const { user } = useAuth();
  const [warnings, setWarnings] = useState([]);

  const fetchAsSeller = useCallback(async () => {
    try {
      const data = await getSellerWarnings();
      setWarnings(normalizeSellerWarnings(data));
    } catch {
      setWarnings([]);
    }
  }, []);

  const fetchAsNonSeller = useCallback(async () => {
    try {
      const list = await getNotifications();
      setWarnings(normalizeNotificationWarnings(list));
    } catch {
      setWarnings([]);
    }
  }, []);

  useEffect(() => {
    if (!user || !getToken()) {
      setWarnings([]);
      return;
    }
    if (user.is_seller) {
      fetchAsSeller();
    } else {
      fetchAsNonSeller();
    }
  }, [user, fetchAsSeller, fetchAsNonSeller]);

  const handleDismiss = async (item) => {
    try {
      if (item.source === 'seller') {
        await dismissSellerWarning(item.id);
      } else {
        await markNotificationRead(item.id);
      }
      setWarnings((prev) => prev.filter((w) => w.id !== item.id || w.source !== item.source));
    } catch {
      // keep banner visible if dismiss fails
    }
  };

  if (!user || warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {warnings.map((w) => (
        <div
          key={`${w.source}-${w.id}`}
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-800 text-sm flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              ADMIN WARNING
            </p>
            {w.reason && (
              <p className="text-sm text-amber-700 mt-0.5">
                <span className="font-medium">Reason:</span> {w.reason}
              </p>
            )}
            {w.message && (
              <p className="text-sm text-amber-700 mt-0.5">{w.message}</p>
            )}
            {w.date && (
              <p className="text-xs text-amber-500 mt-1">
                {new Date(w.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleDismiss(w)}
            className="shrink-0 px-2.5 py-1 rounded-lg border border-amber-300 bg-white text-[11px] font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <XIcon className="w-3 h-3" />
              Dismiss
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
