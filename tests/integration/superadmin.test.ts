import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../../src/services/firebaseConfig';
import { loginWithEmail } from '../../src/services/auth';
import { resolveTenantBySlug } from '../../src/services/tenantService';
import { clearPublicCache } from '../../src/services/publicCache';
import {
  changeTenantSlug,
  createTenant,
  subscribeToAllTenants,
  subscribeToTenantMembers,
  updateTenant,
  upsertTenantMember,
} from '../../src/services/superadminService';
import { AUTH_PORT, EMULATOR_HOST, PROJECT_ID, initTestEmulators } from '../setup/emulatorConfig';
import {
  createTestUser,
  createTestUserWithClaims,
  resetTestEnvironment,
  seedTestTenant,
  signInTestUserWithClaims,
  signOutTestUser,
} from '../setup/testEnvironment';
import { createTenantMemberFixture } from '../setup/fixtures';
import type { TenantDoc, TenantMemberDoc } from '../../src/types';

const execFileAsync = promisify(execFile);
const BOOTSTRAP_SCRIPT_PATH = path.resolve(process.cwd(), 'scripts/bootstrap-platform-admin.mjs');

async function waitFor<T>(
  predicate: () => Promise<T | null | undefined | false> | T | null | undefined | false,
  timeoutMs = 8000,
  intervalMs = 150
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  if (lastError) {
    throw lastError;
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

describe('Integración - Panel /superadmin, Ciclo de Vida de Tenants y Bootstrap CLI', () => {
  const password = 'Password123!';
  const superAdminEmail = 'platform.admin@turneado.app';
  const regularOwnerEmail = 'owner.alpha@turneado.app';
  const regularTenantId = 'tnt_alpha1';
  const regularTenantSlug = 'estudio-alpha';

  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    clearPublicCache();
    await resetTestEnvironment();
  });

  it('bootstrap-platform-admin.mjs promueve y revoca platformAdmin preservando claims tenants existentes', async () => {
    // Usuario que ya es owner de un negocio existente
    await createTestUserWithClaims(superAdminEmail, password, {
      tenants: { [regularTenantId]: 'owner' },
    });
    await signOutTestUser();

    const env = {
      ...process.env,
      FIREBASE_AUTH_EMULATOR_HOST: `${EMULATOR_HOST}:${AUTH_PORT}`,
    };

    // 1) Promover a platformAdmin: true vía script CLI real
    const promoteOut = await execFileAsync(
      process.execPath,
      [BOOTSTRAP_SCRIPT_PATH, '--email', superAdminEmail, '--project', PROJECT_ID],
      { env }
    );
    expect(promoteOut.stdout).toContain('platformAdmin: true');

    const credPromoted = await signInTestUserWithClaims(superAdminEmail, password);
    const promotedClaims = (await credPromoted.user.getIdTokenResult(true)).claims;
    expect(promotedClaims.platformAdmin).toBe(true);
    expect((promotedClaims.tenants as Record<string, string>)?.[regularTenantId]).toBe('owner');

    // 2) Revocar platformAdmin: false preservando el mapa tenants
    const revokeOut = await execFileAsync(
      process.execPath,
      [BOOTSTRAP_SCRIPT_PATH, '--email', superAdminEmail, '--project', PROJECT_ID, '--revoke'],
      { env }
    );
    expect(revokeOut.stdout).toContain('platformAdmin: false');

    const revokedClaims = (await auth.currentUser!.getIdTokenResult(true)).claims;
    expect(revokedClaims.platformAdmin).toBe(false);
    expect((revokedClaims.tenants as Record<string, string>)?.[regularTenantId]).toBe('owner');
  });

  it('ciclo de vida completo: crear Salón Magnolia, login del dueño, cambio de slug con redirect, suspensión, isDemo y gestión de miembros', async () => {
    await createTestUserWithClaims(superAdminEmail, password, {
      platformAdmin: true,
    });
    await signInTestUserWithClaims(superAdminEmail, password);

    let liveTenants: TenantDoc[] = [];
    const unsubscribeTenants = subscribeToAllTenants((list) => {
      liveTenants = list;
    });

    try {
      // 1) Crear "Salón Magnolia" con slug "magnolia" y dueño "duena@magnolia.com"
      const created = await createTenant({
        name: 'Salón Magnolia',
        slug: 'magnolia',
        ownerEmail: 'duena@magnolia.com',
        ownerPassword: 'MagnoliaPass123!',
        timezone: 'America/Argentina/Buenos_Aires',
        isDemo: false,
      });

      expect(created.tenantId).toMatch(/^tnt_[a-z0-9]{4,32}$/);
      expect(created.slug).toBe('magnolia');
      expect(created.ownerUid).toBeTruthy();

      // Confirmar que subscribeToAllTenants recibe el negocio creado en tiempo real
      await waitFor(() => liveTenants.some((t) => t.id === created.tenantId));

      // Verificar estructura atómica completa
      const [tenantSnap, slugSnap, ownerSnap, availSnap, memberSnap] = await Promise.all([
        getDoc(doc(db, 'tenants', created.tenantId)),
        getDoc(doc(db, 'tenant_slugs', 'magnolia')),
        getDoc(doc(db, 'tenants', created.tenantId, 'ownerinfo', 'profile')),
        getDoc(doc(db, 'tenants', created.tenantId, 'public_meta', 'availability')),
        getDoc(doc(db, 'tenants', created.tenantId, 'members', created.ownerUid)),
      ]);

      expect(tenantSnap.exists()).toBe(true);
      expect(slugSnap.exists()).toBe(true);
      expect(ownerSnap.exists()).toBe(true);
      expect(ownerSnap.data()?.businessName).toBe('Salón Magnolia');
      expect(availSnap.exists()).toBe(true);
      expect(availSnap.data()?.slots).toEqual({});
      expect(memberSnap.exists()).toBe(true);
      expect(memberSnap.data()?.role).toBe('owner');
      expect(memberSnap.data()?.active).toBe(true);

      // 2) Visitar /magnolia resuelve inmediatamente con nombre "Salón Magnolia"
      const resolvedMagnolia = await resolveTenantBySlug('magnolia', { bypassCache: true });
      expect(resolvedMagnolia.status).toBe('active');
      if (resolvedMagnolia.status === 'active') {
        expect(resolvedMagnolia.tenant.tenantId).toBe(created.tenantId);
        expect(resolvedMagnolia.tenant.ownerProfile.businessName).toBe('Salón Magnolia');
        expect(resolvedMagnolia.tenant.mpConfigured).toBe(false);
      }

      // 3) Dueña inicia sesión y obtiene claim owner del tenant creado
      await signOutTestUser();
      const ownerUser = await loginWithEmail('duena@magnolia.com', 'MagnoliaPass123!');
      expect(ownerUser.platformAdmin).toBe(false);
      expect(ownerUser.tenants[created.tenantId]).toBe('owner');

      // Volver a sesión SuperAdmin para el resto del ciclo de vida
      await signInTestUserWithClaims(superAdminEmail, password);

      // 4) Cambiar slug de "magnolia" -> "magnolia-studio"
      const slugRes = await changeTenantSlug(
        { tenantId: created.tenantId, newSlug: 'magnolia-studio' },
        'magnolia'
      );
      expect(slugRes).toEqual({
        success: true,
        tenantId: created.tenantId,
        previousSlug: 'magnolia',
        newSlug: 'magnolia-studio',
      });

      const oldSlugResolution = await resolveTenantBySlug('magnolia', { bypassCache: true });
      expect(oldSlugResolution.status).toBe('redirect');
      if (oldSlugResolution.status === 'redirect') {
        expect(oldSlugResolution.toSlug).toBe('magnolia-studio');
      }

      const newSlugResolution = await resolveTenantBySlug('magnolia-studio', { bypassCache: true });
      expect(newSlugResolution.status).toBe('active');
      if (newSlugResolution.status === 'active') {
        expect(newSlugResolution.tenant.tenantId).toBe(created.tenantId);
      }

      // 5) Suspender magnolia-studio -> resolución pública devuelve status 'suspended'
      await updateTenant({ tenantId: created.tenantId, status: 'suspended' }, 'magnolia-studio');
      const suspendedResolution = await resolveTenantBySlug('magnolia-studio', {
        bypassCache: true,
      });
      expect(suspendedResolution.status).toBe('suspended');

      // Reactivar + alternar isDemo -> mpConfigured se sincroniza
      await updateTenant(
        { tenantId: created.tenantId, status: 'active', isDemo: true },
        'magnolia-studio'
      );
      const demoResolution = await resolveTenantBySlug('magnolia-studio', { bypassCache: true });
      expect(demoResolution.status).toBe('active');
      if (demoResolution.status === 'active') {
        expect(demoResolution.tenant.isDemo).toBe(true);
        expect(demoResolution.tenant.mpConfigured).toBe(true);
      }

      // 6) Gestión de miembros: agregar staff y luego revocarlo
      await signOutTestUser();
      const staffCred = await createTestUser('staff@magnolia.com', 'StaffPass123!');
      const staffUid = staffCred.user.uid;
      await signInTestUserWithClaims(superAdminEmail, password);

      let liveMembers: TenantMemberDoc[] = [];
      let unsubscribeMembers = subscribeToTenantMembers(created.tenantId, (list) => {
        liveMembers = list;
      });

      try {
        const upsertAdd = await upsertTenantMember({
          tenantId: created.tenantId,
          email: 'staff@magnolia.com',
          role: 'staff',
          active: true,
        });
        expect(upsertAdd).toEqual({
          success: true,
          uid: staffUid,
          role: 'staff',
          active: true,
        });

        await waitFor(() =>
          liveMembers.some((m) => m.uid === staffUid && m.role === 'staff' && m.active)
        );

        // Staff verifica claim sincronizado (desuscribiendo el listener de SuperAdmin antes del logout)
        unsubscribeMembers();
        await signOutTestUser();
        const staffLoggedIn = await loginWithEmail('staff@magnolia.com', 'StaffPass123!');
        expect(staffLoggedIn.tenants[created.tenantId]).toBe('staff');

        // SuperAdmin reingresa, re-suscribe y revoca el acceso de staff
        await signInTestUserWithClaims(superAdminEmail, password);
        unsubscribeMembers = subscribeToTenantMembers(created.tenantId, (list) => {
          liveMembers = list;
        });
        await upsertTenantMember({
          tenantId: created.tenantId,
          email: 'staff@magnolia.com',
          role: 'staff',
          active: false,
        });

        await waitFor(() =>
          liveMembers.some((m) => m.uid === staffUid && m.active === false)
        );

        unsubscribeMembers();
        await signOutTestUser();
        const staffAfterRevoke = await loginWithEmail('staff@magnolia.com', 'StaffPass123!');
        expect(staffAfterRevoke.tenants[created.tenantId]).toBeUndefined();
      } finally {
        unsubscribeMembers();
      }
    } finally {
      unsubscribeTenants();
    }
  });

  it('rechaza con permission-denied a un owner regular y a usuarios anónimos al listar /tenants o invocar callables superadmin*', async () => {
    const regularOwner = await createTestUserWithClaims(regularOwnerEmail, password, {
      tenants: { [regularTenantId]: 'owner' },
      platformAdmin: false,
    });
    await signOutTestUser();

    await seedTestTenant({
      tenantId: regularTenantId,
      slug: regularTenantSlug,
      name: 'Estudio Alpha',
      members: [
        createTenantMemberFixture({
          uid: regularOwner.uid,
          email: regularOwnerEmail,
          role: 'owner',
        }),
      ],
    });

    // 1) Usuario anónimo no puede listar /tenants ni invocar callables
    await expect(getDocs(collection(db, 'tenants'))).rejects.toMatchObject({
      code: 'permission-denied',
    });
    await expect(
      createTenant({
        name: 'Anon Studio',
        slug: 'anon-studio',
        ownerEmail: 'anon@studio.com',
      })
    ).rejects.toMatchObject({ code: 'functions/unauthenticated' });

    // 2) Owner regular de un salón válido NO puede listar /tenants ni invocar ninguna callable superadmin*
    await signInTestUserWithClaims(regularOwnerEmail, password);

    await expect(getDocs(collection(db, 'tenants'))).rejects.toMatchObject({
      code: 'permission-denied',
    });

    await expect(
      createTenant({
        name: 'Intento Owner',
        slug: 'intento-owner',
        ownerEmail: 'otro@turneado.app',
      })
    ).rejects.toMatchObject({ code: 'functions/permission-denied' });

    await expect(
      updateTenant({
        tenantId: regularTenantId,
        isDemo: true,
      })
    ).rejects.toMatchObject({ code: 'functions/permission-denied' });

    await expect(
      changeTenantSlug({
        tenantId: regularTenantId,
        newSlug: 'nuevo-alpha',
      })
    ).rejects.toMatchObject({ code: 'functions/permission-denied' });

    await expect(
      upsertTenantMember({
        tenantId: regularTenantId,
        email: regularOwnerEmail,
        role: 'owner',
        active: true,
      })
    ).rejects.toMatchObject({ code: 'functions/permission-denied' });
  });
});
