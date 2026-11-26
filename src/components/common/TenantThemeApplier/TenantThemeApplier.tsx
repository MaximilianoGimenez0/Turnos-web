import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTenant } from '../../../context/TenantContext';
import { useOwnerInfo } from '../../../context/OwnerInfoContext';
import { useTheme } from '../../../context/ThemeContext';
import {
  buildTenantCssVariables,
  ensureFontPairingLoaded,
  normalizeTenantAppearance,
} from '../../../services/themeEngine';

const TENANT_THEME_META_SELECTOR = 'meta[name="theme-color"][data-tenant-theme="true"]';

const isTenantAdminPathname = (pathname: string, slug: string): boolean => {
  const normalizedPath = pathname.toLowerCase().replace(/\/+$/, '');
  const adminPrefix = `/${slug.toLowerCase()}/admin`;
  return normalizedPath === adminPrefix || normalizedPath.startsWith(`${adminPrefix}/`);
};

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

/**
 * Applies the tenant's visual theme variables to public storefront routes while keeping
 * /:tenantSlug/admin isolated on Turneado's operational admin palette.
 */
export const TenantThemeApplier: React.FC = () => {
  const location = useLocation();
  const { tenantId, slug, appearance: bootstrapAppearance } = useTenant();
  const { rawOwner, isLiveSynced } = useOwnerInfo();
  const { theme, applyTenantModePolicy, clearTenantModePolicy } = useTheme();

  const isAdminRoute = isTenantAdminPathname(location.pathname, slug);

  const effectiveAppearance = useMemo(
    () =>
      normalizeTenantAppearance(
        isLiveSynced ? rawOwner?.appearance : (rawOwner?.appearance ?? bootstrapAppearance)
      ),
    [isLiveSynced, rawOwner?.appearance, bootstrapAppearance]
  );

  useEffect(() => {
    if (isAdminRoute) {
      clearTenantModePolicy();
      return;
    }

    applyTenantModePolicy({
      tenantId,
      defaultMode: effectiveAppearance.defaultMode,
      allowVisitorModeToggle: effectiveAppearance.allowVisitorModeToggle,
    });

    return () => {
      clearTenantModePolicy();
    };
  }, [
    isAdminRoute,
    tenantId,
    effectiveAppearance.defaultMode,
    effectiveAppearance.allowVisitorModeToggle,
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

    const cssVars = buildTenantCssVariables(effectiveAppearance, theme);
    const appliedKeys = Object.keys(cssVars);
    for (const [prop, val] of Object.entries(cssVars)) {
      root.style.setProperty(prop, val);
    }

    root.dataset.shapePreset = effectiveAppearance.shapePreset;
    root.dataset.surfaceStyle = effectiveAppearance.surfaceStyle;
    root.dataset.buttonStyle = effectiveAppearance.buttonStyle;
    root.dataset.motionPreset = effectiveAppearance.motionPreset;
    root.dataset.navbarStyle = effectiveAppearance.navbarStyle;
    root.dataset.logoShape = effectiveAppearance.logoShape;
    root.dataset.slotCardStyle = effectiveAppearance.slotCardStyle;

    ensureFontPairingLoaded(effectiveAppearance.fontPairing);
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
  }, [isAdminRoute, effectiveAppearance, theme]);

  return null;
};

export default TenantThemeApplier;
