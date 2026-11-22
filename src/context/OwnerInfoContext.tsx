import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { OwnerInfo } from '../types';
import {
  FALLBACK_OWNER_INFO_SYNC,
  loadDefaultOwnerInfo,
  resolveOwnerInfo,
} from '../services/ownerDefaults';
import { subscribeToRawOwnerInfo } from '../services/ownerService';

export interface OwnerInfoContextValue {
  owner: OwnerInfo;
  rawOwner: Partial<OwnerInfo> | null;
  defaults: OwnerInfo;
  loading: boolean;
  error: Error | null;
}

const OwnerInfoContext = createContext<OwnerInfoContextValue>({
  owner: FALLBACK_OWNER_INFO_SYNC,
  rawOwner: null,
  defaults: FALLBACK_OWNER_INFO_SYNC,
  loading: true,
  error: null,
});

export const OwnerInfoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [defaults, setDefaults] = useState<OwnerInfo>(FALLBACK_OWNER_INFO_SYNC);
  const [rawOwner, setRawOwner] = useState<Partial<OwnerInfo> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    loadDefaultOwnerInfo().then((loadedDefaults) => {
      if (mounted) {
        setDefaults(loadedDefaults);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToRawOwnerInfo(
      (data) => {
        setRawOwner(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const owner = useMemo(() => resolveOwnerInfo(rawOwner, defaults), [rawOwner, defaults]);

  const value = useMemo<OwnerInfoContextValue>(
    () => ({
      owner,
      rawOwner,
      defaults,
      loading,
      error,
    }),
    [owner, rawOwner, defaults, loading, error]
  );

  return <OwnerInfoContext.Provider value={value}>{children}</OwnerInfoContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useOwnerInfo = (): OwnerInfoContextValue => useContext(OwnerInfoContext);
