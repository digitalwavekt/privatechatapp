import axios from 'axios';
import { useAuthStore } from '../context/authStore';

const API_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;

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
    const originalRequest = error.config;

    const publicRoutes = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh-token',
    ];

    const isPublicRoute = publicRoutes.some((route) =>
      originalRequest?.url?.includes(route)
    );

    // Login/register ke 401/403 errors ko refresh-token flow me mat bhejo
    if (isPublicRoute) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${API_URL}/auth/refresh-token`,
          { refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const accessToken = response.data.accessToken || response.data.token;
        const newRefreshToken = response.data.refreshToken || refreshToken;

        useAuthStore.getState().setAuth(
          useAuthStore.getState().user,
          accessToken,
          newRefreshToken
        );

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;