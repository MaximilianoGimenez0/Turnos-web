import { FIELD_LIMITS } from '../../../config/fieldLimits';
import { BOOKING_MODAL_TEXTS } from '../../../texts';
import {
  validateEmail,
  validateOptionalText,
  validatePhone,
  validateRequiredText,
} from '../../../utils/validators';

export type BookingWizardStepId = 'service' | 'extras' | 'details' | 'summary';

export interface BookingClientFields {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export interface BookingFieldErrors {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface SavedBookingContact {
  name: string;
  email: string;
  phone: string;
}

export type BookingProgressTone = 'primary' | 'danger';

export type BookingProgressStatusKey =
  | 'slot_unavailable'
  | 'duration_conflict'
  | 'exploration_mode'
  | 'select_service'
  | 'service_ready'
  | 'extras_optional'
  | 'details_errors'
  | 'details_remaining'
  | 'details_ready'
  | 'summary_ready';

export interface BookingWizardProgressInput {
  effectiveStep: BookingWizardStepId;
  visibleSteps: BookingWizardStepId[];
  hasSelectedService: boolean;
  hasLiveDurationConflict: boolean;
  isSlotUnavailable: boolean;
  isOnlinePaymentDisabled: boolean;
  fields: BookingClientFields;
  fieldErrors: BookingFieldErrors;
}

export interface BookingWizardProgressState {
  stepIndex: number;
  totalSteps: number;
  percentage: number;
  trackRatio: number;
  tone: BookingProgressTone;
  validDetailsCount: number;
  remainingDetailsCount: number;
  errorFieldsCount: number;
  statusKey: BookingProgressStatusKey;
}

export interface CanNavigateToWizardStepParams {
  targetStep: BookingWizardStepId;
  currentStep: BookingWizardStepId;
  highestReachedStep: BookingWizardStepId;
  visibleSteps: BookingWizardStepId[];
  isOnlinePaymentDisabled: boolean;
  hasSelectedService?: boolean;
  hasLiveDurationConflict?: boolean;
  areClientFieldsValid?: boolean;
}

export const BOOKING_CONTACT_STORAGE_KEY = 'turneado_booking_contact_v1';

const CANONICAL_STEPS: readonly BookingWizardStepId[] = [
  'service',
  'extras',
  'details',
  'summary',
];

export function getVisibleWizardSteps(hasConfiguredExtras: boolean): BookingWizardStepId[] {
  return hasConfiguredExtras
    ? ['service', 'extras', 'details', 'summary']
    : ['service', 'details', 'summary'];
}

export function isStepLockedByPaymentDisabled(
  stepId: BookingWizardStepId,
  isOnlinePaymentDisabled: boolean
): boolean {
  return isOnlinePaymentDisabled && (stepId === 'details' || stepId === 'summary');
}

export function resolveEffectiveWizardStep(
  currentStep: BookingWizardStepId,
  visibleSteps: BookingWizardStepId[],
  isOnlinePaymentDisabled: boolean
): BookingWizardStepId {
  if (visibleSteps.length === 0) {
    return 'service';
  }

  if (
    visibleSteps.includes(currentStep) &&
    !isStepLockedByPaymentDisabled(currentStep, isOnlinePaymentDisabled)
  ) {
    return currentStep;
  }

  const canonicalIndex = CANONICAL_STEPS.indexOf(currentStep);
  for (let i = canonicalIndex - 1; i >= 0; i -= 1) {
    const candidate = CANONICAL_STEPS[i];
    if (
      visibleSteps.includes(candidate) &&
      !isStepLockedByPaymentDisabled(candidate, isOnlinePaymentDisabled)
    ) {
      return candidate;
    }
  }

  const firstUnlocked = visibleSteps.find(
    (step) => !isStepLockedByPaymentDisabled(step, isOnlinePaymentDisabled)
  );
  return firstUnlocked ?? 'service';
}

export function getNextWizardStep(
  currentStep: BookingWizardStepId,
  visibleSteps: BookingWizardStepId[]
): BookingWizardStepId | null {
  const index = visibleSteps.indexOf(currentStep);
  if (index === -1 || index >= visibleSteps.length - 1) {
    return null;
  }
  return visibleSteps[index + 1];
}

export function getPrevWizardStep(
  currentStep: BookingWizardStepId,
  visibleSteps: BookingWizardStepId[]
): BookingWizardStepId | null {
  const index = visibleSteps.indexOf(currentStep);
  if (index <= 0) {
    return null;
  }
  return visibleSteps[index - 1];
}

export function canNavigateToWizardStep({
  targetStep,
  currentStep,
  highestReachedStep,
  visibleSteps,
  isOnlinePaymentDisabled,
  hasSelectedService,
  hasLiveDurationConflict,
  areClientFieldsValid,
}: CanNavigateToWizardStepParams): boolean {
  if (targetStep === currentStep) {
    return false;
  }

  if (isStepLockedByPaymentDisabled(targetStep, isOnlinePaymentDisabled)) {
    return false;
  }

  const targetIndex = visibleSteps.indexOf(targetStep);
  const currentIndex = visibleSteps.indexOf(currentStep);

  if (targetIndex === -1 || currentIndex === -1) {
    return false;
  }

  if (targetIndex < currentIndex) {
    return true;
  }

  const effectiveHighestStep = resolveEffectiveWizardStep(
    highestReachedStep,
    visibleSteps,
    isOnlinePaymentDisabled
  );
  const highestIndex = visibleSteps.indexOf(effectiveHighestStep);

  if (highestIndex === -1 || targetIndex > highestIndex) {
    return false;
  }

  if (targetIndex > 0) {
    if (hasSelectedService === false || hasLiveDurationConflict === true) {
      return false;
    }
  }

  if (targetStep === 'summary' && areClientFieldsValid === false) {
    return false;
  }

  return true;
}

export function validateBookingClientFields(fields: BookingClientFields): {
  isValid: boolean;
  errors: BookingFieldErrors;
} {
  const errors: BookingFieldErrors = {};

  const nameValidation = validateRequiredText(
    fields.name,
    BOOKING_MODAL_TEXTS.form.nameField,
    FIELD_LIMITS.booking.name.min,
    FIELD_LIMITS.booking.name.max
  );
  if (!nameValidation.isValid) {
    errors.name = nameValidation.error || BOOKING_MODAL_TEXTS.alerts.nameRequiredMessage;
  }

  const emailValidation = validateEmail(fields.email, true, FIELD_LIMITS.booking.email.max);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error || BOOKING_MODAL_TEXTS.alerts.emailInvalidMessage;
  }

  const phoneValidation = validatePhone(fields.phone, true, FIELD_LIMITS.booking.phone.max);
  if (!phoneValidation.isValid) {
    errors.phone = phoneValidation.error || BOOKING_MODAL_TEXTS.alerts.phoneInvalidMessage;
  }

  const notesValidation = validateOptionalText(
    fields.notes,
    BOOKING_MODAL_TEXTS.form.notesLabel,
    FIELD_LIMITS.booking.notes.min,
    FIELD_LIMITS.booking.notes.max
  );
  if (!notesValidation.isValid) {
    errors.notes = notesValidation.error || BOOKING_MODAL_TEXTS.alerts.unexpectedError;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function computeBookingWizardProgress({
  effectiveStep,
  visibleSteps,
  hasSelectedService,
  hasLiveDurationConflict,
  isSlotUnavailable,
  isOnlinePaymentDisabled,
  fields,
  fieldErrors,
}: BookingWizardProgressInput): BookingWizardProgressState {
  const totalSteps = visibleSteps.length > 0 ? visibleSteps.length : 3;
  const rawIndex = visibleSteps.indexOf(effectiveStep);
  const stepIndex = rawIndex >= 0 ? rawIndex + 1 : 1;
  const isFourSteps = visibleSteps.includes('extras');

  const isNameValid = validateRequiredText(
    fields.name,
    BOOKING_MODAL_TEXTS.form.nameField,
    FIELD_LIMITS.booking.name.min,
    FIELD_LIMITS.booking.name.max
  ).isValid;
  const isEmailValid = validateEmail(fields.email, true, FIELD_LIMITS.booking.email.max).isValid;
  const isPhoneValid = validatePhone(fields.phone, true, FIELD_LIMITS.booking.phone.max).isValid;

  const validDetailsCount = Number(isNameValid) + Number(isEmailValid) + Number(isPhoneValid);
  const remainingDetailsCount = 3 - validDetailsCount;
  const errorFieldsCount = [
    fieldErrors.name,
    fieldErrors.email,
    fieldErrors.phone,
    fieldErrors.notes,
  ].filter(Boolean).length;

  const tone: BookingProgressTone =
    isSlotUnavailable || hasLiveDurationConflict ? 'danger' : 'primary';

  let percentage: number;
  let trackRatio: number;

  if (effectiveStep === 'service') {
    if (hasLiveDurationConflict) {
      percentage = 15;
      trackRatio = isOnlinePaymentDisabled && !isFourSteps ? 0 : isFourSteps ? 0.12 : 0.15;
    } else if (hasSelectedService) {
      percentage = isFourSteps ? 25 : 30;
      trackRatio = isOnlinePaymentDisabled && !isFourSteps ? 0 : isFourSteps ? 0.16 : 0.22;
    } else {
      percentage = 0;
      trackRatio = 0;
    }
  } else if (effectiveStep === 'extras') {
    percentage = 50;
    trackRatio = isOnlinePaymentDisabled ? 1 / 3 : 0.38;
  } else if (effectiveStep === 'details') {
    const percentageByValidCount = isFourSteps ? [55, 67, 79, 91] : [40, 57, 74, 91];
    const trackByValidCount = isFourSteps ? [2 / 3, 0.755, 0.845, 0.935] : [0.5, 0.64, 0.78, 0.92];
    percentage = percentageByValidCount[validDetailsCount] ?? percentageByValidCount[0];
    trackRatio = trackByValidCount[validDetailsCount] ?? trackByValidCount[0];
  } else {
    percentage = 100;
    trackRatio = 1;
  }

  let statusKey: BookingProgressStatusKey;
  if (isSlotUnavailable) {
    statusKey = 'slot_unavailable';
  } else if (hasLiveDurationConflict) {
    statusKey = 'duration_conflict';
  } else if (isOnlinePaymentDisabled) {
    statusKey = 'exploration_mode';
  } else if (effectiveStep === 'service') {
    statusKey = hasSelectedService ? 'service_ready' : 'select_service';
  } else if (effectiveStep === 'extras') {
    statusKey = 'extras_optional';
  } else if (effectiveStep === 'details') {
    if (errorFieldsCount > 0) {
      statusKey = 'details_errors';
    } else if (remainingDetailsCount > 0) {
      statusKey = 'details_remaining';
    } else {
      statusKey = 'details_ready';
    }
  } else {
    statusKey = 'summary_ready';
  }

  return {
    stepIndex,
    totalSteps,
    percentage,
    trackRatio,
    tone,
    validDetailsCount,
    remainingDetailsCount,
    errorFieldsCount,
    statusKey,
  };
}

function getSafeStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function loadSavedBookingContact(): SavedBookingContact | null {
  try {
    const storage = getSafeStorage();
    if (!storage) return null;

    const raw = storage.getItem(BOOKING_CONTACT_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const name =
      typeof record.name === 'string'
        ? record.name.trim().slice(0, FIELD_LIMITS.booking.name.max)
        : '';
    const email =
      typeof record.email === 'string'
        ? record.email.trim().slice(0, FIELD_LIMITS.booking.email.max)
        : '';
    const phone =
      typeof record.phone === 'string'
        ? record.phone.trim().slice(0, FIELD_LIMITS.booking.phone.max)
        : '';

    if (!name && !email && !phone) {
      return null;
    }

    return { name, email, phone };
  } catch {
    return null;
  }
}

export function saveBookingContact(contact: SavedBookingContact): void {
  try {
    const storage = getSafeStorage();
    if (!storage) return;

    const payload: SavedBookingContact = {
      name:
        typeof contact.name === 'string'
          ? contact.name.trim().slice(0, FIELD_LIMITS.booking.name.max)
          : '',
      email:
        typeof contact.email === 'string'
          ? contact.email.trim().slice(0, FIELD_LIMITS.booking.email.max)
          : '',
      phone:
        typeof contact.phone === 'string'
          ? contact.phone.trim().slice(0, FIELD_LIMITS.booking.phone.max)
          : '',
    };

    if (!payload.name && !payload.email && !payload.phone) {
      storage.removeItem(BOOKING_CONTACT_STORAGE_KEY);
      return;
    }

    storage.setItem(BOOKING_CONTACT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota or private mode errors.
  }
}

export function clearSavedBookingContact(): void {
  try {
    const storage = getSafeStorage();
    if (!storage) return;
    storage.removeItem(BOOKING_CONTACT_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}
