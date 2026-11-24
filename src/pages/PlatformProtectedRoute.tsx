import React, { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { DEFAULT_DEMO_SLUG } from '../config/tenantConstants';
import { buildTenantPath } from '../services/tenantService';
import Loader from '../components/common/Loader/Loader';
import Button from '../components/common/Button/Button';
import { SUPERADMIN_TEXTS } from '../texts/pages/SuperAdmin';
import statusStyles from './TenantStatus/TenantStatus.module.css';

export interface PlatformProtectedRouteProps {
  children?: React.ReactNode;
}

export const PlatformProtectedRoute: React.FC<PlatformProtectedRouteProps> = ({ children }) => {
  const {
    user,
    claims,
    isAuthenticated,
    isPlatformAdmin,
    loading: authLoading,
    refreshClaims,
    logout,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const uid = user?.uid ?? null;
  const hasPlatformAccess = Boolean(isPlatformAdmin || claims.platformAdmin);
  const [refreshedUid, setRefreshedUid] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      !uid ||
      hasPlatformAccess ||
      refreshedUid === uid
    ) {
      return;
    }

    let active = true;
    refreshClaims().finally(() => {
      if (active) {
        setRefreshedUid(uid);
      }
    });

    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, uid, hasPlatformAccess, refreshedUid, refreshClaims]);

  const handleManualRecheck = async () => {
    setRechecking(true);
    try {
      await refreshClaims();
    } finally {
      setRechecking(false);
    }
  };

  const handleSwitchAccount = async () => {
    setSigningOut(true);
    try {
      await logout();
      navigate('/superadmin/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  if (authLoading) {
    return (
      <Loader
        fullScreen
        title={SUPERADMIN_TEXTS.guard.loaderTitle}
        subtitle={SUPERADMIN_TEXTS.guard.loaderSubtitle}
        icon="shield"
      />
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/superadmin/login" state={{ from: location }} replace />;
  }

  if (!hasPlatformAccess) {
    if (uid && refreshedUid !== uid) {
      return (
        <Loader
          fullScreen
          title={SUPERADMIN_TEXTS.guard.loaderTitle}
          subtitle={SUPERADMIN_TEXTS.guard.loaderSubtitle}
          icon="shield"
        />
      );
    }

    return (
      <div className={statusStyles.pageWrapper}>
        <section className={statusStyles.statusCard} aria-labelledby="platform-denied-title">
          <div className={`${statusStyles.iconWrapper} ${statusStyles.iconError}`} aria-hidden="true">
            <ShieldAlert size={26} strokeWidth={1.6} />
          </div>

          <span className={statusStyles.badge}>{SUPERADMIN_TEXTS.guard.deniedBadge}</span>

          <h1 id="platform-denied-title" className={statusStyles.title}>
            {SUPERADMIN_TEXTS.guard.deniedTitle}
          </h1>

          <p className={statusStyles.description}>{SUPERADMIN_TEXTS.guard.deniedDescription}</p>

          {user.email && (
            <div className={statusStyles.metaBox}>
              <span className={statusStyles.metaLabel}>{SUPERADMIN_TEXTS.guard.accountLabel}</span>
              <span className={statusStyles.metaValue}>{user.email}</span>
            </div>
          )}

          <div className={statusStyles.actions}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={rechecking}
              onClick={handleManualRecheck}
              leftIcon={<RefreshCw size={16} strokeWidth={1.6} />}
            >
              {SUPERADMIN_TEXTS.guard.retryClaimsCta}
            </Button>

            <Button
              variant="outline"
              size="lg"
              fullWidth
              isLoading={signingOut}
              onClick={handleSwitchAccount}
              leftIcon={<LogOut size={16} strokeWidth={1.6} />}
            >
              {SUPERADMIN_TEXTS.guard.switchAccountCta}
            </Button>

            <Link to={buildTenantPath(DEFAULT_DEMO_SLUG)} className={statusStyles.actionLink}>
              <Button
                variant="ghost"
                size="lg"
                fullWidth
                rightIcon={<ArrowRight size={16} strokeWidth={1.6} />}
              >
                {SUPERADMIN_TEXTS.guard.backToDemoCta}
              </Button>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default PlatformProtectedRoute;
