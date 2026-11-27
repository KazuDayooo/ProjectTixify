import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthSession, AuthUser } from './api';

const AUTH_SESSION_KEY = 'tixifyauthsession';

export type StoredAuth = {
  session: AuthSession;
  user: AuthUser;
};

const readStoredValue = (key: string) => Platform.OS === 'web'
  ? AsyncStorage.getItem(key)
  : SecureStore.getItemAsync(key);

const writeStoredValue = (key: string, value: string) => Platform.OS === 'web'
  ? AsyncStorage.setItem(key, value)
  : SecureStore.setItemAsync(key, value);

const removeStoredValue = (key: string) => Platform.OS === 'web'
  ? AsyncStorage.removeItem(key)
  : SecureStore.deleteItemAsync(key);

export async function saveAuth(session: AuthSession, user: AuthUser): Promise<void> {
  await writeStoredValue(AUTH_SESSION_KEY, JSON.stringify({ session, user } satisfies StoredAuth));
}

export async function getAuth(): Promise<StoredAuth | null> {
  try {
    const value = await readStoredValue(AUTH_SESSION_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as StoredAuth;
    if (!parsed.session?.access_token || !parsed.user?.id || !parsed.user?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearAuth(): Promise<void> {
  await removeStoredValue(AUTH_SESSION_KEY);
}
