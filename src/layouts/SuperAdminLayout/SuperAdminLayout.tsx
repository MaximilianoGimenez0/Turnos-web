import React, { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ExternalLink, LogOut, Menu, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_DEMO_SLUG } from '../../config/tenantConstants';
import { buildTenantPath } from '../../services/tenantService';
import ThemeSwitcher from '../../components/common/ThemeSwitcher/ThemeSwitcher';
import Button from '../../components/common/Button/Button';
import { SUPERADMIN_TEXTS } from '../../texts/pages/SuperAdmin';
import styles from './SuperAdminLayout.module.css';

export const SuperAdminLayout: React.FC = () => {
  const { user, logout, refreshClaims } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshingClaims, setRefreshingClaims] = useState(false);

  const demoPath = buildTenantPath(DEFAULT_DEMO_SLUG);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/superadmin/login', { replace: true });
  };

  const handleRefreshClaims = async () => {
    setRefreshingClaims(true);
    try {
      await refreshClaims();
    } finally {
      setRefreshingClaims(false);
    }
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
        <header className={styles.topBar} aria-label={SUPERADMIN_TEXTS.layout.platformBadge}>
          <div className={styles.brandArea}>
            <div className={styles.brandIcon} aria-hidden="true">
              <ShieldCheck size={17} strokeWidth={1.8} />
            </div>
            <div className={styles.brandTextGroup}>
              <span className={styles.title}>{SUPERADMIN_TEXTS.layout.brandTitle}</span>
              <span className={styles.platformBadge}>{SUPERADMIN_TEXTS.layout.platformBadge}</span>
            </div>
          </div>

          <div className={styles.controls}>
            {user?.email && (
              <span className={styles.sessionPill} title={user.email}>
                <ShieldCheck size={14} strokeWidth={1.75} className={styles.sessionIcon} aria-hidden="true" />
                <span className={styles.sessionText}>{user.email}</span>
              </span>
            )}

            <div className={styles.desktopActions}>
              <ThemeSwitcher />

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshClaims}
                isLoading={refreshingClaims}
                leftIcon={<RefreshCw size={14} strokeWidth={1.75} />}
                title={SUPERADMIN_TEXTS.layout.refreshClaims}
              >
                {SUPERADMIN_TEXTS.layout.refreshClaims}
              </Button>

              <Link to={demoPath} className={styles.linkReset}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<ExternalLink size={14} strokeWidth={1.75} />}
                >
                  {SUPERADMIN_TEXTS.layout.viewDemo}
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut size={14} strokeWidth={1.75} />}
              >
                {SUPERADMIN_TEXTS.layout.logout}
              </Button>
            </div>

            <div className={styles.mobileActions}>
              <ThemeSwitcher className={styles.mobileThemeButton} />
              <button
                type="button"
                className={styles.menuButton}
                aria-expanded={menuOpen}
                aria-controls="superadmin-mobile-menu"
                aria-label={
                  menuOpen
                    ? SUPERADMIN_TEXTS.layout.closeMenuAria
                    : SUPERADMIN_TEXTS.layout.openMenuAria
                }
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
          <div id="superadmin-mobile-menu" className={styles.mobileMenu}>
            {user?.email && (
              <div className={styles.mobileUserRow}>
                <span className={styles.mobileUserLabel}>
                  {SUPERADMIN_TEXTS.layout.sessionPrefix}
                </span>
                <span className={styles.mobileUserEmail}>
                  <ShieldCheck size={13} strokeWidth={1.75} aria-hidden="true" />
                  <span>{user.email}</span>
                </span>
              </div>
            )}
            <div className={styles.mobileMenuActions}>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                isLoading={refreshingClaims}
                onClick={handleRefreshClaims}
                leftIcon={<RefreshCw size={14} strokeWidth={1.75} />}
              >
                {SUPERADMIN_TEXTS.layout.refreshClaims}
              </Button>

              <Link to={demoPath} className={styles.linkReset} onClick={() => setMenuOpen(false)}>
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  leftIcon={<ExternalLink size={14} strokeWidth={1.75} />}
                >
                  {SUPERADMIN_TEXTS.layout.viewDemo}
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={handleLogout}
                leftIcon={<LogOut size={14} strokeWidth={1.75} />}
              >
                {SUPERADMIN_TEXTS.layout.logout}
              </Button>
            </div>
          </div>
        )}
      </div>

      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
};

export default SuperAdminLayout;
