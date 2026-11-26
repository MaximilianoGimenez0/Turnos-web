import { describe, it, expect } from 'vitest';
import {
  HOLIDAYS_DATASET,
  formatHolidaySummary,
  getHolidayInfo,
  getHolidaysInMonth,
  isHoliday,
} from '../../src/utils/holidays';
import {
  normalizeHolidayType,
  parseSyncHolidaysArgs,
  transformOfficialHolidaysDataset,
} from '../../scripts/sync-holidays.mjs';

describe('holidays - Catálogo estático 2026, helpers y script holidays:sync', () => {
  it('carga src/data/holidays.json con fechas YYYY-MM-DD válidas, ordenadas y UTF-8 limpio', () => {
    expect(HOLIDAYS_DATASET.year).toBe(2026);
    expect(HOLIDAYS_DATASET.country).toBe('AR');
    expect(HOLIDAYS_DATASET.holidays.length).toBeGreaterThanOrEqual(15);

    let prevDate = '';
    for (const h of HOLIDAYS_DATASET.holidays) {
      expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(h.name.length).toBeGreaterThan(0);
      expect(h.name).not.toMatch(/Ã±|Ã­|Ã³|Ã¡|Ã©|Ãº/);
      expect(h.date >= prevDate).toBe(true);
      prevDate = h.date;
    }

    const newYear = getHolidayInfo('2026-01-01');
    expect(newYear?.name).toBe('Año Nuevo');
    expect(newYear?.type).toBe('inamovible');
  });

  it('resuelve isHoliday y getHolidayInfo tanto por DateKey como por ISO UTC respetando timeZone', () => {
    expect(isHoliday('2026-01-01')).toBe(true);
    expect(isHoliday('2026-05-25')).toBe(true);
    expect(isHoliday('2026-05-26')).toBe(false);
    expect(getHolidayInfo('')).toBeNull();
    expect(getHolidayInfo(null)).toBeNull();

    // 2026-05-25T02:00:00.000Z es 24 may 23:00 en Buenos Aires (no feriado), pero 25 may 04:00 en Madrid (feriado)
    const borderIso = '2026-05-25T02:00:00.000Z';
    expect(isHoliday(borderIso, 'America/Argentina/Buenos_Aires')).toBe(false);
    expect(isHoliday(borderIso, 'Europe/Madrid')).toBe(true);
    expect(formatHolidaySummary(getHolidayInfo('2026-05-25')!)).toContain('Revolución de Mayo');
  });

  it('filtra feriados por mes calendario (0-indexed)', () => {
    const mayHolidays = getHolidaysInMonth(2026, 4); // Mayo = 4
    expect(mayHolidays.some((h) => h.date === '2026-05-01')).toBe(true);
    expect(mayHolidays.some((h) => h.date === '2026-05-25')).toBe(true);
  });

  it('transformOfficialHolidaysDataset normaliza Schema.org, tipos, deduplica y ordena', () => {
    const raw = {
      additionalProperty: { name: 'timezone', value: 'America/Argentina/Buenos_Aires' },
      mainEntity: {
        itemListElement: [
          {
            item: {
              name: 'Día de la Independencia',
              description: 'Feriado inamovible',
              additionalProperty: { name: 'tipo', value: 'inamovible' },
              startDate: '2026-07-09',
            },
          },
          {
            item: {
              name: 'Año Nuevo',
              description: 'Feriado inamovible',
              additionalProperty: { name: 'tipo', value: 'inamovible' },
              startDate: '2026-01-01',
            },
          },
          {
            item: {
              name: 'Feriado con fines turísticos',
              description: 'Feriado turístico',
              additionalProperty: { name: 'tipo', value: 'puente' },
              startDate: '2026-07-10',
            },
          },
          {
            item: {
              name: 'Fecha inválida',
              startDate: 'not-a-date',
            },
          },
        ],
      },
    };

    const result = transformOfficialHolidaysDataset(raw, { year: 2026 });
    expect(result.holidays.map((h: { date: string }) => h.date)).toEqual([
      '2026-01-01',
      '2026-07-09',
      '2026-07-10',
    ]);
    expect(result.holidays[2].type).toBe('turistico');
    expect(normalizeHolidayType('nolaborable')).toBe('no_laborable');

    expect(() => transformOfficialHolidaysDataset({})).toThrow(/itemListElement/);
    expect(parseSyncHolidaysArgs(['--year', '2027', '--dry-run'])).toMatchObject({
      year: 2027,
      dryRun: true,
    });
    expect(() => parseSyncHolidaysArgs(['--year', '99'])).toThrow(/Año inválido/);
  });
});
