import { useState, useEffect } from 'react';
import type { AuthUser } from '../types';
import { onAuthChange, loginWithEmail, logout as authLogout } from '../services/auth';

export const useAuth = () => {
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

  const login = async (email: string, pass: string) => {
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
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await authLogout();
      setUser(null);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al cerrar sesión';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    logout,
  };
};
