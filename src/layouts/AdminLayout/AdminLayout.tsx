import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ExternalLink, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ThemeSwitcher from '../../components/common/ThemeSwitcher/ThemeSwitcher';
import Button from '../../components/common/Button/Button';
import { ADMIN_VIEW_TEXTS } from '../../texts';
import styles from './AdminLayout.module.css';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      <div className={styles.topBarWrapper}>
        <header className={styles.topBar}>
          <div className={styles.brandArea}>
            <div className={styles.statusRow}>
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} aria-hidden="true" />
                {ADMIN_VIEW_TEXTS.header.badgeOnline}
              </span>
              <span className={styles.roleBadge}>{ADMIN_VIEW_TEXTS.header.roleAdmin}</span>
            </div>
            <div className={styles.titleRow}>
              <span className={styles.title}>{ADMIN_VIEW_TEXTS.header.title}</span>
              {user?.email && (
                <span className={styles.userEmailPill}>{user.email}</span>
              )}
            </div>
          </div>

          <div className={styles.controls}>
            <ThemeSwitcher />

            <Link to="/" className={styles.linkReset}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ExternalLink size={16} strokeWidth={1.5} />}
              >
                {ADMIN_VIEW_TEXTS.header.viewWeb}
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOut size={16} strokeWidth={1.5} />}
            >
              {ADMIN_VIEW_TEXTS.header.logout}
            </Button>
          </div>
        </header>
      </div>

      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
