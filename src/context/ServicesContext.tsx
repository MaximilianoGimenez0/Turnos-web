import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ServiceItem } from '../types';
import { getServices, subscribeToServices } from '../services/servicesService';
import {
  PUBLIC_CACHE_KEYS,
  readPublicCache,
  writePublicCache,
} from '../services/publicCache';
import { useAuthContext } from './AuthContext';

export interface ServicesContextValue {
  services: ServiceItem[];
  loading: boolean;
  error: Error | null;
}

const ServicesContext = createContext<ServicesContextValue>({
  services: [],
  loading: true,
  error: null,
});

const ServicesLoadTriggerContext = createContext<() => void>(() => {});

export const ServicesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const initialCached = useMemo(
    () => readPublicCache<ServiceItem[]>(PUBLIC_CACHE_KEYS.services),
    []
  );

  const [services, setServices] = useState<ServiceItem[]>(initialCached ?? []);
  const [loading, setLoading] = useState<boolean>(initialCached === null);
  const [error, setError] = useState<Error | null>(null);
  const [requested, setRequested] = useState<boolean>(false);

  const ensureLoaded = useCallback(() => {
    setRequested((prev) => (prev ? prev : true));
  }, []);

  useEffect(() => {
    if (!requested || authLoading) return;

    if (isAuthenticated) {
      const unsubscribe = subscribeToServices(
        (data) => {
          setServices(data);
          writePublicCache(PUBLIC_CACHE_KEYS.services, data);
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

    const cached = readPublicCache<ServiceItem[]>(PUBLIC_CACHE_KEYS.services);
    if (cached !== null) {
      return;
    }

    let active = true;
    getServices()
      .then((data) => {
        if (!active) return;
        setServices(data);
        writePublicCache(PUBLIC_CACHE_KEYS.services, data);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err : new Error('Error al cargar servicios'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requested, authLoading, isAuthenticated]);

  const value = useMemo<ServicesContextValue>(
    () => ({ services, loading, error }),
    [services, loading, error]
  );

  return (
    <ServicesLoadTriggerContext.Provider value={ensureLoaded}>
      <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>
    </ServicesLoadTriggerContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useServices = (): ServicesContextValue => {
  const ensureLoaded = useContext(ServicesLoadTriggerContext);
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);
  return useContext(ServicesContext);
};
