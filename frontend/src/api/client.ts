import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types';
import { getRuntimeConfig } from '@/config/runtimeConfig';

// ── Create Axios instance ─────────────────────
export const apiClient: AxiosInstance = axios.create({
  baseURL: getRuntimeConfig().apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

// ── Token helpers (using sessionStorage for security) ──
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  let token = window.sessionStorage.getItem('access_token');
  if (!token) {
    // Migration fallback: check legacy localStorage once, move to sessionStorage, and delete from localStorage
    const legacyToken = window.localStorage.getItem('access_token');
    if (legacyToken) {
      window.sessionStorage.setItem('access_token', legacyToken);
      window.localStorage.removeItem('access_token');
      token = legacyToken;
    }
  }
  return token;
};

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem('access_token', token);
  window.localStorage.removeItem('access_token');
};

export const clearToken = (): void => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem('access_token');
  window.sessionStorage.removeItem('user');
  window.localStorage.removeItem('access_token');
  window.localStorage.removeItem('user');
};

// ── Request interceptor: dynamic runtime baseURL & attach Bearer token ──
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = getRuntimeConfig().apiBaseUrl;
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 and capture JWT from headers if present ──
apiClient.interceptors.response.use(
  (response) => {
    // 1. Capture token from JSON response body
    const dataObj = response.data && typeof response.data === 'object' ? (response.data as Record<string, unknown>) : null;
    const bodyToken = (typeof dataObj?.token === 'string' ? dataObj.token : null) ||
      (dataObj?.tokens && typeof dataObj.tokens === 'object' && typeof (dataObj.tokens as Record<string, unknown>).accessToken === 'string'
        ? ((dataObj.tokens as Record<string, unknown>).accessToken as string)
        : null);
    if (bodyToken) {
      setToken(bodyToken);
    }
    // 2. Devise-jwt returns Authorization header on login/register
    const headers = response.headers as Record<string, unknown>;
    const authHeader = headers?.['authorization'] || (typeof (headers as { get?: (k: string) => unknown })?.get === 'function' ? (headers as { get: (k: string) => unknown }).get('authorization') : null);
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      setToken(token);
    }
    return response;
  },
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
