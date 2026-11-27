import { describe, it, expect, vi } from 'vitest';
import { RESERVED_TENANT_SLUGS } from '../../src/config/tenantConstants';
import { isValidTenantSlugFormat } from '../../src/services/tenantService';
import {
  buildCanvasAppearanceTokens,
  resolveEffectiveAppearanceSource,
  resolveEffectiveThemeMode,
} from '../../src/services/themeEngine';
import { HELP_TEXTS } from '../../src/texts/pages/Help';
import type { BackgroundStyleId, Slot } from '../../src/types';
import {
  paintTenantBackgroundToCanvas,
  resolveCanvasLogoRadius,
} from '../../src/utils/canvasAppearance';
import { countHelpItems, filterHelpCategories } from '../../src/utils/helpSearch';
import {
  buildInstagramPeriodRange,
  computeInstagramLayoutMetrics,
  findNextAvailableAnchorDateKey,
  getListPageSize,
  groupAvailableSlotsForInstagram,
  MAX_DAYS_PER_LIST_PAGE,
  paginateInstagramDayGroups,
  resolvePeriodHeadline,
  wrapTimeEntriesToLines,
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

    it('permite 7 días por lámina en ambos formatos (Story 9:16 y Feed 4:5) respetando safe zones sin superposiciones', () => {
      expect(MAX_DAYS_PER_LIST_PAGE).toBe(7);
      expect(getListPageSize('week', 'story')).toBe(7);
      expect(getListPageSize('week', 'feed')).toBe(7);
      expect(getListPageSize('month', 'story')).toBe(7);
      expect(getListPageSize('month', 'feed')).toBe(7);

      const fullWeekSlots: Slot[] = [
        makeSlot('w1', '2026-11-09T14:00:00.000Z'),
        makeSlot('w2', '2026-11-10T14:00:00.000Z'),
        makeSlot('w3', '2026-11-11T14:00:00.000Z'),
        makeSlot('w4', '2026-11-12T14:00:00.000Z'),
        makeSlot('w5', '2026-11-13T14:00:00.000Z'),
        makeSlot('w6', '2026-11-14T14:00:00.000Z'),
        makeSlot('w7', '2026-11-15T14:00:00.000Z'),
      ];
      const fullWeekGroups = groupAvailableSlotsForInstagram(fullWeekSlots, {
        period: 'week',
        anchorDateKey: '2026-11-11',
        timeZone: 'America/Argentina/Buenos_Aires',
        nowMs: Date.parse('2026-11-08T12:00:00.000Z'),
      });
      expect(fullWeekGroups.length).toBe(7);
      expect(paginateInstagramDayGroups(fullWeekGroups, getListPageSize('week', 'story')).length).toBe(1);
      expect(paginateInstagramDayGroups(fullWeekGroups, getListPageSize('week', 'feed')).length).toBe(1);

      for (const format of ['story', 'feed'] as const) {
        for (const showBrandHeader of [true, false]) {
          const layout = computeInstagramLayoutMetrics({
            format,
            showBrandHeader,
            daysCount: 7,
          });
          const minSafeTop = format === 'story' ? 240 : 48;
          const minSafeBottom = format === 'story' ? 280 : 48;
          expect(layout.safeTop).toBeGreaterThanOrEqual(minSafeTop);
          expect(layout.safeBottom).toBeGreaterThanOrEqual(minSafeBottom);
          expect(layout.headerBottomY).toBeLessThan(layout.bodyStartY);
          expect(layout.bodyStartY + layout.bodyMaxHeight).toBeLessThan(layout.footerTopY);
          expect(layout.footerSubY).toBeLessThanOrEqual(layout.height - layout.safeBottom);

          const rowH = Math.min(
            layout.maxRowHeight,
            Math.floor((layout.bodyMaxHeight - layout.listGapY * 6) / 7)
          );
          expect(rowH).toBeGreaterThanOrEqual(118);
          const totalListH = 7 * rowH + 6 * layout.listGapY;
          expect(totalListH).toBeLessThanOrEqual(layout.bodyMaxHeight);
        }
      }
    });

    it('empaqueta horarios dinámicamente según ancho disponible y calcula (+N) sin desbordar', () => {
      const measureMonospace = (text: string) => text.length * 14;
      const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

      const maxWidth = 420; // ~30 chars
      const result = wrapTimeEntriesToLines(times, maxWidth, measureMonospace, 2);

      expect(result.lines.length).toBe(2);
      expect(result.overflowCount).toBeGreaterThan(0);
      for (const line of result.lines) {
        expect(measureMonospace(line)).toBeLessThanOrEqual(maxWidth);
      }
      expect(result.lines[1]).toContain(`(+${result.overflowCount})`);

      const wideResult = wrapTimeEntriesToLines(times.slice(0, 5), 800, measureMonospace, 1);
      expect(wideResult.lines.length).toBe(1);
      expect(wideResult.overflowCount).toBe(0);
    });

    it('muestra "Mes1 - Mes2" en el título cuando los turnos cruzan dos meses (incluyendo cambio de año)', () => {
      const crossMonthSlots: Slot[] = [
        makeSlot('cm1', '2026-11-30T14:00:00.000Z'), // 30 nov
        makeSlot('cm2', '2026-12-03T14:00:00.000Z'), // 3 dic
      ];
      const crossMonthGroups = groupAvailableSlotsForInstagram(crossMonthSlots, {
        period: 'week',
        anchorDateKey: '2026-12-02',
        timeZone: 'America/Argentina/Buenos_Aires',
        nowMs: Date.parse('2026-11-29T12:00:00.000Z'),
      });

      const crossMonthHeadline = resolvePeriodHeadline(
        'week',
        '2026-12-02',
        crossMonthGroups,
        'America/Argentina/Buenos_Aires'
      );
      expect(crossMonthHeadline.scriptMonth).toBe('Noviembre - Diciembre');
      expect(crossMonthHeadline.subtitle).toBe('DISPONIBLES');

      // Cambio de año (Diciembre - Enero)
      const crossYearSlots: Slot[] = [
        makeSlot('cy1', '2026-12-30T14:00:00.000Z'),
        makeSlot('cy2', '2027-01-02T14:00:00.000Z'),
      ];
      const crossYearGroups = groupAvailableSlotsForInstagram(crossYearSlots, {
        period: 'week',
        anchorDateKey: '2026-12-31',
        timeZone: 'America/Argentina/Buenos_Aires',
        nowMs: Date.parse('2026-12-28T12:00:00.000Z'),
      });
      const crossYearHeadline = resolvePeriodHeadline(
        'week',
        '2026-12-31',
        crossYearGroups,
        'America/Argentina/Buenos_Aires'
      );
      expect(crossYearHeadline.scriptMonth).toBe('Diciembre - Enero');

      // Semana sin turnos que cruza de mes también refleja ambos meses
      const emptyCrossWeek = resolvePeriodHeadline(
        'week',
        '2026-12-02',
        [],
        'America/Argentina/Buenos_Aires'
      );
      expect(emptyCrossWeek.scriptMonth).toBe('Noviembre - Diciembre');
    });
  });

  describe('Live appearance resolution and Canvas token parity', () => {
    it('prioriza rawAppearance sobre bootstrapAppearance cuando isLiveSynced es true', () => {
      const liveResolved = resolveEffectiveAppearanceSource({
        isLiveSynced: true,
        rawAppearance: { palettePreset: 'noir-minimal', defaultMode: 'dark' },
        bootstrapAppearance: { palettePreset: 'rose-editorial', defaultMode: 'light' },
      });
      expect(liveResolved.palettePreset).toBe('noir-minimal');
      expect(liveResolved.defaultMode).toBe('dark');

      const resetResolved = resolveEffectiveAppearanceSource({
        isLiveSynced: true,
        rawAppearance: null,
        bootstrapAppearance: { palettePreset: 'sage-botanical', defaultMode: 'light' },
      });
      expect(resetResolved.palettePreset).toBe('rose-editorial');

      const preSyncFallback = resolveEffectiveAppearanceSource({
        isLiveSynced: false,
        rawAppearance: null,
        bootstrapAppearance: { palettePreset: 'sage-botanical', defaultMode: 'dark' },
      });
      expect(preSyncFallback.palettePreset).toBe('sage-botanical');
      expect(preSyncFallback.defaultMode).toBe('dark');
    });

    it('resuelve defaultMode incluyendo system segun preferencia del sistema', () => {
      expect(resolveEffectiveThemeMode('light', true)).toBe('light');
      expect(resolveEffectiveThemeMode('dark', false)).toBe('dark');
      expect(resolveEffectiveThemeMode('system', true)).toBe('dark');
      expect(resolveEffectiveThemeMode('system', false)).toBe('light');
    });

    it('construye tokens Canvas respetando surfaceStyle, shapePreset y logoShape', () => {
      const flatSharp = buildCanvasAppearanceTokens(
        {
          palettePreset: 'electric-cobalt',
          surfaceStyle: 'flat',
          shapePreset: 'sharp',
          fontPairing: 'minimal',
        },
        'light'
      );
      expect(flatSharp.surfaceStroke).toBe('transparent');
      expect(flatSharp.shadowBlur).toBe(0);
      expect(flatSharp.radii.lg).toBe(6);
      expect(flatSharp.radii.chip).toBe(3);
      expect(flatSharp.displayFont).toContain('Space Grotesk');

      const elevatedPill = buildCanvasAppearanceTokens(
        {
          palettePreset: 'sage-botanical',
          surfaceStyle: 'elevated',
          shapePreset: 'pill',
        },
        'light'
      );
      expect(elevatedPill.shadowBlur).toBeGreaterThan(0);
      expect(elevatedPill.radii.chip).toBe(999);
      expect(resolveCanvasLogoRadius('circle', 148)).toBe(74);
      expect(resolveCanvasLogoRadius('square', 148)).toBe(7);
      expect(resolveCanvasLogoRadius('frameless', 148)).toBe(0);
    });

    it('pinta los 6 backgroundStyle en Canvas y mantiene solid limpio sin degradado', () => {
      const makeMockCtx = () => {
        const gradientStub = { addColorStop: vi.fn() };
        return {
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 1,
          fillRect: vi.fn(),
          createLinearGradient: vi.fn(() => gradientStub),
          createRadialGradient: vi.fn(() => gradientStub),
          beginPath: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
        } as unknown as CanvasRenderingContext2D;
      };

      const solidCtx = makeMockCtx();
      const solidTokens = buildCanvasAppearanceTokens({ backgroundStyle: 'solid' }, 'light');
      paintTenantBackgroundToCanvas(solidCtx, 1080, 1920, solidTokens);
      expect(solidCtx.fillRect).toHaveBeenCalledTimes(1);
      expect(solidCtx.createLinearGradient).not.toHaveBeenCalled();
      expect(solidCtx.createRadialGradient).not.toHaveBeenCalled();

      const styles: BackgroundStyleId[] = [
        'soft-gradient',
        'mesh-glow',
        'dots',
        'grid',
        'diagonal',
      ];
      for (const bgStyle of styles) {
        const ctx = makeMockCtx();
        const tokens = buildCanvasAppearanceTokens(
          { backgroundStyle: bgStyle, backgroundIntensity: 'vivid' },
          'dark'
        );
        paintTenantBackgroundToCanvas(ctx, 1080, 1350, tokens);
        expect(ctx.fillRect).toHaveBeenCalled();
      }
    });
  });
});
