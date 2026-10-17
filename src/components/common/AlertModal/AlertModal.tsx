import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
} from 'lucide-react';
import styles from './AlertModal.module.css';
import { ALERT_MODAL_TEXTS } from '../../../texts';

export type AlertModalType = 'restriction' | 'warning' | 'error' | 'info' | 'success';

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: React.ReactNode;
  type?: AlertModalType;
  details?: string[];
  confirmText?: string;
  onConfirm?: () => void;
  secondaryText?: string;
  onSecondary?: () => void;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}

const DEFAULT_TITLES: Record<AlertModalType, string> = {
  restriction: ALERT_MODAL_TEXTS.defaultTitles.restriction,
  warning: ALERT_MODAL_TEXTS.defaultTitles.warning,
  error: ALERT_MODAL_TEXTS.defaultTitles.error,
  info: ALERT_MODAL_TEXTS.defaultTitles.info,
  success: ALERT_MODAL_TEXTS.defaultTitles.success,
};

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'restriction',
  details,
  confirmText = ALERT_MODAL_TEXTS.defaultConfirmText,
  onConfirm,
  secondaryText,
  onSecondary,
  showCloseButton = true,
  closeOnBackdropClick = false,
  closeOnEscape = false,
}) => {
  // Manejo de tecla Escape (solo si está explícitamente habilitado)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      if (closeOnEscape) {
        window.addEventListener('keydown', handleKeyDown);
      }
      return () => {
        document.body.style.overflow = originalOverflow;
        if (closeOnEscape) {
          window.removeEventListener('keydown', handleKeyDown);
        }
      };
    }
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleSecondary = () => {
    if (onSecondary) {
      onSecondary();
    } else {
      onClose();
    }
  };

  const renderIcon = () => {
    switch (type) {
      case 'restriction':
        return <ShieldAlert size={30} className={styles.icon} />;
      case 'warning':
        return <AlertTriangle size={30} className={styles.icon} />;
      case 'error':
        return <AlertCircle size={30} className={styles.icon} />;
      case 'success':
        return <CheckCircle2 size={30} className={styles.icon} />;
      case 'info':
      default:
        return <Info size={30} className={styles.icon} />;
    }
  };

  const modalTitle = title || DEFAULT_TITLES[type];

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(e) => {
        e.stopPropagation();
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
      aria-describedby="alert-modal-message"
    >
      <div
        className={`${styles.modal} ${styles[type]}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={ALERT_MODAL_TEXTS.closeAriaLabel}
          >
            <X size={18} />
          </button>
        )}

        <div className={styles.header}>
          <div className={`${styles.iconContainer} ${styles[`icon_${type}`]}`}>
            {renderIcon()}
          </div>
          <h3 id="alert-modal-title" className={styles.title}>
            {modalTitle}
          </h3>
        </div>

        <div className={styles.body}>
          {typeof message === 'string' ? (
            <p id="alert-modal-message" className={styles.message}>
              {message}
            </p>
          ) : (
            <div id="alert-modal-message" className={styles.messageNode}>
              {message}
            </div>
          )}

          {details && details.length > 0 && (
            <ul className={styles.detailsList}>
              {details.map((detail, idx) => (
                <li key={idx} className={styles.detailItem}>
                  <span className={styles.bulletDot} />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.footer}>
          {secondaryText && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleSecondary}
            >
              {secondaryText}
            </button>
          )}
          <button
            type="button"
            className={`${styles.confirmButton} ${styles[`btn_${type}`]}`}
            onClick={handleConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AlertModal;
