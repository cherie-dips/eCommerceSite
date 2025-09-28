import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:5050/api',
  timeout: 10000,
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
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.log('Token expired, clearing session');
      localStorage.removeItem('flagzen_token');
      localStorage.removeItem('flagzen_user');
      localStorage.removeItem('flagzen_last_activity');
      localStorage.removeItem('flagzen_login_time');
      
      // Reload the page to trigger login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;