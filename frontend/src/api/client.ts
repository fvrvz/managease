import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types';

// ── Base URL from env ─────────────────────────
const RAW_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const BASE_URL = RAW_URL.replace(/\/+$/, '');

// ── Create Axios instance ─────────────────────
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

// ── Token helpers ─────────────────────────────
export const getToken = (): string | null => localStorage.getItem('access_token');

export const setToken = (token: string): void => {
  localStorage.setItem('access_token', token);
};

export const clearToken = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};

// ── Request interceptor: attach Bearer token ──
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
