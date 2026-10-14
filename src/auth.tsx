import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  api,
  ApiError,
  ensureFreshSession,
  getToken,
  loadStored,
  Me,
  revokeSession,
  SessionTokens,
  setSession,
  setSessionEndedHandler,
  User,
} from './api';
import { registerForPush, unregisterForPush } from './push';

type AuthState = {
  ready: boolean;
  token: string | null;
  user: User | null;
  me: Me | null;
  // Set when a saved session exists but the server could not be reached.
  bootError: string | null;
  retry: () => Promise<void>;
  login: (session: SessionTokens, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const EMPTY_ME = { balance: 0, unreadNotifications: 0, pendingRequests: 0, walletBalance: 0, pendingMoneyIn: 0, soldQty: 0, receivedQty: 0, sentQty: 0, soldAmount: 0, kitPrice: 0, sellDeadline: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTok] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const loggedIn = useRef(false);

  // Clear local state only (server already ended the session).
  const clear = useCallback(async () => {
    loggedIn.current = false;
    setBootError(null);
    await setSession(null);
    setTok(null);
    setMe(null);
  }, []);

  // User tapped "Sign out": forget this device's push token, then revoke the refresh token.
  const logout = useCallback(async () => {
    await unregisterForPush();
    await revokeSession();
    await clear();
  }, [clear]);

  const refreshMe = useCallback(async () => {
    if (!loggedIn.current) return;
    try {
      setMe(await api.get<Me>('/me'));
      setTok(getToken());
      setBootError(null);
    } catch {
      // Network errors keep the last value; an ended session is handled by the session-ended handler.
    }
  }, []);

  // Load the profile for a saved session; report instead of hanging if the server is down.
  const retry = useCallback(async () => {
    if (!loggedIn.current) return;
    setBootError(null);
    try {
      await ensureFreshSession();
      if (!loggedIn.current) return;
      setMe(await api.get<Me>('/me', 8000));
      setTok(getToken());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return; // session ended -> cleared
      setBootError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    setSessionEndedHandler(() => void clear());
    (async () => {
      try {
        const { token: t } = await loadStored();
        if (t) {
          loggedIn.current = true;
          setTok(t);
          await retry();
          void registerForPush();
        }
      } catch {
        // Storage unavailable: start logged out.
      } finally {
        setReady(true);
      }
    })();
  }, [clear, retry]);

  // Renew the access token when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && loggedIn.current) ensureFreshSession().then(refreshMe).catch(() => {});
    });
    return () => sub.remove();
  }, [refreshMe]);

  // Poll for new notifications / balance while logged in.
  useEffect(() => {
    if (!token) return;
    const id = setInterval(refreshMe, 30000);
    return () => clearInterval(id);
  }, [token, refreshMe]);

  const login = useCallback(
    async (session: SessionTokens, user: User) => {
      await setSession(session);
      loggedIn.current = true;
      setMe({ user, ...EMPTY_ME });
      setTok(session.token);
      await refreshMe();
      void registerForPush();
    },
    [refreshMe]
  );

  return (
    <AuthContext.Provider value={{ ready, token, user: me?.user ?? null, me, bootError, retry, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
