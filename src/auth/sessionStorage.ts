import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../api/types';

const SESSION_KEY = '@dividsplit/session';

export type PersistedSession = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export async function saveSession(session: PersistedSession): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Best-effort — a failed write just means the next launch starts logged out.
  }
}

export async function loadSession(): Promise<PersistedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PersistedSession) : null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
