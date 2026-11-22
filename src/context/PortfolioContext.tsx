import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PortfolioItem } from '../types';
import { subscribeToPortfolio } from '../services/ownerService';

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

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPortfolio(
      (data) => {
        setItems(data);
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

  const value = useMemo<PortfolioContextValue>(
    () => ({ items, loading, error }),
    [items, loading, error]
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePortfolio = (): PortfolioContextValue => useContext(PortfolioContext);
