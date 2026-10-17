import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, RefreshCw, HelpCircle } from 'lucide-react';
import Button from '../../components/common/Button/Button';
import { PAYMENT_FAILURE_TEXTS } from '../../texts';
import styles from './PaymentStatus.module.css';

export const PaymentFailure: React.FC = () => {
  const [searchParams] = useSearchParams();
  const paymentStatus = searchParams.get('status') || searchParams.get('collection_status') || 'rejected';

  return (
    <div className={styles.container}>
      <div className={styles.statusCard}>
        <div className={styles.iconWrapperFailure}>
          <XCircle size={40} />
        </div>

        <h1 className={styles.title}>{PAYMENT_FAILURE_TEXTS.title}</h1>

        <p className={styles.description}>
          {PAYMENT_FAILURE_TEXTS.description}
        </p>

        <div className={styles.detailsBox}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{PAYMENT_FAILURE_TEXTS.details.statusLabel}</span>
            <span className={`${styles.detailValue} ${styles.failureValue}`}>
              {paymentStatus === 'rejected'
                ? PAYMENT_FAILURE_TEXTS.details.rejectedStatus
                : paymentStatus === 'null' || !paymentStatus
                ? PAYMENT_FAILURE_TEXTS.details.cancelledByUserStatus
                : paymentStatus}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{PAYMENT_FAILURE_TEXTS.details.commonReasonLabel}</span>
            <span className={styles.detailValue}>{PAYMENT_FAILURE_TEXTS.details.commonReasonText}</span>
          </div>
        </div>

        <div className={styles.infoNotice}>
          <HelpCircle size={16} color="var(--color-primary)" />
          <span>{PAYMENT_FAILURE_TEXTS.notice}</span>
        </div>

        <div className={styles.actions}>
          <Link to="/" className={styles.actionLink}>
            <Button variant="primary" fullWidth leftIcon={<RefreshCw size={18} />}>
              {PAYMENT_FAILURE_TEXTS.actions.retry}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;
