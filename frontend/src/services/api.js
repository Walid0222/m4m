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

// Normalize errors and optionally handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
