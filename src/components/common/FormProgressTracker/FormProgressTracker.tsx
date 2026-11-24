import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Info,
  Minus,
} from 'lucide-react';
import { FORM_PROGRESS_TRACKER_TEXTS } from '../../../texts';
import {
  computeFormProgress,
  type FormProgressStep,
  type ProgressStepStatus,
} from './progressUtils';
import { useAdminLayoutMetrics } from './useAdminStickyOffset';
import styles from './FormProgressTracker.module.css';

export interface FormProgressTrackerProps {
  title: string;
  steps: FormProgressStep[];
  readyMessage: string;
  readyActionLabel?: string;
  readyActionTargetId?: string;
  pendingFooterMessage?: string;
  pendingCompactMessage?: string;
  pendingActionLabel?: string;
  pendingActionTargetId?: string;
  observeVisibilityRef?: React.RefObject<HTMLElement | null>;
  hasUnsavedProgress?: boolean;
  storageKey?: string;
  mobileClassName?: string;
}

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';
const SIDEBAR_SLOT_ID = 'admin-sidebar-progress-slot';
const FLOATING_LAYER_ID = 'admin-floating-layer';

const resolveDesktopPortalTarget = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  return (
    document.getElementById(SIDEBAR_SLOT_ID) ??
    document.getElementById(FLOATING_LAYER_ID)
  );
};

const highlightTargetElement = (element: HTMLElement) => {
  element.removeAttribute('data-tracker-highlight');
  void element.offsetWidth;
  element.setAttribute('data-tracker-highlight', 'true');
  window.setTimeout(() => {
    element.removeAttribute('data-tracker-highlight');
  }, 1350);
};

const renderStepIcon = (status: ProgressStepStatus, size = 11) => {
  if (status === 'complete' || status === 'optional_done') {
    return <Check size={size} strokeWidth={2.5} aria-hidden="true" />;
  }
  if (status === 'partial') {
    return <Minus size={size} strokeWidth={2.5} aria-hidden="true" />;
  }
  if (status === 'error') {
    return <AlertCircle size={size} strokeWidth={2.3} aria-hidden="true" />;
  }
  return null;
};

const getCheckboxStateClass = (status: ProgressStepStatus): string => {
  switch (status) {
    case 'complete':
      return styles.checkboxComplete;
    case 'partial':
      return styles.checkboxPartial;
    case 'error':
      return styles.checkboxError;
    case 'optional_done':
      return styles.checkboxOptionalDone;
    case 'optional_empty':
      return styles.checkboxOptionalEmpty;
    default:
      return styles.checkboxPending;
  }
};

const getDetailStateClass = (status: ProgressStepStatus): string => {
  switch (status) {
    case 'complete':
      return styles.detailComplete;
    case 'partial':
      return styles.detailPartial;
    case 'error':
      return styles.detailError;
    case 'optional_done':
      return styles.detailOptionalDone;
    default:
      return styles.detailMuted;
  }
};

export const FormProgressTracker: React.FC<FormProgressTrackerProps> = ({
  title,
  steps,
  readyMessage,
  readyActionLabel,
  readyActionTargetId,
  pendingFooterMessage,
  pendingCompactMessage,
  pendingActionLabel,
  pendingActionTargetId,
  observeVisibilityRef,
  hasUnsavedProgress = false,
  storageKey,
  mobileClassName = '',
}) => {
  const { stickyTopOffset, sidebarLeft, sidebarWidth } = useAdminLayoutMetrics();
  const mobileBarRef = useRef<HTMLDivElement | null>(null);

  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
  });

  const [desktopMinimized, setDesktopMinimized] = useState<boolean>(() => {
    if (!storageKey || typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });

  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [isFormInView, setIsFormInView] = useState(true);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(() =>
    resolveDesktopPortalTarget()
  );

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      const preferred = resolveDesktopPortalTarget() ?? document.body;
      setPortalTarget((prev) => (prev === preferred ? prev : preferred));
    });
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        setMobileExpanded(false);
      }
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!observeVisibilityRef?.current || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const targetEl = observeVisibilityRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsFormInView(entry.isIntersecting);
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(targetEl);
    return () => observer.disconnect();
  }, [observeVisibilityRef]);

  useEffect(() => {
    if (!mobileExpanded) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileExpanded(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const container = mobileBarRef.current;
      if (container && !container.contains(event.target as Node)) {
        setMobileExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [mobileExpanded]);

  const toggleDesktopMinimized = () => {
    setDesktopMinimized((prev) => {
      const next = !prev;
      if (storageKey) {
        try {
          window.localStorage.setItem(storageKey, next ? '1' : '0');
        } catch {
          // Ignore storage quota / privacy mode failures
        }
      }
      return next;
    });
  };

  const summary = useMemo(() => computeFormProgress(steps), [steps]);
  const hasInteractiveSteps = useMemo(
    () => steps.some((step) => Boolean(step.targetId)),
    [steps]
  );

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const scrollToTarget = useCallback(
    (targetId?: string) => {
      if (!targetId || typeof document === 'undefined') return;
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      setMobileExpanded(false);

      const mobileBarHeight =
        !isDesktop && mobileBarRef.current
          ? mobileBarRef.current.getBoundingClientRect().height
          : 0;
      const isFormControl =
        targetEl instanceof HTMLInputElement ||
        targetEl instanceof HTMLTextAreaElement ||
        targetEl instanceof HTMLSelectElement;
      const extraLabelClearance = isFormControl ? 34 : 0;
      const clearance = stickyTopOffset + mobileBarHeight + 16 + extraLabelClearance;
      const top = Math.max(
        0,
        targetEl.getBoundingClientRect().top + window.scrollY - clearance
      );

      window.scrollTo({
        top,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
      highlightTargetElement(targetEl);
    },
    [isDesktop, stickyTopOffset]
  );

  const scrollToFormTop = useCallback(() => {
    const container = observeVisibilityRef?.current;
    if (!container) return;
    const top = Math.max(
      0,
      container.getBoundingClientRect().top + window.scrollY - stickyTopOffset - 16
    );
    window.scrollTo({
      top,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [observeVisibilityRef, stickyTopOffset]);

  const compactStatusText = useMemo(() => {
    if (summary.hasErrors && summary.nextPendingStep) {
      return FORM_PROGRESS_TRACKER_TEXTS.reviewErrorSingle(summary.nextPendingStep.label);
    }
    if (summary.isReady) {
      return readyMessage;
    }
    if (pendingCompactMessage) {
      return pendingCompactMessage;
    }
    if (summary.remainingRequired === 1 && summary.nextPendingStep) {
      return FORM_PROGRESS_TRACKER_TEXTS.missingSingle(summary.nextPendingStep.label);
    }
    return FORM_PROGRESS_TRACKER_TEXTS.missingMultiple(summary.remainingRequired);
  }, [summary, readyMessage, pendingCompactMessage]);

  const footerStatusText = useMemo(() => {
    if (summary.hasErrors) {
      return FORM_PROGRESS_TRACKER_TEXTS.reviewErrorFooter(summary.errorCount);
    }
    if (summary.isReady) {
      return readyMessage;
    }
    if (pendingFooterMessage) {
      return pendingFooterMessage;
    }
    if (summary.remainingRequired === 1 && summary.nextPendingStep) {
      return FORM_PROGRESS_TRACKER_TEXTS.remainingFooterSingle(
        summary.nextPendingStep.label
      );
    }
    return FORM_PROGRESS_TRACKER_TEXTS.remainingFooterMultiple(
      summary.remainingRequired
    );
  }, [summary, readyMessage, pendingFooterMessage]);

  const barToneClass = summary.hasErrors
    ? styles.progressFillError
    : summary.isReady
      ? styles.progressFillReady
      : styles.progressFillPrimary;

  const trackToneClass = summary.hasErrors
    ? styles.progressTrackError
    : summary.isReady
      ? styles.progressTrackReady
      : styles.progressTrackPrimary;

  const renderChecklistItems = (compactDesktop = false) => (
    <ul className={`${styles.stepList} ${compactDesktop ? styles.desktopStepList : ''}`}>
      {steps.map((step) => {
        const statusLabel = FORM_PROGRESS_TRACKER_TEXTS.statusLabels[step.status];
        const isInteractive = Boolean(step.targetId);
        return (
          <li key={step.id} className={styles.stepItem}>
            <button
              type="button"
              className={`${styles.stepButton} ${
                compactDesktop ? styles.desktopStepButton : ''
              } ${step.status === 'error' ? styles.stepButtonError : ''}`}
              onClick={() => scrollToTarget(step.targetId)}
              disabled={!isInteractive}
              title={compactDesktop ? `${step.label}: ${step.detail}` : undefined}
              aria-label={FORM_PROGRESS_TRACKER_TEXTS.goToSectionAria(
                step.label,
                statusLabel,
                step.detail
              )}
            >
              <span
                className={`${styles.stepCheckbox} ${
                  compactDesktop ? styles.desktopStepCheckbox : ''
                } ${getCheckboxStateClass(step.status)}`}
                aria-hidden="true"
              >
                {renderStepIcon(step.status, compactDesktop ? 10 : 11)}
              </span>

              <span className={styles.stepTextCol}>
                <span className={styles.stepTitleRow}>
                  {step.stepNumber && (
                    <span className={styles.stepNumber}>{step.stepNumber}</span>
                  )}
                  <span
                    className={`${styles.stepLabel} ${
                      compactDesktop ? styles.desktopStepLabel : ''
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.optional && (
                    <span className={styles.optionalBadge}>
                      {FORM_PROGRESS_TRACKER_TEXTS.optionalBadge}
                    </span>
                  )}
                </span>
                <span
                  className={`${styles.stepDetail} ${
                    compactDesktop ? styles.desktopStepDetail : ''
                  } ${getDetailStateClass(step.status)}`}
                >
                  {step.detail}
                </span>
              </span>

              {isInteractive && (
                <ChevronRight
                  size={compactDesktop ? 12 : 13}
                  strokeWidth={2}
                  className={styles.stepChevron}
                  aria-hidden="true"
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const renderNavigationHint = (hintText: string) => {
    if (!hasInteractiveSteps) return null;
    return (
      <div className={styles.navigationHintBanner} role="note">
        <Info size={13} strokeWidth={2} className={styles.navigationHintIcon} aria-hidden="true" />
        <span className={styles.navigationHintText}>{hintText}</span>
      </div>
    );
  };

  const renderFooter = () => (
    <div
      className={`${styles.trackerFooter} ${
        summary.isReady
          ? styles.trackerFooterReady
          : summary.hasErrors
            ? styles.trackerFooterError
            : ''
      }`}
    >
      <span className={styles.footerStatusText}>{footerStatusText}</span>

      {summary.isReady && readyActionLabel && readyActionTargetId && (
        <button
          type="button"
          className={styles.footerJumpBtn}
          onClick={() => scrollToTarget(readyActionTargetId)}
        >
          <span>{readyActionLabel}</span>
          <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
        </button>
      )}

      {!summary.isReady && !summary.hasErrors && pendingActionLabel && pendingActionTargetId && (
        <button
          type="button"
          className={`${styles.footerJumpBtn} ${styles.footerJumpPrimary}`}
          onClick={() => scrollToTarget(pendingActionTargetId)}
        >
          <span>{pendingActionLabel}</span>
          <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
        </button>
      )}

      {summary.hasErrors && summary.nextPendingStep?.targetId && (
        <button
          type="button"
          className={`${styles.footerJumpBtn} ${styles.footerJumpError}`}
          onClick={() => scrollToTarget(summary.nextPendingStep?.targetId)}
        >
          <span>{summary.nextPendingStep.label}</span>
          <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  );

  const effectiveFormInView = observeVisibilityRef ? isFormInView : true;

  const shouldRenderDesktop =
    isDesktop &&
    portalTarget !== null &&
    (effectiveFormInView || hasUnsavedProgress);

  const desktopPositionStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (sidebarLeft === null || sidebarWidth === null) return undefined;
    return {
      '--tracker-desktop-left': `${sidebarLeft}px`,
      '--tracker-desktop-width': `${sidebarWidth}px`,
    } as React.CSSProperties;
  }, [sidebarLeft, sidebarWidth]);

  const isDockedInSidebar = portalTarget?.id === SIDEBAR_SLOT_ID;

  const desktopFloatingElement = shouldRenderDesktop
    ? createPortal(
        <aside
          className={isDockedInSidebar ? styles.desktopDockedRoot : styles.desktopFloatingRoot}
          style={isDockedInSidebar ? undefined : desktopPositionStyle}
          aria-label={title}
        >
          {!effectiveFormInView && hasUnsavedProgress ? (
            <button
              type="button"
              className={`${styles.desktopCompactPill} ${
                isDockedInSidebar ? styles.desktopDockedCard : ''
              }`}
              onClick={scrollToFormTop}
            >
              <span className={styles.compactPillTop}>
                <span className={styles.compactPillTitle}>
                  <ArrowUp size={13} strokeWidth={2.2} aria-hidden="true" />
                  <span>{FORM_PROGRESS_TRACKER_TEXTS.returnToFormButton}</span>
                </span>
                <span
                  className={`${styles.fractionPill} ${
                    summary.isReady ? styles.fractionPillReady : ''
                  }`}
                >
                  {summary.completedRequired}/{summary.totalRequired}
                </span>
              </span>
              <span
                className={`${styles.compactProgressTrack} ${trackToneClass}`}
                aria-hidden="true"
              >
                <span
                  className={`${styles.progressFill} ${barToneClass}`}
                  style={{ transform: `scaleX(${summary.percentage / 100})` }}
                />
              </span>
            </button>
          ) : desktopMinimized ? (
            <button
              type="button"
              className={`${styles.desktopCompactPill} ${
                isDockedInSidebar ? styles.desktopDockedCard : ''
              }`}
              onClick={toggleDesktopMinimized}
              aria-expanded={false}
              aria-label={FORM_PROGRESS_TRACKER_TEXTS.expandAria}
            >
              <span className={styles.compactPillTop}>
                <span className={styles.compactPillTitle}>
                  <span
                    className={`${styles.statusDot} ${
                      summary.hasErrors
                        ? styles.statusDotError
                        : summary.isReady
                          ? styles.statusDotReady
                          : styles.statusDotPrimary
                    }`}
                    aria-hidden="true"
                  />
                  <span className={styles.compactPillTitleText}>{title}</span>
                </span>
                <span className={styles.compactPillMeta}>
                  <span
                    className={`${styles.fractionPill} ${
                      summary.isReady ? styles.fractionPillReady : ''
                    }`}
                  >
                    {summary.completedRequired}/{summary.totalRequired}
                  </span>
                  <ChevronDown size={13} strokeWidth={2} aria-hidden="true" />
                </span>
              </span>
              <span
                className={`${styles.compactProgressTrack} ${trackToneClass}`}
                aria-hidden="true"
              >
                <span
                  className={`${styles.progressFill} ${barToneClass}`}
                  style={{ transform: `scaleX(${summary.percentage / 100})` }}
                />
              </span>
            </button>
          ) : (
            <div
              className={`${styles.desktopFloatingCard} ${
                isDockedInSidebar ? styles.desktopDockedCard : ''
              }`}
            >
              <div className={styles.desktopHeader}>
                <div className={styles.desktopHeaderTop}>
                  <span className={styles.desktopTitle}>{title}</span>
                  <div className={styles.desktopHeaderRight}>
                    <span
                      className={`${styles.fractionPill} ${
                        summary.hasErrors
                          ? styles.fractionPillError
                          : summary.isReady
                            ? styles.fractionPillReady
                            : ''
                      }`}
                    >
                      {summary.completedRequired}/{summary.totalRequired}
                    </span>
                    <button
                      type="button"
                      className={styles.minimizeBtn}
                      onClick={toggleDesktopMinimized}
                      aria-expanded={true}
                      aria-label={FORM_PROGRESS_TRACKER_TEXTS.minimizeAria}
                      title={FORM_PROGRESS_TRACKER_TEXTS.minimizeAria}
                    >
                      <ChevronUp size={13} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className={styles.progressRow}>
                  <div
                    className={`${styles.progressTrack} ${trackToneClass}`}
                    role="progressbar"
                    aria-valuenow={summary.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={FORM_PROGRESS_TRACKER_TEXTS.progressAriaLabel(
                      title,
                      summary.completedRequired,
                      summary.totalRequired
                    )}
                  >
                    <div
                      className={`${styles.progressFill} ${barToneClass}`}
                      style={{ transform: `scaleX(${summary.percentage / 100})` }}
                    />
                  </div>
                  <span className={styles.percentageLabel}>{summary.percentage}%</span>
                </div>
              </div>

              <div className={styles.desktopBody}>{renderChecklistItems(true)}</div>

              <div className={styles.desktopFooterWrap}>{renderFooter()}</div>
            </div>
          )}
        </aside>,
        portalTarget
      )
    : null;

  return (
    <>
      <div
        ref={mobileBarRef}
        className={`${styles.mobileStickyWrapper} ${mobileClassName}`}
        data-expanded={mobileExpanded ? 'true' : 'false'}
        style={
          {
            '--tracker-sticky-top': `${stickyTopOffset}px`,
          } as React.CSSProperties
        }
      >
        <button
          type="button"
          className={styles.mobileBarTrigger}
          onClick={() => setMobileExpanded((prev) => !prev)}
          aria-expanded={mobileExpanded}
          aria-controls="mobile-form-progress-drawer"
          aria-label={FORM_PROGRESS_TRACKER_TEXTS.toggleDetailsAria(mobileExpanded)}
        >
          <span className={styles.mobileBarRow}>
            <span
              className={`${styles.fractionPill} ${
                summary.hasErrors
                  ? styles.fractionPillError
                  : summary.isReady
                    ? styles.fractionPillReady
                    : ''
              }`}
            >
              {summary.completedRequired}/{summary.totalRequired}
            </span>

            <span className={styles.mobileMiniIndicators} aria-hidden="true">
              {steps.map((step) => (
                <span
                  key={step.id}
                  className={`${styles.miniCheckbox} ${getCheckboxStateClass(step.status)}`}
                >
                  {renderStepIcon(step.status, 9)}
                </span>
              ))}
            </span>

            <span
              className={`${styles.mobileStatusSummary} ${
                summary.hasErrors
                  ? styles.mobileStatusError
                  : summary.isReady
                    ? styles.mobileStatusReady
                    : ''
              }`}
            >
              {compactStatusText}
            </span>

            <span className={styles.mobileChevron} aria-hidden="true">
              {mobileExpanded ? (
                <ChevronUp size={15} strokeWidth={2} />
              ) : (
                <ChevronDown size={15} strokeWidth={2} />
              )}
            </span>
          </span>

          <span
            className={`${styles.mobileProgressTrack} ${trackToneClass}`}
            role="progressbar"
            aria-valuenow={summary.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={FORM_PROGRESS_TRACKER_TEXTS.progressAriaLabel(
              title,
              summary.completedRequired,
              summary.totalRequired
            )}
          >
            <span
              className={`${styles.progressFill} ${barToneClass}`}
              style={{ transform: `scaleX(${summary.percentage / 100})` }}
            />
          </span>
        </button>

        {mobileExpanded && (
          <div
            id="mobile-form-progress-drawer"
            className={styles.mobileDrawerOverlay}
            role="region"
            aria-label={title}
          >
            <div className={styles.mobileDrawerHeader}>
              <span className={styles.mobileDrawerTitle}>{title}</span>
              <span className={styles.percentageLabel}>{summary.percentage}%</span>
            </div>
            {renderNavigationHint(FORM_PROGRESS_TRACKER_TEXTS.mobileNavigationHint)}
            <div className={styles.mobileDrawerBody}>{renderChecklistItems()}</div>
            {renderFooter()}
          </div>
        )}
      </div>

      {desktopFloatingElement}
    </>
  );
};

export default FormProgressTracker;
