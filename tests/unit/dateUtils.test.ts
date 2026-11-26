import { describe, it, expect } from 'vitest';
import {
  BUSINESS_TIMEZONE,
  formatBusinessDateKey,
  getBusinessHour,
  formatBusinessTime,
  buildBusinessIsoFromInputs,
  getTodayBusinessDateString,
  addDaysToDateKey,
  addDaysBusinessDateString,
  formatDateKeyLong,
  formatDateKeyShort,
  formatDateKeyParts,
  getDateRangeForScope,
  shiftAnchorDateKey,
  isIsoInDateRange,
  formatMonthLabel,
  formatScopeRangeLabel,
  HALF_HOUR_SLOTS_24H,
  buildCalendarMonthGrid,
  parseYearMonth,
  formatYearMonthHeading,
} from '../../src/utils/dateUtils';

describe('dateUtils - Única fuente de verdad para fechas y zonas horarias', () => {
  describe('Claves de fecha YYYY-MM-DD y aritmética de calendario', () => {
    it('formatea Date/ISO a YYYY-MM-DD en timezone del tenant y rechaza valores inválidos', () => {
      expect(formatBusinessDateKey('2026-10-22T14:30:00.000Z')).toBe('2026-10-22');
      expect(formatBusinessDateKey('2026-05-07')).toBe('2026-05-07');
      expect(formatBusinessDateKey('not-a-date')).toBe('');
      expect(formatBusinessDateKey(null)).toBe('');
      expect(formatBusinessDateKey(undefined)).toBe('');
    });

    it('suma y resta días sobre DateKey sin depender de la zona horaria local', () => {
      expect(addDaysToDateKey('2026-01-31', 1)).toBe('2026-02-01');
      expect(addDaysToDateKey('2026-03-01', -1)).toBe('2026-02-28');
      expect(addDaysToDateKey('2026-12-31', 1)).toBe('2027-01-01');
      expect(addDaysToDateKey('invalido', 1)).toBe('');

      const fixedNow = new Date('2026-11-26T15:00:00.000Z');
      expect(getTodayBusinessDateString(BUSINESS_TIMEZONE, fixedNow)).toBe('2026-11-26');
      expect(addDaysBusinessDateString(1, BUSINESS_TIMEZONE, fixedNow)).toBe('2026-11-27');
      expect(addDaysBusinessDateString(-1, BUSINESS_TIMEZONE, fixedNow)).toBe('2026-11-25');
    });

    it('formatea etiquetas largas, cortas y partes en español sin espacios antes de coma', () => {
      const longLabel = formatDateKeyLong('2026-11-26');
      expect(longLabel.toLowerCase()).toContain('jueves');
      expect(longLabel).toContain('26');
      expect(longLabel.toLowerCase()).toContain('noviembre');
      expect(longLabel).toContain('2026');
      expect(longLabel).not.toMatch(/\s+,/);

      const shortLabel = formatDateKeyShort('2026-11-26');
      expect(shortLabel).not.toContain('.');
      expect(shortLabel).toContain('26');

      const parts = formatDateKeyParts('2026-05-25');
      expect(parts.dayNum).toBe('25');
      expect(parts.monthLong.toLowerCase()).toBe('mayo');
      expect(parts.weekdayShort).not.toContain('.');
    });
  });

  describe('Rangos temporales de AdminView (day / week / month / all) con timezone', () => {
    it('calcula semana Lunes-Domingo correctamente incluso cuando el ancla es domingo', () => {
      // 2026-11-22 es domingo -> semana del lunes 2026-11-16 al domingo 2026-11-22
      const weekRange = getDateRangeForScope('week', '2026-11-22', BUSINESS_TIMEZONE)!;
      expect(weekRange.startDateKey).toBe('2026-11-16');
      expect(weekRange.endDateKey).toBe('2026-11-22');

      expect(
        isIsoInDateRange(buildBusinessIsoFromInputs('2026-11-16', '00:00', BUSINESS_TIMEZONE), weekRange)
      ).toBe(true);
      expect(
        isIsoInDateRange(buildBusinessIsoFromInputs('2026-11-22', '23:59', BUSINESS_TIMEZONE), weekRange)
      ).toBe(true);
      expect(
        isIsoInDateRange(buildBusinessIsoFromInputs('2026-11-15', '23:59', BUSINESS_TIMEZONE), weekRange)
      ).toBe(false);
      expect(
        isIsoInDateRange(buildBusinessIsoFromInputs('2026-11-23', '00:00', BUSINESS_TIMEZONE), weekRange)
      ).toBe(false);
    });

    it('respeta la zona horaria del tenant en los bordes de medianoche de día/mes', () => {
      // 2026-11-23T02:30:00.000Z es 22 nov 23:30 en Buenos Aires, pero 23 nov 03:30 en Madrid
      const iso = '2026-11-23T02:30:00.000Z';
      const baDay22 = getDateRangeForScope('day', '2026-11-22', 'America/Argentina/Buenos_Aires')!;
      const madridDay22 = getDateRangeForScope('day', '2026-11-22', 'Europe/Madrid')!;

      expect(isIsoInDateRange(iso, baDay22)).toBe(true);
      expect(isIsoInDateRange(iso, madridDay22)).toBe(false);
    });

    it('calcula mes completo y desplaza meses sin desbordar fin de mes', () => {
      const febAnchor = shiftAnchorDateKey('month', '2026-01-31', 1);
      expect(febAnchor).toBe('2026-02-01');
      const febRange = getDateRangeForScope('month', febAnchor, BUSINESS_TIMEZONE)!;
      expect(febRange.startDateKey).toBe('2026-02-01');
      expect(febRange.endDateKey).toBe('2026-02-28');
      expect(formatMonthLabel(febAnchor).toLowerCase()).toContain('2026');
      expect(formatScopeRangeLabel('day', '2026-11-26', BUSINESS_TIMEZONE, '2026-11-26')).toMatch(
        /^Hoy · /
      );
    });

    it('devuelve null y acepta cualquier turno cuando el alcance es all', () => {
      const range = getDateRangeForScope('all', '2026-11-22', BUSINESS_TIMEZONE);
      expect(range).toBeNull();
      expect(isIsoInDateRange('2025-01-01T10:00:00.000Z', range)).toBe(true);
    });
  });

  describe('Helpers en zona horaria del estudio y multi-tenant', () => {
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
