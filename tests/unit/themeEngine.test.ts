import { describe, it, expect } from 'vitest';
import {
  BACKGROUND_STYLES,
  DEFAULT_TENANT_APPEARANCE,
  FONT_PAIRINGS,
  HERO_COPY_PRESETS,
  HERO_IMAGE_FRAMES,
  HERO_IMAGE_SHAPES,
  HERO_LAYOUTS,
  PALETTE_PRESETS,
  SURFACE_TEMPERATURE_ORDER,
} from '../../src/config/themePresets';
import {
  areAppearanceConfigsEqual,
  buildBackgroundPatternTokens,
  buildTenantCssVariables,
  deriveSurfaceFromCustomBackground,
  ensureAccessibleColor,
  getContrastRatio,
  getThemeContrastSummary,
  normalizeHexColor,
  normalizeTenantAppearance,
  resolveHeroCopy,
} from '../../src/services/themeEngine';
import {
  resolveEmailThemeForAppearance,
  sanitizeTenantAppearance,
} from '../../functions/src/tenantAppearance';

describe('themeEngine & themePresets - 24 presets, fondos CSS, superficies derivadas y WCAG AA', () => {
  it('incluye 24 presets curados, 6 superficies y 8 tipografías; todos los presets cumplen WCAG AA en claro y oscuro', () => {
    expect(PALETTE_PRESETS.length).toBe(24);
    expect(SURFACE_TEMPERATURE_ORDER.length).toBe(6);
    expect(FONT_PAIRINGS.length).toBe(8);
    expect(BACKGROUND_STYLES.length).toBe(6);

    for (const preset of PALETTE_PRESETS) {
      const config = normalizeTenantAppearance({ palettePreset: preset.id });

      const lightSummary = getThemeContrastSummary(config, 'light');
      const darkSummary = getThemeContrastSummary(config, 'dark');

      expect(
        lightSummary.passesAA,
        `Preset ${preset.id} (light) falló AA: primaryOnSurface=${lightSummary.primaryOnSurfaceRatio}, textOnPrimary=${lightSummary.textOnPrimaryRatio}`
      ).toBe(true);
      expect(
        darkSummary.passesAA,
        `Preset ${preset.id} (dark) falló AA: primaryOnSurface=${darkSummary.primaryOnSurfaceRatio}, textOnPrimary=${darkSummary.textOnPrimaryRatio}`
      ).toBe(true);
    }
  });

  it('normaliza HEX de 3/6 dígitos y rechaza inyección CSS o valores inválidos en todos los campos', () => {
    expect(normalizeHexColor('#AbC')).toBe('#aabbcc');
    expect(normalizeHexColor('436852')).toBe('#436852');
    expect(normalizeHexColor('red; background:url(javascript:alert(1))')).toBeNull();
    expect(normalizeHexColor('#12345')).toBeNull();
    expect(normalizeHexColor('')).toBeNull();

    const hostile = normalizeTenantAppearance({
      palettePreset: 'invalid-preset' as never,
      customPrimaryHex: 'expression(alert(1))' as never,
      customAccentHex: '#gg0000' as never,
      surfaceTemperature: 'lava' as never,
      customBackgroundHex: 'url(https://evil.test/x.png)' as never,
      backgroundStyle: 'video' as never,
      backgroundIntensity: 'extreme' as never,
      defaultMode: 'neon' as never,
      allowVisitorModeToggle: 'yes' as never,
      fontPairing: 'comic-sans' as never,
      shapePreset: 'triangle' as never,
      surfaceStyle: 'glossy-blob' as never,
      buttonStyle: '3d-neon' as never,
      density: 'huge' as never,
      textScale: 'xxl' as never,
    });

    expect(hostile).toEqual(DEFAULT_TENANT_APPEARANCE);
  });

  it('calibra colores extremos (#ffff00, #ffffff, #000000) manteniendo contraste >= 4.5:1', () => {
    for (const extremeHex of ['#ffff00', '#ffffff', '#000000', '#00ffaa']) {
      const lightSafe = ensureAccessibleColor(extremeHex, '#faf5ec', 'light', 4.5);
      const darkSafe = ensureAccessibleColor(extremeHex, '#2d241e', 'dark', 4.5);

      expect(getContrastRatio(lightSafe, '#faf5ec')).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(darkSafe, '#2d241e')).toBeGreaterThanOrEqual(4.5);

      const summaryLight = getThemeContrastSummary(
        normalizeTenantAppearance({ customPrimaryHex: extremeHex }),
        'light'
      );
      const summaryDark = getThemeContrastSummary(
        normalizeTenantAppearance({ customPrimaryHex: extremeHex }),
        'dark'
      );
      expect(summaryLight.passesAA).toBe(true);
      expect(summaryDark.passesAA).toBe(true);
    }
  });

  it('deriva automáticamente variantes claro y oscuro desde un único color de fondo personalizado cumpliendo WCAG AA', () => {
    for (const customBg of ['#e8f4ff', '#14213d', '#faf0e6', '#ffff00', '#000000', '#ffffff']) {
      const lightSurface = deriveSurfaceFromCustomBackground(customBg, 'light');
      const darkSurface = deriveSurfaceFromCustomBackground(customBg, 'dark');

      // Texto primario y secundario cumplen AA sobre la superficie derivada
      expect(getContrastRatio(lightSurface.textPrimary, lightSurface.bgSurface)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(lightSurface.textSecondary, lightSurface.bgSurface)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(darkSurface.textPrimary, darkSurface.bgSurface)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(darkSurface.textSecondary, darkSurface.bgSurface)).toBeGreaterThanOrEqual(4.5);

      const config = normalizeTenantAppearance({
        palettePreset: 'electric-cobalt',
        customBackgroundHex: customBg,
      });
      expect(getThemeContrastSummary(config, 'light').passesAA).toBe(true);
      expect(getThemeContrastSummary(config, 'dark').passesAA).toBe(true);
    }

    // Si el color elegido ya es claro (#e8f4ff), lo preserva exacto en modo claro y deriva oscuro
    expect(deriveSurfaceFromCustomBackground('#e8f4ff', 'light').bgBody).toBe('#e8f4ff');
    // Si el color elegido ya es oscuro (#14213d), lo preserva exacto en modo oscuro y deriva claro
    expect(deriveSurfaceFromCustomBackground('#14213d', 'dark').bgBody).toBe('#14213d');
  });

  it('genera variables CSS coherentes para patrones de fondo, cristal suave (glass), bordes pill y tipografías nuevas', () => {
    const glassVars = buildTenantCssVariables(
      {
        palettePreset: 'coral-sunset',
        fontPairing: 'atelier',
        shapePreset: 'pill',
        surfaceStyle: 'glass',
        buttonStyle: 'soft',
        backgroundStyle: 'mesh-glow',
        backgroundIntensity: 'vivid',
        density: 'spacious',
        textScale: 'lg',
      },
      'light'
    );

    expect(glassVars['--color-primary']).toBe('#b33d2e');
    expect(glassVars['--font-display']).toContain('Fraunces');
    expect(glassVars['--radius-sm']).toBe('12px');
    expect(glassVars['--radius-button']).toBe('9999px');
    expect(glassVars['--radius-input']).toBe('22px');
    expect(glassVars['--radius-textarea']).toBe('16px');
    expect(glassVars['--radius-media']).toBe('16px');
    expect(glassVars['--input-icon-gutter']).toBe('44px');
    expect(glassVars['--radius-lg']).toBe('24px');
    expect(glassVars['--surface-backdrop-filter']).toContain('blur(');
    expect(glassVars['--bg-surface']).toContain('rgba(');
    expect(glassVars['--bg-pattern-image']).toContain('radial-gradient');
    expect(parseFloat(glassVars['--font-size-base'])).toBeGreaterThan(0.95);
    expect(parseFloat(glassVars['--space-4'])).toBeGreaterThan(1.0);

    const compactVars = buildTenantCssVariables(
      { density: 'compact', shapePreset: 'soft', surfaceStyle: 'flat', motionPreset: 'none' },
      'light'
    );
    expect(compactVars['--input-icon-gutter']).toBe('40px');
    expect(compactVars['--border-subtle']).toBe('transparent');
    expect(compactVars['--motion-duration-fast']).toBe('0ms');

    for (const style of BACKGROUND_STYLES) {
      const token = buildBackgroundPatternTokens(
        style.id,
        'balanced',
        'light',
        '#2451a6',
        '#5c6b8a',
        '#151518'
      );
      if (style.id === 'solid') {
        expect(token.image).toBe('none');
      } else {
        expect(token.image).not.toBe('none');
      }
    }
  });

  it('areAppearanceConfigsEqual detecta cambios en fondo, estilo de botón o cualquier propiedad nueva', () => {
    expect(areAppearanceConfigsEqual(null, DEFAULT_TENANT_APPEARANCE)).toBe(true);
    expect(
      areAppearanceConfigsEqual(
        { backgroundStyle: 'mesh-glow' },
        DEFAULT_TENANT_APPEARANCE
      )
    ).toBe(false);
    expect(
      areAppearanceConfigsEqual(
        { buttonStyle: 'outline' },
        DEFAULT_TENANT_APPEARANCE
      )
    ).toBe(false);
    expect(
      areAppearanceConfigsEqual(
        { customBackgroundHex: '#eef5ff' },
        DEFAULT_TENANT_APPEARANCE
      )
    ).toBe(false);
  });

  it('mantiene sincronizados todos los 24 presets y nuevos campos con la sanitización y tema de email en backend', () => {
    for (const preset of PALETTE_PRESETS) {
      const sanitized = sanitizeTenantAppearance({
        palettePreset: preset.id,
        backgroundStyle: 'dots',
        backgroundIntensity: 'subtle',
        buttonStyle: 'soft',
        surfaceStyle: 'glass',
        shapePreset: 'pill',
      });
      expect(sanitized?.palettePreset).toBe(preset.id);
      expect(sanitized?.backgroundStyle).toBe('dots');
      expect(sanitized?.buttonStyle).toBe('soft');
      expect(sanitized?.surfaceStyle).toBe('glass');
      expect(sanitized?.shapePreset).toBe('pill');

      const emailTheme = resolveEmailThemeForAppearance(sanitized);
      expect(emailTheme.primary).toBe(preset.primaryLight);
      expect(getContrastRatio(emailTheme.primary, emailTheme.bgSurface)).toBeGreaterThanOrEqual(4.5);
    }

    expect(sanitizeTenantAppearance(null)).toBeNull();
    expect(
      sanitizeTenantAppearance({
        palettePreset: 'unknown',
        customPrimaryHex: 'red; color:blue',
        customBackgroundHex: 'javascript:alert(1)',
        backgroundStyle: 'evil',
        buttonStyle: 'evil',
        heroLayout: 'evil',
        heroImageShape: 'evil',
        heroImageFrame: 'evil',
        heroCopyPreset: 'evil',
      })
    ).toMatchObject({
      palettePreset: 'rose-editorial',
      customPrimaryHex: null,
      customBackgroundHex: null,
      backgroundStyle: 'solid',
      buttonStyle: 'solid',
      heroLayout: 'split-right',
      heroImageShape: 'portrait',
      heroImageFrame: 'editorial-mat',
      heroCopyPreset: 'editorial-beauty',
      heroShowCaption: true,
    });
  });

  it('normaliza y resuelve correctamente layouts, formas, marcos y frases cortas del hero', () => {
    expect(HERO_LAYOUTS.length).toBe(5);
    expect(HERO_IMAGE_SHAPES.length).toBe(6);
    expect(HERO_IMAGE_FRAMES.length).toBe(6);
    expect(HERO_COPY_PRESETS.length).toBe(8);

    const normalized = normalizeTenantAppearance({
      heroLayout: 'overlay-banner',
      heroImageShape: 'arch',
      heroImageFrame: 'polaroid',
      heroCopyPreset: 'wellness-calm',
      heroCustomTitlePrefix: '  Espacio   de\ncalma  ',
      heroCustomTitleHighlight: 'x'.repeat(80),
      heroCustomSubtitle: '   ',
      heroShowCaption: false,
    });

    expect(normalized.heroLayout).toBe('overlay-banner');
    expect(normalized.heroImageShape).toBe('arch');
    expect(normalized.heroImageFrame).toBe('polaroid');
    expect(normalized.heroCopyPreset).toBe('wellness-calm');
    expect(normalized.heroCustomTitlePrefix).toBe('Espacio de calma');
    expect(normalized.heroCustomTitleHighlight?.length).toBe(35);
    expect(normalized.heroCustomSubtitle).toBeNull();
    expect(normalized.heroShowCaption).toBe(false);

    const resolved = resolveHeroCopy(normalized);
    expect(resolved.titlePrefix).toBe('Espacio de calma');
    expect(resolved.titleHighlight.length).toBe(35);
    expect(resolved.subtitle).toContain('sesión online');

    expect(
      areAppearanceConfigsEqual(
        { heroLayout: 'centered' },
        DEFAULT_TENANT_APPEARANCE
      )
    ).toBe(false);
    expect(
      areAppearanceConfigsEqual(
        { heroShowCaption: false },
        DEFAULT_TENANT_APPEARANCE
      )
    ).toBe(false);
    expect(
      areAppearanceConfigsEqual(
        { navbarStyle: 'centered' },
        DEFAULT_TENANT_APPEARANCE
      )
    ).toBe(false);
  });

  it('mantiene paridad exacta de los 31 campos entre frontend y backend y detecta clamping de fondo oscuro en modo claro', () => {
    const clampedLightSummary = getThemeContrastSummary(
      normalizeTenantAppearance({ customBackgroundHex: '#251c33', defaultMode: 'light' }),
      'light'
    );
    expect(clampedLightSummary.wasBackgroundClamped).toBe(true);
    expect(clampedLightSummary.passesAA).toBe(true);

    const payload = {
      palettePreset: 'sage-botanical',
      navbarStyle: 'centered',
      logoShape: 'circle',
      portfolioLayout: 'bento',
      heroShowTrustPills: false,
      showFloatingWhatsApp: true,
      motionPreset: 'subtle',
      heroHighlightStyle: 'italic',
      slotCardStyle: 'accent-bar',
    } as const;

    const fe = normalizeTenantAppearance(payload);
    const be = sanitizeTenantAppearance(payload);
    expect(be).toEqual(fe);

    const dirtyBe = sanitizeTenantAppearance({
      navbarStyle: 'invalid-nav',
      logoShape: 'hexagon',
      portfolioLayout: 'masonry',
      heroShowTrustPills: 'nope',
      showFloatingWhatsApp: 'yes',
      motionPreset: 'hyper',
      heroHighlightStyle: 'blink',
      slotCardStyle: 'floating',
    });
    expect(dirtyBe).toEqual(DEFAULT_TENANT_APPEARANCE);
  });
});
