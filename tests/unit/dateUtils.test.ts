import { describe, it, expect } from 'vitest';
import {
  BUSINESS_TIMEZONE,
  formatBusinessDateKey,
  getBusinessHour,
  formatBusinessTime,
  buildBusinessIsoFromInputs,
  formatLocalDate,
  getTodayLocalDateString,
  addDaysLocalDateString,
  getLocalDateKeyFromIso,
  getDateRangeForScope,
  shiftAnchorDate,
  isIsoInDateRange,
  formatMonthLabel,
  HALF_HOUR_SLOTS_24H,
  buildCalendarMonthGrid,
  parseYearMonth,
  formatYearMonthHeading,
} from '../../src/utils/dateUtils';

describe('dateUtils - Formateo y manipulación segura de fechas locales', () => {
  describe('formatLocalDate', () => {
    it('formatea correctamente una fecha válida a YYYY-MM-DD con padding de 2 dígitos', () => {
      const date = new Date(2026, 4, 7); // Mayo es mes 4 (0-indexed)
      expect(formatLocalDate(date)).toBe('2026-05-07');
    });

    it('devuelve cadena vacía si la fecha es inválida (NaN)', () => {
      const invalidDate = new Date('fecha-invalida');
      expect(formatLocalDate(invalidDate)).toBe('');
    });

    it('devuelve cadena vacía si la fecha es null o undefined', () => {
      expect(formatLocalDate(null as unknown as Date)).toBe('');
      expect(formatLocalDate(undefined as unknown as Date)).toBe('');
    });
  });

  describe('getTodayLocalDateString', () => {
    it('devuelve una cadena con formato YYYY-MM-DD que coincide con el día actual', () => {
      const todayStr = getTodayLocalDateString();
      expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const now = new Date();
      const expectedYear = String(now.getFullYear());
      expect(todayStr.startsWith(expectedYear)).toBe(true);
    });
  });

  describe('addDaysLocalDateString', () => {
    it('suma días a la fecha actual y devuelve el formato esperado YYYY-MM-DD', () => {
      const tomorrowStr = addDaysLocalDateString(1);
      expect(tomorrowStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const todayStr = getTodayLocalDateString();
      const todayDate = new Date(`${todayStr}T00:00:00`);
      const tomorrowDate = new Date(`${tomorrowStr}T00:00:00`);
      const diffDays = Math.round(
        (tomorrowDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(1);
    });

    it('permite restar días pasando un valor negativo', () => {
      const yesterdayStr = addDaysLocalDateString(-1);
      expect(yesterdayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const todayStr = getTodayLocalDateString();
      const todayDate = new Date(`${todayStr}T00:00:00`);
      const yesterdayDate = new Date(`${yesterdayStr}T00:00:00`);
      const diffDays = Math.round(
        (todayDate.getTime() - yesterdayDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(1);
    });
  });

  describe('getLocalDateKeyFromIso', () => {
    it('obtiene la clave de fecha local YYYY-MM-DD a partir de un ISO string válido', () => {
      const iso = '2026-10-22T14:30:00.000Z';
      const result = getLocalDateKeyFromIso(iso);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('devuelve cadena vacía si no se proporciona argumento o es undefined', () => {
      expect(getLocalDateKeyFromIso(undefined)).toBe('');
      expect(getLocalDateKeyFromIso('')).toBe('');
    });

    it('devuelve cadena vacía si el string no representa una fecha válida', () => {
      expect(getLocalDateKeyFromIso('not-a-date')).toBe('');
    });
  });

  describe('Rangos temporales de AdminView (day / week / month / all)', () => {
    it('calcula semana Lunes-Domingo correctamente incluso cuando el ancla es domingo', () => {
      // 2026-11-22 es domingo -> semana del lunes 2026-11-16 al domingo 2026-11-22
      const sunday = new Date(2026, 10, 22, 14, 0, 0);
      const weekRange = getDateRangeForScope('week', sunday)!;
      expect(formatLocalDate(weekRange.startDate)).toBe('2026-11-16');
      expect(formatLocalDate(weekRange.endDate)).toBe('2026-11-22');

      expect(isIsoInDateRange(new Date(2026, 10, 16, 0, 0, 0).toISOString(), weekRange)).toBe(true);
      expect(isIsoInDateRange(new Date(2026, 10, 22, 23, 59, 0).toISOString(), weekRange)).toBe(true);
      expect(isIsoInDateRange(new Date(2026, 10, 15, 23, 59, 0).toISOString(), weekRange)).toBe(false);
      expect(isIsoInDateRange(new Date(2026, 10, 23, 0, 0, 0).toISOString(), weekRange)).toBe(false);
    });

    it('calcula mes completo y desplaza meses sin desbordar fin de mes', () => {
      const jan31 = new Date(2026, 0, 31, 12, 0, 0);
      const febAnchor = shiftAnchorDate('month', jan31, 1);
      const febRange = getDateRangeForScope('month', febAnchor)!;
      expect(formatLocalDate(febRange.startDate)).toBe('2026-02-01');
      expect(formatLocalDate(febRange.endDate)).toBe('2026-02-28');
      expect(formatMonthLabel(febAnchor).toLowerCase()).toContain('2026');
    });

    it('devuelve null y acepta cualquier turno cuando el alcance es all', () => {
      const range = getDateRangeForScope('all', new Date(2026, 10, 22));
      expect(range).toBeNull();
      expect(isIsoInDateRange('2025-01-01T10:00:00.000Z', range)).toBe(true);
    });
  });

  describe('Helpers en zona horaria del estudio (America/Argentina/Buenos_Aires)', () => {
    it('construye ISO UTC exacto y extrae fecha/hora estable en Buenos Aires (DB-11)', () => {
      expect(BUSINESS_TIMEZONE).toBe('America/Argentina/Buenos_Aires');
      const iso = buildBusinessIsoFromInputs('2026-11-22', '10:30');
      expect(iso).toBe('2026-11-22T13:30:00.000Z');
      expect(formatBusinessDateKey(iso)).toBe('2026-11-22');
      expect(getBusinessHour(iso)).toBe(10);
      expect(formatBusinessTime(iso)).toBe('10:30');

      // 23:00 Buenos Aires del 22 nov = 02:00 UTC del 23 nov -> clave de fecha sigue siendo 22 nov
      const lateNightIso = buildBusinessIsoFromInputs('2026-11-22', '23:00');
      expect(lateNightIso).toBe('2026-11-23T02:00:00.000Z');
      expect(formatBusinessDateKey(lateNightIso)).toBe('2026-11-22');
      expect(getBusinessHour(lateNightIso)).toBe(23);
    });

    it('soporta zona horaria parametrizada por tenant (ej. America/Mexico_City y Europe/Madrid)', () => {
      const utcIso = '2026-11-22T15:00:00.000Z';
      expect(formatBusinessTime(utcIso, 'America/Argentina/Buenos_Aires')).toBe('12:00');
      expect(formatBusinessTime(utcIso, 'America/Mexico_City')).toBe('09:00');
      expect(getBusinessHour(utcIso, 'America/Mexico_City')).toBe(9);
      expect(formatBusinessTime(utcIso, 'Europe/Madrid')).toBe('16:00');
      expect(formatBusinessDateKey('2026-11-22T23:30:00.000Z', 'Europe/Madrid')).toBe('2026-11-23');
      expect(formatBusinessDateKey('2026-11-22T23:30:00.000Z', 'America/Mexico_City')).toBe(
        '2026-11-22'
      );
    });
  });

  describe('Helpers para Date Picker y Time Picker personalizados (D1 + T1)', () => {
    it('genera 48 slots exactos de 30 minutos en formato 24h', () => {
      expect(HALF_HOUR_SLOTS_24H).toHaveLength(48);
      expect(HALF_HOUR_SLOTS_24H[0]).toBe('00:00');
      expect(HALF_HOUR_SLOTS_24H[1]).toBe('00:30');
      expect(HALF_HOUR_SLOTS_24H[47]).toBe('23:30');
    });

    it('construye la grilla mensual comenzando en lunes con semanas completas', () => {
      // Noviembre 2026 comienza domingo 1 -> 6 días previos (lun 26 oct .. sáb 31 oct) + 30 días = 36 -> 42 celdas
      const grid = buildCalendarMonthGrid(2026, 10);
      expect(grid).toHaveLength(42);
      expect(grid[0]).toEqual({ dateStr: '2026-10-26', dayNumber: 26, isCurrentMonth: false });
      expect(grid[6]).toEqual({ dateStr: '2026-11-01', dayNumber: 1, isCurrentMonth: true });
      expect(grid[35]).toEqual({ dateStr: '2026-11-30', dayNumber: 30, isCurrentMonth: true });
      expect(grid[41]).toEqual({ dateStr: '2026-12-06', dayNumber: 6, isCurrentMonth: false });
    });

    it('parsea año/mes desde YYYY-MM-DD y formatea cabecera en español', () => {
      expect(parseYearMonth('2026-11-22')).toEqual({ year: 2026, monthIndex: 10 });
      expect(formatYearMonthHeading(2026, 10).toLowerCase()).toContain('noviembre');
      expect(formatYearMonthHeading(2026, 10)).toContain('2026');
    });
  });
});
