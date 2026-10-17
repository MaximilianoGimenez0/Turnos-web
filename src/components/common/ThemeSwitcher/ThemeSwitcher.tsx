import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { THEME_SWITCHER_TEXTS } from '../../../texts';
import styles from './ThemeSwitcher.module.css';

export const ThemeSwitcher: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={styles.toggleButton}
      title={isDark ? THEME_SWITCHER_TEXTS.buttonTitleLight : THEME_SWITCHER_TEXTS.buttonTitleDark}
      aria-label={THEME_SWITCHER_TEXTS.buttonAriaLabel}
    >
      <div className={styles.iconWrapper}>
        {isDark ? (
          <Moon size={16} className={styles.moonIcon} />
        ) : (
          <Sun size={16} className={styles.sunIcon} />
        )}
      </div>
      <span className={styles.label}>{isDark ? THEME_SWITCHER_TEXTS.labelDark : THEME_SWITCHER_TEXTS.labelLight}</span>
    </button>
  );
};

export default ThemeSwitcher;
