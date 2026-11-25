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
}

const SIZE_CLASS_MAP: Record<NonNullable<LoaderProps['size']>, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

export const Loader: React.FC<LoaderProps> = ({
  fullScreen = false,
  title = LOADER_TEXTS.defaultTitle,
  subtitle,
  size = 'md',
  icon = 'calendar',
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
    const iconSize = size === 'sm' ? 16 : 18;
    switch (icon) {
      case 'shield':
        return <ShieldCheck size={iconSize} strokeWidth={1.5} aria-hidden="true" />;
      case 'heart':
        return <Heart size={iconSize} strokeWidth={1.5} aria-hidden="true" />;
      case 'calendar':
      default:
        return <CalendarCheck size={iconSize} strokeWidth={1.5} aria-hidden="true" />;
    }
  };

  const stopPropagation = fullScreen
    ? (e: React.SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();
      }
    : undefined;

  const loaderContent = (
    <div
      className={`${fullScreen ? styles.fullScreenOverlay : styles.inlineContainer} ${SIZE_CLASS_MAP[size]}`}
      role={fullScreen ? 'alertdialog' : 'status'}
      aria-modal={fullScreen ? 'true' : undefined}
      aria-live={fullScreen ? 'assertive' : 'polite'}
      aria-busy="true"
      aria-label={title}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
    >
      <div className={fullScreen ? styles.modalSurface : styles.inlineBody}>
        <div className={styles.dialWrapper} aria-hidden="true">
          <svg className={styles.dialTrackSvg} viewBox="0 0 48 48" fill="none">
            <circle className={styles.dialTrack} cx="24" cy="24" r="21" />
            <line className={styles.dialTick} x1="24" y1="5.5" x2="24" y2="8" />
            <line className={styles.dialTick} x1="40" y1="24" x2="42.5" y2="24" />
            <line className={styles.dialTick} x1="24" y1="40" x2="24" y2="42.5" />
            <line className={styles.dialTick} x1="5.5" y1="24" x2="8" y2="24" />
          </svg>
          <svg className={styles.dialArcSvg} viewBox="0 0 48 48" fill="none">
            <circle className={styles.dialArc} cx="24" cy="24" r="21" />
          </svg>
          <div className={styles.dialMark}>{renderIcon()}</div>
        </div>

        <div className={styles.textGroup}>
          <p className={styles.title}>{title}</p>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
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
