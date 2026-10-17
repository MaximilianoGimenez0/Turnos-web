import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Mail, Calendar, Loader2 } from 'lucide-react';
import { verifySlotPayment } from '../../services/db';
import Button from '../../components/common/Button/Button';
import Loader from '../../components/common/Loader/Loader';
import { PAYMENT_SUCCESS_TEXTS } from '../../texts';
import styles from './PaymentStatus.module.css';

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const hasVerifiedRef = useRef(false);

  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
  const paymentStatus = searchParams.get('status') || searchParams.get('collection_status') || 'approved';
  const preferenceId = searchParams.get('preference_id');
  const slotId = searchParams.get('external_reference') || undefined;

  useEffect(() => {
    if (!paymentId || hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;

    const runVerification = async () => {
      setIsVerifying(true);
      try {
        // La verificación en Cloud Functions procesa el pago y despacha los correos con Resend
        await verifySlotPayment(paymentId, slotId);
      } catch (err) {
        console.warn(PAYMENT_SUCCESS_TEXTS.logs.verificationError, err);
      } finally {
        setIsVerifying(false);
      }
    };

    runVerification();
  }, [paymentId, slotId]);

  return (
    <div className={styles.container}>
      <div className={styles.statusCard}>
        <div className={styles.iconWrapperSuccess}>
          <CheckCircle2 size={40} />
        </div>

        <h1 className={styles.title}>{PAYMENT_SUCCESS_TEXTS.title}</h1>

        <p className={styles.description}>
          {PAYMENT_SUCCESS_TEXTS.description}
        </p>

        <div className={styles.detailsBox}>
          {paymentId && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{PAYMENT_SUCCESS_TEXTS.details.receiptLabel}</span>
              <span className={styles.detailValue}>{PAYMENT_SUCCESS_TEXTS.details.receiptPrefix}{paymentId}</span>
            </div>
          )}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{PAYMENT_SUCCESS_TEXTS.details.statusLabel}</span>
            <span className={`${styles.detailValue} ${styles.successValue}`}>
              {paymentStatus === 'approved' ? PAYMENT_SUCCESS_TEXTS.details.approvedStatus : paymentStatus}
            </span>
          </div>
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
          {isVerifying ? (
            <>
              <Loader2 size={16} className="animate-spin" color="var(--color-primary)" />
              <span>{PAYMENT_SUCCESS_TEXTS.notice.verifying}</span>
            </>
          ) : (
            <>
              <Mail size={16} color="var(--color-primary)" />
              <span>{PAYMENT_SUCCESS_TEXTS.notice.verified}</span>
            </>
          )}
        </div>

        <div className={styles.actions}>
          <Link to="/" className={styles.actionLink}>
            <Button variant="primary" fullWidth leftIcon={<Calendar size={18} />}>
              {PAYMENT_SUCCESS_TEXTS.actions.backToHome}
            </Button>
          </Link>
        </div>
      </div>

      {isVerifying && (
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
