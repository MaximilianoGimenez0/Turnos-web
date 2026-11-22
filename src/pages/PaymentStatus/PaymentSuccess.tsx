import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Mail,
  Calendar,
  Loader2,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import { verifySlotPayment, type VerifyPaymentResult } from '../../services/db';
import { useOwnerInfo } from '../../context/OwnerInfoContext';
import Button from '../../components/common/Button/Button';
import Loader from '../../components/common/Loader/Loader';
import { PAYMENT_SUCCESS_TEXTS } from '../../texts';
import styles from './PaymentStatus.module.css';

type ResolvedViewState = 'verifying' | 'confirmed' | 'pending' | 'conflict' | 'rejected' | 'error';

const mapVerificationToViewState = (
  result: VerifyPaymentResult | null,
  isPendingRoute: boolean
): ResolvedViewState => {
  if (!result) return isPendingRoute ? 'pending' : 'error';

  if (result.success && result.status === 'confirmed') {
    return 'confirmed';
  }
  if (result.status === 'double_payment_incident' || result.status === 'late_payment_conflict') {
    return 'conflict';
  }
  if (
    result.status === 'pending' ||
    result.status === 'in_process' ||
    result.status === 'authorized'
  ) {
    return 'pending';
  }
  if (
    result.status === 'rejected' ||
    result.status === 'cancelled' ||
    result.status === 'insufficient_amount' ||
    result.status === 'invalid_currency'
  ) {
    return 'rejected';
  }
  return isPendingRoute ? 'pending' : 'error';
};

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { owner } = useOwnerInfo();

  const isPendingRoute = location.pathname.includes('/payment/pending');
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
  const urlPaymentStatus = searchParams.get('status') || searchParams.get('collection_status') || '';
  const preferenceId = searchParams.get('preference_id');
  const slotId = searchParams.get('external_reference') || undefined;

  const [viewState, setViewState] = useState<ResolvedViewState>(() => {
    if (paymentId) return 'verifying';
    if (isPendingRoute || urlPaymentStatus === 'pending' || urlPaymentStatus === 'in_process') {
      return 'pending';
    }
    return 'error';
  });
  const [verificationResult, setVerificationResult] = useState<VerifyPaymentResult | null>(null);

  const runVerification = useCallback(async () => {
    if (!paymentId) return;
    setViewState('verifying');
    try {
      const result = await verifySlotPayment(paymentId, slotId);
      setVerificationResult(result);
      setViewState(mapVerificationToViewState(result, isPendingRoute));
    } catch (err) {
      console.warn(PAYMENT_SUCCESS_TEXTS.logs.verificationError, err);
      setVerificationResult(null);
      setViewState('error');
    }
  }, [paymentId, slotId, isPendingRoute]);

  useEffect(() => {
    if (!paymentId) return;
    let active = true;

    const execute = async () => {
      try {
        const result = await verifySlotPayment(paymentId, slotId);
        if (!active) return;
        setVerificationResult(result);
        setViewState(mapVerificationToViewState(result, isPendingRoute));
      } catch (err) {
        console.warn(PAYMENT_SUCCESS_TEXTS.logs.verificationError, err);
        if (!active) return;
        setVerificationResult(null);
        setViewState('error');
      }
    };

    void execute();
    return () => {
      active = false;
    };
  }, [paymentId, slotId, isPendingRoute]);

  const cleanWaDigits = (owner.phone || '').replace(/\D/g, '');
  const whatsappUrl =
    cleanWaDigits.length >= 8
      ? `https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(
          `Hola! Tuve un inconveniente con la confirmación de mi reserva (Comprobante MP #${paymentId || 'sin-id'}).`
        )}`
      : null;

  const booking = verificationResult?.bookingDetails;

  const renderHeaderIcon = () => {
    if (viewState === 'confirmed') {
      return (
        <div className={styles.iconWrapperSuccess} aria-hidden="true">
          <CheckCircle2 size={24} strokeWidth={1.5} />
        </div>
      );
    }
    if (viewState === 'pending' || viewState === 'error' || viewState === 'verifying') {
      return (
        <div className={styles.iconWrapperWarning} aria-hidden="true">
          <Clock size={24} strokeWidth={1.5} />
        </div>
      );
    }
    if (viewState === 'conflict') {
      return (
        <div className={styles.iconWrapperFailure} aria-hidden="true">
          <AlertTriangle size={24} strokeWidth={1.5} />
        </div>
      );
    }
    return (
      <div className={styles.iconWrapperFailure} aria-hidden="true">
        <XCircle size={24} strokeWidth={1.5} />
      </div>
    );
  };

  const title =
    viewState === 'confirmed'
      ? PAYMENT_SUCCESS_TEXTS.title
      : viewState === 'pending'
      ? PAYMENT_SUCCESS_TEXTS.pending.title
      : viewState === 'conflict'
      ? PAYMENT_SUCCESS_TEXTS.conflict.title
      : viewState === 'rejected'
      ? PAYMENT_SUCCESS_TEXTS.rejected.title
      : viewState === 'verifying'
      ? PAYMENT_SUCCESS_TEXTS.loader.title
      : PAYMENT_SUCCESS_TEXTS.error.title;

  const description =
    viewState === 'confirmed'
      ? PAYMENT_SUCCESS_TEXTS.description
      : viewState === 'pending'
      ? PAYMENT_SUCCESS_TEXTS.pending.description
      : viewState === 'conflict'
      ? PAYMENT_SUCCESS_TEXTS.conflict.description
      : viewState === 'rejected'
      ? PAYMENT_SUCCESS_TEXTS.rejected.description
      : viewState === 'verifying'
      ? PAYMENT_SUCCESS_TEXTS.loader.subtitle
      : PAYMENT_SUCCESS_TEXTS.error.description;

  const statusText =
    viewState === 'confirmed'
      ? PAYMENT_SUCCESS_TEXTS.details.approvedStatus
      : viewState === 'pending'
      ? PAYMENT_SUCCESS_TEXTS.pending.statusLabel
      : viewState === 'conflict'
      ? PAYMENT_SUCCESS_TEXTS.conflict.statusLabel
      : viewState === 'rejected'
      ? PAYMENT_SUCCESS_TEXTS.rejected.statusLabel
      : PAYMENT_SUCCESS_TEXTS.error.statusLabel;

  const statusClass =
    viewState === 'confirmed'
      ? styles.successValue
      : viewState === 'pending' || viewState === 'error' || viewState === 'verifying'
      ? styles.warningValue
      : styles.failureValue;

  return (
    <div className={styles.container}>
      <div className={styles.statusCard}>
        {renderHeaderIcon()}

        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>

        <div className={styles.detailsBox}>
          {paymentId && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{PAYMENT_SUCCESS_TEXTS.details.receiptLabel}</span>
              <span className={styles.detailValue}>
                {PAYMENT_SUCCESS_TEXTS.details.receiptPrefix}
                {paymentId}
              </span>
            </div>
          )}

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{PAYMENT_SUCCESS_TEXTS.details.statusLabel}</span>
            <span className={`${styles.detailValue} ${statusClass}`}>{statusText}</span>
          </div>

          {viewState === 'confirmed' && booking?.formattedDate && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{PAYMENT_SUCCESS_TEXTS.details.dateLabel}</span>
              <span className={styles.detailValue}>{booking.formattedDate}</span>
            </div>
          )}

          {viewState === 'confirmed' && booking?.formattedTime && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{PAYMENT_SUCCESS_TEXTS.details.timeLabel}</span>
              <span className={styles.detailValue}>{booking.formattedTime} hs</span>
            </div>
          )}

          {viewState === 'confirmed' && booking?.serviceName && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{PAYMENT_SUCCESS_TEXTS.details.serviceLabel}</span>
              <span className={styles.detailValue}>{booking.serviceName}</span>
            </div>
          )}

          {viewState === 'confirmed' && typeof booking?.depositAmount === 'number' && booking.depositAmount > 0 && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{PAYMENT_SUCCESS_TEXTS.details.depositLabel}</span>
              <span className={`${styles.detailValue} ${styles.successValue}`}>
                ${booking.depositAmount.toLocaleString('es-AR')}
              </span>
            </div>
          )}

          {preferenceId && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{PAYMENT_SUCCESS_TEXTS.details.preferenceLabel}</span>
              <span className={`${styles.detailValue} ${styles.preferenceIdValue}`}>
                {preferenceId.slice(0, 15)}...
              </span>
            </div>
          )}
        </div>

        <div className={styles.infoNotice}>
          {viewState === 'verifying' ? (
            <>
              <Loader2
                size={16}
                strokeWidth={1.5}
                className="animate-spin"
                color="var(--color-primary)"
                aria-hidden="true"
              />
              <span>{PAYMENT_SUCCESS_TEXTS.notice.verifying}</span>
            </>
          ) : viewState === 'confirmed' ? (
            <>
              <Mail size={16} strokeWidth={1.5} color="var(--color-primary)" aria-hidden="true" />
              <span>
                {booking?.maskedClientEmail && booking.maskedClientEmail !== '[none]'
                  ? PAYMENT_SUCCESS_TEXTS.notice.verifiedWithEmail(booking.maskedClientEmail)
                  : PAYMENT_SUCCESS_TEXTS.notice.verified}
              </span>
            </>
          ) : viewState === 'pending' ? (
            <>
              <Clock size={16} strokeWidth={1.5} color="var(--color-warning)" aria-hidden="true" />
              <span>{PAYMENT_SUCCESS_TEXTS.pending.notice}</span>
            </>
          ) : viewState === 'conflict' ? (
            <>
              <AlertTriangle size={16} strokeWidth={1.5} color="var(--color-danger)" aria-hidden="true" />
              <span>{PAYMENT_SUCCESS_TEXTS.conflict.notice}</span>
            </>
          ) : viewState === 'rejected' ? (
            <>
              <XCircle size={16} strokeWidth={1.5} color="var(--color-danger)" aria-hidden="true" />
              <span>{PAYMENT_SUCCESS_TEXTS.rejected.notice}</span>
            </>
          ) : (
            <>
              <Clock size={16} strokeWidth={1.5} color="var(--color-warning)" aria-hidden="true" />
              <span>{PAYMENT_SUCCESS_TEXTS.error.notice}</span>
            </>
          )}
        </div>

        <div className={`${styles.actions} ${styles.actionsStacked}`}>
          {viewState === 'error' && paymentId && (
            <Button
              variant="secondary"
              fullWidth
              onClick={runVerification}
              leftIcon={<RefreshCw size={16} strokeWidth={1.5} />}
            >
              {PAYMENT_SUCCESS_TEXTS.error.retryButton}
            </Button>
          )}

          {viewState === 'conflict' && whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.actionLink}
            >
              <Button
                variant="primary"
                fullWidth
                leftIcon={<MessageCircle size={16} strokeWidth={1.5} />}
              >
                {PAYMENT_SUCCESS_TEXTS.conflict.whatsappButton}
              </Button>
            </a>
          )}

          <Link to="/" className={styles.actionLink}>
            <Button
              variant={viewState === 'conflict' && whatsappUrl ? 'outline' : 'primary'}
              fullWidth
              leftIcon={<Calendar size={16} strokeWidth={1.5} />}
            >
              {PAYMENT_SUCCESS_TEXTS.actions.backToHome}
            </Button>
          </Link>
        </div>
      </div>

      {viewState === 'verifying' && (
        <Loader
          fullScreen
          title={PAYMENT_SUCCESS_TEXTS.loader.title}
          subtitle={PAYMENT_SUCCESS_TEXTS.loader.subtitle}
          icon="shield"
        />
      )}
    </div>
  );
};

export default PaymentSuccess;
