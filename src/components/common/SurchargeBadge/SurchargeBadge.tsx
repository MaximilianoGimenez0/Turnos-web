import React from 'react';
import { Percent, Tag } from 'lucide-react';
import type { SlotSurcharge } from '../../../types';
import {
  formatSurchargeDetail,
  formatSurchargeLabel,
  normalizeSlotSurcharge,
} from '../../../utils/surcharge';
import styles from './SurchargeBadge.module.css';

export interface SurchargeBadgeProps {
  surcharge: SlotSurcharge | null | undefined;
  /** Monto resuelto en ARS (útil cuando type === 'percentage' y ya se conoce el subtotal). */
  resolvedAmount?: number;
  size?: 'xs' | 'sm' | 'md';
  showReason?: boolean;
  className?: string;
}

export const SurchargeBadge: React.FC<SurchargeBadgeProps> = ({
  surcharge,
  resolvedAmount,
  size = 'sm',
  showReason = false,
  className = '',
}) => {
  const normalized = normalizeSlotSurcharge(surcharge);
  if (!normalized) return null;

  const label = formatSurchargeLabel(normalized, { size, showReason, resolvedAmount });
  const detail = formatSurchargeDetail(normalized, resolvedAmount);
  const iconSize = size === 'xs' ? 11 : size === 'md' ? 13 : 12;
  const Icon = normalized.type === 'percentage' ? Percent : Tag;

  return (
    <span
      className={`${styles.badge} ${styles[`size_${size}`]} ${className}`.trim()}
      title={detail}
      aria-label={detail}
    >
      <Icon size={iconSize} strokeWidth={1.85} className={styles.icon} aria-hidden="true" />
      <span className={styles.text}>{label}</span>
    </span>
  );
};

export default SurchargeBadge;
