import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ThemeSwitcher from '../../components/common/ThemeSwitcher/ThemeSwitcher';
import { DEFAULT_DEMO_SLUG } from '../../config/tenantConstants';
import { useOptionalTenant } from '../../context/TenantContext';
import { buildTenantPath } from '../../services/tenantService';
import styles from './LoginLayout.module.css';
import Footer from '../../components/common/Footer';

export const LoginLayout: React.FC = () => {
  const tenant = useOptionalTenant();
  const homePath = buildTenantPath(tenant?.slug || DEFAULT_DEMO_SLUG);

  return (
    <div className={styles.layout}>
      <header className={styles.topBar}>
        <Link to={homePath} className={styles.backLink}>
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
