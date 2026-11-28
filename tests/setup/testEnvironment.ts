import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../../src/services/firebaseConfig';
import type {
  OwnerInfo,
  PublicAvailabilityDoc,
  TenantDoc,
  TenantMemberDoc,
  TenantPrivateIntegrationsDoc,
  TenantSlugBootstrapDoc,
  TurnosCustomClaims,
} from '../../src/types';
import {
  AUTH_EMULATOR_URL,
  FIRESTORE_EMULATOR_URL,
  PROJECT_ID,
  STORAGE_BUCKET,
  STORAGE_EMULATOR_URL,
  initTestEmulators,
} from './emulatorConfig';
import {
  createOwnerInfoFixture,
  createTenantDocFixture,
  createTenantSlugDocFixture,
} from './fixtures';

type FirestoreRestValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { arrayValue: { values?: FirestoreRestValue[] } }
  | { mapValue: { fields: Record<string, FirestoreRestValue> } };

const toFirestoreRestValue = (value: unknown): FirestoreRestValue => {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toFirestoreRestValue(item)),
      },
    };
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: toFirestoreRestFields(value as Record<string, unknown>),
      },
    };
  }
  return { stringValue: String(value) };
};

const toFirestoreRestFields = (
  data: Record<string, unknown>
): Record<string, FirestoreRestValue> => {
  const fields: Record<string, FirestoreRestValue> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      fields[key] = toFirestoreRestValue(val);
    }
  }
  return fields;
};

export const clearFirestoreData = async (): Promise<void> => {
  const url = `${FIRESTORE_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  try {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      console.warn(`[testEnv] Failed to clear Firestore: ${res.statusText}`);
    }
  } catch (err) {
    console.warn('[testEnv] Could not reach Firestore emulator to clear data:', err);
  }
};

export const clearAuthUsers = async (): Promise<void> => {
  const url = `${AUTH_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/accounts`;
  try {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      console.warn(`[testEnv] Failed to clear Auth: ${res.statusText}`);
    }
  } catch (err) {
    console.warn('[testEnv] Could not reach Auth emulator to clear accounts:', err);
  }
};

export const clearStorageData = async (): Promise<void> => {
  const listUrl = `${STORAGE_EMULATOR_URL}/storage/v1/b/${encodeURIComponent(STORAGE_BUCKET)}/o`;
  try {
    const res = await fetch(listUrl, {
      headers: { Authorization: 'Bearer owner' },
    });
    if (!res.ok) {
      return;
    }
    const payload = (await res.json()) as { items?: Array<{ name?: string }> };
    const items = payload.items ?? [];
    await Promise.all(
      items
        .filter((item): item is { name: string } => Boolean(item.name))
        .map((item) =>
          fetch(
            `${STORAGE_EMULATOR_URL}/storage/v1/b/${encodeURIComponent(STORAGE_BUCKET)}/o/${encodeURIComponent(item.name)}`,
            {
              method: 'DELETE',
              headers: { Authorization: 'Bearer owner' },
            }
          )
        )
    );
  } catch {
    // Storage emulator may not be running in suites that do not use Storage
  }
};

export const seedFirestoreDocument = async (
  docPath: string,
  data: Record<string, unknown>
): Promise<void> => {
  const normalizedPath = docPath.replace(/^\/+/, '');
  const url = `${FIRESTORE_EMULATOR_URL}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${normalizedPath}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer owner',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: toFirestoreRestFields(data),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[testEnv] Failed to seed Firestore doc "${normalizedPath}": ${res.status} ${text}`);
  }
};

export const seedStorageObject = async (
  objectPath: string,
  content: Uint8Array | string,
  contentType = 'image/webp'
): Promise<void> => {
  const normalizedPath = objectPath.replace(/^\/+/, '');
  const url = `${STORAGE_EMULATOR_URL}/upload/storage/v1/b/${encodeURIComponent(STORAGE_BUCKET)}/o?uploadType=media&name=${encodeURIComponent(normalizedPath)}`;
  const body = typeof content === 'string' ? content : Buffer.from(content);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer owner',
      'Content-Type': contentType,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[testEnv] Failed to seed Storage object "${normalizedPath}": ${res.status} ${text}`);
  }
};

export const setTestUserCustomClaims = async (
  uid: string,
  claims: TurnosCustomClaims
): Promise<void> => {
  const url = `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer owner',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      localId: uid,
      customAttributes: JSON.stringify(claims),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[testEnv] Failed to set custom claims for "${uid}": ${res.status} ${text}`);
  }

  if (auth.currentUser && auth.currentUser.uid === uid) {
    await auth.currentUser.getIdToken(true);
  }
};

export const createTestUser = async (
  email = 'admin@turneado.app',
  password = 'Password123!'
) => {
  initTestEmulators();
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const createTestUserWithClaims = async (
  email: string,
  password: string,
  claims: TurnosCustomClaims
): Promise<{ uid: string; email: string }> => {
  const credential = await createTestUser(email, password);
  await setTestUserCustomClaims(credential.user.uid, claims);
  return { uid: credential.user.uid, email };
};

export const signInTestUser = async (
  email = 'admin@turneado.app',
  password = 'Password123!'
) => {
  initTestEmulators();
  return await signInWithEmailAndPassword(auth, email, password);
};

export const signInTestUserWithClaims = async (
  email: string,
  password: string
) => {
  const credential = await signInTestUser(email, password);
  await credential.user.getIdToken(true);
  return credential;
};

export const signOutTestUser = async () => {
  initTestEmulators();
  await signOut(auth);
};

export interface SeedTestTenantOptions {
  tenantId: string;
  slug: string;
  name?: string;
  status?: TenantDoc['status'];
  isDemo?: boolean;
  mpConfigured?: boolean;
  redirectToSlug?: string | null;
  ownerProfile?: Partial<OwnerInfo>;
  availability?: PublicAvailabilityDoc;
  members?: TenantMemberDoc[];
  privateIntegrations?: TenantPrivateIntegrationsDoc;
}

export const seedTestTenant = async (
  options: SeedTestTenantOptions
): Promise<{ tenantDoc: TenantDoc; slugDoc: TenantSlugBootstrapDoc }> => {
  const ownerProfile = createOwnerInfoFixture({
    businessName: options.name ?? `Estudio ${options.slug}`,
    ...options.ownerProfile,
  });

  const tenantDoc = createTenantDocFixture({
    id: options.tenantId,
    slug: options.slug,
    name: options.name ?? `Estudio ${options.slug}`,
    status: options.status ?? 'active',
    isDemo: options.isDemo ?? false,
    mpConfigured: options.mpConfigured ?? Boolean(options.isDemo),
  });

  const slugDoc = createTenantSlugDocFixture({
    tenantId: tenantDoc.id,
    slug: tenantDoc.slug,
    status: tenantDoc.status,
    redirectToSlug: options.redirectToSlug ?? null,
    timezone: tenantDoc.timezone,
    currency: tenantDoc.currency,
    mpConfigured: tenantDoc.mpConfigured,
    isDemo: tenantDoc.isDemo,
    ownerProfile,
    updatedAt: tenantDoc.updatedAt,
  });

  const availabilityDoc: PublicAvailabilityDoc = options.availability ?? {
    slots: {},
    updatedAt: tenantDoc.updatedAt,
  };

  // Redirect aliases live exclusively in /tenant_slugs/{oldSlug}; writing tenants/{id}
  // would clobber the active tenant doc and trigger onTenantDocWritten with redirectToSlug: null.
  if (options.redirectToSlug) {
    await seedFirestoreDocument(
      `tenant_slugs/${slugDoc.slug}`,
      slugDoc as unknown as Record<string, unknown>
    );
    return { tenantDoc, slugDoc };
  }

  // Seed subdocuments (especially ownerinfo/profile) BEFORE tenants/{id} so that when
  // onTenantDocWritten fires in the Functions Emulator it always reads the complete ownerProfile.
  await Promise.all([
    seedFirestoreDocument(
      `tenants/${tenantDoc.id}/ownerinfo/profile`,
      ownerProfile as unknown as Record<string, unknown>
    ),
    seedFirestoreDocument(
      `tenants/${tenantDoc.id}/public_meta/availability`,
      availabilityDoc as unknown as Record<string, unknown>
    ),
    ...(options.members ?? []).map((member) =>
      seedFirestoreDocument(
        `tenants/${tenantDoc.id}/members/${member.uid}`,
        member as unknown as Record<string, unknown>
      )
    ),
    ...(options.privateIntegrations
      ? [
          seedFirestoreDocument(
            `tenants/${tenantDoc.id}/private_config/integrations`,
            options.privateIntegrations as unknown as Record<string, unknown>
          ),
        ]
      : []),
  ]);

  await seedFirestoreDocument(`tenants/${tenantDoc.id}`, tenantDoc as unknown as Record<string, unknown>);
  await seedFirestoreDocument(`tenant_slugs/${slugDoc.slug}`, slugDoc as unknown as Record<string, unknown>);

  return { tenantDoc, slugDoc };
};

export const resetTestEnvironment = async () => {
  initTestEmulators();
  try {
    await signOutTestUser();
  } catch {
    // ignore if already signed out
  }
  await Promise.all([clearFirestoreData(), clearAuthUsers(), clearStorageData()]);
  // Allow any asynchronous Firestore emulator delete triggers (e.g. onTenantDocWritten)
  // to drain before the next test seeds fresh documents.
  await new Promise((resolve) => setTimeout(resolve, 250));
};

export const setupAuthenticatedAdmin = async (
  email = 'admin@turneado.app',
  password = 'Password123!'
) => {
  await resetTestEnvironment();
  await createTestUser(email, password);
  await signInTestUser(email, password);
};
