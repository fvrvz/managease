import { createSignal } from 'solid-js';
import { authApi } from '@/api/endpoints';
import { setToken, clearToken } from '@/api/client';
import type { User } from '@/types';

// ── Persisted state helpers (using sessionStorage for security) ──
const loadUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    let raw = window.sessionStorage.getItem('user');
    if (!raw) {
      // Migration: check legacy localStorage once, move to sessionStorage, and delete from localStorage
      const legacyRaw = window.localStorage.getItem('user');
      if (legacyRaw) {
        window.sessionStorage.setItem('user', legacyRaw);
        window.localStorage.removeItem('user');
        raw = legacyRaw;
      }
    }
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

const persistUser = (user: User | null): void => {
  if (typeof window === 'undefined') return;
  if (user) {
    window.sessionStorage.setItem('user', JSON.stringify(user));
    window.localStorage.removeItem('user');
  } else {
    window.sessionStorage.removeItem('user');
    window.localStorage.removeItem('user');
  }
};

// ── Signals ───────────────────────────────────
const [user, setUser] = createSignal<User | null>(loadUser());
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);

// ── Computed ──────────────────────────────────
export const isAuthenticated = () => user() !== null;

// ── Exported accessors ────────────────────────
export { user, loading as authLoading, error as authError };

// ── Actions ───────────────────────────────────
export const login = async (email: string, password: string): Promise<void> => {
  setLoading(true);
  setError(null);
  try {
    const res = await authApi.login(email, password);
    const data = res.data as Record<string, unknown>;
    const u: User = (data.user as User) || (data.data as User) || {
      id: '1',
      name: email.split('@')[0],
      email: email,
      role: 'admin',
      createdAt: new Date().toISOString(),
    };
    const t = (typeof data.token === 'string' ? data.token : null) ||
      ((data.tokens as Record<string, unknown>)?.accessToken as string);
    if (t) {
      setToken(t);
    }
    setUser(u);
    persistUser(u);
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
      ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      ?? 'Login failed. Please check your credentials.';
    setError(message);
    throw err;
  } finally {
    setLoading(false);
  }
};

export const register = async (name: string, email: string, password: string): Promise<void> => {
  setLoading(true);
  setError(null);
  try {
    const res = await authApi.register(name, email, password);
    const data = res.data as Record<string, unknown>;
    const u: User = (data.user as User) || (data.data as User) || {
      id: '1',
      name: name,
      email: email,
      role: 'admin',
      createdAt: new Date().toISOString(),
    };
    const t = (typeof data.token === 'string' ? data.token : null) ||
      ((data.tokens as Record<string, unknown>)?.accessToken as string);
    if (t) {
      setToken(t);
    }
    setUser(u);
    persistUser(u);
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
      ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      ?? 'Registration failed';
    setError(message);
    throw err;
  } finally {
    setLoading(false);
  }
};

export const logout = async (): Promise<void> => {
  try {
    await authApi.logout();
  } catch {
    // ignore
  } finally {
    clearToken();
    setUser(null);
    persistUser(null);
    window.location.href = '/login';
  }
};

export const setAuthUser = (u: User): void => {
  setUser(u);
  persistUser(u);
};
