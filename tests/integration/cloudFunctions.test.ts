import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  requestPaymentPreference,
  verifySlotPayment,
  createSlot,
} from '../../src/services/db';
import {
  initTestEmulators,
  EMULATOR_HOST,
  FUNCTIONS_PORT,
  PROJECT_ID,
} from '../setup/emulatorConfig';
import { setupAuthenticatedAdmin } from '../setup/testEnvironment';
import { createSlotDataFixture, createClientDataFixture } from '../setup/fixtures';

describe('Integración - Cloud Functions Emulation', () => {
  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await setupAuthenticatedAdmin();
  });

  describe('createPreference (Callable Cloud Function)', () => {
    it('rechaza con invalid-argument si faltan los datos requeridos del cliente', async () => {
      await expect(
        requestPaymentPreference({
          slotId: '',
          clientData: { name: '', email: '' } as any,
        })
      ).rejects.toThrow();
    });

    it('rechaza con not-found si el turno especificado no existe en Firestore', async () => {
      await expect(
        requestPaymentPreference({
          slotId: 'slot-inexistente-123',
          clientData: createClientDataFixture(),
        })
      ).rejects.toThrow();
    });
  });

  describe('verifyPayment (Callable Cloud Function)', () => {
    it('rechaza con invalid-argument si no se envía paymentId ni slotId', async () => {
      await expect(verifySlotPayment(undefined, undefined)).rejects.toThrow();
    });

    it('rechaza con not-found si el slot no tiene un paymentId asociado', async () => {
      const slotId = await createSlot(createSlotDataFixture());
      await expect(verifySlotPayment(undefined, slotId)).rejects.toThrow();
    });
  });

  describe('mpWebhook (HTTP Cloud Function)', () => {
    it('responde 200 OK y status ignored ante notificaciones sin paymentId', async () => {
      const webhookUrl = `http://${EMULATOR_HOST}:${FUNCTIONS_PORT}/${PROJECT_ID}/us-central1/mpWebhook`;
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test_notification' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ignored_no_payment_id');
    });
  });
});
