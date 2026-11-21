import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ThemeSwitcher from '../../components/common/ThemeSwitcher/ThemeSwitcher';
import styles from './LoginLayout.module.css';
import Footer from '../../components/common/Footer';

export const LoginLayout: React.FC = () => {
  return (
    <div className={styles.layout}>
      <header className={styles.topBar}>
        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          <span>Volver al sitio</span>
        </Link>
        <ThemeSwitcher />
      </header>

      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default LoginLayout;
