import type * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

export interface CachedOwnerProfile {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerLocation: string;
  ownerInstagram: string;
  logoUrl: string;
}

const OWNER_CACHE_TTL_MS = 5 * 60 * 1000;
const INSTAGRAM_HANDLE_REGEX = /^[a-zA-Z0-9._]{1,30}$/;
const RASTER_IMAGE_EXT_REGEX = /\.(png|jpe?g|webp)$/;

let cachedProfile: CachedOwnerProfile | null = null;
let cachedAtMs = 0;

export const resetOwnerProfileCache = (): void => {
  cachedProfile = null;
  cachedAtMs = 0;
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
  nowMs = Date.now()
): Promise<CachedOwnerProfile> => {
  if (cachedProfile && nowMs - cachedAtMs < OWNER_CACHE_TTL_MS) {
    return cachedProfile;
  }

  const envBusinessName = (process.env.BUSINESS_NAME || '').trim();
  const envOwnerEmail = (process.env.BUSINESS_EMAIL || process.env.OWNER_EMAIL || '').trim();
  const envOwnerPhone = (process.env.BUSINESS_PHONE || process.env.OWNER_PHONE || '').trim();

  try {
    const snap = await db.collection('ownerinfo').doc('profile').get();
    const data = snap.exists ? (snap.data() as Record<string, unknown>) : null;

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

    const businessName = remoteBusinessName || remoteName || envBusinessName || 'Turnos Web';
    const ownerName = remoteName || businessName;
    const ownerEmail = remoteEmail || envOwnerEmail;
    const ownerPhone = envOwnerPhone || remotePhone;

    cachedProfile = {
      businessName,
      ownerName,
      ownerEmail,
      ownerPhone,
      ownerLocation: remoteLocation,
      ownerInstagram: remoteInstagram,
      logoUrl: remoteLogoUrl,
    };
    cachedAtMs = nowMs;
    return cachedProfile;
  } catch (err) {
    logger.warn('[ownerProfile] No se pudo leer ownerinfo/profile; usando fallback de entorno.', {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      businessName: envBusinessName || 'Turnos Web',
      ownerName: envBusinessName || 'Turnos Web',
      ownerEmail: envOwnerEmail,
      ownerPhone: envOwnerPhone,
      ownerLocation: '',
      ownerInstagram: '',
      logoUrl: '',
    };
  }
};
