import { describe, it, expect } from 'vitest';
import {
  buildPaymentProgressModel,
  PAYMENT_STEP_IDS,
} from '../../src/components/admin/PaymentSettings/paymentProgress';
import { computeFormProgress } from '../../src/components/common/FormProgressTracker/progressUtils';
import { PAYMENT_SETTINGS_TEXTS } from '../../src/texts';
import type { TenantPaymentSettingsSummary } from '../../src/types';

const BASE_SUMMARY: TenantPaymentSettingsSummary = {
  configured: false,
  maskedAccessToken: null,
  hasWebhookSecret: false,
  isDemoFallbackActive: false,
  webhookUrl: 'https://example.com/mpWebhook?tenantId=tnt_demo',
  updatedAt: null,
};

describe('buildPaymentProgressModel (1:1 con formulario de Mercado Pago)', () => {
  it('mantiene orden 01 Access Token (obligatorio), 02 URL de Webhook (opcional), 03 Webhook Secret (opcional)', () => {
    const model = buildPaymentProgressModel({
      summary: BASE_SUMMARY,
      trimmedAccessToken: '',
      trimmedWebhookSecret: '',
      hasCopiedWebhook: false,
      fieldErrors: {},
    });

    expect(model.steps.map((s) => [s.stepNumber, s.id, Boolean(s.optional), s.targetId])).toEqual([
      ['01', 'mp-access-token', false, PAYMENT_STEP_IDS.accessToken],
      ['02', 'mp-webhook-url', true, PAYMENT_STEP_IDS.webhookUrl],
      ['03', 'mp-webhook-secret', true, PAYMENT_STEP_IDS.webhookSecret],
    ]);

    // Step 02 must NOT be marked optional_done merely because webhookUrl exists
    expect(model.steps[0].status).toBe('pending');
    expect(model.steps[1].status).toBe('optional_empty');
    expect(model.steps[2].status).toBe('optional_empty');

    const computed = computeFormProgress(model.steps);
    expect(computed.completedRequired).toBe(0);
    expect(computed.totalRequired).toBe(1);
    expect(computed.isReady).toBe(false);
    expect(model.pendingCompactMessage).toBe(
      PAYMENT_SETTINGS_TEXTS.progress.pendingMissingTokenCompact
    );
  });

  it('refleja modo demo correctamente cuando isDemoFallbackActive es true', () => {
    const model = buildPaymentProgressModel({
      summary: { ...BASE_SUMMARY, configured: true, isDemoFallbackActive: true },
      trimmedAccessToken: '',
      trimmedWebhookSecret: '',
      hasCopiedWebhook: false,
      fieldErrors: {},
    });

    expect(model.steps[0].status).toBe('partial');
    expect(model.steps[0].detail).toBe(PAYMENT_SETTINGS_TEXTS.progress.step1Demo);
    expect(model.pendingCompactMessage).toBe(PAYMENT_SETTINGS_TEXTS.progress.pendingDemoCompact);
  });

  it('muestra rotación sin decir falsamente que faltan credenciales cuando ya existe un token guardado', () => {
    const savedSummary: TenantPaymentSettingsSummary = {
      ...BASE_SUMMARY,
      configured: true,
      maskedAccessToken: 'APP_USR-••••1234',
    };

    const rotating = buildPaymentProgressModel({
      summary: savedSummary,
      trimmedAccessToken: 'APP_USR-newtoken9999',
      trimmedWebhookSecret: '',
      hasCopiedWebhook: false,
      fieldErrors: {},
    });

    expect(rotating.steps[0].status).toBe('partial');
    expect(rotating.steps[0].detail).toBe(PAYMENT_SETTINGS_TEXTS.progress.step1UnsavedRotation);
    expect(rotating.pendingCompactMessage).toBe(
      PAYMENT_SETTINGS_TEXTS.progress.pendingUnsavedRotationCompact
    );
    expect(rotating.pendingActionTargetId).toBe(PAYMENT_STEP_IDS.formActions);
  });

  it('marca paso 02 como optional_done al copiar URL y 02+03 como optional_done cuando el secreto está guardado', () => {
    const copiedOnly = buildPaymentProgressModel({
      summary: { ...BASE_SUMMARY, configured: true, maskedAccessToken: 'APP_USR-••••1234' },
      trimmedAccessToken: '',
      trimmedWebhookSecret: '',
      hasCopiedWebhook: true,
      fieldErrors: {},
    });

    expect(copiedOnly.steps[0].status).toBe('complete');
    expect(copiedOnly.steps[1].status).toBe('optional_done');
    expect(copiedOnly.steps[1].detail).toBe(PAYMENT_SETTINGS_TEXTS.progress.step2Copied);
    expect(copiedOnly.steps[2].status).toBe('optional_empty');
    expect(copiedOnly.readyMessage).toBe(PAYMENT_SETTINGS_TEXTS.progress.readyBasic);

    const fullConfigured = buildPaymentProgressModel({
      summary: {
        ...BASE_SUMMARY,
        configured: true,
        maskedAccessToken: 'APP_USR-••••1234',
        hasWebhookSecret: true,
      },
      trimmedAccessToken: '',
      trimmedWebhookSecret: '',
      hasCopiedWebhook: false,
      fieldErrors: {},
    });

    expect(fullConfigured.steps[1].status).toBe('optional_done');
    expect(fullConfigured.steps[2].status).toBe('optional_done');
    expect(fullConfigured.readyMessage).toBe(PAYMENT_SETTINGS_TEXTS.progress.readyComplete);
    expect(computeFormProgress(fullConfigured.steps).isReady).toBe(true);
  });

  it('mantiene isReady y ofrece botón Ir a guardar cuando solo se carga un nuevo Webhook Secret con token ya activo', () => {
    const model = buildPaymentProgressModel({
      summary: { ...BASE_SUMMARY, configured: true, maskedAccessToken: 'APP_USR-••••1234' },
      trimmedAccessToken: '',
      trimmedWebhookSecret: 'my-super-secret-1234',
      hasCopiedWebhook: false,
      fieldErrors: {},
    });

    expect(computeFormProgress(model.steps).isReady).toBe(true);
    expect(model.steps[2].status).toBe('partial');
    expect(model.readyMessage).toBe(PAYMENT_SETTINGS_TEXTS.progress.readyWithUnsavedSecret);
    expect(model.readyActionTargetId).toBe(PAYMENT_STEP_IDS.formActions);
  });

  it('propaga errores de validación en los pasos 01 y 03', () => {
    const model = buildPaymentProgressModel({
      summary: BASE_SUMMARY,
      trimmedAccessToken: 'bad',
      trimmedWebhookSecret: '123',
      hasCopiedWebhook: false,
      fieldErrors: {
        accessToken: 'invalid',
        webhookSecret: 'short',
      },
    });

    expect(model.steps[0].status).toBe('error');
    expect(model.steps[2].status).toBe('error');
    expect(computeFormProgress(model.steps).hasErrors).toBe(true);
  });
});
