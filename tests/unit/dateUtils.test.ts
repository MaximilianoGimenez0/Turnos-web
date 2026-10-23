import { describe, it, expect } from 'vitest';
import {
  formatLocalDate,
  getTodayLocalDateString,
  addDaysLocalDateString,
  getLocalDateKeyFromIso,
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
});
