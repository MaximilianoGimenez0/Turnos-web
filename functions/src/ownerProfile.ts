import type * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import {
  getTenantDocRef,
  getTenantOwnerProfileRef,
  validateTenantIdOrThrow,
  type TenantDoc,
} from './tenantContext';

export interface CachedOwnerProfile {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerLocation: string;
  ownerInstagram: string;
  logoUrl: string;
}

interface OwnerCacheEntry {
  profile: CachedOwnerProfile;
  cachedAtMs: number;
}

const OWNER_CACHE_TTL_MS = 5 * 60 * 1000;
const OWNER_CACHE_MAX_ENTRIES = 200;
const INSTAGRAM_HANDLE_REGEX = /^[a-zA-Z0-9._]{1,30}$/;
const RASTER_IMAGE_EXT_REGEX = /\.(png|jpe?g|webp)$/;

const ownerProfileCache = new Map<string, OwnerCacheEntry>();

export const resetOwnerProfileCache = (tenantId?: string): void => {
  if (tenantId) {
    ownerProfileCache.delete(tenantId);
    return;
  }
  ownerProfileCache.clear();
};

const setCachedEntry = (tenantId: string, entry: OwnerCacheEntry): void => {
  if (ownerProfileCache.has(tenantId)) {
    ownerProfileCache.delete(tenantId);
  } else if (ownerProfileCache.size >= OWNER_CACHE_MAX_ENTRIES) {
    const oldestKey = ownerProfileCache.keys().next().value;
    if (oldestKey !== undefined) {
      ownerProfileCache.delete(oldestKey);
    }
  }
  ownerProfileCache.set(tenantId, entry);
};

export const normalizeInstagramHandle = (raw: unknown): string => {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const withoutUrl = trimmed
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .split(/[?#]/)[0]
    .replace(/\/+$/g, '')
    .replace(/^@+/, '')
    .trim();

  if (!withoutUrl || !INSTAGRAM_HANDLE_REGEX.test(withoutUrl)) {
    return '';
  }
  return `@${withoutUrl}`;
};

/**
 * Only allows HTTPS raster image URLs (png/jpg/jpeg/webp) for email <img> rendering.
 * Gmail and Outlook strip or block inline SVG images and relative paths cannot resolve.
 */
export const sanitizeEmailLogoUrl = (raw: unknown): string => {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return '';
    const decodedPath = decodeURIComponent(parsed.pathname).toLowerCase();
    if (decodedPath.endsWith('.svg')) return '';
    if (!RASTER_IMAGE_EXT_REGEX.test(decodedPath)) return '';
    return trimmed;
  } catch {
    return '';
  }
};

export const getOwnerProfileCached = async (
  db: admin.firestore.Firestore,
  tenantId: string,
  nowMs = Date.now(),
  tenantFallback?: Pick<TenantDoc, 'name' | 'isDemo'>
): Promise<CachedOwnerProfile> => {
  const validTenantId = validateTenantIdOrThrow(tenantId);
  const existing = ownerProfileCache.get(validTenantId);
  if (existing && nowMs - existing.cachedAtMs < OWNER_CACHE_TTL_MS) {
    ownerProfileCache.delete(validTenantId);
    ownerProfileCache.set(validTenantId, existing);
    return existing.profile;
  }

  const envBusinessName = (process.env.BUSINESS_NAME || '').trim();
  const envOwnerEmail = (process.env.BUSINESS_EMAIL || process.env.OWNER_EMAIL || '').trim();
  const envOwnerPhone = (process.env.BUSINESS_PHONE || process.env.OWNER_PHONE || '').trim();

  try {
    const profileSnap = await getTenantOwnerProfileRef(db, validTenantId).get();
    const data = profileSnap.exists ? (profileSnap.data() as Record<string, unknown>) : null;

    const remoteBusinessName =
      typeof data?.businessName === 'string' && data.businessName.trim()
        ? data.businessName.trim()
        : '';
    const remoteName =
      typeof data?.name === 'string' && data.name.trim() ? data.name.trim() : '';
    const remoteEmail =
      typeof data?.email === 'string' && data.email.trim() ? data.email.trim() : '';
    const remotePhone =
      typeof data?.phone === 'string' && data.phone.trim() ? data.phone.trim() : '';
    const remoteLocation =
      typeof data?.location === 'string' && data.location.trim() ? data.location.trim() : '';
    const remoteInstagram = normalizeInstagramHandle(data?.instagram);
    const remoteLogoUrl = sanitizeEmailLogoUrl(data?.logoUrl);

    let tenantName = tenantFallback?.name?.trim() || '';
    let isDemo = tenantFallback?.isDemo === true;

    const needsTenantFallback =
      !tenantFallback &&
      (!profileSnap.exists ||
        (!remoteBusinessName && !remoteName) ||
        !remoteEmail ||
        !remotePhone);

    if (needsTenantFallback) {
      const tenantSnap = await getTenantDocRef(db, validTenantId).get();
      if (tenantSnap.exists) {
        const tenantData = (tenantSnap.data() || {}) as Record<string, unknown>;
        if (typeof tenantData.name === 'string' && tenantData.name.trim()) {
          tenantName = tenantData.name.trim();
        }
        isDemo = tenantData.isDemo === true;
      }
    }

    const businessName =
      remoteBusinessName ||
      remoteName ||
      tenantName ||
      (isDemo ? envBusinessName : '') ||
      'Turnos Web';
    const ownerName = remoteName || businessName;
    const ownerEmail = remoteEmail || (isDemo ? envOwnerEmail : '');
    const ownerPhone = remotePhone || (isDemo ? envOwnerPhone : '');

    const profile: CachedOwnerProfile = {
      businessName,
      ownerName,
      ownerEmail,
      ownerPhone,
      ownerLocation: remoteLocation,
      ownerInstagram: remoteInstagram,
      logoUrl: remoteLogoUrl,
    };

    setCachedEntry(validTenantId, { profile, cachedAtMs: nowMs });
    return profile;
  } catch (err) {
    logger.warn(
      '[ownerProfile] No se pudo leer ownerinfo/profile del tenant; usando fallback mínimo.',
      {
        tenantId: validTenantId,
        error: err instanceof Error ? err.message : String(err),
      }
    );
    const isDemo = tenantFallback?.isDemo === true;
    const fallbackName =
      tenantFallback?.name?.trim() || (isDemo ? envBusinessName : '') || 'Turnos Web';
    return {
      businessName: fallbackName,
      ownerName: fallbackName,
      ownerEmail: isDemo ? envOwnerEmail : '',
      ownerPhone: isDemo ? envOwnerPhone : '',
      ownerLocation: '',
      ownerInstagram: '',
      logoUrl: '',
    };
  }
};
