import {
  signInWithEmailAndPassword,
  signOut,
  onIdTokenChanged,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { TENANT_ID_REGEX } from '../config/tenantConstants';
import type { AuthUser, TenantRole, TurnosCustomClaims } from '../types';

export interface NormalizedCustomClaims {
  platformAdmin: boolean;
  tenants: Record<string, TenantRole>;
}

const isValidTenantRole = (value: unknown): value is TenantRole =>
  value === 'owner' || value === 'staff';

export const extractCustomClaims = (
  rawClaims: Record<string, unknown> | null | undefined
): NormalizedCustomClaims => {
  if (!rawClaims || typeof rawClaims !== 'object') {
    return { platformAdmin: false, tenants: {} };
  }

  const platformAdmin = rawClaims.platformAdmin === true;
  const tenants: Record<string, TenantRole> = {};
  const rawTenants = rawClaims.tenants;

  if (rawTenants && typeof rawTenants === 'object' && !Array.isArray(rawTenants)) {
    for (const [tenantId, role] of Object.entries(rawTenants as Record<string, unknown>)) {
      if (TENANT_ID_REGEX.test(tenantId) && isValidTenantRole(role)) {
        tenants[tenantId] = role;
      }
    }
  }

  return { platformAdmin, tenants };
};

export const getTenantRoleFromClaims = (
  userOrClaims: Pick<AuthUser, 'platformAdmin' | 'tenants'> | TurnosCustomClaims | null | undefined,
  tenantId: string
): TenantRole | null => {
  if (!userOrClaims || !TENANT_ID_REGEX.test(tenantId)) {
    return null;
  }
  if (userOrClaims.platformAdmin === true) {
    return 'owner';
  }
  const role = userOrClaims.tenants?.[tenantId];
  return isValidTenantRole(role) ? role : null;
};

export const hasTenantAccess = (
  userOrClaims: Pick<AuthUser, 'platformAdmin' | 'tenants'> | TurnosCustomClaims | null | undefined,
  tenantId: string
): boolean => getTenantRoleFromClaims(userOrClaims, tenantId) !== null;

export const canManageTenantSettings = (
  userOrClaims: Pick<AuthUser, 'platformAdmin' | 'tenants'> | TurnosCustomClaims | null | undefined,
  tenantId: string
): boolean => getTenantRoleFromClaims(userOrClaims, tenantId) === 'owner';

export const mapFirebaseUser = (
  user: FirebaseUser | null,
  rawClaims?: Record<string, unknown> | null
): AuthUser | null => {
  if (!user) return null;
  const claims = extractCustomClaims(rawClaims);
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Administrador',
    platformAdmin: claims.platformAdmin,
    tenants: claims.tenants,
  };
};

export const resolveAuthUser = async (
  firebaseUser: FirebaseUser | null,
  forceRefresh = false
): Promise<AuthUser | null> => {
  if (!firebaseUser) return null;
  try {
    const tokenResult = await firebaseUser.getIdTokenResult(forceRefresh);
    return mapFirebaseUser(firebaseUser, tokenResult.claims);
  } catch (error) {
    console.warn('[Auth] No se pudieron obtener los Custom Claims del usuario:', error);
    return mapFirebaseUser(firebaseUser, null);
  }
};

export const loginWithEmail = async (email: string, password: string): Promise<AuthUser> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const mappedUser = await resolveAuthUser(userCredential.user, false);
  if (!mappedUser) {
    throw new Error('No se pudo recuperar la información del usuario.');
  }
  return mappedUser;
};

export const areAuthUsersEqual = (
  a: AuthUser | null | undefined,
  b: AuthUser | null | undefined
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (
    a.uid !== b.uid ||
    a.email !== b.email ||
    a.displayName !== b.displayName ||
    a.platformAdmin !== b.platformAdmin
  ) {
    return false;
  }

  const aEntries = Object.entries(a.tenants ?? {});
  const bEntries = Object.entries(b.tenants ?? {});
  if (aEntries.length !== bEntries.length) return false;

  for (const [tenantId, role] of aEntries) {
    if (b.tenants?.[tenantId] !== role) return false;
  }
  return true;
};

export const isCurrentAuthUser = (uid: string | null | undefined): boolean =>
  Boolean(uid && auth.currentUser?.uid === uid);

export const refreshCurrentUserClaims = async (): Promise<AuthUser | null> => {
  if (!auth.currentUser) return null;
  return resolveAuthUser(auth.currentUser, true);
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export interface OnAuthChangeOptions {
  onAccountTransition?: (nextUid: string | null) => void;
}

export const onAuthChange = (
  callback: (user: AuthUser | null) => void,
  options?: OnAuthChangeOptions
) => {
  let callSeq = 0;
  let unsubscribed = false;
  let lastUid: string | null = null;

  const unsubscribe = onIdTokenChanged(auth, (firebaseUser) => {
    const currentSeq = ++callSeq;
    if (!firebaseUser) {
      lastUid = null;
      if (!unsubscribed) {
        callback(null);
      }
      return;
    }

    // Account switched (e.g. another tab signed in as a different user): notify
    // immediately so protected views unmount before Firestore rejects stale listeners.
    if (lastUid !== null && lastUid !== firebaseUser.uid && !unsubscribed) {
      options?.onAccountTransition?.(firebaseUser.uid);
    }
    lastUid = firebaseUser.uid;

    void resolveAuthUser(firebaseUser, false).then((resolvedUser) => {
      if (!unsubscribed && currentSeq === callSeq) {
        callback(resolvedUser);
      }
    });
  });

  return () => {
    unsubscribed = true;
    unsubscribe();
  };
};
