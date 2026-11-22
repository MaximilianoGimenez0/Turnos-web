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

export interface NavbarProps {
  stickyBehavior?: 'transform' | 'static';
}

export const Navbar: React.FC<NavbarProps> = ({ stickyBehavior = 'transform' }) => {
  const location = useLocation();
  const [owner, setOwner] = useState<OwnerInfo>(DEFAULT_OWNER_INFO);
  const [menuOpenForPath, setMenuOpenForPath] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(() =>
    typeof window !== 'undefined' ? window.scrollY > 24 : false
  );
  const menuOpen = menuOpenForPath === location.pathname;
  const shouldTransform = stickyBehavior === 'transform' && isScrolled;

  useEffect(() => {
    const unsubscribe = subscribeToOwnerInfo((data) => {
      setOwner(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (stickyBehavior !== 'transform') {
      return;
    }

    let rafId = 0;
    const updateScrollState = () => {
      rafId = 0;
      const nextScrolled = window.scrollY > 24;
      setIsScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));
    };

    const handleScroll = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(updateScrollState);
    };

    rafId = window.requestAnimationFrame(updateScrollState);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [stickyBehavior, location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpenForPath(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const displayName = owner.businessName || owner.name || NAVBAR_TEXTS.defaultBrandName;

  return (
    <div
      className={styles.navbarWrapper}
      data-scrolled={shouldTransform ? 'true' : 'false'}
    >
      <header className={`${styles.navbar} ${shouldTransform ? styles.navbarScrolled : ''}`}>
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
