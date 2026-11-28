import type * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { isValidEmail } from './bookingValidation';

export const PLATFORM_CONFIG_COLLECTION = 'platform_config';
export const PLATFORM_SETTINGS_DOC_ID = 'settings';
export const PLATFORM_CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;

export interface PlatformSettingsDoc {
  superadminEmail: string;
  superadminUid: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PlatformAuthListClient {
  listUsers(
    maxResults?: number
  ): Promise<{
    users: Array<{
      uid: string;
      email?: string;
      customClaims?: Record<string, unknown>;
    }>;
  }>;
}

interface PlatformEmailCacheEntry {
  email: string;
  cachedAtMs: number;
}

let cachedSuperAdminEmail: PlatformEmailCacheEntry | null = null;

export const getPlatformSettingsRef = (
  db: admin.firestore.Firestore
): admin.firestore.DocumentReference =>
  db.collection(PLATFORM_CONFIG_COLLECTION).doc(PLATFORM_SETTINGS_DOC_ID);

export const resetPlatformConfigCache = (): void => {
  cachedSuperAdminEmail = null;
};

/**
 * Resolves the single SSOT SuperAdmin notification email from `/platform_config/settings`
 * with a 5-minute TTL cache and compatibility fallback to the first `platformAdmin` in Auth
 * only when the settings document does not exist yet.
 */
export const getPlatformSuperAdminEmail = async (
  db: admin.firestore.Firestore,
  authClient?: PlatformAuthListClient,
  nowMs = Date.now()
): Promise<string> => {
  if (
    cachedSuperAdminEmail &&
    nowMs - cachedSuperAdminEmail.cachedAtMs < PLATFORM_CONFIG_CACHE_TTL_MS
  ) {
    return cachedSuperAdminEmail.email;
  }

  let docExists = false;
  try {
    const snap = await getPlatformSettingsRef(db).get();
    docExists = snap.exists;
    if (snap.exists) {
      const rawEmail = snap.data()?.superadminEmail;
      const normalized = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
      if (isValidEmail(normalized)) {
        cachedSuperAdminEmail = { email: normalized, cachedAtMs: nowMs };
        return normalized;
      }
    }
  } catch (err) {
    logger.warn('[platformConfig] No se pudo leer /platform_config/settings.', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (!docExists && authClient) {
    try {
      const listed = await authClient.listUsers(100);
      const adminUser = listed.users.find(
        (u) =>
          u.customClaims?.platformAdmin === true &&
          typeof u.email === 'string' &&
          isValidEmail(u.email.trim().toLowerCase())
      );
      if (adminUser?.email) {
        const normalized = adminUser.email.trim().toLowerCase();
        cachedSuperAdminEmail = { email: normalized, cachedAtMs: nowMs };
        return normalized;
      }
    } catch (err) {
      logger.warn('[platformConfig] Fallback listUsers para SuperAdmin falló.', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.warn(
    '[platformConfig] No hay email de SuperAdmin configurado en /platform_config/settings.'
  );
  return '';
};
