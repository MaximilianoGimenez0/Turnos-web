import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import {
  DEFAULT_TENANT_CURRENCY,
  DEFAULT_TENANT_TIMEZONE,
  RESERVED_TENANT_SLUGS,
  TENANT_SLUG_MAX_LENGTH,
  TENANT_SLUG_MIN_LENGTH,
  TENANT_SLUG_REGEX,
} from '../config/tenantConstants';
import {
  clearPublicCache,
  PUBLIC_CACHE_KEYS,
  readPublicCache,
  writePublicCache,
} from './publicCache';
import type { OwnerInfo, TenantSlugBootstrapDoc, TenantStatus } from '../types';

export const TENANT_SLUGS_COLLECTION = 'tenant_slugs';
export const TENANT_NEGATIVE_CACHE_TTL_MS = 60 * 1000;

export type TenantResolutionResult =
  | {
      status: 'active';
      tenant: TenantSlugBootstrapDoc;
      fromCache: boolean;
    }
  | {
      status: 'suspended';
      tenant: TenantSlugBootstrapDoc;
      fromCache: boolean;
    }
  | {
      status: 'redirect';
      fromSlug: string;
      toSlug: string;
      tenant: TenantSlugBootstrapDoc;
      fromCache: boolean;
    }
  | {
      status: 'not_found';
      slug: string;
    };

const negativeSlugCache = new Map<string, number>();

export const normalizePublicSlugParam = (rawSlug: string | undefined | null): string =>
  String(rawSlug ?? '').trim().toLowerCase();

export const isValidTenantSlugFormat = (slug: string): boolean => {
  if (slug.length < TENANT_SLUG_MIN_LENGTH || slug.length > TENANT_SLUG_MAX_LENGTH) {
    return false;
  }
  if (!TENANT_SLUG_REGEX.test(slug)) {
    return false;
  }
  if (RESERVED_TENANT_SLUGS.has(slug)) {
    return false;
  }
  return true;
};

export const getSlugCacheScope = (slug: string): string => `slug:${normalizePublicSlugParam(slug)}`;

export const buildTenantPath = (slug: string, subPath = ''): string => {
  const cleanSlug = normalizePublicSlugParam(slug).replace(/^\/+|\/+$/g, '');
  const basePath = cleanSlug ? `/${cleanSlug}` : '';
  const trimmedSub = String(subPath ?? '').trim();

  if (!trimmedSub || trimmedSub === '/') {
    return basePath || '/';
  }

  const normalizedSub = trimmedSub.startsWith('/') ? trimmedSub : `/${trimmedSub}`;
  return `${basePath}${normalizedSub}`.replace(/\/{2,}/g, '/');
};

export const parsePaymentExternalReference = (
  rawRef: string | null | undefined
): { tenantId?: string; slotId?: string } => {
  if (typeof rawRef !== 'string') return {};
  const trimmed = rawRef.trim();
  if (!trimmed) return {};

  const colonIdx = trimmed.indexOf(':');
  if (colonIdx === -1) {
    return { slotId: trimmed };
  }

  const tenantId = trimmed.slice(0, colonIdx).trim();
  const slotId = trimmed.slice(colonIdx + 1).trim();
  return {
    ...(tenantId ? { tenantId } : {}),
    ...(slotId ? { slotId } : {}),
  };
};

export const classifyTenantBootstrap = (
  bootstrap: TenantSlugBootstrapDoc,
  fromCache: boolean
): TenantResolutionResult => {
  const redirectTarget =
    typeof bootstrap.redirectToSlug === 'string'
      ? normalizePublicSlugParam(bootstrap.redirectToSlug)
      : '';

  if (redirectTarget && redirectTarget !== normalizePublicSlugParam(bootstrap.slug)) {
    return {
      status: 'redirect',
      fromSlug: normalizePublicSlugParam(bootstrap.slug),
      toSlug: redirectTarget,
      tenant: bootstrap,
      fromCache,
    };
  }

  if (bootstrap.status === 'suspended') {
    return {
      status: 'suspended',
      tenant: bootstrap,
      fromCache,
    };
  }

  return {
    status: 'active',
    tenant: bootstrap,
    fromCache,
  };
};

const normalizeBootstrapDoc = (
  slug: string,
  rawData: Record<string, unknown>
): TenantSlugBootstrapDoc | null => {
  const tenantId = typeof rawData.tenantId === 'string' ? rawData.tenantId.trim() : '';
  const redirectToSlug =
    typeof rawData.redirectToSlug === 'string' && rawData.redirectToSlug.trim()
      ? normalizePublicSlugParam(rawData.redirectToSlug)
      : null;

  if (!tenantId && !redirectToSlug) {
    return null;
  }

  const rawStatus = rawData.status;
  const status: TenantStatus = rawStatus === 'suspended' ? 'suspended' : 'active';
  const timezone =
    typeof rawData.timezone === 'string' && rawData.timezone.trim()
      ? rawData.timezone.trim()
      : DEFAULT_TENANT_TIMEZONE;
  const ownerProfile =
    rawData.ownerProfile && typeof rawData.ownerProfile === 'object'
      ? (rawData.ownerProfile as Partial<OwnerInfo>)
      : {};

  return {
    tenantId,
    slug:
      typeof rawData.slug === 'string' && rawData.slug.trim()
        ? normalizePublicSlugParam(rawData.slug)
        : slug,
    status,
    redirectToSlug,
    timezone,
    currency:
      rawData.currency === DEFAULT_TENANT_CURRENCY
        ? DEFAULT_TENANT_CURRENCY
        : DEFAULT_TENANT_CURRENCY,
    mpConfigured: Boolean(rawData.mpConfigured),
    isDemo: Boolean(rawData.isDemo),
    ownerProfile,
    updatedAt: typeof rawData.updatedAt === 'string' ? rawData.updatedAt : '',
  };
};

export const getCachedTenantResolution = (
  rawSlug: string | undefined | null,
  nowMs = Date.now()
): TenantResolutionResult | null => {
  const slug = normalizePublicSlugParam(rawSlug);
  if (!isValidTenantSlugFormat(slug)) {
    return { status: 'not_found', slug };
  }

  const negativeExpiry = negativeSlugCache.get(slug);
  if (negativeExpiry !== undefined) {
    if (nowMs < negativeExpiry) {
      return { status: 'not_found', slug };
    }
    negativeSlugCache.delete(slug);
  }

  const cached = readPublicCache<TenantSlugBootstrapDoc>(
    getSlugCacheScope(slug),
    PUBLIC_CACHE_KEYS.bootstrap
  );
  if (cached) {
    return classifyTenantBootstrap(cached, true);
  }

  return null;
};

export const resolveTenantBySlug = async (
  rawSlug: string | undefined | null,
  options?: { bypassCache?: boolean }
): Promise<TenantResolutionResult> => {
  const slug = normalizePublicSlugParam(rawSlug);
  if (!isValidTenantSlugFormat(slug)) {
    return { status: 'not_found', slug };
  }

  if (!options?.bypassCache) {
    const cachedResult = getCachedTenantResolution(slug);
    if (cachedResult) {
      return cachedResult;
    }
  }

  const snap = await getDoc(doc(db, TENANT_SLUGS_COLLECTION, slug));
  if (!snap.exists()) {
    negativeSlugCache.set(slug, Date.now() + TENANT_NEGATIVE_CACHE_TTL_MS);
    return { status: 'not_found', slug };
  }

  const bootstrap = normalizeBootstrapDoc(slug, snap.data() as Record<string, unknown>);
  if (!bootstrap) {
    negativeSlugCache.set(slug, Date.now() + TENANT_NEGATIVE_CACHE_TTL_MS);
    return { status: 'not_found', slug };
  }

  negativeSlugCache.delete(slug);
  writePublicCache<TenantSlugBootstrapDoc>(
    getSlugCacheScope(slug),
    PUBLIC_CACHE_KEYS.bootstrap,
    bootstrap
  );

  return classifyTenantBootstrap(bootstrap, false);
};

export const invalidateTenantBootstrapCache = (slug?: string): void => {
  if (slug) {
    const normalized = normalizePublicSlugParam(slug);
    negativeSlugCache.delete(normalized);
    clearPublicCache(getSlugCacheScope(normalized), PUBLIC_CACHE_KEYS.bootstrap);
    return;
  }

  negativeSlugCache.clear();
  clearPublicCache();
};

export const clearTenantNegativeCache = (): void => {
  negativeSlugCache.clear();
};
