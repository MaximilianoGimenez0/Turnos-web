import type { OwnerInfo, Slot, TenantAppearanceConfig } from '../types';
import { FONT_PAIRING_MAP, SHAPE_PRESET_MAP } from '../config/themePresets';
import { filterClientAvailableSlots } from '../services/schedulingService';
import {
  ensureFontPairingLoaded,
  hexToRgb,
  normalizeTenantAppearance,
  resolveEffectiveBrandHex,
  resolveEffectiveSurfaceTokens,
} from '../services/themeEngine';
import {
  addDaysToDateKey,
  buildCalendarMonthGrid,
  BUSINESS_TIMEZONE,
  formatBusinessDateKey,
  formatBusinessTime,
  formatDateKeyParts,
  getDateRangeForScope,
  getTodayBusinessDateString,
  parseYearMonth,
  shiftAnchorDateKey,
  type DateRange,
} from './dateUtils';
import { drawRoundedRect, loadImageSafe } from './qrGenerator';

export type InstagramPeriodMode = 'day' | 'week' | 'month';
export type InstagramMonthDisplayMode = 'calendar' | 'list';
export type InstagramFormatMode = 'story' | 'feed';

export interface InstagramSlotEntry {
  id: string;
  time: string;
  hasSurcharge: boolean;
}

export interface InstagramDayGroup {
  dateKey: string;
  dayPadded: string;
  weekdayShort: string;
  weekdayLong: string;
  monthLong: string;
  slots: InstagramSlotEntry[];
}

export const STORY_DIMENSIONS = { width: 1080, height: 1920 } as const;
export const FEED_DIMENSIONS = { width: 1080, height: 1350 } as const;
export const MAX_DAYS_PER_LIST_PAGE = 6;

const WEEKDAY_HEADER_LABELS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'] as const;

const capitalize = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const parseShapeRadiusPx = (raw: string, fallback = 14): number => {
  const match = /^(\d+)/.exec(String(raw || ''));
  return match ? Number(match[1]) : fallback;
};

export const buildInstagramPeriodRange = (
  period: InstagramPeriodMode,
  anchorDateKey: string,
  timeZone = BUSINESS_TIMEZONE
): DateRange => {
  const safeAnchor = anchorDateKey || getTodayBusinessDateString(timeZone);
  const range = getDateRangeForScope(period, safeAnchor, timeZone);
  if (range) return range;
  return {
    startMs: 0,
    endMs: Number.MAX_SAFE_INTEGER,
    startDateKey: safeAnchor,
    endDateKey: safeAnchor,
  };
};

export const shiftInstagramAnchor = (
  period: InstagramPeriodMode,
  anchorDateKey: string,
  delta: number,
  timeZone = BUSINESS_TIMEZONE
): string => shiftAnchorDateKey(period, anchorDateKey, delta, timeZone);

export const groupAvailableSlotsForInstagram = (
  slots: readonly Slot[],
  options: {
    period: InstagramPeriodMode;
    anchorDateKey: string;
    timeZone?: string;
    nowMs?: number;
  }
): InstagramDayGroup[] => {
  const tz = options.timeZone || BUSINESS_TIMEZONE;
  const nowMs = options.nowMs ?? Date.now();
  const available = filterClientAvailableSlots([...slots], nowMs);
  const range = buildInstagramPeriodRange(options.period, options.anchorDateKey, tz);

  const byDate = new Map<string, InstagramSlotEntry[]>();

  for (const slot of available) {
    const dateKey = formatBusinessDateKey(slot.datetime, tz);
    if (!dateKey || dateKey < range.startDateKey || dateKey > range.endDateKey) {
      continue;
    }
    const time = formatBusinessTime(slot.datetime, tz);
    if (!time) continue;

    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, []);
    }
    byDate.get(dateKey)!.push({
      id: slot.id,
      time,
      hasSurcharge: Boolean(slot.surcharge && slot.surcharge.value > 0),
    });
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, entries]) => {
      const parts = formatDateKeyParts(dateKey);
      const sortedEntries = [...entries].sort((a, b) => a.time.localeCompare(b.time));
      return {
        dateKey,
        dayPadded: parts.dayNum.padStart(2, '0'),
        weekdayShort: parts.weekdayShort.slice(0, 3).toUpperCase(),
        weekdayLong: capitalize(parts.weekdayLong),
        monthLong: capitalize(parts.monthLong),
        slots: sortedEntries,
      };
    });
};

export const paginateInstagramDayGroups = (
  groups: readonly InstagramDayGroup[],
  pageSize = MAX_DAYS_PER_LIST_PAGE
): InstagramDayGroup[][] => {
  if (groups.length === 0) return [];
  const safeSize = Math.max(1, pageSize);
  const pages: InstagramDayGroup[][] = [];
  for (let i = 0; i < groups.length; i += safeSize) {
    pages.push(groups.slice(i, i + safeSize));
  }
  return pages;
};

export const findNextAvailableAnchorDateKey = (
  slots: readonly Slot[],
  timeZone = BUSINESS_TIMEZONE,
  nowMs = Date.now()
): string => {
  const available = filterClientAvailableSlots([...slots], nowMs);
  if (available.length > 0) {
    const firstKey = formatBusinessDateKey(available[0].datetime, timeZone);
    if (firstKey) return firstKey;
  }
  return getTodayBusinessDateString(timeZone, nowMs);
};

export const resolvePeriodHeadline = (
  period: InstagramPeriodMode,
  anchorDateKey: string,
  groups: readonly InstagramDayGroup[],
  timeZone = BUSINESS_TIMEZONE
): { scriptMonth: string; subtitle: string } => {
  const tz = timeZone || BUSINESS_TIMEZONE;
  const referenceKey = groups[0]?.dateKey || anchorDateKey || getTodayBusinessDateString(tz);
  const parts = formatDateKeyParts(referenceKey);

  if (period === 'day') {
    const todayKey = getTodayBusinessDateString(tz);
    const tomorrowKey = addDaysToDateKey(todayKey, 1);
    const tag =
      referenceKey === todayKey
        ? 'Hoy'
        : referenceKey === tomorrowKey
          ? 'Mañana'
          : capitalize(parts.weekdayLong);
    return {
      scriptMonth: tag,
      subtitle: `${parts.dayNum} de ${parts.monthLong}`,
    };
  }

  return {
    scriptMonth: capitalize(parts.monthLong),
    subtitle: 'DISPONIBLES',
  };
};

export interface RenderInstagramScheduleInput {
  slots: readonly Slot[];
  appearance: Partial<TenantAppearanceConfig> | null | undefined;
  owner: Partial<OwnerInfo>;
  slug: string;
  timeZone?: string;
  period: InstagramPeriodMode;
  monthDisplay: InstagramMonthDisplayMode;
  format: InstagramFormatMode;
  mode: 'light' | 'dark';
  anchorDateKey: string;
  pageIndex?: number;
  showBrandHeader?: boolean;
  showInstagramHandle?: boolean;
  nowMs?: number;
}

const splitTimesIntoLines = (times: string[], maxPerLine: number): string[] => {
  if (times.length === 0) return [];
  const lines: string[] = [];
  for (let i = 0; i < times.length; i += maxPerLine) {
    lines.push(times.slice(i, i + maxPerLine).join('  |  '));
  }
  return lines.slice(0, 2);
};

const drawBackgroundSurface = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: TenantAppearanceConfig,
  mode: 'light' | 'dark',
  bgHex: string,
  primaryHex: string,
  accentHex: string,
  textHex: string
): void => {
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, width, height);

  const p = hexToRgb(primaryHex);
  const a = hexToRgb(accentHex);
  const t = hexToRgb(textHex);

  if (config.backgroundStyle === 'soft-gradient' || config.backgroundStyle === 'mesh-glow') {
    const g1 = ctx.createRadialGradient(width * 0.16, height * 0.14, 20, width * 0.16, height * 0.14, width * 0.8);
    g1.addColorStop(0, `rgba(${p.r}, ${p.g}, ${p.b}, ${mode === 'light' ? 0.14 : 0.18})`);
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, width, height);

    const g2 = ctx.createRadialGradient(width * 0.88, height * 0.84, 20, width * 0.88, height * 0.84, width * 0.75);
    g2.addColorStop(0, `rgba(${a.r}, ${a.g}, ${a.b}, ${mode === 'light' ? 0.11 : 0.14})`);
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, width, height);
  } else if (config.backgroundStyle === 'dots') {
    ctx.fillStyle = `rgba(${t.r}, ${t.g}, ${t.b}, ${mode === 'light' ? 0.1 : 0.12})`;
    for (let y = 24; y < height; y += 36) {
      for (let x = 24; x < width; x += 36) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (config.backgroundStyle === 'grid') {
    ctx.strokeStyle = `rgba(${t.r}, ${t.g}, ${t.b}, ${mode === 'light' ? 0.055 : 0.08})`;
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 54) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 54) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else {
    // Subtle editorial silk wash so even solid themes have depth
    const wash = ctx.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, `rgba(${p.r}, ${p.g}, ${p.b}, ${mode === 'light' ? 0.045 : 0.07})`);
    wash.addColorStop(0.5, 'transparent');
    wash.addColorStop(1, `rgba(${a.r}, ${a.g}, ${a.b}, ${mode === 'light' ? 0.055 : 0.06})`);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);
  }
};

export const renderInstagramScheduleToCanvas = async (
  canvas: HTMLCanvasElement,
  input: RenderInstagramScheduleInput
): Promise<{ totalPages: number; currentPage: number; totalSlotsCount: number }> => {
  const config = normalizeTenantAppearance(input.appearance);
  ensureFontPairingLoaded(config.fontPairing);
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with fallback system fonts if font loading fails
    }
  }

  const dims = input.format === 'story' ? STORY_DIMENSIONS : FEED_DIMENSIONS;
  canvas.width = dims.width;
  canvas.height = dims.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { totalPages: 1, currentPage: 0, totalSlotsCount: 0 };
  }

  const tz = input.timeZone || BUSINESS_TIMEZONE;
  const surface = resolveEffectiveSurfaceTokens(config, input.mode);
  const { primary, accent } = resolveEffectiveBrandHex(config, input.mode);
  const fonts = FONT_PAIRING_MAP[config.fontPairing];
  const shape = SHAPE_PRESET_MAP[config.shapePreset];
  const rowRadius = Math.min(36, parseShapeRadiusPx(shape.radii.lg, 16) * 1.45);
  const displayFont = fonts.display;
  const bodyFont = fonts.body;

  drawBackgroundSurface(
    ctx,
    dims.width,
    dims.height,
    config,
    input.mode,
    surface.bgBody,
    primary,
    accent,
    surface.textPrimary
  );

  const groups = groupAvailableSlotsForInstagram(input.slots, {
    period: input.period,
    anchorDateKey: input.anchorDateKey,
    timeZone: tz,
    nowMs: input.nowMs,
  });

  const totalSlotsCount = groups.reduce((acc, g) => acc + g.slots.length, 0);
  const isMonthCalendar = input.period === 'month' && input.monthDisplay === 'calendar';
  const pages = isMonthCalendar
    ? [groups]
    : paginateInstagramDayGroups(groups, input.format === 'story' ? 6 : 4);
  const totalPages = Math.max(1, pages.length);
  const currentPage = Math.min(Math.max(0, input.pageIndex ?? 0), totalPages - 1);
  const pageGroups = pages[currentPage] || [];

  const padTop = input.format === 'story' ? 210 : 96;
  const padBottom = input.format === 'story' ? 200 : 96;
  const padX = 88;
  const contentWidth = dims.width - padX * 2;
  const headline = resolvePeriodHeadline(input.period, input.anchorDateKey, groups, tz);

  // Optional subtle top brand pill
  let headerTopY = padTop;
  const brandName = (input.owner.businessName || input.owner.name || '').trim();
  if (input.showBrandHeader !== false && brandName) {
    const logoImg = input.owner.logoUrl ? await loadImageSafe(input.owner.logoUrl) : null;
    ctx.save();
    ctx.font = `600 22px ${bodyFont}`;
    const labelText = brandName.toUpperCase();
    const textW = ctx.measureText(labelText).width;
    const chipW = Math.min(contentWidth, textW + (logoImg ? 88 : 54));
    const chipX = (dims.width - chipW) / 2;

    drawRoundedRect(ctx, chipX, headerTopY, chipW, 48, 999);
    ctx.fillStyle = surface.bgSurface;
    ctx.fill();
    ctx.strokeStyle = surface.borderSubtle;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    let textCenterX = dims.width / 2;
    if (logoImg) {
      const iconSize = 30;
      const startX = chipX + 14;
      ctx.save();
      drawRoundedRect(ctx, startX, headerTopY + 9, iconSize, iconSize, 8);
      ctx.clip();
      ctx.drawImage(logoImg, startX, headerTopY + 9, iconSize, iconSize);
      ctx.restore();
      textCenterX = startX + iconSize + 12 + textW / 2;
    }

    ctx.fillStyle = surface.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, textCenterX, headerTopY + 25);
    ctx.restore();
    headerTopY += 86;
  }

  // Editorial Script + Display Title (modeled on reference layout)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.font = `italic 500 68px ${displayFont}`;
  ctx.fillStyle = primary;
  ctx.fillText(headline.scriptMonth, dims.width / 2, headerTopY + 54);

  ctx.font = `500 108px ${displayFont}`;
  ctx.fillStyle = surface.textPrimary;
  ctx.fillText('TURNOS', dims.width / 2, headerTopY + 146);

  ctx.font = `600 25px ${bodyFont}`;
  ctx.fillStyle = surface.textSecondary;
  const subLabel =
    input.period === 'day'
      ? `DISPONIBLES · ${headline.subtitle.toUpperCase()}`
      : 'D I S P O N I B L E S';
  ctx.fillText(subLabel, dims.width / 2, headerTopY + 188);
  ctx.restore();

  const bodyStartY = headerTopY + 235;
  const footerY = dims.height - padBottom;
  const bodyMaxHeight = Math.max(300, footerY - bodyStartY - 36);

  if (groups.length === 0) {
    drawRoundedRect(ctx, padX, bodyStartY + 40, contentWidth, 240, rowRadius);
    ctx.fillStyle = surface.bgSurface;
    ctx.fill();
    ctx.strokeStyle = surface.borderMedium;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = surface.textPrimary;
    ctx.font = `600 34px ${bodyFont}`;
    ctx.fillText('Sin turnos disponibles en este período', dims.width / 2, bodyStartY + 145);
    ctx.fillStyle = surface.textMuted;
    ctx.font = `400 24px ${bodyFont}`;
    ctx.fillText('Probá seleccionando otro día, semana o mes', dims.width / 2, bodyStartY + 195);
    ctx.restore();
  } else if (input.period === 'day') {
    const dayGroup = pageGroups[0];
    const cardH = Math.min(bodyMaxHeight, 680);
    const cardY = bodyStartY + Math.max(0, (bodyMaxHeight - cardH) / 2 - 20);

    drawRoundedRect(ctx, padX, cardY, contentWidth, cardH, rowRadius);
    ctx.fillStyle = surface.bgSurface;
    ctx.fill();
    ctx.strokeStyle = surface.borderMedium;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = primary;
    ctx.font = `600 132px ${displayFont}`;
    ctx.fillText(dayGroup.dayPadded, dims.width / 2, cardY + 140);

    ctx.fillStyle = surface.textMuted;
    ctx.font = `600 26px ${bodyFont}`;
    ctx.fillText(
      `${dayGroup.weekdayLong.toUpperCase()} · ${dayGroup.monthLong.toUpperCase()}`,
      dims.width / 2,
      cardY + 188
    );

    ctx.strokeStyle = surface.borderSubtle;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padX + 64, cardY + 220);
    ctx.lineTo(padX + contentWidth - 64, cardY + 220);
    ctx.stroke();

    // Time pills grid inside day card
    const cols = 3;
    const pillGap = 18;
    const innerW = contentWidth - 96;
    const pillW = (innerW - pillGap * (cols - 1)) / cols;
    const pillH = 74;
    const startPillX = padX + 48;
    const startPillY = cardY + 256;

    dayGroup.slots.slice(0, 12).forEach((entry, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const px = startPillX + col * (pillW + pillGap);
      const py = startPillY + row * (pillH + pillGap);
      if (py + pillH > cardY + cardH - 28) return;

      drawRoundedRect(ctx, px, py, pillW, pillH, Math.min(24, rowRadius));
      ctx.fillStyle = surface.bgSurfaceElevated;
      ctx.fill();
      ctx.strokeStyle = entry.hasSurcharge ? primary : surface.borderMedium;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = surface.textPrimary;
      ctx.font = `600 32px ${bodyFont}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(entry.time, px + pillW / 2, py + pillH / 2 + 1);
    });
    ctx.restore();
  } else if (isMonthCalendar) {
    // 7-column calendar grid highlighting available days
    const { year, monthIndex } = parseYearMonth(input.anchorDateKey, tz);
    const gridDays = buildCalendarMonthGrid(year, monthIndex);
    const rowsCount = Math.ceil(gridDays.length / 7);
    const colGap = 12;
    const rowGap = 12;
    const cellW = (contentWidth - colGap * 6) / 7;
    const weekdayHeaderH = 42;
    const maxGridH = Math.min(bodyMaxHeight - weekdayHeaderH - 20, input.format === 'story' ? 880 : 620);
    const cellH = Math.floor((maxGridH - rowGap * (rowsCount - 1)) / rowsCount);
    const groupByDate = new Map(groups.map((g) => [g.dateKey, g]));

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 21px ${bodyFont}`;
    ctx.fillStyle = surface.textMuted;

    WEEKDAY_HEADER_LABELS.forEach((wd, idx) => {
      const cx = padX + idx * (cellW + colGap) + cellW / 2;
      ctx.fillText(wd, cx, bodyStartY + 18);
    });

    const primaryRgb = hexToRgb(primary);

    gridDays.forEach((cell, idx) => {
      const col = idx % 7;
      const row = Math.floor(idx / 7);
      const cx = padX + col * (cellW + colGap);
      const cy = bodyStartY + weekdayHeaderH + row * (cellH + rowGap);
      const dayData = groupByDate.get(cell.dateStr);
      const hasSlots = Boolean(cell.isCurrentMonth && dayData && dayData.slots.length > 0);

      drawRoundedRect(ctx, cx, cy, cellW, cellH, Math.min(18, rowRadius));
      if (!cell.isCurrentMonth) {
        ctx.fillStyle = 'transparent';
        ctx.strokeStyle = surface.borderSubtle;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
        return;
      }

      if (hasSlots && dayData) {
        ctx.fillStyle = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${input.mode === 'light' ? 0.12 : 0.22})`;
        ctx.fill();
        ctx.strokeStyle = primary;
        ctx.lineWidth = 2.2;
        ctx.stroke();

        ctx.fillStyle = primary;
        ctx.font = `700 32px ${bodyFont}`;
        ctx.fillText(String(cell.dayNumber), cx + cellW / 2, cy + cellH * 0.36);

        ctx.fillStyle = surface.textPrimary;
        ctx.font = `600 18px ${bodyFont}`;
        const slotCountLabel =
          dayData.slots.length === 1 ? '1 turno' : `${dayData.slots.length} turnos`;
        ctx.fillText(slotCountLabel, cx + cellW / 2, cy + cellH * 0.68);
      } else {
        ctx.fillStyle = surface.bgSurface;
        ctx.fill();
        ctx.strokeStyle = surface.borderSubtle;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = surface.textMuted;
        ctx.font = `500 28px ${bodyFont}`;
        ctx.fillText(String(cell.dayNumber), cx + cellW / 2, cy + cellH / 2);
      }
    });
    ctx.restore();
  } else {
    // Editorial horizontal row list (matching the reference layout)
    const maxSlotsToShow = Math.min(pageGroups.length, MAX_DAYS_PER_LIST_PAGE);
    const gapY = input.format === 'story' ? 30 : 20;
    const rowH = Math.min(138, Math.floor((bodyMaxHeight - gapY * (maxSlotsToShow - 1)) / maxSlotsToShow));
    const totalListH = maxSlotsToShow * rowH + (maxSlotsToShow - 1) * gapY;
    const listStartY = bodyStartY + Math.max(0, Math.floor((bodyMaxHeight - totalListH) / 2));

    pageGroups.slice(0, maxSlotsToShow).forEach((dayGroup, idx) => {
      const ry = listStartY + idx * (rowH + gapY);
      drawRoundedRect(ctx, padX, ry, contentWidth, rowH, rowRadius);
      ctx.fillStyle = surface.bgSurface;
      ctx.fill();
      ctx.strokeStyle = surface.borderMedium;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Left column: big day number + weekday short
      ctx.save();
      ctx.textBaseline = 'middle';
      ctx.fillStyle = primary;
      ctx.font = `700 46px ${bodyFont}`;
      ctx.textAlign = 'left';
      ctx.fillText(dayGroup.dayPadded, padX + 34, ry + rowH / 2 + 1);

      ctx.fillStyle = surface.textMuted;
      ctx.font = `600 22px ${bodyFont}`;
      ctx.fillText(dayGroup.weekdayShort, padX + 106, ry + rowH / 2 + 2);

      // Right column: pipe-separated times
      const timesText = dayGroup.slots.map((s) => s.time);
      const lines = splitTimesIntoLines(timesText, 4);
      ctx.fillStyle = surface.textPrimary;
      ctx.font = `500 ${lines.length > 1 ? 26 : 31}px ${bodyFont}`;
      ctx.textAlign = 'left';

      const timesX = padX + 196;
      if (lines.length === 1) {
        ctx.fillText(lines[0], timesX, ry + rowH / 2 + 1);
      } else if (lines.length >= 2) {
        ctx.fillText(lines[0], timesX, ry + rowH / 2 - 17);
        const secondLine =
          timesText.length > 8 ? `${lines[1]}  (+${timesText.length - 8})` : lines[1];
        ctx.fillText(secondLine, timesX, ry + rowH / 2 + 19);
      }
      ctx.restore();
    });
  }

  // Footer CTA + tenant link (modeled after "» RESERVA AHORA «")
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const ctaY = footerY - 36;
  const ctaText = 'RESERVÁ AHORA';
  ctx.font = `500 28px ${bodyFont}`;
  const ctaWidth = ctx.measureText(ctaText).width;

  ctx.fillStyle = surface.textPrimary;
  ctx.fillText(ctaText, dims.width / 2, ctaY);

  ctx.fillStyle = primary;
  ctx.font = `600 28px ${bodyFont}`;
  ctx.fillText('»', dims.width / 2 - ctaWidth / 2 - 36, ctaY - 1);
  ctx.fillText('«', dims.width / 2 + ctaWidth / 2 + 36, ctaY - 1);

  const igHandle =
    input.showInstagramHandle && input.owner.instagram
      ? input.owner.instagram.startsWith('@')
        ? input.owner.instagram
        : `@${input.owner.instagram}`
      : '';
  const cleanSlug = (input.slug || 'demo').trim();
  const pageSuffix = totalPages > 1 ? ` · ${currentPage + 1}/${totalPages}` : '';
  const footerSub = igHandle
    ? `turneado.app/${cleanSlug} · ${igHandle}${pageSuffix}`
    : `turneado.app/${cleanSlug}${pageSuffix}`;

  ctx.fillStyle = surface.textMuted;
  ctx.font = `500 21px ${bodyFont}`;
  ctx.fillText(footerSub, dims.width / 2, ctaY + 38);
  ctx.restore();

  return { totalPages, currentPage, totalSlotsCount };
};
