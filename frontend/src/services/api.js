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

// Attach auth token to every request when present
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
    const data = res.data?.data;
    if (data?.token) setToken(data.token);
    return res.data;
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
      const data = res.data?.data;
      if (data?.token) setToken(data.token);
      return res.data;
    });
}

export function getMe() {
  return api.get('/me').then(unwrap);
}

export function logout() {
  return api.post('/logout').then(() => setToken(null));
}

// --- Products ---

export function getProducts(params = {}) {
  return api.get('/products', { params }).then(unwrap);
}

export function getProduct(id) {
  return api.get(`/products/${id}`).then(unwrap);
}

export function getSellerProfile(id) {
  return api.get(`/sellers/${id}`).then(unwrap);
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

export function createOrder(items) {
  return api.post('/orders', { items }).then(unwrap);
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

export function createWithdrawRequest({ amount, currency = 'USD', payment_details }) {
  return api.post('/withdraw-requests', { amount, currency, payment_details }).then(unwrap);
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

export function verifyAdminWithdraw(withdrawId, action) {
  return api.patch(`/admin/withdraw-requests/${withdrawId}/verify`, { action }).then(() => {});
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
