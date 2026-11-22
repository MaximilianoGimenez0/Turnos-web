import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ServiceItem } from '../types';
import { subscribeToServices } from '../services/servicesService';

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

export const ServicesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToServices(
      (data) => {
        setServices(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const value = useMemo<ServicesContextValue>(
    () => ({ services, loading, error }),
    [services, loading, error]
  );

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useServices = (): ServicesContextValue => useContext(ServicesContext);
