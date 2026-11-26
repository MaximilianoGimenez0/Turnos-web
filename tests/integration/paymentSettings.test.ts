import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../src/services/firebaseConfig';
import {
  getPaymentSettingsSummary,
  savePaymentSettings,
} from '../../src/services/paymentSettingsService';
import { resolveTenantBySlug } from '../../src/services/tenantService';
import { clearPublicCache } from '../../src/services/publicCache';
import { initTestEmulators } from '../setup/emulatorConfig';
import {
  createTestUserWithClaims,
  resetTestEnvironment,
  seedTestTenant,
  signInTestUserWithClaims,
  signOutTestUser,
} from '../setup/testEnvironment';
import { createTenantMemberFixture } from '../setup/fixtures';

describe('Integración - paymentSettingsService con Auth, Firestore y Functions Emulators', () => {
  const password = 'Password123!';
  const ownerAEmail = 'owner-mp-a@turneado.app';
  const staffAEmail = 'staff-mp-a@turneado.app';
  const ownerBEmail = 'owner-mp-b@turneado.app';

  const tenantAId = 'tnt_mpalpha';
  const tenantASlug = 'estudio-mp-alpha';
  const tenantBId = 'tnt_mpbeta';
  const tenantBSlug = 'estudio-mp-beta';

  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    clearPublicCache();
    await resetTestEnvironment();

    const ownerA = await createTestUserWithClaims(ownerAEmail, password, {
      tenants: { [tenantAId]: 'owner' },
    });
    const staffA = await createTestUserWithClaims(staffAEmail, password, {
      tenants: { [tenantAId]: 'staff' },
    });
    const ownerB = await createTestUserWithClaims(ownerBEmail, password, {
      tenants: { [tenantBId]: 'owner' },
    });
    await signOutTestUser();

    await seedTestTenant({
      tenantId: tenantAId,
      slug: tenantASlug,
      name: 'Estudio MP Alpha',
      isDemo: false,
      mpConfigured: false,
      members: [
        createTenantMemberFixture({ uid: ownerA.uid, email: ownerAEmail, role: 'owner' }),
        createTenantMemberFixture({ uid: staffA.uid, email: staffAEmail, role: 'staff' }),
      ],
    });

    await seedTestTenant({
      tenantId: tenantBId,
      slug: tenantBSlug,
      name: 'Estudio MP Beta',
      isDemo: false,
      mpConfigured: false,
      members: [
        createTenantMemberFixture({ uid: ownerB.uid, email: ownerBEmail, role: 'owner' }),
      ],
    });
  });

  it('owner guarda, consulta enmascarado y limpia credenciales propagando mpConfigured a tenant_slugs', async () => {
    await signInTestUserWithClaims(ownerAEmail, password);

    // Prime public bootstrap cache before saving so we verify invalidation
    const initialBootstrap = await resolveTenantBySlug(tenantASlug);
    expect(initialBootstrap.status).toBe('active');
    if (initialBootstrap.status === 'active') {
      expect(initialBootstrap.tenant.mpConfigured).toBe(false);
    }

    const initialSummary = await getPaymentSettingsSummary(tenantAId);
    expect(initialSummary.configured).toBe(false);
    expect(initialSummary.maskedAccessToken).toBeNull();
    expect(initialSummary.hasWebhookSecret).toBe(false);
    expect(initialSummary.isDemoFallbackActive).toBe(false);
    expect(initialSummary.webhookUrl).toContain(`tenantId=${tenantAId}`);

    const rawToken = 'APP_USR-998877665544-secretpart-4910';
    const rawWebhookSecret = 'whsec_super_secret_alpha_2026';

    const savedSummary = await savePaymentSettings(
      {
        tenantId: tenantAId,
        mpAccessToken: rawToken,
        mpWebhookSecret: rawWebhookSecret,
      },
      tenantASlug
    );

    expect(savedSummary.configured).toBe(true);
    expect(savedSummary.hasWebhookSecret).toBe(true);
    expect(savedSummary.isDemoFallbackActive).toBe(false);
    expect(savedSummary.maskedAccessToken).toMatch(/^APP_USR-.*4910$/);
    expect(savedSummary.webhookUrl).toContain(`tenantId=${tenantAId}`);

    // Secrets must never leak back to the client
    const serializedSaved = JSON.stringify(savedSummary);
    expect(serializedSaved).not.toContain(rawToken);
    expect(serializedSaved).not.toContain(rawWebhookSecret);

    // Verify mpConfigured propagated to /tenant_slugs/{slug} and cache was invalidated
    const slugSnap = await getDoc(doc(db, 'tenant_slugs', tenantASlug));
    expect(slugSnap.exists()).toBe(true);
    expect(slugSnap.data()?.mpConfigured).toBe(true);

    const refreshedBootstrap = await resolveTenantBySlug(tenantASlug);
    expect(refreshedBootstrap.status).toBe('active');
    if (refreshedBootstrap.status === 'active') {
      expect(refreshedBootstrap.fromCache).toBe(false);
      expect(refreshedBootstrap.tenant.mpConfigured).toBe(true);
    }

    // Re-reading summary stays masked
    const fetchedSummary = await getPaymentSettingsSummary(tenantAId);
    expect(fetchedSummary.configured).toBe(true);
    expect(fetchedSummary.maskedAccessToken).toBe(savedSummary.maskedAccessToken);
    expect(fetchedSummary.hasWebhookSecret).toBe(true);
    expect(JSON.stringify(fetchedSummary)).not.toContain(rawToken);
    expect(JSON.stringify(fetchedSummary)).not.toContain(rawWebhookSecret);

    // Clearing credentials resets mpConfigured to false
    const clearedSummary = await savePaymentSettings(
      {
        tenantId: tenantAId,
        clearCredentials: true,
      },
      tenantASlug
    );
    expect(clearedSummary.configured).toBe(false);
    expect(clearedSummary.maskedAccessToken).toBeNull();
    expect(clearedSummary.hasWebhookSecret).toBe(false);

    const slugSnapAfterClear = await getDoc(doc(db, 'tenant_slugs', tenantASlug));
    expect(slugSnapAfterClear.data()?.mpConfigured).toBe(false);
  });

  it('rechaza con permission-denied a staff del mismo tenant y a owner de otro tenant', async () => {
    await signInTestUserWithClaims(staffAEmail, password);
    await expect(getPaymentSettingsSummary(tenantAId)).rejects.toMatchObject({
      code: 'functions/permission-denied',
    });
    await expect(
      savePaymentSettings({
        tenantId: tenantAId,
        mpAccessToken: 'APP_USR-1234567890-staff-1234',
      })
    ).rejects.toMatchObject({
      code: 'functions/permission-denied',
    });

    await signInTestUserWithClaims(ownerBEmail, password);
    await expect(getPaymentSettingsSummary(tenantAId)).rejects.toMatchObject({
      code: 'functions/permission-denied',
    });
    await expect(
      savePaymentSettings({
        tenantId: tenantAId,
        mpAccessToken: 'APP_USR-1234567890-cross-5678',
      })
    ).rejects.toMatchObject({
      code: 'functions/permission-denied',
    });
  });
});
