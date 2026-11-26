import type { Slot } from '../types';
import {
  BUSINESS_TIMEZONE,
  formatBusinessDateKey,
  formatBusinessTime,
} from '../utils/dateUtils';
import {
  formatCompactDuration,
  resolveSlotDuration,
  resolveSlotFinancials,
} from './bookingHelper';

export type TimelineSlotPhase = 'completed' | 'in_progress' | 'upcoming';
export type TimelineConnectorKind = 'free' | 'back_to_back' | 'overlap';

export interface TimelineConnector {
  kind: TimelineConnectorKind;
  minutes: number;
  label: string;
  fromTime: string;
  toTime: string;
  containsNow: boolean;
}

export interface TimelineEntry {
  slot: Slot;
  startMs: number;
  endMs: number | null;
  durationMinutes: number | null;
  durationLabel: string | null;
  startTime: string;
  endTime: string | null;
  crossesMidnight: boolean;
  phase: TimelineSlotPhase | null;
  remainingMinutes: number | null;
  progressPercent: number | null;
  connectorAfter: TimelineConnector | null;
}

export interface TimelineBarSegment {
  slotId: string;
  clientName: string;
  startTime: string;
  endTime: string;
  durationLabel: string;
  leftPct: number;
  widthPct: number;
  phase: TimelineSlotPhase | null;
}

export interface AgendaDayTimeline {
  dateKey: string;
  isToday: boolean;
  entries: TimelineEntry[];
  totalOccupiedMinutes: number;
  totalOccupiedLabel: string | null;
  totalPendingBalance: number;
  dayStartTime: string | null;
  dayEndTime: string | null;
  dayEndCrossesMidnight: boolean;
  nowTimeLabel: string | null;
  barSegments: TimelineBarSegment[];
  nowMarkerPct: number | null;
}

export const buildAgendaDayTimeline = (
  dateKey: string,
  daySlots: Slot[],
  options: {
    nowMs?: number;
    isToday?: boolean;
    includeGaps?: boolean;
    timeZone?: string;
  } = {}
): AgendaDayTimeline => {
  const {
    nowMs = Date.now(),
    isToday = false,
    includeGaps = true,
    timeZone = BUSINESS_TIMEZONE,
  } = options;

  const sorted = [...daySlots]
    .map((slot) => ({
      slot,
      startMs: new Date(slot.datetime).getTime(),
    }))
    .filter((item) => !isNaN(item.startMs))
    .sort((a, b) => a.startMs - b.startMs);

  const entries: TimelineEntry[] = sorted.map(({ slot, startMs }) => {
    const resolved = resolveSlotDuration(slot);
    const durationMinutes = resolved.minutes;
    const endMs = durationMinutes !== null ? startMs + durationMinutes * 60 * 1000 : null;
    const startTime = formatBusinessTime(startMs, timeZone);
    const endTime = endMs !== null ? formatBusinessTime(endMs, timeZone) : null;
    const crossesMidnight =
      endMs !== null &&
      formatBusinessDateKey(startMs, timeZone) !== formatBusinessDateKey(endMs, timeZone);

    let phase: TimelineSlotPhase | null = null;
    let remainingMinutes: number | null = null;
    let progressPercent: number | null = null;

    if (isToday) {
      if (endMs !== null) {
        if (nowMs >= endMs) {
          phase = 'completed';
        } else if (nowMs >= startMs) {
          phase = 'in_progress';
          remainingMinutes = Math.max(1, Math.ceil((endMs - nowMs) / 60000));
          progressPercent = Math.min(
            100,
            Math.max(0, Math.round(((nowMs - startMs) / (endMs - startMs)) * 100))
          );
        } else {
          phase = 'upcoming';
        }
      } else if (nowMs < startMs) {
        phase = 'upcoming';
      }
    }

    return {
      slot,
      startMs,
      endMs,
      durationMinutes,
      durationLabel: resolved.label,
      startTime,
      endTime,
      crossesMidnight,
      phase,
      remainingMinutes,
      progressPercent,
      connectorAfter: null,
    };
  });

  if (includeGaps) {
    for (let i = 0; i < entries.length - 1; i++) {
      const current = entries[i];
      const next = entries[i + 1];

      if (current.endMs === null || current.endTime === null) {
        continue;
      }

      const diffMinutes = Math.round((next.startMs - current.endMs) / 60000);
      const containsNow =
        isToday && diffMinutes > 0 && nowMs >= current.endMs && nowMs < next.startMs;

      if (diffMinutes > 0) {
        current.connectorAfter = {
          kind: 'free',
          minutes: diffMinutes,
          label: formatCompactDuration(diffMinutes),
          fromTime: current.endTime,
          toTime: next.startTime,
          containsNow,
        };
      } else if (diffMinutes === 0) {
        current.connectorAfter = {
          kind: 'back_to_back',
          minutes: 0,
          label: '',
          fromTime: current.endTime,
          toTime: next.startTime,
          containsNow: false,
        };
      } else {
        const overlapMinutes = Math.abs(diffMinutes);
        current.connectorAfter = {
          kind: 'overlap',
          minutes: overlapMinutes,
          label: formatCompactDuration(overlapMinutes),
          fromTime: next.startTime,
          toTime: current.endTime,
          containsNow: false,
        };
      }
    }
  }

  const totalOccupiedMinutes = entries.reduce(
    (sum, entry) => sum + (entry.durationMinutes ?? 0),
    0
  );
  const totalOccupiedLabel =
    totalOccupiedMinutes > 0 ? formatCompactDuration(totalOccupiedMinutes) : null;
  const totalPendingBalance = entries.reduce(
    (sum, entry) => sum + (resolveSlotFinancials(entry.slot).pendingBalance ?? 0),
    0
  );

  const timedEntries = entries.filter(
    (entry): entry is TimelineEntry & { endMs: number; endTime: string } =>
      entry.endMs !== null && entry.endTime !== null
  );

  let dayStartTime: string | null = entries.length > 0 ? entries[0].startTime : null;
  let dayEndTime: string | null = null;
  let dayEndCrossesMidnight = false;
  let barSegments: TimelineBarSegment[] = [];
  let nowMarkerPct: number | null = null;

  if (timedEntries.length > 0) {
    const dayStartMs = Math.min(...entries.map((e) => e.startMs));
    const dayEndMs = Math.max(...timedEntries.map((e) => e.endMs));
    dayStartTime = formatBusinessTime(dayStartMs, timeZone);
    dayEndTime = formatBusinessTime(dayEndMs, timeZone);
    dayEndCrossesMidnight =
      formatBusinessDateKey(dayStartMs, timeZone) !== formatBusinessDateKey(dayEndMs, timeZone);

    const spanMs = dayEndMs - dayStartMs;
    if (includeGaps && spanMs > 0) {
      barSegments = timedEntries.map((entry) => {
        const rawLeft = ((entry.startMs - dayStartMs) / spanMs) * 100;
        const rawWidth = ((entry.endMs - entry.startMs) / spanMs) * 100;
        const leftPct = Math.min(98, Math.max(0, Number(rawLeft.toFixed(2))));
        const widthPct = Math.min(
          100 - leftPct,
          Math.max(2, Number(rawWidth.toFixed(2)))
        );

        return {
          slotId: entry.slot.id,
          clientName: entry.slot.clientData?.name || '',
          startTime: entry.startTime,
          endTime: entry.endTime,
          durationLabel: entry.durationLabel || '',
          leftPct,
          widthPct,
          phase: entry.phase,
        };
      });

      if (isToday && nowMs >= dayStartMs && nowMs <= dayEndMs) {
        nowMarkerPct = Number((((nowMs - dayStartMs) / spanMs) * 100).toFixed(2));
      }
    }
  }

  return {
    dateKey,
    isToday,
    entries,
    totalOccupiedMinutes,
    totalOccupiedLabel,
    totalPendingBalance,
    dayStartTime,
    dayEndTime,
    dayEndCrossesMidnight,
    nowTimeLabel: isToday ? formatBusinessTime(nowMs, timeZone) : null,
    barSegments,
    nowMarkerPct,
  };
};
