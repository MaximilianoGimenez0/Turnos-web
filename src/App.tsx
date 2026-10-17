import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/common/Navbar/Navbar';
import Footer from './components/common/Footer/Footer';
import ClientView from './pages/ClientView/ClientView';
import About from './pages/About/About';
import Prices from './pages/Prices/Prices';
import AdminView from './pages/AdminView/AdminView';
import Login from './pages/Login/Login';
import PaymentSuccess from './pages/PaymentStatus/PaymentSuccess';
import PaymentFailure from './pages/PaymentStatus/PaymentFailure';
import ProtectedRoute from './pages/ProtectedRoute';
import CuteBackground from './components/common/CuteBackground/CuteBackground';
import './App.css';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <CuteBackground />
      <BrowserRouter>
        <div className="app-layout">
          <Navbar />

          <main className="main-content">
            <Routes>
              {/* Vista Pública / Cliente */}
              <Route path="/" element={<ClientView />} />

              {/* Vista Sobre Mí / About */}
              <Route path="/about" element={<About />} />

              {/* Vista Lista de Precios & Calculadora */}
              <Route path="/prices" element={<Prices />} />

              {/* Vista de Autenticación */}
              <Route path="/login" element={<Login />} />

              {/* Vista de Administración (Ruta Protegida) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminView />
                  </ProtectedRoute>
                }
              />

              {/* Retornos de Mercado Pago Checkout Pro */}
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/failure" element={<PaymentFailure />} />
              <Route path="/payment/pending" element={<PaymentSuccess />} />

              {/* Redirección por defecto */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
