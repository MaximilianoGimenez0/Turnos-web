import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ClientLayout, AdminLayout, LoginLayout } from './layouts';
import ClientView from './pages/ClientView/ClientView';
import About from './pages/About/About';
import Prices from './pages/Prices/Prices';
import AdminView from './pages/AdminView/AdminView';
import Login from './pages/Login/Login';
import PaymentSuccess from './pages/PaymentStatus/PaymentSuccess';
import PaymentFailure from './pages/PaymentStatus/PaymentFailure';
import ProtectedRoute from './pages/ProtectedRoute';
import CuteBackground from './components/common/CuteBackground/CuteBackground';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <CuteBackground />
      <BrowserRouter>
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
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
