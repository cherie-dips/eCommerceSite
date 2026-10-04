import axios from 'axios';

// Server address. Set VITE_API_URL in client/.env when the server runs somewhere else.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
// Base address for files the server hosts (e.g. uploaded design images).
export const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

// Turns a stored image path ("uploads/products/a.jpg") into a full address.
// Full URLs, data: and blob: addresses are returned unchanged.
export const assetUrl = (path) => {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${SERVER_URL}/${String(path).replace(/^\//, '')}`;
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

// Function to get token from localStorage
const getToken = () => {
  return localStorage.getItem('flagzen_token');
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiry
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Only treat 401 as "login expired" when we actually sent a login token.
    // (A wrong password on the login page is also a 401, but no token is sent there.)
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
      console.log('Login expired, clearing session');
      localStorage.removeItem('flagzen_token');
      localStorage.removeItem('flagzen_user');

      // Reload the page to trigger login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Pulls a readable message out of a failed request.
export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  const data = err?.response?.data;
  if (typeof data === 'string' && data) return data;
  return data?.error || data?.message || fallback;
};

export default api;
