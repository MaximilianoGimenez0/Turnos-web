import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Users,
  Wallet,
} from 'lucide-react';
import type { Slot } from '../../../types';
import { formatLocalDate } from '../../../utils/dateUtils';
import { ADMIN_CHART_TEXTS } from '../../../texts';
import styles from './AdminChart.module.css';

export interface AdminChartProps {
  slots: Slot[];
}

export const AdminChart: React.FC<AdminChartProps> = ({ slots }) => {
  const confirmedSlots = useMemo(() => {
    return slots.filter((s) => s.status === 'confirmed' || (s.status === 'past' && s.pastOutcome !== 'cancelled'));
  }, [slots]);

  const cancelledSlots = useMemo(() => {
    return slots.filter((s) => s.status === 'cancelled' || (s.status === 'past' && s.pastOutcome === 'cancelled'));
  }, [slots]);

  const stats = useMemo(() => {
    const totalConfirmed = confirmedSlots.length;
    const totalCancelled = cancelledSlots.length;
    const totalRevenue = confirmedSlots.reduce((acc, curr) => {
      const amount = curr.paidAmount || curr.depositAmount || 0;
      return acc + amount;
    }, 0);

    const avgTicket = totalConfirmed > 0 ? Math.round(totalRevenue / totalConfirmed) : 0;

    const uniqueIdentifiers = new Set<string>();
    confirmedSlots.forEach((s) => {
      const id = s.clientData?.email || s.clientData?.phone || s.clientData?.name;
      if (id) uniqueIdentifiers.add(id.toLowerCase().trim());
    });

    return {
      totalConfirmed,
      totalCancelled,
      totalRevenue,
      avgTicket,
      uniqueClients: uniqueIdentifiers.size,
    };
  }, [confirmedSlots, cancelledSlots]);

  const chartData = useMemo(() => {
    const grouped: Record<string, { dateKey: string; label: string; weekday: string; count: number; revenue: number }> = {};

    confirmedSlots.forEach((slot) => {
      if (!slot.datetime) return;
      const dateObj = new Date(slot.datetime);
      if (isNaN(dateObj.getTime())) return;

      const dateKey = formatLocalDate(dateObj);
      const weekday = dateObj.toLocaleDateString('es-AR', { weekday: 'short' });
      const label = dateObj.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
      });

      if (!grouped[dateKey]) {
        grouped[dateKey] = { dateKey, label, weekday, count: 0, revenue: 0 };
      }
      grouped[dateKey].count += 1;
      grouped[dateKey].revenue += (slot.paidAmount || slot.depositAmount || 0);
    });

    const sortedKeys = Object.keys(grouped).sort();
    return sortedKeys.map((key) => grouped[key]);
  }, [confirmedSlots]);

  const maxRevenue = useMemo(() => {
    if (chartData.length === 0) return 10000;
    const max = Math.max(...chartData.map((d) => d.revenue));
    return max > 0 ? max : 10000;
  }, [chartData]);

  const svgWidth = useMemo(() => {
    const barWidth = 64;
    const padding = 60;
    return Math.max(520, chartData.length * barWidth + padding);
  }, [chartData.length]);

  if (confirmedSlots.length === 0) {
    return (
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div className={styles.chartTitleGroup}>
            <span className={styles.chartTitle}>
              <BarChart3 size={20} color="var(--color-primary)" />
              {ADMIN_CHART_TEXTS.header.mainTitle}
            </span>
            <span className={styles.chartSubtitle}>
              {ADMIN_CHART_TEXTS.header.mainSubtitle}
            </span>
          </div>
        </div>
        <div className={styles.emptyState}>
          {ADMIN_CHART_TEXTS.emptyState}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chartContainer}>
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.kpiIconPrimary}`}>
            <CheckCircle2 size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiTitle}>{ADMIN_CHART_TEXTS.kpis.totalConfirmed}</span>
            <span className={styles.kpiValue}>{stats.totalConfirmed}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.kpiIconSuccess}`}>
            <DollarSign size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiTitle}>{ADMIN_CHART_TEXTS.kpis.collectedDeposits}</span>
            <span className={`${styles.kpiValue} ${styles.kpiHighlight}`}>
              ${stats.totalRevenue.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.kpiIconWarning}`}>
            <Wallet size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiTitle}>{ADMIN_CHART_TEXTS.kpis.averageTicket}</span>
            <span className={styles.kpiValue}>${stats.avgTicket.toLocaleString('es-AR')}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.kpiIconPurple}`}>
            <Users size={22} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiTitle}>{ADMIN_CHART_TEXTS.kpis.uniqueClients}</span>
            <span className={styles.kpiValue}>{stats.uniqueClients}</span>
          </div>
        </div>


      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div className={styles.chartTitleGroup}>
            <span className={styles.chartTitle}>
              <TrendingUp size={20} color="var(--color-primary)" />
              {ADMIN_CHART_TEXTS.header.chartTitle}
            </span>
            <span className={styles.chartSubtitle}>
              {ADMIN_CHART_TEXTS.header.chartSubtitle}
            </span>
          </div>
          <span className={styles.chartBadge}>
            {ADMIN_CHART_TEXTS.badges.recordedDates(chartData.length)}
          </span>
        </div>

        <div className={styles.svgChartWrapper}>
          <svg
            className={styles.svgChart}
            viewBox={`0 0 ${svgWidth} 230`}
            style={{ width: `${svgWidth}px`, minWidth: '100%' }}
          >
            <defs>
              <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.85" />
              </linearGradient>
            </defs>

            <line x1="20" y1="35" x2={svgWidth - 20} y2="35" className={styles.gridLine} />
            <text x={svgWidth - 15} y="32" className={styles.gridLegendText}>
              ${maxRevenue.toLocaleString('es-AR')}
            </text>

            <line x1="20" y1="95" x2={svgWidth - 20} y2="95" className={styles.gridLine} />
            <text x={svgWidth - 15} y="92" className={styles.gridLegendText}>
              ${Math.round(maxRevenue / 2).toLocaleString('es-AR')}
            </text>

            <line x1="20" y1="155" x2={svgWidth - 20} y2="155" className={styles.axisLine} />

            {chartData.map((item, idx) => {
              const totalBars = chartData.length;
              const usableWidth = svgWidth - 80;
              const barWidth = Math.min(48, Math.max(34, (usableWidth / totalBars) * 0.65));
              const step = usableWidth / totalBars;
              const x = 40 + idx * step + (step - barWidth) / 2;

              const heightPercentage = item.revenue / maxRevenue;
              const barHeight = Math.max(heightPercentage * 115, 10);
              const y = 155 - barHeight;

              return (
                <g key={idx} className={styles.barGroup}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="6"
                    className={styles.bar}
                  >
                    <title>{ADMIN_CHART_TEXTS.barTooltip(item.label, item.revenue.toLocaleString('es-AR'), item.count)}</title>
                  </rect>

                  <text
                    x={x + barWidth / 2}
                    y={y - 8}
                    className={styles.barValueText}
                  >
                    ${item.revenue.toLocaleString('es-AR')}
                  </text>

                  <text x={x + barWidth / 2} y="174" className={styles.barLabelText}>
                    {item.label}
                  </text>

                  <text x={x + barWidth / 2} y="188" className={styles.barCountText}>
                    {ADMIN_CHART_TEXTS.badges.slotCount(item.count)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default AdminChart;
