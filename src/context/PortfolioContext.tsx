import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { PortfolioItem } from '../types';
import { getPortfolioItems, subscribeToPortfolio } from '../services/ownerService';
import {
  PUBLIC_CACHE_KEYS,
  readPublicCache,
  writePublicCache,
} from '../services/publicCache';
import { useAuthContext } from './AuthContext';
import { useTenant } from './TenantContext';

export interface PortfolioContextValue {
  items: PortfolioItem[];
  loading: boolean;
  error: Error | null;
}

const PortfolioContext = createContext<PortfolioContextValue>({
  items: [],
  loading: true,
  error: null,
});

const PortfolioLoadTriggerContext = createContext<() => void>(() => {});

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenantId } = useTenant();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();

  const hasClaimsInfo = Boolean(
    user && (user.platformAdmin !== undefined || user.tenants !== undefined)
  );
  const isTenantAdmin = Boolean(
    isAuthenticated &&
      (hasClaimsInfo ? user?.platformAdmin === true || Boolean(user?.tenants?.[tenantId]) : true)
  );

  const initialCached = useMemo(
    () => readPublicCache<PortfolioItem[]>(tenantId, PUBLIC_CACHE_KEYS.portfolio),
    [tenantId]
  );

  const [items, setItems] = useState<PortfolioItem[]>(initialCached ?? []);
  const [loading, setLoading] = useState<boolean>(initialCached === null);
  const [error, setError] = useState<Error | null>(null);
  const [requested, setRequested] = useState<boolean>(false);

  const ensureLoaded = useCallback(() => {
    setRequested((prev) => (prev ? prev : true));
  }, []);

  useEffect(() => {
    if (!requested || authLoading) return;

    if (isTenantAdmin) {
      const unsubscribe = subscribeToPortfolio(
        tenantId,
        (data) => {
          setItems(data);
          writePublicCache(tenantId, PUBLIC_CACHE_KEYS.portfolio, data);
          setError(null);
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    }

    const cached = readPublicCache<PortfolioItem[]>(tenantId, PUBLIC_CACHE_KEYS.portfolio);
    if (cached !== null) {
      return;
    }

    let active = true;
    getPortfolioItems(tenantId)
      .then((data) => {
        if (!active) return;
        setItems(data);
        writePublicCache(tenantId, PUBLIC_CACHE_KEYS.portfolio, data);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err : new Error('Error al cargar portfolio'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requested, authLoading, isTenantAdmin, tenantId]);

  const value = useMemo<PortfolioContextValue>(
    () => ({ items, loading, error }),
    [items, loading, error]
  );

  return (
    <PortfolioLoadTriggerContext.Provider value={ensureLoaded}>
      <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
    </PortfolioLoadTriggerContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePortfolio = (): PortfolioContextValue => {
  const ensureLoaded = useContext(PortfolioLoadTriggerContext);
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);
  return useContext(PortfolioContext);
};
