import axios from 'axios';

/**
 * Base URL for the Laravel API.
 * Use VITE_API_BASE_URL in .env for proxy (e.g. /api/v1) or direct backend URL.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const TOKEN_KEY = 'm4m_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Attach auth token to every request when present; allow FormData to set Content-Type (multipart boundary)
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Normalize errors and handle 401/403-banned responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null);
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    // If server responds 403 and indicates a ban, force logout with reason
    if (error.response?.status === 403) {
      const data = error.response.data ?? {};
      const banType = data.ban_type;
      if (banType === 'permanent' || banType === 'temporary') {
        setToken(null);
        window.dispatchEvent(new CustomEvent('auth:banned', {
          detail: {
            ban_type: banType,
            ban_reason: data.ban_reason ?? null,
            banned_until: data.banned_until ?? null,
            message: data.message ?? 'Your account has been suspended by M4M administration.',
          },
        }));
      }
    }

    const message = error.response?.data?.message || error.message || 'Request failed';
    const err = new Error(message);
    err.status = error.response?.status;
    err.data = error.response?.data;
    throw err;
  }
);

/**
 * Unwrap Laravel API response: { success, message, data } -> data
 */
function unwrap(res) {
  return res.data?.data !== undefined ? res.data.data : res.data;
}

// --- Auth ---

export function login(email, password) {
  return api.post('/login', { email, password }).then((res) => {
    const payload = res.data?.data !== undefined ? res.data.data : res.data;
    if (payload?.token) setToken(payload.token);
    return payload;
  });
}

export function register(body) {
  const { name, email, password, password_confirmation, is_seller } = body;
  return api
    .post('/register', {
      name,
      email,
      password,
      password_confirmation: password_confirmation ?? password,
      is_seller: is_seller ?? false,
    })
    .then((res) => {
      const payload = res.data?.data !== undefined ? res.data.data : res.data;
      if (payload?.token) setToken(payload.token);
      return payload;
    });
}

export function login2fa(userId, code) {
  return api.post('/login/2fa', { user_id: userId, code }).then((res) => {
    const payload = res.data?.data !== undefined ? res.data.data : res.data;
    if (payload?.token) setToken(payload.token);
    return payload;
  });
}

export function forgotPassword(email) {
  return api.post('/forgot-password', { email }).then((res) => res.data);
}

export function resetPassword(body) {
  return api.post('/reset-password', body).then((res) => res.data);
}

export function enable2FA() {
  return api.post('/security/2fa/enable').then(unwrap);
}

export function confirm2FA(code) {
  return api.post('/security/2fa/confirm', { code }).then(unwrap);
}

export function disable2FA({ password, code }) {
  return api.post('/security/2fa/disable', { password, code }).then(unwrap);
}

export function getMe() {
  return api.get('/me').then(unwrap);
}

export function getWalletSettings() {
  return api.get('/wallet/settings').then(unwrap);
}

/** Fetch site/marketplace settings (optional; backend may not expose this). */
export function getSettings() {
  return api.get('/settings').then(unwrap).catch(() => null);
}

export function updateMe(body) {
  return api.patch('/me', body).then(unwrap);
}

/** Upload profile avatar (FormData). Returns updated user with avatar URL. */
export function uploadProfileAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  return api.post('/me/avatar', formData, {
    headers: {
      'Content-Type': false, // remove default so browser sets multipart/form-data with boundary
    },
  }).then((res) => {
    const data = res.data?.data !== undefined ? res.data.data : res.data;
    return data?.user ?? data;
  }).catch((err) => {
    throw err.response?.data?.message || err.message || err;
  });
}

export function logout() {
  return api.post('/logout').then(() => setToken(null));
}

// --- Products ---

export function getProducts(params = {}) {
  return api.get('/products', { params }).then(unwrap);
}

export function getTrendingProducts(params = {}) {
  return api.get('/products/trending', { params }).then(unwrap);
}

export function getBestSellingProducts(params = {}) {
  return api.get('/products/best-selling', { params }).then(unwrap);
}

export function getProduct(id, params = {}) {
  return api.get(`/products/${id}`, { params }).then(unwrap);
}

export function getRecommendedProducts(id, params = {}) {
  return api.get(`/products/${id}/recommended`, { params }).then(unwrap);
}

export function getSellerProfile(id) {
  return api.get(`/sellers/${id}`).then(unwrap);
}

export function getPublicSellerStats(id) {
  return api.get(`/sellers/${id}/stats`).then(unwrap);
}

export function createReview(productId, { order_id, rating, comment }) {
  return api.post(`/products/${productId}/reviews`, { order_id, rating, comment }).then((res) => {
    const data = res.data?.data !== undefined ? res.data.data : res.data;
    return data;
  });
}

export function getMyProducts(params = {}) {
  return api.get('/my-products', { params }).then(unwrap);
}

export function createProduct(body) {
  return api.post('/my-products', body).then((res) => {
    const data = res.data?.data !== undefined ? res.data.data : res.data;
    return data;
  });
}

export function updateProduct(id, body) {
  return api.patch(`/my-products/${id}`, body).then((res) => {
    const data = res.data?.data !== undefined ? res.data.data : res.data;
    return data;
  });
}

export function deleteProduct(id) {
  return api.delete(`/my-products/${id}`).then(() => {});
}

/** Pin a product as featured (seller only). Unpins others first. */
export function pinProduct(productId) {
  return api.post(`/products/${productId}/pin`).then(unwrap);
}

export function createOrder(items, couponCode, buyerNote) {
  const body = { items };
  if (couponCode) body.coupon_code = couponCode;
  if (buyerNote != null && buyerNote !== '') body.buyer_note = buyerNote;
  return api.post('/orders', body).then(unwrap);
}

export function getOrders(params = {}) {
  return api.get('/orders', { params }).then(unwrap);
}

export function getOrder(id) {
  return api.get(`/orders/${id}`).then(unwrap);
}

export function confirmOrderDelivery(orderId) {
  return api.patch(`/orders/${orderId}/confirm-delivery`).then(unwrap);
}

export function getSellerOrders(params = {}) {
  return api.get('/seller/orders', { params }).then(unwrap);
}

export function updateSellerOrderStatus(orderId, body) {
  return api.patch(`/seller/orders/${orderId}/status`, body).then(unwrap);
}

/** Toggle vacation mode for the authenticated seller. */
export function toggleVacationMode() {
  return api.post('/seller/vacation-mode').then(unwrap);
}

/** Seller updates their note on an order. */
export function updateSellerOrderNote(orderId, sellerNote) {
  return api.patch(`/seller/orders/${orderId}/note`, { seller_note: sellerNote ?? '' }).then(unwrap);
}

/** Seller sends manual delivery credentials — marks order as delivered. */
export function deliverOrder(orderId, deliveryContent) {
  return api.post(`/seller/orders/${orderId}/deliver`, { delivery_content: deliveryContent }).then(unwrap);
}

/** Seller adds account stock lines to an instant-delivery product. */
export function addProductAccounts(productId, accountsText) {
  return api.post(`/seller/products/${productId}/accounts`, { accounts: accountsText }).then(unwrap);
}

/** Seller lists account stock for a product. */
export function getProductAccounts(productId, params = {}) {
  return api.get(`/seller/products/${productId}/accounts`, { params }).then(unwrap);
}

/** Seller moderation status (for dashboard warning banner). */
export function getSellerModerationStatus() {
  return api.get('/seller/moderation-status').then(unwrap);
}

/** Admin warnings issued to the authenticated seller. */
export function getSellerWarnings() {
  return api.get('/seller/warnings').then(unwrap);
}

export function dismissSellerWarning(id) {
  return api.post(`/seller/warnings/${id}/dismiss`).then(unwrap);
}

/** Seller verification request status. */
export function getSellerVerification() {
  return api.get('/seller/verification-request').then(unwrap);
}

/** Submit seller verification request. */
export function submitSellerVerification(body) {
  return api.post('/seller/verification-request', body).then(unwrap);
}

// --- Wallet ---

export function getWallet() {
  return api.get('/wallet').then(unwrap);
}

export function getWalletTransactions(page = 1) {
  return api.get(`/wallet/transactions?page=${page}`).then(unwrap);
}

export function getDepositRequests(params = {}) {
  return api.get('/deposit-requests', { params }).then(unwrap);
}

export function getWithdrawRequests(params = {}) {
  return api.get('/withdraw-requests', { params }).then(unwrap);
}

export function createDepositRequest({ amount, currency = 'USD', payment_method } = {}) {
  return api.post('/deposit-requests', { amount, currency, payment_method }).then((res) => {
    const body = res.data;
    return body?.data ?? body;
  });
}

export function createWithdrawRequest({
  amount,
  currency = 'USD',
  payment_details,
  current_password,
  two_factor_code,
}) {
  const payload = {
    amount,
    currency,
    payment_details,
  };
  if (current_password) payload.current_password = current_password;
  if (two_factor_code) payload.two_factor_code = two_factor_code;
  return api.post('/withdraw-requests', payload).then(unwrap);
}

// --- Favorites ---

export function getFavorites(params = {}) {
  return api.get('/favorites', { params }).then(unwrap);
}

export function getFavoriteIds() {
  return api.get('/favorites/ids').then(unwrap);
}

export function toggleFavorite(productId) {
  return api.post(`/favorites/${productId}`).then(unwrap);
}

// --- Coupons (buyer-facing) ---

export function previewCoupon(code) {
  return api.post('/coupons/preview', { code }).then(unwrap);
}

export function removeFavorite(productId) {
  return api.delete(`/favorites/${productId}`).then(unwrap);
}

// --- Disputes ---

export function openDispute(body) {
  return api.post('/disputes', body).then(unwrap);
}

export function getDisputes(params = {}) {
  return api.get('/disputes', { params }).then(unwrap);
}

export function getDispute(id) {
  return api.get(`/disputes/${id}`).then(unwrap);
}

export function getDisputeActivities(disputeId) {
  return api.get(`/disputes/${disputeId}/activities`).then(unwrap);
}

export function getDisputeMessages(disputeId) {
  return api.get(`/disputes/${disputeId}/messages`).then(unwrap);
}

export function postDisputeMessage(disputeId, body) {
  return api.post(`/disputes/${disputeId}/messages`, body).then(unwrap);
}

export function getDisputeEvidence(disputeId) {
  return api.get(`/disputes/${disputeId}/evidence`).then(unwrap);
}

export function postDisputeEvidence(disputeId, formData) {
  return api.post(`/disputes/${disputeId}/evidence`, formData).then(unwrap);
}

/** Fetch evidence file as blob (for images/files). */
export function getDisputeEvidenceFile(disputeId, evidenceId) {
  return api.get(`/disputes/${disputeId}/evidence/${evidenceId}/file`, { responseType: 'blob' })
    .then((res) => res.data);
}

export function getAdminEscrow() {
  return api.get('/admin/escrow').then(unwrap);
}

export function adminReleaseOrderEscrow(orderId) {
  return api.post(`/admin/orders/${orderId}/release`).then(unwrap);
}

export function adminHoldOrderEscrow(orderId) {
  return api.post(`/admin/orders/${orderId}/hold`).then(unwrap);
}

export function adminRefundOrderEscrow(orderId) {
  return api.post(`/admin/orders/${orderId}/refund`).then(unwrap);
}

export function getAdminDisputes(params = {}) {
  return api.get('/admin/disputes', { params }).then(unwrap);
}

export function getAdminDispute(id) {
  return api.get(`/admin/disputes/${id}`).then(unwrap);
}

export function resolveAdminDispute(id, body) {
  return api.post(`/admin/disputes/${id}/resolve`, body).then(unwrap);
}

export function releaseAdminDispute(id, body) {
  return api.post(`/admin/disputes/${id}/release`, body).then(unwrap);
}

export function refundAdminDispute(id, body) {
  return api.post(`/admin/disputes/${id}/refund`, body).then(unwrap);
}

// --- Admin stats ---

export function getAdminStats() {
  return api.get('/admin/stats').then(unwrap);
}

// --- Admin coupons ---

export function getAdminCoupons() {
  return api.get('/admin/coupons').then(unwrap);
}

export function createAdminCoupon(body) {
  return api.post('/admin/coupons', body).then(unwrap);
}

export function deleteAdminCoupon(id) {
  return api.delete(`/admin/coupons/${id}`).then(() => {});
}

// --- Seller auto-reply ---

export function getSellerAutoReply() {
  return api.get('/seller/auto-reply').then(unwrap);
}

export function updateSellerAutoReply(message) {
  return api.put('/seller/auto-reply', { auto_reply_message: message }).then(unwrap);
}

// --- Seller escrow ---

export function getSellerEscrow() {
  return api.get('/seller/escrow').then(unwrap);
}

// --- Seller stats ---

export function getSellerStats() {
  return api.get('/stats/seller').then(unwrap);
}

export function getBuyerStats() {
  return api.get('/stats/buyer').then(unwrap);
}

// --- Categories & Offer Types (service catalog) ---

export function getCategories(params = {}) {
  return api.get('/categories', { params }).then(unwrap);
}

export function getMarketplaceStats() {
  return api.get('/marketplace/stats').then(unwrap);
}

export function getServices(params = {}) {
  return api.get('/services', { params }).then(unwrap);
}

export function getServiceBySlug(slug, params = {}) {
  return api.get(`/services/${encodeURIComponent(slug)}`, { params }).then(unwrap);
}

export function getOfferTypes(params = {}) {
  return api.get('/offer-types', { params }).then(unwrap);
}

export function searchOfferTypes(params = {}) {
  return api.get('/offer-types/search', { params }).then(unwrap);
}

export function getOfferTypeBySlug(slug, params = {}) {
  return api.get(`/offer-types/${encodeURIComponent(slug)}`, { params }).then(unwrap);
}

// --- Service requests (seller requests new offer types) ---

export function getMyServiceRequests(params = {}) {
  return api.get('/service-requests', { params }).then(unwrap);
}

export function createServiceRequest(body) {
  return api.post('/service-requests', body).then(unwrap);
}

// --- Admin: Service requests ---

export function getAdminServiceRequests(params = {}) {
  return api.get('/admin/service-requests', { params }).then(unwrap);
}

export function approveServiceRequest(id) {
  return api.post(`/admin/service-requests/${id}/approve`).then(unwrap);
}

export function rejectServiceRequest(id, body) {
  return api.post(`/admin/service-requests/${id}/reject`, body).then(unwrap);
}

export function updateAdminServiceRequest(id, body) {
  return api.patch(`/admin/service-requests/${id}`, body).then(unwrap);
}

export function deleteAdminServiceRequest(id) {
  return api.delete(`/admin/service-requests/${id}`).then(() => {});
}

// --- Admin: Services ---

export function getAdminServices(params = {}) {
  return api.get('/admin/services', { params }).then(unwrap);
}

export function createAdminService(body) {
  return api.post('/admin/services', body).then(unwrap);
}

export function updateAdminService(id, body) {
  return api.patch(`/admin/services/${id}`, body).then(unwrap);
}

export function deleteAdminService(id) {
  return api.delete(`/admin/services/${id}`).then(() => {});
}

// --- Admin: Offer types (service catalog) ---

export function getAdminOfferTypes(params = {}) {
  return api.get('/admin/offer-types', { params }).then(unwrap);
}

export function createAdminOfferType(body) {
  return api.post('/admin/offer-types', body).then(unwrap);
}

export function getAdminOfferType(id) {
  return api.get(`/admin/offer-types/${id}`).then(unwrap);
}

export function updateAdminOfferType(id, body) {
  return api.patch(`/admin/offer-types/${id}`, body).then(unwrap);
}

export function deleteAdminOfferType(id, params = {}) {
  return api.delete(`/admin/offer-types/${id}`, { params }).then(() => {});
}

// --- Announcements ---

export function getAnnouncements(params = {}) {
  return api.get('/announcements', { params }).then(unwrap);
}

// --- Admin announcements ---

export function getAdminAnnouncements(params = {}) {
  return api.get('/admin/announcements', { params }).then(unwrap);
}

export function createAdminAnnouncement(body) {
  return api.post('/admin/announcements', body).then(unwrap);
}

export function updateAdminAnnouncement(id, body) {
  return api.patch(`/admin/announcements/${id}`, body).then(unwrap);
}

export function deleteAdminAnnouncement(id) {
  return api.delete(`/admin/announcements/${id}`).then(() => {});
}

// --- Conversations & Messages ---

export function getConversations(params = {}) {
  return api.get('/conversations', { params }).then(unwrap);
}

export function getConversation(id, params = {}) {
  return api.get(`/conversations/${id}`, { params }).then(unwrap);
}

export function createConversation(body) {
  return api.post('/conversations', body).then(unwrap);
}

export function sendMessage(conversationId, body) {
  return api.post(`/conversations/${conversationId}/messages`, { body }).then(unwrap);
}

// --- Notifications ---

export function getNotifications() {
  return api.get('/notifications').then(unwrap);
}

export function markNotificationRead(id) {
  return api.patch(`/notifications/${id}/read`).then(() => {});
}

export function markAllNotificationsRead() {
  return api.post('/notifications/read-all').then(() => {});
}

// --- Admin ---

export function getAdminDepositRequests() {
  return api.get('/admin/deposit-requests').then(unwrap);
}

export function verifyAdminDeposit(depositId, action) {
  return api.patch(`/admin/deposit-requests/${depositId}/verify`, { action }).then(() => {});
}

export function getAdminWithdrawRequests() {
  return api.get('/admin/withdraw-requests').then(unwrap);
}

export function verifyAdminWithdraw(withdrawId, { action, receipt } = {}) {
  const formData = new FormData();
  formData.append('action', action);
  if (receipt) {
    formData.append('receipt', receipt);
  }
  return api
    .patch(`/admin/withdraw-requests/${withdrawId}/verify`, formData, {
      headers: {
        'Content-Type': false,
      },
    })
    .then(() => {});
}

// --- Reports (client-side store, submitted to /reports if backend exists) ---

export function submitReport({ type, target_id, target_name, reason, description, reporter }) {
  const payload = { type, target_id, target_name, reason, description };
  // Try real endpoint; fall back silently to localStorage store
  return api.post('/reports', payload).then(unwrap).catch(() => {
    const key = 'm4m_reports';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const report = {
      id: `local_${Date.now()}`,
      type,
      target_id,
      target_name: target_name || null,
      reason,
      description,
      reporter: reporter || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify([...existing, report]));
    return report;
  });
}

export function getAdminReports() {
  return api.get('/admin/reports').then(unwrap).catch(() => {
    const key = 'm4m_reports';
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    return { data: items };
  });
}

export function resolveAdminReport(reportId, action) {
  // Real backend: PATCH /admin/reports/{id} { action }
  return api.patch(`/admin/reports/${reportId}`, { action }).then(unwrap).catch(() => {
    const key = 'm4m_reports';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = existing.map((r) =>
      r.id === reportId ? { ...r, status: action === 'ignore' ? 'ignored' : 'resolved', admin_action: action } : r
    );
    localStorage.setItem(key, JSON.stringify(updated));
  });
}

// --- Seller verification (admin) ---

export function getAdminVerificationRequests(params = {}) {
  // Real backend endpoint: GET /admin/verification-requests
  return api.get('/admin/verification-requests', { params }).then(unwrap).catch(() => {
    // localStorage fallback for dev environments without a running backend
    const key = 'm4m_verif_requests';
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    return { data: items };
  });
}

export function resolveVerificationRequest(requestId, action) {
  // Real backend endpoint: PATCH /admin/verification-requests/{id} { action }
  return api.patch(`/admin/verification-requests/${requestId}`, { action }).then(unwrap).catch(() => {
    const key = 'm4m_verif_requests';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = existing.map((r) => r.id === requestId ? { ...r, status: action } : r);
    localStorage.setItem(key, JSON.stringify(updated));
  });
}

// --- Support chat (admin) ---

export function getAdminSupportConversations(params = {}) {
  return api.get('/admin/support-conversations', { params }).then(unwrap);
}

export function getAdminSupportMessages(conversationId) {
  return api.get(`/admin/support-conversations/${conversationId}/messages`).then(unwrap);
}

export function sendAdminSupportReply(conversationId, body) {
  return api.post(`/admin/support-conversations/${conversationId}/reply`, { body }).then(unwrap);
}

// --- Support chat (user-facing) ---

export function getSupportConversation() {
  return api.get('/support/conversation').then(unwrap);
}

export function getSupportMessages() {
  return api.get('/support/messages').then(unwrap);
}

export function sendSupportMessage(body) {
  return api.post('/support/messages', { body }).then(unwrap);
}

/**
 * Helper: get items array from Laravel paginated response.
 */
export function paginatedItems(resData) {
  const d = resData?.data;
  if (Array.isArray(d)) return d;
  return d?.data ?? [];
}

export const API_BASE = BASE_URL;
export { api };
export default api;
