import React from 'react';
import { Link } from 'react-router-dom';
import { PauseCircle, Calendar, Info } from 'lucide-react';
import { DEFAULT_DEMO_SLUG } from '../../config/tenantConstants';
import { buildTenantPath, normalizePublicSlugParam } from '../../services/tenantService';
import Button from '../../components/common/Button/Button';
import { TENANT_STATUS_TEXTS } from '../../texts';
import styles from './TenantStatus.module.css';

export interface TenantSuspendedProps {
  businessName?: string;
  logoUrl?: string;
  slug?: string;
}

export const TenantSuspended: React.FC<TenantSuspendedProps> = ({
  businessName,
  logoUrl,
  slug,
}) => {
  const cleanName = businessName?.trim();
  const cleanLogoUrl = logoUrl?.trim();
  const isDemoSlug = normalizePublicSlugParam(slug) === DEFAULT_DEMO_SLUG;

  return (
    <div className={styles.pageWrapper}>
      <section className={styles.statusCard} aria-labelledby="tenant-suspended-title">
        {(cleanLogoUrl || cleanName) && (
          <div className={styles.brandHeader}>
            {cleanLogoUrl && (
              <img src={cleanLogoUrl} alt={cleanName || ''} className={styles.brandLogo} />
            )}
            {cleanName && <span className={styles.brandName}>{cleanName}</span>}
          </div>
        )}

        <div className={`${styles.iconWrapper} ${styles.iconSuspended}`} aria-hidden="true">
          <PauseCircle size={26} strokeWidth={1.6} />
        </div>

        <span className={styles.badge}>{TENANT_STATUS_TEXTS.suspended.badge}</span>

        <h1 id="tenant-suspended-title" className={styles.title}>
          {TENANT_STATUS_TEXTS.suspended.title}
        </h1>

        <p className={styles.description}>
          {cleanName
            ? TENANT_STATUS_TEXTS.suspended.descriptionWithBusiness(cleanName)
            : TENANT_STATUS_TEXTS.suspended.descriptionGeneric}
        </p>

        <div className={styles.noticeBox}>
          <Info size={16} strokeWidth={1.6} className={styles.noticeIcon} aria-hidden="true" />
          <span>{TENANT_STATUS_TEXTS.suspended.notice}</span>
        </div>

        {!isDemoSlug && (
          <div className={styles.actions}>
            <Link to={buildTenantPath(DEFAULT_DEMO_SLUG)} className={styles.actionLink}>
              <Button
                variant="outline"
                size="lg"
                fullWidth
                leftIcon={<Calendar size={16} strokeWidth={1.6} />}
              >
                {TENANT_STATUS_TEXTS.suspended.demoCta}
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};

export default TenantSuspended;
