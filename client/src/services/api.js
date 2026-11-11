import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';
export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || '/gateway';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

function getToken() {
  try {
    return localStorage.getItem('devapi_token');
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let queued = [];

function flushQueue(err, token) {
  queued.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  queued = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config;
    const status = error.response?.status;
    const url = original?.url || '';
    const isAuthCall = url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/register');
    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      if (isRefreshing) {
        try {
          const token = await new Promise((resolve, reject) => {
            queued.push({ resolve, reject });
          });
          if (token) {
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${token}`;
          }
          return api(original);
        } catch (qErr) {
          return Promise.reject(qErr);
        }
      }
      isRefreshing = true;
      try {
        const r = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        const token = r.data?.data?.accessToken || r.data?.accessToken || r.data?.token;
        if (token) {
          try { localStorage.setItem('devapi_token', token); } catch {}
        }
        flushQueue(null, token);
        if (token) {
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${token}`;
        }
        return api(original);
      } catch (e) {
        flushQueue(e, null);
        try {
          localStorage.removeItem('devapi_token');
          localStorage.removeItem('devapi_user');
        } catch {}
        const path = window.location.pathname || '';
        if (!path.startsWith('/login') && !path.startsWith('/register')) {
          window.dispatchEvent(new CustomEvent('devapi:unauthorized'));
        }
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export function extractError(err, fallback = 'Something went wrong') {
  const d = err?.response?.data;
  // Always surface full error in browser console — never hide it
  if (d || err?.message) {
    // eslint-disable-next-line no-console
    console.error('[API error]', err?.config?.method?.toUpperCase?.(), err?.config?.url, d || err?.message);
  }
  if (!d) return err?.message || fallback;
  if (typeof d === 'string') return d;
  const base = d.message || d.error || fallback;
  const code = d.errorCode ? ` (${d.errorCode})` : '';
  const details = d.details
    ? `: ${typeof d.details === 'string' ? d.details : JSON.stringify(d.details)}`
    : d.errors
      ? `: ${JSON.stringify(d.errors)}`
      : '';
  return `${base}${code}${details}`;
}

export default api;
