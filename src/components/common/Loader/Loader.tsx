import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarCheck, ShieldCheck, Heart } from 'lucide-react';
import { LOADER_TEXTS } from '../../../texts';
import styles from './Loader.module.css';

export interface LoaderProps {
  fullScreen?: boolean;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: 'calendar' | 'shield' | 'heart';
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
  useEffect(() => {
    if (!fullScreen) return;

    const originalOverflow = document.body.style.overflow;
    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;

    document.body.style.overflow = 'hidden';
    document.body.style.cursor = 'wait';
    document.body.style.userSelect = 'none';

    // Intercepta eventos en fase de captura para anular interacción residual con el fondo
    const blockKeyEvents = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

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
        <div className={styles.orbitalWrapper}>
          <div className={styles.ringOuter} />
          <div className={styles.ringInner} />
          <div className={styles.centerCore}>{renderIcon()}</div>
        </div>

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
