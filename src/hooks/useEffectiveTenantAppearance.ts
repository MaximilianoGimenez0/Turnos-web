import { useMemo, useSyncExternalStore } from 'react';
import { useOwnerInfo } from '../context/OwnerInfoContext';
import { useTenant } from '../context/TenantContext';
import {
  resolveEffectiveAppearanceSource,
  resolveEffectiveThemeMode,
} from '../services/themeEngine';
import type { TenantAppearanceConfig } from '../types';

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

const subscribeSystemDark = (onStoreChange: () => void): (() => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
};

const getSystemDarkSnapshot = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(DARK_MEDIA_QUERY).matches;
};

export interface EffectiveTenantAppearanceResult {
  appearance: TenantAppearanceConfig;
  defaultResolvedMode: 'light' | 'dark';
}

/**
 * Resolves the tenant's live appearance prioritizing OwnerInfoContext (onSnapshot)
 * over the cached tenant_slugs bootstrap document, with 0 extra Firestore reads.
 */
export function useEffectiveTenantAppearance(): EffectiveTenantAppearanceResult {
  const { appearance: bootstrapAppearance } = useTenant();
  const { rawOwner, isLiveSynced } = useOwnerInfo();

  const systemPrefersDark = useSyncExternalStore(
    subscribeSystemDark,
    getSystemDarkSnapshot,
    () => false
  );

  const appearance = useMemo(
    () =>
      resolveEffectiveAppearanceSource({
        isLiveSynced,
        rawAppearance: rawOwner?.appearance,
        bootstrapAppearance,
      }),
    [isLiveSynced, rawOwner?.appearance, bootstrapAppearance]
  );

  const defaultResolvedMode = useMemo(
    () => resolveEffectiveThemeMode(appearance.defaultMode, systemPrefersDark),
    [appearance.defaultMode, systemPrefersDark]
  );

  return { appearance, defaultResolvedMode };
}
