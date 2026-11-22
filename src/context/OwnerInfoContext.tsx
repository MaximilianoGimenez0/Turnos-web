import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { OwnerInfo } from '../types';
import {
  FALLBACK_OWNER_INFO_SYNC,
  loadDefaultOwnerInfo,
  resolveOwnerInfo,
} from '../services/ownerDefaults';
import { getRawOwnerInfo, subscribeToRawOwnerInfo } from '../services/ownerService';
import {
  PUBLIC_CACHE_KEYS,
  readPublicCache,
  writePublicCache,
} from '../services/publicCache';
import { useAuthContext } from './AuthContext';

export interface OwnerInfoContextValue {
  owner: OwnerInfo;
  rawOwner: Partial<OwnerInfo> | null;
  defaults: OwnerInfo;
  loading: boolean;
  error: Error | null;
}

interface OwnerCachePayload {
  value: Partial<OwnerInfo> | null;
}

const OwnerInfoContext = createContext<OwnerInfoContextValue>({
  owner: FALLBACK_OWNER_INFO_SYNC,
  rawOwner: null,
  defaults: FALLBACK_OWNER_INFO_SYNC,
  loading: true,
  error: null,
});

export const OwnerInfoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const initialCached = useMemo(
    () => readPublicCache<OwnerCachePayload>(PUBLIC_CACHE_KEYS.ownerInfo),
    []
  );

  const [defaults, setDefaults] = useState<OwnerInfo>(FALLBACK_OWNER_INFO_SYNC);
  const [rawOwner, setRawOwner] = useState<Partial<OwnerInfo> | null>(
    initialCached ? initialCached.value : null
  );
  const [loading, setLoading] = useState<boolean>(initialCached === null);
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
    if (authLoading) return;

    if (isAuthenticated) {
      const unsubscribe = subscribeToRawOwnerInfo(
        (data) => {
          setRawOwner(data);
          writePublicCache<OwnerCachePayload>(PUBLIC_CACHE_KEYS.ownerInfo, { value: data });
          setLoading(false);
          setError(null);
        },
        (err) => {
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    }

    const cached = readPublicCache<OwnerCachePayload>(PUBLIC_CACHE_KEYS.ownerInfo);
    if (cached !== null) {
      return;
    }

    let active = true;
    getRawOwnerInfo()
      .then((data) => {
        if (!active) return;
        setRawOwner(data);
        writePublicCache<OwnerCachePayload>(PUBLIC_CACHE_KEYS.ownerInfo, { value: data });
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err : new Error('Error al cargar información del negocio'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated]);

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
