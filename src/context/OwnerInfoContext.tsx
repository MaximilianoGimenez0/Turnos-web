import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { OwnerInfo } from '../types';
import {
  FALLBACK_OWNER_INFO_SYNC,
  loadDefaultOwnerInfo,
  resolveOwnerInfo,
} from '../services/ownerDefaults';
import { subscribeToRawOwnerInfo } from '../services/ownerService';
import {
  PUBLIC_CACHE_KEYS,
  readPublicCache,
  writePublicCache,
} from '../services/publicCache';
import { useAuthContext } from './AuthContext';
import { useTenant } from './TenantContext';

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

const hasAnyProfileFields = (profile: Partial<OwnerInfo> | null | undefined): boolean => {
  if (!profile || typeof profile !== 'object') return false;
  return Object.values(profile).some(
    (val) => typeof val === 'string' && val.trim().length > 0
  );
};

export const OwnerInfoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenantId, initialOwnerProfile } = useTenant();
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();

  const hasClaimsInfo = Boolean(
    user && (user.platformAdmin !== undefined || user.tenants !== undefined)
  );
  const isTenantAdmin = Boolean(
    isAuthenticated &&
      (hasClaimsInfo ? user?.platformAdmin === true || Boolean(user?.tenants?.[tenantId]) : true)
  );

  const initialRawOwner = useMemo<Partial<OwnerInfo> | null>(() => {
    const cached = readPublicCache<OwnerCachePayload>(tenantId, PUBLIC_CACHE_KEYS.ownerInfo);
    if (cached !== null) {
      return cached.value;
    }
    return hasAnyProfileFields(initialOwnerProfile) ? initialOwnerProfile : null;
  }, [tenantId, initialOwnerProfile]);

  const [defaults, setDefaults] = useState<OwnerInfo>(FALLBACK_OWNER_INFO_SYNC);
  const [rawOwner, setRawOwner] = useState<Partial<OwnerInfo> | null>(initialRawOwner);
  const [loading, setLoading] = useState<boolean>(false);
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

    // Public visitors hydrate directly from /tenant_slugs/{slug}.ownerProfile (0 extra Firestore reads).
    if (!isTenantAdmin) {
      return;
    }

    const unsubscribe = subscribeToRawOwnerInfo(
      tenantId,
      (data) => {
        setRawOwner(data);
        writePublicCache<OwnerCachePayload>(tenantId, PUBLIC_CACHE_KEYS.ownerInfo, { value: data });
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authLoading, isTenantAdmin, tenantId]);

  const owner = useMemo(() => resolveOwnerInfo(rawOwner, defaults), [rawOwner, defaults]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const titleName = owner.businessName?.trim() || owner.name?.trim() || 'TurnosWeb';
    document.title = `${titleName} · Reservas Online`;
  }, [owner.businessName, owner.name]);

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
