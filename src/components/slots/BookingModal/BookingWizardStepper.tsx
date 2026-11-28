import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Lock } from 'lucide-react';
import { BOOKING_MODAL_TEXTS } from '../../../texts';
import {
  canNavigateToWizardStep,
  isStepLockedByPaymentDisabled,
  type BookingWizardProgressState,
  type BookingWizardStepId,
} from './bookingWizard';
import styles from './BookingModal.module.css';

export interface BookingWizardStepperProps {
  visibleSteps: BookingWizardStepId[];
  effectiveStep: BookingWizardStepId;
  highestReachedStep: BookingWizardStepId;
  progress: BookingWizardProgressState;
  isOnlinePaymentDisabled: boolean;
  hasSelectedService: boolean;
  hasLiveDurationConflict: boolean;
  areClientFieldsValid: boolean;
  disabled?: boolean;
  onSelectStep: (stepId: BookingWizardStepId) => void;
}

function getProgressStatusLabel(progress: BookingWizardProgressState): string {
  const { statuses } = BOOKING_MODAL_TEXTS.wizard.progress;
  switch (progress.statusKey) {
    case 'slot_unavailable':
      return statuses.slot_unavailable;
    case 'duration_conflict':
      return statuses.duration_conflict;
    case 'exploration_mode':
      return statuses.exploration_mode;
    case 'select_service':
      return statuses.select_service;
    case 'service_ready':
      return statuses.service_ready;
    case 'extras_optional':
      return statuses.extras_optional;
    case 'details_errors':
      return statuses.details_errors(progress.errorFieldsCount);
    case 'details_remaining':
      return statuses.details_remaining(progress.remainingDetailsCount);
    case 'details_ready':
      return statuses.details_ready;
    case 'summary_ready':
      return statuses.summary_ready;
  }
}

export const BookingWizardStepper: React.FC<BookingWizardStepperProps> = ({
  visibleSteps,
  effectiveStep,
  highestReachedStep,
  progress,
  isOnlinePaymentDisabled,
  hasSelectedService,
  hasLiveDurationConflict,
  areClientFieldsValid,
  disabled = false,
  onSelectStep,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const effectiveIndex = visibleSteps.indexOf(effectiveStep);
  const isDangerTone = progress.tone === 'danger';
  const statusLabel = getProgressStatusLabel(progress);
  const activeStepLabel = BOOKING_MODAL_TEXTS.wizard.steps[effectiveStep];

  const lastUnlockedIndex = visibleSteps.reduce(
    (lastIdx, stepId, index) =>
      !isStepLockedByPaymentDisabled(stepId, isOnlinePaymentDisabled) ? index : lastIdx,
    0
  );
  const lockedTrackStartPct =
    visibleSteps.length > 1 ? (lastUnlockedIndex / (visibleSteps.length - 1)) * 100 : 0;

  const trackSpring = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 260, damping: 30, mass: 0.8 };

  const itemTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };

  const textTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.15, ease: [0.22, 1, 0.36, 1] as const };

  const iconTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.14, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <nav
      className={styles.stepperNav}
      aria-label={BOOKING_MODAL_TEXTS.wizard.stepperAriaLabel}
    >
      <div className={styles.progressHeaderRow}>
        <div className={styles.progressHeaderLeft}>
          <span className={styles.progressStepCounter}>
            {BOOKING_MODAL_TEXTS.wizard.progress.stepCounter(
              progress.stepIndex,
              progress.totalSteps
            )}
          </span>
          <span className={styles.progressHeaderDivider} aria-hidden="true">
            ·
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`${progress.statusKey}-${statusLabel}`}
              className={`${styles.progressStatusText} ${
                isDangerTone ? styles.progressStatusTextDanger : ''
              }`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
              transition={textTransition}
            >
              {statusLabel}
            </motion.span>
          </AnimatePresence>
        </div>

        <span
          className={`${styles.progressPercentage} ${
            isDangerTone ? styles.progressPercentageDanger : ''
          }`}
        >
          {progress.percentage}%
        </span>
      </div>

      <div
        className={styles.progressNodesWrapper}
        style={{ '--step-count': visibleSteps.length } as React.CSSProperties}
      >
        <div
          className={styles.progressTrackRail}
          role="progressbar"
          aria-valuenow={progress.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={BOOKING_MODAL_TEXTS.wizard.progress.ariaValueText(
            progress.stepIndex,
            progress.totalSteps,
            activeStepLabel,
            progress.percentage
          )}
        >
          <motion.div
            className={`${styles.progressTrackFill} ${
              isDangerTone ? styles.progressTrackFillDanger : ''
            }`}
            initial={false}
            animate={{ scaleX: progress.trackRatio }}
            transition={trackSpring}
          />
          {isOnlinePaymentDisabled && (
            <span
              className={styles.progressTrackLockedOverlay}
              style={{ left: `${lockedTrackStartPct}%` }}
              aria-hidden="true"
            />
          )}
        </div>

        <ol className={styles.stepperList}>
          <AnimatePresence initial={false} mode="popLayout">
            {visibleSteps.map((stepId, index) => {
              const isActive = stepId === effectiveStep;
              const isLocked = isStepLockedByPaymentDisabled(stepId, isOnlinePaymentDisabled);
              const isCompleted = !isLocked && effectiveIndex !== -1 && index < effectiveIndex;
              const canNavigate =
                !disabled &&
                canNavigateToWizardStep({
                  targetStep: stepId,
                  currentStep: effectiveStep,
                  highestReachedStep,
                  visibleSteps,
                  isOnlinePaymentDisabled,
                  hasSelectedService,
                  hasLiveDurationConflict,
                  areClientFieldsValid,
                });

              const label = BOOKING_MODAL_TEXTS.wizard.steps[stepId];
              const stepAriaLabel = isLocked
                ? `${index + 1}. ${label} (${BOOKING_MODAL_TEXTS.wizard.stepLockedSuffix})`
                : `${index + 1}. ${label}`;

              const buttonClassName = [
                styles.stepperButton,
                isActive ? styles.stepperButtonActive : '',
                isActive && isDangerTone ? styles.stepperButtonDanger : '',
                isCompleted ? styles.stepperButtonCompleted : '',
                isLocked ? styles.stepperButtonLocked : '',
                canNavigate ? styles.stepperButtonClickable : '',
              ]
                .filter(Boolean)
                .join(' ');

              const circleIconKey = isLocked
                ? 'locked'
                : isCompleted
                  ? 'completed'
                  : `num-${index + 1}`;

              return (
                <motion.li
                  key={stepId}
                  layout={!prefersReducedMotion}
                  initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                  transition={itemTransition}
                  className={styles.stepperItem}
                >
                  <button
                    type="button"
                    className={buttonClassName}
                    onClick={() => {
                      if (canNavigate) {
                        onSelectStep(stepId);
                      }
                    }}
                    disabled={!canNavigate}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={stepAriaLabel}
                  >
                    <span className={styles.stepperCircle} aria-hidden="true">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={circleIconKey}
                          className={styles.stepperCircleIcon}
                          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.55 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.55 }}
                          transition={iconTransition}
                        >
                          {isLocked ? (
                            <Lock size={10} strokeWidth={2.1} />
                          ) : isCompleted ? (
                            <Check size={12} strokeWidth={2.5} />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                    <span className={styles.stepperLabel}>{label}</span>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      </div>
    </nav>
  );
};

export default BookingWizardStepper;
