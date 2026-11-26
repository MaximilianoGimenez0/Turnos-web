import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';
import { db, functions } from '../../src/services/firebaseConfig';
import { getStorageInstance } from '../../src/services/storageService';
import { processExpiredSlots } from '../../functions/src/cronJobs';
import { parsePaymentExternalReference } from '../../functions/src/webhookSecurity';
import {
  AUTH_PORT,
  EMULATOR_HOST,
  FIRESTORE_PORT,
  FUNCTIONS_PORT,
  PROJECT_ID,
  STORAGE_BUCKET,
  STORAGE_PORT,
  initTestEmulators,
} from '../setup/emulatorConfig';
import {
  createTestUserWithClaims,
  resetTestEnvironment,
  seedFirestoreDocument,
  seedStorageObject,
  seedTestTenant,
  signInTestUserWithClaims,
  signOutTestUser,
} from '../setup/testEnvironment';
import {
  createClientDataFixture,
  createSlotDataFixture,
  createTenantMemberFixture,
  createTenantPrivateIntegrationsFixture,
} from '../setup/fixtures';
import type { ClientData, TenantPaymentSettingsSummary } from '../../src/types';

const loadFirebaseAdminForTests = () => {
  const req = createRequire(new URL('../../functions/package.json', import.meta.url));
  return req('firebase-admin');
};

describe('Certificación de Seguridad Cross-Tenant (6 Vectores Obligatorios)', () => {
  const password = 'Password123!';
  const tenantAId = 'tnt_estudioa';
  const tenantBId = 'tnt_estudiob';
  const tenantCId = 'tnt_estudioc';

  const ownerAEmail = 'owner-a@estudioa.com';
  const ownerBEmail = 'owner-b@estudiob.com';
  const platformAdminEmail = 'platform-admin@turneado.app';

  const secretA = 'whsec_estudio_a_secret_1111';
  const secretB = 'whsec_estudio_b_secret_2222';
  const webhookBaseUrl = `http://${EMULATOR_HOST}:${FUNCTIONS_PORT}/${PROJECT_ID}/us-central1/mpWebhook`;
  const sampleImageBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x01, 0x02, 0x03, 0x04]);

  let ownerAUid = '';
  let ownerBUid = '';

  beforeAll(() => {
    initTestEmulators();
    process.env.FIRESTORE_EMULATOR_HOST ||= `${EMULATOR_HOST}:${FIRESTORE_PORT}`;
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= `${EMULATOR_HOST}:${AUTH_PORT}`;
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= `${EMULATOR_HOST}:${STORAGE_PORT}`;
  });

  beforeEach(async () => {
    await resetTestEnvironment();

    const ownerA = await createTestUserWithClaims(ownerAEmail, password, {
      tenants: { [tenantAId]: 'owner' },
    });
    ownerAUid = ownerA.uid;

    const ownerB = await createTestUserWithClaims(ownerBEmail, password, {
      tenants: { [tenantBId]: 'owner' },
    });
    ownerBUid = ownerB.uid;

    await createTestUserWithClaims(platformAdminEmail, password, {
      platformAdmin: true,
    });

    await signOutTestUser();

    await seedTestTenant({
      tenantId: tenantAId,
      slug: 'estudio-a',
      name: 'Estudio A',
      isDemo: false,
      mpConfigured: true,
      members: [
        createTenantMemberFixture({ uid: ownerAUid, email: ownerAEmail, role: 'owner' }),
      ],
      privateIntegrations: createTenantPrivateIntegrationsFixture({
        mpAccessToken: 'APP_USR-1111111111-estudio-a-token',
        mpWebhookSecret: secretA,
        updatedByUid: ownerAUid,
      }),
    });

    await seedTestTenant({
      tenantId: tenantBId,
      slug: 'estudio-b',
      name: 'Estudio B',
      isDemo: false,
      mpConfigured: true,
      members: [
        createTenantMemberFixture({ uid: ownerBUid, email: ownerBEmail, role: 'owner' }),
      ],
      privateIntegrations: createTenantPrivateIntegrationsFixture({
        mpAccessToken: 'APP_USR-2222222222-estudio-b-token',
        mpWebhookSecret: secretB,
        updatedByUid: ownerBUid,
      }),
    });

    await Promise.all([
      seedFirestoreDocument(`tenants/${tenantAId}/slots/s1`, {
        tenantId: tenantAId,
        datetime: '2027-08-20T18:00:00.000Z',
        status: 'available',
        depositAmount: 5000,
        estimatedDurationMinutes: 60,
      }),
      seedFirestoreDocument(`tenants/${tenantAId}/payment_attempts/p1`, {
        tenantId: tenantAId,
        tenantSlug: 'estudio-a',
        slotId: 's1',
        lockToken: 'secret-lock-a',
      }),
      seedFirestoreDocument(`tenants/${tenantBId}/slots/s1`, {
        tenantId: tenantBId,
        datetime: '2027-08-20T18:00:00.000Z',
        status: 'confirmed',
        depositAmount: 6000,
        estimatedDurationMinutes: 60,
        clientData: { name: 'Cliente Confidencial B', phone: '+5491199990000' },
      }),
      seedFirestoreDocument(`tenants/${tenantBId}/services/srv1`, {
        name: 'Servicio B',
        basePrice: 20000,
        durationMinutes: 60,
      }),
      seedFirestoreDocument(`tenants/${tenantBId}/portfolio/p1`, {
        title: 'Trabajo B',
        category: 'Pestañas',
        imageUrl: 'https://example.com/b.webp',
      }),
      seedFirestoreDocument(`tenants/${tenantBId}/payment_incidents/inc1`, {
        tenantId: tenantBId,
        tenantSlug: 'estudio-b',
        paymentId: 'pay-b-1',
        reason: 'double_payment_incident',
      }),
      seedStorageObject(
        `tenants/${tenantBId}/portfolio/existing.webp`,
        sampleImageBytes,
        'image/webp'
      ),
    ]);
  });

  describe('Vector 1 — Anti-Enumeración', () => {
    it('rechaza con permission-denied el listado de /tenants y /tenant_slugs para anónimo y ownerA', async () => {
      await expect(getDocs(collection(db, 'tenants'))).rejects.toMatchObject({
        code: 'permission-denied',
      });
      await expect(getDocs(collection(db, 'tenant_slugs'))).rejects.toMatchObject({
        code: 'permission-denied',
      });

      await signInTestUserWithClaims(ownerAEmail, password);
      await expect(getDocs(collection(db, 'tenants'))).rejects.toMatchObject({
        code: 'permission-denied',
      });
      await expect(getDocs(collection(db, 'tenant_slugs'))).rejects.toMatchObject({
        code: 'permission-denied',
      });

      // PlatformAdmin puede listar /tenants, pero /tenant_slugs jamás es listable
      await signOutTestUser();
      await signInTestUserWithClaims(platformAdminEmail, password);
      const tenantsSnap = await getDocs(collection(db, 'tenants'));
      expect(tenantsSnap.size).toBeGreaterThanOrEqual(2);
      await expect(getDocs(collection(db, 'tenant_slugs'))).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });
  });

  describe('Vector 2 — Lectura/Escritura Cross-Tenant en Firestore', () => {
    it('rechaza con permission-denied que ownerA lea slots/incidentes o escriba services/portfolio/ownerinfo de tenantB', async () => {
      await signInTestUserWithClaims(ownerAEmail, password);

      await expect(getDocs(collection(db, `tenants/${tenantBId}/slots`))).rejects.toMatchObject({
        code: 'permission-denied',
      });
      await expect(
        getDocs(collection(db, `tenants/${tenantBId}/payment_incidents`))
      ).rejects.toMatchObject({
        code: 'permission-denied',
      });

      // Create / update / delete cross-tenant en services
      await expect(
        setDoc(doc(db, `tenants/${tenantBId}/services/hack-srv`), {
          name: 'Inyección',
          basePrice: 1,
        })
      ).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(
        updateDoc(doc(db, `tenants/${tenantBId}/services/srv1`), { basePrice: 1 })
      ).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(
        deleteDoc(doc(db, `tenants/${tenantBId}/services/srv1`))
      ).rejects.toMatchObject({ code: 'permission-denied' });

      // Create / update / delete cross-tenant en portfolio
      await expect(
        setDoc(doc(db, `tenants/${tenantBId}/portfolio/hack-p`), {
          title: 'Hack',
          imageUrl: 'https://example.com/hack.webp',
        })
      ).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(
        updateDoc(doc(db, `tenants/${tenantBId}/portfolio/p1`), { title: 'Alterado' })
      ).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(
        deleteDoc(doc(db, `tenants/${tenantBId}/portfolio/p1`))
      ).rejects.toMatchObject({ code: 'permission-denied' });

      // Update cross-tenant en ownerinfo/profile
      await expect(
        updateDoc(doc(db, `tenants/${tenantBId}/ownerinfo/profile`), {
          businessName: 'Secuestrado',
        })
      ).rejects.toMatchObject({ code: 'permission-denied' });
    });
  });

  describe('Vector 3 — Inmutabilidad de slots y Blindaje de Secretos en el Propio Tenant', () => {
    it('rechaza mutación directa de slots y lectura de private_config/payment_attempts incluso para ownerA', async () => {
      await signInTestUserWithClaims(ownerAEmail, password);

      await expect(
        setDoc(doc(db, `tenants/${tenantAId}/slots/s1`), {
          tenantId: tenantAId,
          status: 'confirmed',
        })
      ).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(
        updateDoc(doc(db, `tenants/${tenantAId}/slots/s1`), { status: 'cancelled' })
      ).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(
        deleteDoc(doc(db, `tenants/${tenantAId}/slots/s1`))
      ).rejects.toMatchObject({ code: 'permission-denied' });

      await expect(
        getDoc(doc(db, `tenants/${tenantAId}/private_config/integrations`))
      ).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(
        getDoc(doc(db, `tenants/${tenantAId}/payment_attempts/p1`))
      ).rejects.toMatchObject({ code: 'permission-denied' });
    });
  });

  describe('Vector 4 — Aislamiento Cross-Tenant en Cloud Storage', () => {
    it('rechaza con storage/unauthorized que ownerA suba o borre archivos bajo tenants/tnt_estudiob/*', async () => {
      const storage = getStorageInstance();
      await signInTestUserWithClaims(ownerAEmail, password);

      const hackUploadRef = ref(storage, `tenants/${tenantBId}/portfolio/hack.webp`);
      await expect(
        uploadBytes(hackUploadRef, sampleImageBytes, { contentType: 'image/webp' })
      ).rejects.toMatchObject({ code: 'storage/unauthorized' });

      const victimDeleteRef = ref(storage, `tenants/${tenantBId}/portfolio/existing.webp`);
      await expect(deleteObject(victimDeleteRef)).rejects.toMatchObject({
        code: 'storage/unauthorized',
      });

      // Archivo de tenantB sigue íntegro
      const bytes = await getBytes(victimDeleteRef);
      expect(bytes.byteLength).toBe(sampleImageBytes.byteLength);
    });
  });

  describe('Vector 5 — Falsificación de tenantId en Cloud Functions (onCall)', () => {
    it('rechaza con permission-denied todas las callables admin* dirigidas a tenantB y las callables superadmin* invocadas por ownerA', async () => {
      await signInTestUserWithClaims(ownerAEmail, password);

      const adminCreateSlots = httpsCallable(functions, 'adminCreateSlots');
      const adminAssignSlot = httpsCallable(functions, 'adminAssignSlot');
      const adminCancelSlot = httpsCallable(functions, 'adminCancelSlot');
      const adminReleaseSlot = httpsCallable(functions, 'adminReleaseSlot');
      const adminDeleteSlot = httpsCallable(functions, 'adminDeleteSlot');
      const adminSavePaymentSettings = httpsCallable(functions, 'adminSavePaymentSettings');
      const adminGetPaymentSettingsSummary = httpsCallable(
        functions,
        'adminGetPaymentSettingsSummary'
      );
      const superadminCreateTenant = httpsCallable(functions, 'superadminCreateTenant');
      const superadminUpdateTenant = httpsCallable(functions, 'superadminUpdateTenant');

      await Promise.all([
        expect(
          adminCreateSlots({
            tenantId: tenantBId,
            slots: [createSlotDataFixture({ datetime: '2027-09-01T15:00:00.000Z' })],
          })
        ).rejects.toMatchObject({ code: 'functions/permission-denied' }),

        expect(
          adminAssignSlot({
            tenantId: tenantBId,
            slotId: 's1',
            clientData: createClientDataFixture(),
          })
        ).rejects.toMatchObject({ code: 'functions/permission-denied' }),

        expect(
          adminCancelSlot({ tenantId: tenantBId, slotId: 's1' })
        ).rejects.toMatchObject({ code: 'functions/permission-denied' }),

        expect(
          adminReleaseSlot({ tenantId: tenantBId, slotId: 's1' })
        ).rejects.toMatchObject({ code: 'functions/permission-denied' }),

        expect(
          adminDeleteSlot({ tenantId: tenantBId, slotId: 's1' })
        ).rejects.toMatchObject({ code: 'functions/permission-denied' }),

        expect(
          adminSavePaymentSettings({
            tenantId: tenantBId,
            mpAccessToken: 'APP_USR-forged-token-9999',
          })
        ).rejects.toMatchObject({ code: 'functions/permission-denied' }),

        expect(
          adminGetPaymentSettingsSummary({ tenantId: tenantBId })
        ).rejects.toMatchObject({ code: 'functions/permission-denied' }),

        expect(
          superadminCreateTenant({
            name: 'Tenant Ilegal',
            slug: 'tenant-ilegal',
            ownerEmail: 'attacker@example.com',
          })
        ).rejects.toMatchObject({ code: 'functions/permission-denied' }),

        expect(
          superadminUpdateTenant({
            tenantId: tenantBId,
            status: 'suspended',
          })
        ).rejects.toMatchObject({ code: 'functions/permission-denied' }),
      ]);
    });
  });

  describe('Vector 6 — Aislamiento de Agenda, Cron Jobs, Webhook de Pagos y Fallback Comercial', () => {
    it('aísla conflictos de agenda a las 15:00/15:30 hs: confirmar en tenantA solo marca conflict en tenantA y deja intacto a tenantB', async () => {
      const slot1500Iso = '2027-08-25T18:00:00.000Z'; // 15:00 hs Argentina
      const slot1530Iso = '2027-08-25T18:30:00.000Z'; // 15:30 hs Argentina

      const adminCreateSlots = httpsCallable<
        { tenantId: string; slots: ReturnType<typeof createSlotDataFixture>[] },
        { createdIds: string[] }
      >(functions, 'adminCreateSlots');
      const adminAssignSlot = httpsCallable<
        { tenantId: string; slotId: string; clientData: ClientData },
        { success: boolean }
      >(functions, 'adminAssignSlot');

      // Crear 15:00 y 15:30 en tenantA
      await signInTestUserWithClaims(ownerAEmail, password);
      const createdA = await adminCreateSlots({
        tenantId: tenantAId,
        slots: [
          createSlotDataFixture({ datetime: slot1500Iso, estimatedDurationMinutes: 60 }),
          createSlotDataFixture({ datetime: slot1530Iso, estimatedDurationMinutes: 60 }),
        ],
      });
      const [slotA1500Id, slotA1530Id] = createdA.data.createdIds;

      // Crear 15:00 y 15:30 en tenantB
      await signOutTestUser();
      await signInTestUserWithClaims(ownerBEmail, password);
      const createdB = await adminCreateSlots({
        tenantId: tenantBId,
        slots: [
          createSlotDataFixture({ datetime: slot1500Iso, estimatedDurationMinutes: 60 }),
          createSlotDataFixture({ datetime: slot1530Iso, estimatedDurationMinutes: 60 }),
        ],
      });
      const [slotB1500Id, slotB1530Id] = createdB.data.createdIds;

      // Confirmar 15:00 solo en tenantA
      await signOutTestUser();
      await signInTestUserWithClaims(ownerAEmail, password);
      await adminAssignSlot({
        tenantId: tenantAId,
        slotId: slotA1500Id,
        clientData: createClientDataFixture({ estimatedDurationMinutes: 60 }),
      });

      const [snapA1500, snapA1530] = await Promise.all([
        getDoc(doc(db, `tenants/${tenantAId}/slots/${slotA1500Id}`)),
        getDoc(doc(db, `tenants/${tenantAId}/slots/${slotA1530Id}`)),
      ]);
      expect(snapA1500.data()?.status).toBe('confirmed');
      expect(snapA1530.data()?.status).toBe('conflict');

      // Verificar en tenantB que tanto 15:00 como 15:30 permanecen available
      await signOutTestUser();
      await signInTestUserWithClaims(ownerBEmail, password);
      const [snapB1500, snapB1530] = await Promise.all([
        getDoc(doc(db, `tenants/${tenantBId}/slots/${slotB1500Id}`)),
        getDoc(doc(db, `tenants/${tenantBId}/slots/${slotB1530Id}`)),
      ]);
      expect(snapB1500.data()?.status).toBe('available');
      expect(snapB1530.data()?.status).toBe('available');
    });

    it('processExpiredSlots agrupa por tenantId en collectionGroup("slots") sin propagar conflictos entre tenants', async () => {
      const confirmed1500Iso = '2027-08-26T18:00:00.000Z';
      const pending1530Iso = '2027-08-26T18:30:00.000Z';
      const expiredIso = '2026-01-01T10:00:00.000Z';

      await Promise.all([
        seedFirestoreDocument(`tenants/${tenantAId}/slots/cron-conf-a`, {
          tenantId: tenantAId,
          datetime: confirmed1500Iso,
          status: 'confirmed',
          estimatedDurationMinutes: 60,
        }),
        seedFirestoreDocument(`tenants/${tenantAId}/slots/cron-exp-a`, {
          tenantId: tenantAId,
          datetime: pending1530Iso,
          status: 'pending_payment',
          expiresAt: expiredIso,
          previousDurationMinutes: 60,
          previousDuration: '60 min',
        }),
        seedFirestoreDocument(`tenants/${tenantBId}/slots/cron-exp-b`, {
          tenantId: tenantBId,
          datetime: pending1530Iso,
          status: 'pending_payment',
          expiresAt: expiredIso,
          previousDurationMinutes: 60,
          previousDuration: '60 min',
        }),
      ]);

      const admin = loadFirebaseAdminForTests();
      const appName = `cross-tenant-cron-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const adminApp = admin.initializeApp({ projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET }, appName);

      try {
        const adminDb = adminApp.firestore();
        const cronResult = await processExpiredSlots(
          adminDb,
          new Date('2026-11-24T12:00:00.000Z').getTime()
        );
        expect(cronResult.conflictedCount).toBe(1);
        expect(cronResult.releasedCount).toBe(1);

        const [afterA, afterB] = await Promise.all([
          adminDb.doc(`tenants/${tenantAId}/slots/cron-exp-a`).get(),
          adminDb.doc(`tenants/${tenantBId}/slots/cron-exp-b`).get(),
        ]);
        expect(afterA.data()?.status).toBe('conflict');
        expect(afterB.data()?.status).toBe('available');
      } finally {
        await adminApp.delete().catch(() => {});
      }
    });

    it('rechaza notificación a mpWebhook?tenantId=tnt_estudiob referenciando un pago de tnt_estudioa sin modificar ningún tenant', async () => {
      const paymentId = '9988776655';
      const ts = '1732280000';
      const reqId = 'req-cross-tenant-1';
      const manifest = `id:${paymentId};request-id:${reqId};ts:${ts};`;
      // Firma generada con el secreto de tenantA enviada al endpoint de tenantB
      const tenantASignature = createHmac('sha256', secretA).update(manifest).digest('hex');

      const response = await fetch(`${webhookBaseUrl}?tenantId=${tenantBId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': `ts=${ts},v1=${tenantASignature}`,
          'x-request-id': reqId,
        },
        body: JSON.stringify({
          type: 'payment',
          data: { id: paymentId },
          external_reference: `${tenantAId}:s1`,
          metadata: { tenant_id: tenantAId, slot_id: 's1' },
        }),
      });

      expect([401, 403]).toContain(response.status);

      // Verificación adicional del contrato de binding external_reference
      const parsedRef = parsePaymentExternalReference(`${tenantAId}:s1`);
      expect(parsedRef.tenantId).toBe(tenantAId);
      expect(parsedRef.tenantId).not.toBe(tenantBId);

      // Ningún slot de tenantA ni tenantB fue modificado
      await signInTestUserWithClaims(ownerAEmail, password);
      const slotASnap = await getDoc(doc(db, `tenants/${tenantAId}/slots/s1`));
      expect(slotASnap.data()?.status).toBe('available');

      await signOutTestUser();
      await signInTestUserWithClaims(ownerBEmail, password);
      const slotBSnap = await getDoc(doc(db, `tenants/${tenantBId}/slots/s1`));
      expect(slotBSnap.data()?.status).toBe('confirmed');
    });

    it('rechaza createPreference con failed-precondition en tenantC (isDemo: false sin credenciales MP propias) sin usar fallback global', async () => {
      await seedTestTenant({
        tenantId: tenantCId,
        slug: 'estudio-c',
        name: 'Estudio C Sin MP',
        isDemo: false,
        mpConfigured: false,
      });

      await seedFirestoreDocument(`tenants/${tenantCId}/slots/slot-c1`, {
        tenantId: tenantCId,
        datetime: '2027-09-10T18:00:00.000Z',
        status: 'available',
        depositAmount: 5000,
        estimatedDurationMinutes: 60,
        services: [{ id: 'srv-1', name: 'Lifting de Pestañas', basePrice: 18000, durationMinutes: 60 }],
      });

      const callCreatePreference = httpsCallable<
        { tenantId: string; slotId: string; clientData: ClientData },
        { preferenceId: string }
      >(functions, 'createPreference');

      await expect(
        callCreatePreference({
          tenantId: tenantCId,
          slotId: 'slot-c1',
          clientData: createClientDataFixture(),
        })
      ).rejects.toMatchObject({ code: 'functions/failed-precondition' });

      // El turno no quedó bloqueado en pending_payment
      await signInTestUserWithClaims(platformAdminEmail, password);
      const slotCSnap = await getDoc(doc(db, `tenants/${tenantCId}/slots/slot-c1`));
      expect(slotCSnap.data()?.status).toBe('available');

      // También confirmamos que adminGetPaymentSettingsSummary no expone fallback demo en tenant comercial
      const getSummary = httpsCallable<{ tenantId: string }, TenantPaymentSettingsSummary>(
        functions,
        'adminGetPaymentSettingsSummary'
      );
      const summaryC = await getSummary({ tenantId: tenantCId });
      expect(summaryC.data.configured).toBe(false);
      expect(summaryC.data.isDemoFallbackActive).toBe(false);
    });
  });
});
