import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, ArrowLeft, ArrowRight, CreditCard, Lock } from 'lucide-react';

import type { Slot, ClientData } from '../../../types';
import { useTenant } from '../../../context/TenantContext';
import { useOwnerInfo } from '../../../context/OwnerInfoContext';
import { formatEstimatedDuration } from '../../../services/bookingHelper';
import { validateSlotNoConflict } from '../../../services/schedulingService';
import { formatInstagramUrl } from '../../../utils/validators';
import Button from '../../common/Button/Button';
import Loader from '../../common/Loader/Loader';
import AlertModal, { type AlertModalType } from '../../common/AlertModal';
import { BOOKING_MODAL_TEXTS } from '../../../texts';
import {
  SlotBookingModalFrame,
  useSlotBookingForm,
  slotBookingStyles as sharedStyles,
} from '../SlotBookingShared';
import {
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
  type BookingClientFields,
  type BookingFieldErrors,
  type BookingWizardStepId,
  type SavedBookingContact,
} from './bookingWizard';
import BookingWizardStepper from './BookingWizardStepper';
import {
  ClientDetailsStep,
  ExtrasStep,
  ServiceStep,
  SummaryPaymentStep,
} from './BookingWizardSteps';
import styles from './BookingModal.module.css';

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: Slot | null;
  isSlotUnavailable?: boolean;
  onCheckout: (slotId: string, clientData: ClientData) => Promise<string>;
  existingSlots?: Slot[];
}

interface BookingModalContentProps {
  onClose: () => void;
  slot: Slot;
  isSlotUnavailable?: boolean;
  onCheckout: (slotId: string, clientData: ClientData) => Promise<string>;
  existingSlots?: Slot[];
}

const BookingModalContent: React.FC<BookingModalContentProps> = ({
  onClose,
  slot,
  isSlotUnavailable = false,
  onCheckout,
  existingSlots,
}) => {
  const [initialSavedContact] = useState<SavedBookingContact | null>(() =>
    loadSavedBookingContact()
  );
  const [name, setName] = useState(() => initialSavedContact?.name ?? '');
  const [email, setEmail] = useState(() => initialSavedContact?.email ?? '');
  const [phone, setPhone] = useState(() => initialSavedContact?.phone ?? '');
  const [notes, setNotes] = useState('');
  const [hasPrefilledContact, setHasPrefilledContact] = useState(() =>
    Boolean(initialSavedContact)
  );

  const [currentStep, setCurrentStep] = useState<BookingWizardStepId>('service');
  const [highestReachedStep, setHighestReachedStep] = useState<BookingWizardStepId>('service');
  const [stepDirection, setStepDirection] = useState<1 | -1>(1);
  const [serviceStepError, setServiceStepError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isCheckoutBusy = isLoading || isRedirecting;

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: AlertModalType;
    details?: string[];
  }>({
    isOpen: false,
    message: '',
    type: 'restriction',
  });

  const formBodyRef = useRef<HTMLDivElement | null>(null);
  const pendingConflictScrollRef = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  const scrollBodyToTop = useCallback(
    (instant = false) => {
      if (!formBodyRef.current) return;
      formBodyRef.current.scrollTo({
        top: 0,
        behavior: instant || prefersReducedMotion ? 'auto' : 'smooth',
      });
    },
    [prefersReducedMotion]
  );

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  const { mpConfigured } = useTenant();
  const { owner } = useOwnerInfo();
  const isOnlinePaymentDisabled = !mpConfigured;

  const cleanWaDigits = (owner.phone || '').replace(/\D/g, '');
  const whatsappContactUrl =
    cleanWaDigits.length >= 8 ? `https://wa.me/${cleanWaDigits}` : null;
  const instagramContactUrl = formatInstagramUrl(owner.instagram);

  const {
    relevantServices,
    activeServices,
    selectedServiceNames,
    selectedExtrasByService,
    bookedServices,
    selectedExtras,
    hasConfiguredExtras,
    totalEstimatedMinutes,
    baseServicePrice,
    totalExtrasPrice,
    slotSurcharge,
    surchargeAmount,
    totalFinalEstimatedPrice,
    balanceDueAtSalon,
    hasLiveDurationConflict,
    formattedDate,
    formattedTime,
    handleToggleService,
    handleToggleServiceExtra,
    buildClientDataPayload,
  } = useSlotBookingForm({
    slot,
    existingSlots,
    onClose,
    disableEscapeClose: isCheckoutBusy || alertState.isOpen,
  });

  const effectiveSlotUnavailable = isSlotUnavailable && !isCheckoutBusy;
  const effectiveDurationConflict = hasLiveDurationConflict && !isCheckoutBusy;

  const visibleSteps = useMemo(
    () => getVisibleWizardSteps(hasConfiguredExtras),
    [hasConfiguredExtras]
  );

  const effectiveStep = useMemo(
    () => resolveEffectiveWizardStep(currentStep, visibleSteps, isOnlinePaymentDisabled),
    [currentStep, visibleSteps, isOnlinePaymentDisabled]
  );

  const nextStep = getNextWizardStep(effectiveStep, visibleSteps);
  const prevStep = getPrevWizardStep(effectiveStep, visibleSteps);
  const isAdvanceBlockedByMp = isOnlinePaymentDisabled && nextStep === 'details';

  const clientFields: BookingClientFields = useMemo(
    () => ({ name, email, phone, notes }),
    [name, email, phone, notes]
  );

  const areClientFieldsValid = useMemo(
    () => validateBookingClientFields(clientFields).isValid,
    [clientFields]
  );

  const wizardProgress = useMemo(
    () =>
      computeBookingWizardProgress({
        effectiveStep,
        visibleSteps,
        hasSelectedService: activeServices.length > 0,
        hasLiveDurationConflict: effectiveDurationConflict,
        isSlotUnavailable: effectiveSlotUnavailable,
        isOnlinePaymentDisabled,
        fields: clientFields,
        fieldErrors,
      }),
    [
      effectiveStep,
      visibleSteps,
      activeServices.length,
      effectiveDurationConflict,
      effectiveSlotUnavailable,
      isOnlinePaymentDisabled,
      clientFields,
      fieldErrors,
    ]
  );

  useEffect(() => {
    scrollBodyToTop(true);
  }, [effectiveStep, scrollBodyToTop]);

  useEffect(() => {
    if (effectiveSlotUnavailable) {
      scrollBodyToTop();
    }
  }, [effectiveSlotUnavailable, scrollBodyToTop]);

  useEffect(() => {
    if (!isRedirecting || typeof window === 'undefined') return;
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsRedirecting(false);
        setIsLoading(false);
        onClose();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [isRedirecting, onClose]);

  useEffect(() => {
    if (!pendingConflictScrollRef.current) {
      return;
    }
    pendingConflictScrollRef.current = false;
    if (effectiveDurationConflict) {
      scrollBodyToTop();
    }
  }, [effectiveDurationConflict, selectedServiceNames, scrollBodyToTop]);

  const navigateToStep = (targetStep: BookingWizardStepId) => {
    if (isStepLockedByPaymentDisabled(targetStep, isOnlinePaymentDisabled)) {
      return;
    }
    const targetIndex = visibleSteps.indexOf(targetStep);
    const currentIndex = visibleSteps.indexOf(effectiveStep);
    if (targetIndex === -1) return;

    setStepDirection(targetIndex >= currentIndex ? 1 : -1);
    setCurrentStep(targetStep);

    setHighestReachedStep((prevHighest) => {
      const resolvedHighest = resolveEffectiveWizardStep(
        prevHighest,
        visibleSteps,
        isOnlinePaymentDisabled
      );
      const highestIndex = visibleSteps.indexOf(resolvedHighest);
      return targetIndex > highestIndex ? targetStep : prevHighest;
    });
  };

  const handleWizardToggleService = (serviceName: string) => {
    const isDeselecting = selectedServiceNames.includes(serviceName);
    pendingConflictScrollRef.current = !isDeselecting;
    handleToggleService(serviceName);
    setServiceStepError(null);
  };

  const handleFieldChange = (field: keyof BookingClientFields, value: string) => {
    if (field === 'name') setName(value);
    if (field === 'email') setEmail(value);
    if (field === 'phone') setPhone(value);
    if (field === 'notes') setNotes(value);

    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleClearPrefilled = () => {
    setName('');
    setEmail('');
    setPhone('');
    setHasPrefilledContact(false);
    setFieldErrors({});
    clearSavedBookingContact();
  };

  const handleAdvanceStep = () => {
    if (isCheckoutBusy || effectiveSlotUnavailable) {
      return;
    }

    if (effectiveStep === 'service') {
      if (activeServices.length === 0) {
        setServiceStepError(BOOKING_MODAL_TEXTS.wizard.serviceStep.selectAtLeastOneError);
        return;
      }
      if (effectiveDurationConflict) {
        scrollBodyToTop();
        return;
      }
      setServiceStepError(null);
    }

    if (!nextStep || isStepLockedByPaymentDisabled(nextStep, isOnlinePaymentDisabled)) {
      return;
    }

    if (effectiveStep === 'details') {
      const validation = validateBookingClientFields(clientFields);
      if (!validation.isValid) {
        setFieldErrors(validation.errors);
        return;
      }
      setFieldErrors({});
      saveBookingContact({ name, email, phone });
    }

    navigateToStep(nextStep);
  };

  const handleCheckoutSubmit = async () => {
    if (isOnlinePaymentDisabled) {
      setAlertState({
        isOpen: true,
        title: BOOKING_MODAL_TEXTS.mpNotConfigured.title,
        message: BOOKING_MODAL_TEXTS.mpNotConfigured.description,
        type: 'restriction',
      });
      return;
    }

    if (effectiveSlotUnavailable) {
      setAlertState({
        isOpen: true,
        title: BOOKING_MODAL_TEXTS.alerts.conflictTitle,
        message: BOOKING_MODAL_TEXTS.wizard.banners.slotUnavailableAlert,
        type: 'restriction',
      });
      return;
    }

    if (activeServices.length === 0) {
      setServiceStepError(BOOKING_MODAL_TEXTS.wizard.serviceStep.selectAtLeastOneError);
      navigateToStep('service');
      return;
    }

    const validation = validateBookingClientFields(clientFields);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      navigateToStep('details');
      return;
    }

    saveBookingContact({ name, email, phone });
    setIsLoading(true);

    try {
      const clientData = buildClientDataPayload(
        clientFields,
        BOOKING_MODAL_TEXTS.header.defaultServiceTitle
      );

      if (existingSlots && existingSlots.length > 0) {
        const conflictValidation = validateSlotNoConflict(
          {
            id: slot.id,
            datetime: slot.datetime,
            estimatedDurationMinutes: totalEstimatedMinutes,
            clientData,
          },
          existingSlots
        );

        if (!conflictValidation.isValid) {
          const durationFormatted =
            totalEstimatedMinutes > 0 ? formatEstimatedDuration(totalEstimatedMinutes) : '30 min';
          setAlertState({
            isOpen: true,
            title: BOOKING_MODAL_TEXTS.alerts.conflictTitle,
            message: BOOKING_MODAL_TEXTS.alerts.conflictMessage,
            type: 'restriction',
            details: [...BOOKING_MODAL_TEXTS.alerts.conflictDetails(durationFormatted)],
          });
          setIsLoading(false);
          return;
        }
      }

      const redirectUrl = await onCheckout(slot.id, clientData);

      if (redirectUrl) {
        setIsRedirecting(true);
        window.location.href = redirectUrl;
      } else {
        throw new Error(BOOKING_MODAL_TEXTS.alerts.mpUrlError);
      }
    } catch (err: unknown) {
      console.error(BOOKING_MODAL_TEXTS.logs.bookingError, err);
      const msg =
        err instanceof Error ? err.message : BOOKING_MODAL_TEXTS.alerts.unexpectedError;

      const isPaymentInProgress =
        msg.toLowerCase().includes('proceso de pago') ||
        msg.toLowerCase().includes('resource-exhausted');

      const isConflict =
        isPaymentInProgress ||
        msg.toLowerCase().includes('conflicto') ||
        msg.toLowerCase().includes('no está disponible') ||
        msg.toLowerCase().includes('reservado');

      const durationFormatted =
        totalEstimatedMinutes > 0 ? formatEstimatedDuration(totalEstimatedMinutes) : '30 min';

      setAlertState({
        isOpen: true,
        title: isPaymentInProgress
          ? BOOKING_MODAL_TEXTS.alerts.pendingPaymentTitle
          : isConflict
            ? BOOKING_MODAL_TEXTS.alerts.conflictTitle
            : BOOKING_MODAL_TEXTS.alerts.restrictionTitle,
        message: isPaymentInProgress
          ? BOOKING_MODAL_TEXTS.alerts.pendingPaymentMessage
          : isConflict
            ? BOOKING_MODAL_TEXTS.alerts.conflictMessage
            : msg,
        type: isConflict ? 'restriction' : 'error',
        details: isConflict
          ? isPaymentInProgress
            ? [...BOOKING_MODAL_TEXTS.alerts.pendingPaymentDetails]
            : [...BOOKING_MODAL_TEXTS.alerts.conflictDetails(durationFormatted)]
          : undefined,
      });
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (effectiveStep !== 'summary') {
      handleAdvanceStep();
      return;
    }

    await handleCheckoutSubmit();
  };

  const serviceDisplayName =
    activeServices.length > 0
      ? activeServices.map((s) => s.name).join(' + ')
      : slot.serviceName || BOOKING_MODAL_TEXTS.header.defaultServiceName;

  const isSummaryStep = effectiveStep === 'summary';
  const isContinueBlockedByConflict = effectiveStep === 'service' && effectiveDurationConflict;
  const isContinueDisabled = isCheckoutBusy || effectiveSlotUnavailable || isAdvanceBlockedByMp;

  const stepMotionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };

  const bannerMotionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

  const microMotionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <SlotBookingModalFrame
      titleId="booking-modal-title"
      title={BOOKING_MODAL_TEXTS.header.title}
      subtitle={BOOKING_MODAL_TEXTS.header.subtitle}
      closeAriaLabel={BOOKING_MODAL_TEXTS.header.closeAriaLabel}
      isBusy={isCheckoutBusy}
      onClose={onClose}
      onSubmit={handleFormSubmit}
      fixedSize
      compactMobileContext
      noValidate
      formBodyRef={formBodyRef}
      serviceDisplayName={serviceDisplayName}
      depositText={`${BOOKING_MODAL_TEXTS.header.depositPrefix}${slot.depositAmount.toLocaleString('es-AR')}`}
      formattedDate={formattedDate}
      formattedTime={formattedTime}
      hourSuffix={BOOKING_MODAL_TEXTS.header.hourSuffix}
      totalEstimatedMinutes={totalEstimatedMinutes}
      baseServicePrice={baseServicePrice}
      basePricePrefix={BOOKING_MODAL_TEXTS.header.basePricePrefix}
      contextEstimatedTotal={totalFinalEstimatedPrice}
      contextEstimatedTotalPrefix={BOOKING_MODAL_TEXTS.wizard.navigation.contextEstimatedPrefix}
      surcharge={slotSurcharge}
      surchargeAmount={surchargeAmount}
      surchargeContextNote={BOOKING_MODAL_TEXTS.header.surchargeContextNote}
      headerExtra={
        <BookingWizardStepper
          visibleSteps={visibleSteps}
          effectiveStep={effectiveStep}
          highestReachedStep={highestReachedStep}
          progress={wizardProgress}
          isOnlinePaymentDisabled={isOnlinePaymentDisabled}
          hasSelectedService={activeServices.length > 0}
          hasLiveDurationConflict={effectiveDurationConflict}
          areClientFieldsValid={areClientFieldsValid}
          disabled={isCheckoutBusy}
          onSelectStep={navigateToStep}
        />
      }
      footer={
        <div
          className={`${styles.wizardFooter} ${isSummaryStep ? styles.wizardFooterSummaryOnly : ''}`}
        >
          <AnimatePresence initial={false}>
            {!isSummaryStep && (
              <motion.div
                key="live-estimate-box"
                className={styles.liveEstimateWrap}
                initial={prefersReducedMotion ? false : { opacity: 0, height: 0, y: 4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: 4 }}
                transition={bannerMotionTransition}
              >
                <div className={styles.liveEstimateBox} aria-live="polite">
                  <span className={styles.liveEstimatePrimary}>
                    <AnimatePresence initial={false}>
                      {totalFinalEstimatedPrice > 0 && (
                        <motion.span
                          key="live-total-est"
                          className={styles.liveEstimateTotal}
                          initial={prefersReducedMotion ? false : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={microMotionTransition}
                        >
                          {BOOKING_MODAL_TEXTS.wizard.navigation.liveTotalPrefix} $
                          {totalFinalEstimatedPrice.toLocaleString('es-AR')}
                          {' · '}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <span className={styles.liveEstimateDeposit}>
                      {BOOKING_MODAL_TEXTS.wizard.navigation.liveDepositPrefix} $
                      {slot.depositAmount.toLocaleString('es-AR')}
                    </span>
                  </span>
                  <AnimatePresence initial={false}>
                    {totalEstimatedMinutes > 0 && (
                      <motion.span
                        key="live-duration"
                        className={styles.liveEstimateMeta}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
                        transition={microMotionTransition}
                      >
                        {formatEstimatedDuration(totalEstimatedMinutes)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={styles.wizardFooterButtons}>
            {prevStep ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => navigateToStep(prevStep)}
                disabled={isCheckoutBusy}
                leftIcon={<ArrowLeft size={14} strokeWidth={1.85} aria-hidden="true" />}
              >
                {BOOKING_MODAL_TEXTS.wizard.navigation.backButton}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
                disabled={isCheckoutBusy}
              >
                {BOOKING_MODAL_TEXTS.footer.cancelButton}
              </Button>
            )}

            {isSummaryStep ? (
              <Button
                type="submit"
                variant="primary"
                size="md"
                className={`${sharedStyles.submitBtn} ${styles.wizardFooterPrimaryBtn}`}
                isLoading={isCheckoutBusy}
                disabled={
                  isCheckoutBusy ||
                  effectiveSlotUnavailable ||
                  effectiveDurationConflict ||
                  isOnlinePaymentDisabled
                }
                leftIcon={<CreditCard size={15} strokeWidth={1.75} aria-hidden="true" />}
              >
                {isOnlinePaymentDisabled
                  ? BOOKING_MODAL_TEXTS.footer.onlinePaymentUnavailable
                  : isCheckoutBusy
                    ? BOOKING_MODAL_TEXTS.footer.generatingPayment
                    : BOOKING_MODAL_TEXTS.footer.payDepositButton(
                        slot.depositAmount.toLocaleString('es-AR')
                      )}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="md"
                className={`${styles.wizardFooterPrimaryBtn} ${
                  isContinueBlockedByConflict ? styles.wizardFooterPrimaryBlocked : ''
                }`}
                disabled={isContinueDisabled}
                aria-disabled={isContinueDisabled || isContinueBlockedByConflict || undefined}
                leftIcon={
                  isAdvanceBlockedByMp ? (
                    <Lock size={14} strokeWidth={1.85} aria-hidden="true" />
                  ) : undefined
                }
                rightIcon={
                  isAdvanceBlockedByMp ? undefined : (
                    <ArrowRight size={15} strokeWidth={1.85} aria-hidden="true" />
                  )
                }
              >
                {isAdvanceBlockedByMp
                  ? BOOKING_MODAL_TEXTS.footer.onlinePaymentUnavailable
                  : BOOKING_MODAL_TEXTS.wizard.navigation.continueButton}
              </Button>
            )}
          </div>
        </div>
      }
      overlays={
        <>
          {isCheckoutBusy && (
            <Loader
              fullScreen
              title={BOOKING_MODAL_TEXTS.loader.title}
              subtitle={BOOKING_MODAL_TEXTS.loader.subtitle}
              icon="shield"
            />
          )}

          <AlertModal
            isOpen={alertState.isOpen}
            onClose={closeAlert}
            title={alertState.title}
            message={alertState.message}
            type={alertState.type}
            details={alertState.details}
          />
        </>
      }
    >
      <div className={styles.wizardBodyInner}>
        <AnimatePresence initial={false}>
          {isOnlinePaymentDisabled && (
            <motion.div
              key="mp-unavailable-banner"
              className={styles.collapsibleBanner}
              initial={prefersReducedMotion ? false : { opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -6 }}
              transition={bannerMotionTransition}
            >
              <div className={styles.collapsibleBannerSpacer}>
                <div className={sharedStyles.mpUnavailableBanner} role="alert">
                  <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
                  <div className={sharedStyles.mpUnavailableContent}>
                    <strong>{BOOKING_MODAL_TEXTS.mpNotConfigured.title}</strong>
                    <p>{BOOKING_MODAL_TEXTS.mpNotConfigured.description}</p>
                    {(whatsappContactUrl || instagramContactUrl) && (
                      <div className={sharedStyles.mpUnavailableLinks}>
                        {whatsappContactUrl && (
                          <a
                            href={whatsappContactUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={sharedStyles.mpUnavailableLink}
                          >
                            {BOOKING_MODAL_TEXTS.mpNotConfigured.whatsappCta}
                          </a>
                        )}
                        {instagramContactUrl && (
                          <a
                            href={instagramContactUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={sharedStyles.mpUnavailableLink}
                          >
                            {BOOKING_MODAL_TEXTS.mpNotConfigured.instagramCta}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {effectiveSlotUnavailable && (
            <motion.div
              key="slot-unavailable-banner"
              className={styles.collapsibleBanner}
              initial={prefersReducedMotion ? false : { opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -6 }}
              transition={bannerMotionTransition}
            >
              <div className={styles.collapsibleBannerSpacer}>
                <div className={sharedStyles.liveConflictBanner} role="alert">
                  <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span>{BOOKING_MODAL_TEXTS.wizard.banners.slotUnavailable}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {!effectiveSlotUnavailable && effectiveDurationConflict && (
            <motion.div
              key="live-conflict-banner"
              className={styles.collapsibleBanner}
              initial={prefersReducedMotion ? false : { opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -6 }}
              transition={bannerMotionTransition}
            >
              <div className={styles.collapsibleBannerSpacer}>
                <div className={sharedStyles.liveConflictBanner} role="alert">
                  <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span>
                    {BOOKING_MODAL_TEXTS.wizard.banners.liveDurationConflict(
                      formatEstimatedDuration(totalEstimatedMinutes)
                    )}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={effectiveStep}
            className={styles.stepStage}
            initial={prefersReducedMotion ? false : { opacity: 0, x: stepDirection * 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={
              prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: stepDirection * -14 }
            }
            transition={stepMotionTransition}
          >
            {effectiveStep === 'service' && (
              <ServiceStep
                relevantServices={relevantServices}
                selectedServiceNames={selectedServiceNames}
                disabled={isLoading}
                errorMessage={serviceStepError}
                onToggleService={handleWizardToggleService}
              />
            )}

            {effectiveStep === 'extras' && (
              <ExtrasStep
                activeServices={activeServices}
                selectedExtrasByService={selectedExtrasByService}
                selectedExtrasCount={selectedExtras.length}
                totalExtrasPrice={totalExtrasPrice}
                disabled={isLoading}
                onToggleExtra={handleToggleServiceExtra}
              />
            )}

            {effectiveStep === 'details' && (
              <ClientDetailsStep
                fields={clientFields}
                fieldErrors={fieldErrors}
                hasPrefilledContact={hasPrefilledContact}
                disabled={isLoading}
                onFieldChange={handleFieldChange}
                onClearPrefilled={handleClearPrefilled}
              />
            )}

            {effectiveStep === 'summary' && (
              <SummaryPaymentStep
                formattedDate={formattedDate}
                formattedTime={formattedTime}
                hourSuffix={BOOKING_MODAL_TEXTS.header.hourSuffix}
                totalEstimatedMinutes={totalEstimatedMinutes}
                bookedServices={bookedServices}
                hasConfiguredExtras={hasConfiguredExtras}
                fields={clientFields}
                baseServicePrice={baseServicePrice}
                selectedExtrasCount={selectedExtras.length}
                totalExtrasPrice={totalExtrasPrice}
                slotSurcharge={slotSurcharge}
                surchargeAmount={surchargeAmount}
                totalFinalEstimatedPrice={totalFinalEstimatedPrice}
                depositAmount={slot.depositAmount}
                balanceDueAtSalon={balanceDueAtSalon}
                disabled={isLoading}
                onEditStep={navigateToStep}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </SlotBookingModalFrame>
  );
};

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  slot,
  isSlotUnavailable = false,
  onCheckout,
  existingSlots,
}) => {
  if (!isOpen || !slot) return null;

  return (
    <BookingModalContent
      key={slot.id}
      slot={slot}
      isSlotUnavailable={isSlotUnavailable}
      onClose={onClose}
      onCheckout={onCheckout}
      existingSlots={existingSlots}
    />
  );
};

export default BookingModal;
