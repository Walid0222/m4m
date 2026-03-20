import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

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

const ANIM_DURATION_MS = 300;

export default function RecentSalesPopup() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const isProductPage = pathname.startsWith('/product/');
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [productName, setProductName] = useState('');
  const [minutesAgo, setMinutesAgo] = useState(2);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setEntered(false);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setEntered(false);
      const timer = setTimeout(() => setMounted(false), ANIM_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [visible]);

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

  if (!user || !isBuyer || !wantsNotifications || !mounted) return null;

  return (
    <div
      className={`fixed ${
        isProductPage
          ? 'bottom-24 left-4'
          : 'bottom-4 left-4 sm:bottom-6 sm:left-6'
      } lg:bottom-6 z-40 pointer-events-none`}
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto max-w-xs sm:max-w-sm w-[calc(100vw-2rem)] sm:w-auto rounded-2xl bg-white shadow-xl border border-gray-200 px-4 py-3 flex items-start gap-3 transition-all duration-300 ease-out ${
          entered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
        }`}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-m4m-purple/10 flex items-center justify-center text-lg">
          <ShoppingCart className="w-4 h-4 text-m4m-purple" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-900 mb-0.5">{t('product.recent_purchase')}</p>
          <p className="text-sm font-medium text-gray-800 truncate">{productName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{minutesAgo} {t('product.minutes_ago')}</p>
        </div>
      </div>
    </div>
  );
}

