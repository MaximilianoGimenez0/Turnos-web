import { describe, it, expect } from 'vitest';
import { RESERVED_TENANT_SLUGS } from '../../src/config/tenantConstants';
import { isValidTenantSlugFormat } from '../../src/services/tenantService';
import { HELP_TEXTS } from '../../src/texts/pages/Help';
import type { Slot } from '../../src/types';
import { countHelpItems, filterHelpCategories } from '../../src/utils/helpSearch';
import {
  buildInstagramPeriodRange,
  findNextAvailableAnchorDateKey,
  groupAvailableSlotsForInstagram,
  paginateInstagramDayGroups,
  resolvePeriodHeadline,
} from '../../src/utils/instagramScheduleCanvas';
import { buildQrSvg, generateQrMatrix } from '../../src/utils/qrGenerator';

const makeSlot = (id: string, datetime: string, overrides?: Partial<Slot>): Slot => ({
  id,
  tenantId: 'tnt_demo',
  datetime,
  status: 'available',
  clientData: null,
  paymentStatus: null,
  paidAmount: null,
  totalPrice: 20000,
  depositAmount: 6000,
  preferenceId: null,
  paymentId: null,
  createdAt: '2026-11-01T12:00:00.000Z',
  ...overrides,
});

describe('Spec 14: Reserved slugs, Help Center, QR & Instagram schedule utilities', () => {
  describe('Reserved slugs for Help Center', () => {
    it('incluye ayuda y help en RESERVED_TENANT_SLUGS y los rechaza como slug de tenant', () => {
      expect(RESERVED_TENANT_SLUGS.has('ayuda')).toBe(true);
      expect(RESERVED_TENANT_SLUGS.has('help')).toBe(true);
      expect(isValidTenantSlugFormat('ayuda')).toBe(false);
      expect(isValidTenantSlugFormat('help')).toBe(false);
      expect(isValidTenantSlugFormat('mi-estudio-demo')).toBe(true);
    });
  });

  describe('Help Center search & filtering', () => {
    it('filtra preguntas por categoría y término de búsqueda normalizando acentos', () => {
      const businessAll = filterHelpCategories(HELP_TEXTS.categories.business, '');
      const clientAll = filterHelpCategories(HELP_TEXTS.categories.client, '');

      expect(businessAll.length).toBeGreaterThan(0);
      expect(clientAll.length).toBeGreaterThan(0);
      expect(countHelpItems(businessAll)).toBeGreaterThan(5);

      const mpResults = filterHelpCategories(HELP_TEXTS.categories.business, 'sena');
      expect(countHelpItems(mpResults)).toBeGreaterThan(0);

      const emptyResults = filterHelpCategories(
        HELP_TEXTS.categories.client,
        'palabra_inexistente_xyz_999'
      );
      expect(emptyResults).toEqual([]);
      expect(countHelpItems(emptyResults)).toBe(0);
    });
  });

  describe('QR matrix & SVG generator', () => {
    it('genera una matriz cuadrada determinística y un SVG válido sin llamadas externas', () => {
      const matrix = generateQrMatrix('https://turneado.app/demo');
      expect(matrix.size).toBeGreaterThanOrEqual(21);
      expect(matrix.modules.length).toBe(matrix.size);
      expect(matrix.modules[0].length).toBe(matrix.size);

      const svg = buildQrSvg('https://turneado.app/demo', {
        finderAccentColor: '#9e4f5e',
        moduleColor: '#1f1916',
        background: '#ffffff',
      });
      expect(svg.startsWith('<svg ')).toBe(true);
      expect(svg).toContain('viewBox=');
      expect(svg).toContain('#9e4f5e');
      expect(svg).toContain('<rect ');
    });
  });

  describe('Instagram schedule canvas grouping & pagination', () => {
    const nowMs = Date.parse('2026-11-10T10:00:00.000Z');
    const slots: Slot[] = [
      // Past available (must be excluded)
      makeSlot('past-1', '2026-11-09T13:00:00.000Z'),
      // Confirmed (must be excluded)
      makeSlot('conf-1', '2026-11-11T13:00:00.000Z', { status: 'confirmed' }),
      // Future available slots within Nov 9-15 week
      makeSlot('s1', '2026-11-11T17:00:00.000Z'), // 14:00 AR
      makeSlot('s2', '2026-11-11T14:00:00.000Z'), // 11:00 AR
      makeSlot('s3', '2026-11-12T15:30:00.000Z'), // 12:30 AR
      makeSlot('s4', '2026-11-13T18:00:00.000Z'), // 15:00 AR
      makeSlot('s5', '2026-11-14T13:00:00.000Z'), // 10:00 AR
      makeSlot('s6', '2026-11-15T13:00:00.000Z'), // 10:00 AR
      makeSlot('s7', '2026-11-18T13:00:00.000Z'), // Next week
      makeSlot('s8', '2026-11-19T13:00:00.000Z'), // Next week
    ];

    it('agrupa turnos disponibles futuros por día y ordena horarios ascendentemente', () => {
      const range = buildInstagramPeriodRange('week', '2026-11-11', 'America/Argentina/Buenos_Aires');
      expect(range.startDateKey).toBe('2026-11-09');
      expect(range.endDateKey).toBe('2026-11-15');

      const groups = groupAvailableSlotsForInstagram(slots, {
        period: 'week',
        anchorDateKey: '2026-11-11',
        timeZone: 'America/Argentina/Buenos_Aires',
        nowMs,
      });

      expect(groups.map((g) => g.dateKey)).toEqual([
        '2026-11-11',
        '2026-11-12',
        '2026-11-13',
        '2026-11-14',
        '2026-11-15',
      ]);
      expect(groups[0].slots.map((s) => s.time)).toEqual(['11:00', '14:00']);
    });

    it('pagina grupos diarios respetando el tamaño máximo por lámina y resuelve ancla siguiente', () => {
      const monthGroups = groupAvailableSlotsForInstagram(slots, {
        period: 'month',
        anchorDateKey: '2026-11-10',
        timeZone: 'America/Argentina/Buenos_Aires',
        nowMs,
      });

      expect(monthGroups.length).toBe(7);
      const pages = paginateInstagramDayGroups(monthGroups, 6);
      expect(pages.length).toBe(2);
      expect(pages[0].length).toBe(6);
      expect(pages[1].length).toBe(1);

      const nextAnchor = findNextAvailableAnchorDateKey(
        slots,
        'America/Argentina/Buenos_Aires',
        nowMs
      );
      expect(nextAnchor).toBe('2026-11-11');

      const headline = resolvePeriodHeadline(
        'month',
        '2026-11-10',
        monthGroups,
        'America/Argentina/Buenos_Aires'
      );
      expect(headline.scriptMonth.toLowerCase()).toBe('noviembre');
      expect(headline.subtitle).toBe('DISPONIBLES');
    });
  });
});
