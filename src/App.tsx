import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { OwnerInfoProvider } from './context/OwnerInfoContext';
import { ServicesProvider } from './context/ServicesContext';
import { PortfolioProvider } from './context/PortfolioContext';
import { ClientLayout, AdminLayout, LoginLayout } from './layouts';
import ClientView from './pages/ClientView/ClientView';
import ProtectedTenantRoute from './pages/ProtectedRoute';
import TenantNotFound from './pages/TenantStatus/TenantNotFound';
import CuteBackground from './components/common/CuteBackground/CuteBackground';
import EmulatorBanner from './components/common/EmulatorBanner/EmulatorBanner';
import TenantThemeApplier from './components/common/TenantThemeApplier/TenantThemeApplier';
import Loader from './components/common/Loader/Loader';

const About = lazy(() => import('./pages/About/About'));
const Prices = lazy(() => import('./pages/Prices/Prices'));
const LandingView = lazy(() => import('./pages/Landing/LandingView'));
const HelpView = lazy(() => import('./pages/Help/HelpView'));
const AdminView = lazy(() => import('./pages/AdminView/AdminView'));
const Login = lazy(() => import('./pages/Login/Login'));
const PaymentSuccess = lazy(() => import('./pages/PaymentStatus/PaymentSuccess'));
const PaymentFailure = lazy(() => import('./pages/PaymentStatus/PaymentFailure'));
const PlatformProtectedRoute = lazy(() => import('./pages/PlatformProtectedRoute'));
const SuperAdminLayout = lazy(() => import('./layouts/SuperAdminLayout/SuperAdminLayout'));
const SuperAdminLogin = lazy(() => import('./pages/SuperAdminLogin/SuperAdminLogin'));
const SuperAdminView = lazy(() => import('./pages/SuperAdminView/SuperAdminView'));

const TenantDataProviders: React.FC = () => {
  const { tenantId } = useTenant();

  return (
    <OwnerInfoProvider key={`owner-${tenantId}`}>
      <TenantThemeApplier />
      <ServicesProvider key={`services-${tenantId}`}>
        <PortfolioProvider key={`portfolio-${tenantId}`}>
          <Outlet />
        </PortfolioProvider>
      </ServicesProvider>
    </OwnerInfoProvider>
  );
};

const TenantShell: React.FC = () => {
  return (
    <TenantProvider>
      <TenantDataProviders />
    </TenantProvider>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CuteBackground />
        <EmulatorBanner />
        <BrowserRouter>
          <Suspense fallback={<Loader fullScreen />}>
            <Routes>
              <Route path="/" element={<LandingView />} />
              <Route path="/ayuda" element={<HelpView />} />
              <Route path="/help" element={<Navigate to="/ayuda" replace />} />

              <Route path="/superadmin/login" element={<SuperAdminLogin />} />
              <Route path="/superadmin" element={<PlatformProtectedRoute />}>
                <Route element={<SuperAdminLayout />}>
                  <Route index element={<SuperAdminView />} />
                  <Route path="*" element={<Navigate to="/superadmin" replace />} />
                </Route>
              </Route>

              <Route path="/:tenantSlug" element={<TenantShell />}>
                <Route element={<ClientLayout />}>
                  <Route index element={<ClientView />} />
                  <Route path="about" element={<About />} />
                  <Route path="prices" element={<Prices />} />
                </Route>

                <Route element={<ClientLayout showNavbar={false} />}>
                  <Route path="payment/success" element={<PaymentSuccess />} />
                  <Route path="payment/failure" element={<PaymentFailure />} />
                  <Route path="payment/pending" element={<PaymentSuccess />} />
                </Route>

                <Route element={<LoginLayout />}>
                  <Route path="login" element={<Login />} />
                </Route>

                <Route element={<ProtectedTenantRoute />}>
                  <Route element={<AdminLayout />}>
                    <Route path="admin" element={<AdminView />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="." replace />} />
              </Route>

              <Route path="*" element={<TenantNotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;