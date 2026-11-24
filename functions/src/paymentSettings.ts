import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { invalidateTenantMpClientsCache, maskAccessToken } from './mercadoPago';
import {
  assertTenantRole,
  getTenantDocRef,
  getTenantIntegrationsRef,
  getTenantOrThrow,
  validateTenantIdOrThrow,
} from './tenantContext';
import { syncTenantBootstrap } from './tenantSync';

const MP_ACCESS_TOKEN_REGEX = /^(?:APP_USR|TEST)-[A-Za-z0-9_-]{8,}$/;

export interface TenantPaymentSettingsSummary {
  configured: boolean;
  maskedAccessToken: string | null;
  hasWebhookSecret: boolean;
  isDemoFallbackActive: boolean;
  webhookUrl: string;
  updatedAt?: string | null;
}

export interface AdminGetPaymentSettingsPayload {
  tenantId: string;
}

export interface AdminSavePaymentSettingsPayload {
  tenantId: string;
  mpAccessToken?: string;
  mpWebhookSecret?: string;
  mpPublicKey?: string;
  clearCredentials?: boolean;
}

export const getWebhookBaseUrl = (): string => {
  const envUrl = (process.env.MP_WEBHOOK_URL || '').trim();
  if (envUrl && !envUrl.includes('tu-proyecto-id')) {
    return envUrl;
  }
  const projectId = process.env.GCLOUD_PROJECT || 'turnos-web-eb8b5';
  return `https://us-central1-${projectId}.cloudfunctions.net/mpWebhook`;
};

export const buildTenantWebhookUrl = (tenantId: string): string => {
  const base = getWebhookBaseUrl();
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}tenantId=${encodeURIComponent(tenantId)}`;
};

export const adminGetPaymentSettingsSummaryCore = async (
  db: admin.firestore.Firestore,
  tenantId: string
): Promise<TenantPaymentSettingsSummary> => {
  const validTenantId = validateTenantIdOrThrow(tenantId);
  const [tenantDoc, integrationsSnap] = await Promise.all([
    getTenantOrThrow(db, validTenantId),
    getTenantIntegrationsRef(db, validTenantId).get(),
  ]);

  const data = integrationsSnap.exists
    ? ((integrationsSnap.data() || {}) as Record<string, unknown>)
    : {};

  const rawAccessToken =
    typeof data.mpAccessToken === 'string' ? data.mpAccessToken.trim() : '';
  const rawWebhookSecret =
    typeof data.mpWebhookSecret === 'string' ? data.mpWebhookSecret.trim() : '';
  const hasOwnToken = rawAccessToken.length > 0;
  const hasDemoEnvToken =
    tenantDoc.isDemo && Boolean((process.env.MP_ACCESS_TOKEN || '').trim());
  const isDemoFallbackActive = !hasOwnToken && hasDemoEnvToken;

  const maskedAccessToken = hasOwnToken
    ? typeof data.maskedAccessToken === 'string' && data.maskedAccessToken.trim()
      ? data.maskedAccessToken.trim()
      : maskAccessToken(rawAccessToken)
    : null;

  return {
    configured: hasOwnToken || isDemoFallbackActive,
    maskedAccessToken,
    hasWebhookSecret: rawWebhookSecret.length > 0,
    isDemoFallbackActive,
    webhookUrl: buildTenantWebhookUrl(validTenantId),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
  };
};

export const adminSavePaymentSettingsCore = async (
  db: admin.firestore.Firestore,
  tenantId: string,
  actorUid: string,
  payload: Omit<AdminSavePaymentSettingsPayload, 'tenantId'>
): Promise<TenantPaymentSettingsSummary> => {
  const validTenantId = validateTenantIdOrThrow(tenantId);
  const [tenantDoc, existingSnap] = await Promise.all([
    getTenantOrThrow(db, validTenantId),
    getTenantIntegrationsRef(db, validTenantId).get(),
  ]);

  const existing = existingSnap.exists
    ? ((existingSnap.data() || {}) as Record<string, unknown>)
    : {};
  const nowIso = new Date().toISOString();

  const integrationsRef = getTenantIntegrationsRef(db, validTenantId);
  const tenantRef = getTenantDocRef(db, validTenantId);

  let nextAccessToken: string | null;
  let nextWebhookSecret: string | null;
  let nextPublicKey: string | null;

  if (payload.clearCredentials === true) {
    nextAccessToken = null;
    nextWebhookSecret = null;
    nextPublicKey = null;
  } else {
    const incomingAccessToken =
      typeof payload.mpAccessToken === 'string' ? payload.mpAccessToken.trim() : '';
    const incomingWebhookSecret =
      typeof payload.mpWebhookSecret === 'string' ? payload.mpWebhookSecret.trim() : '';
    const incomingPublicKey =
      typeof payload.mpPublicKey === 'string' ? payload.mpPublicKey.trim() : '';

    if (!incomingAccessToken && !incomingWebhookSecret && !incomingPublicKey) {
      throw new HttpsError(
        'invalid-argument',
        'Ingresá al menos una credencial de Mercado Pago o indicá borrar las credenciales.'
      );
    }

    if (incomingAccessToken && !MP_ACCESS_TOKEN_REGEX.test(incomingAccessToken)) {
      throw new HttpsError(
        'invalid-argument',
        'El Access Token de Mercado Pago no tiene un formato válido (debe comenzar con APP_USR- o TEST-).'
      );
    }

    if (
      incomingWebhookSecret &&
      (incomingWebhookSecret.length < 8 ||
        incomingWebhookSecret.length > 256 ||
        /\s/.test(incomingWebhookSecret))
    ) {
      throw new HttpsError(
        'invalid-argument',
        'El secreto de webhook debe tener entre 8 y 256 caracteres sin espacios.'
      );
    }

    if (incomingPublicKey && (incomingPublicKey.length < 8 || /\s/.test(incomingPublicKey))) {
      throw new HttpsError(
        'invalid-argument',
        'La Public Key de Mercado Pago no tiene un formato válido.'
      );
    }

    const existingToken =
      typeof existing.mpAccessToken === 'string' && existing.mpAccessToken.trim()
        ? existing.mpAccessToken.trim()
        : null;
    const existingSecret =
      typeof existing.mpWebhookSecret === 'string' && existing.mpWebhookSecret.trim()
        ? existing.mpWebhookSecret.trim()
        : null;
    const existingPublicKey =
      typeof existing.mpPublicKey === 'string' && existing.mpPublicKey.trim()
        ? existing.mpPublicKey.trim()
        : null;

    nextAccessToken = incomingAccessToken || existingToken;
    nextWebhookSecret = incomingWebhookSecret || existingSecret;
    nextPublicKey = incomingPublicKey || existingPublicKey;
  }

  const nextMaskedToken = nextAccessToken ? maskAccessToken(nextAccessToken) : null;
  const hasOwnToken = Boolean(nextAccessToken);
  const nextMpConfigured = Boolean(hasOwnToken || tenantDoc.isDemo);

  await Promise.all([
    integrationsRef.set(
      {
        mpAccessToken: nextAccessToken,
        mpWebhookSecret: nextWebhookSecret,
        mpPublicKey: nextPublicKey,
        maskedAccessToken: nextMaskedToken,
        updatedAt: nowIso,
        updatedByUid: actorUid,
      },
      { merge: true }
    ),
    tenantRef.update({
      mpConfigured: nextMpConfigured,
      updatedAt: nowIso,
    }),
  ]);

  invalidateTenantMpClientsCache(validTenantId);
  await syncTenantBootstrap(db, validTenantId, {
    tenantDataOverride: {
      ...tenantDoc,
      mpConfigured: nextMpConfigured,
      updatedAt: nowIso,
    },
  });

  const hasDemoEnvToken =
    tenantDoc.isDemo && Boolean((process.env.MP_ACCESS_TOKEN || '').trim());
  const isDemoFallbackActive = !hasOwnToken && hasDemoEnvToken;

  return {
    configured: hasOwnToken || isDemoFallbackActive,
    maskedAccessToken: nextMaskedToken,
    hasWebhookSecret: Boolean(nextWebhookSecret),
    isDemoFallbackActive,
    webhookUrl: buildTenantWebhookUrl(validTenantId),
    updatedAt: nowIso,
  };
};

export const adminGetPaymentSettingsSummary = onCall<AdminGetPaymentSettingsPayload>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const db = admin.firestore();
    const tenantId = validateTenantIdOrThrow(request.data?.tenantId);
    await assertTenantRole(request, db, tenantId, ['owner']);
    return adminGetPaymentSettingsSummaryCore(db, tenantId);
  }
);

export const adminSavePaymentSettings = onCall<AdminSavePaymentSettingsPayload>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const db = admin.firestore();
    const tenantId = validateTenantIdOrThrow(request.data?.tenantId);
    const actor = await assertTenantRole(request, db, tenantId, ['owner']);
    return adminSavePaymentSettingsCore(db, tenantId, actor.uid, {
      mpAccessToken: request.data?.mpAccessToken,
      mpWebhookSecret: request.data?.mpWebhookSecret,
      mpPublicKey: request.data?.mpPublicKey,
      clearCredentials: request.data?.clearCredentials,
    });
  }
);
