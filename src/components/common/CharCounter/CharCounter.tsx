import React from 'react';
import styles from './CharCounter.module.css';

export interface CharCounterProps {
  current: number;
  max: number;
  className?: string;
}

export const CharCounter: React.FC<CharCounterProps> = ({
  current,
  max,
  className = '',
}) => {
  if (!Number.isFinite(max) || max <= 0) return null;

  const safeCurrent = Math.max(0, current);
  const ratio = safeCurrent / max;
  const isAtLimit = safeCurrent >= max;
  const isNearLimit = !isAtLimit && ratio >= 0.85;

  const stateClass = isAtLimit
    ? styles.atLimit
    : isNearLimit
      ? styles.nearLimit
      : '';

  return (
    <span
      className={`${styles.counter} ${stateClass} ${className}`.trim()}
      aria-live={isNearLimit || isAtLimit ? 'polite' : 'off'}
      aria-label={`${safeCurrent} de ${max} caracteres`}
    >
      {safeCurrent}/{max}
    </span>
  );
};

export default CharCounter;
