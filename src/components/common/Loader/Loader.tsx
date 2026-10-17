import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarCheck, ShieldCheck, Heart } from 'lucide-react';
import { LOADER_TEXTS } from '../../../texts';
import styles from './Loader.module.css';

export interface LoaderProps {
  /**
   * If true, renders a full-viewport blocking overlay via React Portal
   * that prevents any interaction with the rest of the application.
   */
  fullScreen?: boolean;
  /**
   * Primary title text (e.g. "Procesando Reserva...")
   */
  title?: string;
  /**
   * Secondary supporting text (e.g. "Por favor no cierres esta ventana")
   */
  subtitle?: string;
  /**
   * Visual size: 'sm', 'md', or 'lg' (default: 'md')
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Center icon theme: 'calendar' | 'shield' | 'heart'
   */
  icon?: 'calendar' | 'shield' | 'heart';
  /**
   * Whether to display animated bouncing progress dots
   */
  showDots?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({
  fullScreen = false,
  title = LOADER_TEXTS.defaultTitle,
  subtitle,
  size = 'md',
  icon = 'calendar',
  showDots = true,
}) => {
  // Bloqueo total de interfaz, navegación, clics y teclado en modo fullScreen
  useEffect(() => {
    if (!fullScreen) return;

    // 1. Bloquear scroll del documento y cambiar cursor a wait
    const originalOverflow = document.body.style.overflow;
    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;

    document.body.style.overflow = 'hidden';
    document.body.style.cursor = 'wait';
    document.body.style.userSelect = 'none';

    // 2. Interceptar y anular absolutamente todos los eventos de teclado (Escape, Tab, Enter, etc.) en fase de captura
    const blockKeyEvents = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // 3. Interceptar y anular cualquier clic, menú contextual o interacción táctil residual
    const blockPointerEvents = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    window.addEventListener('keydown', blockKeyEvents, { capture: true });
    window.addEventListener('keyup', blockKeyEvents, { capture: true });
    window.addEventListener('keypress', blockKeyEvents, { capture: true });
    window.addEventListener('click', blockPointerEvents, { capture: true });
    window.addEventListener('mousedown', blockPointerEvents, { capture: true });
    window.addEventListener('mouseup', blockPointerEvents, { capture: true });
    window.addEventListener('touchstart', blockPointerEvents, { capture: true, passive: false });
    window.addEventListener('contextmenu', blockPointerEvents, { capture: true });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;

      window.removeEventListener('keydown', blockKeyEvents, { capture: true });
      window.removeEventListener('keyup', blockKeyEvents, { capture: true });
      window.removeEventListener('keypress', blockKeyEvents, { capture: true });
      window.removeEventListener('click', blockPointerEvents, { capture: true });
      window.removeEventListener('mousedown', blockPointerEvents, { capture: true });
      window.removeEventListener('mouseup', blockPointerEvents, { capture: true });
      window.removeEventListener('touchstart', blockPointerEvents, { capture: true });
      window.removeEventListener('contextmenu', blockPointerEvents, { capture: true });
    };
  }, [fullScreen]);

  const renderIcon = () => {
    const iconSize = size === 'sm' ? 18 : size === 'lg' ? 32 : 24;
    switch (icon) {
      case 'shield':
        return <ShieldCheck size={iconSize} />;
      case 'heart':
        return <Heart size={iconSize} />;
      case 'calendar':
      default:
        return <CalendarCheck size={iconSize} />;
    }
  };

  const loaderContent = (
    <div
      className={`${fullScreen ? styles.fullScreenOverlay : styles.inlineContainer} ${
        styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`]
      }`}
      role="alertdialog"
      aria-modal={fullScreen ? 'true' : undefined}
      aria-live="assertive"
      aria-label={title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className={styles.loaderCard}>
        {/* Glowing Double Orbital Rings */}
        <div className={styles.orbitalWrapper}>
          <div className={styles.ringOuter} />
          <div className={styles.ringInner} />
          <div className={styles.centerCore}>{renderIcon()}</div>
        </div>

        {/* Informative Text */}
        <div className={styles.textGroup}>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

          {showDots && (
            <div className={styles.dotsRow} aria-hidden="true">
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (fullScreen && typeof document !== 'undefined') {
    return createPortal(loaderContent, document.body);
  }

  return loaderContent;
};

export default Loader;
