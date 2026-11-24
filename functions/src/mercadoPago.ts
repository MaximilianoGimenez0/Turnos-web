import { createHash } from 'crypto';
import type * as admin from 'firebase-admin';
import type { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { HttpsError } from 'firebase-functions/v2/https';
import { getTenantIntegrationsRef, validateTenantIdOrThrow, type TenantDoc } from './tenantContext';

export interface ResolvedMpCredentials {
  accessToken: string;
  webhookSecret: string;
  source: 'tenant' | 'demo_env';
}

export interface TenantMpClients {
  preferenceClient: Preference;
  paymentClient: Payment;
  webhookSecret: string;
  source: 'tenant' | 'demo_env';
}

interface CachedMpEntry {
  client: MercadoPagoConfig;
  preferenceClient: Preference;
  paymentClient: Payment;
  cachedAtMs: number;
}

const MP_CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;
const MP_CLIENT_CACHE_MAX_ENTRIES = 100;

const mpClientsCache = new Map<string, CachedMpEntry>();

const hashTokenFingerprint = (accessToken: string): string =>
  createHash('sha256').update(accessToken).digest('hex').slice(0, 16);

const pruneAndSetCache = (key: string, entry: CachedMpEntry): void => {
  if (mpClientsCache.has(key)) {
    mpClientsCache.delete(key);
  } else if (mpClientsCache.size >= MP_CLIENT_CACHE_MAX_ENTRIES) {
    const oldestKey = mpClientsCache.keys().next().value;
    if (oldestKey !== undefined) {
      mpClientsCache.delete(oldestKey);
    }
  }
  mpClientsCache.set(key, entry);
};

export const maskAccessToken = (token: string): string => {
  const trimmed = (token || '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= 4) return '****';
  if (trimmed.length <= 12) return `****${trimmed.slice(-4)}`;
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
};

export const invalidateTenantMpClientsCache = (tenantId?: string): void => {
  if (!tenantId) {
    mpClientsCache.clear();
    return;
  }
  const prefix = `${tenantId}:`;
  for (const key of Array.from(mpClientsCache.keys())) {
    if (key.startsWith(prefix)) {
      mpClientsCache.delete(key);
    }
  }
};

export const resetMpClientsCache = (): void => {
  mpClientsCache.clear();
};

export const resolveTenantMpCredentials = async (
  db: admin.firestore.Firestore,
  tenantDoc: Pick<TenantDoc, 'id' | 'isDemo'>
): Promise<ResolvedMpCredentials> => {
  const tenantId = validateTenantIdOrThrow(tenantDoc.id);
  const integrationsSnap = await getTenantIntegrationsRef(db, tenantId).get();
  const data = integrationsSnap.exists
    ? ((integrationsSnap.data() || {}) as Record<string, unknown>)
    : {};

  const ownAccessToken =
    typeof data.mpAccessToken === 'string' ? data.mpAccessToken.trim() : '';
  const ownWebhookSecret =
    typeof data.mpWebhookSecret === 'string' ? data.mpWebhookSecret.trim() : '';

  if (ownAccessToken) {
    return {
      accessToken: ownAccessToken,
      webhookSecret: ownWebhookSecret,
      source: 'tenant',
    };
  }

  if (tenantDoc.isDemo === true) {
    const envAccessToken = (process.env.MP_ACCESS_TOKEN || '').trim();
    const envWebhookSecret = (process.env.MP_WEBHOOK_SECRET || '').trim();
    if (!envAccessToken) {
      throw new HttpsError(
        'failed-precondition',
        'El entorno demo no tiene configurado Mercado Pago (MP_ACCESS_TOKEN).'
      );
    }
    return {
      accessToken: envAccessToken,
      webhookSecret: envWebhookSecret,
      source: 'demo_env',
    };
  }

  throw new HttpsError(
    'failed-precondition',
    'Este negocio no tiene configurado Mercado Pago para cobros online.'
  );
};

export const getTenantMpClients = async (
  db: admin.firestore.Firestore,
  tenantDoc: Pick<TenantDoc, 'id' | 'isDemo'>,
  nowMs = Date.now()
): Promise<TenantMpClients> => {
  const creds = await resolveTenantMpCredentials(db, tenantDoc);
  const cacheKey = `${tenantDoc.id}:${hashTokenFingerprint(creds.accessToken)}`;

  const existing = mpClientsCache.get(cacheKey);
  if (existing && nowMs - existing.cachedAtMs < MP_CLIENT_CACHE_TTL_MS) {
    // Refresh LRU recency
    mpClientsCache.delete(cacheKey);
    mpClientsCache.set(cacheKey, existing);
    return {
      preferenceClient: existing.preferenceClient,
      paymentClient: existing.paymentClient,
      webhookSecret: creds.webhookSecret,
      source: creds.source,
    };
  }

  const {
    MercadoPagoConfig: MercadoPagoConfigCtor,
    Preference: PreferenceCtor,
    Payment: PaymentCtor,
  } = await import('mercadopago');

  const client = new MercadoPagoConfigCtor({
    accessToken: creds.accessToken,
    options: {
      timeout: 7000,
    },
  });
  const preferenceClient = new PreferenceCtor(client);
  const paymentClient = new PaymentCtor(client);

  pruneAndSetCache(cacheKey, {
    client,
    preferenceClient,
    paymentClient,
    cachedAtMs: nowMs,
  });

  return {
    preferenceClient,
    paymentClient,
    webhookSecret: creds.webhookSecret,
    source: creds.source,
  };
};
