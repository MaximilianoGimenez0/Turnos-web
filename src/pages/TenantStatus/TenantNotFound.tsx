import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowRight, Info, RefreshCw, Shield } from 'lucide-react';
import { DEFAULT_DEMO_SLUG } from '../../config/tenantConstants';
import { buildTenantPath, normalizePublicSlugParam } from '../../services/tenantService';
import Button from '../../components/common/Button/Button';
import { TENANT_STATUS_TEXTS } from '../../texts';
import styles from './TenantStatus.module.css';

export interface TenantNotFoundProps {
  slug?: string;
  onRetry?: () => void;
}

export const TenantNotFound: React.FC<TenantNotFoundProps> = ({ slug, onRetry }) => {
  const isDemoSlug = normalizePublicSlugParam(slug) === DEFAULT_DEMO_SLUG;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <section className={styles.statusCard} aria-labelledby="tenant-not-found-title">
        <div className={`${styles.iconWrapper} ${styles.iconNotFound}`} aria-hidden="true">
          <Compass size={26} strokeWidth={1.6} />
        </div>

        <span className={styles.badge}>{TENANT_STATUS_TEXTS.notFound.badge}</span>

        <h1 id="tenant-not-found-title" className={styles.title}>
          {TENANT_STATUS_TEXTS.notFound.title}
        </h1>

        <p className={styles.description}>{TENANT_STATUS_TEXTS.notFound.description}</p>

        {slug && (
          <div className={styles.metaBox}>
            <span className={styles.metaLabel}>{TENANT_STATUS_TEXTS.notFound.slugLabel}</span>
            <span className={styles.metaValue}>/{slug}</span>
          </div>
        )}

        <div className={styles.noticeBox}>
          <Info size={16} strokeWidth={1.6} className={styles.noticeIcon} aria-hidden="true" />
          <span>
            {isDemoSlug ? TENANT_STATUS_TEXTS.notFound.demoHint : TENANT_STATUS_TEXTS.notFound.hint}
          </span>
        </div>

        <div className={styles.actions}>
          {isDemoSlug ? (
            <>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleRetry}
                leftIcon={<RefreshCw size={16} strokeWidth={1.6} />}
              >
                {TENANT_STATUS_TEXTS.notFound.retryCta}
              </Button>
              <Link to="/superadmin/login" className={styles.actionLink}>
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  leftIcon={<Shield size={16} strokeWidth={1.6} />}
                >
                  {TENANT_STATUS_TEXTS.notFound.superAdminCta}
                </Button>
              </Link>
            </>
          ) : (
            <Link to={buildTenantPath(DEFAULT_DEMO_SLUG)} className={styles.actionLink}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                rightIcon={<ArrowRight size={16} strokeWidth={1.6} />}
              >
                {TENANT_STATUS_TEXTS.notFound.demoCta}
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default TenantNotFound;
