import axios, { AxiosError, AxiosResponse } from 'axios';
import { clearSession, getAccessToken } from '@/services/tokenStorage';

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

// Response Interceptor: Handle Global Errors & Auth Expiration
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError<{ success?: boolean; code?: string; message?: string; data?: unknown }>) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      clearSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
