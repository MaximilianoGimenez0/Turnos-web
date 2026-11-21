import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Calendar, CalendarCheck, User, Tag, Menu, X } from 'lucide-react';
import type { OwnerInfo } from '../../../types';
import { subscribeToOwnerInfo, DEFAULT_OWNER_INFO } from '../../../services/ownerService';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import { NAVBAR_TEXTS } from '../../../texts';
import styles from './Navbar.module.css';

const NAV_ITEMS = [
  { to: '/', end: true, icon: CalendarCheck, text: NAVBAR_TEXTS.links.slots },
  { to: '/about', end: false, icon: User, text: NAVBAR_TEXTS.links.about },
  { to: '/prices', end: false, icon: Tag, text: NAVBAR_TEXTS.links.prices },
] as const;

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [owner, setOwner] = useState<OwnerInfo>(DEFAULT_OWNER_INFO);
  const [menuOpenForPath, setMenuOpenForPath] = useState<string | null>(null);
  const menuOpen = menuOpenForPath === location.pathname;

  useEffect(() => {
    const unsubscribe = subscribeToOwnerInfo((data) => {
      setOwner(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpenForPath(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  if (location.pathname !== '/' && location.pathname !== '/about' && location.pathname !== '/prices') {
    return null;
  }

  const displayName = owner.businessName || owner.name || NAVBAR_TEXTS.defaultBrandName;

  return (
    <div className={styles.navbarWrapper}>
      <header className={styles.navbar}>
        <Link to="/" className={styles.brand} title={displayName} aria-label={displayName}>
          {owner.logoUrl ? (
            <img
              src={owner.logoUrl}
              alt={displayName}
              className={styles.logoImage}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className={styles.logoIcon} aria-hidden="true">
              <Calendar size={16} strokeWidth={1.5} />
            </div>
          )}
          <span className={styles.brandText}>{displayName}</span>
        </Link>

        <nav className={styles.navLinks} aria-label={NAVBAR_TEXTS.navAriaLabel}>
          {NAV_ITEMS.map(({ to, end, icon: Icon, text }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={text.title}
              aria-label={text.ariaLabel}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.activeNavLink : ''}`
              }
            >
              <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>{text.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.rightSection}>
          <ThemeSwitcher />
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            aria-label={
              menuOpen ? NAVBAR_TEXTS.menuToggle.closeLabel : NAVBAR_TEXTS.menuToggle.openLabel
            }
            onClick={() =>
              setMenuOpenForPath((prev) => (prev === location.pathname ? null : location.pathname))
            }
          >
            {menuOpen ? (
              <X size={16} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Menu size={16} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {menuOpen && (
        <nav
          id="mobile-nav-menu"
          className={styles.mobileMenu}
          aria-label={NAVBAR_TEXTS.navAriaLabel}
        >
          {NAV_ITEMS.map(({ to, end, icon: Icon, text }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={text.title}
              aria-label={text.ariaLabel}
              onClick={() => setMenuOpenForPath(null)}
              className={({ isActive }) =>
                `${styles.mobileNavLink} ${isActive ? styles.activeMobileNavLink : ''}`
              }
            >
              <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>{text.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
};

export default Navbar;
