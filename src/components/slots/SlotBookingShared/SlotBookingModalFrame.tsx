import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Calendar, Clock, X } from 'lucide-react';
import type { SlotSurcharge } from '../../../types';
import { formatCompactDuration } from '../../../services/bookingHelper';
import { normalizeSlotSurcharge } from '../../../utils/surcharge';
import SurchargeBadge from '../../common/SurchargeBadge';
import styles from './SlotBookingModal.module.css';

export interface SlotBookingModalFrameProps {
  titleId: string;
  title: string;
  subtitle: string;
  closeAriaLabel: string;
  isBusy: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  serviceDisplayName: string;
  depositText: string;
  formattedDate: string;
  formattedTime: string;
  hourSuffix: string;
  totalEstimatedMinutes: number;
  baseServicePrice: number;
  basePricePrefix: string;
  contextEstimatedTotal?: number;
  contextEstimatedTotalPrefix?: string;
  surcharge?: SlotSurcharge | null;
  surchargeAmount?: number;
  surchargeContextNote?: string;
  headerExtra?: React.ReactNode;
  formBodyRef?: React.RefObject<HTMLDivElement | null>;
  fixedSize?: boolean;
  compactMobileContext?: boolean;
  noValidate?: boolean;
  children: React.ReactNode;
  footer: React.ReactNode;
  overlays?: React.ReactNode;
}

export const SlotBookingModalFrame: React.FC<SlotBookingModalFrameProps> = ({
  titleId,
  title,
  subtitle,
  closeAriaLabel,
  isBusy,
  onClose,
  onSubmit,
  serviceDisplayName,
  depositText,
  formattedDate,
  formattedTime,
  hourSuffix,
  totalEstimatedMinutes,
  baseServicePrice,
  basePricePrefix,
  contextEstimatedTotal,
  contextEstimatedTotalPrefix,
  surcharge,
  surchargeAmount,
  surchargeContextNote = 'Se suma al total estimado del servicio',
  headerExtra,
  formBodyRef,
  fixedSize = false,
  compactMobileContext = false,
  noValidate = false,
  children,
  footer,
  overlays,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const normalizedSurcharge = normalizeSlotSurcharge(surcharge);
  const resolvedContextPrice =
    typeof contextEstimatedTotal === 'number' ? contextEstimatedTotal : baseServicePrice;
  const resolvedContextPricePrefix =
    typeof contextEstimatedTotal === 'number'
      ? (contextEstimatedTotalPrefix ?? basePricePrefix)
      : basePricePrefix;
  const chipTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: [0.22, 1, 0.36, 1] as const };

  return createPortal(
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div
          className={`${styles.modalContent} ${fixedSize ? styles.modalContentFixed : ''}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className={styles.modalHeader}>
            <div className={styles.headerTop}>
              <div className={styles.headerTitles}>
                <h3 id={titleId} className={styles.title}>
                  {title}
                </h3>
                <p className={styles.subtitle}>{subtitle}</p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                aria-label={closeAriaLabel}
                disabled={isBusy}
              >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <div
              className={`${styles.contextStrip} ${fixedSize ? styles.contextStripFixed : ''} ${
                compactMobileContext ? styles.contextStripCompactMobile : ''
              }`}
            >
              <div className={styles.contextDesktopView}>
                <div className={styles.contextPrimaryRow}>
                  <span
                    className={styles.contextServiceName}
                    title={fixedSize ? serviceDisplayName : undefined}
                  >
                    {serviceDisplayName}
                  </span>
                  <span className={styles.contextDeposit}>{depositText}</span>
                </div>

                <div className={styles.contextMetaRow}>
                  <div className={styles.contextMetaLeft}>
                    <span className={styles.contextMetaItem}>
                      <Calendar size={13} strokeWidth={1.75} aria-hidden="true" />
                      <span className={styles.contextDateText}>{formattedDate}</span>
                    </span>
                    <span className={styles.contextMetaItem}>
                      <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
                      <span className={styles.tabular}>
                        {formattedTime} {hourSuffix}
                      </span>
                      <AnimatePresence initial={false}>
                        {totalEstimatedMinutes > 0 && (
                          <motion.span
                            key="context-duration"
                            className={styles.contextDuration}
                            initial={prefersReducedMotion ? false : { opacity: 0, y: -2 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
                            transition={chipTransition}
                          >
                            · {formatCompactDuration(totalEstimatedMinutes)}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </div>

                  <AnimatePresence initial={false}>
                    {resolvedContextPrice > 0 && (
                      <motion.span
                        key="context-price"
                        className={styles.contextBasePrice}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
                        transition={chipTransition}
                      >
                        {resolvedContextPricePrefix}
                        {resolvedContextPrice.toLocaleString('es-AR')}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {normalizedSurcharge && (
                  <div className={styles.contextSurchargeRow}>
                    <SurchargeBadge
                      surcharge={normalizedSurcharge}
                      resolvedAmount={surchargeAmount}
                      size="sm"
                      showReason
                    />
                    <span className={styles.contextSurchargeNote}>{surchargeContextNote}</span>
                  </div>
                )}
              </div>

              {compactMobileContext && (
                <div className={styles.contextMobileView}>
                  <div className={styles.contextMobileRow}>
                    <span className={styles.contextMobileTotal}>
                      {resolvedContextPrice > 0
                        ? `Total: $${resolvedContextPrice.toLocaleString('es-AR')}`
                        : 'Total: —'}
                    </span>
                    <span className={styles.contextDeposit}>{depositText}</span>
                  </div>

                  <div className={styles.contextMobileRow}>
                    <span className={styles.contextMobileDate}>
                      <Calendar size={12} strokeWidth={1.75} aria-hidden="true" />
                      <span className={styles.contextDateText}>{formattedDate}</span>
                      <span className={styles.tabular}>
                        · {formattedTime} {hourSuffix}
                      </span>
                    </span>
                    <AnimatePresence initial={false}>
                      {totalEstimatedMinutes > 0 && (
                        <motion.span
                          key="mobile-context-duration"
                          className={styles.contextMobileDuration}
                          initial={prefersReducedMotion ? false : { opacity: 0, y: -2 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
                          transition={chipTransition}
                        >
                          <Clock size={12} strokeWidth={1.75} aria-hidden="true" />
                          <span>{formatCompactDuration(totalEstimatedMinutes)}</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {headerExtra && <div className={styles.headerExtra}>{headerExtra}</div>}
          </div>

          <form onSubmit={onSubmit} className={styles.form} noValidate={noValidate}>
            <div ref={formBodyRef} className={styles.formBody}>
              {children}
            </div>
            <div className={styles.footerActions}>{footer}</div>
          </form>
        </div>
      </div>
      {overlays}
    </>,
    document.body
  );
};
