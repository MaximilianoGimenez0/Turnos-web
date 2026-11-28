import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import {
  DEFAULT_TENANT_CURRENCY,
  DEFAULT_TENANT_TIMEZONE,
  getTenantDocRef,
  getTenantOwnerProfileRef,
  getTenantSlugDocRef,
  isValidTenantId,
  isValidTimezone,
  type TenantRole,
} from './tenantContext';
import { sanitizeTenantAppearance } from './tenantAppearance';

export const MAX_CUSTOM_CLAIMS_BYTES = 950;

export interface AuthClaimsClient {
  getUser(uid: string): Promise<{ customClaims?: Record<string, unknown> }>;
  setCustomUserClaims(uid: string, customUserClaims: Record<string, unknown> | null): Promise<void>;
}

const PUBLIC_OWNER_PROFILE_FIELDS = [
  'name',
  'businessName',
  'role',
  'description',
  'pictureUrl',
  'heroImageUrl',
  'logoUrl',
  'instagram',
  'phone',
  'email',
  'location',
  'updatedAt',
] as const;

export const pickPublicOwnerProfile = (
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> => {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, unknown> = {};
  for (const key of PUBLIC_OWNER_PROFILE_FIELDS) {
    const val = raw[key];
    if (typeof val === 'string') {
      result[key] = val;
    }
  }
  return result;
};

export interface SyncTenantBootstrapOptions {
  deletedTenantData?: Record<string, unknown> | null;
  tenantDataOverride?: Record<string, unknown> | null;
  ownerProfileOverride?: Record<string, unknown> | null;
}

export const syncTenantBootstrap = async (
  db: admin.firestore.Firestore,
  tenantId: string,
  options: SyncTenantBootstrapOptions = {}
): Promise<'upserted' | 'deleted' | 'skipped'> => {
  if (!isValidTenantId(tenantId)) {
    logger.warn('[syncTenantBootstrap] tenantId inválido omitido.', { tenantId });
    return 'skipped';
  }

  if (options.deletedTenantData) {
    const oldSlug =
      typeof options.deletedTenantData.slug === 'string'
        ? options.deletedTenantData.slug.trim()
        : '';
    if (!oldSlug) return 'skipped';

    const slugRef = getTenantSlugDocRef(db, oldSlug);
    const slugSnap = await slugRef.get();
    if (slugSnap.exists && slugSnap.data()?.tenantId === tenantId) {
      await slugRef.delete();
      return 'deleted';
    }
    return 'skipped';
  }

  let tenantData = options.tenantDataOverride;
  if (tenantData === undefined) {
    const tenantSnap = await getTenantDocRef(db, tenantId).get();
    tenantData = tenantSnap.exists ? ((tenantSnap.data() || {}) as Record<string, unknown>) : null;
  }

  if (!tenantData) {
    return 'skipped';
  }

  const slug = typeof tenantData.slug === 'string' ? tenantData.slug.trim() : '';
  if (!slug) {
    return 'skipped';
  }

  let ownerProfileData = options.ownerProfileOverride;
  if (ownerProfileData === undefined) {
    const ownerSnap = await getTenantOwnerProfileRef(db, tenantId).get();
    ownerProfileData = ownerSnap.exists
      ? ((ownerSnap.data() || {}) as Record<string, unknown>)
      : null;
  }

  const timezone =
    typeof tenantData.timezone === 'string' && isValidTimezone(tenantData.timezone.trim())
      ? tenantData.timezone.trim()
      : DEFAULT_TENANT_TIMEZONE;

  const sanitizedAppearance = sanitizeTenantAppearance(ownerProfileData?.appearance);

  const bootstrapDoc = {
    tenantId,
    slug,
    status: tenantData.status === 'suspended' ? 'suspended' : 'active',
    redirectToSlug: null,
    timezone,
    currency: tenantData.currency === 'ARS' ? 'ARS' : DEFAULT_TENANT_CURRENCY,
    mpConfigured: tenantData.mpConfigured === true,
    isDemo: tenantData.isDemo === true,
    ownerProfile: pickPublicOwnerProfile(ownerProfileData),
    appearance: sanitizedAppearance,
    updatedAt: new Date().toISOString(),
  };

  await getTenantSlugDocRef(db, slug).set(bootstrapDoc);
  return 'upserted';
};

export const buildNextMemberCustomClaims = (
  currentClaims: Record<string, unknown> | undefined,
  tenantId: string,
  memberData: Record<string, unknown> | null | undefined
): Record<string, unknown> => {
  const nextClaims: Record<string, unknown> = { ...(currentClaims || {}) };
  const existingTenantsRaw = nextClaims.tenants;
  const nextTenants: Record<string, TenantRole> = {};

  if (existingTenantsRaw && typeof existingTenantsRaw === 'object' && !Array.isArray(existingTenantsRaw)) {
    for (const [key, value] of Object.entries(existingTenantsRaw as Record<string, unknown>)) {
      if (value === 'owner' || value === 'staff') {
        nextTenants[key] = value;
      }
    }
  }

  const isActiveMember =
    Boolean(memberData) &&
    memberData?.active === true &&
    (memberData?.role === 'owner' || memberData?.role === 'staff');

  if (isActiveMember) {
    nextTenants[tenantId] = memberData!.role as TenantRole;
  } else {
    delete nextTenants[tenantId];
  }

  if (Object.keys(nextTenants).length > 0) {
    nextClaims.tenants = nextTenants;
  } else {
    delete nextClaims.tenants;
  }

  return nextClaims;
};

export const syncTenantMemberClaims = async (
  authClient: AuthClaimsClient,
  tenantId: string,
  uid: string,
  afterMemberData: Record<string, unknown> | null | undefined
): Promise<{ updated: boolean; claims: Record<string, unknown> | null }> => {
  if (!isValidTenantId(tenantId) || !uid || typeof uid !== 'string') {
    return { updated: false, claims: null };
  }

  let userRecord: { customClaims?: Record<string, unknown> };
  try {
    userRecord = await authClient.getUser(uid);
  } catch (err: unknown) {
    const code = (err as { code?: string } | undefined)?.code;
    if (code === 'auth/user-not-found') {
      logger.warn('[syncTenantMemberClaims] Usuario no encontrado en Auth; se omite sincronización.', {
        tenantId,
        uid,
      });
      return { updated: false, claims: null };
    }
    throw err;
  }

  const nextClaims = buildNextMemberCustomClaims(
    userRecord.customClaims,
    tenantId,
    afterMemberData
  );

  const payloadBytes = Buffer.byteLength(JSON.stringify(nextClaims), 'utf8');
  if (payloadBytes > MAX_CUSTOM_CLAIMS_BYTES) {
    logger.error('[syncTenantMemberClaims] Payload de Custom Claims excede el límite seguro.', {
      tenantId,
      uid,
      payloadBytes,
      maxBytes: MAX_CUSTOM_CLAIMS_BYTES,
    });
    throw new Error(
      `El payload de Custom Claims para ${uid} excede el límite seguro de ${MAX_CUSTOM_CLAIMS_BYTES} bytes (${payloadBytes} bytes).`
    );
  }

  await authClient.setCustomUserClaims(
    uid,
    Object.keys(nextClaims).length > 0 ? nextClaims : null
  );

  return { updated: true, claims: nextClaims };
};

export const onTenantDocWritten = onDocumentWritten(
  {
    document: 'tenants/{tenantId}',
    maxInstances: 10,
    memory: '256MiB',
  },
  async (event) => {
    const db = admin.firestore();
    const tenantId = event.params.tenantId;
    const beforeData = event.data?.before.exists
      ? (event.data.before.data() as Record<string, unknown>)
      : null;
    const afterData = event.data?.after.exists
      ? (event.data.after.data() as Record<string, unknown>)
      : null;

    if (!afterData) {
      // Ignore stale delete triggers if the tenant was immediately recreated (e.g. test reset + re-seed)
      const liveTenant = await getTenantDocRef(db, tenantId).get();
      if (liveTenant.exists) {
        return;
      }
      await syncTenantBootstrap(db, tenantId, { deletedTenantData: beforeData });
      return;
    }

    await syncTenantBootstrap(db, tenantId, { tenantDataOverride: afterData });
  }
);

export const onTenantOwnerInfoWritten = onDocumentWritten(
  {
    document: 'tenants/{tenantId}/ownerinfo/profile',
    maxInstances: 10,
    memory: '256MiB',
  },
  async (event) => {
    const db = admin.firestore();
    const tenantId = event.params.tenantId;
    const afterData = event.data?.after.exists
      ? (event.data.after.data() as Record<string, unknown>)
      : null;

    await syncTenantBootstrap(db, tenantId, { ownerProfileOverride: afterData });
  }
);

export const onTenantMemberWritten = onDocumentWritten(
  {
    document: 'tenants/{tenantId}/members/{uid}',
    maxInstances: 10,
    memory: '256MiB',
  },
  async (event) => {
    const tenantId = event.params.tenantId;
    const uid = event.params.uid;
    const afterData = event.data?.after.exists
      ? (event.data.after.data() as Record<string, unknown>)
      : null;

    await syncTenantMemberClaims(admin.auth(), tenantId, uid, afterData);
  }
);
