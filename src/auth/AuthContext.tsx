import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { configureAuthClient } from '../api/client';
import { profileApi, toUser } from '../api/endpoints';
import { resetTo } from '../nav/navigation';
import { User } from '../api/types';
import { queryClient } from '../query/queryClient';
import { clearSession, loadSession, saveSession } from './sessionStorage';

type AuthContextValue = {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isRestoring: boolean;
  setAuth: (token: string, refreshToken: string, user: User) => void;
  updateUser: (user: User) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Read via refs inside configureAuthClient's hooks so they always see the
  // latest tokens/user rather than whatever was current when the effect ran.
  const refreshTokenRef = useRef(refreshToken);
  refreshTokenRef.current = refreshToken;
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    configureAuthClient({
      getRefreshToken: () => refreshTokenRef.current,
      onTokensRefreshed: (accessToken, newRefreshToken) => {
        setToken(accessToken);
        setRefreshToken(newRefreshToken);
        if (userRef.current) {
          saveSession({ accessToken, refreshToken: newRefreshToken, user: userRef.current });
        }
      },
      onSessionExpired: () => {
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        clearSession();
        queryClient.clear();
        resetTo('Login');
      },
    });
  }, []);

  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (session) {
        setToken(session.accessToken);
        setRefreshToken(session.refreshToken);
        setUser(session.user);

        // Refresh the user in the background; fetchWithAuth already retries
        // once after a transparent token refresh on 401 and calls
        // onSessionExpired if that also fails, so a rejection here needs no
        // extra handling — restore just stays optimistic either way.
        profileApi.me(session.accessToken).then(summary => {
          const freshUser = toUser(summary);
          setUser(freshUser);
          saveSession({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: freshUser });
        }, () => {});
      }
      setIsRestoring(false);
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      refreshToken,
      user,
      isRestoring,
      setAuth: (t, rt, u) => {
        setToken(t);
        setRefreshToken(rt);
        setUser(u);
        saveSession({ accessToken: t, refreshToken: rt, user: u });
      },
      updateUser: u => {
        setUser(u);
        if (token && refreshToken) saveSession({ accessToken: token, refreshToken, user: u });
      },
      signOut: () => {
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        clearSession();
        queryClient.clear();
      },
    }),
    [token, refreshToken, user, isRestoring],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
