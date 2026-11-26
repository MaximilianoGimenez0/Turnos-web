import { createHmac } from 'crypto';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../src/services/firebaseConfig';
import {
  initTestEmulators,
  EMULATOR_HOST,
  FUNCTIONS_PORT,
  PROJECT_ID,
} from '../setup/emulatorConfig';
import {
  resetTestEnvironment,
  seedFirestoreDocument,
  seedTestTenant,
} from '../setup/testEnvironment';
import {
  createClientDataFixture,
  createTenantPrivateIntegrationsFixture,
} from '../setup/fixtures';
import type { ClientData } from '../../src/types';

describe('Integración - Cloud Functions Multi-Tenant (createPreference, verifyPayment, mpWebhook)', () => {
  const demoTenantId = 'tnt_demo';
  const commercialNoMpId = 'tnt_nomp';
  const commercialWithMpId = 'tnt_withmp';
  const suspendedTenantId = 'tnt_susp';
  const webhookBaseUrl = `http://${EMULATOR_HOST}:${FUNCTIONS_PORT}/${PROJECT_ID}/us-central1/mpWebhook`;

  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await resetTestEnvironment();

    await seedTestTenant({
      tenantId: demoTenantId,
      slug: 'demo',
      name: 'Estudio Demo',
      isDemo: true,
      mpConfigured: true,
    });

    await seedTestTenant({
      tenantId: commercialNoMpId,
      slug: 'salon-sin-mp',
      name: 'Salón Sin MP',
      isDemo: false,
      mpConfigured: false,
    });

    await seedTestTenant({
      tenantId: commercialWithMpId,
      slug: 'salon-con-mp',
      name: 'Salón Con MP',
      isDemo: false,
      mpConfigured: true,
      privateIntegrations: createTenantPrivateIntegrationsFixture({
        mpAccessToken: 'APP_USR-9999888877-own-token-1234',
        mpWebhookSecret: 'whsec_salon_con_mp_secret_1234',
      }),
    });

    await seedTestTenant({
      tenantId: suspendedTenantId,
      slug: 'salon-suspendido',
      name: 'Salón Suspendido',
      status: 'suspended',
      isDemo: false,
      mpConfigured: false,
    });
  });

  describe('createPreference (Callable Cloud Function)', () => {
    const callCreatePreference = () =>
      httpsCallable<
        { tenantId?: string; slotId?: string; clientData?: ClientData },
        { preferenceId: string; initPoint: string }
      >(functions, 'createPreference');

    it('rechaza con invalid-argument si falta tenantId o datos requeridos del cliente', async () => {
      await expect(
        callCreatePreference()({
          slotId: 'slot-1',
          clientData: createClientDataFixture(),
        })
      ).rejects.toMatchObject({ code: 'functions/invalid-argument' });

      await expect(
        callCreatePreference()({
          tenantId: demoTenantId,
          slotId: '',
          clientData: { name: '', email: '' } as unknown as ClientData,
        })
      ).rejects.toMatchObject({ code: 'functions/invalid-argument' });
    });

    it('rechaza con failed-precondition cuando un tenant comercial (isDemo: false) no tiene credenciales MP propias', async () => {
      await seedFirestoreDocument(`tenants/${commercialNoMpId}/slots/slot-future`, {
        tenantId: commercialNoMpId,
        datetime: '2027-05-15T14:00:00.000Z',
        status: 'available',
        depositAmount: 5000,
        services: [{ id: 'srv-1', name: 'Lifting de Pestañas', basePrice: 18000, durationMinutes: 60 }],
      });

      await expect(
        callCreatePreference()({
          tenantId: commercialNoMpId,
          slotId: 'slot-future',
          clientData: createClientDataFixture(),
        })
      ).rejects.toMatchObject({ code: 'functions/failed-precondition' });
    });

    it('rechaza con failed-precondition cuando el tenant está suspendido', async () => {
      await expect(
        callCreatePreference()({
          tenantId: suspendedTenantId,
          slotId: 'slot-any',
          clientData: createClientDataFixture(),
        })
      ).rejects.toMatchObject({ code: 'functions/failed-precondition' });
    });

    it('rechaza con not-found si el turno especificado no existe en el tenant activo', async () => {
      await expect(
        callCreatePreference()({
          tenantId: demoTenantId,
          slotId: 'slot-inexistente-123',
          clientData: createClientDataFixture(),
        })
      ).rejects.toMatchObject({ code: 'functions/not-found' });
    });
  });

  describe('verifyPayment (Callable Cloud Function)', () => {
    const callVerifyPayment = () =>
      httpsCallable<
        { tenantId?: string; paymentId?: string; slotId?: string },
        {
          success: boolean;
          status: string;
          slotId?: string;
          bookingDetails?: Record<string, unknown>;
        }
      >(functions, 'verifyPayment');

    it('rechaza con invalid-argument si falta tenantId o paymentId', async () => {
      await expect(callVerifyPayment()({ paymentId: '12345' })).rejects.toMatchObject({
        code: 'functions/invalid-argument',
      });

      await expect(callVerifyPayment()({ tenantId: demoTenantId })).rejects.toMatchObject({
        code: 'functions/invalid-argument',
      });
    });

    it('resuelve por fast-path un turno ya confirmado con el mismo paymentId dentro del tenant correcto', async () => {
      await seedFirestoreDocument(`tenants/${commercialWithMpId}/slots/slot-confirmed`, {
        tenantId: commercialWithMpId,
        datetime: '2027-06-10T14:00:00.000Z',
        status: 'confirmed',
        depositAmount: 5000,
        paidAmount: 5000,
        paymentId: 'mp-fastpath-777',
        emailStatus: 'sent',
        serviceName: 'Lifting de Pestañas',
        estimatedDurationMinutes: 60,
        clientData: {
          name: 'Lucía Benítez',
          email: 'lucia.benitez@example.com',
          estimatedPrice: 18000,
        },
      });

      const res = await callVerifyPayment()({
        tenantId: commercialWithMpId,
        paymentId: 'mp-fastpath-777',
        slotId: 'slot-confirmed',
      });

      expect(res.data.success).toBe(true);
      expect(res.data.status).toBe('confirmed');
      expect(res.data.slotId).toBe('slot-confirmed');
      expect(res.data.bookingDetails?.clientName).toBe('Lucía Benítez');
      expect(res.data.bookingDetails?.maskedClientEmail).toBe('lu***@example.com');
    });

    it('expone desglose completo con recargo en verifyPayment fast-path para PaymentSuccess', async () => {
      await seedFirestoreDocument(`tenants/${commercialWithMpId}/slots/slot-confirmed-surcharge`, {
        tenantId: commercialWithMpId,
        datetime: '2027-06-12T22:00:00.000Z',
        status: 'confirmed',
        depositAmount: 5000,
        paidAmount: 5000,
        paymentId: 'mp-surcharge-888',
        emailStatus: 'sent',
        serviceName: 'Lifting de Pestañas',
        estimatedDurationMinutes: 60,
        surcharge: { type: 'percentage', value: 20, reason: 'Horario nocturno' },
        clientData: {
          name: 'Sofía Gómez',
          email: 'sofia.gomez@example.com',
          basePrice: 20000,
          extrasPrice: 3000,
          surchargeType: 'percentage',
          surchargeValue: 20,
          surchargeAmount: 4600,
          surchargeReason: 'Horario nocturno',
          estimatedPrice: 27600,
        },
      });

      const res = await callVerifyPayment()({
        tenantId: commercialWithMpId,
        paymentId: 'mp-surcharge-888',
        slotId: 'slot-confirmed-surcharge',
      });

      expect(res.data.success).toBe(true);
      expect(res.data.bookingDetails?.basePrice).toBe(20000);
      expect(res.data.bookingDetails?.extrasPrice).toBe(3000);
      expect(res.data.bookingDetails?.surchargeType).toBe('percentage');
      expect(res.data.bookingDetails?.surchargeValue).toBe(20);
      expect(res.data.bookingDetails?.surchargeAmount).toBe(4600);
      expect(res.data.bookingDetails?.surchargeReason).toBe('Horario nocturno');
      expect(res.data.bookingDetails?.estimatedPrice).toBe(27600);
    });
  });

  describe('mpWebhook (HTTP Cloud Function)', () => {
    it('responde 400 si falta tenantId o tiene formato inválido', async () => {
      const missingRes = await fetch(webhookBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test_notification' }),
      });
      expect(missingRes.status).toBe(400);

      const invalidRes = await fetch(`${webhookBaseUrl}?tenantId=invalid/path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test_notification' }),
      });
      expect(invalidRes.status).toBe(400);
    });

    it('responde 400 cuando el tenant comercial no tiene credenciales MP configuradas', async () => {
      const res = await fetch(`${webhookBaseUrl}?tenantId=${commercialNoMpId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test_notification' }),
      });
      expect(res.status).toBe(400);
    });

    it('valida firma HMAC por tenant (401 con firma inválida y 200 con firma válida sin paymentId)', async () => {
      const badSigRes = await fetch(`${webhookBaseUrl}?tenantId=${commercialWithMpId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'ts=1732280000,v1=' + 'a'.repeat(64),
          'x-request-id': 'req-123',
        },
        body: JSON.stringify({ type: 'test_notification' }),
      });
      expect(badSigRes.status).toBe(401);

      const ts = '1732280000';
      const reqId = 'req-valid-123';
      const manifest = `request-id:${reqId};ts:${ts};`;
      const sig = createHmac('sha256', 'whsec_salon_con_mp_secret_1234')
        .update(manifest)
        .digest('hex');

      const okRes = await fetch(`${webhookBaseUrl}?tenantId=${commercialWithMpId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': `ts=${ts},v1=${sig}`,
          'x-request-id': reqId,
        },
        body: JSON.stringify({ type: 'test_notification' }),
      });

      expect(okRes.status).toBe(200);
      const data = await okRes.json();
      expect(data.status).toBe('ignored_no_payment_id');
      expect(data.tenantId).toBe(commercialWithMpId);
    });
  });
});
