import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, ArrowLeft, ArrowRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../context/TenantContext';
import { buildTenantPath } from '../../services/tenantService';
import type { TenantRole } from '../../types';
import Button from '../../components/common/Button/Button';
import { TENANT_STATUS_TEXTS } from '../../texts';
import styles from './TenantStatus.module.css';

interface AccessibleTenantLink {
  tenantId: string;
  slug: string;
  name: string;
  role: TenantRole;
}

export const UnauthorizedTenantAccess: React.FC = () => {
  const { user, logout } = useAuth();
  const { tenantId, slug, name } = useTenant();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [accessibleTenants, setAccessibleTenants] = useState<AccessibleTenantLink[]>([]);

  const userTenants = user?.tenants;
  const otherTenantEntries = useMemo(() => {
    if (!userTenants) return [];
    return Object.entries(userTenants).filter(([id]) => id !== tenantId);
  }, [userTenants, tenantId]);

  useEffect(() => {
    if (otherTenantEntries.length === 0) {
      return;
    }

    let active = true;
    Promise.all(
      otherTenantEntries.map(async ([otherTenantId, role]): Promise<AccessibleTenantLink | null> => {
        try {
          const snap = await getDoc(doc(db, 'tenants', otherTenantId));
          if (!snap.exists()) return null;
          const data = snap.data() as { slug?: unknown; name?: unknown };
          const resolvedSlug = typeof data.slug === 'string' ? data.slug.trim() : '';
          if (!resolvedSlug) return null;
          const resolvedName =
            typeof data.name === 'string' && data.name.trim() ? data.name.trim() : resolvedSlug;
          return {
            tenantId: otherTenantId,
            slug: resolvedSlug,
            name: resolvedName,
            role,
          };
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (!active) return;
      setAccessibleTenants(
        results.filter((item): item is AccessibleTenantLink => item !== null)
      );
    });

    return () => {
      active = false;
    };
  }, [otherTenantEntries]);

  const displayedTenants = otherTenantEntries.length > 0 ? accessibleTenants : [];

  const handleSwitchAccount = async () => {
    setSigningOut(true);
    try {
      await logout();
      navigate(buildTenantPath(slug, '/login'), { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <section className={styles.statusCard} aria-labelledby="unauthorized-tenant-title">
        <div className={`${styles.iconWrapper} ${styles.iconError}`} aria-hidden="true">
          <ShieldAlert size={26} strokeWidth={1.6} />
        </div>

        <span className={styles.badge}>{TENANT_STATUS_TEXTS.unauthorized.badge}</span>

        <h1 id="unauthorized-tenant-title" className={styles.title}>
          {TENANT_STATUS_TEXTS.unauthorized.title}
        </h1>

        <p className={styles.description}>
          {TENANT_STATUS_TEXTS.unauthorized.description(name, slug)}
        </p>

        {user?.email && (
          <div className={styles.metaBox}>
            <span className={styles.metaLabel}>{TENANT_STATUS_TEXTS.unauthorized.accountLabel}</span>
            <span className={styles.metaValue}>{user.email}</span>
          </div>
        )}

        {displayedTenants.length > 0 && (
          <div className={styles.tenantLinksSection}>
            <p className={styles.tenantLinksTitle}>
              {TENANT_STATUS_TEXTS.unauthorized.otherTenantsTitle}
            </p>
            <div className={styles.tenantLinksList}>
              {displayedTenants.map((item) => (
                <Link
                  key={item.tenantId}
                  to={buildTenantPath(item.slug, '/admin')}
                  className={styles.tenantLinkCard}
                >
                  <div className={styles.tenantLinkInfo}>
                    <span className={styles.tenantLinkName}>{item.name}</span>
                    <span className={styles.tenantLinkSlug}>/{item.slug}/admin</span>
                  </div>
                  <div className={styles.tenantLinkRight}>
                    <span className={styles.tenantRoleBadge}>
                      {TENANT_STATUS_TEXTS.unauthorized.roleLabels[item.role]}
                    </span>
                    <ArrowRight size={15} strokeWidth={1.75} aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            isLoading={signingOut}
            onClick={handleSwitchAccount}
            leftIcon={<LogOut size={16} strokeWidth={1.6} />}
          >
            {TENANT_STATUS_TEXTS.unauthorized.switchAccountCta}
          </Button>

          <Link to={buildTenantPath(slug)} className={styles.actionLink}>
            <Button
              variant="outline"
              size="lg"
              fullWidth
              leftIcon={<ArrowLeft size={16} strokeWidth={1.6} />}
            >
              {TENANT_STATUS_TEXTS.unauthorized.backToPublicCta}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default UnauthorizedTenantAccess;
