import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  RotateCcw,
} from 'lucide-react';
import type { Slot } from '../../../types';
import { useOptionalTenant } from '../../../context/TenantContext';
import { useIsCompactViewport } from '../../../pages/Landing/motion/useIsCompactViewport';
import {
  BUSINESS_TIMEZONE,
  formatDateKeyParts,
} from '../../../utils/dateUtils';
import {
  buildAnalyticsCsv,
  computeAnalyticsDashboard,
  createDefaultAnalyticsFilters,
  extractAvailableAnalyticsServices,
  type AnalyticsChannelFilter,
  type AnalyticsFilters,
  type AnalyticsPeriodPreset,
} from '../../../services/analyticsService';
import { ADMIN_CHART_TEXTS } from '../../../texts';
import styles from './AdminChart.module.css';

export interface AdminChartProps {
  slots: Slot[];
}

type ChartMetricMode = 'total' | 'deposits' | 'count';

const PERIOD_PRESETS: readonly AnalyticsPeriodPreset[] = [
  '7d',
  '30d',
  'current_month',
  '3m',
  'all',
  'custom',
];

const CHANNEL_OPTIONS: readonly AnalyticsChannelFilter[] = ['all', 'online', 'manual'];

const formatMoney = (value: number): string => `$${Math.round(value).toLocaleString('es-AR')}`;

export const AdminChart: React.FC<AdminChartProps> = ({ slots }) => {
  const tenant = useOptionalTenant();
  const timezone = tenant?.timezone || BUSINESS_TIMEZONE;
  const isMobile = useIsCompactViewport(640);

  const [filters, setFilters] = useState<AnalyticsFilters>(() =>
    createDefaultAnalyticsFilters(timezone)
  );
  const [chartMetric, setChartMetric] = useState<ChartMetricMode>('total');
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);

  const availableServices = useMemo(
    () => extractAvailableAnalyticsServices(slots),
    [slots]
  );

  const dashboard = useMemo(
    () => computeAnalyticsDashboard(slots, filters, { timeZone: timezone }),
    [slots, filters, timezone]
  );

  const hasCustomFilters =
    filters.period !== 'current_month' ||
    filters.channel !== 'all' ||
    filters.serviceName !== 'all';

  const handleResetFilters = () => {
    setFilters(createDefaultAnalyticsFilters(timezone));
    setActiveBarIndex(null);
  };

  const handlePeriodChange = (period: AnalyticsPeriodPreset) => {
    setFilters((prev) => ({ ...prev, period }));
    setActiveBarIndex(null);
  };

  const handleExportCsv = () => {
    if (dashboard.exportRows.length === 0) return;
    const csv = buildAnalyticsCsv(dashboard.exportRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const suffix = dashboard.activeRange
      ? `${dashboard.activeRange.startDateKey}_a_${dashboard.activeRange.endDateKey}`
      : 'historial';
    anchor.href = url;
    anchor.download = `turneado-metricas-${suffix}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const activeRangeBadgeLabel = useMemo(() => {
    if (!dashboard.activeRange) {
      return ADMIN_CHART_TEXTS.filters.allTimeBadge;
    }
    const start = formatDateKeyParts(dashboard.activeRange.startDateKey).dayMonthShort;
    const end = formatDateKeyParts(dashboard.activeRange.endDateKey).dayMonthShort;
    return ADMIN_CHART_TEXTS.filters.activeRangeBadge(start, end);
  }, [dashboard.activeRange]);

  const series = dashboard.timeSeries;
  const maxChartValue = useMemo(() => {
    if (series.length === 0) return chartMetric === 'count' ? 5 : 10000;
    const values = series.map((item) =>
      chartMetric === 'total'
        ? item.estimatedRevenue
        : chartMetric === 'deposits'
        ? item.onlineDeposits
        : item.count
    );
    const maxVal = Math.max(...values, 0);
    if (maxVal === 0) return chartMetric === 'count' ? 5 : 10000;
    return maxVal;
  }, [series, chartMetric]);

  const averageLineValue =
    chartMetric === 'total'
      ? dashboard.averages.estimatedRevenue
      : chartMetric === 'deposits'
      ? dashboard.averages.onlineDeposits
      : dashboard.averages.count;

  const svgWidth = useMemo(() => {
    if (isMobile) {
      return Math.max(312, series.length * 46 + 32);
    }
    return Math.max(560, series.length * 60 + 72);
  }, [series.length, isMobile]);

  const svgHeight = isMobile ? 190 : 214;
  const plotLeft = isMobile ? 8 : 28;
  const plotRight = svgWidth - (isMobile ? 8 : 24);
  const plotTop = isMobile ? 20 : 26;
  const plotBottom = isMobile ? 148 : 166;
  const plotHeight = plotBottom - plotTop;

  const avgY =
    maxChartValue > 0 && averageLineValue > 0
      ? plotBottom - Math.min(1, averageLineValue / maxChartValue) * plotHeight
      : null;

  const safeActiveIndex =
    activeBarIndex !== null && activeBarIndex >= 0 && activeBarIndex < series.length
      ? activeBarIndex
      : null;
  const activeBarItem = safeActiveIndex !== null ? series[safeActiveIndex] : null;

  const renderDeltaBadge = (delta: number | null) => {
    if (delta === null) return null;
    const isUp = delta > 0;
    const isDown = delta < 0;
    return (
      <span
        className={`${styles.deltaBadge} ${
          isUp ? styles.deltaUp : isDown ? styles.deltaDown : styles.deltaNeutral
        }`}
      >
        {isUp && <TrendingUp size={12} strokeWidth={1.5} aria-hidden="true" />}
        {isDown && <TrendingDown size={12} strokeWidth={1.5} aria-hidden="true" />}
        <span>
          {delta === 0
            ? ADMIN_CHART_TEXTS.kpis.sameAsPrevious
            : ADMIN_CHART_TEXTS.kpis.vsPrevious(delta)}
        </span>
      </span>
    );
  };

  if (dashboard.totalHistoricalConfirmed === 0) {
    return (
      <div className={styles.dashboardShell}>
        <div className={styles.sectionHeaderCard}>
          <div className={styles.titleBlock}>
            <h2 className={styles.mainTitle}>
              <BarChart3 size={16} strokeWidth={1.5} className={styles.titleIcon} aria-hidden="true" />
              <span>{ADMIN_CHART_TEXTS.header.mainTitle}</span>
            </h2>
            <p className={styles.mainSubtitle}>{ADMIN_CHART_TEXTS.header.mainSubtitle}</p>
          </div>
        </div>
        <div className={styles.emptyCard}>
          <BarChart3 size={20} strokeWidth={1.5} className={styles.emptyIcon} aria-hidden="true" />
          <h3 className={styles.emptyTitle}>{ADMIN_CHART_TEXTS.emptyState.noHistoryTitle}</h3>
          <p className={styles.emptyDesc}>{ADMIN_CHART_TEXTS.emptyState.noHistoryDescription}</p>
        </div>
      </div>
    );
  }

  const { kpis, agendaHealth } = dashboard;
  const totalClientsComposed = agendaHealth.newClients + agendaHealth.returningClients;
  const newClientsPct =
    totalClientsComposed > 0
      ? Math.round((agendaHealth.newClients / totalClientsComposed) * 100)
      : 0;
  const returningClientsPct = totalClientsComposed > 0 ? 100 - newClientsPct : 0;

  return (
    <div className={styles.dashboardShell}>
      {/* Header + Filter Bar */}
      <section className={styles.filtersCard} aria-label={ADMIN_CHART_TEXTS.filters.periodAria}>
        <div className={styles.filtersTopRow}>
          <div className={styles.titleBlock}>
            <h2 className={styles.mainTitle}>
              <BarChart3 size={16} strokeWidth={1.5} className={styles.titleIcon} aria-hidden="true" />
              <span>{ADMIN_CHART_TEXTS.header.mainTitle}</span>
              <span className={styles.rangeBadge}>{activeRangeBadgeLabel}</span>
            </h2>
            <p className={styles.mainSubtitle}>{ADMIN_CHART_TEXTS.header.mainSubtitle}</p>
          </div>

          <div className={styles.headerActions}>
            {hasCustomFilters && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleResetFilters}
              >
                <RotateCcw size={16} strokeWidth={1.5} aria-hidden="true" />
                <span>{ADMIN_CHART_TEXTS.header.clearFilters}</span>
              </button>
            )}

            <button
              type="button"
              className={styles.exportBtn}
              onClick={handleExportCsv}
              disabled={dashboard.exportRows.length === 0}
            >
              <Download size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>{ADMIN_CHART_TEXTS.header.exportCsv}</span>
            </button>
          </div>
        </div>

        <div className={styles.filtersControlsRow}>
          <div className={styles.pillGroup} role="group" aria-label={ADMIN_CHART_TEXTS.filters.periodAria}>
            {PERIOD_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`${styles.filterPill} ${
                  filters.period === preset ? styles.filterPillActive : ''
                }`}
                onClick={() => handlePeriodChange(preset)}
                aria-pressed={filters.period === preset}
              >
                {ADMIN_CHART_TEXTS.filters.periods[preset]}
              </button>
            ))}
          </div>

          <div className={styles.secondaryFilters}>
            <div
              className={styles.segmentedGroup}
              role="group"
              aria-label={ADMIN_CHART_TEXTS.filters.channelAria}
            >
              {CHANNEL_OPTIONS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  className={`${styles.segmentBtn} ${
                    filters.channel === ch ? styles.segmentBtnActive : ''
                  }`}
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, channel: ch }));
                    setActiveBarIndex(null);
                  }}
                  aria-pressed={filters.channel === ch}
                >
                  {ADMIN_CHART_TEXTS.filters.channels[ch]}
                </button>
              ))}
            </div>

            <select
              className={styles.serviceSelect}
              value={filters.serviceName}
              aria-label={ADMIN_CHART_TEXTS.filters.serviceAria}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, serviceName: e.target.value }));
                setActiveBarIndex(null);
              }}
            >
              <option value="all">{ADMIN_CHART_TEXTS.filters.allServices}</option>
              {availableServices.map((srv) => (
                <option key={srv} value={srv}>
                  {srv}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filters.period === 'custom' && (
          <div className={styles.customDateRow}>
            <label className={styles.dateField}>
              <span>{ADMIN_CHART_TEXTS.filters.fromLabel}</span>
              <input
                type="date"
                value={filters.customFrom}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, customFrom: e.target.value }))
                }
              />
            </label>
            <label className={styles.dateField}>
              <span>{ADMIN_CHART_TEXTS.filters.toLabel}</span>
              <input
                type="date"
                value={filters.customTo}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, customTo: e.target.value }))
                }
              />
            </label>
          </div>
        )}
      </section>

      {kpis.confirmedCount === 0 ? (
        <div className={styles.emptyCard}>
          <BarChart3 size={20} strokeWidth={1.5} className={styles.emptyIcon} aria-hidden="true" />
          <h3 className={styles.emptyTitle}>{ADMIN_CHART_TEXTS.emptyState.filteredTitle}</h3>
          <p className={styles.emptyDesc}>{ADMIN_CHART_TEXTS.emptyState.filteredDescription}</p>
          <button type="button" className={styles.resetEmptyBtn} onClick={handleResetFilters}>
            <RotateCcw size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>{ADMIN_CHART_TEXTS.emptyState.resetAction}</span>
          </button>
        </div>
      ) : (
        <>
          {/* Row 2: Clean Numeric KPI Grid */}
          <section className={styles.kpiGrid} aria-label="Indicadores principales">
            <article className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{ADMIN_CHART_TEXTS.kpis.estimatedRevenue}</span>
                {renderDeltaBadge(kpis.estimatedRevenueDeltaPct)}
              </div>
              <span className={styles.kpiValue}>{formatMoney(kpis.estimatedRevenue)}</span>
              <span className={styles.kpiSubtext}>
                {ADMIN_CHART_TEXTS.kpis.estimatedBreakdown(
                  Math.round(kpis.onlineDeposits).toLocaleString('es-AR'),
                  Math.round(kpis.pendingBalance).toLocaleString('es-AR')
                )}
              </span>
            </article>

            <article className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{ADMIN_CHART_TEXTS.kpis.collectedDeposits}</span>
                {renderDeltaBadge(kpis.onlineDepositsDeltaPct)}
              </div>
              <span className={styles.kpiValue}>{formatMoney(kpis.onlineDeposits)}</span>
              <span className={styles.kpiSubtext}>
                {ADMIN_CHART_TEXTS.kpis.channelCounts(kpis.onlineCount, kpis.manualCount)}
              </span>
            </article>

            <article className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{ADMIN_CHART_TEXTS.kpis.pendingBalance}</span>
                {renderDeltaBadge(kpis.pendingBalanceDeltaPct)}
              </div>
              <span className={styles.kpiValue}>{formatMoney(kpis.pendingBalance)}</span>
              <span className={styles.kpiSubtext}>{ADMIN_CHART_TEXTS.kpis.pendingSubtitle}</span>
            </article>

            <article className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{ADMIN_CHART_TEXTS.kpis.confirmedSlots}</span>
                {renderDeltaBadge(kpis.confirmedCountDeltaPct)}
              </div>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{kpis.confirmedCount}</span>
                {kpis.cancelledCount > 0 && (
                  <span className={styles.kpiDangerChip}>
                    {ADMIN_CHART_TEXTS.kpis.cancelledBadge(kpis.cancelledCount)}
                  </span>
                )}
              </div>
              <span className={styles.kpiSubtext}>
                {ADMIN_CHART_TEXTS.kpis.occupancySubtitle(kpis.occupancyRatePct)}
              </span>
            </article>

            <article className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{ADMIN_CHART_TEXTS.kpis.averageTicket}</span>
                {renderDeltaBadge(kpis.averageTicketDeltaPct)}
              </div>
              <span className={styles.kpiValue}>{formatMoney(kpis.averageTicket)}</span>
              <span className={styles.kpiSubtext}>
                {ADMIN_CHART_TEXTS.kpis.averageTicketSubtitle}
              </span>
            </article>

            <article className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{ADMIN_CHART_TEXTS.kpis.uniqueClients}</span>
                {renderDeltaBadge(kpis.uniqueClientsDeltaPct)}
              </div>
              <span className={styles.kpiValue}>{kpis.uniqueClients}</span>
              <span className={styles.kpiSubtext}>
                {ADMIN_CHART_TEXTS.kpis.returningSubtitle(
                  kpis.returningRatePct,
                  kpis.returningClientsCount
                )}
              </span>
            </article>
          </section>

          {/* Row 3: Full-Width Interactive Multi-Metric Chart */}
          <section className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleGroup}>
                <h3 className={styles.cardTitle}>
                  <span>{ADMIN_CHART_TEXTS.chart.title}</span>
                  <span className={styles.softBadge}>
                    {ADMIN_CHART_TEXTS.chart.granularityBadge(dashboard.granularity)}
                  </span>
                </h3>
                <p className={styles.cardSubtitle}>
                  {ADMIN_CHART_TEXTS.chart.subtitleByGranularity(dashboard.granularity)}
                </p>
              </div>

              <div className={styles.segmentedGroup} role="tablist" aria-label="Métrica del gráfico">
                {(['total', 'deposits', 'count'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={chartMetric === mode}
                    className={`${styles.segmentBtn} ${
                      chartMetric === mode ? styles.segmentBtnActive : ''
                    }`}
                    onClick={() => {
                      setChartMetric(mode);
                      setActiveBarIndex(null);
                    }}
                  >
                    {ADMIN_CHART_TEXTS.chart.metrics[mode]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.chartLegendRow}>
              {chartMetric === 'total' ? (
                <>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendSwatch} ${styles.swatchOnline}`} />
                    {ADMIN_CHART_TEXTS.chart.legendOnline}
                  </span>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendSwatch} ${styles.swatchPending}`} />
                    {ADMIN_CHART_TEXTS.chart.legendPending}
                  </span>
                </>
              ) : chartMetric === 'deposits' ? (
                <span className={styles.legendItem}>
                  <span className={`${styles.legendSwatch} ${styles.swatchOnline}`} />
                  {ADMIN_CHART_TEXTS.chart.legendDeposits}
                </span>
              ) : (
                <span className={styles.legendItem}>
                  <span className={`${styles.legendSwatch} ${styles.swatchPrimary}`} />
                  {ADMIN_CHART_TEXTS.chart.legendCount}
                </span>
              )}

              {averageLineValue > 0 && (
                <span className={styles.legendItem}>
                  <span className={styles.legendDash} />
                  {ADMIN_CHART_TEXTS.chart.legendAverage(
                    chartMetric === 'count'
                      ? `${averageLineValue}`
                      : formatMoney(averageLineValue)
                  )}
                </span>
              )}
            </div>

            {isMobile && (
              <div className={styles.mobileInspectionBar} role="status">
                {activeBarItem ? (
                  <>
                    <div className={styles.mobileInspectionTop}>
                      <strong>{activeBarItem.tooltipTitle}</strong>
                      <span>
                        {ADMIN_CHART_TEXTS.chart.tooltipAppointments(activeBarItem.count)}
                      </span>
                    </div>
                    <div className={styles.mobileInspectionMetrics}>
                      <span>
                        {ADMIN_CHART_TEXTS.chart.tooltipTotal}:{' '}
                        <strong>{formatMoney(activeBarItem.estimatedRevenue)}</strong>
                      </span>
                      <span className={styles.tooltipSuccess}>
                        {ADMIN_CHART_TEXTS.chart.tooltipOnline}:{' '}
                        {formatMoney(activeBarItem.onlineDeposits)}
                      </span>
                      <span className={styles.tooltipWarning}>
                        {ADMIN_CHART_TEXTS.chart.tooltipPending}:{' '}
                        {formatMoney(activeBarItem.pendingBalance)}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className={styles.mobileInspectionPlaceholder}>
                    {ADMIN_CHART_TEXTS.chart.mobileTapHint}
                  </span>
                )}
              </div>
            )}

            <div
              className={styles.chartViewport}
              onMouseLeave={() => setActiveBarIndex(null)}
            >
              {!isMobile && activeBarItem && safeActiveIndex !== null && (
                <div
                  className={styles.floatingTooltip}
                  style={{
                    left: `${((safeActiveIndex + 0.5) / Math.max(1, series.length)) * 100}%`,
                  }}
                  role="status"
                >
                  <div className={styles.tooltipHeader}>
                    <strong>{activeBarItem.tooltipTitle}</strong>
                    <span>
                      {ADMIN_CHART_TEXTS.chart.tooltipAppointments(activeBarItem.count)}
                    </span>
                  </div>
                  <div className={styles.tooltipRows}>
                    <div className={styles.tooltipRow}>
                      <span>{ADMIN_CHART_TEXTS.chart.tooltipTotal}</span>
                      <strong>{formatMoney(activeBarItem.estimatedRevenue)}</strong>
                    </div>
                    <div className={styles.tooltipRow}>
                      <span>{ADMIN_CHART_TEXTS.chart.tooltipOnline}</span>
                      <span className={styles.tooltipSuccess}>
                        {formatMoney(activeBarItem.onlineDeposits)}
                      </span>
                    </div>
                    <div className={styles.tooltipRow}>
                      <span>{ADMIN_CHART_TEXTS.chart.tooltipPending}</span>
                      <span className={styles.tooltipWarning}>
                        {formatMoney(activeBarItem.pendingBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.svgScrollWrap}>
                <svg
                  className={styles.svgChart}
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  style={{
                    width: `${svgWidth}px`,
                    height: `${svgHeight}px`,
                    minWidth: '100%',
                  }}
                >
                  {[1, 0.5].map((ratio) => {
                    const yPos = plotBottom - ratio * plotHeight;
                    const gridVal =
                      chartMetric === 'count'
                        ? Math.round(maxChartValue * ratio)
                        : formatMoney(maxChartValue * ratio);
                    return (
                      <g key={ratio}>
                        <line
                          x1={plotLeft}
                          y1={yPos}
                          x2={plotRight}
                          y2={yPos}
                          className={styles.gridLine}
                        />
                        <text x={plotRight} y={yPos - 5} className={styles.gridLegendText}>
                          {gridVal}
                        </text>
                      </g>
                    );
                  })}

                  <line
                    x1={plotLeft}
                    y1={plotBottom}
                    x2={plotRight}
                    y2={plotBottom}
                    className={styles.axisLine}
                  />

                  {avgY !== null && (
                    <line
                      x1={plotLeft}
                      y1={avgY}
                      x2={plotRight}
                      y2={avgY}
                      className={styles.avgLine}
                    />
                  )}

                  {series.map((item, idx) => {
                    const sidePad = isMobile ? 8 : 14;
                    const usableWidth = plotRight - plotLeft - sidePad * 2;
                    const step = usableWidth / series.length;
                    const maxBarW = isMobile ? 34 : 44;
                    const minBarW = isMobile ? 20 : 24;
                    const barWidth = Math.min(maxBarW, Math.max(minBarW, step * 0.6));
                    const x = plotLeft + sidePad + idx * step + (step - barWidth) / 2;
                    const isFocused = safeActiveIndex === idx;

                    const mainValue =
                      chartMetric === 'total'
                        ? item.estimatedRevenue
                        : chartMetric === 'deposits'
                        ? item.onlineDeposits
                        : item.count;
                    const totalBarHeight =
                      mainValue > 0 ? Math.max((mainValue / maxChartValue) * plotHeight, 6) : 0;
                    const topY = plotBottom - totalBarHeight;

                    const valueLabel =
                      chartMetric === 'count' ? String(item.count) : formatMoney(mainValue);
                    const showTopValueLabel =
                      mainValue > 0 && (!isMobile || series.length <= 4);

                    if (chartMetric === 'total') {
                      const onlineHeight =
                        item.estimatedRevenue > 0 && item.onlineDeposits > 0
                          ? Math.max(
                              (item.onlineDeposits / item.estimatedRevenue) * totalBarHeight,
                              item.onlineDeposits > 0 ? 4 : 0
                            )
                          : 0;
                      const pendingHeight = Math.max(0, totalBarHeight - onlineHeight);
                      const onlineY = plotBottom - onlineHeight;
                      const pendingY = topY;

                      return (
                        <g
                          key={item.key}
                          className={`${styles.barGroup} ${
                            safeActiveIndex !== null && !isFocused ? styles.barGroupDimmed : ''
                          }`}
                          tabIndex={0}
                          role="button"
                          aria-label={`${item.tooltipTitle}: ${formatMoney(item.estimatedRevenue)}`}
                          onMouseEnter={() => setActiveBarIndex(idx)}
                          onFocus={() => setActiveBarIndex(idx)}
                          onClick={() =>
                            setActiveBarIndex((prev) => (prev === idx ? null : idx))
                          }
                        >
                          <rect
                            x={x - 6}
                            y={plotTop}
                            width={barWidth + 12}
                            height={plotHeight}
                            fill="transparent"
                          />
                          {pendingHeight > 0 && (
                            <rect
                              x={x}
                              y={pendingY}
                              width={barWidth}
                              height={pendingHeight}
                              rx={onlineHeight > 0 ? 3 : 5}
                              fill="var(--color-warning)"
                              fillOpacity={0.68}
                            />
                          )}
                          {onlineHeight > 0 && (
                            <rect
                              x={x}
                              y={onlineY}
                              width={barWidth}
                              height={onlineHeight}
                              rx={pendingHeight > 0 ? 2 : 5}
                              fill="var(--color-success)"
                              fillOpacity={0.9}
                            />
                          )}
                          {showTopValueLabel && (
                            <text x={x + barWidth / 2} y={topY - 7} className={styles.barValueText}>
                              {valueLabel}
                            </text>
                          )}
                          <text
                            x={x + barWidth / 2}
                            y={plotBottom + 16}
                            className={styles.barLabelText}
                          >
                            {item.label}
                          </text>
                          <text
                            x={x + barWidth / 2}
                            y={plotBottom + 31}
                            className={styles.barSubLabelText}
                          >
                            {item.subLabel}
                          </text>
                        </g>
                      );
                    }

                    const fillColor =
                      chartMetric === 'deposits' ? 'var(--color-success)' : 'var(--color-primary)';

                    return (
                      <g
                        key={item.key}
                        className={`${styles.barGroup} ${
                          safeActiveIndex !== null && !isFocused ? styles.barGroupDimmed : ''
                        }`}
                        tabIndex={0}
                        role="button"
                        aria-label={`${item.tooltipTitle}: ${valueLabel}`}
                        onMouseEnter={() => setActiveBarIndex(idx)}
                        onFocus={() => setActiveBarIndex(idx)}
                        onClick={() =>
                          setActiveBarIndex((prev) => (prev === idx ? null : idx))
                        }
                      >
                        <rect
                          x={x - 6}
                          y={plotTop}
                          width={barWidth + 12}
                          height={plotHeight}
                          fill="transparent"
                        />
                        {totalBarHeight > 0 && (
                          <rect
                            x={x}
                            y={topY}
                            width={barWidth}
                            height={totalBarHeight}
                            rx="5"
                            fill={fillColor}
                            fillOpacity={0.9}
                          />
                        )}
                        {showTopValueLabel && (
                          <text x={x + barWidth / 2} y={topY - 7} className={styles.barValueText}>
                            {valueLabel}
                          </text>
                        )}
                        <text
                          x={x + barWidth / 2}
                          y={plotBottom + 16}
                          className={styles.barLabelText}
                        >
                          {item.label}
                        </text>
                        <text
                          x={x + barWidth / 2}
                          y={plotBottom + 31}
                          className={styles.barSubLabelText}
                        >
                          {item.subLabel}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </section>

          {/* Row 4: Busy Weekdays + Top Services & Extras */}
          <div className={styles.bentoTwoCol}>
            <section className={styles.bentoCard}>
              <div className={styles.cardHeaderCompact}>
                <div className={styles.cardTitleGroup}>
                  <h3 className={styles.cardTitle}>{ADMIN_CHART_TEXTS.weekdays.title}</h3>
                  <p className={styles.cardSubtitle}>{ADMIN_CHART_TEXTS.weekdays.subtitle}</p>
                </div>

                {dashboard.peakWeekday && dashboard.peakWeekday.count > 0 && (
                  <span className={styles.highlightBadge}>
                    {ADMIN_CHART_TEXTS.weekdays.peakInsight(
                      dashboard.peakWeekday.fullLabel,
                      dashboard.peakWeekday.sharePct
                    )}
                  </span>
                )}
              </div>

              <div className={styles.weekdayList}>
                {dashboard.weekdayStats.map((wd) => (
                  <div
                    key={wd.weekdayIndex}
                    className={`${styles.weekdayRow} ${wd.isPeak ? styles.weekdayRowPeak : ''}`}
                  >
                    <span className={styles.weekdayName}>{wd.shortLabel}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={`${styles.barFill} ${wd.isPeak ? styles.barFillPeak : ''}`}
                        style={{ width: `${Math.max(wd.sharePct, wd.count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <span className={styles.weekdayMetrics}>
                      <strong>{wd.count}</strong>
                      <span>({wd.sharePct}%)</span>
                    </span>
                    <span className={styles.weekdayRevenue}>
                      {wd.revenue > 0 ? formatMoney(wd.revenue) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.bentoCard}>
              <div className={styles.cardHeaderCompact}>
                <div className={styles.cardTitleGroup}>
                  <h3 className={styles.cardTitle}>{ADMIN_CHART_TEXTS.services.title}</h3>
                  <p className={styles.cardSubtitle}>{ADMIN_CHART_TEXTS.services.subtitle}</p>
                </div>
              </div>

              {dashboard.topServices.length === 0 ? (
                <p className={styles.inlineEmpty}>{ADMIN_CHART_TEXTS.services.empty}</p>
              ) : (
                <div className={styles.servicesList}>
                  {dashboard.topServices.map((srv, idx) => (
                    <div key={srv.name} className={styles.serviceRankRow}>
                      <div className={styles.serviceRankHead}>
                        <span className={styles.serviceRankName}>
                          <span className={styles.rankIndex}>{idx + 1}.</span>
                          {srv.name}
                        </span>
                        <span className={styles.serviceRankMeta}>
                          {ADMIN_CHART_TEXTS.services.bookingsCount(srv.count)} · {srv.sharePct}% ·{' '}
                          <strong>{formatMoney(srv.revenue)}</strong>
                        </span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${Math.max(srv.sharePct, 6)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {dashboard.topExtras.length > 0 && (
                <div className={styles.extrasSection}>
                  <span className={styles.extrasHeading}>
                    {ADMIN_CHART_TEXTS.services.extrasTitle}
                  </span>
                  <div className={styles.extrasChips}>
                    {dashboard.topExtras.map((ex) => (
                      <span key={ex.name} className={styles.extraChip}>
                        {ex.name} · <strong>×{ex.count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Row 5: Peak Time Bands + Agenda Health & Client Loyalty */}
          <div className={styles.bentoTwoCol}>
            <section className={styles.bentoCard}>
              <div className={styles.cardHeaderCompact}>
                <div className={styles.cardTitleGroup}>
                  <h3 className={styles.cardTitle}>{ADMIN_CHART_TEXTS.timeBands.title}</h3>
                  <p className={styles.cardSubtitle}>{ADMIN_CHART_TEXTS.timeBands.subtitle}</p>
                </div>

                {dashboard.peakHour && (
                  <span className={styles.highlightBadge}>
                    {ADMIN_CHART_TEXTS.timeBands.peakHourBadge(dashboard.peakHour.hourLabel)}
                  </span>
                )}
              </div>

              <div className={styles.timeBandsGrid}>
                {dashboard.timeBandStats.map((band) => {
                  const meta = ADMIN_CHART_TEXTS.timeBands.labels[band.id];
                  const intensityLevel =
                    band.sharePct >= 40
                      ? styles.bandHeatHigh
                      : band.sharePct >= 20
                      ? styles.bandHeatMid
                      : band.count > 0
                      ? styles.bandHeatLow
                      : '';
                  return (
                    <div
                      key={band.id}
                      className={`${styles.timeBandTile} ${intensityLevel} ${
                        band.isPeak ? styles.timeBandPeak : ''
                      }`}
                    >
                      <div className={styles.timeBandTop}>
                        <span className={styles.timeBandTitle}>{meta.title}</span>
                        <span className={styles.timeBandShare}>{band.sharePct}%</span>
                      </div>
                      <span className={styles.timeBandRange}>{meta.range}</span>
                      <div className={styles.timeBandBottom}>
                        <strong>{ADMIN_CHART_TEXTS.weekdays.slotCount(band.count)}</strong>
                        <span>{band.revenue > 0 ? formatMoney(band.revenue) : '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={styles.bentoCard}>
              <div className={styles.cardHeaderCompact}>
                <div className={styles.cardTitleGroup}>
                  <h3 className={styles.cardTitle}>{ADMIN_CHART_TEXTS.health.title}</h3>
                  <p className={styles.cardSubtitle}>{ADMIN_CHART_TEXTS.health.subtitle}</p>
                </div>

                <span className={styles.softBadge}>
                  {ADMIN_CHART_TEXTS.health.cancellationRate(agendaHealth.cancellationRatePct)}
                </span>
              </div>

              <div className={styles.healthCountersGrid}>
                <div className={`${styles.healthCell} ${styles.healthConfirmed}`}>
                  <span className={styles.healthValue}>{agendaHealth.confirmed}</span>
                  <span className={styles.healthLabel}>{ADMIN_CHART_TEXTS.health.confirmed}</span>
                </div>
                <div className={styles.healthCell}>
                  <span className={styles.healthValue}>{agendaHealth.available}</span>
                  <span className={styles.healthLabel}>{ADMIN_CHART_TEXTS.health.available}</span>
                </div>
                <div className={`${styles.healthCell} ${styles.healthCancelled}`}>
                  <span className={styles.healthValue}>{agendaHealth.cancelled}</span>
                  <span className={styles.healthLabel}>{ADMIN_CHART_TEXTS.health.cancelled}</span>
                </div>
                <div className={styles.healthCell}>
                  <span className={styles.healthValue}>{agendaHealth.conflict}</span>
                  <span className={styles.healthLabel}>{ADMIN_CHART_TEXTS.health.conflict}</span>
                </div>
              </div>

              <div className={styles.loyaltyBox}>
                <div className={styles.loyaltyHeader}>
                  <span className={styles.extrasHeading}>
                    {ADMIN_CHART_TEXTS.health.clientsTitle}
                  </span>
                  {totalClientsComposed > 0 && (
                    <span className={styles.loyaltyMeta}>
                      {ADMIN_CHART_TEXTS.health.newClients}:{' '}
                      <strong>
                        {agendaHealth.newClients} ({newClientsPct}%)
                      </strong>{' '}
                      · {ADMIN_CHART_TEXTS.health.returningClients}:{' '}
                      <strong>
                        {agendaHealth.returningClients} ({returningClientsPct}%)
                      </strong>
                    </span>
                  )}
                </div>

                {totalClientsComposed === 0 ? (
                  <p className={styles.inlineEmpty}>{ADMIN_CHART_TEXTS.health.noClientsYet}</p>
                ) : (
                  <div className={styles.splitBar} aria-hidden="true">
                    {newClientsPct > 0 && (
                      <div
                        className={styles.splitBarNew}
                        style={{ width: `${newClientsPct}%` }}
                      />
                    )}
                    {returningClientsPct > 0 && (
                      <div
                        className={styles.splitBarReturning}
                        style={{ width: `${returningClientsPct}%` }}
                      />
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminChart;
