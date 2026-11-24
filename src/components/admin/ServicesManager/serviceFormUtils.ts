import type { PriceExtra } from '../../../types';
import type { FormProgressStep } from '../../common/FormProgressTracker';
import { formatEstimatedDuration } from '../../../services/bookingHelper';
import {
  validateOptionalText,
  validatePositiveInteger,
  validateRequiredText,
} from '../../../utils/validators';
import { FIELD_LIMITS } from '../../../config/fieldLimits';
import { SERVICES_MANAGER_TEXTS } from '../../../texts';

export interface EditableExtraRow {
  rowKey: string;
  id: string;
  name: string;
  price: string;
}

export interface ExtraRowValidationError {
  name?: string;
  price?: string;
}

export interface EvaluatedExtrasResult {
  validExtras: PriceExtra[];
  rowErrors: Record<string, ExtraRowValidationError>;
  incompleteCount: number;
}

export const SERVICE_DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const;

export const SERVICE_STEP_IDS = {
  identity: 'service-step-01-identity',
  pricing: 'service-step-02-pricing',
  extras: 'service-step-03-extras',
  actions: 'service-form-actions',
} as const;

export function createEmptyExtraRow(sequence: number): EditableExtraRow {
  const uid = `extra-${Date.now()}-${sequence}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    rowKey: uid,
    id: uid,
    name: '',
    price: '',
  };
}

export function mapExtrasToEditableRows(extras?: PriceExtra[]): EditableExtraRow[] {
  if (!extras || extras.length === 0) return [];
  return extras.map((ex, idx) => ({
    rowKey: ex.id || `existing-extra-${idx}`,
    id: ex.id || `extra-${Date.now()}-${idx}`,
    name: ex.name || '',
    price: String(ex.price ?? ''),
  }));
}

/**
 * Evaluates inline extra rows:
 * - Completely blank rows are ignored safely on save.
 * - Partially filled or invalid rows report targeted per-row errors.
 * - Complete valid rows are returned as clean PriceExtra[].
 */
export function evaluateEditableExtraRows(rows: readonly EditableExtraRow[]): EvaluatedExtrasResult {
  const validExtras: PriceExtra[] = [];
  const rowErrors: Record<string, ExtraRowValidationError> = {};
  let incompleteCount = 0;

  rows.forEach((row) => {
    const trimmedName = row.name.trim();
    const trimmedPrice = row.price.trim();

    if (!trimmedName && !trimmedPrice) {
      return;
    }

    const rowErr: ExtraRowValidationError = {};

    const nameValidation = validateRequiredText(
      row.name,
      SERVICES_MANAGER_TEXTS.extras.columnName,
      FIELD_LIMITS.service.extraName.min,
      FIELD_LIMITS.service.extraName.max
    );
    if (!nameValidation.isValid) {
      rowErr.name = nameValidation.error || SERVICES_MANAGER_TEXTS.extras.rowIncompleteName;
    }

    const priceValidation = validatePositiveInteger(
      row.price,
      SERVICES_MANAGER_TEXTS.extras.columnPrice,
      0,
      5000000
    );
    if (!priceValidation.isValid || priceValidation.parsedValue === undefined) {
      rowErr.price = priceValidation.error || SERVICES_MANAGER_TEXTS.extras.rowIncompletePrice;
    }

    if (rowErr.name || rowErr.price) {
      rowErrors[row.rowKey] = rowErr;
      incompleteCount += 1;
      return;
    }

    validExtras.push({
      id: row.id,
      name: trimmedName,
      price: priceValidation.parsedValue!,
    });
  });

  return {
    validExtras,
    rowErrors,
    incompleteCount,
  };
}

export function computeServicePriceSummary(
  basePriceRaw: string,
  validExtras: readonly PriceExtra[]
): {
  parsedBasePrice: number | null;
  extrasTotal: number;
  maxTotalWithExtras: number | null;
} {
  const check = validatePositiveInteger(
    basePriceRaw,
    SERVICES_MANAGER_TEXTS.form.basePriceField,
    0,
    5000000
  );
  const parsedBasePrice =
    basePriceRaw.trim().length > 0 && check.isValid && check.parsedValue !== undefined
      ? check.parsedValue
      : null;

  const extrasTotal = validExtras.reduce((sum, ex) => sum + (ex.price || 0), 0);
  const maxTotalWithExtras =
    parsedBasePrice !== null ? parsedBasePrice + extrasTotal : null;

  return {
    parsedBasePrice,
    extrasTotal,
    maxTotalWithExtras,
  };
}

export function buildServiceProgressSteps(params: {
  name: string;
  description: string;
  basePrice: string;
  durationMinutes: string;
  extrasEval: EvaluatedExtrasResult;
}): FormProgressStep[] {
  const t = SERVICES_MANAGER_TEXTS.progress;

  // Step 01: Identity (Name + optional description)
  const trimmedName = params.name.trim();
  const nameCheck = validateRequiredText(
    params.name,
    SERVICES_MANAGER_TEXTS.form.nameField,
    FIELD_LIMITS.service.name.min,
    FIELD_LIMITS.service.name.max
  );
  const descCheck = validateOptionalText(
    params.description,
    SERVICES_MANAGER_TEXTS.form.descriptionLabel,
    FIELD_LIMITS.service.description.min,
    FIELD_LIMITS.service.description.max
  );

  let step1Status: FormProgressStep['status'];
  let step1Detail: string;
  if (!descCheck.isValid) {
    step1Status = 'error';
    step1Detail = t.step1DescError;
  } else if (trimmedName.length === 0) {
    step1Status = 'pending';
    step1Detail = t.step1Pending;
  } else if (!nameCheck.isValid) {
    step1Status = 'error';
    step1Detail = t.step1MinError;
  } else {
    step1Status = 'complete';
    const shortName = trimmedName.length > 24 ? `${trimmedName.slice(0, 23)}…` : trimmedName;
    step1Detail =
      params.description.trim().length > 0 ? `${shortName}${t.step1WithDescSuffix}` : shortName;
  }

  // Step 02: Base Price + Duration
  const trimmedPrice = params.basePrice.trim();
  const trimmedDuration = params.durationMinutes.trim();
  const priceCheck = validatePositiveInteger(
    params.basePrice,
    SERVICES_MANAGER_TEXTS.form.basePriceField,
    0,
    5000000
  );
  const durationCheck = validatePositiveInteger(
    params.durationMinutes,
    SERVICES_MANAGER_TEXTS.form.durationField,
    5,
    480
  );

  const hasValidPrice =
    trimmedPrice.length > 0 && priceCheck.isValid && priceCheck.parsedValue !== undefined;
  const hasValidDuration =
    trimmedDuration.length > 0 && durationCheck.isValid && durationCheck.parsedValue !== undefined;
  const hasPriceError = trimmedPrice.length > 0 && !hasValidPrice;
  const hasDurationError = trimmedDuration.length > 0 && !hasValidDuration;

  let step2Status: FormProgressStep['status'];
  let step2Detail: string;
  if (hasPriceError) {
    step2Status = 'error';
    step2Detail = t.step2InvalidPrice;
  } else if (hasDurationError) {
    step2Status = 'error';
    step2Detail = t.step2InvalidDuration;
  } else if (hasValidPrice && hasValidDuration) {
    step2Status = 'complete';
    step2Detail = t.step2Complete(
      priceCheck.parsedValue!.toLocaleString('es-AR'),
      formatEstimatedDuration(durationCheck.parsedValue!)
    );
  } else if (hasValidPrice || hasValidDuration) {
    step2Status = 'partial';
    step2Detail = hasValidPrice ? t.step2PendingDuration : t.step2PendingPrice;
  } else {
    step2Status = 'pending';
    step2Detail = t.step2PendingBoth;
  }

  // Step 03: Optional Extras
  let step3Status: FormProgressStep['status'];
  let step3Detail: string;
  if (params.extrasEval.incompleteCount > 0) {
    step3Status = 'error';
    step3Detail = t.step3Error(params.extrasEval.incompleteCount);
  } else if (params.extrasEval.validExtras.length > 0) {
    step3Status = 'optional_done';
    step3Detail = t.step3Complete(params.extrasEval.validExtras.length);
  } else {
    step3Status = 'optional_empty';
    step3Detail = t.step3Empty;
  }

  return [
    {
      id: 'service-identity',
      stepNumber: '01',
      label: t.step1Label,
      status: step1Status,
      detail: step1Detail,
      targetId: SERVICE_STEP_IDS.identity,
    },
    {
      id: 'service-pricing',
      stepNumber: '02',
      label: t.step2Label,
      status: step2Status,
      detail: step2Detail,
      targetId: SERVICE_STEP_IDS.pricing,
    },
    {
      id: 'service-extras',
      stepNumber: '03',
      label: t.step3Label,
      status: step3Status,
      optional: true,
      detail: step3Detail,
      targetId: SERVICE_STEP_IDS.extras,
    },
  ];
}
