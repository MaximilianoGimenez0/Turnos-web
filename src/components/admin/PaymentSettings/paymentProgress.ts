import type { TenantPaymentSettingsSummary } from '../../../types';
import type { FormProgressStep } from '../../common/FormProgressTracker';
import { PAYMENT_SETTINGS_TEXTS } from '../../../texts';

export interface BuildPaymentProgressInput {
  summary: TenantPaymentSettingsSummary | null;
  trimmedAccessToken: string;
  trimmedWebhookSecret: string;
  hasCopiedWebhook: boolean;
  fieldErrors: {
    accessToken?: string;
    webhookSecret?: string;
  };
}

export interface PaymentProgressModel {
  steps: FormProgressStep[];
  readyMessage: string;
  readyActionLabel?: string;
  readyActionTargetId?: string;
  pendingCompactMessage: string;
  pendingFooterMessage: string;
  pendingActionLabel?: string;
  pendingActionTargetId?: string;
}

export const PAYMENT_STEP_IDS = {
  accessToken: 'mp-step-01-token',
  webhookUrl: 'mp-step-02-webhook-url',
  webhookSecret: 'mp-step-03-webhook-secret',
  formActions: 'mp-form-actions',
} as const;

export function buildPaymentProgressModel({
  summary,
  trimmedAccessToken,
  trimmedWebhookSecret,
  hasCopiedWebhook,
  fieldErrors,
}: BuildPaymentProgressInput): PaymentProgressModel {
  const p = PAYMENT_SETTINGS_TEXTS.progress;
  const hasSavedToken = Boolean(summary?.maskedAccessToken);
  const hasSavedSecret = Boolean(summary?.hasWebhookSecret);
  const hasDraftInput = Boolean(trimmedAccessToken || trimmedWebhookSecret);

  // Step 01: Access Token (Required)
  let tokenStatus: FormProgressStep['status'];
  let tokenDetail: string;
  if (fieldErrors.accessToken) {
    tokenStatus = 'error';
    tokenDetail = p.step1Error;
  } else if (trimmedAccessToken) {
    tokenStatus = 'partial';
    tokenDetail = hasSavedToken ? p.step1UnsavedRotation : p.step1UnsavedNew;
  } else if (summary?.maskedAccessToken) {
    tokenStatus = 'complete';
    tokenDetail = p.step1Complete(summary.maskedAccessToken);
  } else if (summary?.isDemoFallbackActive) {
    tokenStatus = 'partial';
    tokenDetail = p.step1Demo;
  } else {
    tokenStatus = 'pending';
    tokenDetail = p.step1Pending;
  }

  // Step 02: Webhook URL (Optional · Recommended)
  let urlStatus: FormProgressStep['status'];
  let urlDetail: string;
  if (hasSavedSecret) {
    urlStatus = 'optional_done';
    urlDetail = p.step2Linked;
  } else if (hasCopiedWebhook) {
    urlStatus = 'optional_done';
    urlDetail = p.step2Copied;
  } else {
    urlStatus = 'optional_empty';
    urlDetail = p.step2Pending;
  }

  // Step 03: Webhook Secret (Optional · Recommended)
  let secretStatus: FormProgressStep['status'];
  let secretDetail: string;
  if (fieldErrors.webhookSecret) {
    secretStatus = 'error';
    secretDetail = p.step3Error;
  } else if (trimmedWebhookSecret) {
    secretStatus = 'partial';
    secretDetail = hasSavedSecret ? p.step3UnsavedRotation : p.step3UnsavedNew;
  } else if (hasSavedSecret) {
    secretStatus = 'optional_done';
    secretDetail = p.step3Complete;
  } else {
    secretStatus = 'optional_empty';
    secretDetail = p.step3Pending;
  }

  const steps: FormProgressStep[] = [
    {
      id: 'mp-access-token',
      stepNumber: '01',
      label: p.step1Label,
      status: tokenStatus,
      detail: tokenDetail,
      targetId: PAYMENT_STEP_IDS.accessToken,
    },
    {
      id: 'mp-webhook-url',
      stepNumber: '02',
      label: p.step2Label,
      status: urlStatus,
      optional: true,
      detail: urlDetail,
      targetId: PAYMENT_STEP_IDS.webhookUrl,
    },
    {
      id: 'mp-webhook-secret',
      stepNumber: '03',
      label: p.step3Label,
      status: secretStatus,
      optional: true,
      detail: secretDetail,
      targetId: PAYMENT_STEP_IDS.webhookSecret,
    },
  ];

  // Contextual tracker messages synchronized with real state
  let pendingCompactMessage: string = p.pendingMissingTokenCompact;
  let pendingFooterMessage: string = p.pendingMissingTokenFooter;

  if (trimmedAccessToken) {
    pendingCompactMessage = hasSavedToken
      ? p.pendingUnsavedRotationCompact
      : p.pendingUnsavedNewCompact;
    pendingFooterMessage = hasSavedToken
      ? p.pendingUnsavedRotationFooter
      : p.pendingUnsavedNewFooter;
  } else if (summary?.isDemoFallbackActive) {
    pendingCompactMessage = p.pendingDemoCompact;
    pendingFooterMessage = p.pendingDemoFooter;
  }

  let readyMessage: string = hasSavedSecret ? p.readyComplete : p.readyBasic;
  let readyActionLabel: string | undefined;
  let readyActionTargetId: string | undefined;

  if (hasSavedToken && !trimmedAccessToken && trimmedWebhookSecret && !fieldErrors.webhookSecret) {
    readyMessage = p.readyWithUnsavedSecret;
    readyActionLabel = p.saveActionLabel;
    readyActionTargetId = PAYMENT_STEP_IDS.formActions;
  }

  return {
    steps,
    readyMessage,
    readyActionLabel,
    readyActionTargetId,
    pendingCompactMessage,
    pendingFooterMessage,
    pendingActionLabel: hasDraftInput ? p.saveActionLabel : undefined,
    pendingActionTargetId: hasDraftInput ? PAYMENT_STEP_IDS.formActions : undefined,
  };
}
