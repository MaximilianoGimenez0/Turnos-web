import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  canManageTenantSettings,
  getTenantRoleFromClaims,
  hasTenantAccess,
  loginWithEmail,
  logout,
  mapFirebaseUser,
  onAuthChange,
  refreshCurrentUserClaims,
} from '../../src/services/auth';
import { initTestEmulators } from '../setup/emulatorConfig';
import {
  createTestUser,
  createTestUserWithClaims,
  resetTestEnvironment,
  seedFirestoreDocument,
  seedTestTenant,
  signOutTestUser,
} from '../setup/testEnvironment';
import { createTenantMemberFixture } from '../setup/fixtures';
import type { AuthUser } from '../../src/types';

async function waitFor<T>(
  predicate: () => Promise<T | null | undefined | false>,
  timeoutMs = 8000,
  intervalMs = 200
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await predicate();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

describe('Integración - authService y Custom Claims con Auth + Functions Emulators', () => {
  const testPassword = 'Password123!';
  const ownerAEmail = 'owner-auth-a@turnosweb.com';
  const staffAEmail = 'staff-auth-a@turnosweb.com';
  const newMemberEmail = 'nuevo-miembro@turnosweb.com';
  const tenantAId = 'tnt_autha';
  const tenantBId = 'tnt_authb';

  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await resetTestEnvironment();
  });

  it('mapFirebaseUser mapea correctamente usuario nulo y usuario con claims', () => {
    expect(mapFirebaseUser(null)).toBeNull();

    const mockFirebaseUser = {
      uid: 'u-123',
      email: 'owner@estudio.com',
      displayName: 'Dueña Estudio',
    };
    const mapped = mapFirebaseUser(
      mockFirebaseUser as unknown as Parameters<typeof mapFirebaseUser>[0],
      { platformAdmin: false, tenants: { [tenantAId]: 'owner' } }
    );
    expect(mapped).toEqual({
      uid: 'u-123',
      email: 'owner@estudio.com',
      displayName: 'Dueña Estudio',
      platformAdmin: false,
      tenants: { [tenantAId]: 'owner' },
    });
  });

  it('loginWithEmail recupera AuthUser con claims.tenants y rechaza acceso cruzado', async () => {
    await createTestUserWithClaims(ownerAEmail, testPassword, {
      platformAdmin: false,
      tenants: { [tenantAId]: 'owner' },
    });
    await createTestUserWithClaims(staffAEmail, testPassword, {
      platformAdmin: false,
      tenants: { [tenantAId]: 'staff' },
    });
    await signOutTestUser();

    const ownerUser = await loginWithEmail(ownerAEmail, testPassword);
    expect(ownerUser.email).toBe(ownerAEmail);
    expect(ownerUser.platformAdmin).toBe(false);
    expect(ownerUser.tenants).toEqual({ [tenantAId]: 'owner' });
    expect(hasTenantAccess(ownerUser, tenantAId)).toBe(true);
    expect(canManageTenantSettings(ownerUser, tenantAId)).toBe(true);
    expect(hasTenantAccess(ownerUser, tenantBId)).toBe(false);
    expect(getTenantRoleFromClaims(ownerUser, tenantBId)).toBeNull();

    await logout();

    const staffUser = await loginWithEmail(staffAEmail, testPassword);
    expect(staffUser.tenants).toEqual({ [tenantAId]: 'staff' });
    expect(hasTenantAccess(staffUser, tenantAId)).toBe(true);
    expect(canManageTenantSettings(staffUser, tenantAId)).toBe(false);
    expect(hasTenantAccess(staffUser, tenantBId)).toBe(false);
  });

  it('falla al iniciar sesión con contraseña incorrecta', async () => {
    await createTestUser(ownerAEmail, testPassword);
    await signOutTestUser();

    await expect(loginWithEmail(ownerAEmail, 'WrongPassword999!')).rejects.toThrow();
  });

  it('onAuthChange emite AuthUser con claims tras login y null tras logout', async () => {
    await createTestUserWithClaims(ownerAEmail, testPassword, {
      tenants: { [tenantAId]: 'owner' },
    });
    await signOutTestUser();

    const authPromise = new Promise<AuthUser>((resolve) => {
      const unsubscribe = onAuthChange((user) => {
        if (user && user.email === ownerAEmail) {
          unsubscribe();
          resolve(user);
        }
      });
    });

    await loginWithEmail(ownerAEmail, testPassword);
    const observedUser = await authPromise;
    expect(observedUser.tenants[tenantAId]).toBe('owner');

    const logoutPromise = new Promise<AuthUser | null>((resolve) => {
      const unsubscribe = onAuthChange((user) => {
        if (user === null) {
          unsubscribe();
          resolve(user);
        }
      });
    });

    await logout();
    expect(await logoutPromise).toBeNull();
  });

  it('refreshCurrentUserClaims refleja claims sincronizados tras asignar membresía en Firestore', async () => {
    await seedTestTenant({
      tenantId: tenantAId,
      slug: 'estudio-auth-a',
      name: 'Estudio Auth A',
    });

    const credential = await createTestUser(newMemberEmail, testPassword);
    const memberUid = credential.user.uid;
    await signOutTestUser();

    const initialUser = await loginWithEmail(newMemberEmail, testPassword);
    expect(hasTenantAccess(initialUser, tenantAId)).toBe(false);

    // Assigning membership triggers syncMemberClaims in Functions Emulator
    const memberDoc = createTenantMemberFixture({
      uid: memberUid,
      email: newMemberEmail,
      role: 'owner',
      active: true,
    });
    await seedFirestoreDocument(
      `tenants/${tenantAId}/members/${memberUid}`,
      memberDoc as unknown as Record<string, unknown>
    );

    const refreshedUser = await waitFor(async () => {
      const updated = await refreshCurrentUserClaims();
      return updated && updated.tenants[tenantAId] === 'owner' ? updated : null;
    });

    expect(refreshedUser.tenants[tenantAId]).toBe('owner');
    expect(hasTenantAccess(refreshedUser, tenantAId)).toBe(true);
    expect(canManageTenantSettings(refreshedUser, tenantAId)).toBe(true);
  });
});
