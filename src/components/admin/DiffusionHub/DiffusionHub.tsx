import React from 'react';
import { CalendarDays, QrCode } from 'lucide-react';
import type { Slot } from '../../../types';
import { BusinessCardGenerator } from '../BusinessCardGenerator/BusinessCardGenerator';
import { InstagramScheduleGenerator } from '../InstagramScheduleGenerator/InstagramScheduleGenerator';
import styles from './DiffusionHub.module.css';

export type DiffusionSubTab = 'instagram' | 'card';

interface DiffusionHubProps {
  activeTab: DiffusionSubTab;
  onTabChange: (tab: DiffusionSubTab) => void;
  slots: Slot[];
  onPeriodExplore?: (rangeEndDateKey: string) => void;
  isSyncingFullRange?: boolean;
}

export const DiffusionHub: React.FC<DiffusionHubProps> = ({
  activeTab,
  onTabChange,
  slots,
  onPeriodExplore,
  isSyncingFullRange = false,
}) => (
  <div className={styles.hub}>
    <div className={styles.tabBar} role="tablist" aria-label="Herramientas de difusión">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'instagram'}
        className={`${styles.tabBtn} ${activeTab === 'instagram' ? styles.tabBtnActive : ''}`}
        onClick={() => onTabChange('instagram')}
      >
        <CalendarDays size={15} aria-hidden="true" />
        <span>Placa de turnos (Instagram)</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'card'}
        className={`${styles.tabBtn} ${activeTab === 'card' ? styles.tabBtnActive : ''}`}
        onClick={() => onTabChange('card')}
      >
        <QrCode size={15} aria-hidden="true" />
        <span>Tarjeta y código QR</span>
      </button>
    </div>

    {activeTab === 'instagram' ? (
      <InstagramScheduleGenerator
        slots={slots}
        onPeriodExplore={onPeriodExplore}
        isSyncingFullRange={isSyncingFullRange}
      />
    ) : (
      <BusinessCardGenerator />
    )}
  </div>
);
