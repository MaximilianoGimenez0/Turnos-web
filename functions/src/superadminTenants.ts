import { randomBytes } from 'crypto';
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { isValidEmail } from './bookingValidation';
import {
  assertPlatformAdmin,
  DEFAULT_TENANT_CURRENCY,
  DEFAULT_TENANT_TIMEZONE,
  getTenantAvailabilityRef,
  getTenantDocRef,
  getTenantIntegrationsRef,
  getTenantMembersCollection,
  getTenantOrThrow,
  getTenantOwnerProfileRef,
  getTenantSlugDocRef,
  isValidTimezone,
  validateTenantIdOrThrow,
  validateTenantSlugOrThrow,
  type TenantRole,
  type TenantStatus,
} from './tenantContext';
import {
  pickPublicOwnerProfile,
  syncTenantBootstrap,
  syncTenantMemberClaims,
  type AuthClaimsClient,
} from './tenantSync';
import { sanitizeTenantAppearance } from './tenantAppearance';

export interface SuperAdminAuthClient extends AuthClaimsClient {
  getUserByEmail(email: string): Promise<{ uid: string; email?: string; displayName?: string }>;
  createUser(properties: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<{ uid: string; email?: string; displayName?: string }>;
  deleteUser(uid: string): Promise<void>;
}

export interface SuperAdminCreateTenantPayload {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPassword?: string;
  timezone?: string;
  isDemo?: boolean;
}

export interface SuperAdminUpdateTenantPayload {
  tenantId: string;
  status?: TenantStatus;
  name?: string;
  timezone?: string;
  isDemo?: boolean;
}

export interface SuperAdminChangeTenantSlugPayload {
  tenantId: string;
  newSlug: string;
}

export interface SuperAdminUpsertTenantMemberPayload {
  tenantId: string;
  email: string;
  role: TenantRole;
  active: boolean;
}

const generateTenantId = (): string => `tnt_${randomBytes(6).toString('hex')}`;

export const superadminCreateTenantCore = async (
  db: admin.firestore.Firestore,
  authClient: SuperAdminAuthClient,
  actorUid: string,
  payload: SuperAdminCreateTenantPayload
): Promise<{ tenantId: string; slug: string; ownerUid: string }> => {
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  if (name.length < 2 || name.length > 100) {
    throw new HttpsError(
      'invalid-argument',
      'El nombre del negocio debe tener entre 2 y 100 caracteres.'
    );
  }

  const slug = validateTenantSlugOrThrow(payload?.slug);
  const ownerEmail =
    typeof payload?.ownerEmail === 'string' ? payload.ownerEmail.trim().toLowerCase() : '';
  if (!isValidEmail(ownerEmail)) {
    throw new HttpsError('invalid-argument', 'El email del dueño no tiene un formato válido.');
  }

  const timezone =
    typeof payload?.timezone === 'string' && payload.timezone.trim()
      ? payload.timezone.trim()
      : DEFAULT_TENANT_TIMEZONE;
  if (!isValidTimezone(timezone)) {
    throw new HttpsError('invalid-argument', `La zona horaria "${timezone}" es inválida.`);
  }

  const isDemo = payload?.isDemo === true;

  // Fail fast before creating an Auth user if the slug is already taken
  const preCheckSlugSnap = await getTenantSlugDocRef(db, slug).get();
  if (preCheckSlugSnap.exists) {
    throw new HttpsError('already-exists', `El slug "${slug}" ya está en uso.`);
  }

  let ownerUid: string;
  let ownerDisplayName: string;
  let createdAuthUser = false;

  try {
    const existingUser = await authClient.getUserByEmail(ownerEmail);
    ownerUid = existingUser.uid;
    ownerDisplayName = existingUser.displayName || name;
  } catch (err: unknown) {
    const code = (err as { code?: string } | undefined)?.code;
    if (code !== 'auth/user-not-found') {
      throw err;
    }

    const rawPassword =
      typeof payload?.ownerPassword === 'string' && payload.ownerPassword.trim()
        ? payload.ownerPassword.trim()
        : randomBytes(16).toString('base64url');
    if (rawPassword.length < 6) {
      throw new HttpsError(
        'invalid-argument',
        'La contraseña inicial del dueño debe tener al menos 6 caracteres.'
      );
    }

    const created = await authClient.createUser({
      email: ownerEmail,
      password: rawPassword,
      displayName: name,
    });
    ownerUid = created.uid;
    ownerDisplayName = created.displayName || name;
    createdAuthUser = true;
  }

  const tenantId = generateTenantId();
  const nowIso = new Date().toISOString();

  const ownerProfile = {
    name,
    businessName: name,
    role: '',
    description: '',
    pictureUrl: '',
    heroImageUrl: '',
    logoUrl: '',
    instagram: '',
    phone: '',
    email: ownerEmail,
    location: '',
    updatedAt: nowIso,
  };

  const memberDoc = {
    uid: ownerUid,
    email: ownerEmail,
    displayName: ownerDisplayName,
    role: 'owner' as TenantRole,
    active: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await db.runTransaction(async (transaction) => {
      const slugRef = getTenantSlugDocRef(db, slug);
      const slugSnap = await transaction.get(slugRef);
      if (slugSnap.exists) {
        throw new HttpsError('already-exists', `El slug "${slug}" ya está en uso.`);
      }

      transaction.set(getTenantDocRef(db, tenantId), {
        id: tenantId,
        slug,
        previousSlugs: [],
        name,
        status: 'active',
        isDemo,
        mpConfigured: isDemo,
        timezone,
        currency: DEFAULT_TENANT_CURRENCY,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdByUid: actorUid,
      });

      transaction.set(getTenantOwnerProfileRef(db, tenantId), ownerProfile);

      transaction.set(getTenantAvailabilityRef(db, tenantId), {
        slots: {},
        updatedAt: nowIso,
      });

      transaction.set(getTenantMembersCollection(db, tenantId).doc(ownerUid), memberDoc);

      transaction.set(slugRef, {
        tenantId,
        slug,
        status: 'active',
        redirectToSlug: null,
        timezone,
        currency: DEFAULT_TENANT_CURRENCY,
        mpConfigured: isDemo,
        isDemo,
        ownerProfile,
        updatedAt: nowIso,
      });
    });
  } catch (err) {
    if (createdAuthUser) {
      await authClient.deleteUser(ownerUid).catch(() => {});
    }
    throw err;
  }

  await syncTenantMemberClaims(authClient, tenantId, ownerUid, memberDoc);

  return { tenantId, slug, ownerUid };
};

export const superadminUpdateTenantCore = async (
  db: admin.firestore.Firestore,
  payload: SuperAdminUpdateTenantPayload
): Promise<{ success: true; tenantId: string }> => {
  const tenantId = validateTenantIdOrThrow(payload?.tenantId);
  const [tenantDoc, integrationsSnap] = await Promise.all([
    getTenantOrThrow(db, tenantId),
    getTenantIntegrationsRef(db, tenantId).get(),
  ]);

  const updates: Record<string, unknown> = {};

  if (payload.status !== undefined) {
    if (payload.status !== 'active' && payload.status !== 'suspended') {
      throw new HttpsError('invalid-argument', 'Estado de negocio inválido.');
    }
    updates.status = payload.status;
  }

  if (payload.name !== undefined) {
    const cleanName = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (cleanName.length < 2 || cleanName.length > 100) {
      throw new HttpsError(
        'invalid-argument',
        'El nombre del negocio debe tener entre 2 y 100 caracteres.'
      );
    }
    updates.name = cleanName;
  }

  if (payload.timezone !== undefined) {
    const cleanTz = typeof payload.timezone === 'string' ? payload.timezone.trim() : '';
    if (!isValidTimezone(cleanTz)) {
      throw new HttpsError('invalid-argument', `La zona horaria "${cleanTz}" es inválida.`);
    }
    updates.timezone = cleanTz;
  }

  const nextIsDemo = payload.isDemo !== undefined ? Boolean(payload.isDemo) : tenantDoc.isDemo;
  if (payload.isDemo !== undefined) {
    updates.isDemo = nextIsDemo;
  }

  const integrationsData = integrationsSnap.exists
    ? ((integrationsSnap.data() || {}) as Record<string, unknown>)
    : {};
  const hasOwnToken =
    typeof integrationsData.mpAccessToken === 'string' &&
    integrationsData.mpAccessToken.trim().length > 0;
  const nextMpConfigured = Boolean(hasOwnToken || nextIsDemo);

  const nowIso = new Date().toISOString();
  updates.mpConfigured = nextMpConfigured;
  updates.updatedAt = nowIso;

  await getTenantDocRef(db, tenantId).update(updates);
  await syncTenantBootstrap(db, tenantId, {
    tenantDataOverride: {
      ...tenantDoc,
      ...updates,
    },
  });

  return { success: true, tenantId };
};

export const superadminChangeTenantSlugCore = async (
  db: admin.firestore.Firestore,
  payload: SuperAdminChangeTenantSlugPayload
): Promise<{ success: true; tenantId: string; previousSlug: string; newSlug: string }> => {
  const tenantId = validateTenantIdOrThrow(payload?.tenantId);
  const newSlug = validateTenantSlugOrThrow(payload?.newSlug);
  const nowIso = new Date().toISOString();

  const previousSlug = await db.runTransaction(async (transaction) => {
    const tenantRef = getTenantDocRef(db, tenantId);
    const tenantSnap = await transaction.get(tenantRef);
    if (!tenantSnap.exists) {
      throw new HttpsError('not-found', 'El negocio solicitado no existe.');
    }

    const tenantData = (tenantSnap.data() || {}) as Record<string, unknown>;
    const currentSlug = typeof tenantData.slug === 'string' ? tenantData.slug.trim() : '';
    if (currentSlug === newSlug) {
      return currentSlug;
    }

    const newSlugRef = getTenantSlugDocRef(db, newSlug);
    const newSlugSnap = await transaction.get(newSlugRef);
    if (newSlugSnap.exists && newSlugSnap.data()?.tenantId !== tenantId) {
      throw new HttpsError('already-exists', `El slug "${newSlug}" ya pertenece a otro negocio.`);
    }

    const ownerSnap = await transaction.get(getTenantOwnerProfileRef(db, tenantId));
    const rawOwnerData = ownerSnap.exists
      ? ((ownerSnap.data() || {}) as Record<string, unknown>)
      : null;
    const ownerProfile = pickPublicOwnerProfile(rawOwnerData);
    const appearance = sanitizeTenantAppearance(rawOwnerData?.appearance);

    const existingPrevious = Array.isArray(tenantData.previousSlugs)
      ? tenantData.previousSlugs.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : [];
    const nextPreviousSlugs = Array.from(
      new Set([...existingPrevious, ...(currentSlug ? [currentSlug] : [])])
    ).filter((s) => s !== newSlug);

    const commonBootstrap = {
      tenantId,
      status: tenantData.status === 'suspended' ? 'suspended' : 'active',
      timezone:
        typeof tenantData.timezone === 'string' && isValidTimezone(tenantData.timezone.trim())
          ? tenantData.timezone.trim()
          : DEFAULT_TENANT_TIMEZONE,
      currency: tenantData.currency === 'ARS' ? 'ARS' : DEFAULT_TENANT_CURRENCY,
      mpConfigured: tenantData.mpConfigured === true,
      isDemo: tenantData.isDemo === true,
      ownerProfile,
      appearance,
      updatedAt: nowIso,
    };

    transaction.set(newSlugRef, {
      ...commonBootstrap,
      slug: newSlug,
      redirectToSlug: null,
    });

    if (currentSlug) {
      transaction.set(getTenantSlugDocRef(db, currentSlug), {
        ...commonBootstrap,
        slug: currentSlug,
        redirectToSlug: newSlug,
      });
    }

    transaction.update(tenantRef, {
      slug: newSlug,
      previousSlugs: nextPreviousSlugs,
      updatedAt: nowIso,
    });

    return currentSlug;
  });

  return {
    success: true,
    tenantId,
    previousSlug,
    newSlug,
  };
};

export const superadminUpsertTenantMemberCore = async (
  db: admin.firestore.Firestore,
  authClient: SuperAdminAuthClient,
  payload: SuperAdminUpsertTenantMemberPayload
): Promise<{ success: true; uid: string; role: TenantRole; active: boolean }> => {
  const tenantId = validateTenantIdOrThrow(payload?.tenantId);
  const normalizedEmail =
    typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!isValidEmail(normalizedEmail)) {
    throw new HttpsError('invalid-argument', 'El email del miembro no tiene un formato válido.');
  }
  if (payload?.role !== 'owner' && payload?.role !== 'staff') {
    throw new HttpsError('invalid-argument', 'El rol debe ser "owner" o "staff".');
  }
  if (typeof payload?.active !== 'boolean') {
    throw new HttpsError('invalid-argument', 'El estado "active" debe ser booleano.');
  }

  await getTenantOrThrow(db, tenantId);

  let userRecord: { uid: string; email?: string; displayName?: string };
  try {
    userRecord = await authClient.getUserByEmail(normalizedEmail);
  } catch (err: unknown) {
    const code = (err as { code?: string } | undefined)?.code;
    if (code === 'auth/user-not-found') {
      throw new HttpsError(
        'not-found',
        'No existe un usuario registrado en Firebase Auth con ese correo electrónico.'
      );
    }
    throw err;
  }

  const memberRef = getTenantMembersCollection(db, tenantId).doc(userRecord.uid);
  const existingSnap = await memberRef.get();
  const nowIso = new Date().toISOString();
  const createdAt =
    existingSnap.exists && typeof existingSnap.data()?.createdAt === 'string'
      ? (existingSnap.data()!.createdAt as string)
      : nowIso;

  const memberDoc = {
    uid: userRecord.uid,
    email: normalizedEmail,
    displayName: userRecord.displayName || '',
    role: payload.role,
    active: payload.active,
    createdAt,
    updatedAt: nowIso,
  };

  await memberRef.set(memberDoc);
  await syncTenantMemberClaims(authClient, tenantId, userRecord.uid, memberDoc);

  return {
    success: true,
    uid: userRecord.uid,
    role: payload.role,
    active: payload.active,
  };
};

export const superadminCreateTenant = onCall<SuperAdminCreateTenantPayload>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const actor = assertPlatformAdmin(request);
    return superadminCreateTenantCore(admin.firestore(), admin.auth(), actor.uid, request.data);
  }
);

export const superadminUpdateTenant = onCall<SuperAdminUpdateTenantPayload>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    assertPlatformAdmin(request);
    return superadminUpdateTenantCore(admin.firestore(), request.data);
  }
);

export const superadminChangeTenantSlug = onCall<SuperAdminChangeTenantSlugPayload>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    assertPlatformAdmin(request);
    return superadminChangeTenantSlugCore(admin.firestore(), request.data);
  }
);

export const superadminUpsertTenantMember = onCall<SuperAdminUpsertTenantMemberPayload>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    assertPlatformAdmin(request);
    return superadminUpsertTenantMemberCore(admin.firestore(), admin.auth(), request.data);
  }
);
