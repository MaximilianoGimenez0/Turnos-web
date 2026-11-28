import React, { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { TenantAppearanceConfig } from '../../../types';
import { useTenant } from '../../../context/TenantContext';
import { useTheme } from '../../../context/ThemeContext';
import { useEffectiveTenantAppearance } from '../../../hooks/useEffectiveTenantAppearance';
import {
  buildTenantCssVariables,
  ensureFontPairingLoaded,
  isTenantAdminPathname,
  writeCachedTenantAppearanceBySlug,
} from '../../../services/themeEngine';

const TENANT_THEME_META_SELECTOR = 'meta[name="theme-color"][data-tenant-theme="true"]';

const syncThemeColorMeta = (bgBodyHex: string | null): void => {
  if (typeof document === 'undefined') return;
  const existing = document.head.querySelector(TENANT_THEME_META_SELECTOR) as HTMLMetaElement | null;

  if (!bgBodyHex) {
    existing?.remove();
    return;
  }

  if (existing) {
    existing.content = bgBodyHex;
    return;
  }

  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.dataset.tenantTheme = 'true';
  meta.content = bgBodyHex;
  document.head.appendChild(meta);
};

export interface TenantAppearanceEffectProps {
  tenantId: string;
  slug: string;
  appearance: TenantAppearanceConfig;
  isAdminRoute?: boolean;
  persistToCache?: boolean;
}

export const TenantAppearanceEffect: React.FC<TenantAppearanceEffectProps> = ({
  tenantId,
  slug,
  appearance,
  isAdminRoute = false,
  persistToCache = true,
}) => {
  const { theme, applyTenantModePolicy, clearTenantModePolicy } = useTheme();

  useEffect(() => {
    if (!persistToCache) return;
    writeCachedTenantAppearanceBySlug(slug, { tenantId, appearance });
  }, [persistToCache, slug, tenantId, appearance]);

  useEffect(() => {
    if (isAdminRoute) {
      clearTenantModePolicy();
      return;
    }

    applyTenantModePolicy({
      tenantId,
      defaultMode: appearance.defaultMode,
      allowVisitorModeToggle: appearance.allowVisitorModeToggle,
    });

    return () => {
      clearTenantModePolicy();
    };
  }, [
    isAdminRoute,
    tenantId,
    appearance.defaultMode,
    appearance.allowVisitorModeToggle,
    applyTenantModePolicy,
    clearTenantModePolicy,
  ]);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (isAdminRoute) {
      delete root.dataset.shapePreset;
      delete root.dataset.surfaceStyle;
      delete root.dataset.buttonStyle;
      delete root.dataset.motionPreset;
      delete root.dataset.navbarStyle;
      delete root.dataset.logoShape;
      delete root.dataset.slotCardStyle;
      syncThemeColorMeta(null);
      return;
    }

    const cssVars = buildTenantCssVariables(appearance, theme);
    const appliedKeys = Object.keys(cssVars);
    for (const [prop, val] of Object.entries(cssVars)) {
      root.style.setProperty(prop, val);
    }

    root.dataset.shapePreset = appearance.shapePreset;
    root.dataset.surfaceStyle = appearance.surfaceStyle;
    root.dataset.buttonStyle = appearance.buttonStyle;
    root.dataset.motionPreset = appearance.motionPreset;
    root.dataset.navbarStyle = appearance.navbarStyle;
    root.dataset.logoShape = appearance.logoShape;
    root.dataset.slotCardStyle = appearance.slotCardStyle;

    ensureFontPairingLoaded(appearance.fontPairing);
    syncThemeColorMeta(cssVars['--bg-body'] ?? null);

    return () => {
      for (const prop of appliedKeys) {
        root.style.removeProperty(prop);
      }
      delete root.dataset.shapePreset;
      delete root.dataset.surfaceStyle;
      delete root.dataset.buttonStyle;
      delete root.dataset.motionPreset;
      delete root.dataset.navbarStyle;
      delete root.dataset.logoShape;
      delete root.dataset.slotCardStyle;
      syncThemeColorMeta(null);
    };
  }, [isAdminRoute, appearance, theme]);

  return null;
};

/**
 * Applies the tenant's visual theme variables to public storefront routes while keeping
 * /:tenantSlug/admin isolated on Turneado's operational admin palette.
 */
export const TenantThemeApplier: React.FC = () => {
  const location = useLocation();
  const { tenantId, slug } = useTenant();
  const { appearance: effectiveAppearance } = useEffectiveTenantAppearance();

  const isAdminRoute = isTenantAdminPathname(location.pathname, slug);

  return (
    <TenantAppearanceEffect
      tenantId={tenantId}
      slug={slug}
      appearance={effectiveAppearance}
      isAdminRoute={isAdminRoute}
    />
  );
};

export default TenantThemeApplier;
