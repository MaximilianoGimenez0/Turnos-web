import React from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, X } from 'lucide-react';
import { formatEstimatedDuration } from '../../../services/bookingHelper';
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
  children,
  footer,
  overlays,
}) => {
  return createPortal(
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div
          className={styles.modalContent}
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

            <div className={styles.contextStrip}>
              <div className={styles.contextPrimaryRow}>
                <span className={styles.contextServiceName}>{serviceDisplayName}</span>
                <span className={styles.contextDeposit}>{depositText}</span>
              </div>

              <div className={styles.contextMetaRow}>
                <span className={styles.contextMetaItem}>
                  <Calendar size={13} strokeWidth={1.75} aria-hidden="true" />
                  <span className={styles.contextDateText}>{formattedDate}</span>
                </span>
                <span className={styles.contextMetaItem}>
                  <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
                  <span className={styles.tabular}>
                    {formattedTime} {hourSuffix}
                  </span>
                </span>
                {totalEstimatedMinutes > 0 && (
                  <span className={styles.contextDuration}>
                    · {formatEstimatedDuration(totalEstimatedMinutes)}
                  </span>
                )}
                {baseServicePrice > 0 && (
                  <span className={styles.contextBasePrice}>
                    {basePricePrefix}
                    {baseServicePrice.toLocaleString('es-AR')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className={styles.form}>
            <div className={styles.formBody}>{children}</div>
            <div className={styles.footerActions}>{footer}</div>
          </form>
        </div>
      </div>
      {overlays}
    </>,
    document.body
  );
};
