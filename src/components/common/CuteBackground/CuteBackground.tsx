import React from 'react';
import styles from './CuteBackground.module.css';

export const CuteBackground: React.FC = () => {
  return <div className={styles.backgroundContainer} aria-hidden="true" />;
};

export default CuteBackground;
