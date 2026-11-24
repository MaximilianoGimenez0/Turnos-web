import { createHmac } from 'crypto';
import { describe, it, expect } from 'vitest';
import {
  validateAndNormalizeClientPayload,
  MAX_BOOKING_DURATION_MINUTES,
  maskEmail,
} from '../../functions/src/bookingValidation';
import {
  parsePaymentExternalReference,
  verifyMercadoPagoSignature,
} from '../../functions/src/webhookSecurity';
import { escapeHtml } from '../../functions/src/emailService';

describe('functions security & validation (F-06, F-07, F-08)', () => {
  describe('validateAndNormalizeClientPayload (F-06)', () => {
    const slotServices = [
      {
        id: 'srv-1',
        name: 'Lifting de Pestañas',
        basePrice: 18000,
        durationMinutes: 60,
        extras: [{ id: 'ex-1', name: 'Tinte', price: 3500 }],
      },
      {
        id: 'srv-2',
        name: 'Perfilado de Cejas',
        basePrice: 7000,
        durationMinutes: 30,
        extras: [],
      },
    ];

    it('recalcula precios y duración desde el catálogo del slot ignorando valores manipulados del cliente', () => {
      const result = validateAndNormalizeClientPayload(
        {
          name: '  Sofía Pérez  ',
          email: '  SOFIA@MAIL.COM ',
          phone: '+54 9 11 1234-5678',
          bookedServices: [
            {
              serviceId: 'srv-1',
              name: 'Lifting de Pestañas',
              basePrice: 0, // intento de manipulación
              durationMinutes: 99999, // intento de DoS de agenda
              extras: [{ id: 'ex-1', name: 'Tinte', price: 0, selected: true }],
            },
          ],
          estimatedPrice: 1,
          estimatedDurationMinutes: 0,
        },
        slotServices
      );

      expect(result.valid).toBe(true);
      if (!result.valid) return;

      expect(result.data.normalizedEmail).toBe('sofia@mail.com');
      expect(result.data.estimatedDurationMinutes).toBe(60);
      expect(result.data.clientDataToSave.basePrice).toBe(18000);
      expect(result.data.clientDataToSave.extrasPrice).toBe(3500);
      expect(result.data.clientDataToSave.estimatedPrice).toBe(21500);
    });

    it('rechaza servicios inexistentes o correos inválidos y acota duración legacy', () => {
      const badService = validateAndNormalizeClientPayload(
        {
          name: 'Sofía Pérez',
          email: 'sofia@mail.com',
          selectedServices: ['Servicio Inventado'],
        },
        slotServices
      );
      expect(badService.valid).toBe(false);

      const badEmail = validateAndNormalizeClientPayload(
        {
          name: 'Sofía Pérez',
          email: 'no-es-email',
          selectedServices: ['Lifting de Pestañas'],
        },
        slotServices
      );
      expect(badEmail.valid).toBe(false);

      const legacyClamped = validateAndNormalizeClientPayload(
        {
          name: 'Sofía Pérez',
          email: 'sofia@mail.com',
          estimatedDurationMinutes: 50000,
        },
        undefined
      );
      expect(legacyClamped.valid).toBe(true);
      if (legacyClamped.valid) {
        expect(legacyClamped.data.estimatedDurationMinutes).toBe(MAX_BOOKING_DURATION_MINUTES);
      }
    });

    it('enmascara emails para logging seguro', () => {
      expect(maskEmail('ana.gomez@gmail.com')).toBe('an***@gmail.com');
      expect(maskEmail('')).toBe('[none]');
    });

    it('resuelve precios, extras y duración vivos desde /services con fallback al snapshot si un servicio fue borrado (DB-06)', () => {
      const liveCatalog = [
        {
          id: 'srv-1',
          name: 'Lifting Premium', // renombrado y actualizado en /services
          basePrice: 22000,
          durationMinutes: 75,
          extras: [
            { id: 'ex-1', name: 'Tinte', price: 4000 },
            { id: 'ex-new', name: 'Botox pestañas', price: 5000 },
          ],
        },
        {
          id: 'srv-unlisted',
          name: 'Otro Servicio No Habilitado',
          basePrice: 10000,
          durationMinutes: 30,
          extras: [],
        },
      ];

      const liveRes = validateAndNormalizeClientPayload(
        {
          name: 'Sofía Pérez',
          email: 'sofia@mail.com',
          bookedServices: [
            {
              serviceId: 'srv-1',
              name: 'Lifting Premium',
              basePrice: 0,
              durationMinutes: 0,
              extras: [{ id: 'ex-new', name: 'Botox pestañas', price: 0, selected: true }],
            },
          ],
        },
        slotServices,
        0,
        { requireEmail: true, liveCatalog }
      );
      expect(liveRes.valid).toBe(true);
      if (liveRes.valid) {
        expect(liveRes.data.estimatedDurationMinutes).toBe(75);
        expect(liveRes.data.clientDataToSave.basePrice).toBe(22000);
        expect(liveRes.data.clientDataToSave.extrasPrice).toBe(5000);
        expect(liveRes.data.clientDataToSave.estimatedPrice).toBe(27000);
      }

      // Servicio srv-2 no está en liveCatalog (borrado de /services) -> cae al snapshot del slot
      const fallbackRes = validateAndNormalizeClientPayload(
        {
          name: 'Sofía Pérez',
          email: 'sofia@mail.com',
          bookedServices: [
            {
              serviceId: 'srv-2',
              name: 'Perfilado de Cejas',
              basePrice: 0,
              durationMinutes: 0,
              extras: [],
            },
          ],
        },
        slotServices,
        0,
        { requireEmail: true, liveCatalog }
      );
      expect(fallbackRes.valid).toBe(true);
      if (fallbackRes.valid) {
        expect(fallbackRes.data.clientDataToSave.basePrice).toBe(7000);
        expect(fallbackRes.data.estimatedDurationMinutes).toBe(30);
      }

      // Servicio del catálogo vivo NO habilitado en el turno -> rechazado
      const forbiddenRes = validateAndNormalizeClientPayload(
        {
          name: 'Sofía Pérez',
          email: 'sofia@mail.com',
          bookedServices: [
            {
              serviceId: 'srv-unlisted',
              name: 'Otro Servicio No Habilitado',
              basePrice: 10000,
              durationMinutes: 30,
              extras: [],
            },
          ],
        },
        slotServices,
        0,
        { requireEmail: true, liveCatalog }
      );
      expect(forbiddenRes.valid).toBe(false);
    });
  });

  describe('verifyMercadoPagoSignature (F-07)', () => {
    const secret = 'super_secret_mp_key_123';

    it('valida correctamente una firma HMAC-SHA256 legítima de Mercado Pago', () => {
      const dataId = '1234567890';
      const requestId = 'req-abc-999';
      const ts = '1732280000';
      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      const v1 = createHmac('sha256', secret).update(manifest).digest('hex');

      const res = verifyMercadoPagoSignature({
        xSignatureHeader: `ts=${ts},v1=${v1}`,
        xRequestIdHeader: requestId,
        dataId,
        secret,
      });
      expect(res).toEqual({ verified: true, enforced: true, reason: undefined });
    });

    it('rechaza firmas alteradas o ausentes cuando el secreto está configurado', () => {
      const missing = verifyMercadoPagoSignature({
        xSignatureHeader: undefined,
        dataId: '123',
        secret,
      });
      expect(missing.verified).toBe(false);
      expect(missing.enforced).toBe(true);

      const forged = verifyMercadoPagoSignature({
        xSignatureHeader: 'ts=1732280000,v1=' + 'a'.repeat(64),
        xRequestIdHeader: 'req-1',
        dataId: '123',
        secret,
      });
      expect(forged.verified).toBe(false);
      expect(forged.reason).toBe('signature_mismatch');
    });

    it('permite pasar sin enforcement cuando MP_WEBHOOK_SECRET no está configurado', () => {
      const res = verifyMercadoPagoSignature({
        xSignatureHeader: undefined,
        dataId: '123',
        secret: '',
      });
      expect(res.verified).toBe(true);
      expect(res.enforced).toBe(false);
    });
  });

  describe('escapeHtml (F-08)', () => {
    it('escapa caracteres HTML peligrosos en notas y nombres de clientes', () => {
      expect(escapeHtml('<script>alert("xss")</script> & \'test\'')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;test&#39;'
      );
    });
  });

  describe('parsePaymentExternalReference (vinculación webhook-tenant)', () => {
    it('extrae tenantId y slotId desde external_reference con formato tenantId:slotId', () => {
      expect(parsePaymentExternalReference('tnt_alpha:slot-123')).toEqual({
        tenantId: 'tnt_alpha',
        slotId: 'slot-123',
      });
      expect(parsePaymentExternalReference('slot-legacy-only')).toEqual({
        slotId: 'slot-legacy-only',
      });
      expect(parsePaymentExternalReference('')).toEqual({});
      expect(parsePaymentExternalReference(undefined)).toEqual({});
    });
  });
});
