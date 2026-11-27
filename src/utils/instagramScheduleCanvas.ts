import type { OwnerInfo, Slot, TenantAppearanceConfig } from '../types';
import { filterClientAvailableSlots } from '../services/schedulingService';
import {
  awaitFontPairingReady,
  buildCanvasAppearanceTokens,
  hexToRgb,
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
import {
  drawStyledCanvasCard,
  paintTenantBackgroundToCanvas,
  resolveCanvasLogoRadius,
} from './canvasAppearance';
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
export const MAX_DAYS_PER_LIST_PAGE = 7;

export interface InstagramLayoutMetrics {
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
  padX: number;
  contentWidth: number;
  brandChipHeight: number;
  brandChipGap: number;
  titleTopY: number;
  scriptFontSize: number;
  scriptOffsetY: number;
  displayFontSize: number;
  displayOffsetY: number;
  subtitleFontSize: number;
  subtitleOffsetY: number;
  headerBottomY: number;
  bodyStartY: number;
  footerTopY: number;
  ctaY: number;
  footerSubY: number;
  ctaFontSize: number;
  footerSubFontSize: number;
  bodyMaxHeight: number;
  listGapY: number;
  maxRowHeight: number;
}

export const getListPageSize = (
  _period: InstagramPeriodMode,
  _format: InstagramFormatMode
): number => MAX_DAYS_PER_LIST_PAGE;

export const computeInstagramLayoutMetrics = (options: {
  format: InstagramFormatMode;
  showBrandHeader: boolean;
  daysCount?: number;
}): InstagramLayoutMetrics => {
  const isStory = options.format === 'story';
  const dims = isStory ? STORY_DIMENSIONS : FEED_DIMENSIONS;
  const safeTop = isStory ? 250 : 52;
  const safeBottom = isStory ? 300 : 56;
  const padX = isStory ? 56 : 52;
  const contentWidth = dims.width - padX * 2;

  const brandChipHeight = isStory ? 44 : 40;
  const brandChipGap = isStory ? 22 : 14;
  const titleTopY = options.showBrandHeader
    ? safeTop + brandChipHeight + brandChipGap
    : safeTop;

  const scriptFontSize = isStory ? 56 : 44;
  const scriptOffsetY = isStory ? 42 : 34;
  const displayFontSize = isStory ? 88 : 72;
  const displayOffsetY = isStory ? 118 : 96;
  const subtitleFontSize = isStory ? 22 : 20;
  const subtitleOffsetY = isStory ? 152 : 126;
  const headerBottomY = titleTopY + (isStory ? 162 : 134);
  const headerBodyGap = isStory ? 24 : 18;
  const bodyStartY = headerBottomY + headerBodyGap;

  const footerBottomY = dims.height - safeBottom;
  const footerSubFontSize = isStory ? 21 : 20;
  const ctaFontSize = isStory ? 28 : 25;
  const footerSubY = footerBottomY - (isStory ? 12 : 10);
  const ctaY = footerSubY - (isStory ? 38 : 34);
  const footerTopY = ctaY - (isStory ? 22 : 18);
  const bodyFooterGap = isStory ? 24 : 20;

  const bodyMaxHeight = Math.max(260, footerTopY - bodyFooterGap - bodyStartY);
  const daysCount = options.daysCount ?? MAX_DAYS_PER_LIST_PAGE;
  const listGapY = isStory ? (daysCount >= 7 ? 16 : 22) : daysCount >= 7 ? 12 : 16;
  const maxRowHeight = isStory ? 152 : 144;

  return {
    width: dims.width,
    height: dims.height,
    safeTop,
    safeBottom,
    padX,
    contentWidth,
    brandChipHeight,
    brandChipGap,
    titleTopY,
    scriptFontSize,
    scriptOffsetY,
    displayFontSize,
    displayOffsetY,
    subtitleFontSize,
    subtitleOffsetY,
    headerBottomY,
    bodyStartY,
    footerTopY,
    ctaY,
    footerSubY,
    ctaFontSize,
    footerSubFontSize,
    bodyMaxHeight,
    listGapY,
    maxRowHeight,
  };
};

export interface WrappedTimeLinesResult {
  lines: string[];
  overflowCount: number;
}

export const wrapTimeEntriesToLines = (
  times: readonly string[],
  maxWidth: number,
  measureText: (text: string) => number,
  maxLines = 2,
  separator = '  |  '
): WrappedTimeLinesResult => {
  if (times.length === 0 || maxLines <= 0) {
    return { lines: [], overflowCount: times.length };
  }

  const lines: string[][] = [[]];
  let consumedCount = 0;

  for (let i = 0; i < times.length; i++) {
    const entry = times[i];
    const currentLine = lines[lines.length - 1];
    const candidate =
      currentLine.length === 0 ? entry : `${currentLine.join(separator)}${separator}${entry}`;

    if (currentLine.length === 0 || measureText(candidate) <= maxWidth) {
      currentLine.push(entry);
      consumedCount++;
    } else if (lines.length < maxLines) {
      lines.push([entry]);
      consumedCount++;
    } else {
      break;
    }
  }

  let overflowCount = times.length - consumedCount;
  if (overflowCount > 0) {
    const lastLine = lines[lines.length - 1];
    while (lastLine.length > 0) {
      const suffix = `  (+${overflowCount})`;
      const candidate = `${lastLine.join(separator)}${suffix}`;
      if (measureText(candidate) <= maxWidth || lastLine.length === 1) {
        break;
      }
      lastLine.pop();
      overflowCount++;
    }
  }

  const renderedLines = lines
    .filter((line) => line.length > 0)
    .map((line, index, arr) => {
      const joined = line.join(separator);
      if (index === arr.length - 1 && overflowCount > 0) {
        return `${joined}  (+${overflowCount})`;
      }
      return joined;
    });

  return { lines: renderedLines, overflowCount };
};

const WEEKDAY_HEADER_LABELS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'] as const;

const capitalize = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

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

  if (groups.length > 0) {
    const firstMonth = capitalize(groups[0].monthLong || formatDateKeyParts(groups[0].dateKey).monthLong);
    const lastGroup = groups[groups.length - 1];
    const lastMonth = capitalize(lastGroup.monthLong || formatDateKeyParts(lastGroup.dateKey).monthLong);

    if (firstMonth && lastMonth && firstMonth.toLowerCase() !== lastMonth.toLowerCase()) {
      return {
        scriptMonth: `${firstMonth} - ${lastMonth}`,
        subtitle: 'DISPONIBLES',
      };
    }

    return {
      scriptMonth: firstMonth || capitalize(parts.monthLong),
      subtitle: 'DISPONIBLES',
    };
  }

  if (period === 'week') {
    const range = buildInstagramPeriodRange('week', anchorDateKey, tz);
    const startMonth = capitalize(formatDateKeyParts(range.startDateKey).monthLong);
    const endMonth = capitalize(formatDateKeyParts(range.endDateKey).monthLong);
    if (startMonth && endMonth && startMonth.toLowerCase() !== endMonth.toLowerCase()) {
      return {
        scriptMonth: `${startMonth} - ${endMonth}`,
        subtitle: 'DISPONIBLES',
      };
    }
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

export const renderInstagramScheduleToCanvas = async (
  canvas: HTMLCanvasElement,
  input: RenderInstagramScheduleInput
): Promise<{ totalPages: number; currentPage: number; totalSlotsCount: number }> => {
  const tokens = buildCanvasAppearanceTokens(input.appearance, input.mode);
  const { config, primary, radii, displayFont, bodyFont } = tokens;
  await awaitFontPairingReady(config.fontPairing);

  const dims = input.format === 'story' ? STORY_DIMENSIONS : FEED_DIMENSIONS;
  canvas.width = dims.width;
  canvas.height = dims.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { totalPages: 1, currentPage: 0, totalSlotsCount: 0 };
  }

  const tz = input.timeZone || BUSINESS_TIMEZONE;
  const rowRadius = Math.min(34, Math.round(radii.lg * 1.25));
  const chipRadius = radii.chip >= 999 ? 999 : Math.max(4, Math.round(radii.chip * 2));
  const cellRadius = Math.min(20, Math.round(radii.md * 1.2));

  paintTenantBackgroundToCanvas(ctx, dims.width, dims.height, tokens);

  const groups = groupAvailableSlotsForInstagram(input.slots, {
    period: input.period,
    anchorDateKey: input.anchorDateKey,
    timeZone: tz,
    nowMs: input.nowMs,
  });

  const totalSlotsCount = groups.reduce((acc, g) => acc + g.slots.length, 0);
  const isMonthCalendar = input.period === 'month' && input.monthDisplay === 'calendar';
  const listPageSize = getListPageSize(input.period, input.format);
  const pages = isMonthCalendar
    ? [groups]
    : paginateInstagramDayGroups(groups, listPageSize);
  const totalPages = Math.max(1, pages.length);
  const currentPage = Math.min(Math.max(0, input.pageIndex ?? 0), totalPages - 1);
  const pageGroups = pages[currentPage] || [];

  const brandName = (input.owner.businessName || input.owner.name || '').trim();
  const hasBrandHeader = input.showBrandHeader !== false && Boolean(brandName);
  const layout = computeInstagramLayoutMetrics({
    format: input.format,
    showBrandHeader: hasBrandHeader,
    daysCount: pageGroups.length || MAX_DAYS_PER_LIST_PAGE,
  });

  const { padX, contentWidth, bodyStartY, bodyMaxHeight } = layout;
  const headline = resolvePeriodHeadline(
    input.period,
    input.anchorDateKey,
    pageGroups.length > 0 ? pageGroups : groups,
    tz
  );

  // Optional subtle top brand chip
  if (hasBrandHeader) {
    const logoImg = input.owner.logoUrl ? await loadImageSafe(input.owner.logoUrl) : null;
    ctx.save();
    const chipFontSize = input.format === 'story' ? 21 : 19;
    ctx.font = `600 ${chipFontSize}px ${bodyFont}`;
    const labelText = brandName.toUpperCase();
    const textW = ctx.measureText(labelText).width;
    const iconSize = input.format === 'story' ? 28 : 24;
    const chipW = Math.min(contentWidth, textW + (logoImg ? iconSize + 52 : 48));
    const chipX = (dims.width - chipW) / 2;
    const chipY = layout.safeTop;
    const chipH = layout.brandChipHeight;

    drawStyledCanvasCard(ctx, chipX, chipY, chipW, chipH, chipRadius, tokens, {
      stroke: tokens.surfaceStroke === 'transparent' ? 'transparent' : tokens.borderSubtle,
      lineWidth: 1.5,
    });

    let textCenterX = dims.width / 2;
    let maxLabelW = chipW - 36;
    if (logoImg) {
      const startX = chipX + 12;
      const iconY = chipY + (chipH - iconSize) / 2;
      const logoRadius = resolveCanvasLogoRadius(config.logoShape, iconSize);
      ctx.save();
      if (logoRadius > 0) {
        drawRoundedRect(ctx, startX, iconY, iconSize, iconSize, logoRadius);
        ctx.clip();
      }
      ctx.drawImage(logoImg, startX, iconY, iconSize, iconSize);
      ctx.restore();
      maxLabelW = chipW - iconSize - 38;
      textCenterX = startX + iconSize + 10 + Math.min(textW, maxLabelW) / 2;
    }

    ctx.fillStyle = tokens.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, textCenterX, chipY + chipH / 2 + 1, maxLabelW);
    ctx.restore();
  }

  // Editorial Script + Display Title
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.font = `italic 500 ${layout.scriptFontSize}px ${displayFont}`;
  const scriptMaxWidth = contentWidth * 0.94;
  const measuredScriptW = ctx.measureText(headline.scriptMonth).width;
  if (measuredScriptW > scriptMaxWidth && measuredScriptW > 0) {
    const fittedSize = Math.max(
      28,
      Math.floor((layout.scriptFontSize * scriptMaxWidth) / measuredScriptW)
    );
    ctx.font = `italic 500 ${fittedSize}px ${displayFont}`;
  }
  ctx.fillStyle = primary;
  ctx.fillText(headline.scriptMonth, dims.width / 2, layout.titleTopY + layout.scriptOffsetY, scriptMaxWidth);

  ctx.font = `500 ${layout.displayFontSize}px ${displayFont}`;
  ctx.fillStyle = tokens.textPrimary;
  ctx.fillText('TURNOS', dims.width / 2, layout.titleTopY + layout.displayOffsetY);

  ctx.font = `600 ${layout.subtitleFontSize}px ${bodyFont}`;
  ctx.fillStyle = tokens.textSecondary;
  const subLabel =
    input.period === 'day'
      ? `DISPONIBLES · ${headline.subtitle.toUpperCase()}`
      : 'D I S P O N I B L E S';
  ctx.fillText(subLabel, dims.width / 2, layout.titleTopY + layout.subtitleOffsetY);
  ctx.restore();

  if (groups.length === 0) {
    const emptyH = 240;
    const emptyY = bodyStartY + Math.max(0, Math.floor((bodyMaxHeight - emptyH) / 2));
    drawStyledCanvasCard(ctx, padX, emptyY, contentWidth, emptyH, rowRadius, tokens, {
      lineWidth: 2,
    });

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = tokens.textPrimary;
    ctx.font = `600 34px ${bodyFont}`;
    ctx.fillText('Sin turnos disponibles en este período', dims.width / 2, emptyY + 105);
    ctx.fillStyle = tokens.textMuted;
    ctx.font = `400 24px ${bodyFont}`;
    ctx.fillText('Probá seleccionando otro día, semana o mes', dims.width / 2, emptyY + 155);
    ctx.restore();
  } else if (input.period === 'day') {
    const dayGroup = pageGroups[0];
    const cardH = Math.min(bodyMaxHeight, 680);
    const cardY = bodyStartY + Math.max(0, Math.floor((bodyMaxHeight - cardH) / 2));

    drawStyledCanvasCard(ctx, padX, cardY, contentWidth, cardH, rowRadius, tokens, {
      lineWidth: 2,
    });

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = primary;
    ctx.font = `600 132px ${displayFont}`;
    ctx.fillText(dayGroup.dayPadded, dims.width / 2, cardY + 140);

    ctx.fillStyle = tokens.textMuted;
    ctx.font = `600 26px ${bodyFont}`;
    ctx.fillText(
      `${dayGroup.weekdayLong.toUpperCase()} · ${dayGroup.monthLong.toUpperCase()}`,
      dims.width / 2,
      cardY + 188
    );

    ctx.strokeStyle = tokens.borderSubtle;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padX + 64, cardY + 220);
    ctx.lineTo(padX + contentWidth - 64, cardY + 220);
    ctx.stroke();

    // Time slots grid inside day card
    const cols = 3;
    const pillGap = 18;
    const innerW = contentWidth - 96;
    const pillW = (innerW - pillGap * (cols - 1)) / cols;
    const pillH = 74;
    const startPillX = padX + 48;
    const startPillY = cardY + 256;
    const slotPillRadius = Math.min(26, chipRadius);

    dayGroup.slots.slice(0, 12).forEach((entry, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const px = startPillX + col * (pillW + pillGap);
      const py = startPillY + row * (pillH + pillGap);
      if (py + pillH > cardY + cardH - 28) return;

      drawRoundedRect(ctx, px, py, pillW, pillH, slotPillRadius);
      ctx.fillStyle = tokens.surfaceElevatedFill;
      ctx.fill();
      if (entry.hasSurcharge || tokens.surfaceStroke !== 'transparent') {
        ctx.strokeStyle = entry.hasSurcharge ? primary : tokens.surfaceStroke;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      ctx.fillStyle = tokens.textPrimary;
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
    const weekdayHeaderH = 40;
    const maxGridH = Math.min(
      bodyMaxHeight - weekdayHeaderH - 8,
      input.format === 'story' ? 920 : 780
    );
    const cellH = Math.floor((maxGridH - rowGap * (rowsCount - 1)) / rowsCount);
    const totalCalendarH = weekdayHeaderH + rowsCount * cellH + (rowsCount - 1) * rowGap;
    const calendarStartY =
      bodyStartY + Math.max(0, Math.floor((bodyMaxHeight - totalCalendarH) / 2));
    const groupByDate = new Map(groups.map((g) => [g.dateKey, g]));

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 21px ${bodyFont}`;
    ctx.fillStyle = tokens.textMuted;

    WEEKDAY_HEADER_LABELS.forEach((wd, idx) => {
      const cx = padX + idx * (cellW + colGap) + cellW / 2;
      ctx.fillText(wd, cx, calendarStartY + 18);
    });

    const primaryRgb = hexToRgb(primary);

    gridDays.forEach((cell, idx) => {
      const col = idx % 7;
      const row = Math.floor(idx / 7);
      const cx = padX + col * (cellW + colGap);
      const cy = calendarStartY + weekdayHeaderH + row * (cellH + rowGap);
      const dayData = groupByDate.get(cell.dateStr);
      const hasSlots = Boolean(cell.isCurrentMonth && dayData && dayData.slots.length > 0);

      drawRoundedRect(ctx, cx, cy, cellW, cellH, cellRadius);
      if (!cell.isCurrentMonth) {
        ctx.fillStyle = 'transparent';
        ctx.strokeStyle = tokens.borderSubtle;
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

        ctx.fillStyle = tokens.textPrimary;
        ctx.font = `600 18px ${bodyFont}`;
        const slotCountLabel =
          dayData.slots.length === 1 ? '1 turno' : `${dayData.slots.length} turnos`;
        ctx.fillText(slotCountLabel, cx + cellW / 2, cy + cellH * 0.68);
      } else {
        ctx.fillStyle = tokens.surfaceFill;
        ctx.fill();
        if (tokens.surfaceStroke !== 'transparent') {
          ctx.strokeStyle = tokens.borderSubtle;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        ctx.fillStyle = tokens.textMuted;
        ctx.font = `500 28px ${bodyFont}`;
        ctx.fillText(String(cell.dayNumber), cx + cellW / 2, cy + cellH / 2);
      }
    });
    ctx.restore();
  } else {
    // Editorial horizontal row list (up to 7 days on a single sheet in both Story and Feed)
    const maxSlotsToShow = Math.min(pageGroups.length, listPageSize);
    const gapY = layout.listGapY;
    const rowH = Math.min(
      layout.maxRowHeight,
      Math.floor((bodyMaxHeight - gapY * (maxSlotsToShow - 1)) / maxSlotsToShow)
    );
    const totalListH = maxSlotsToShow * rowH + (maxSlotsToShow - 1) * gapY;
    const listStartY = bodyStartY + Math.max(0, Math.floor((bodyMaxHeight - totalListH) / 2));

    const dateColWidth = 122;
    const dateCenterX = padX + dateColWidth / 2;
    const dividerX = padX + dateColWidth;
    const timesX = dividerX + 24;
    const timesMaxWidth = contentWidth - dateColWidth - 48;

    const dayFontSize = rowH >= 134 ? 44 : 40;
    const weekdayFontSize = rowH >= 134 ? 20 : 18;
    const singleLineFontSize = rowH >= 134 ? 30 : 28;
    const twoLineFontSize = rowH >= 134 ? 26 : 24;
    const threeLineFontSize = 22;

    pageGroups.slice(0, maxSlotsToShow).forEach((dayGroup, idx) => {
      const ry = listStartY + idx * (rowH + gapY);
      drawStyledCanvasCard(ctx, padX, ry, contentWidth, rowH, rowRadius, tokens, {
        lineWidth: 1.8,
      });

      ctx.save();
      // Left stacked date column
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = primary;
      ctx.font = `700 ${dayFontSize}px ${bodyFont}`;
      ctx.fillText(dayGroup.dayPadded, dateCenterX, ry + rowH * 0.4);

      ctx.fillStyle = tokens.textMuted;
      ctx.font = `600 ${weekdayFontSize}px ${bodyFont}`;
      ctx.fillText(dayGroup.weekdayShort, dateCenterX, ry + rowH * 0.72);

      // Subtle vertical divider between date block and time slots
      ctx.strokeStyle = tokens.borderSubtle;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(dividerX, ry + 18);
      ctx.lineTo(dividerX, ry + rowH - 18);
      ctx.stroke();

      // Right column: width-measured wrapped times
      const timesText = dayGroup.slots.map((s) => s.time);
      const measureWithFont = (fontSize: number) => (text: string) => {
        ctx.font = `500 ${fontSize}px ${bodyFont}`;
        return ctx.measureText(text).width;
      };

      let chosenFontSize = singleLineFontSize;
      let wrapped = wrapTimeEntriesToLines(
        timesText,
        timesMaxWidth,
        measureWithFont(singleLineFontSize),
        1
      );

      if (wrapped.overflowCount > 0) {
        chosenFontSize = twoLineFontSize;
        wrapped = wrapTimeEntriesToLines(
          timesText,
          timesMaxWidth,
          measureWithFont(twoLineFontSize),
          2
        );
      }

      if (wrapped.overflowCount > 0 && rowH >= 118) {
        const threeLineAttempt = wrapTimeEntriesToLines(
          timesText,
          timesMaxWidth,
          measureWithFont(threeLineFontSize),
          3
        );
        if (threeLineAttempt.overflowCount < wrapped.overflowCount) {
          chosenFontSize = threeLineFontSize;
          wrapped = threeLineAttempt;
        }
      }

      ctx.fillStyle = tokens.textPrimary;
      ctx.font = `500 ${chosenFontSize}px ${bodyFont}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const lineHeight =
        wrapped.lines.length >= 3 ? 30 : Math.round(chosenFontSize * 1.42);
      const totalTextH = (wrapped.lines.length - 1) * lineHeight;
      const firstLineY = ry + rowH / 2 - totalTextH / 2 + 1;

      wrapped.lines.forEach((line, lineIdx) => {
        ctx.fillText(line, timesX, firstLineY + lineIdx * lineHeight, timesMaxWidth);
      });
      ctx.restore();
    });
  }

  // Footer CTA + tenant link (strictly inside Instagram safe zone)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const ctaText = 'RESERVÁ AHORA';
  ctx.font = `500 ${layout.ctaFontSize}px ${bodyFont}`;
  const ctaWidth = ctx.measureText(ctaText).width;

  ctx.fillStyle = tokens.textPrimary;
  ctx.fillText(ctaText, dims.width / 2, layout.ctaY);

  ctx.fillStyle = primary;
  ctx.font = `600 ${layout.ctaFontSize}px ${bodyFont}`;
  ctx.fillText('»', dims.width / 2 - ctaWidth / 2 - 32, layout.ctaY - 1);
  ctx.fillText('«', dims.width / 2 + ctaWidth / 2 + 32, layout.ctaY - 1);

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

  ctx.fillStyle = tokens.textMuted;
  ctx.font = `500 ${layout.footerSubFontSize}px ${bodyFont}`;
  ctx.fillText(footerSub, dims.width / 2, layout.footerSubY, contentWidth);
  ctx.restore();

  return { totalPages, currentPage, totalSlotsCount };
};
