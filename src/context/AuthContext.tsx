import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AuthUser, TenantRole, TurnosCustomClaims } from '../types';
import {
  areAuthUsersEqual,
  getTenantRoleFromClaims,
  loginWithEmail,
  logout as authLogout,
  onAuthChange,
  refreshCurrentUserClaims,
} from '../services/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  claims: TurnosCustomClaims;
  claimsRevision: number;
  isAuthenticated: boolean;
  isPlatformAdmin: boolean;
  isLoggingOut: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshClaims: () => Promise<AuthUser | null>;
  getTenantRole: (tenantId: string) => TenantRole | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [claimsRevision, setClaimsRevision] = useState<number>(0);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const loginInFlightRef = useRef<boolean>(false);
  const lastUserRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange(
      (currentUser) => {
        if (!areAuthUsersEqual(lastUserRef.current, currentUser)) {
          lastUserRef.current = currentUser;
          setUser(currentUser);
          setClaimsRevision((rev) => rev + 1);
        }
        if (!loginInFlightRef.current) {
          setLoading(false);
        }
      },
      {
        onAccountTransition: () => {
          lastUserRef.current = null;
          setUser(null);
          setLoading(true);
        },
      }
    );

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    loginInFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const loggedUser = await loginWithEmail(email, pass);
      lastUserRef.current = loggedUser;
      setUser(loggedUser);
      setClaimsRevision((rev) => rev + 1);
      return loggedUser;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido al iniciar sesión';
      setError(errorMessage);
      throw err;
    } finally {
      loginInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    setLoading(true);
    setError(null);
    lastUserRef.current = null;
    setUser(null);
    try {
      await authLogout();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cerrar sesión';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoggingOut(false);
      setLoading(false);
    }
  }, []);

  const refreshClaims = useCallback(async () => {
    try {
      const refreshedUser = await refreshCurrentUserClaims();
      lastUserRef.current = refreshedUser;
      setUser(refreshedUser);
      setClaimsRevision((rev) => rev + 1);
      return refreshedUser;
    } catch (err: unknown) {
      console.warn('[AuthContext] Error al refrescar claims:', err);
      return null;
    }
  }, []);

  const getTenantRole = useCallback(
    (tenantId: string): TenantRole | null => getTenantRoleFromClaims(user, tenantId),
    [user]
  );

  const claims = useMemo<TurnosCustomClaims>(
    () => ({
      platformAdmin: Boolean(user?.platformAdmin),
      tenants: user?.tenants ?? {},
    }),
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      claims,
      claimsRevision,
      isAuthenticated: Boolean(user),
      isPlatformAdmin: Boolean(user?.platformAdmin),
      isLoggingOut,
      loading,
      error,
      login,
      logout,
      refreshClaims,
      getTenantRole,
    }),
    [
      user,
      claims,
      claimsRevision,
      isLoggingOut,
      loading,
      error,
      login,
      logout,
      refreshClaims,
      getTenantRole,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  }
  return ctx;
};
