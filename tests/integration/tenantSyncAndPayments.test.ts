import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../../src/services/firebaseConfig';
import { initTestEmulators } from '../setup/emulatorConfig';
import {
  createTestUserWithClaims,
  resetTestEnvironment,
  seedFirestoreDocument,
  seedTestTenant,
  signInTestUserWithClaims,
  signOutTestUser,
} from '../setup/testEnvironment';
import {
  createClientDataFixture,
  createSlotDataFixture,
  createTenantMemberFixture,
} from '../setup/fixtures';
import type {
  SuperAdminChangeTenantSlugResponse,
  SuperAdminCreateTenantResponse,
  TenantPaymentSettingsSummary,
} from '../../src/types';

async function waitFor<T>(
  predicate: () => Promise<T | null | undefined | false>,
  timeoutMs = 8000,
  intervalMs = 200
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

describe('Integración - Triggers Multi-Tenant, SuperAdmin, Admin Slots y Payment Settings', () => {
  const password = 'Password123!';
  const platformAdminEmail = 'superadmin@turneado.app';
  const ownerAEmail = 'owner-a@turneado.app';
  const staffAEmail = 'staff-a@turneado.app';
  const ownerBEmail = 'owner-b@turneado.app';

  const tenantAId = 'tnt_alpha';
  const tenantBId = 'tnt_beta';

  let ownerAUid = '';
  let staffAUid = '';
  let ownerBUid = '';

  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await resetTestEnvironment();

    await createTestUserWithClaims(platformAdminEmail, password, {
      platformAdmin: true,
    });

    const ownerA = await createTestUserWithClaims(ownerAEmail, password, {
      tenants: { [tenantAId]: 'owner' },
    });
    ownerAUid = ownerA.uid;

    const staffA = await createTestUserWithClaims(staffAEmail, password, {
      tenants: { [tenantAId]: 'staff' },
    });
    staffAUid = staffA.uid;

    const ownerB = await createTestUserWithClaims(ownerBEmail, password, {
      tenants: { [tenantBId]: 'owner' },
    });
    ownerBUid = ownerB.uid;

    await signOutTestUser();

    await seedTestTenant({
      tenantId: tenantAId,
      slug: 'estudio-alpha',
      name: 'Estudio Alpha',
      isDemo: false,
      mpConfigured: false,
      members: [
        createTenantMemberFixture({ uid: ownerAUid, email: ownerAEmail, role: 'owner' }),
        createTenantMemberFixture({ uid: staffAUid, email: staffAEmail, role: 'staff' }),
      ],
    });

    await seedTestTenant({
      tenantId: tenantBId,
      slug: 'estudio-beta',
      name: 'Estudio Beta',
      isDemo: false,
      mpConfigured: false,
      members: [
        createTenantMemberFixture({ uid: ownerBUid, email: ownerBEmail, role: 'owner' }),
      ],
    });
  });

  it('superadminCreateTenant crea atómicamente los 5 documentos base y asigna Custom Claims en Auth Emulator', async () => {
    await signInTestUserWithClaims(platformAdminEmail, password);

    const createTenant = httpsCallable<
      {
        name: string;
        slug: string;
        ownerEmail: string;
        ownerPassword?: string;
        isDemo?: boolean;
      },
      SuperAdminCreateTenantResponse
    >(functions, 'superadminCreateTenant');

    const res = await createTenant({
      name: 'Estudio Nuevo',
      slug: 'estudio-nuevo',
      ownerEmail: 'nueva.duena@turneado.app',
      ownerPassword: 'NewOwnerPass123!',
      isDemo: false,
    });

    const { tenantId, slug, ownerUid } = res.data;
    expect(tenantId).toMatch(/^tnt_[a-z0-9]{4,32}$/);
    expect(slug).toBe('estudio-nuevo');
    expect(ownerUid).toBeTruthy();

    // Verify public slug bootstrap + public_meta + ownerinfo + tenant doc
    const [slugSnap, tenantSnap, ownerSnap, availSnap, memberSnap] = await Promise.all([
      getDoc(doc(db, 'tenant_slugs', slug)),
      getDoc(doc(db, 'tenants', tenantId)),
      getDoc(doc(db, 'tenants', tenantId, 'ownerinfo', 'profile')),
      getDoc(doc(db, 'tenants', tenantId, 'public_meta', 'availability')),
      getDoc(doc(db, 'tenants', tenantId, 'members', ownerUid)),
    ]);

    expect(slugSnap.exists()).toBe(true);
    expect(slugSnap.data()?.tenantId).toBe(tenantId);
    expect(slugSnap.data()?.mpConfigured).toBe(false);
    expect(tenantSnap.exists()).toBe(true);
    expect(ownerSnap.exists()).toBe(true);
    expect(ownerSnap.data()?.businessName).toBe('Estudio Nuevo');
    expect(availSnap.exists()).toBe(true);
    expect(availSnap.data()?.slots).toEqual({});
    expect(memberSnap.exists()).toBe(true);
    expect(memberSnap.data()?.role).toBe('owner');

    // Verify Custom Claims were assigned to the newly created owner in Auth Emulator
    await signOutTestUser();
    const ownerCred = await signInTestUserWithClaims(
      'nueva.duena@turneado.app',
      'NewOwnerPass123!'
    );
    const tokenResult = await ownerCred.user.getIdTokenResult(true);
    expect((tokenResult.claims.tenants as Record<string, string>)?.[tenantId]).toBe('owner');

    // Non-platformAdmin cannot call superadminCreateTenant
    await expect(
      createTenant({
        name: 'Intento No Autorizado',
        slug: 'intento-no-autorizado',
        ownerEmail: 'otro@turneado.app',
      })
    ).rejects.toMatchObject({ code: 'functions/permission-denied' });
  });

  it('superadminChangeTenantSlug crea redirect en el slug anterior y actualiza /tenants/{id}', async () => {
    await signInTestUserWithClaims(platformAdminEmail, password);

    const changeSlug = httpsCallable<
      { tenantId: string; newSlug: string },
      SuperAdminChangeTenantSlugResponse
    >(functions, 'superadminChangeTenantSlug');

    const res = await changeSlug({
      tenantId: tenantAId,
      newSlug: 'estudio-alpha-pro',
    });

    expect(res.data).toEqual({
      success: true,
      tenantId: tenantAId,
      previousSlug: 'estudio-alpha',
      newSlug: 'estudio-alpha-pro',
    });

    const [oldSlugSnap, newSlugSnap, tenantSnap] = await Promise.all([
      getDoc(doc(db, 'tenant_slugs', 'estudio-alpha')),
      getDoc(doc(db, 'tenant_slugs', 'estudio-alpha-pro')),
      getDoc(doc(db, 'tenants', tenantAId)),
    ]);

    expect(oldSlugSnap.data()?.redirectToSlug).toBe('estudio-alpha-pro');
    expect(newSlugSnap.data()?.tenantId).toBe(tenantAId);
    expect(newSlugSnap.data()?.redirectToSlug).toBeNull();
    expect(tenantSnap.data()?.slug).toBe('estudio-alpha-pro');
  });

  it('syncPublicSlot actualiza y limpia /tenants/{tenantId}/public_meta/availability con FieldPath de firebase-admin/firestore', async () => {
    await signInTestUserWithClaims(ownerAEmail, password);

    const createSlots = httpsCallable<
      { tenantId: string; slots: ReturnType<typeof createSlotDataFixture>[] },
      { createdIds: string[] }
    >(functions, 'adminCreateSlots');
    const assignSlot = httpsCallable<
      { tenantId: string; slotId: string; clientData: ReturnType<typeof createClientDataFixture> },
      { success: boolean }
    >(functions, 'adminAssignSlot');
    const cancelSlot = httpsCallable<
      { tenantId: string; slotId: string },
      { success: boolean }
    >(functions, 'adminCancelSlot');

    // Cross-tenant authorization check: ownerA cannot create slots in tenantB
    await expect(
      createSlots({
        tenantId: tenantBId,
        slots: [createSlotDataFixture({ datetime: '2027-07-10T14:00:00.000Z' })],
      })
    ).rejects.toMatchObject({ code: 'functions/permission-denied' });

    // Create slot in tenantA
    const created = await createSlots({
      tenantId: tenantAId,
      slots: [createSlotDataFixture({ datetime: '2027-07-10T14:00:00.000Z' })],
    });
    const slotId = created.data.createdIds[0];
    expect(slotId).toBeTruthy();

    // Trigger syncPublicSlot projects available slot into /tenants/tnt_alpha/public_meta/availability
    const availableSlotProj = await waitFor(async () => {
      const snap = await getDoc(doc(db, 'tenants', tenantAId, 'public_meta', 'availability'));
      const slotsMap = (snap.data()?.slots || {}) as Record<string, Record<string, unknown>>;
      return slotsMap[slotId]?.status === 'available' ? slotsMap[slotId] : null;
    });
    expect(availableSlotProj.depositAmount).toBe(5000);
    expect(availableSlotProj).not.toHaveProperty('clientData');

    // Assign slot -> public projection updates to confirmed with ZERO PII
    await assignSlot({
      tenantId: tenantAId,
      slotId,
      clientData: createClientDataFixture(),
    });

    const confirmedSlotProj = await waitFor(async () => {
      const snap = await getDoc(doc(db, 'tenants', tenantAId, 'public_meta', 'availability'));
      const slotsMap = (snap.data()?.slots || {}) as Record<string, Record<string, unknown>>;
      return slotsMap[slotId]?.status === 'confirmed' ? slotsMap[slotId] : null;
    });
    expect(confirmedSlotProj).not.toHaveProperty('clientData');
    expect(confirmedSlotProj.endDatetime).toBeTruthy();

    // Cancel slot -> trigger deletes the slot entry from public_meta/availability using FieldPath + FieldValue.delete()
    await cancelSlot({ tenantId: tenantAId, slotId });

    await waitFor(async () => {
      const snap = await getDoc(doc(db, 'tenants', tenantAId, 'public_meta', 'availability'));
      const slotsMap = (snap.data()?.slots || {}) as Record<string, Record<string, unknown>>;
      return slotsMap[slotId] === undefined;
    });

    // Tenant B availability remains untouched
    const tenantBAvailSnap = await getDoc(
      doc(db, 'tenants', tenantBId, 'public_meta', 'availability')
    );
    expect(tenantBAvailSnap.data()?.slots).toEqual({});
  });

  it('adminSavePaymentSettings y adminGetPaymentSettingsSummary persisten secretos, propagan mpConfigured y jamás devuelven secretos en claro', async () => {
    const rawToken = 'APP_USR-5555666677-alpha-secret-8899';
    const rawWebhookSecret = 'whsec_alpha_private_secret_9988';

    await signInTestUserWithClaims(ownerAEmail, password);

    const saveSettings = httpsCallable<
      {
        tenantId: string;
        mpAccessToken?: string;
        mpWebhookSecret?: string;
        clearCredentials?: boolean;
      },
      TenantPaymentSettingsSummary
    >(functions, 'adminSavePaymentSettings');
    const getSummary = httpsCallable<{ tenantId: string }, TenantPaymentSettingsSummary>(
      functions,
      'adminGetPaymentSettingsSummary'
    );

    const saved = await saveSettings({
      tenantId: tenantAId,
      mpAccessToken: rawToken,
      mpWebhookSecret: rawWebhookSecret,
    });

    expect(saved.data.configured).toBe(true);
    expect(saved.data.maskedAccessToken).toBe('APP_USR-...8899');
    expect(saved.data.hasWebhookSecret).toBe(true);
    expect(saved.data.isDemoFallbackActive).toBe(false);
    expect(saved.data.webhookUrl).toContain(`tenantId=${tenantAId}`);
    expect(JSON.stringify(saved.data)).not.toContain(rawToken);
    expect(JSON.stringify(saved.data)).not.toContain(rawWebhookSecret);

    const summary = await getSummary({ tenantId: tenantAId });
    expect(summary.data.configured).toBe(true);
    expect(summary.data.maskedAccessToken).toBe('APP_USR-...8899');
    expect(JSON.stringify(summary.data)).not.toContain(rawToken);
    expect(JSON.stringify(summary.data)).not.toContain(rawWebhookSecret);

    // mpConfigured propagated to /tenant_slugs/estudio-alpha
    const slugSnap = await waitFor(async () => {
      const snap = await getDoc(doc(db, 'tenant_slugs', 'estudio-alpha'));
      return snap.data()?.mpConfigured === true ? snap : null;
    });
    expect(slugSnap.data()?.mpConfigured).toBe(true);

    // Staff of tenantA cannot access payment settings (owner-only)
    await signOutTestUser();
    await signInTestUserWithClaims(staffAEmail, password);
    await expect(getSummary({ tenantId: tenantAId })).rejects.toMatchObject({
      code: 'functions/permission-denied',
    });

    // Owner of tenantB cannot read or modify tenantA payment settings
    await signOutTestUser();
    await signInTestUserWithClaims(ownerBEmail, password);
    await expect(getSummary({ tenantId: tenantAId })).rejects.toMatchObject({
      code: 'functions/permission-denied',
    });
  });

  it('triggers onTenantOwnerInfoWritten y onTenantMemberWritten sincronizan /tenant_slugs y Auth Custom Claims', async () => {
    // 1) Updating ownerinfo/profile as ownerA propagates to /tenant_slugs/estudio-alpha including Spec 08 appearance fields
    await signInTestUserWithClaims(ownerAEmail, password);
    await updateDoc(doc(db, 'tenants', tenantAId, 'ownerinfo', 'profile'), {
      businessName: 'Estudio Alpha Renovado',
      location: 'Belgrano, CABA',
      appearance: {
        palettePreset: 'sage-botanical',
        navbarStyle: 'centered',
        logoShape: 'circle',
        portfolioLayout: 'bento',
        heroShowTrustPills: false,
        showFloatingWhatsApp: true,
        motionPreset: 'subtle',
        heroHighlightStyle: 'italic',
        slotCardStyle: 'accent-bar',
      },
    });

    const syncedSlug = await waitFor(async () => {
      const snap = await getDoc(doc(db, 'tenant_slugs', 'estudio-alpha'));
      const profile = snap.data()?.ownerProfile as Record<string, unknown> | undefined;
      return profile?.businessName === 'Estudio Alpha Renovado' ? snap : null;
    });
    expect((syncedSlug.data()?.ownerProfile as Record<string, unknown>)?.location).toBe(
      'Belgrano, CABA'
    );
    expect(syncedSlug.data()?.appearance).toMatchObject({
      palettePreset: 'sage-botanical',
      navbarStyle: 'centered',
      logoShape: 'circle',
      portfolioLayout: 'bento',
      heroShowTrustPills: false,
      showFloatingWhatsApp: true,
      motionPreset: 'subtle',
      heroHighlightStyle: 'italic',
      slotCardStyle: 'accent-bar',
    });

    // 2) Writing /tenants/{tenantId}/members/{uid} triggers onTenantMemberWritten and updates Auth claims
    await signOutTestUser();
    const extraUser = await createTestUserWithClaims('nuevo-staff@turneado.app', password, {});
    await seedFirestoreDocument(`tenants/${tenantAId}/members/${extraUser.uid}`, {
      uid: extraUser.uid,
      email: 'nuevo-staff@turneado.app',
      role: 'staff',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await signInTestUserWithClaims('nuevo-staff@turneado.app', password);
    const updatedClaims = await waitFor(async () => {
      const tokenRes = await auth.currentUser?.getIdTokenResult(true);
      const tenantsClaim = tokenRes?.claims?.tenants as Record<string, string> | undefined;
      return tenantsClaim?.[tenantAId] === 'staff' ? tenantsClaim : null;
    });
    expect(updatedClaims[tenantAId]).toBe('staff');
  });
});
