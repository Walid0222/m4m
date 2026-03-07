/**
 * Legacy fetch-based API helpers. Kept for backward compatibility.
 * For new code, use the axios service: import { getProducts, login, ... } from '@/services/api'
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export { API_BASE };

export function getToken() {
  return localStorage.getItem('m4m_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('m4m_token', token);
  else localStorage.removeItem('m4m_token');
}

export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const token = getToken();
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function paginatedItems(resData) {
  const d = resData?.data;
  if (Array.isArray(d)) return d;
  return d?.data ?? [];
}

export default API_BASE;
