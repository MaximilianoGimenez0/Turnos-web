import { describe, it, expect } from 'vitest';
import type { Slot } from '../../src/types';
import { buildAgendaDayTimeline } from '../../src/services/agendaTimeline';
import { BUSINESS_TIMEZONE, buildBusinessIsoFromInputs } from '../../src/utils/dateUtils';

const makeSlot = (
  id: string,
  hour: number,
  minute: number,
  durationMinutes?: number,
  extra?: Partial<Slot>,
  timeZone = BUSINESS_TIMEZONE
): Slot => {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  const dt = buildBusinessIsoFromInputs('2026-11-22', `${hh}:${mm}`, timeZone);
  return {
    id,
    datetime: dt,
    depositAmount: 5000,
    status: 'confirmed',
    estimatedDurationMinutes: durationMinutes,
    clientData: {
      name: `Cliente ${id}`,
      phone: '1122334455',
      estimatedDurationMinutes: durationMinutes,
    },
    ...extra,
  };
};

describe('agendaTimeline - buildAgendaDayTimeline', () => {
  it('computes start/end times, free gaps, back-to-back connectors, and proportional bar segments', () => {
    const s1 = makeSlot('1', 9, 0, 90, {
      clientData: { name: 'Cliente 1', phone: '1122334455', estimatedDurationMinutes: 90, estimatedPrice: 24000 },
    });
    const s2 = makeSlot('2', 11, 30, 60, {
      clientData: { name: 'Cliente 2', phone: '1122334455', estimatedDurationMinutes: 60, estimatedPrice: 15000 },
    });
    const s3 = makeSlot('3', 12, 30, 60, {
      clientData: { name: 'Cliente 3', phone: '1122334455', estimatedDurationMinutes: 60, estimatedPrice: 5000 },
    });

    const timeline = buildAgendaDayTimeline('2026-11-22', [s3, s1, s2], {
      isToday: false,
      includeGaps: true,
    });

    expect(timeline.entries.map((e) => e.slot.id)).toEqual(['1', '2', '3']);
    expect(timeline.entries[0].startTime).toBe('09:00');
    expect(timeline.entries[0].endTime).toBe('10:30');
    expect(timeline.entries[0].durationLabel).toBe('1h 30m');

    expect(timeline.entries[0].connectorAfter).toEqual({
      kind: 'free',
      minutes: 60,
      label: '1h',
      fromTime: '10:30',
      toTime: '11:30',
      containsNow: false,
    });

    expect(timeline.entries[1].connectorAfter).toEqual({
      kind: 'back_to_back',
      minutes: 0,
      label: '',
      fromTime: '12:30',
      toTime: '12:30',
      containsNow: false,
    });

    expect(timeline.entries[2].connectorAfter).toBeNull();
    expect(timeline.totalOccupiedMinutes).toBe(210);
    expect(timeline.totalOccupiedLabel).toBe('3h 30m');
    expect(timeline.totalPendingBalance).toBe(29000);
    expect(timeline.dayStartTime).toBe('09:00');
    expect(timeline.dayEndTime).toBe('13:30');
    expect(timeline.barSegments).toHaveLength(3);
    expect(timeline.barSegments[0].leftPct).toBe(0);
    expect(timeline.barSegments[2].leftPct + timeline.barSegments[2].widthPct).toBeCloseTo(100, 1);
  });

  it('detects live phases (completed, in_progress, upcoming) and now divider in free gaps for today', () => {
    const s1 = makeSlot('1', 9, 0, 60);
    const s2 = makeSlot('2', 11, 0, 60);
    const s3 = makeSlot('3', 14, 0, 30);

    // 11:15 -> s1 completed, s2 in_progress (25%, 45m left), s3 upcoming
    const nowDuringSecond = new Date(
      buildBusinessIsoFromInputs('2026-11-22', '11:15', BUSINESS_TIMEZONE)
    ).getTime();
    const t1 = buildAgendaDayTimeline('2026-11-22', [s1, s2, s3], {
      nowMs: nowDuringSecond,
      isToday: true,
      includeGaps: true,
    });

    expect(t1.entries[0].phase).toBe('completed');
    expect(t1.entries[1].phase).toBe('in_progress');
    expect(t1.entries[1].remainingMinutes).toBe(45);
    expect(t1.entries[1].progressPercent).toBe(25);
    expect(t1.entries[2].phase).toBe('upcoming');
    expect(t1.nowMarkerPct).toBeGreaterThan(0);
    expect(t1.nowMarkerPct).toBeLessThan(100);

    // 10:30 -> falls inside free gap between s1 (ends 10:00) and s2 (starts 11:00)
    const nowInGap = new Date(
      buildBusinessIsoFromInputs('2026-11-22', '10:30', BUSINESS_TIMEZONE)
    ).getTime();
    const t2 = buildAgendaDayTimeline('2026-11-22', [s1, s2, s3], {
      nowMs: nowInGap,
      isToday: true,
      includeGaps: true,
    });
    expect(t2.entries[0].connectorAfter?.containsNow).toBe(true);
    expect(t2.entries[1].connectorAfter?.containsNow).toBe(false);
  });

  it('hides gaps and occupancy bar when includeGaps is false (active search)', () => {
    const s1 = makeSlot('1', 9, 0, 60);
    const s2 = makeSlot('2', 15, 0, 60);

    const timeline = buildAgendaDayTimeline('2026-11-22', [s1, s2], {
      includeGaps: false,
    });

    expect(timeline.entries[0].connectorAfter).toBeNull();
    expect(timeline.barSegments).toHaveLength(0);
  });

  it('handles overlap anomalies, midnight crossings, and missing numeric durations safely', () => {
    const sOverlapA = makeSlot('a', 10, 0, 90);
    const sOverlapB = makeSlot('b', 11, 0, 60);

    const overlapTimeline = buildAgendaDayTimeline('2026-11-22', [sOverlapA, sOverlapB]);
    expect(overlapTimeline.entries[0].connectorAfter).toEqual({
      kind: 'overlap',
      minutes: 30,
      label: '30 min',
      fromTime: '11:00',
      toTime: '11:30',
      containsNow: false,
    });

    const lateSlot = makeSlot('late', 23, 30, 60);
    const midnightTimeline = buildAgendaDayTimeline('2026-11-22', [lateSlot]);
    expect(midnightTimeline.entries[0].endTime).toBe('00:30');
    expect(midnightTimeline.entries[0].crossesMidnight).toBe(true);
    expect(midnightTimeline.dayEndCrossesMidnight).toBe(true);

    const untimedSlot: Slot = {
      id: 'untimed',
      datetime: new Date(2026, 10, 22, 15, 0, 0).toISOString(),
      depositAmount: 5000,
      status: 'confirmed',
      clientData: { name: 'Legacy', phone: '11111111' },
    };
    const untimedTimeline = buildAgendaDayTimeline('2026-11-22', [untimedSlot]);
    expect(untimedTimeline.entries[0].endTime).toBeNull();
    expect(untimedTimeline.entries[0].durationLabel).toBeNull();
    expect(untimedTimeline.barSegments).toHaveLength(0);
  });

  it('respeta timeZone del tenant para horarios y cruce de medianoche (America/Mexico_City)', () => {
    const mxSlot = makeSlot('mx-1', 23, 30, 60, undefined, 'America/Mexico_City');
    const mxTimeline = buildAgendaDayTimeline('2026-11-22', [mxSlot], {
      timeZone: 'America/Mexico_City',
    });

    expect(mxTimeline.entries[0].startTime).toBe('23:30');
    expect(mxTimeline.entries[0].endTime).toBe('00:30');
    expect(mxTimeline.entries[0].crossesMidnight).toBe(true);
    expect(mxTimeline.dayEndCrossesMidnight).toBe(true);
  });
});
