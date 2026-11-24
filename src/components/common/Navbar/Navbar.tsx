import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { CalendarCheck, User, Tag, Menu, X } from 'lucide-react';
import { useOwnerInfo } from '../../../context/OwnerInfoContext';
import { useTenant } from '../../../context/TenantContext';
import { buildTenantPath } from '../../../services/tenantService';
import { applyImageFallback, DEFAULT_OWNER_ASSETS } from '../../../services/ownerDefaults';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import { NAVBAR_TEXTS } from '../../../texts';
import styles from './Navbar.module.css';

export interface NavbarProps {
  stickyBehavior?: 'transform' | 'static';
}

export const Navbar: React.FC<NavbarProps> = ({ stickyBehavior = 'transform' }) => {
  const location = useLocation();
  const { slug } = useTenant();
  const { owner, defaults } = useOwnerInfo();

  const homePath = useMemo(() => buildTenantPath(slug), [slug]);
  const navItems = useMemo(
    () => [
      { to: homePath, end: true, icon: CalendarCheck, text: NAVBAR_TEXTS.links.slots },
      { to: buildTenantPath(slug, '/about'), end: false, icon: User, text: NAVBAR_TEXTS.links.about },
      { to: buildTenantPath(slug, '/prices'), end: false, icon: Tag, text: NAVBAR_TEXTS.links.prices },
    ],
    [homePath, slug]
  );
  const [menuOpenForPath, setMenuOpenForPath] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(() =>
    typeof window !== 'undefined' ? window.scrollY > 24 : false
  );
  const menuOpen = menuOpenForPath === location.pathname;
  const shouldTransform = stickyBehavior === 'transform' && isScrolled;

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
        <Link to={homePath} className={styles.brand} title={displayName} aria-label={displayName}>
          <img
            src={owner.logoUrl || defaults.logoUrl || DEFAULT_OWNER_ASSETS.logoImage}
            alt={displayName}
            className={styles.logoImage}
            decoding="async"
            onError={(e) =>
              applyImageFallback(e, defaults.logoUrl || DEFAULT_OWNER_ASSETS.logoImage)
            }
          />
          <span className={styles.brandText}>{displayName}</span>
        </Link>

        <nav className={styles.navLinks} aria-label={NAVBAR_TEXTS.navAriaLabel}>
          {navItems.map(({ to, end, icon: Icon, text }) => (
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
          {navItems.map(({ to, end, icon: Icon, text }) => (
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
