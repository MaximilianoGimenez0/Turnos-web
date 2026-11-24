import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser, TenantRole, TurnosCustomClaims } from '../types';
import {
  getTenantRoleFromClaims,
  loginWithEmail,
  logout as authLogout,
  onAuthChange,
  refreshCurrentUserClaims,
} from '../services/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  claims: TurnosCustomClaims;
  isAuthenticated: boolean;
  isPlatformAdmin: boolean;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const loggedUser = await loginWithEmail(email, pass);
      setUser(loggedUser);
      return loggedUser;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido al iniciar sesión';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await authLogout();
      setUser(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cerrar sesión';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshClaims = useCallback(async () => {
    try {
      const refreshedUser = await refreshCurrentUserClaims();
      setUser(refreshedUser);
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
      isAuthenticated: Boolean(user),
      isPlatformAdmin: Boolean(user?.platformAdmin),
      loading,
      error,
      login,
      logout,
      refreshClaims,
      getTenantRole,
    }),
    [user, claims, loading, error, login, logout, refreshClaims, getTenantRole]
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
