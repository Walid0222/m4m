import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import RecentSalesPopup from './RecentSalesPopup';
import AnnouncementBanner from './AnnouncementBanner';
import EmailVerificationBanner from './EmailVerificationBanner';
import AdminWarningBanner from './AdminWarningBanner';

export default function Layout() {
  return (
    <div className="min-h-screen bg-m4m-gray-50 flex flex-col">
      <AnnouncementBanner />
      <EmailVerificationBanner />
      <Navbar />
      <AdminWarningBanner />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <RecentSalesPopup />
    </div>
  );
}
