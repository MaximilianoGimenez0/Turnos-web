import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Loader from '../components/common/Loader/Loader';
import { PROTECTED_ROUTE_TEXTS } from '../texts';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Loader
        fullScreen
        title={PROTECTED_ROUTE_TEXTS.loader.title}
        subtitle={PROTECTED_ROUTE_TEXTS.loader.subtitle}
        icon="shield"
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
