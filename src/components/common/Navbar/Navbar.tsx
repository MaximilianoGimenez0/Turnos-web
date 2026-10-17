import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { CalendarCheck, User, Tag } from 'lucide-react';
import type { OwnerInfo } from '../../../types';
import { subscribeToOwnerInfo, DEFAULT_OWNER_INFO } from '../../../services/ownerService';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import { NAVBAR_TEXTS } from '../../../texts';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [owner, setOwner] = useState<OwnerInfo>(DEFAULT_OWNER_INFO);

  useEffect(() => {
    const unsubscribe = subscribeToOwnerInfo((data) => {
      setOwner(data);
    });
    return () => unsubscribe();
  }, []);

  // La navbar solo se muestra en las rutas públicas: '/', '/about' y '/prices'
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
            <div className={styles.logoIcon}>
              <CalendarCheck size={18} />
            </div>
          )}
          <span className={styles.brandText}>
            {displayName}
          </span>
        </Link>

        <nav className={styles.navLinks} aria-label={NAVBAR_TEXTS.navAriaLabel}>
          <NavLink
            to="/"
            end
            title={NAVBAR_TEXTS.links.slots.title}
            aria-label={NAVBAR_TEXTS.links.slots.ariaLabel}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.activeNavLink : ''}`
            }
          >
            <CalendarCheck size={15} />
            <span>{NAVBAR_TEXTS.links.slots.label}</span>
          </NavLink>

          <NavLink
            to="/about"
            title={NAVBAR_TEXTS.links.about.title}
            aria-label={NAVBAR_TEXTS.links.about.ariaLabel}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.activeNavLink : ''}`
            }
          >
            <User size={15} />
            <span>{NAVBAR_TEXTS.links.about.label}</span>
          </NavLink>

          <NavLink
            to="/prices"
            title={NAVBAR_TEXTS.links.prices.title}
            aria-label={NAVBAR_TEXTS.links.prices.ariaLabel}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.activeNavLink : ''}`
            }
          >
            <Tag size={15} />
            <span>{NAVBAR_TEXTS.links.prices.label}</span>
          </NavLink>
        </nav>

        <div className={styles.rightSection}>
          <ThemeSwitcher />
        </div>
      </header>
    </div>
  );
};

export default Navbar;
