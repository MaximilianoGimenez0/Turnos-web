import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as admin from 'firebase-admin';
import {
  assertPlatformAdmin,
  assertTenantRole,
  validateTenantIdOrThrow,
  validateTenantSlugOrThrow,
} from '../../functions/src/tenantContext';
import {
  MAX_CUSTOM_CLAIMS_BYTES,
  buildNextMemberCustomClaims,
  syncTenantBootstrap,
  syncTenantMemberClaims,
  type AuthClaimsClient,
} from '../../functions/src/tenantSync';
import {
  maskAccessToken,
  resetMpClientsCache,
  resolveTenantMpCredentials,
} from '../../functions/src/mercadoPago';
import {
  adminGetPaymentSettingsSummaryCore,
  adminSavePaymentSettingsCore,
} from '../../functions/src/paymentSettings';
import {
  getOwnerProfileCached,
  resetOwnerProfileCache,
} from '../../functions/src/ownerProfile';
import {
  getLiveServicesCatalogCached,
  resetServicesCatalogCache,
} from '../../functions/src/servicesCatalog';

function createInMemoryFirestore(initialDocs: Record<string, Record<string, unknown>> = {}) {
  const store = new Map<string, Record<string, unknown>>();
  for (const [path, data] of Object.entries(initialDocs)) {
    store.set(path, structuredClone(data));
  }

  const makeDocRef = (path: string) => ({
    id: path.split('/').pop() || '',
    path,
    get: vi.fn(async () => {
      const data = store.get(path);
      return {
        id: path.split('/').pop() || '',
        exists: data !== undefined,
        data: () => (data ? structuredClone(data) : undefined),
      };
    }),
    set: vi.fn(async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
      if (opts?.merge && store.has(path)) {
        store.set(path, { ...store.get(path)!, ...structuredClone(data) });
      } else {
        store.set(path, structuredClone(data));
      }
    }),
    update: vi.fn(async (data: Record<string, unknown>) => {
      const current = store.get(path);
      if (!current) throw new Error(`Document not found: ${path}`);
      store.set(path, { ...current, ...structuredClone(data) });
    }),
    delete: vi.fn(async () => {
      store.delete(path);
    }),
    collection: (sub: string) => makeCollectionRef(`${path}/${sub}`),
  });

  const makeCollectionRef = (colPath: string) => ({
    id: colPath.split('/').pop() || '',
    doc: (id: string) => makeDocRef(`${colPath}/${id}`),
    get: vi.fn(async () => {
      const prefix = `${colPath}/`;
      const docs: Array<{ id: string; data: () => Record<string, unknown> }> = [];
      for (const [p, val] of store.entries()) {
        if (!p.startsWith(prefix)) continue;
        const remainder = p.slice(prefix.length);
        if (!remainder.includes('/')) {
          docs.push({ id: remainder, data: () => structuredClone(val) });
        }
      }
      return { empty: docs.length === 0, docs };
    }),
  });

  const db = {
    collection: (name: string) => makeCollectionRef(name),
  } as unknown as admin.firestore.Firestore;

  return { db, store };
}

describe('Multi-tenant backend: guards, claims sync, bootstrap, MP Opción A y cachés por tenantId', () => {
  const originalMpToken = process.env.MP_ACCESS_TOKEN;
  const originalMpSecret = process.env.MP_WEBHOOK_SECRET;
  const originalWebhookUrl = process.env.MP_WEBHOOK_URL;

  beforeEach(() => {
    resetMpClientsCache();
    resetOwnerProfileCache();
    resetServicesCatalogCache();
    process.env.MP_ACCESS_TOKEN = 'TEST-1111222233334444-demo-env-token-9999';
    process.env.MP_WEBHOOK_SECRET = 'whsec_demo_env_secret';
    process.env.MP_WEBHOOK_URL = 'https://us-central1-turnos-web-eb8b5.cloudfunctions.net/mpWebhook';
  });

  afterEach(() => {
    if (originalMpToken !== undefined) process.env.MP_ACCESS_TOKEN = originalMpToken;
    else delete process.env.MP_ACCESS_TOKEN;

    if (originalMpSecret !== undefined) process.env.MP_WEBHOOK_SECRET = originalMpSecret;
    else delete process.env.MP_WEBHOOK_SECRET;

    if (originalWebhookUrl !== undefined) process.env.MP_WEBHOOK_URL = originalWebhookUrl;
    else delete process.env.MP_WEBHOOK_URL;
  });

  describe('tenantContext guards', () => {
    it('valida tenantId y tenantSlug con reglas estrictas sin separadores de ruta ni reservados', () => {
      expect(validateTenantIdOrThrow('tnt_demo')).toBe('tnt_demo');
      expect(validateTenantIdOrThrow('tnt_abc12345')).toBe('tnt_abc12345');
      expect(() => validateTenantIdOrThrow('')).toThrow();
      expect(() => validateTenantIdOrThrow('tnt_ab')).toThrow();
      expect(() => validateTenantIdOrThrow('tnt_demo/evil')).toThrow();
      expect(() => validateTenantIdOrThrow('TNT_DEMO')).toThrow();

      expect(validateTenantSlugOrThrow('demo')).toBe('demo');
      expect(validateTenantSlugOrThrow('estudio-rosa')).toBe('estudio-rosa');
      expect(() => validateTenantSlugOrThrow('superadmin')).toThrow();
      expect(() => validateTenantSlugOrThrow('admin')).toThrow();
      expect(() => validateTenantSlugOrThrow('Estudio')).toThrow();
    });

    it('assertPlatformAdmin y assertTenantRole aplican Zero-Trust con fallback a membresía activa', async () => {
      const { db } = createInMemoryFirestore({
        'tenants/tnt_alpha/members/uid-fallback': {
          uid: 'uid-fallback',
          email: 'owner@a.com',
          role: 'owner',
          active: true,
        },
        'tenants/tnt_alpha/members/uid-revoked': {
          uid: 'uid-revoked',
          email: 'revoked@a.com',
          role: 'owner',
          active: false,
        },
      });

      expect(() => assertPlatformAdmin({ auth: undefined })).toThrow();
      expect(() =>
        assertPlatformAdmin({ auth: { uid: 'u1', token: { tenants: { tnt_alpha: 'owner' } } } })
      ).toThrow();
      expect(
        assertPlatformAdmin({ auth: { uid: 'sa1', token: { platformAdmin: true } } }).uid
      ).toBe('sa1');

      // Platform admin bypasses tenant check
      const asPlatform = await assertTenantRole(
        { auth: { uid: 'sa1', token: { platformAdmin: true } } },
        db,
        'tnt_alpha',
        ['owner']
      );
      expect(asPlatform.isPlatformAdmin).toBe(true);

      // Claim match on tenant
      const asOwnerClaim = await assertTenantRole(
        { auth: { uid: 'u-owner', token: { tenants: { tnt_alpha: 'owner' } } } },
        db,
        'tnt_alpha',
        ['owner']
      );
      expect(asOwnerClaim.role).toBe('owner');

      // Wrong tenant rejected
      await expect(
        assertTenantRole(
          { auth: { uid: 'u-owner-b', token: { tenants: { tnt_beta: 'owner' } } } },
          db,
          'tnt_alpha',
          ['owner', 'staff']
        )
      ).rejects.toMatchObject({ code: 'permission-denied' });

      // Staff rejected when only owner allowed
      await expect(
        assertTenantRole(
          { auth: { uid: 'u-staff', token: { tenants: { tnt_alpha: 'staff' } } } },
          db,
          'tnt_alpha',
          ['owner']
        )
      ).rejects.toMatchObject({ code: 'permission-denied' });

      // Fallback to active member doc when JWT claim is not yet refreshed
      const asFallback = await assertTenantRole(
        { auth: { uid: 'uid-fallback', token: {} } },
        db,
        'tnt_alpha',
        ['owner']
      );
      expect(asFallback.role).toBe('owner');

      // Revoked member denied
      await expect(
        assertTenantRole(
          { auth: { uid: 'uid-revoked', token: {} } },
          db,
          'tnt_alpha',
          ['owner']
        )
      ).rejects.toMatchObject({ code: 'permission-denied' });
    });
  });

  describe('tenantSync (Custom Claims y tenant_slugs bootstrap)', () => {
    it('syncTenantMemberClaims preserva platformAdmin y otros tenants, remueve revocados y bloquea >950 bytes', async () => {
      const setCustomUserClaims = vi.fn(async () => {});
      const authClient: AuthClaimsClient = {
        getUser: vi.fn(async () => ({
          customClaims: {
            platformAdmin: true,
            tenants: { tnt_existing: 'owner' },
          },
        })),
        setCustomUserClaims,
      };

      const added = await syncTenantMemberClaims(authClient, 'tnt_alpha', 'u-1', {
        role: 'staff',
        active: true,
      });
      expect(added.updated).toBe(true);
      expect(setCustomUserClaims).toHaveBeenCalledWith('u-1', {
        platformAdmin: true,
        tenants: {
          tnt_existing: 'owner',
          tnt_alpha: 'staff',
        },
      });

      // Revoking removes only that tenant and keeps platformAdmin
      const afterRevoke = buildNextMemberCustomClaims(
        { platformAdmin: true, tenants: { tnt_alpha: 'owner', tnt_beta: 'staff' } },
        'tnt_alpha',
        { role: 'owner', active: false }
      );
      expect(afterRevoke).toEqual({
        platformAdmin: true,
        tenants: { tnt_beta: 'staff' },
      });

      // Payload > 950 bytes must abort without calling setCustomUserClaims
      const bloatedTenants: Record<string, string> = {};
      for (let i = 0; i < 45; i++) {
        bloatedTenants[`tnt_longtenantname${String(i).padStart(4, '0')}`] = 'owner';
      }
      const bloatedSetMock = vi.fn(async () => {});
      const bloatedAuth: AuthClaimsClient = {
        getUser: vi.fn(async () => ({ customClaims: { tenants: bloatedTenants } })),
        setCustomUserClaims: bloatedSetMock,
      };
      expect(Buffer.byteLength(JSON.stringify({ tenants: bloatedTenants }), 'utf8')).toBeGreaterThan(
        MAX_CUSTOM_CLAIMS_BYTES
      );
      await expect(
        syncTenantMemberClaims(bloatedAuth, 'tnt_overflow', 'u-2', { role: 'owner', active: true })
      ).rejects.toThrow(/950 bytes/);
      expect(bloatedSetMock).not.toHaveBeenCalled();
    });

    it('syncTenantBootstrap proyecta /tenant_slugs/{slug} y lo elimina solo si pertenece al tenant', async () => {
      const { db, store } = createInMemoryFirestore({
        'tenants/tnt_alpha': {
          id: 'tnt_alpha',
          slug: 'estudio-alpha',
          name: 'Estudio Alpha',
          status: 'active',
          isDemo: false,
          mpConfigured: true,
          timezone: 'America/Argentina/Buenos_Aires',
          currency: 'ARS',
        },
        'tenants/tnt_alpha/ownerinfo/profile': {
          businessName: 'Estudio Alpha',
          email: 'alpha@test.com',
          instagram: '@alpha',
          internalSecretField: 'should-not-leak',
        },
      });

      const res = await syncTenantBootstrap(db, 'tnt_alpha');
      expect(res).toBe('upserted');
      const slugDoc = store.get('tenant_slugs/estudio-alpha');
      expect(slugDoc).toMatchObject({
        tenantId: 'tnt_alpha',
        slug: 'estudio-alpha',
        status: 'active',
        mpConfigured: true,
        redirectToSlug: null,
      });
      expect(slugDoc?.ownerProfile).toEqual({
        businessName: 'Estudio Alpha',
        email: 'alpha@test.com',
        instagram: '@alpha',
      });

      const delRes = await syncTenantBootstrap(db, 'tnt_alpha', {
        deletedTenantData: { slug: 'estudio-alpha' },
      });
      expect(delRes).toBe('deleted');
      expect(store.has('tenant_slugs/estudio-alpha')).toBe(false);
    });
  });

  describe('Mercado Pago Opción A + fallback isDemo + paymentSettings', () => {
    it('resolveTenantMpCredentials prioriza token propio, permite .env solo en isDemo y rechaza en comercial sin token', async () => {
      const { db } = createInMemoryFirestore({
        'tenants/tnt_alpha/private_config/integrations': {
          mpAccessToken: 'APP_USR-alpha-own-token-1234',
          mpWebhookSecret: 'whsec_alpha_secret',
        },
      });

      // 1) Tenant with own token -> source: 'tenant'
      const ownCreds = await resolveTenantMpCredentials(db, { id: 'tnt_alpha', isDemo: false });
      expect(ownCreds).toEqual({
        accessToken: 'APP_USR-alpha-own-token-1234',
        webhookSecret: 'whsec_alpha_secret',
        source: 'tenant',
      });

      // 2) Demo tenant without own token -> fallback to .env
      const demoCreds = await resolveTenantMpCredentials(db, { id: 'tnt_demo', isDemo: true });
      expect(demoCreds).toEqual({
        accessToken: 'TEST-1111222233334444-demo-env-token-9999',
        webhookSecret: 'whsec_demo_env_secret',
        source: 'demo_env',
      });

      // 3) Commercial tenant (isDemo: false) without own token -> failed-precondition
      await expect(
        resolveTenantMpCredentials(db, { id: 'tnt_beta', isDemo: false })
      ).rejects.toMatchObject({ code: 'failed-precondition' });
    });

    it('adminGetPaymentSettingsSummaryCore y adminSavePaymentSettingsCore nunca devuelven secretos en texto plano', async () => {
      const rawToken = 'APP_USR-1234567890-super-secret-9876';
      const rawSecret = 'whsec_super_secret_webhook_key';
      const { db, store } = createInMemoryFirestore({
        'tenants/tnt_alpha': {
          id: 'tnt_alpha',
          slug: 'estudio-alpha',
          name: 'Estudio Alpha',
          status: 'active',
          isDemo: false,
          mpConfigured: false,
          timezone: 'America/Argentina/Buenos_Aires',
          currency: 'ARS',
        },
      });

      const saved = await adminSavePaymentSettingsCore(db, 'tnt_alpha', 'owner-uid', {
        mpAccessToken: rawToken,
        mpWebhookSecret: rawSecret,
      });

      expect(saved.configured).toBe(true);
      expect(saved.maskedAccessToken).toBe(maskAccessToken(rawToken));
      expect(saved.hasWebhookSecret).toBe(true);
      expect(saved.isDemoFallbackActive).toBe(false);
      expect(saved.webhookUrl).toContain('?tenantId=tnt_alpha');
      expect(JSON.stringify(saved)).not.toContain(rawToken);
      expect(JSON.stringify(saved)).not.toContain(rawSecret);

      // Tenant & slug bootstrap updated
      expect(store.get('tenants/tnt_alpha')?.mpConfigured).toBe(true);
      expect(store.get('tenant_slugs/estudio-alpha')?.mpConfigured).toBe(true);

      const summary = await adminGetPaymentSettingsSummaryCore(db, 'tnt_alpha');
      expect(summary.configured).toBe(true);
      expect(summary.maskedAccessToken).toBe('APP_USR-...9876');
      expect(summary.hasWebhookSecret).toBe(true);
      expect(JSON.stringify(summary)).not.toContain(rawToken);
      expect(JSON.stringify(summary)).not.toContain(rawSecret);

      // Clear credentials disables mpConfigured on commercial tenant
      const cleared = await adminSavePaymentSettingsCore(db, 'tnt_alpha', 'owner-uid', {
        clearCredentials: true,
      });
      expect(cleared.configured).toBe(false);
      expect(cleared.maskedAccessToken).toBeNull();
      expect(cleared.hasWebhookSecret).toBe(false);
      expect(store.get('tenants/tnt_alpha')?.mpConfigured).toBe(false);
    });
  });

  describe('Particionado de cachés en memoria por tenantId', () => {
    it('getOwnerProfileCached y getLiveServicesCatalogCached aíslan datos entre tenants distintos', async () => {
      const { db } = createInMemoryFirestore({
        'tenants/tnt_alpha': { id: 'tnt_alpha', name: 'Salón Alpha', isDemo: false },
        'tenants/tnt_beta': { id: 'tnt_beta', name: 'Salón Beta', isDemo: false },
        'tenants/tnt_alpha/ownerinfo/profile': {
          businessName: 'Salón Alpha',
          email: 'alpha@salon.com',
          phone: '5491111111111',
        },
        'tenants/tnt_beta/ownerinfo/profile': {
          businessName: 'Salón Beta',
          email: 'beta@salon.com',
          phone: '5491122222222',
        },
        'tenants/tnt_alpha/services/srv-a': {
          name: 'Lifting Alpha',
          basePrice: 15000,
          durationMinutes: 60,
        },
        'tenants/tnt_beta/services/srv-b': {
          name: 'Corte Beta',
          basePrice: 25000,
          durationMinutes: 45,
        },
      });

      const [profileA, profileB] = await Promise.all([
        getOwnerProfileCached(db, 'tnt_alpha', 1000),
        getOwnerProfileCached(db, 'tnt_beta', 1000),
      ]);
      expect(profileA.businessName).toBe('Salón Alpha');
      expect(profileA.ownerEmail).toBe('alpha@salon.com');
      expect(profileB.businessName).toBe('Salón Beta');
      expect(profileB.ownerEmail).toBe('beta@salon.com');

      const [servicesA, servicesB] = await Promise.all([
        getLiveServicesCatalogCached(db, 'tnt_alpha', 1000),
        getLiveServicesCatalogCached(db, 'tnt_beta', 1000),
      ]);
      expect(servicesA).toHaveLength(1);
      expect(servicesA[0].name).toBe('Lifting Alpha');
      expect(servicesB).toHaveLength(1);
      expect(servicesB[0].name).toBe('Corte Beta');
    });
  });
});
