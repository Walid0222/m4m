import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute, SellerRoute, AdminRoute } from './contexts/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import SellerProfilePage from './pages/SellerProfilePage';
import WalletPage from './pages/WalletPage';
import OrdersPage from './pages/OrdersPage';
import ChatPage from './pages/ChatPage';
import AuthPage from './pages/AuthPage';
import SellerDashboardPage from './pages/SellerDashboardPage';
import OrderDetailPage from './pages/OrderDetailPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import UserProfilePage from './pages/UserProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import DisputesPage from './pages/DisputesPage';
import HelpPage from './pages/HelpPage';
import MarketplaceRulesPage from './pages/MarketplaceRulesPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="product/:id" element={<ProductPage />} />
            <Route path="seller/:id" element={<SellerProfilePage />} />
            <Route path="login" element={<AuthPage />} />

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
              path="chat"
              element={
                <ProtectedRoute>
                  <ChatPage />
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
          </Route>
          {/* Help center — public pages */}
          <Route path="/help/:slug" element={<Layout><HelpPage /></Layout>} />
          <Route path="/help" element={<Navigate to="/help/faq" replace />} />
          {/* Marketplace rules standalone page */}
          <Route path="/marketplace-rules" element={<Layout><MarketplaceRulesPage /></Layout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
