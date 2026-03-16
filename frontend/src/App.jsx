import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute, SellerRoute, AdminRoute } from './contexts/AuthContext';
import { MarketplaceSettingsProvider } from './contexts/MarketplaceSettingsContext';
import { RefreshProvider } from './contexts/RefreshContext';
import Layout from './components/Layout';
import ChatLayout from './layouts/ChatLayout';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import ServicePage from './pages/ServicePage';
import OfferTypePage from './pages/OfferTypePage';
import SellerProfilePage from './pages/SellerProfilePage';
import WalletPage from './pages/WalletPage';
import OrdersPage from './pages/OrdersPage';
import ChatPage from './pages/ChatPage';
import AuthPage from './pages/AuthPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SellerDashboardPage from './pages/SellerDashboardPage';
import OrderDetailPage from './pages/OrderDetailPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import UserProfilePage from './pages/UserProfilePage';
import SettingsPage from './pages/SettingsPage';
import FavoritesPage from './pages/FavoritesPage';
import RecentlyViewedPage from './pages/RecentlyViewedPage';
import DisputesPage from './pages/DisputesPage';
import SellerDisputesPage from './pages/SellerDisputesPage';
import DisputeDetailPage from './pages/DisputeDetailPage';
import HelpPage from './pages/HelpPage';
import MarketplaceRulesPage from './pages/MarketplaceRulesPage';
import ReviewReminderPopup from './components/ReviewReminderPopup';

export default function App() {
  return (
    <AuthProvider>
      <MarketplaceSettingsProvider>
        <RefreshProvider>
          <BrowserRouter>
            <ReviewReminderPopup />
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="service/:slug" element={<ServicePage />} />
                <Route path="offer-type/:slug" element={<OfferTypePage />} />
                <Route path="product/:id" element={<ProductPage />} />
                <Route path="seller/:id" element={<SellerProfilePage />} />
                <Route path="login" element={<AuthPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />

                {/* Protected routes: require login */}
                <Route
                  path="profile"
                  element={
                    <ProtectedRoute>
                      <UserProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="wallet"
                  element={
                    <ProtectedRoute>
                      <WalletPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="orders"
                  element={
                    <ProtectedRoute>
                      <OrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="orders/:id"
                  element={
                    <ProtectedRoute>
                      <OrderDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="seller-dashboard"
                  element={
                    <SellerRoute>
                      <SellerDashboardPage />
                    </SellerRoute>
                  }
                />
                <Route
                  path="seller-disputes"
                  element={
                    <SellerRoute>
                      <SellerDisputesPage />
                    </SellerRoute>
                  }
                />
                <Route
                  path="admin"
                  element={
                    <AdminRoute>
                      <AdminDashboardPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="favorites"
                  element={
                    <ProtectedRoute>
                      <FavoritesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="disputes"
                  element={
                    <ProtectedRoute>
                      <DisputesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="disputes/:id"
                  element={
                    <ProtectedRoute>
                      <DisputeDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="help/:slug" element={<HelpPage />} />
                <Route path="help" element={<Navigate to="/help/faq" replace />} />
                <Route path="marketplace" element={<HomePage />} />
                <Route path="recently-viewed" element={<RecentlyViewedPage />} />
                <Route path="auth" element={<AuthPage />} />
                <Route path="marketplace-rules" element={<MarketplaceRulesPage />} />
              </Route>

              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ChatPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </RefreshProvider>
      </MarketplaceSettingsProvider>
    </AuthProvider>
  );
}
