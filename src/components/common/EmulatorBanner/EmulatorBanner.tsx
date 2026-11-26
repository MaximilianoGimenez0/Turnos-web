import React, { useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { IS_USING_FIREBASE_EMULATORS } from '../../../services/firebaseConfig';
import styles from './EmulatorBanner.module.css';

export const EmulatorBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (!import.meta.env.DEV || !IS_USING_FIREBASE_EMULATORS || dismissed) {
    return null;
  }

  return (
    <aside className={styles.banner} role="status" aria-label="Modo emulador local activo">
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>Emulador local</span>
      <a
        href="http://127.0.0.1:4000"
        target="_blank"
        rel="noreferrer"
        className={styles.link}
        title="Abrir Firebase Emulator UI"
      >
        UI
        <ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" />
      </a>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={() => setDismissed(true)}
        aria-label="Ocultar indicador de emulador local"
      >
        <X size={13} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </aside>
  );
};

export default EmulatorBanner;
