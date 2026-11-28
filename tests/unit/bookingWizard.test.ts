import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FIELD_LIMITS } from '../../src/config/fieldLimits';
import {
  BOOKING_CONTACT_STORAGE_KEY,
  canNavigateToWizardStep,
  clearSavedBookingContact,
  computeBookingWizardProgress,
  getNextWizardStep,
  getPrevWizardStep,
  getVisibleWizardSteps,
  isStepLockedByPaymentDisabled,
  loadSavedBookingContact,
  resolveEffectiveWizardStep,
  saveBookingContact,
  validateBookingClientFields,
} from '../../src/components/slots/BookingModal/bookingWizard';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe('bookingWizard step machine', () => {
  it('returns 4 steps when services have configured extras and 3 steps otherwise', () => {
    expect(getVisibleWizardSteps(true)).toEqual(['service', 'extras', 'details', 'summary']);
    expect(getVisibleWizardSteps(false)).toEqual(['service', 'details', 'summary']);
  });

  it('marks only details and summary as locked when online payments are disabled', () => {
    expect(isStepLockedByPaymentDisabled('service', true)).toBe(false);
    expect(isStepLockedByPaymentDisabled('extras', true)).toBe(false);
    expect(isStepLockedByPaymentDisabled('details', true)).toBe(true);
    expect(isStepLockedByPaymentDisabled('summary', true)).toBe(true);

    expect(isStepLockedByPaymentDisabled('details', false)).toBe(false);
    expect(isStepLockedByPaymentDisabled('summary', false)).toBe(false);
  });

  it('resolves effective step when extras disappear or online payment becomes disabled', () => {
    const fourSteps = getVisibleWizardSteps(true);
    const threeSteps = getVisibleWizardSteps(false);

    expect(resolveEffectiveWizardStep('extras', threeSteps, false)).toBe('service');
    expect(resolveEffectiveWizardStep('details', fourSteps, true)).toBe('extras');
    expect(resolveEffectiveWizardStep('summary', fourSteps, true)).toBe('extras');
    expect(resolveEffectiveWizardStep('details', threeSteps, true)).toBe('service');
    expect(resolveEffectiveWizardStep('summary', threeSteps, true)).toBe('service');
    expect(resolveEffectiveWizardStep('extras', fourSteps, true)).toBe('extras');
    expect(resolveEffectiveWizardStep('summary', threeSteps, false)).toBe('summary');
  });

  it('computes next and previous steps cleanly for 3 and 4 step flows', () => {
    const fourSteps = getVisibleWizardSteps(true);
    const threeSteps = getVisibleWizardSteps(false);

    expect(getNextWizardStep('service', fourSteps)).toBe('extras');
    expect(getNextWizardStep('extras', fourSteps)).toBe('details');
    expect(getNextWizardStep('details', fourSteps)).toBe('summary');
    expect(getNextWizardStep('summary', fourSteps)).toBeNull();

    expect(getPrevWizardStep('service', fourSteps)).toBeNull();
    expect(getPrevWizardStep('extras', fourSteps)).toBe('service');
    expect(getPrevWizardStep('summary', fourSteps)).toBe('details');

    expect(getNextWizardStep('service', threeSteps)).toBe('details');
    expect(getPrevWizardStep('details', threeSteps)).toBe('service');
    expect(getNextWizardStep('extras', threeSteps)).toBeNull();
  });

  it('enforces stepper click navigation rules for completed, locked, and invalidated steps', () => {
    const fourSteps = getVisibleWizardSteps(true);

    expect(
      canNavigateToWizardStep({
        targetStep: 'service',
        currentStep: 'service',
        highestReachedStep: 'summary',
        visibleSteps: fourSteps,
        isOnlinePaymentDisabled: false,
      })
    ).toBe(false);

    expect(
      canNavigateToWizardStep({
        targetStep: 'service',
        currentStep: 'details',
        highestReachedStep: 'details',
        visibleSteps: fourSteps,
        isOnlinePaymentDisabled: false,
      })
    ).toBe(true);

    expect(
      canNavigateToWizardStep({
        targetStep: 'summary',
        currentStep: 'service',
        highestReachedStep: 'details',
        visibleSteps: fourSteps,
        isOnlinePaymentDisabled: false,
      })
    ).toBe(false);

    expect(
      canNavigateToWizardStep({
        targetStep: 'details',
        currentStep: 'service',
        highestReachedStep: 'summary',
        visibleSteps: fourSteps,
        isOnlinePaymentDisabled: false,
      })
    ).toBe(true);

    expect(
      canNavigateToWizardStep({
        targetStep: 'details',
        currentStep: 'extras',
        highestReachedStep: 'summary',
        visibleSteps: fourSteps,
        isOnlinePaymentDisabled: true,
      })
    ).toBe(false);

    expect(
      canNavigateToWizardStep({
        targetStep: 'extras',
        currentStep: 'service',
        highestReachedStep: 'extras',
        visibleSteps: fourSteps,
        isOnlinePaymentDisabled: true,
      })
    ).toBe(true);

    expect(
      canNavigateToWizardStep({
        targetStep: 'details',
        currentStep: 'service',
        highestReachedStep: 'summary',
        visibleSteps: fourSteps,
        isOnlinePaymentDisabled: false,
        hasSelectedService: false,
      })
    ).toBe(false);

    expect(
      canNavigateToWizardStep({
        targetStep: 'extras',
        currentStep: 'service',
        highestReachedStep: 'summary',
        visibleSteps: fourSteps,
        isOnlinePaymentDisabled: false,
        hasLiveDurationConflict: true,
      })
    ).toBe(false);

    expect(
      canNavigateToWizardStep({
        targetStep: 'summary',
        currentStep: 'details',
        highestReachedStep: 'summary',
        visibleSteps: fourSteps,
        isOnlinePaymentDisabled: false,
        areClientFieldsValid: false,
      })
    ).toBe(false);
  });
});

describe('validateBookingClientFields', () => {
  it('accepts valid client fields with or without optional notes', () => {
    const valid = validateBookingClientFields({
      name: 'Camila Pérez',
      email: 'camila@example.com',
      phone: '+54 9 11 4567-8901',
      notes: '',
    });
    expect(valid.isValid).toBe(true);
    expect(valid.errors).toEqual({});

    const validWithNotes = validateBookingClientFields({
      name: 'Camila Pérez',
      email: 'camila@example.com',
      phone: '1145678901',
      notes: 'Prefiero esmalte tono nude',
    });
    expect(validWithNotes.isValid).toBe(true);
    expect(validWithNotes.errors).toEqual({});
  });

  it('returns per-field inline errors for missing or invalid values', () => {
    const invalid = validateBookingClientFields({
      name: 'A',
      email: 'correo-invalido',
      phone: '123',
      notes: 'x'.repeat(FIELD_LIMITS.booking.notes.max + 5),
    });

    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.name).toBeTruthy();
    expect(invalid.errors.email).toBeTruthy();
    expect(invalid.errors.phone).toBeTruthy();
    expect(invalid.errors.notes).toBeTruthy();
  });

  it('requires name, email and phone when empty', () => {
    const empty = validateBookingClientFields({
      name: '   ',
      email: '',
      phone: '',
      notes: '',
    });

    expect(empty.isValid).toBe(false);
    expect(empty.errors.name).toBeTruthy();
    expect(empty.errors.email).toBeTruthy();
    expect(empty.errors.phone).toBeTruthy();
    expect(empty.errors.notes).toBeUndefined();
  });
});

describe('booking contact localStorage persistence', () => {
  let memoryStorage: Storage;

  beforeEach(() => {
    memoryStorage = createMemoryStorage();
    vi.stubGlobal('localStorage', memoryStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves, trims, truncates and loads contact without storing notes', () => {
    const longName = 'N'.repeat(FIELD_LIMITS.booking.name.max + 15);
    const contactWithExtra = {
      name: `  ${longName}  `,
      email: '  ana@ejemplo.com  ',
      phone: ' +54 9 11 2233-4455 ',
      notes: 'No debería guardarse',
    };

    saveBookingContact(contactWithExtra);

    const raw = memoryStorage.getItem(BOOKING_CONTACT_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(raw).not.toContain('notes');
    expect(raw).not.toContain('No debería guardarse');

    const loaded = loadSavedBookingContact();
    expect(loaded).toEqual({
      name: 'N'.repeat(FIELD_LIMITS.booking.name.max),
      email: 'ana@ejemplo.com',
      phone: '+54 9 11 2233-4455',
    });
  });

  it('clears saved contact cleanly', () => {
    saveBookingContact({
      name: 'Lucía',
      email: 'lucia@ejemplo.com',
      phone: '1155556666',
    });
    expect(loadSavedBookingContact()).not.toBeNull();

    clearSavedBookingContact();
    expect(loadSavedBookingContact()).toBeNull();
  });

  it('returns null on corrupt JSON, wrong types, empty objects, or storage errors', () => {
    memoryStorage.setItem(BOOKING_CONTACT_STORAGE_KEY, '{corrupt json');
    expect(loadSavedBookingContact()).toBeNull();

    memoryStorage.setItem(BOOKING_CONTACT_STORAGE_KEY, JSON.stringify(['array']));
    expect(loadSavedBookingContact()).toBeNull();

    memoryStorage.setItem(
      BOOKING_CONTACT_STORAGE_KEY,
      JSON.stringify({ name: 123, email: null, phone: {} })
    );
    expect(loadSavedBookingContact()).toBeNull();

    memoryStorage.setItem(
      BOOKING_CONTACT_STORAGE_KEY,
      JSON.stringify({ name: '   ', email: '', phone: '' })
    );
    expect(loadSavedBookingContact()).toBeNull();

    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    });

    expect(loadSavedBookingContact()).toBeNull();
    expect(() =>
      saveBookingContact({ name: 'Ana', email: 'a@b.com', phone: '11223344' })
    ).not.toThrow();
    expect(() => clearSavedBookingContact()).not.toThrow();
  });
});

describe('computeBookingWizardProgress', () => {
  const emptyFields = { name: '', email: '', phone: '', notes: '' };
  const validFields = {
    name: 'Camila Pérez',
    email: 'camila@example.com',
    phone: '+54 9 11 4567-8901',
    notes: '',
  };

  it('tracks hybrid live sub-step progress across a 4-step flow up to 100%', () => {
    const fourSteps = getVisibleWizardSteps(true);

    const step1Empty = computeBookingWizardProgress({
      effectiveStep: 'service',
      visibleSteps: fourSteps,
      hasSelectedService: false,
      hasLiveDurationConflict: false,
      isSlotUnavailable: false,
      isOnlinePaymentDisabled: false,
      fields: emptyFields,
      fieldErrors: {},
    });
    expect(step1Empty.percentage).toBe(0);
    expect(step1Empty.trackRatio).toBe(0);
    expect(step1Empty.statusKey).toBe('select_service');
    expect(step1Empty.tone).toBe('primary');

    const step1Selected = computeBookingWizardProgress({
      effectiveStep: 'service',
      visibleSteps: fourSteps,
      hasSelectedService: true,
      hasLiveDurationConflict: false,
      isSlotUnavailable: false,
      isOnlinePaymentDisabled: false,
      fields: emptyFields,
      fieldErrors: {},
    });
    expect(step1Selected.percentage).toBe(25);
    expect(step1Selected.trackRatio).toBeGreaterThan(0);
    expect(step1Selected.statusKey).toBe('service_ready');

    const step2Extras = computeBookingWizardProgress({
      effectiveStep: 'extras',
      visibleSteps: fourSteps,
      hasSelectedService: true,
      hasLiveDurationConflict: false,
      isSlotUnavailable: false,
      isOnlinePaymentDisabled: false,
      fields: emptyFields,
      fieldErrors: {},
    });
    expect(step2Extras.stepIndex).toBe(2);
    expect(step2Extras.percentage).toBe(50);
    expect(step2Extras.statusKey).toBe('extras_optional');

    const step3Zero = computeBookingWizardProgress({
      effectiveStep: 'details',
      visibleSteps: fourSteps,
      hasSelectedService: true,
      hasLiveDurationConflict: false,
      isSlotUnavailable: false,
      isOnlinePaymentDisabled: false,
      fields: emptyFields,
      fieldErrors: {},
    });
    expect(step3Zero.percentage).toBe(55);
    expect(step3Zero.remainingDetailsCount).toBe(3);
    expect(step3Zero.statusKey).toBe('details_remaining');

    const step3Two = computeBookingWizardProgress({
      effectiveStep: 'details',
      visibleSteps: fourSteps,
      hasSelectedService: true,
      hasLiveDurationConflict: false,
      isSlotUnavailable: false,
      isOnlinePaymentDisabled: false,
      fields: { ...emptyFields, name: 'Camila Pérez', email: 'camila@example.com' },
      fieldErrors: {},
    });
    expect(step3Two.percentage).toBe(79);
    expect(step3Two.validDetailsCount).toBe(2);
    expect(step3Two.remainingDetailsCount).toBe(1);
    expect(step3Two.trackRatio).toBeGreaterThan(step3Zero.trackRatio);

    const step3AllValid = computeBookingWizardProgress({
      effectiveStep: 'details',
      visibleSteps: fourSteps,
      hasSelectedService: true,
      hasLiveDurationConflict: false,
      isSlotUnavailable: false,
      isOnlinePaymentDisabled: false,
      fields: validFields,
      fieldErrors: {},
    });
    expect(step3AllValid.percentage).toBe(91);
    expect(step3AllValid.remainingDetailsCount).toBe(0);
    expect(step3AllValid.statusKey).toBe('details_ready');

    const step4Summary = computeBookingWizardProgress({
      effectiveStep: 'summary',
      visibleSteps: fourSteps,
      hasSelectedService: true,
      hasLiveDurationConflict: false,
      isSlotUnavailable: false,
      isOnlinePaymentDisabled: false,
      fields: validFields,
      fieldErrors: {},
    });
    expect(step4Summary.stepIndex).toBe(4);
    expect(step4Summary.percentage).toBe(100);
    expect(step4Summary.trackRatio).toBe(1);
    expect(step4Summary.statusKey).toBe('summary_ready');
    expect(step4Summary.tone).toBe('primary');
  });

  it('tracks 3-step flows cleanly when no extras are configured', () => {
    const threeSteps = getVisibleWizardSteps(false);

    const step1 = computeBookingWizardProgress({
      effectiveStep: 'service',
      visibleSteps: threeSteps,
      hasSelectedService: true,
      hasLiveDurationConflict: false,
      isSlotUnavailable: false,
      isOnlinePaymentDisabled: false,
      fields: emptyFields,
      fieldErrors: {},
    });
    expect(step1.totalSteps).toBe(3);
    expect(step1.percentage).toBe(30);

    const step2OneField = computeBookingWizardProgress({
      effectiveStep: 'details',
      visibleSteps: threeSteps,
      hasSelectedService: true,
      hasLiveDurationConflict: false,
      isSlotUnavailable: false,
      isOnlinePaymentDisabled: false,
      fields: { ...emptyFields, name: 'Camila Pérez' },
      fieldErrors: {},
    });
    expect(step2OneField.stepIndex).toBe(2);
    expect(step2OneField.percentage).toBe(57);

    const step3 = computeBookingWizardProgress({
      effectiveStep: 'summary',
      visibleSteps: threeSteps,
      hasSelectedService: true,
      hasLiveDurationConflict: false,
      isSlotUnavailable: false,
      isOnlinePaymentDisabled: false,
      fields: validFields,
      fieldErrors: {},
    });
    expect(step3.stepIndex).toBe(3);
    expect(step3.percentage).toBe(100);
    expect(step3.trackRatio).toBe(1);
  });

  it('reacts semantically to conflicts, slot unavailability, field errors, and exploration mode', () => {
    const fourSteps = getVisibleWizardSteps(true);
    const threeSteps = getVisibleWizardSteps(false);

    const conflict = computeBookingWizardProgress({
      effectiveStep: 'service',
      visibleSteps: fourSteps,
      hasSelectedService: true,
      hasLiveDurationConflict: true,
      isSlotUnavailable: false,
      isOnlinePaymentDisabled: false,
      fields: emptyFields,
      fieldErrors: {},
    });
    expect(conflict.tone).toBe('danger');
    expect(conflict.statusKey).toBe('duration_conflict');

    const unavailable = computeBookingWizardProgress({
      effectiveStep: 'details',
      visibleSteps: fourSteps,
      hasSelectedService: true,
      hasLiveDurationConflict: false,
      isSlotUnavailable: true,
      isOnlinePaymentDisabled: false,
      fields: validFields,
      fieldErrors: {},
    });
    expect(unavailable.tone).toBe('danger');
    expect(unavailable.statusKey).toBe('slot_unavailable');

    const detailsErrors = computeBookingWizardProgress({
      effectiveStep: 'details',
      visibleSteps: fourSteps,
      hasSelectedService: true,
      hasLiveDurationConflict: false,
      isSlotUnavailable: false,
      isOnlinePaymentDisabled: false,
      fields: emptyFields,
      fieldErrors: { name: 'Requerido', email: 'Inválido' },
    });
    expect(detailsErrors.tone).toBe('primary');
    expect(detailsErrors.statusKey).toBe('details_errors');
    expect(detailsErrors.errorFieldsCount).toBe(2);

    const exploreExtras = computeBookingWizardProgress({
      effectiveStep: 'extras',
      visibleSteps: fourSteps,
      hasSelectedService: true,
      hasLiveDurationConflict: false,
      isSlotUnavailable: false,
      isOnlinePaymentDisabled: true,
      fields: emptyFields,
      fieldErrors: {},
    });
    expect(exploreExtras.statusKey).toBe('exploration_mode');
    expect(exploreExtras.trackRatio).toBeCloseTo(1 / 3, 5);

    const exploreServiceOnly = computeBookingWizardProgress({
      effectiveStep: 'service',
      visibleSteps: threeSteps,
      hasSelectedService: true,
      hasLiveDurationConflict: false,
      isSlotUnavailable: false,
      isOnlinePaymentDisabled: true,
      fields: emptyFields,
      fieldErrors: {},
    });
    expect(exploreServiceOnly.statusKey).toBe('exploration_mode');
    expect(exploreServiceOnly.trackRatio).toBe(0);
  });
});
