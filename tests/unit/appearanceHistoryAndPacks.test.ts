import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TENANT_APPEARANCE,
  STYLE_PACKS,
  coerceCompatibleHeroSettings,
  isHeroCombinationCompatible,
} from '../../src/config/themePresets';
import { getThemeContrastSummary, normalizeTenantAppearance } from '../../src/services/themeEngine';
import {
  MAX_APPEARANCE_HISTORY,
  createInitialAppearanceHistory,
  reduceAppearanceHistory,
} from '../../src/components/admin/AppearanceSettings/useAppearanceHistory';

describe('Spec 08 - STYLE_PACKS, compatibilidad de Hero e historial Undo/Redo', () => {
  it('incluye 7 packs por rubro curados que cumplen WCAG AA tanto en modo claro como oscuro', () => {
    expect(STYLE_PACKS.length).toBe(7);

    for (const pack of STYLE_PACKS) {
      const norm = normalizeTenantAppearance(pack.appearance);
      const light = getThemeContrastSummary(norm, 'light');
      const dark = getThemeContrastSummary(norm, 'dark');

      expect(
        light.passesAA,
        `Pack ${pack.id} falló AA en modo claro (soft=${light.softButtonRatio}, primary=${light.primaryOnSurfaceRatio})`
      ).toBe(true);
      expect(
        dark.passesAA,
        `Pack ${pack.id} falló AA en modo oscuro (soft=${dark.softButtonRatio}, primary=${dark.primaryOnSurfaceRatio})`
      ).toBe(true);
    }
  });

  it('valida matriz de compatibilidad Hero y ajusta polaroid + formas curvas a portrait', () => {
    const overlayCompat = isHeroCombinationCompatible('overlay-banner', 'arch', 'polaroid');
    expect(overlayCompat.shapeApplicable).toBe(false);
    expect(overlayCompat.frameApplicable).toBe(false);

    const splitCompat = isHeroCombinationCompatible('split-right', 'circle', 'polaroid');
    expect(splitCompat.shapeApplicable).toBe(true);
    expect(splitCompat.shapeFrameCompatible).toBe(false);

    const coerced = coerceCompatibleHeroSettings({
      heroLayout: 'split-right',
      heroImageShape: 'circle',
      heroImageFrame: 'polaroid',
    });
    expect(coerced.config.heroImageShape).toBe('portrait');
    expect(coerced.adjustedReason).toBeTruthy();

    const unchanged = coerceCompatibleHeroSettings({
      heroLayout: 'split-right',
      heroImageShape: 'square',
      heroImageFrame: 'polaroid',
    });
    expect(unchanged.config.heroImageShape).toBe('square');
    expect(unchanged.adjustedReason).toBeNull();
  });

  it('reduceAppearanceHistory soporta undo, redo, coalescing, truncado de future y límite de 40 entradas', () => {
    let state = createInitialAppearanceHistory(DEFAULT_TENANT_APPEARANCE);

    state = reduceAppearanceHistory(state, {
      type: 'SET',
      next: { ...DEFAULT_TENANT_APPEARANCE, palettePreset: 'sage-botanical' },
      timestampMs: 1000,
    });
    expect(state.past.length).toBe(1);
    expect(state.present.palettePreset).toBe('sage-botanical');

    // Coalescing dentro de la ventana de 350ms con misma coalesceKey
    state = reduceAppearanceHistory(state, {
      type: 'SET',
      next: { ...state.present, customPrimaryHex: '#112233' },
      coalesceKey: 'customPrimaryHex',
      timestampMs: 2000,
    });
    state = reduceAppearanceHistory(state, {
      type: 'SET',
      next: { ...state.present, customPrimaryHex: '#223344' },
      coalesceKey: 'customPrimaryHex',
      timestampMs: 2200,
    });
    expect(state.past.length).toBe(2);
    expect(state.present.customPrimaryHex).toBe('#223344');

    // Undo / Redo
    state = reduceAppearanceHistory(state, { type: 'UNDO' });
    expect(state.present.customPrimaryHex).toBeNull();
    expect(state.future.length).toBe(1);

    state = reduceAppearanceHistory(state, { type: 'REDO' });
    expect(state.present.customPrimaryHex).toBe('#223344');
    expect(state.future.length).toBe(0);

    // Nuevo cambio luego de undo limpia future
    state = reduceAppearanceHistory(state, { type: 'UNDO' });
    state = reduceAppearanceHistory(state, {
      type: 'SET',
      next: { ...state.present, shapePreset: 'sharp' },
      timestampMs: 4000,
    });
    expect(state.future.length).toBe(0);

    // Tope máximo de 40 estados en past
    for (let i = 0; i < MAX_APPEARANCE_HISTORY + 15; i += 1) {
      state = reduceAppearanceHistory(state, {
        type: 'SET',
        next: {
          ...state.present,
          heroCustomTitlePrefix: `Titulo ${i}`,
        },
        timestampMs: 5000 + i * 1000,
      });
    }
    expect(state.past.length).toBe(MAX_APPEARANCE_HISTORY);
  });
});
