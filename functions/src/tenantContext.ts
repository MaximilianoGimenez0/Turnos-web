import type * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export const TENANTS_COLLECTION = 'tenants';
export const TENANT_SLUGS_COLLECTION = 'tenant_slugs';

export const DEFAULT_DEMO_SLUG = 'demo';
export const DEFAULT_DEMO_TENANT_ID = 'tnt_demo';
export const DEFAULT_TENANT_TIMEZONE = 'America/Argentina/Buenos_Aires';
export const DEFAULT_TENANT_CURRENCY = 'ARS' as const;

export const TENANT_SLUG_MIN_LENGTH = 3;
export const TENANT_SLUG_MAX_LENGTH = 40;

export const TENANT_ID_REGEX = /^tnt_[a-z0-9]{4,32}$/;
export const TENANT_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const RESERVED_TENANT_SLUGS: ReadonlySet<string> = new Set([
  'admin',
  'superadmin',
  'login',
  'logout',
  'api',
  'payment',
  'about',
  'prices',
  'assets',
  'default',
  'artifacts',
  'auth',
  'static',
  'app',
  'www',
  'root',
  'system',
  'null',
  'undefined',
]);

export type TenantStatus = 'active' | 'suspended';
export type TenantRole = 'owner' | 'staff';
export type TenantCurrency = 'ARS';

export interface TurnosCustomClaims {
  platformAdmin?: boolean;
  tenants?: Record<string, TenantRole>;
}

export interface TenantDoc {
  id: string;
  slug: string;
  previousSlugs?: string[];
  name: string;
  status: TenantStatus;
  isDemo: boolean;
  mpConfigured: boolean;
  timezone: string;
  currency: TenantCurrency;
  createdAt: string;
  updatedAt: string;
  createdByUid: string;
}

export interface TenantMemberDoc {
  uid: string;
  email: string;
  displayName?: string;
  role: TenantRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantPrivateIntegrationsDoc {
  mpAccessToken?: string | null;
  mpWebhookSecret?: string | null;
  mpPublicKey?: string | null;
  maskedAccessToken?: string | null;
  updatedAt: string;
  updatedByUid: string;
}

export interface CallableAuthContext {
  auth?: {
    uid: string;
    token: Record<string, unknown>;
  };
}

export interface AuthorizedTenantActor {
  uid: string;
  role: TenantRole;
  isPlatformAdmin: boolean;
}

export const getTenantDocRef = (
  db: admin.firestore.Firestore,
  tenantId: string
): admin.firestore.DocumentReference => db.collection(TENANTS_COLLECTION).doc(tenantId);

export const getTenantSubcollectionRef = (
  db: admin.firestore.Firestore,
  tenantId: string,
  subcollection: string
): admin.firestore.CollectionReference =>
  db.collection(TENANTS_COLLECTION).doc(tenantId).collection(subcollection);

export const getTenantSlotsCollection = (
  db: admin.firestore.Firestore,
  tenantId: string
): admin.firestore.CollectionReference => getTenantSubcollectionRef(db, tenantId, 'slots');

export const getTenantServicesCollection = (
  db: admin.firestore.Firestore,
  tenantId: string
): admin.firestore.CollectionReference => getTenantSubcollectionRef(db, tenantId, 'services');

export const getTenantMembersCollection = (
  db: admin.firestore.Firestore,
  tenantId: string
): admin.firestore.CollectionReference => getTenantSubcollectionRef(db, tenantId, 'members');

export const getTenantOwnerProfileRef = (
  db: admin.firestore.Firestore,
  tenantId: string
): admin.firestore.DocumentReference =>
  getTenantSubcollectionRef(db, tenantId, 'ownerinfo').doc('profile');

export const getTenantAvailabilityRef = (
  db: admin.firestore.Firestore,
  tenantId: string
): admin.firestore.DocumentReference =>
  getTenantSubcollectionRef(db, tenantId, 'public_meta').doc('availability');

export const getTenantIntegrationsRef = (
  db: admin.firestore.Firestore,
  tenantId: string
): admin.firestore.DocumentReference =>
  getTenantSubcollectionRef(db, tenantId, 'private_config').doc('integrations');

export const getTenantPaymentAttemptsCollection = (
  db: admin.firestore.Firestore,
  tenantId: string
): admin.firestore.CollectionReference =>
  getTenantSubcollectionRef(db, tenantId, 'payment_attempts');

export const getTenantPaymentIncidentsCollection = (
  db: admin.firestore.Firestore,
  tenantId: string
): admin.firestore.CollectionReference =>
  getTenantSubcollectionRef(db, tenantId, 'payment_incidents');

export const getTenantSlugDocRef = (
  db: admin.firestore.Firestore,
  slug: string
): admin.firestore.DocumentReference => db.collection(TENANT_SLUGS_COLLECTION).doc(slug);

export const isValidTenantId = (raw: unknown): raw is string =>
  typeof raw === 'string' && TENANT_ID_REGEX.test(raw);

export const validateTenantIdOrThrow = (raw: unknown): string => {
  if (!isValidTenantId(raw)) {
    throw new HttpsError(
      'invalid-argument',
      'El identificador de negocio (tenantId) es inválido o está ausente.'
    );
  }
  return raw;
};

export const validateTenantSlugOrThrow = (raw: unknown): string => {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'El slug del negocio es obligatorio.');
  }
  if (raw !== raw.trim()) {
    throw new HttpsError(
      'invalid-argument',
      'El slug no debe contener espacios al inicio ni al final.'
    );
  }
  if (raw.length < TENANT_SLUG_MIN_LENGTH || raw.length > TENANT_SLUG_MAX_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `El slug debe tener entre ${TENANT_SLUG_MIN_LENGTH} y ${TENANT_SLUG_MAX_LENGTH} caracteres.`
    );
  }
  if (!TENANT_SLUG_REGEX.test(raw)) {
    throw new HttpsError(
      'invalid-argument',
      'El slug solo puede contener minúsculas, números y guiones simples.'
    );
  }
  if (RESERVED_TENANT_SLUGS.has(raw)) {
    throw new HttpsError(
      'invalid-argument',
      `El slug "${raw}" está reservado por la plataforma.`
    );
  }
  return raw;
};

export const isValidTimezone = (timezone: string): boolean => {
  if (!timezone || typeof timezone !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

export const assertPlatformAdmin = (
  request: CallableAuthContext
): { uid: string; email?: string } => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  }
  if (request.auth.token?.platformAdmin !== true) {
    throw new HttpsError(
      'permission-denied',
      'Se requieren permisos de administrador de plataforma.'
    );
  }
  return {
    uid: request.auth.uid,
    email: typeof request.auth.token.email === 'string' ? request.auth.token.email : undefined,
  };
};

export const assertTenantRole = async (
  request: CallableAuthContext,
  db: admin.firestore.Firestore,
  tenantId: string,
  allowedRoles: readonly TenantRole[]
): Promise<AuthorizedTenantActor> => {
  const validTenantId = validateTenantIdOrThrow(tenantId);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  }

  if (request.auth.token?.platformAdmin === true) {
    return {
      uid: request.auth.uid,
      role: 'owner',
      isPlatformAdmin: true,
    };
  }

  const rawTenantsClaim = request.auth.token?.tenants;
  if (rawTenantsClaim && typeof rawTenantsClaim === 'object' && !Array.isArray(rawTenantsClaim)) {
    const claimedRole = (rawTenantsClaim as Record<string, unknown>)[validTenantId];
    if (
      (claimedRole === 'owner' || claimedRole === 'staff') &&
      allowedRoles.includes(claimedRole)
    ) {
      return {
        uid: request.auth.uid,
        role: claimedRole,
        isPlatformAdmin: false,
      };
    }
  }

  // Fallback to authoritative member doc when JWT custom claims have not refreshed yet.
  const memberSnap = await getTenantMembersCollection(db, validTenantId)
    .doc(request.auth.uid)
    .get();
  if (memberSnap.exists) {
    const memberData = (memberSnap.data() || {}) as Record<string, unknown>;
    const memberRole = memberData.role;
    if (
      memberData.active === true &&
      (memberRole === 'owner' || memberRole === 'staff') &&
      allowedRoles.includes(memberRole)
    ) {
      return {
        uid: request.auth.uid,
        role: memberRole,
        isPlatformAdmin: false,
      };
    }
  }

  throw new HttpsError('permission-denied', 'No tenés permisos sobre este negocio.');
};

const normalizeTenantDoc = (id: string, data: Record<string, unknown>): TenantDoc => ({
  id,
  slug: typeof data.slug === 'string' ? data.slug.trim() : '',
  previousSlugs: Array.isArray(data.previousSlugs)
    ? data.previousSlugs.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : undefined,
  name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Turneado',
  status: data.status === 'suspended' ? 'suspended' : 'active',
  isDemo: data.isDemo === true,
  mpConfigured: data.mpConfigured === true,
  timezone:
    typeof data.timezone === 'string' && isValidTimezone(data.timezone.trim())
      ? data.timezone.trim()
      : DEFAULT_TENANT_TIMEZONE,
  currency: data.currency === 'ARS' ? 'ARS' : DEFAULT_TENANT_CURRENCY,
  createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
  updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
  createdByUid: typeof data.createdByUid === 'string' ? data.createdByUid : '',
});

export const getTenantOrThrow = async (
  db: admin.firestore.Firestore,
  tenantId: string
): Promise<TenantDoc> => {
  const validTenantId = validateTenantIdOrThrow(tenantId);
  const snap = await getTenantDocRef(db, validTenantId).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'El negocio solicitado no existe.');
  }
  return normalizeTenantDoc(snap.id, (snap.data() || {}) as Record<string, unknown>);
};

export const getActiveTenantOrThrow = async (
  db: admin.firestore.Firestore,
  tenantId: string
): Promise<TenantDoc> => {
  const tenant = await getTenantOrThrow(db, tenantId);
  if (tenant.status !== 'active') {
    throw new HttpsError(
      'failed-precondition',
      'Este negocio se encuentra temporalmente suspendido.'
    );
  }
  return tenant;
};

export const assertActiveTenant = getActiveTenantOrThrow;

export const extractTenantIdFromSlotRef = (
  ref: admin.firestore.DocumentReference
): string | null => {
  const collectionRef = ref.parent;
  if (!collectionRef || collectionRef.id !== 'slots') return null;
  const tenantDocRef = collectionRef.parent;
  if (!tenantDocRef || !isValidTenantId(tenantDocRef.id)) return null;
  const tenantsColRef = tenantDocRef.parent;
  if (tenantsColRef && tenantsColRef.id !== TENANTS_COLLECTION) return null;
  return tenantDocRef.id;
};
