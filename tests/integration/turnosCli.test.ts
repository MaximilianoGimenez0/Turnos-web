import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withAdminApp, listAllAuthUsers } from '../../scripts/cli/core/firebase.mjs';
import { runBackupExport } from '../../scripts/cli/commands/backup.mjs';
import { runTenantCommand } from '../../scripts/cli/commands/tenant.mjs';
import { runReset } from '../../scripts/cli/commands/reset.mjs';
import { runInit } from '../../scripts/cli/commands/init.mjs';
import { PROJECT_ID, STORAGE_BUCKET, initTestEmulators } from '../setup/emulatorConfig';
import { resetTestEnvironment } from '../setup/testEnvironment';

const SECRET_MP_TOKEN = 'APP_USR-9999999999999999-secret-token-alpha';
const SECRET_WEBHOOK = 'whsec_super_secret_alpha_999';

const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Integración — TurnosWeb Operations CLI con Firebase Emulators', () => {
  const tempBackupPath = path.join(
    os.tmpdir(),
    `turnos-cli-test-backup-${Date.now()}.json`
  );

  let superAdminUid = '';
  let ownerAlphaUid = '';
  let ownerBetaUid = '';

  const adminOpts = {
    project: PROJECT_ID,
    bucket: STORAGE_BUCKET,
    emulator: true,
  };

  beforeAll(async () => {
    initTestEmulators();
    await resetTestEnvironment();

    await withAdminApp(adminOpts, async ({ auth, db, bucket }) => {
      // 1. Seed Auth users
      const superAdmin = await auth.createUser({
        email: 'superadmin@turnos.test',
        password: 'Password1234!',
        displayName: 'Super Admin',
      });
      superAdminUid = superAdmin.uid;

      const ownerAlpha = await auth.createUser({
        email: 'owner-alpha@turnos.test',
        password: 'Password1234!',
        displayName: 'Owner Alpha',
      });
      ownerAlphaUid = ownerAlpha.uid;

      const ownerBeta = await auth.createUser({
        email: 'owner-beta@turnos.test',
        password: 'Password1234!',
        displayName: 'Owner Beta',
      });
      ownerBetaUid = ownerBeta.uid;

      await auth.setCustomUserClaims(superAdminUid, {
        platformAdmin: true,
        tenants: { tnt_alpha: 'owner', tnt_beta: 'owner' },
      });
      await auth.setCustomUserClaims(ownerAlphaUid, {
        tenants: { tnt_alpha: 'owner' },
      });
      await auth.setCustomUserClaims(ownerBetaUid, {
        tenants: { tnt_beta: 'owner' },
      });

      const nowIso = new Date().toISOString();
      const futureIso = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

      // 2. Seed Tenant Alpha (with alias slug, slots, services, portfolio, private_config, Storage)
      const alphaRef = db.collection('tenants').doc('tnt_alpha');
      await alphaRef.collection('ownerinfo').doc('profile').set({
        name: 'Alpha Studio',
        businessName: 'Alpha Studio',
        email: 'owner-alpha@turnos.test',
        description: 'Estudio Alpha',
        pictureUrl: '',
        updatedAt: nowIso,
      });
      await alphaRef.set({
        id: 'tnt_alpha',
        slug: 'alpha',
        previousSlugs: ['alpha-old'],
        name: 'Alpha Studio',
        status: 'active',
        isDemo: false,
        mpConfigured: true,
        timezone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        createdAt: nowIso,
        updatedAt: nowIso,
        createdByUid: superAdminUid,
      });
      await alphaRef.collection('services').doc('srv_alpha_1').set({
        name: 'Corte Alpha',
        basePrice: 12000,
        durationMinutes: 45,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      await alphaRef.collection('portfolio').doc('port_alpha_1').set({
        title: 'Trabajo Alpha',
        category: 'General',
        imageUrl: 'https://example.com/alpha.jpg',
        createdAt: nowIso,
      });
      await alphaRef.collection('members').doc(ownerAlphaUid).set({
        uid: ownerAlphaUid,
        email: 'owner-alpha@turnos.test',
        displayName: 'Owner Alpha',
        role: 'owner',
        active: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      await alphaRef.collection('private_config').doc('integrations').set({
        mpAccessToken: SECRET_MP_TOKEN,
        mpWebhookSecret: SECRET_WEBHOOK,
        updatedAt: nowIso,
        updatedByUid: ownerAlphaUid,
      });
      await alphaRef.collection('slots').doc('slot_alpha_1').set({
        datetime: futureIso,
        status: 'available',
        depositAmount: 3000,
        serviceName: 'Corte Alpha',
        services: [{ id: 'srv_alpha_1', name: 'Corte Alpha', basePrice: 12000, durationMinutes: 45 }],
        estimatedDurationMinutes: 45,
        estimatedDuration: '45 min',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      await db.collection('tenant_slugs').doc('alpha').set({
        tenantId: 'tnt_alpha',
        slug: 'alpha',
        status: 'active',
        redirectToSlug: null,
        timezone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        mpConfigured: true,
        isDemo: false,
        ownerProfile: { name: 'Alpha Studio', businessName: 'Alpha Studio' },
        updatedAt: nowIso,
      });
      await db.collection('tenant_slugs').doc('alpha-old').set({
        tenantId: 'tnt_alpha',
        slug: 'alpha-old',
        status: 'active',
        redirectToSlug: 'alpha',
        timezone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        mpConfigured: true,
        isDemo: false,
        ownerProfile: { name: 'Alpha Studio', businessName: 'Alpha Studio' },
        updatedAt: nowIso,
      });

      // 3. Seed Tenant Beta
      const betaRef = db.collection('tenants').doc('tnt_beta');
      await betaRef.collection('ownerinfo').doc('profile').set({
        name: 'Beta Studio',
        businessName: 'Beta Studio',
        email: 'owner-beta@turnos.test',
        description: 'Estudio Beta',
        pictureUrl: '',
        updatedAt: nowIso,
      });
      await betaRef.set({
        id: 'tnt_beta',
        slug: 'beta',
        previousSlugs: [],
        name: 'Beta Studio',
        status: 'active',
        isDemo: false,
        mpConfigured: false,
        timezone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        createdAt: nowIso,
        updatedAt: nowIso,
        createdByUid: superAdminUid,
      });
      await betaRef.collection('members').doc(ownerBetaUid).set({
        uid: ownerBetaUid,
        email: 'owner-beta@turnos.test',
        displayName: 'Owner Beta',
        role: 'owner',
        active: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      await betaRef.collection('slots').doc('slot_beta_1').set({
        datetime: futureIso,
        status: 'available',
        depositAmount: 4000,
        serviceName: 'Servicio Beta',
        services: [{ id: 'srv_beta_1', name: 'Servicio Beta', basePrice: 15000, durationMinutes: 60 }],
        estimatedDurationMinutes: 60,
        estimatedDuration: '60 min',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      await db.collection('tenant_slugs').doc('beta').set({
        tenantId: 'tnt_beta',
        slug: 'beta',
        status: 'active',
        redirectToSlug: null,
        timezone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        mpConfigured: false,
        isDemo: false,
        ownerProfile: { name: 'Beta Studio', businessName: 'Beta Studio' },
        updatedAt: nowIso,
      });

      // 4. Upload Storage files for both tenants
      await bucket.file('tenants/tnt_alpha/gallery/sample.txt').save('alpha-content', {
        contentType: 'text/plain',
      });
      await bucket.file('tenants/tnt_beta/logo.txt').save('beta-content', {
        contentType: 'text/plain',
      });
    });

    // Wait briefly for Functions triggers to settle on initial seed
    await waitMs(400);
  });

  afterAll(async () => {
    if (existsSync(tempBackupPath)) {
      unlinkSync(tempBackupPath);
    }
    await resetTestEnvironment();
  });

  it('backup export genera JSON válido excluyendo private_config/integrations por defecto', async () => {
    const result = await runBackupExport({
      ...adminOpts,
      out: tempBackupPath,
      includeSecrets: false,
    });

    expect(existsSync(result.outputPath)).toBe(true);
    expect(result.payload.meta.tenantCount).toBe(2);
    expect(result.payload.meta.includesPrivateSecrets).toBe(false);

    const rawText = readFileSync(result.outputPath, 'utf8');
    expect(rawText).not.toContain(SECRET_MP_TOKEN);
    expect(rawText).not.toContain(SECRET_WEBHOOK);

    const parsed = JSON.parse(rawText) as {
      tenant_slugs: Record<string, unknown>;
      tenants: Record<string, { subcollections: Record<string, unknown> }>;
    };
    expect(Object.keys(parsed.tenants)).toEqual(expect.arrayContaining(['tnt_alpha', 'tnt_beta']));
    expect(parsed.tenant_slugs.alpha).toBeDefined();
    expect(parsed.tenant_slugs['alpha-old']).toBeDefined();
    expect(parsed.tenants.tnt_alpha.subcollections.private_config).toBeUndefined();
    expect(parsed.tenants.tnt_alpha.subcollections.services).toBeDefined();
  });

  it('tenant list / inspect / delete elimina solo tnt_alpha (Firestore + slugs + Storage + claims) dejando tnt_beta intacto', async () => {
    const listBefore = await runTenantCommand({
      ...adminOpts,
      subcommand: 'list',
    });
    expect(listBefore.count).toBe(2);

    const inspectAlpha = await runTenantCommand({
      ...adminOpts,
      subcommand: 'inspect',
      target: 'alpha',
    });
    expect(inspectAlpha.tenantId).toBe('tnt_alpha');
    expect(inspectAlpha.counts.services).toBe(1);
    expect(inspectAlpha.counts.slots).toBe(1);
    expect(inspectAlpha.counts.storageFiles).toBe(1);
    expect(inspectAlpha.integrations.hasOwnToken).toBe(true);
    expect(inspectAlpha.integrations.maskedAccessToken).not.toBe(SECRET_MP_TOKEN);

    const deleteRes = await runTenantCommand({
      ...adminOpts,
      subcommand: 'delete',
      target: 'alpha',
      confirm: 'alpha',
      yes: true,
    });
    expect(deleteRes.executed).toBe(true);
    expect(deleteRes.deletedSlugs).toEqual(expect.arrayContaining(['alpha', 'alpha-old']));
    expect(deleteRes.deletedStorageFiles).toBe(1);

    await withAdminApp(adminOpts, async ({ auth, db, bucket }) => {
      const alphaDoc = await db.collection('tenants').doc('tnt_alpha').get();
      expect(alphaDoc.exists).toBe(false);
      const alphaSubcols = await db.collection('tenants').doc('tnt_alpha').listCollections();
      expect(alphaSubcols).toHaveLength(0);

      expect((await db.collection('tenant_slugs').doc('alpha').get()).exists).toBe(false);
      expect((await db.collection('tenant_slugs').doc('alpha-old').get()).exists).toBe(false);

      const [alphaFiles] = await bucket.getFiles({ prefix: 'tenants/tnt_alpha/' });
      expect(alphaFiles).toHaveLength(0);

      // Auth claims cleaned for ownerAlpha & superAdmin
      const ownerAlphaUser = await auth.getUser(ownerAlphaUid);
      expect(ownerAlphaUser.customClaims?.tenants?.tnt_alpha).toBeUndefined();

      const superUser = await auth.getUser(superAdminUid);
      expect(superUser.customClaims?.platformAdmin).toBe(true);
      expect(superUser.customClaims?.tenants?.tnt_alpha).toBeUndefined();
      expect(superUser.customClaims?.tenants?.tnt_beta).toBe('owner');

      // Tenant Beta remains 100% intact
      expect((await db.collection('tenants').doc('tnt_beta').get()).exists).toBe(true);
      expect((await db.collection('tenant_slugs').doc('beta').get()).exists).toBe(true);
      const [betaFiles] = await bucket.getFiles({ prefix: 'tenants/tnt_beta/' });
      expect(betaFiles).toHaveLength(1);
    });
  });

  it('reset --dry-run audita sin borrar ningún dato', async () => {
    const dryRes = await runReset({
      ...adminOpts,
      dryRun: true,
    });

    expect(dryRes.dryRun).toBe(true);
    expect(dryRes.executed).toBe(false);
    expect(dryRes.storageFilesFound).toBe(1);
    expect(dryRes.authUsersTotal).toBe(3);

    await withAdminApp(adminOpts, async ({ db, bucket }) => {
      expect((await db.collection('tenants').doc('tnt_beta').get()).exists).toBe(true);
      const [files] = await bucket.getFiles();
      expect(files).toHaveLength(1);
    });
  });

  it('reset con --keep-superadmin vacía Firestore y Storage, borra usuarios regulares y preserva SuperAdmin sin claims de tenants', async () => {
    const resetRes = await runReset({
      ...adminOpts,
      confirmProject: PROJECT_ID,
      keepSuperadmin: true,
      yes: true,
    });

    expect(resetRes.executed).toBe(true);
    expect(resetRes.remainingCollections).toHaveLength(0);
    expect(resetRes.deletedStorageFiles).toBe(1);
    expect(resetRes.deletedAuthUsers).toBe(2);
    expect(resetRes.preservedAuthUsers).toBe(1);

    await withAdminApp(adminOpts, async ({ auth, db, bucket }) => {
      const cols = await db.listCollections();
      expect(cols).toHaveLength(0);

      const [files] = await bucket.getFiles();
      expect(files).toHaveLength(0);

      const remainingUsers = await listAllAuthUsers(auth);
      expect(remainingUsers).toHaveLength(1);
      expect(remainingUsers[0].uid).toBe(superAdminUid);
      expect(remainingUsers[0].customClaims?.platformAdmin).toBe(true);
      expect(remainingUsers[0].customClaims?.tenants).toBeUndefined();
    });
  });

  it('reset con --wipe-auth-all deja 0 usuarios en Firebase Auth', async () => {
    const wipeRes = await runReset({
      ...adminOpts,
      confirmProject: PROJECT_ID,
      wipeAuthAll: true,
      yes: true,
    });

    expect(wipeRes.executed).toBe(true);
    expect(wipeRes.deletedAuthUsers).toBe(1);

    await withAdminApp(adminOpts, async ({ auth }) => {
      const remainingUsers = await listAllAuthUsers(auth);
      expect(remainingUsers).toHaveLength(0);
    });
  });

  it('init sin --with-demo crea SuperAdmin en entorno limpio sin negocios', async () => {
    const initRes = await runInit({
      ...adminOpts,
      adminEmail: 'root@turneado.test',
      adminPassword: 'PasswordSegura123',
      withDemo: false,
    });

    expect(initRes.admin.created).toBe(true);
    expect(initRes.admin.claims.platformAdmin).toBe(true);
    expect(initRes.demoStatus).toBe('skipped');

    await withAdminApp(adminOpts, async ({ auth, db }) => {
      const user = await auth.getUserByEmail('root@turneado.test');
      expect(user.customClaims?.platformAdmin).toBe(true);
      expect(user.customClaims?.tenants).toBeUndefined();

      const tenantsSnap = await db.collection('tenants').get();
      expect(tenantsSnap.size).toBe(0);
    });
  });

  it('init --with-demo siembra atómicamente /demo con servicios y turnos, y es idempotente al re-ejecutar', async () => {
    const first = await runInit({
      ...adminOpts,
      adminEmail: 'root@turneado.test',
      withDemo: true,
    });

    expect(first.admin.created).toBe(false);
    expect(first.demoStatus).toBe('created');
    expect(first.demo?.tenantId).toBe('tnt_demo');
    expect(first.demo?.servicesCount).toBe(3);
    expect(first.demo?.portfolioCount).toBe(4);
    expect(first.demo?.slotsCount).toBe(9);

    await withAdminApp(adminOpts, async ({ auth, db }) => {
      const tenantSnap = await db.collection('tenants').doc('tnt_demo').get();
      expect(tenantSnap.exists).toBe(true);
      expect(tenantSnap.data()?.isDemo).toBe(true);

      const slugSnap = await db.collection('tenant_slugs').doc('demo').get();
      expect(slugSnap.exists).toBe(true);
      expect(slugSnap.data()?.tenantId).toBe('tnt_demo');

      const servicesSnap = await db.collection('tenants').doc('tnt_demo').collection('services').get();
      expect(servicesSnap.size).toBe(3);

      const portfolioSnap = await db.collection('tenants').doc('tnt_demo').collection('portfolio').get();
      expect(portfolioSnap.size).toBe(4);
      const imageUrls = portfolioSnap.docs.map((d) => String(d.data()?.imageUrl || ''));
      expect(imageUrls).toEqual(
        expect.arrayContaining([
          '/default/images/demo-nails-french.jpg',
          '/default/images/demo-nails-kapping.jpg',
          '/default/images/demo-nails-nailart.jpg',
          '/default/images/demo-nails-softgel.jpg',
        ])
      );

      const slotsSnap = await db.collection('tenants').doc('tnt_demo').collection('slots').get();
      expect(slotsSnap.size).toBe(9);

      const availSnap = await db
        .collection('tenants')
        .doc('tnt_demo')
        .collection('public_meta')
        .doc('availability')
        .get();
      expect(availSnap.exists).toBe(true);
      expect(Object.keys(availSnap.data()?.slots || {})).toHaveLength(9);

      const user = await auth.getUserByEmail('root@turneado.test');
      expect(user.customClaims?.platformAdmin).toBe(true);
      expect(user.customClaims?.tenants?.tnt_demo).toBe('owner');
    });

    // Segunda ejecución: idempotente (no sobrescribe ni falla)
    const second = await runInit({
      ...adminOpts,
      adminEmail: 'root@turneado.test',
      withDemo: true,
    });
    expect(second.demoStatus).toBe('already-exists');
  });
});
