import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { Status } from './format';

const STORAGE_API_KEY = '@tixify_custom_api_url';

const normalizeApiBaseUrl = (value: string) => {
  const baseUrl = value.trim().replace(/\/+$/, '');
  if (!baseUrl || baseUrl.endsWith('/api')) return baseUrl;
  return `${baseUrl}/api`;
};

export const getDefaultApiUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return normalizeApiBaseUrl(configuredUrl);
  }

  // On Expo Go/dev builds, the dev-server host is reachable by devices on the same Wi-Fi.
  const expoHostUri = Constants.expoConfig?.hostUri ?? Constants.platform?.hostUri;
  if (Platform.OS !== 'web' && expoHostUri) {
    try {
      const hostUri = expoHostUri;
      const host = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname;
      if (host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.expo.dev')) {
        return `http://${host}:4000/api`;
      }
    } catch {
      // Fall back to the platform-specific development address.
    }
  }

  // In Expo web running on another device, localhost would refer to that device itself.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:4000/api`;
    }
  }

  // Android Emulator uses 10.0.2.2 to access host machine localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api';
  }
  return 'http://localhost:4000/api';
};

let cachedApiUrl: string | null = null;

export async function getApiBaseUrl(): Promise<string> {
  const current = cachedApiUrl;
  if (current) return current;
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const configuredBaseUrl = configuredUrl ? normalizeApiBaseUrl(configuredUrl) : '';
  try {
    const saved = await AsyncStorage.getItem(STORAGE_API_KEY);
    if (saved && saved.trim()) {
      const savedBaseUrl = normalizeApiBaseUrl(saved);
      const savedIsLoopback = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?(?:\/|$)/i.test(savedBaseUrl);
      cachedApiUrl = configuredBaseUrl && savedIsLoopback ? configuredBaseUrl : savedBaseUrl;
      if (cachedApiUrl !== saved.trim().replace(/\/+$/, '')) {
        await AsyncStorage.setItem(STORAGE_API_KEY, cachedApiUrl);
      }
      return cachedApiUrl;
    }
  } catch {
    // fallback
  }
  const fallback = getDefaultApiUrl();
  cachedApiUrl = fallback;
  return fallback;
}

export async function setCustomApiUrl(url: string): Promise<void> {
  const normalized = normalizeApiBaseUrl(url);
  cachedApiUrl = normalized || getDefaultApiUrl();
  if (!normalized || normalized === getDefaultApiUrl()) {
    await AsyncStorage.removeItem(STORAGE_API_KEY);
  } else {
    await AsyncStorage.setItem(STORAGE_API_KEY, normalized);
  }
}

export type EventItem = {
  id: string;
  name: string;
  venue: string | null;
  event_date: string;
  price: number;
  stock: number;
  description: string | null;
};

export type Order = {
  id: string;
  code: string;
  event_id: string;
  buyer_name: string;
  buyer_email: string;
  qty: number;
  total: number;
  status: Status;
  created_at: string;
  events?: { name: string; venue?: string; event_date?: string } | null;
};

export type OrderLookup = {
  id?: string;
  code: string;
  event_name: string;
  venue?: string;
  event_date?: string;
  buyer_name: string;
  buyer_email?: string;
  qty: number;
  total: number;
  status: Status;
  created_at?: string;
  tickets?: { code: string; status: 'valid' | 'used'; used_at: string | null }[];
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
};

export type AuthResponse = {
  message?: string;
  session: AuthSession | null;
  user: AuthUser | null;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = (await getApiBaseUrl()).replace(/\/+$/, '');
  const url = `${baseUrl}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });

    const body = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(res.status, body?.error ?? 'Terjadi kesalahan pada server');
    }
    return body as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Waktu koneksi ke backend habis (${url}). Periksa URL server dan jaringan perangkat.`);
    }
    throw new Error(
      `Gagal terhubung ke backend (${url}). Pastikan backend aktif dan perangkat berada di jaringan yang sama.`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export const mobileApi = {
  health: () => request<{ ok: boolean }>('/health'),
  events: () => request<EventItem[]>('/events'),
  register: (payload: { name: string; email: string; password: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/auth/mobile/login', { method: 'POST', body: JSON.stringify(payload) }),
  
  createOrder: (payload: { event_id: string; buyer_name: string; buyer_email: string; qty: number }) =>
    request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  lookup: (code: string) =>
    request<OrderLookup>(`/orders/lookup/${encodeURIComponent(code.trim().toUpperCase())}`),

  payOrder: (code: string) =>
    request<{ message: string; order: Order }>(`/orders/${encodeURIComponent(code.trim().toUpperCase())}/pay`, {
      method: 'POST',
    }),
};
