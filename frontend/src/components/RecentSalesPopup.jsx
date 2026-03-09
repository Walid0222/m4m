import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const PRODUCTS = [
  'Fortnite 10000 V-Bucks',
  'IPTV 6 Months',
  'Spotify Premium',
  'Netflix 4K 1 Profile',
  'Canva Pro',
  'Instagram Followers',
  'Instagram Badge',
];

function getRandomProduct() {
  const idx = Math.floor(Math.random() * PRODUCTS.length);
  return PRODUCTS[idx];
}

function getRandomMinutesAgo() {
  // 1–5 minutes ago
  return Math.floor(Math.random() * 5) + 1;
}

export default function RecentSalesPopup() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [productName, setProductName] = useState('');
  const [minutesAgo, setMinutesAgo] = useState(2);

  useEffect(() => {
    let hideTimeout;
    let nextTimeout;

    function showOnce() {
      setProductName(getRandomProduct());
      setMinutesAgo(getRandomMinutesAgo());
      setVisible(true);

      // Hide after 4 seconds
      hideTimeout = setTimeout(() => {
        setVisible(false);
      }, 4000);

      // Schedule next popup after total 12 seconds (4s visible + 8s gap)
      nextTimeout = setTimeout(() => {
        showOnce();
      }, 12000);
    }

    // Only run if a buyer with notifications enabled is logged in
    const isBuyer = user && !user.is_admin && !user.is_seller;
    const wantsNotifications =
      user?.show_recent_sales_notifications !== false;

    if (isBuyer && wantsNotifications) {
      showOnce();
    }

    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      if (nextTimeout) clearTimeout(nextTimeout);
    };
  }, [user]);

  const isBuyer = user && !user.is_admin && !user.is_seller;
  const wantsNotifications =
    user?.show_recent_sales_notifications !== false;

  if (!user || !isBuyer || !wantsNotifications || !visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 pointer-events-none"
      aria-live="polite"
    >
      <div className="pointer-events-auto max-w-xs sm:max-w-sm w-[calc(100vw-2rem)] sm:w-auto rounded-2xl bg-white shadow-xl border border-gray-200 px-4 py-3 flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-m4m-purple/10 flex items-center justify-center text-lg">
          <span role="img" aria-label="Recent purchase">
            🛒
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-900 mb-0.5">Recent purchase</p>
          <p className="text-sm font-medium text-gray-800 truncate">{productName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{minutesAgo} minute{minutesAgo !== 1 ? 's' : ''} ago</p>
        </div>
      </div>
    </div>
  );
}

