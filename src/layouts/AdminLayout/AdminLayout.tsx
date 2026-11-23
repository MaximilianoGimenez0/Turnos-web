import React, { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Calendar, ExternalLink, LogOut, Menu, UserCheck, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ThemeSwitcher from '../../components/common/ThemeSwitcher/ThemeSwitcher';
import Button from '../../components/common/Button/Button';
import { ADMIN_VIEW_TEXTS } from '../../texts';
import styles from './AdminLayout.module.css';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  return (
    <div className={styles.layout}>
      <div className={styles.topBarWrapper}>
        <header
          className={styles.topBar}
          data-admin-sticky-top="topbar"
          aria-label={ADMIN_VIEW_TEXTS.header.title}
        >
          <div className={styles.brandArea}>
            <div className={styles.brandIcon} aria-hidden="true">
              <Calendar size={16} strokeWidth={1.75} />
            </div>
            <span className={styles.title}>{ADMIN_VIEW_TEXTS.header.title}</span>
          </div>

          <div className={styles.controls}>
            {user?.email && (
              <span className={styles.userEmailPill} title={user.email}>
                <UserCheck size={14} strokeWidth={1.75} className={styles.userEmailIcon} aria-hidden="true" />
                <span className={styles.userEmailText}>{user.email}</span>
              </span>
            )}

            <div className={styles.desktopActions}>
              <ThemeSwitcher />

              <Link to="/" className={styles.linkReset}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<ExternalLink size={15} strokeWidth={1.75} />}
                >
                  {ADMIN_VIEW_TEXTS.header.viewWeb}
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut size={15} strokeWidth={1.75} />}
              >
                {ADMIN_VIEW_TEXTS.header.logout}
              </Button>
            </div>

            <div className={styles.mobileActions}>
              <ThemeSwitcher className={styles.mobileThemeButton} />

              <button
                type="button"
                className={styles.menuButton}
                aria-expanded={menuOpen}
                aria-controls="admin-mobile-menu"
                aria-label={menuOpen ? 'Cerrar menú de administración' : 'Abrir menú de administración'}
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                {menuOpen ? (
                  <X size={16} strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <Menu size={16} strokeWidth={1.75} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </header>

        {menuOpen && (
          <div id="admin-mobile-menu" className={styles.mobileMenu}>
            {user?.email && (
              <div className={styles.mobileUserRow}>
                <span className={styles.mobileUserLabel}>{ADMIN_VIEW_TEXTS.header.sessionPrefix}</span>
                <span className={styles.mobileUserEmail}>
                  <UserCheck size={13} strokeWidth={1.75} aria-hidden="true" />
                  <span>{user.email}</span>
                </span>
              </div>
            )}
            <div className={styles.mobileMenuActions}>
              <Link to="/" className={styles.linkReset} onClick={() => setMenuOpen(false)}>
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  leftIcon={<ExternalLink size={15} strokeWidth={1.75} />}
                >
                  {ADMIN_VIEW_TEXTS.header.viewWeb}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={handleLogout}
                leftIcon={<LogOut size={15} strokeWidth={1.75} />}
              >
                {ADMIN_VIEW_TEXTS.header.logout}
              </Button>
            </div>
          </div>
        )}
      </div>

      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <div id="admin-floating-layer" />
    </div>
  );
};

export default AdminLayout;
