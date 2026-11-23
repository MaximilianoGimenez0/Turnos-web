import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { THEME_SWITCHER_TEXTS } from '../../../texts';
import styles from './ThemeSwitcher.module.css';

export interface ThemeSwitcherProps {
  className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`${styles.toggleButton} ${className}`.trim()}
      title={isDark ? THEME_SWITCHER_TEXTS.buttonTitleLight : THEME_SWITCHER_TEXTS.buttonTitleDark}
      aria-label={THEME_SWITCHER_TEXTS.buttonAriaLabel}
    >
      <div className={styles.iconWrapper} aria-hidden="true">
        {isDark ? (
          <Moon size={16} strokeWidth={1.5} className={styles.moonIcon} />
        ) : (
          <Sun size={16} strokeWidth={1.5} className={styles.sunIcon} />
        )}
      </div>
      <span className={styles.label}>{isDark ? THEME_SWITCHER_TEXTS.labelDark : THEME_SWITCHER_TEXTS.labelLight}</span>
    </button>
  );
};

export default ThemeSwitcher;
