import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { setAuthToken, setOnUnauthorized } from '../api/client';

const STORAGE_KEY = 'car-auth';
const AuthContext = createContext(null);

// Token + user survive a page reload. localStorage can throw (private mode),
// so failures just mean "not logged in".
function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

function saveSession(session) {
  try {
    if (session.token) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const s = loadSession();
    setAuthToken(s.token); // set before the first render so the first requests are authenticated
    return s;
  });

  const applySession = useCallback((next) => {
    setAuthToken(next.token);
    saveSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => applySession({ token: null, user: null }), [applySession]);

  // Any 401 on an authenticated request (token expired or tampered) → log out.
  // ProtectedRoute then redirects to /login, which shows `notice`.
  useEffect(() => {
    setOnUnauthorized(() =>
      applySession({ token: null, user: null, notice: 'Your session has expired. Please log in again.' }),
    );
    return () => setOnUnauthorized(null);
  }, [applySession]);

  // Confirm a stored token is still valid on first load (/auth/me).
  useEffect(() => {
    if (!session.token) return;
    authApi
      .getMe()
      .then((user) => applySession({ token: session.token, user }))
      .catch(() => {}); // a 401 is already handled by onUnauthorized
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email, password) => applySession(await authApi.login(email, password)),
    [applySession],
  );

  const register = useCallback(
    async (name, email, password) => applySession(await authApi.register(name, email, password)),
    [applySession],
  );

  const value = useMemo(
    () => ({ user: session.user, token: session.token, notice: session.notice, login, register, logout }),
    [session, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
