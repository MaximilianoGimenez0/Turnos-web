import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { OwnerInfoProvider } from './context/OwnerInfoContext';
import { ServicesProvider } from './context/ServicesContext';
import { PortfolioProvider } from './context/PortfolioContext';
import { ClientLayout, AdminLayout, LoginLayout } from './layouts';
import ClientView from './pages/ClientView/ClientView';
import ProtectedRoute from './pages/ProtectedRoute';
import CuteBackground from './components/common/CuteBackground/CuteBackground';
import Loader from './components/common/Loader/Loader';

const About = lazy(() => import('./pages/About/About'));
const Prices = lazy(() => import('./pages/Prices/Prices'));
const AdminView = lazy(() => import('./pages/AdminView/AdminView'));
const Login = lazy(() => import('./pages/Login/Login'));
const PaymentSuccess = lazy(() => import('./pages/PaymentStatus/PaymentSuccess'));
const PaymentFailure = lazy(() => import('./pages/PaymentStatus/PaymentFailure'));

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OwnerInfoProvider>
          <ServicesProvider>
            <PortfolioProvider>
              <CuteBackground />
              <BrowserRouter>
                <Suspense fallback={<Loader fullScreen />}>
                  <Routes>
                    <Route element={<ClientLayout />}>
                      <Route path="/" element={<ClientView />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/prices" element={<Prices />} />
                    </Route>

                    <Route element={<ClientLayout showNavbar={false} />}>
                      <Route path="/payment/success" element={<PaymentSuccess />} />
                      <Route path="/payment/failure" element={<PaymentFailure />} />
                      <Route path="/payment/pending" element={<PaymentSuccess />} />
                    </Route>

                    <Route element={<LoginLayout />}>
                      <Route path="/login" element={<Login />} />
                    </Route>

                    <Route element={<ProtectedRoute />}>
                      <Route element={<AdminLayout />}>
                        <Route path="/admin" element={<AdminView />} />
                      </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </PortfolioProvider>
          </ServicesProvider>
        </OwnerInfoProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
