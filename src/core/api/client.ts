import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { clearSession, getAccessToken, getRefreshToken, loadSession, saveSession } from '@/services/tokenStorage';

const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
let normalizedBase = '/api';
if (rawBaseUrl) {
  normalizedBase = rawBaseUrl.replace(/\/+$/, '');
  if (!normalizedBase.endsWith('/api') && normalizedBase.startsWith('http')) {
    normalizedBase = `${normalizedBase}/api`;
  }
}

export const BASE_URL = normalizedBase;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT Bearer Token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Response Interceptor: Handle Global Errors & Auth Expiration with Silent Refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError<{ success?: boolean; code?: string; message?: string; data?: unknown }>) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;
    const url = originalRequest?.url || '';

    const isExcluded =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/google') ||
      url.includes('/auth/send-otp') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');

    if (error.response?.status === 401 && !isExcluded && !originalRequest?._retry) {
      const currentRefreshToken = getRefreshToken();
      if (currentRefreshToken) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers && token) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken: currentRefreshToken,
          });

          const data = res.data?.data;
          const newAccessToken = data?.accessToken;
          const newRefreshToken = data?.refreshToken;

          if (!newAccessToken) {
            throw new Error('Missing new access token in refresh response');
          }

          const currentSession = loadSession() || {};
          saveSession({
            ...currentSession,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken || currentRefreshToken,
          });

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          processQueue(null, newAccessToken);
          isRefreshing = false;

          return apiClient(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          isRefreshing = false;
          clearSession();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          }
          return Promise.reject(refreshErr);
        }
      }

      clearSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
