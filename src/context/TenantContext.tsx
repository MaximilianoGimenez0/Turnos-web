import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';
import type { OwnerInfo, TenantCurrency, TenantSlugBootstrapDoc, TenantStatus } from '../types';
import {
  DEFAULT_DEMO_SLUG,
  DEFAULT_TENANT_CURRENCY,
  DEFAULT_TENANT_TIMEZONE,
} from '../config/tenantConstants';
import {
  buildTenantPath,
  getCachedTenantResolution,
  normalizePublicSlugParam,
  resolveTenantBySlug,
  type TenantResolutionResult,
} from '../services/tenantService';
import Loader from '../components/common/Loader/Loader';
import Button from '../components/common/Button/Button';
import TenantNotFound from '../pages/TenantStatus/TenantNotFound';
import TenantSuspended from '../pages/TenantStatus/TenantSuspended';
import { TENANT_STATUS_TEXTS } from '../texts';
import statusStyles from '../pages/TenantStatus/TenantStatus.module.css';

export interface TenantContextValue {
  tenantId: string;
  slug: string;
  name: string;
  status: TenantStatus;
  timezone: string;
  currency: TenantCurrency;
  mpConfigured: boolean;
  isDemo: boolean;
  initialOwnerProfile: Partial<OwnerInfo>;
  bootstrap: TenantSlugBootstrapDoc;
  refreshTenant: () => Promise<void>;
}

type ProviderState =
  | { kind: 'loading'; slug: string }
  | { kind: 'resolved'; slug: string; result: TenantResolutionResult }
  | { kind: 'error'; slug: string; error: Error };

const TenantContext = createContext<TenantContextValue | null>(null);

const extractSubPathForRedirect = (pathname: string, rawSlugParam: string): string => {
  const prefix = `/${rawSlugParam}`;
  if (pathname.toLowerCase().startsWith(prefix.toLowerCase())) {
    return pathname.slice(prefix.length);
  }
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return '';
  return `/${segments.slice(1).join('/')}`;
};

const buildInitialState = (normalizedSlug: string): ProviderState => {
  const cached = getCachedTenantResolution(normalizedSlug);
  if (cached) {
    return { kind: 'resolved', slug: normalizedSlug, result: cached };
  }
  return { kind: 'loading', slug: normalizedSlug };
};

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const location = useLocation();
  const rawSlugParam = tenantSlug ?? '';
  const normalizedSlug = normalizePublicSlugParam(rawSlugParam);

  const [state, setState] = useState<ProviderState>(() => buildInitialState(normalizedSlug));
  const [reloadNonce, setReloadNonce] = useState(0);

  if (state.slug !== normalizedSlug) {
    setState(buildInitialState(normalizedSlug));
  }

  useEffect(() => {
    const cached = reloadNonce === 0 ? getCachedTenantResolution(normalizedSlug) : null;
    if (cached) {
      return;
    }

    let active = true;
    resolveTenantBySlug(normalizedSlug, { bypassCache: reloadNonce > 0 })
      .then((result) => {
        if (!active) return;
        setState({ kind: 'resolved', slug: normalizedSlug, result });
      })
      .catch((err: unknown) => {
        if (!active) return;
        const resolvedError =
          err instanceof Error ? err : new Error('No se pudo resolver el espacio solicitado.');
        setState({ kind: 'error', slug: normalizedSlug, error: resolvedError });
      });

    return () => {
      active = false;
    };
  }, [normalizedSlug, reloadNonce]);

  const refreshTenant = useCallback(async () => {
    const targetSlug = normalizedSlug;
    // Preserve resolved children during background refresh so in-place views (e.g. AdminView)
    // do not unmount and lose local state or active tabs.
    setState((prev) =>
      prev.kind === 'resolved' && prev.slug === targetSlug
        ? prev
        : { kind: 'loading', slug: targetSlug }
    );
    try {
      const result = await resolveTenantBySlug(targetSlug, { bypassCache: true });
      setState((prev) =>
        prev.slug !== targetSlug ? prev : { kind: 'resolved', slug: targetSlug, result }
      );
    } catch (err: unknown) {
      const resolvedError =
        err instanceof Error ? err : new Error('No se pudo actualizar el espacio solicitado.');
      setState((prev) =>
        prev.slug !== targetSlug || prev.kind === 'resolved'
          ? prev
          : { kind: 'error', slug: targetSlug, error: resolvedError }
      );
    }
  }, [normalizedSlug]);

  const activeBootstrap =
    state.kind === 'resolved' && state.result.status === 'active'
      ? state.result.tenant
      : null;

  const contextValue = useMemo<TenantContextValue | null>(() => {
    if (!activeBootstrap) return null;
    const ownerProfile = activeBootstrap.ownerProfile || {};
    const displayName =
      ownerProfile.businessName?.trim() || ownerProfile.name?.trim() || activeBootstrap.slug;

    return {
      tenantId: activeBootstrap.tenantId,
      slug: activeBootstrap.slug,
      name: displayName,
      status: activeBootstrap.status,
      timezone: activeBootstrap.timezone || DEFAULT_TENANT_TIMEZONE,
      currency: activeBootstrap.currency || DEFAULT_TENANT_CURRENCY,
      mpConfigured: Boolean(activeBootstrap.mpConfigured),
      isDemo: Boolean(activeBootstrap.isDemo),
      initialOwnerProfile: ownerProfile,
      bootstrap: activeBootstrap,
      refreshTenant,
    };
  }, [activeBootstrap, refreshTenant]);

  if (state.kind === 'loading') {
    return (
      <Loader
        fullScreen
        title={TENANT_STATUS_TEXTS.loading.title}
        subtitle={TENANT_STATUS_TEXTS.loading.subtitle}
        icon="calendar"
      />
    );
  }

  if (state.kind === 'error') {
    return (
      <div className={statusStyles.pageWrapper}>
        <section className={statusStyles.statusCard} aria-labelledby="tenant-error-title">
          <div className={`${statusStyles.iconWrapper} ${statusStyles.iconError}`} aria-hidden="true">
            <AlertTriangle size={26} strokeWidth={1.6} />
          </div>

          <span className={statusStyles.badge}>{TENANT_STATUS_TEXTS.error.badge}</span>

          <h1 id="tenant-error-title" className={statusStyles.title}>
            {TENANT_STATUS_TEXTS.error.title}
          </h1>

          <p className={statusStyles.description}>{TENANT_STATUS_TEXTS.error.description}</p>

          <div className={statusStyles.actions}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                setState({ kind: 'loading', slug: normalizedSlug });
                setReloadNonce((n) => n + 1);
              }}
              leftIcon={<RefreshCw size={16} strokeWidth={1.6} />}
            >
              {TENANT_STATUS_TEXTS.error.retryButton}
            </Button>

            <Link to={buildTenantPath(DEFAULT_DEMO_SLUG)} className={statusStyles.actionLink}>
              <Button
                variant="outline"
                size="lg"
                fullWidth
                rightIcon={<ArrowRight size={16} strokeWidth={1.6} />}
              >
                {TENANT_STATUS_TEXTS.error.demoCta}
              </Button>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const { result } = state;

  if (result.status === 'not_found') {
    return <TenantNotFound slug={result.slug || normalizedSlug} />;
  }

  if (result.status === 'redirect') {
    const subPath = extractSubPathForRedirect(location.pathname, rawSlugParam);
    const targetUrl = `${buildTenantPath(result.toSlug, subPath)}${location.search}${location.hash}`;
    return <Navigate to={targetUrl} replace />;
  }

  if (result.status === 'suspended') {
    const businessName =
      result.tenant.ownerProfile?.businessName?.trim() ||
      result.tenant.ownerProfile?.name?.trim();
    return <TenantSuspended businessName={businessName} />;
  }

  if (!contextValue) {
    return <TenantNotFound slug={normalizedSlug} />;
  }

  return <TenantContext.Provider value={contextValue}>{children}</TenantContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTenant = (): TenantContextValue => {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant debe utilizarse dentro de un TenantProvider activo.');
  }
  return ctx;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useOptionalTenant = (): TenantContextValue | null => {
  return useContext(TenantContext);
};
