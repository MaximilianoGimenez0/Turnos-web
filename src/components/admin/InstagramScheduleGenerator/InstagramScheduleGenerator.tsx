import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Share2 } from 'lucide-react';
import { useOwnerInfo } from '../../../context/OwnerInfoContext';
import { useTenant } from '../../../context/TenantContext';
import { useEffectiveTenantAppearance } from '../../../hooks/useEffectiveTenantAppearance';
import { INSTAGRAM_SCHEDULE_GENERATOR_TEXTS } from '../../../texts/components/admin/InstagramScheduleGenerator';
import type { Slot } from '../../../types';
import {
  BUSINESS_TIMEZONE,
  formatScopeRangeLabel,
  getTodayBusinessDateString,
} from '../../../utils/dateUtils';
import {
  buildInstagramPeriodRange,
  findNextAvailableAnchorDateKey,
  type InstagramFormatMode,
  type InstagramMonthDisplayMode,
  type InstagramPeriodMode,
  renderInstagramScheduleToCanvas,
  shiftInstagramAnchor,
} from '../../../utils/instagramScheduleCanvas';
import { downloadCanvasAsPng } from '../../../utils/qrGenerator';
import { Button } from '../../common/Button/Button';
import styles from './InstagramScheduleGenerator.module.css';

interface InstagramScheduleGeneratorProps {
  slots: Slot[];
  onPeriodExplore?: (rangeEndDateKey: string) => void;
  isSyncingFullRange?: boolean;
}

export const InstagramScheduleGenerator: React.FC<InstagramScheduleGeneratorProps> = ({
  slots,
  onPeriodExplore,
  isSyncingFullRange = false,
}) => {
  const { slug, timezone } = useTenant();
  const { owner } = useOwnerInfo();
  const { appearance, defaultResolvedMode } = useEffectiveTenantAppearance();
  const tz = timezone || BUSINESS_TIMEZONE;

  const [period, setPeriod] = useState<InstagramPeriodMode>('week');
  const [monthDisplay, setMonthDisplay] = useState<InstagramMonthDisplayMode>('calendar');
  const [format, setFormat] = useState<InstagramFormatMode>('story');
  const [prevDefaultMode, setPrevDefaultMode] = useState<'light' | 'dark'>(defaultResolvedMode);
  const [manualModeOverride, setManualModeOverride] = useState<'light' | 'dark' | null>(null);

  if (prevDefaultMode !== defaultResolvedMode) {
    setPrevDefaultMode(defaultResolvedMode);
    setManualModeOverride(null);
  }

  const mode = manualModeOverride ?? defaultResolvedMode;
  const [anchorDateKey, setAnchorDateKey] = useState<string>(() =>
    findNextAvailableAnchorDateKey(slots, tz)
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [showBrandHeader, setShowBrandHeader] = useState(true);
  const [showInstagramHandle, setShowInstagramHandle] = useState(true);
  const [renderMeta, setRenderMeta] = useState({
    totalPages: 1,
    currentPage: 0,
    totalSlotsCount: 0,
  });
  const [isExporting, setIsExporting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasAutoAnchoredRef = useRef(slots.length > 0);

  useEffect(() => {
    if (!hasAutoAnchoredRef.current && slots.length > 0) {
      hasAutoAnchoredRef.current = true;
      setAnchorDateKey(findNextAvailableAnchorDateKey(slots, tz));
    }
  }, [slots, tz]);

  const activeRange = useMemo(
    () => buildInstagramPeriodRange(period, anchorDateKey, tz),
    [period, anchorDateKey, tz]
  );

  useEffect(() => {
    onPeriodExplore?.(activeRange.endDateKey);
  }, [activeRange.endDateKey, onPeriodExplore]);

  const rangeLabel = useMemo(
    () =>
      formatScopeRangeLabel(
        period,
        anchorDateKey || getTodayBusinessDateString(tz),
        tz
      ),
    [period, anchorDateKey, tz]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    void renderInstagramScheduleToCanvas(canvas, {
      slots,
      appearance,
      owner,
      slug,
      timeZone: tz,
      period,
      monthDisplay,
      format,
      mode,
      anchorDateKey,
      pageIndex,
      showBrandHeader,
      showInstagramHandle,
    }).then((meta) => {
      if (!cancelled) {
        setRenderMeta(meta);
        if (meta.currentPage !== pageIndex) {
          setPageIndex(meta.currentPage);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    slots,
    appearance,
    owner,
    slug,
    tz,
    period,
    monthDisplay,
    format,
    mode,
    anchorDateKey,
    pageIndex,
    showBrandHeader,
    showInstagramHandle,
  ]);

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function';

  const handlePeriodChange = (nextPeriod: InstagramPeriodMode) => {
    setPeriod(nextPeriod);
    setPageIndex(0);
  };

  const handleShiftPeriod = (delta: number) => {
    setAnchorDateKey((prev) => shiftInstagramAnchor(period, prev, delta, tz));
    setPageIndex(0);
  };

  const buildFilename = () => {
    const cleanSlug = (slug || 'turneado').trim();
    const pageSuffix =
      renderMeta.totalPages > 1 ? `-p${renderMeta.currentPage + 1}` : '';
    return `turnos-${cleanSlug}-${period}-${format}${pageSuffix}.png`;
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExporting(true);
    try {
      await downloadCanvasAsPng(canvas, buildFilename());
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !canShareFiles) return;
    setIsExporting(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((res) => resolve(res), 'image/png')
      );
      if (!blob) return;
      const file = new File([blob], buildFilename(), { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.actions.shareTitle,
          files: [file],
        });
      }
    } catch {
      // User cancelled share dialog
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section
      className={styles.container}
      aria-labelledby="instagram-schedule-generator-title"
    >
      <div className={styles.header}>
        <h2 id="instagram-schedule-generator-title" className={styles.title}>
          {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.header.title}
        </h2>
        <p className={styles.subtitle}>
          {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.header.subtitle}
        </p>
      </div>

      <div className={styles.layoutGrid}>
        <div className={styles.controlsPanel}>
          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>
              {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.periodLabel}
            </span>
            <div
              className={styles.segmented}
              role="group"
              aria-label={INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.periodLabel}
            >
              {(['day', 'week', 'month'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.segmentBtn} ${period === key ? styles.segmentBtnActive : ''}`}
                  onClick={() => handlePeriodChange(key)}
                >
                  {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.periods[key]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.periodNavRow}>
            <button
              type="button"
              className={styles.periodNavBtn}
              onClick={() => handleShiftPeriod(-1)}
              aria-label={INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.prevPeriodAria}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span className={styles.periodRangeText}>{rangeLabel}</span>
            <button
              type="button"
              className={styles.periodNavBtn}
              onClick={() => handleShiftPeriod(1)}
              aria-label={INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.nextPeriodAria}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          {period === 'month' && (
            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>
                {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.monthViewLabel}
              </span>
              <div
                className={styles.segmented}
                role="group"
                aria-label={INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.monthViewLabel}
              >
                {(['calendar', 'list'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.segmentBtn} ${monthDisplay === key ? styles.segmentBtnActive : ''}`}
                    onClick={() => {
                      setMonthDisplay(key);
                      setPageIndex(0);
                    }}
                  >
                    {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.monthViews[key]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>
              {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.formatLabel}
            </span>
            <div
              className={styles.segmented}
              role="group"
              aria-label={INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.formatLabel}
            >
              {(['story', 'feed'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.segmentBtn} ${format === key ? styles.segmentBtnActive : ''}`}
                  onClick={() => {
                    setFormat(key);
                    setPageIndex(0);
                  }}
                >
                  {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.formats[key]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>
              {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.themeLabel}
            </span>
            <div
              className={styles.segmented}
              role="group"
              aria-label={INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.themeLabel}
            >
              {(['light', 'dark'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.segmentBtn} ${mode === key ? styles.segmentBtnActive : ''}`}
                  onClick={() => setManualModeOverride(key)}
                >
                  {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.themes[key]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>
              {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.optionsLabel}
            </span>
            <div className={styles.checkboxList}>
              <label className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={showBrandHeader}
                  onChange={(e) => setShowBrandHeader(e.target.checked)}
                />
                <span>{INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.showBrandHeader}</span>
              </label>
              <label className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={showInstagramHandle}
                  onChange={(e) => setShowInstagramHandle(e.target.checked)}
                />
                <span>{INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.showInstagramHandle}</span>
              </label>
            </div>
          </div>

          <div className={styles.statusBox}>
            <span className={styles.statusStrong}>
              {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.status.availableCount(
                renderMeta.totalSlotsCount
              )}
            </span>
            {isSyncingFullRange && (
              <span>{INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.status.loadingFullRange}</span>
            )}
            {renderMeta.totalSlotsCount === 0 && !isSyncingFullRange && (
              <span>{INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.status.noSlotsHint}</span>
            )}
          </div>

          <div className={styles.actionsCol}>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Download size={16} aria-hidden="true" />}
              onClick={handleDownload}
              disabled={isExporting}
            >
              {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.actions.downloadPng}
            </Button>
            {canShareFiles && (
              <Button
                variant="outline"
                size="md"
                leftIcon={<Share2 size={16} aria-hidden="true" />}
                onClick={handleShare}
                disabled={isExporting}
              >
                {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.actions.sharePng}
              </Button>
            )}
          </div>
        </div>

        <div className={styles.previewStage}>
          {renderMeta.totalPages > 1 && (
            <div className={styles.pageBar}>
              <button
                type="button"
                className={styles.periodNavBtn}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={renderMeta.currentPage <= 0}
                aria-label={INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.prevPageAria}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <span className={styles.pageLabel}>
                {INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.status.pageIndicator(
                  renderMeta.currentPage + 1,
                  renderMeta.totalPages
                )}
              </span>
              <button
                type="button"
                className={styles.periodNavBtn}
                onClick={() =>
                  setPageIndex((p) => Math.min(renderMeta.totalPages - 1, p + 1))
                }
                disabled={renderMeta.currentPage >= renderMeta.totalPages - 1}
                aria-label={INSTAGRAM_SCHEDULE_GENERATOR_TEXTS.controls.nextPageAria}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          <div className={styles.canvasFrame}>
            <canvas ref={canvasRef} className={styles.canvasPreview} />
          </div>
        </div>
      </div>
    </section>
  );
};
