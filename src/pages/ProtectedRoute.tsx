import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTenant } from '../context/TenantContext';
import { hasTenantAccess } from '../services/auth';
import { buildTenantPath } from '../services/tenantService';
import Loader from '../components/common/Loader/Loader';
import UnauthorizedTenantAccess from './TenantStatus/UnauthorizedTenantAccess';
import { PROTECTED_ROUTE_TEXTS } from '../texts';

export interface ProtectedTenantRouteProps {
  children?: React.ReactNode;
}

export const ProtectedTenantRoute: React.FC<ProtectedTenantRouteProps> = ({ children }) => {
  const { user, isAuthenticated, loading: authLoading, refreshClaims } = useAuth();
  const { tenantId, slug } = useTenant();
  const location = useLocation();

  const accessKey = user ? `${user.uid}:${tenantId}` : null;
  const allowed = hasTenantAccess(user, tenantId);
  const [refreshedKey, setRefreshedKey] = useState<string | null>(null);

  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      !accessKey ||
      allowed ||
      refreshedKey === accessKey
    ) {
      return;
    }

    let active = true;
    refreshClaims().finally(() => {
      if (active) {
        setRefreshedKey(accessKey);
      }
    });

    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, accessKey, allowed, refreshedKey, refreshClaims]);

  if (authLoading) {
    return (
      <Loader
        fullScreen
        title={PROTECTED_ROUTE_TEXTS.loader.title}
        subtitle={PROTECTED_ROUTE_TEXTS.loader.subtitle}
        icon="shield"
      />
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={buildTenantPath(slug, '/login')}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!allowed) {
    if (accessKey && refreshedKey !== accessKey) {
      return (
        <Loader
          fullScreen
          title={PROTECTED_ROUTE_TEXTS.loader.title}
          subtitle={PROTECTED_ROUTE_TEXTS.loader.subtitle}
          icon="shield"
        />
      );
    }

    return <UnauthorizedTenantAccess />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const ProtectedRoute = ProtectedTenantRoute;
export default ProtectedTenantRoute;
