import { useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import ScrollManager from './ScrollManager';
import Navbar from './Navbar';
import Footer from './Footer';
import RecentSalesPopup from './RecentSalesPopup';
import AnnouncementBanner from './AnnouncementBanner';
import EmailVerificationBanner from './EmailVerificationBanner';
import AdminWarningBanner from './AdminWarningBanner';

export default function Layout() {
  const location = useLocation();

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const code = params.get('ref');
      if (!code) return;

      const normalized = String(code).trim().toUpperCase();
      if (!normalized) return;

      const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
      localStorage.setItem('m4m_referral_code', normalized);
      localStorage.setItem('m4m_referral_expiry', String(expiry));
    } catch {
      // ignore (localStorage errors)
    }
  }, [location.search]);

  return (
    <div className="min-h-screen bg-m4m-gray-50 flex flex-col">
      <ScrollManager />
      <div className="sticky top-0 z-[60] w-full bg-white shadow-sm">
        <AnnouncementBanner />
        <EmailVerificationBanner />
        <Navbar />
      </div>
      <AdminWarningBanner />
      <main className="flex-1 animate-pageFade">
        <Outlet />
      </main>
      <Footer />
      <RecentSalesPopup />
    </div>
  );
}
