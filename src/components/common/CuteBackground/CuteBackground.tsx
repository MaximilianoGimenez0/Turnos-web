import React from 'react';
import styles from './CuteBackground.module.css';

export const CuteBackground: React.FC = () => {
  return (
    <div className={styles.backgroundContainer} aria-hidden="true">
      {/* Elemento 1: Burbuja 1 (Rosa / Taupe empolvado) */}
      <div className={`${styles.bubble} ${styles.bubble1}`}>
        <div className={styles.bubbleGlint} />
      </div>

      {/* Elemento 2: Burbuja 2 (Lila / Pizarra desaturado) */}
      <div className={`${styles.bubble} ${styles.bubble2}`}>
        <div className={styles.bubbleGlint} />
      </div>

      {/* Elemento 3: Estrella única kawaii (Champagne tenue) */}
      <div className={styles.starWrapper}>
        <svg viewBox="0 0 24 24" fill="currentColor" className={styles.starSvg}>
          <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
        </svg>
      </div>

      {/* Filtro general de blur encima de todo */}
      <div className={styles.blurOverlay} />
    </div>
  );
};

export default CuteBackground;
