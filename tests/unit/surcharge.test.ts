import { describe, it, expect } from 'vitest';
import {
  normalizeSurchargeReason,
  normalizeSlotSurcharge,
  calculateSurchargeAmount,
  resolveBookingSurcharge,
  formatSurchargeValue,
  formatSurchargeLabel,
  formatSurchargeDetail,
  isWeekendDateKey,
} from '../../src/utils/surcharge';

describe('surcharge SSOT', () => {
  describe('normalizeSurchargeReason', () => {
    it('recorta espacios y omite vacíos o menores a 2 caracteres', () => {
      expect(normalizeSurchargeReason(undefined)).toBeUndefined();
      expect(normalizeSurchargeReason('   ')).toBeUndefined();
      expect(normalizeSurchargeReason('A')).toBeUndefined();
      expect(normalizeSurchargeReason('  Feriado  ')).toBe('Feriado');
    });

    it('trunca motivos superiores a 60 caracteres', () => {
      const longReason = 'X'.repeat(75);
      expect(normalizeSurchargeReason(longReason)).toHaveLength(60);
    });
  });

  describe('normalizeSlotSurcharge', () => {
    it('acepta recargos fijos y porcentuales enteros dentro de rango', () => {
      expect(normalizeSlotSurcharge({ type: 'fixed', value: 3000, reason: '  Feriado ' })).toEqual({
        type: 'fixed',
        value: 3000,
        reason: 'Feriado',
      });
      expect(normalizeSlotSurcharge({ type: 'percentage', value: 20 })).toEqual({
        type: 'percentage',
        value: 20,
      });
    });

    it('rechaza tipos inválidos, decimales, ceros, negativos y fuera de límite', () => {
      expect(normalizeSlotSurcharge(null)).toBeNull();
      expect(normalizeSlotSurcharge({ type: 'other', value: 100 })).toBeNull();
      expect(normalizeSlotSurcharge({ type: 'fixed', value: 0 })).toBeNull();
      expect(normalizeSlotSurcharge({ type: 'fixed', value: -500 })).toBeNull();
      expect(normalizeSlotSurcharge({ type: 'fixed', value: 1500.5 })).toBeNull();
      expect(normalizeSlotSurcharge({ type: 'fixed', value: 5_000_001 })).toBeNull();
      expect(normalizeSlotSurcharge({ type: 'percentage', value: 0 })).toBeNull();
      expect(normalizeSlotSurcharge({ type: 'percentage', value: 201 })).toBeNull();
      expect(normalizeSlotSurcharge({ type: 'percentage', value: 12.5 })).toBeNull();
    });
  });

  describe('calculateSurchargeAmount', () => {
    it('devuelve el monto fijo entero sin depender del subtotal', () => {
      expect(calculateSurchargeAmount(20000, { type: 'fixed', value: 3000 })).toBe(3000);
      expect(calculateSurchargeAmount(0, { type: 'fixed', value: 3000 })).toBe(3000);
    });

    it('calcula porcentajes redondeados a entero ARS y devuelve 0 si subtotal <= 0', () => {
      expect(calculateSurchargeAmount(23000, { type: 'percentage', value: 20 })).toBe(4600);
      expect(calculateSurchargeAmount(15555, { type: 'percentage', value: 15 })).toBe(2333);
      expect(calculateSurchargeAmount(0, { type: 'percentage', value: 20 })).toBe(0);
    });

    it('devuelve 0 si no hay recargo válido', () => {
      expect(calculateSurchargeAmount(15000, null)).toBe(0);
      expect(calculateSurchargeAmount(15000, undefined)).toBe(0);
    });
  });

  describe('resolveBookingSurcharge', () => {
    it('prioriza el snapshot inmutable de clientData cuando existe', () => {
      const resolved = resolveBookingSurcharge({
        clientData: {
          basePrice: 20000,
          extrasPrice: 3000,
          surchargeType: 'percentage',
          surchargeValue: 20,
          surchargeAmount: 4600,
          surchargeReason: 'Horario nocturno',
        },
        slotSurcharge: { type: 'fixed', value: 1000, reason: 'Otro' },
      });
      expect(resolved).toEqual({
        surcharge: { type: 'percentage', value: 20, reason: 'Horario nocturno' },
        surchargeType: 'percentage',
        surchargeValue: 20,
        surchargeAmount: 4600,
        surchargeReason: 'Horario nocturno',
      });
    });

    it('hace fallback a slotSurcharge cuando clientData no tiene snapshot', () => {
      const resolved = resolveBookingSurcharge({
        clientData: { basePrice: 10000, extrasPrice: 5000 },
        slotSurcharge: { type: 'percentage', value: 10, reason: 'Feriado' },
      });
      expect(resolved.surchargeAmount).toBe(1500);
      expect(resolved.surchargeReason).toBe('Feriado');
    });
  });

  describe('formateo y detección de fines de semana', () => {
    it('formatea valores, etiquetas por tamaño y detalle tooltip', () => {
      const fixed = { type: 'fixed' as const, value: 3000, reason: 'Feriado' };
      const pct = { type: 'percentage' as const, value: 20, reason: 'Horario nocturno' };

      expect(formatSurchargeValue(fixed)).toBe('+$3.000');
      expect(formatSurchargeValue(pct)).toBe('+20%');

      expect(formatSurchargeLabel(fixed, { size: 'xs' })).toBe('+$3.000');
      expect(formatSurchargeLabel(fixed, { size: 'sm' })).toBe('Recargo +$3.000');
      expect(formatSurchargeLabel(fixed, { size: 'sm', showReason: true })).toBe(
        'Recargo +$3.000 · Feriado'
      );
      expect(formatSurchargeLabel(pct, { size: 'md', resolvedAmount: 4600 })).toBe(
        'Recargo +20% (+$4.600) · Horario nocturno'
      );

      expect(formatSurchargeDetail(fixed)).toBe(
        'Recargo de +$3.000 (Feriado). Se suma al total del servicio.'
      );
      expect(formatSurchargeDetail(pct, 4600)).toBe(
        'Recargo de +20% (+$4.600) (Horario nocturno). Se aplica sobre los servicios y extras seleccionados.'
      );
    });

    it('detecta sábados y domingos correctamente', () => {
      expect(isWeekendDateKey('2026-11-28')).toBe(true); // sábado
      expect(isWeekendDateKey('2026-11-29')).toBe(true); // domingo
      expect(isWeekendDateKey('2026-11-26')).toBe(false); // jueves
      expect(isWeekendDateKey('')).toBe(false);
    });
  });
});
