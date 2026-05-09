import axios from 'axios';
import { useAuthStore } from '../context/authStore';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  'https://privachat-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState()?.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const currentPath = window.location.pathname;

    if (status === 401 && currentPath !== '/login') {
      useAuthStore.getState()?.logout?.();
      window.location.replace('/login');
    }

    return Promise.reject(error);
  }
);

export default api;
