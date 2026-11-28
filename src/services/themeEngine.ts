import type {
  BackgroundIntensity,
  BackgroundStyleId,
  ButtonStyleId,
  DefaultThemeMode,
  DensityScaleId,
  FontPairingId,
  HeroCopyPresetId,
  HeroHighlightStyleId,
  HeroImageFrameId,
  HeroImageShapeId,
  HeroLayoutId,
  LogoShapeId,
  MotionPresetId,
  NavbarStyleId,
  PalettePresetId,
  PortfolioLayoutId,
  ShapePresetId,
  SlotCardStyleId,
  SurfaceStyleId,
  SurfaceTemperature,
  TenantAppearanceConfig,
  TextScaleId,
} from '../types';
import {
  BACKGROUND_INTENSITY_MAP,
  DEFAULT_TENANT_APPEARANCE,
  DENSITY_SCALE_MAP,
  FONT_PAIRINGS,
  FONT_PAIRING_MAP,
  HERO_COPY_PRESET_MAP,
  MOTION_PRESET_MAP,
  PALETTE_PRESET_MAP,
  SHAPE_PRESET_MAP,
  SURFACE_TEMPERATURES,
  TEXT_SCALE_MAP,
  type SurfacePaletteTokens,
} from '../config/themePresets';
import { FIELD_LIMITS } from '../config/fieldLimits';

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;
const VALID_MODES = new Set<DefaultThemeMode>(['light', 'dark', 'system']);
const VALID_SURFACE_TEMPS = new Set<SurfaceTemperature>([
  'warm',
  'neutral',
  'cool',
  'paper',
  'blush',
  'sage',
]);
const VALID_SURFACE_STYLES = new Set<SurfaceStyleId>(['bordered', 'elevated', 'flat', 'glass']);
const VALID_BUTTON_STYLES = new Set<ButtonStyleId>(['solid', 'soft', 'outline']);
const VALID_BACKGROUND_STYLES = new Set<BackgroundStyleId>([
  'solid',
  'soft-gradient',
  'mesh-glow',
  'dots',
  'grid',
  'diagonal',
]);
const VALID_HERO_LAYOUTS = new Set<HeroLayoutId>([
  'split-right',
  'split-left',
  'centered',
  'overlay-banner',
  'minimal-compact',
]);
const VALID_HERO_SHAPES = new Set<HeroImageShapeId>([
  'portrait',
  'arch',
  'circle',
  'square',
  'landscape',
  'organic',
]);
const VALID_HERO_FRAMES = new Set<HeroImageFrameId>([
  'editorial-mat',
  'minimal-border',
  'double-line',
  'offset-accent',
  'polaroid',
  'floating-caption',
]);
const VALID_NAVBAR_STYLES = new Set<NavbarStyleId>(['floating', 'solid', 'centered']);
const VALID_LOGO_SHAPES = new Set<LogoShapeId>(['rounded', 'square', 'circle', 'frameless']);
const VALID_PORTFOLIO_LAYOUTS = new Set<PortfolioLayoutId>(['grid', 'bento', 'carousel']);
const VALID_MOTION_PRESETS = new Set<MotionPresetId>(['fluid', 'subtle', 'none']);
const VALID_HERO_HIGHLIGHTS = new Set<HeroHighlightStyleId>(['accent', 'italic', 'underline']);
const VALID_SLOT_CARD_STYLES = new Set<SlotCardStyleId>(['classic', 'accent-bar', 'compact']);

const sanitizeHeroText = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
};

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface HslColor {
  h: number;
  s: number;
  l: number;
}

const BASE_FONT_SIZES_REM: Record<string, number> = {
  '--font-size-2xs': 0.785,
  '--font-size-xs': 0.8125,
  '--font-size-sm': 0.875,
  '--font-size-base': 0.9375,
  '--font-size-md': 1.0,
  '--font-size-lg': 1.125,
  '--font-size-xl': 1.25,
  '--font-size-2xl': 1.5,
  '--font-size-3xl': 1.875,
  '--font-size-4xl': 2.25,
  '--font-size-5xl': 2.75,
  '--font-size-6xl': 3.5,
  '--font-size-7xl': 4.25,
};

const SCALABLE_SPACES_REM: Record<string, number> = {
  '--space-4': 1.0,
  '--space-4-5': 1.125,
  '--space-5': 1.25,
  '--space-6': 1.5,
  '--space-7': 1.75,
  '--space-8': 2.0,
  '--space-10': 2.5,
  '--space-12': 3.0,
  '--space-14': 3.5,
  '--space-16': 4.0,
  '--space-20': 5.0,
  '--space-24': 6.0,
};

const clamp = (val: number, min: number, max: number): number => Math.min(max, Math.max(min, val));

export const normalizeHexColor = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-f]{3}$/.test(withHash)) {
    return `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`;
  }
  return HEX_COLOR_REGEX.test(withHash) ? withHash : null;
};

export const hexToRgb = (hex: string): RgbColor => {
  const clean = normalizeHexColor(hex) || '#9e4f5e';
  const num = parseInt(clean.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

export const rgbToHex = ({ r, g, b }: RgbColor): string => {
  const toByte = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
};

export const rgbToHsl = ({ r, g, b }: RgbColor): HslColor => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
};

export const hslToRgb = ({ h, s, l }: HslColor): RgbColor => {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hn < 60) {
    r1 = c;
    g1 = x;
  } else if (hn < 120) {
    r1 = x;
    g1 = c;
  } else if (hn < 180) {
    g1 = c;
    b1 = x;
  } else if (hn < 240) {
    g1 = x;
    b1 = c;
  } else if (hn < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
};

export const hslToHex = (hsl: HslColor): string => rgbToHex(hslToRgb(hsl));

export const getRelativeLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v: number) => {
    const srgb = v / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

export const getContrastRatio = (hexA: string, hexB: string): number => {
  const lumA = getRelativeLuminance(hexA);
  const lumB = getRelativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Ensures any tenant-supplied brand color maintains WCAG AA readability (>= 4.5:1)
 * against the active surface in both light and dark modes.
 */
export const ensureAccessibleColor = (
  hex: string,
  surfaceHex: string,
  mode: 'light' | 'dark',
  minRatio = 4.5
): string => {
  const clean = normalizeHexColor(hex) || '#9e4f5e';
  if (getContrastRatio(clean, surfaceHex) >= minRatio) {
    return clean;
  }

  const baseHsl = rgbToHsl(hexToRgb(clean));
  const targetSat = mode === 'dark' ? Math.min(baseHsl.s, 68) : baseHsl.s;
  let l = baseHsl.l;

  for (let step = 0; step < 60; step += 1) {
    l = mode === 'light' ? clamp(l - 2, 10, 92) : clamp(l + 2, 18, 92);
    const candidate = hslToHex({ h: baseHsl.h, s: targetSat, l });
    if (getContrastRatio(candidate, surfaceHex) >= minRatio) {
      return candidate;
    }
  }

  return mode === 'light'
    ? hslToHex({ h: baseHsl.h, s: targetSat, l: 24 })
    : hslToHex({ h: baseHsl.h, s: targetSat, l: 82 });
};

export const pickAccessibleForeground = (
  bgHex: string,
  darkTextHex = '#1d1c1b',
  lightTextHex = '#ffffff'
): string => {
  const lightRatio = getContrastRatio(bgHex, lightTextHex);
  const darkRatio = getContrastRatio(bgHex, darkTextHex);
  return lightRatio >= darkRatio ? lightTextHex : darkTextHex;
};

/**
 * Derives a complete, harmonious light or dark surface hierarchy from a single
 * user-selected background HEX, keeping secondary text tinted from the chosen hue.
 */
export const deriveSurfaceFromCustomBackground = (
  customBgHex: string,
  mode: 'light' | 'dark'
): SurfacePaletteTokens => {
  const clean = normalizeHexColor(customBgHex) || '#f1e9dc';
  const rawHsl = rgbToHsl(hexToRgb(clean));
  const isNeutral = rawHsl.s <= 6;
  const hue = rawHsl.h;

  if (mode === 'light') {
    const bgBody =
      rawHsl.l >= 74
        ? clean
        : hslToHex({
          h: hue,
          s: isNeutral ? rawHsl.s : clamp(rawHsl.s, 10, 38),
          l: 92,
        });
    const bodyHsl = rgbToHsl(hexToRgb(bgBody));
    const surfaceSat = isNeutral ? bodyHsl.s : clamp(Math.round(bodyHsl.s * 0.6), 4, 28);
    const bgSurface =
      bodyHsl.l >= 96
        ? '#ffffff'
        : hslToHex({ h: hue, s: surfaceSat, l: clamp(bodyHsl.l + 5, 95, 99) });
    const bgSurfaceElevated = '#ffffff';
    const bgSurfaceSubtle = hslToHex({
      h: hue,
      s: isNeutral ? bodyHsl.s : clamp(Math.round(bodyHsl.s * 0.85), 6, 32),
      l: clamp(bodyHsl.l - 5, 82, 93),
    });
    const bgSurfaceHover = hslToHex({
      h: hue,
      s: isNeutral ? bodyHsl.s : clamp(Math.round(bodyHsl.s * 0.9), 6, 34),
      l: clamp(bodyHsl.l - 9, 76, 88),
    });
    const borderSubtle = hslToHex({
      h: hue,
      s: isNeutral ? 5 : clamp(Math.round(bodyHsl.s * 0.7), 8, 28),
      l: clamp(bodyHsl.l - 9, 76, 89),
    });
    const borderMedium = hslToHex({
      h: hue,
      s: isNeutral ? 6 : clamp(Math.round(bodyHsl.s * 0.75), 10, 30),
      l: clamp(bodyHsl.l - 16, 66, 81),
    });
    const borderStrong = hslToHex({
      h: hue,
      s: isNeutral ? 7 : clamp(Math.round(bodyHsl.s * 0.75), 10, 30),
      l: clamp(bodyHsl.l - 25, 54, 71),
    });
    const textSat = isNeutral ? 4 : clamp(Math.round(bodyHsl.s * 0.45), 8, 18);
    const textPrimary = hslToHex({ h: hue, s: textSat, l: 13 });
    const textSecondary = ensureAccessibleColor(
      hslToHex({ h: hue, s: textSat, l: 33 }),
      bgSurface,
      'light',
      4.5
    );
    const textMuted = ensureAccessibleColor(
      hslToHex({ h: hue, s: textSat, l: 44 }),
      bgSurface,
      'light',
      4.5
    );
    const shadowRgbObj = hexToRgb(textPrimary);

    return {
      bgBody,
      bgSurface,
      bgSurfaceElevated,
      bgSurfaceSubtle,
      bgSurfaceHover,
      bgBackdrop: `rgba(${shadowRgbObj.r}, ${shadowRgbObj.g}, ${shadowRgbObj.b}, 0.45)`,
      borderSubtle,
      borderMedium,
      borderStrong,
      textPrimary,
      textSecondary,
      textMuted,
      shadowRgb: `${shadowRgbObj.r}, ${shadowRgbObj.g}, ${shadowRgbObj.b}`,
    };
  }

  // Dark mode: preserve exact color when already dark, otherwise derive deep counterpart
  const bgBody =
    rawHsl.l <= 22
      ? clean
      : hslToHex({
        h: hue,
        s: isNeutral ? rawHsl.s : clamp(Math.round(rawHsl.s * 0.65), 8, 30),
        l: 12,
      });
  const bodyHsl = rgbToHsl(hexToRgb(bgBody));
  const bgSurface = hslToHex({
    h: hue,
    s: bodyHsl.s,
    l: clamp(bodyHsl.l + 5, 16, 25),
  });
  const bgSurfaceElevated = hslToHex({
    h: hue,
    s: bodyHsl.s,
    l: clamp(bodyHsl.l + 10, 21, 30),
  });
  const tintRgb = hslToRgb({ h: hue, s: isNeutral ? 4 : 24, l: 92 });
  const tintCsv = `${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}`;
  const textSat = isNeutral ? 4 : clamp(Math.round(bodyHsl.s * 0.5), 8, 22);
  const textPrimary = hslToHex({ h: hue, s: textSat, l: 94 });
  const textSecondary = ensureAccessibleColor(
    hslToHex({ h: hue, s: textSat, l: 77 }),
    bgSurface,
    'dark',
    4.5
  );
  const textMuted = ensureAccessibleColor(
    hslToHex({ h: hue, s: textSat, l: 64 }),
    bgSurface,
    'dark',
    4.5
  );

  return {
    bgBody,
    bgSurface,
    bgSurfaceElevated,
    bgSurfaceSubtle: `rgba(${tintCsv}, 0.06)`,
    bgSurfaceHover: `rgba(${tintCsv}, 0.11)`,
    bgBackdrop: 'rgba(8, 10, 14, 0.74)',
    borderSubtle: `rgba(${tintCsv}, 0.12)`,
    borderMedium: `rgba(${tintCsv}, 0.2)`,
    borderStrong: `rgba(${tintCsv}, 0.3)`,
    textPrimary,
    textSecondary,
    textMuted,
    shadowRgb: '6, 8, 12',
  };
};

export const normalizeTenantAppearance = (
  raw: Partial<TenantAppearanceConfig> | null | undefined
): TenantAppearanceConfig => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_TENANT_APPEARANCE };
  }

  const palettePreset: PalettePresetId =
    typeof raw.palettePreset === 'string' && raw.palettePreset in PALETTE_PRESET_MAP
      ? (raw.palettePreset as PalettePresetId)
      : DEFAULT_TENANT_APPEARANCE.palettePreset;

  const customPrimaryHex = normalizeHexColor(raw.customPrimaryHex);
  const customAccentHex = normalizeHexColor(raw.customAccentHex);
  const customBackgroundHex = normalizeHexColor(raw.customBackgroundHex);

  const surfaceTemperature: SurfaceTemperature | null =
    typeof raw.surfaceTemperature === 'string' &&
      VALID_SURFACE_TEMPS.has(raw.surfaceTemperature as SurfaceTemperature)
      ? (raw.surfaceTemperature as SurfaceTemperature)
      : null;

  const backgroundStyle: BackgroundStyleId =
    typeof raw.backgroundStyle === 'string' &&
      VALID_BACKGROUND_STYLES.has(raw.backgroundStyle as BackgroundStyleId)
      ? (raw.backgroundStyle as BackgroundStyleId)
      : DEFAULT_TENANT_APPEARANCE.backgroundStyle;

  const backgroundIntensity: BackgroundIntensity =
    typeof raw.backgroundIntensity === 'string' &&
      raw.backgroundIntensity in BACKGROUND_INTENSITY_MAP
      ? (raw.backgroundIntensity as BackgroundIntensity)
      : DEFAULT_TENANT_APPEARANCE.backgroundIntensity;

  const defaultMode: DefaultThemeMode =
    typeof raw.defaultMode === 'string' && VALID_MODES.has(raw.defaultMode as DefaultThemeMode)
      ? (raw.defaultMode as DefaultThemeMode)
      : DEFAULT_TENANT_APPEARANCE.defaultMode;

  const allowVisitorModeToggle =
    typeof raw.allowVisitorModeToggle === 'boolean'
      ? raw.allowVisitorModeToggle
      : DEFAULT_TENANT_APPEARANCE.allowVisitorModeToggle;

  const fontPairing: FontPairingId =
    typeof raw.fontPairing === 'string' && raw.fontPairing in FONT_PAIRING_MAP
      ? (raw.fontPairing as FontPairingId)
      : DEFAULT_TENANT_APPEARANCE.fontPairing;

  const shapePreset: ShapePresetId =
    typeof raw.shapePreset === 'string' && raw.shapePreset in SHAPE_PRESET_MAP
      ? (raw.shapePreset as ShapePresetId)
      : DEFAULT_TENANT_APPEARANCE.shapePreset;

  const surfaceStyle: SurfaceStyleId =
    typeof raw.surfaceStyle === 'string' &&
      VALID_SURFACE_STYLES.has(raw.surfaceStyle as SurfaceStyleId)
      ? (raw.surfaceStyle as SurfaceStyleId)
      : DEFAULT_TENANT_APPEARANCE.surfaceStyle;

  const buttonStyle: ButtonStyleId =
    typeof raw.buttonStyle === 'string' &&
      VALID_BUTTON_STYLES.has(raw.buttonStyle as ButtonStyleId)
      ? (raw.buttonStyle as ButtonStyleId)
      : DEFAULT_TENANT_APPEARANCE.buttonStyle;

  const density: DensityScaleId =
    typeof raw.density === 'string' && raw.density in DENSITY_SCALE_MAP
      ? (raw.density as DensityScaleId)
      : DEFAULT_TENANT_APPEARANCE.density;

  const textScale: TextScaleId =
    typeof raw.textScale === 'string' && raw.textScale in TEXT_SCALE_MAP
      ? (raw.textScale as TextScaleId)
      : DEFAULT_TENANT_APPEARANCE.textScale;

  const heroLayout: HeroLayoutId =
    typeof raw.heroLayout === 'string' && VALID_HERO_LAYOUTS.has(raw.heroLayout as HeroLayoutId)
      ? (raw.heroLayout as HeroLayoutId)
      : DEFAULT_TENANT_APPEARANCE.heroLayout;

  const heroImageShape: HeroImageShapeId =
    typeof raw.heroImageShape === 'string' &&
      VALID_HERO_SHAPES.has(raw.heroImageShape as HeroImageShapeId)
      ? (raw.heroImageShape as HeroImageShapeId)
      : DEFAULT_TENANT_APPEARANCE.heroImageShape;

  const heroImageFrame: HeroImageFrameId =
    typeof raw.heroImageFrame === 'string' &&
      VALID_HERO_FRAMES.has(raw.heroImageFrame as HeroImageFrameId)
      ? (raw.heroImageFrame as HeroImageFrameId)
      : DEFAULT_TENANT_APPEARANCE.heroImageFrame;

  const heroCopyPreset: HeroCopyPresetId =
    typeof raw.heroCopyPreset === 'string' && raw.heroCopyPreset in HERO_COPY_PRESET_MAP
      ? (raw.heroCopyPreset as HeroCopyPresetId)
      : DEFAULT_TENANT_APPEARANCE.heroCopyPreset;

  const heroCustomTitlePrefix = sanitizeHeroText(
    raw.heroCustomTitlePrefix,
    FIELD_LIMITS.hero.titlePrefix.max
  );
  const heroCustomTitleHighlight = sanitizeHeroText(
    raw.heroCustomTitleHighlight,
    FIELD_LIMITS.hero.titleHighlight.max
  );
  const heroCustomSubtitle = sanitizeHeroText(
    raw.heroCustomSubtitle,
    FIELD_LIMITS.hero.subtitle.max
  );

  const heroShowCaption =
    typeof raw.heroShowCaption === 'boolean'
      ? raw.heroShowCaption
      : DEFAULT_TENANT_APPEARANCE.heroShowCaption;

  const navbarStyle: NavbarStyleId =
    typeof raw.navbarStyle === 'string' && VALID_NAVBAR_STYLES.has(raw.navbarStyle as NavbarStyleId)
      ? (raw.navbarStyle as NavbarStyleId)
      : DEFAULT_TENANT_APPEARANCE.navbarStyle;

  const logoShape: LogoShapeId =
    typeof raw.logoShape === 'string' && VALID_LOGO_SHAPES.has(raw.logoShape as LogoShapeId)
      ? (raw.logoShape as LogoShapeId)
      : DEFAULT_TENANT_APPEARANCE.logoShape;

  const portfolioLayout: PortfolioLayoutId =
    typeof raw.portfolioLayout === 'string' &&
      VALID_PORTFOLIO_LAYOUTS.has(raw.portfolioLayout as PortfolioLayoutId)
      ? (raw.portfolioLayout as PortfolioLayoutId)
      : DEFAULT_TENANT_APPEARANCE.portfolioLayout;

  const heroShowTrustPills =
    typeof raw.heroShowTrustPills === 'boolean'
      ? raw.heroShowTrustPills
      : DEFAULT_TENANT_APPEARANCE.heroShowTrustPills;

  const showFloatingWhatsApp =
    typeof raw.showFloatingWhatsApp === 'boolean'
      ? raw.showFloatingWhatsApp
      : DEFAULT_TENANT_APPEARANCE.showFloatingWhatsApp;

  const motionPreset: MotionPresetId =
    typeof raw.motionPreset === 'string' &&
      VALID_MOTION_PRESETS.has(raw.motionPreset as MotionPresetId)
      ? (raw.motionPreset as MotionPresetId)
      : DEFAULT_TENANT_APPEARANCE.motionPreset;

  const heroHighlightStyle: HeroHighlightStyleId =
    typeof raw.heroHighlightStyle === 'string' &&
      VALID_HERO_HIGHLIGHTS.has(raw.heroHighlightStyle as HeroHighlightStyleId)
      ? (raw.heroHighlightStyle as HeroHighlightStyleId)
      : DEFAULT_TENANT_APPEARANCE.heroHighlightStyle;

  const slotCardStyle: SlotCardStyleId =
    typeof raw.slotCardStyle === 'string' &&
      VALID_SLOT_CARD_STYLES.has(raw.slotCardStyle as SlotCardStyleId)
      ? (raw.slotCardStyle as SlotCardStyleId)
      : DEFAULT_TENANT_APPEARANCE.slotCardStyle;

  return {
    palettePreset,
    customPrimaryHex,
    customAccentHex,
    surfaceTemperature,
    customBackgroundHex,
    backgroundStyle,
    backgroundIntensity,
    defaultMode,
    allowVisitorModeToggle,
    fontPairing,
    shapePreset,
    surfaceStyle,
    buttonStyle,
    density,
    textScale,
    heroLayout,
    heroImageShape,
    heroImageFrame,
    heroCopyPreset,
    heroCustomTitlePrefix,
    heroCustomTitleHighlight,
    heroCustomSubtitle,
    heroShowCaption,
    navbarStyle,
    logoShape,
    portfolioLayout,
    heroShowTrustPills,
    showFloatingWhatsApp,
    motionPreset,
    heroHighlightStyle,
    slotCardStyle,
  };
};

export const resolveHeroCopy = (
  config: Partial<TenantAppearanceConfig> | null | undefined
): {
  titlePrefix: string;
  titleHighlight: string;
  subtitle: string;
} => {
  const normalized = normalizeTenantAppearance(config);
  const preset = HERO_COPY_PRESET_MAP[normalized.heroCopyPreset];
  return {
    titlePrefix: normalized.heroCustomTitlePrefix ?? preset.titlePrefix,
    titleHighlight: normalized.heroCustomTitleHighlight ?? preset.titleHighlight,
    subtitle: normalized.heroCustomSubtitle ?? preset.subtitle,
  };
};

export const resolveEffectiveSurfaceTemperature = (
  config: TenantAppearanceConfig
): SurfaceTemperature => {
  if (config.surfaceTemperature && config.surfaceTemperature in SURFACE_TEMPERATURES) {
    return config.surfaceTemperature;
  }
  return PALETTE_PRESET_MAP[config.palettePreset].defaultSurface;
};

export const resolveEffectiveSurfaceTokens = (
  config: TenantAppearanceConfig,
  mode: 'light' | 'dark'
): SurfacePaletteTokens => {
  if (config.customBackgroundHex) {
    return deriveSurfaceFromCustomBackground(config.customBackgroundHex, mode);
  }
  const surfaceTemp = resolveEffectiveSurfaceTemperature(config);
  return SURFACE_TEMPERATURES[surfaceTemp][mode];
};

export const resolveEffectiveBrandHex = (
  config: TenantAppearanceConfig,
  mode: 'light' | 'dark'
): { primary: string; accent: string } => {
  const preset = PALETTE_PRESET_MAP[config.palettePreset];
  const surfaceBg = resolveEffectiveSurfaceTokens(config, mode).bgSurface;

  const rawPrimary = config.customPrimaryHex
    ? mode === 'dark'
      ? (() => {
        const hsl = rgbToHsl(hexToRgb(config.customPrimaryHex));
        return hslToHex({
          h: hsl.h,
          s: Math.min(hsl.s, 65),
          l: clamp(Math.max(hsl.l, 70), 66, 80),
        });
      })()
      : config.customPrimaryHex
    : mode === 'dark'
      ? preset.primaryDark
      : preset.primaryLight;

  const rawAccent = config.customAccentHex
    ? mode === 'dark'
      ? (() => {
        const hsl = rgbToHsl(hexToRgb(config.customAccentHex));
        return hslToHex({
          h: hsl.h,
          s: Math.min(hsl.s, 55),
          l: clamp(Math.max(hsl.l, 68), 64, 78),
        });
      })()
      : config.customAccentHex
    : mode === 'dark'
      ? preset.accentDark
      : preset.accentLight;

  return {
    primary: ensureAccessibleColor(rawPrimary, surfaceBg, mode, 4.5),
    accent: ensureAccessibleColor(rawAccent, surfaceBg, mode, 3.8),
  };
};

export const buildBackgroundPatternTokens = (
  backgroundStyle: BackgroundStyleId,
  intensity: BackgroundIntensity,
  mode: 'light' | 'dark',
  primaryHex: string,
  accentHex: string,
  textPrimaryHex: string
): { image: string; size: string } => {
  if (backgroundStyle === 'solid') {
    return { image: 'none', size: 'auto' };
  }

  const mult = BACKGROUND_INTENSITY_MAP[intensity]?.multiplier ?? 1.0;
  const p = hexToRgb(primaryHex);
  const a = hexToRgb(accentHex);
  const t = hexToRgb(textPrimaryHex);
  const alpha = (base: number) => clamp(Number((base * mult).toFixed(3)), 0.02, 0.36);

  switch (backgroundStyle) {
    case 'soft-gradient': {
      const a1 = alpha(mode === 'light' ? 0.13 : 0.16);
      const a2 = alpha(mode === 'light' ? 0.09 : 0.11);
      return {
        image: `linear-gradient(135deg, rgba(${p.r}, ${p.g}, ${p.b}, ${a1}) 0%, transparent 48%, rgba(${a.r}, ${a.g}, ${a.b}, ${a2}) 100%)`,
        size: '100% 100%',
      };
    }
    case 'mesh-glow': {
      const a1 = alpha(mode === 'light' ? 0.15 : 0.18);
      const a2 = alpha(mode === 'light' ? 0.13 : 0.15);
      const a3 = alpha(mode === 'light' ? 0.09 : 0.12);
      return {
        image: [
          `radial-gradient(circle at 12% 14%, rgba(${p.r}, ${p.g}, ${p.b}, ${a1}) 0%, transparent 46%)`,
          `radial-gradient(circle at 88% 18%, rgba(${a.r}, ${a.g}, ${a.b}, ${a2}) 0%, transparent 44%)`,
          `radial-gradient(circle at 52% 94%, rgba(${p.r}, ${p.g}, ${p.b}, ${a3}) 0%, transparent 50%)`,
        ].join(', '),
        size: '100% 100%',
      };
    }
    case 'dots': {
      const aDot = alpha(mode === 'light' ? 0.14 : 0.16);
      return {
        image: `radial-gradient(rgba(${t.r}, ${t.g}, ${t.b}, ${aDot}) 1.2px, transparent 1.2px)`,
        size: '20px 20px',
      };
    }
    case 'grid': {
      const aLine = alpha(mode === 'light' ? 0.08 : 0.1);
      return {
        image: `linear-gradient(to right, rgba(${t.r}, ${t.g}, ${t.b}, ${aLine}) 1px, transparent 1px), linear-gradient(to bottom, rgba(${t.r}, ${t.g}, ${t.b}, ${aLine}) 1px, transparent 1px)`,
        size: '30px 30px',
      };
    }
    case 'diagonal': {
      const aLine = alpha(mode === 'light' ? 0.075 : 0.09);
      return {
        image: `repeating-linear-gradient(-45deg, rgba(${t.r}, ${t.g}, ${t.b}, ${aLine}) 0 1px, transparent 1px 14px)`,
        size: 'auto',
      };
    }
    default:
      return { image: 'none', size: 'auto' };
  }
};

export interface ThemeContrastSummary {
  primaryHex: string;
  accentHex: string;
  softButtonTextHex: string;
  buttonTextHex: string;
  surfaceBgHex: string;
  bgBodyHex: string;
  primaryOnSurfaceRatio: number;
  primaryOnBodyRatio: number;
  textOnPrimaryRatio: number;
  softButtonRatio: number;
  accentOnSurfaceRatio: number;
  wasPrimaryAdjusted: boolean;
  wasAccentAdjusted: boolean;
  wasBackgroundClamped: boolean;
  passesAA: boolean;
}

const computeLightSoftBgHex = (primaryHex: string): string => {
  const hsl = rgbToHsl(hexToRgb(primaryHex));
  return hslToHex({ h: hsl.h, s: clamp(hsl.s, 14, 42), l: 95 });
};

const blendRgbaOverHex = (fgRgb: RgbColor, alpha: number, bgHex: string): string => {
  const bg = hexToRgb(bgHex);
  return rgbToHex({
    r: fgRgb.r * alpha + bg.r * (1 - alpha),
    g: fgRgb.g * alpha + bg.g * (1 - alpha),
    b: fgRgb.b * alpha + bg.b * (1 - alpha),
  });
};

export const getThemeContrastSummary = (
  config: TenantAppearanceConfig,
  mode: 'light' | 'dark'
): ThemeContrastSummary => {
  const surface = resolveEffectiveSurfaceTokens(config, mode);
  const { primary, accent } = resolveEffectiveBrandHex(config, mode);
  const buttonTextHex = pickAccessibleForeground(primary, surface.bgBody, '#ffffff');
  const primaryOnSurfaceRatio = Number(getContrastRatio(primary, surface.bgSurface).toFixed(2));
  const primaryOnBodyRatio = Number(getContrastRatio(primary, surface.bgBody).toFixed(2));
  const textOnPrimaryRatio = Number(getContrastRatio(primary, buttonTextHex).toFixed(2));
  const accentOnSurfaceRatio = Number(getContrastRatio(accent, surface.bgSurface).toFixed(2));

  const softButtonBgHex =
    mode === 'light'
      ? computeLightSoftBgHex(primary)
      : blendRgbaOverHex(hexToRgb(primary), 0.15, surface.bgSurface);
  const softButtonTextHex = ensureAccessibleColor(primary, softButtonBgHex, mode, 4.5);
  const softButtonRatio = Number(getContrastRatio(softButtonTextHex, softButtonBgHex).toFixed(2));

  const wasPrimaryAdjusted = Boolean(
    config.customPrimaryHex && config.customPrimaryHex.toLowerCase() !== primary.toLowerCase()
  );
  const wasAccentAdjusted = Boolean(
    config.customAccentHex && config.customAccentHex.toLowerCase() !== accent.toLowerCase()
  );
  const wasBackgroundClamped = Boolean(
    config.customBackgroundHex &&
    config.customBackgroundHex.toLowerCase() !== surface.bgBody.toLowerCase()
  );

  return {
    primaryHex: primary,
    accentHex: accent,
    softButtonTextHex,
    buttonTextHex,
    surfaceBgHex: surface.bgSurface,
    bgBodyHex: surface.bgBody,
    primaryOnSurfaceRatio,
    primaryOnBodyRatio,
    textOnPrimaryRatio,
    softButtonRatio,
    accentOnSurfaceRatio,
    wasPrimaryAdjusted,
    wasAccentAdjusted,
    wasBackgroundClamped,
    passesAA:
      primaryOnSurfaceRatio >= 4.5 && textOnPrimaryRatio >= 4.5 && softButtonRatio >= 4.5,
  };
};

export const buildTenantCssVariables = (
  rawConfig: Partial<TenantAppearanceConfig> | null | undefined,
  mode: 'light' | 'dark'
): Record<string, string> => {
  const config = normalizeTenantAppearance(rawConfig);
  const surface = resolveEffectiveSurfaceTokens(config, mode);
  const { primary, accent } = resolveEffectiveBrandHex(config, mode);

  const primaryRgb = hexToRgb(primary);
  const primaryHsl = rgbToHsl(primaryRgb);
  const accentRgb = hexToRgb(accent);
  const accentHsl = rgbToHsl(accentRgb);

  const primaryHover =
    mode === 'light'
      ? hslToHex({ h: primaryHsl.h, s: primaryHsl.s, l: clamp(primaryHsl.l - 6, 10, 88) })
      : hslToHex({ h: primaryHsl.h, s: primaryHsl.s, l: clamp(primaryHsl.l - 6, 48, 88) });
  const primaryActive =
    mode === 'light'
      ? hslToHex({ h: primaryHsl.h, s: primaryHsl.s, l: clamp(primaryHsl.l - 12, 8, 84) })
      : hslToHex({ h: primaryHsl.h, s: primaryHsl.s, l: clamp(primaryHsl.l - 12, 42, 82) });
  const primaryLight =
    mode === 'light'
      ? hslToHex({ h: primaryHsl.h, s: clamp(primaryHsl.s, 14, 42), l: 95 })
      : `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.15)`;
  const primaryBorder =
    mode === 'light'
      ? hslToHex({ h: primaryHsl.h, s: clamp(primaryHsl.s, 14, 42), l: 83 })
      : `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.32)`;
  const softButtonBgHex =
    mode === 'light'
      ? primaryLight
      : blendRgbaOverHex(primaryRgb, 0.15, surface.bgSurface);
  const primarySoftText = ensureAccessibleColor(primary, softButtonBgHex, mode, 4.5);
  const primaryGlow = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${mode === 'light' ? '0.14' : '0.18'})`;

  const accentHover = hslToHex({
    h: accentHsl.h,
    s: accentHsl.s,
    l: clamp(accentHsl.l - 7, 14, 86),
  });
  const accentLight =
    mode === 'light'
      ? hslToHex({ h: accentHsl.h, s: clamp(accentHsl.s, 10, 32), l: 94 })
      : `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.14)`;
  const accentBorder =
    mode === 'light'
      ? hslToHex({ h: accentHsl.h, s: clamp(accentHsl.s, 10, 30), l: 82 })
      : `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.28)`;
  const accentGlow = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${mode === 'light' ? '0.14' : '0.18'})`;

  const textInverse = pickAccessibleForeground(primary, surface.bgBody, '#ffffff');
  const fonts = FONT_PAIRING_MAP[config.fontPairing];
  const shape = SHAPE_PRESET_MAP[config.shapePreset];
  const motion = MOTION_PRESET_MAP[config.motionPreset];
  const densityFactor = DENSITY_SCALE_MAP[config.density].factor;
  const textFactor = TEXT_SCALE_MAP[config.textScale].factor;

  const pattern = buildBackgroundPatternTokens(
    config.backgroundStyle,
    config.backgroundIntensity,
    mode,
    primary,
    accent,
    surface.textPrimary
  );

  let shadowSm = `0 1px 2px rgba(${surface.shadowRgb}, 0.04)`;
  let shadowMd = `0 4px 12px rgba(${surface.shadowRgb}, 0.06)`;
  let shadowLg = `0 8px 24px rgba(${surface.shadowRgb}, 0.08)`;
  let shadowXl = `0 16px 36px rgba(${surface.shadowRgb}, 0.1)`;
  let shadowGlass = `0 4px 16px rgba(${surface.shadowRgb}, 0.04)`;
  let borderSubtle = surface.borderSubtle;
  let borderMedium = surface.borderMedium;
  let emittedSurface = surface.bgSurface;
  let emittedSurfaceElevated = surface.bgSurfaceElevated;
  let emittedModal = surface.bgSurfaceElevated;
  let surfaceBackdropFilter = 'none';

  if (config.surfaceStyle === 'flat') {
    shadowSm = 'none';
    shadowMd = 'none';
    shadowLg = 'none';
    shadowXl = 'none';
    shadowGlass = 'none';
    borderSubtle = 'transparent';
    borderMedium = surface.borderSubtle;
    emittedSurface = surface.bgSurface;
  } else if (config.surfaceStyle === 'bordered' && mode === 'dark') {
    shadowSm = 'none';
    shadowMd = 'none';
    shadowLg = 'none';
    shadowXl = 'none';
    shadowGlass = 'none';
  } else if (config.surfaceStyle === 'elevated') {
    if (mode === 'light') {
      shadowSm = `0 2px 8px rgba(${surface.shadowRgb}, 0.06), 0 1px 2px rgba(${surface.shadowRgb}, 0.04)`;
      shadowMd = `0 8px 22px rgba(${surface.shadowRgb}, 0.09), 0 2px 6px rgba(${surface.shadowRgb}, 0.05)`;
      shadowLg = `0 14px 34px rgba(${surface.shadowRgb}, 0.12), 0 4px 10px rgba(${surface.shadowRgb}, 0.06)`;
      shadowXl = `0 24px 48px rgba(${surface.shadowRgb}, 0.15)`;
      shadowGlass = `0 10px 28px rgba(${surface.shadowRgb}, 0.09)`;
      borderSubtle = `rgba(${surface.shadowRgb}, 0.07)`;
    } else {
      shadowSm = `0 2px 10px rgba(${surface.shadowRgb}, 0.42)`;
      shadowMd = `0 8px 24px rgba(${surface.shadowRgb}, 0.52)`;
      shadowLg = `0 14px 34px rgba(${surface.shadowRgb}, 0.6)`;
      shadowXl = `0 24px 48px rgba(${surface.shadowRgb}, 0.7)`;
      shadowGlass = `0 10px 28px rgba(${surface.shadowRgb}, 0.5)`;
      borderSubtle = 'rgba(255, 255, 255, 0.09)';
    }
  } else if (config.surfaceStyle === 'glass') {
    const surfRgb = hexToRgb(surface.bgSurface);
    const elevRgb = hexToRgb(surface.bgSurfaceElevated);
    surfaceBackdropFilter = 'blur(14px) saturate(140%)';

    if (mode === 'light') {
      emittedSurface = `rgba(${surfRgb.r}, ${surfRgb.g}, ${surfRgb.b}, 0.88)`;
      emittedSurfaceElevated = `rgba(${elevRgb.r}, ${elevRgb.g}, ${elevRgb.b}, 0.94)`;
      emittedModal = `rgba(${elevRgb.r}, ${elevRgb.g}, ${elevRgb.b}, 0.97)`;
      borderSubtle = surface.borderSubtle;
      shadowSm = `0 2px 10px rgba(${surface.shadowRgb}, 0.05)`;
      shadowMd = `0 8px 24px rgba(${surface.shadowRgb}, 0.08)`;
      shadowLg = `0 14px 36px rgba(${surface.shadowRgb}, 0.11)`;
      shadowXl = `0 20px 44px rgba(${surface.shadowRgb}, 0.14)`;
      shadowGlass = `0 8px 24px rgba(${surface.shadowRgb}, 0.08)`;
    } else {
      emittedSurface = `rgba(${surfRgb.r}, ${surfRgb.g}, ${surfRgb.b}, 0.86)`;
      emittedSurfaceElevated = `rgba(${elevRgb.r}, ${elevRgb.g}, ${elevRgb.b}, 0.93)`;
      emittedModal = `rgba(${elevRgb.r}, ${elevRgb.g}, ${elevRgb.b}, 0.97)`;
      borderSubtle = 'rgba(255, 255, 255, 0.16)';
      shadowSm = `0 2px 10px rgba(${surface.shadowRgb}, 0.28)`;
      shadowMd = `0 8px 24px rgba(${surface.shadowRgb}, 0.38)`;
      shadowLg = `0 14px 36px rgba(${surface.shadowRgb}, 0.48)`;
      shadowXl = `0 20px 44px rgba(${surface.shadowRgb}, 0.56)`;
      shadowGlass = `0 8px 24px rgba(${surface.shadowRgb}, 0.36)`;
    }
  }

  const inputIconGutter = config.shapePreset === 'pill' ? '44px' : '40px';

  const vars: Record<string, string> = {
    '--primary-h': String(primaryHsl.h),
    '--primary-s': `${primaryHsl.s}%`,
    '--primary-l': `${primaryHsl.l}%`,
    '--color-primary': primary,
    '--color-primary-hover': primaryHover,
    '--color-primary-active': primaryActive,
    '--color-primary-light': primaryLight,
    '--color-primary-soft-text': primarySoftText,
    '--color-primary-border': primaryBorder,
    '--color-primary-glow': primaryGlow,

    '--accent-h': String(accentHsl.h),
    '--accent-s': `${accentHsl.s}%`,
    '--accent-l': `${accentHsl.l}%`,
    '--color-accent': accent,
    '--color-accent-hover': accentHover,
    '--color-accent-light': accentLight,
    '--color-accent-border': accentBorder,
    '--color-accent-glow': accentGlow,
    '--color-gold': accent,
    '--color-gold-light': accentLight,

    '--bg-body': surface.bgBody,
    '--bg-pattern-image': pattern.image,
    '--bg-pattern-size': pattern.size,
    '--bg-mesh-1': `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${mode === 'light' ? '0.04' : '0.035'})`,
    '--bg-mesh-2': `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.04)`,
    '--bg-mesh-3': `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.022)`,
    '--bg-mesh-4': `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.022)`,
    '--bg-surface': emittedSurface,
    '--bg-surface-elevated': emittedSurfaceElevated,
    '--bg-surface-solid': surface.bgSurface,
    '--bg-surface-elevated-solid': surface.bgSurfaceElevated,
    '--bg-surface-subtle': surface.bgSurfaceSubtle,
    '--bg-surface-hover': surface.bgSurfaceHover,
    '--bg-glass': emittedSurface,
    '--bg-glass-card': emittedSurface,
    '--bg-glass-modal': emittedModal,
    '--bg-backdrop': surface.bgBackdrop,
    '--surface-backdrop-filter': surfaceBackdropFilter,

    '--border-subtle': borderSubtle,
    '--border-medium': borderMedium,
    '--border-strong': surface.borderStrong,
    '--border-glass': borderSubtle,
    '--border-glass-glow': `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${mode === 'light' ? '0.2' : '0.3'})`,
    '--border-hover': primary,

    '--text-primary': surface.textPrimary,
    '--text-secondary': surface.textSecondary,
    '--text-muted': surface.textMuted,
    '--text-inverse': textInverse,

    '--shadow-sm': shadowSm,
    '--shadow-md': shadowMd,
    '--shadow-lg': shadowLg,
    '--shadow-xl': shadowXl,
    '--shadow-glass': shadowGlass,

    '--font-display': fonts.display,
    '--font-heading': fonts.heading,
    '--font-body': fonts.body,
    '--font-sans': fonts.body,

    '--radius-xs': shape.radii.xs,
    '--radius-sm': shape.radii.sm,
    '--radius-md': shape.radii.md,
    '--radius-lg': shape.radii.lg,
    '--radius-xl': shape.radii.xl,
    '--radius-2xl': shape.radii['2xl'],
    '--radius-button': shape.radii.button,
    '--radius-button-sm': shape.radii.buttonSm,
    '--radius-chip': shape.radii.chip,
    '--radius-input': shape.radii.input,
    '--radius-textarea': shape.radii.textarea,
    '--radius-card': shape.radii.card,
    '--radius-media': shape.radii.media,
    '--input-icon-gutter': inputIconGutter,

    '--motion-duration-fast': motion.fastMs,
    '--motion-duration-base': motion.baseMs,
    '--motion-duration-slow': motion.slowMs,
  };

  for (const [token, baseRem] of Object.entries(BASE_FONT_SIZES_REM)) {
    const scaled = Math.max(0.75, Number((baseRem * textFactor).toFixed(4)));
    vars[token] = `${scaled}rem`;
  }

  for (const [token, baseRem] of Object.entries(SCALABLE_SPACES_REM)) {
    const scaled = Number((baseRem * densityFactor).toFixed(4));
    vars[token] = `${scaled}rem`;
  }

  return vars;
};

export const resolveEffectiveAppearanceSource = ({
  isLiveSynced,
  rawAppearance,
  bootstrapAppearance,
}: {
  isLiveSynced: boolean;
  rawAppearance: Partial<TenantAppearanceConfig> | null | undefined;
  bootstrapAppearance: Partial<TenantAppearanceConfig> | null | undefined;
}): TenantAppearanceConfig =>
  normalizeTenantAppearance(
    isLiveSynced ? rawAppearance : (rawAppearance ?? bootstrapAppearance)
  );

export const resolveEffectiveThemeMode = (
  defaultMode: DefaultThemeMode,
  systemPrefersDark?: boolean
): 'light' | 'dark' => {
  if (defaultMode === 'dark') return 'dark';
  if (defaultMode === 'light') return 'light';
  if (typeof systemPrefersDark === 'boolean') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

export interface CanvasAppearanceRadii {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  chip: number;
  card: number;
}

export interface CanvasAppearanceTokens {
  config: TenantAppearanceConfig;
  mode: 'light' | 'dark';
  primary: string;
  accent: string;
  primarySoft: string;
  accentSoft: string;
  bgBody: string;
  bgSurface: string;
  bgSurfaceElevated: string;
  surfaceFill: string;
  surfaceElevatedFill: string;
  surfaceStroke: string;
  borderSubtle: string;
  borderMedium: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetY: number;
  displayFont: string;
  headingFont: string;
  bodyFont: string;
  radii: CanvasAppearanceRadii;
}

const parsePxToken = (raw: string, fallback: number, fullPillValue = 999): number => {
  const trimmed = String(raw || '').trim();
  const match = /^(\d+(?:\.\d+)?)px$/i.exec(trimmed);
  if (!match) return fallback;
  const val = Number(match[1]);
  return val >= 999 ? fullPillValue : val;
};

export const buildCanvasAppearanceTokens = (
  rawConfig: Partial<TenantAppearanceConfig> | null | undefined,
  mode: 'light' | 'dark'
): CanvasAppearanceTokens => {
  const config = normalizeTenantAppearance(rawConfig);
  const surface = resolveEffectiveSurfaceTokens(config, mode);
  const { primary, accent } = resolveEffectiveBrandHex(config, mode);
  const pRgb = hexToRgb(primary);
  const aRgb = hexToRgb(accent);
  const surfRgb = hexToRgb(surface.bgSurface);
  const elevRgb = hexToRgb(surface.bgSurfaceElevated);
  const fonts = FONT_PAIRING_MAP[config.fontPairing];
  const shape = SHAPE_PRESET_MAP[config.shapePreset];

  let surfaceFill = surface.bgSurface;
  let surfaceElevatedFill = surface.bgSurfaceElevated;
  let surfaceStroke = surface.borderMedium;
  let shadowColor = 'transparent';
  let shadowBlur = 0;
  let shadowOffsetY = 0;

  if (config.surfaceStyle === 'flat') {
    surfaceStroke = 'transparent';
  } else if (config.surfaceStyle === 'elevated') {
    shadowColor = `rgba(${surface.shadowRgb}, ${mode === 'light' ? 0.14 : 0.45})`;
    shadowBlur = 24;
    shadowOffsetY = 10;
    surfaceStroke = mode === 'light' ? `rgba(${surface.shadowRgb}, 0.08)` : 'rgba(255, 255, 255, 0.1)';
  } else if (config.surfaceStyle === 'glass') {
    surfaceFill = `rgba(${surfRgb.r}, ${surfRgb.g}, ${surfRgb.b}, ${mode === 'light' ? 0.9 : 0.88})`;
    surfaceElevatedFill = `rgba(${elevRgb.r}, ${elevRgb.g}, ${elevRgb.b}, ${mode === 'light' ? 0.95 : 0.94})`;
    surfaceStroke = mode === 'light' ? surface.borderMedium : 'rgba(255, 255, 255, 0.18)';
    shadowColor = `rgba(${surface.shadowRgb}, ${mode === 'light' ? 0.1 : 0.35})`;
    shadowBlur = 20;
    shadowOffsetY = 8;
  }

  return {
    config,
    mode,
    primary,
    accent,
    primarySoft: `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${mode === 'light' ? 0.14 : 0.22})`,
    accentSoft: `rgba(${aRgb.r}, ${aRgb.g}, ${aRgb.b}, ${mode === 'light' ? 0.13 : 0.18})`,
    bgBody: surface.bgBody,
    bgSurface: surface.bgSurface,
    bgSurfaceElevated: surface.bgSurfaceElevated,
    surfaceFill,
    surfaceElevatedFill,
    surfaceStroke,
    borderSubtle: surface.borderSubtle,
    borderMedium: surface.borderMedium,
    borderStrong: surface.borderStrong,
    textPrimary: surface.textPrimary,
    textSecondary: surface.textSecondary,
    textMuted: surface.textMuted,
    textInverse: pickAccessibleForeground(primary, surface.bgBody, '#ffffff'),
    shadowColor,
    shadowBlur,
    shadowOffsetY,
    displayFont: fonts.display,
    headingFont: fonts.heading,
    bodyFont: fonts.body,
    radii: {
      xs: parsePxToken(shape.radii.xs, 6),
      sm: parsePxToken(shape.radii.sm, 8),
      md: parsePxToken(shape.radii.md, 12),
      lg: parsePxToken(shape.radii.lg, 16),
      xl: parsePxToken(shape.radii.xl, 20),
      chip: parsePxToken(shape.radii.chip, 999),
      card: parsePxToken(shape.radii.card, 12),
    },
  };
};

const TENANT_FONT_LINK_ID = 'turneado-tenant-google-fonts';
const PREVIEW_FONTS_LINK_ID = 'turneado-editor-font-previews';
export const TENANT_APPEARANCE_CACHE_PREFIX = 'turneado_tenant_appearance_v1:';

export interface CachedTenantAppearanceEntry {
  tenantId: string;
  appearance: TenantAppearanceConfig;
}

export const isTenantAdminPathname = (pathname: string, slug: string): boolean => {
  const cleanSlug = String(slug ?? '').trim().toLowerCase();
  if (!cleanSlug) return false;
  const normalizedPath = String(pathname ?? '').toLowerCase().replace(/\/+$/, '');
  const adminPrefix = `/${cleanSlug}/admin`;
  return normalizedPath === adminPrefix || normalizedPath.startsWith(`${adminPrefix}/`);
};

const getSafeLocalStorage = (): Storage | null => {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    return null;
  }
  return null;
};

export const readCachedTenantAppearanceBySlug = (
  rawSlug: string | null | undefined
): CachedTenantAppearanceEntry | null => {
  const slug = String(rawSlug ?? '').trim().toLowerCase();
  if (!slug) return null;

  try {
    const storage = getSafeLocalStorage();
    if (!storage) return null;

    const raw = storage.getItem(`${TENANT_APPEARANCE_CACHE_PREFIX}${slug}`);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const tenantId = typeof record.tenantId === 'string' ? record.tenantId.trim() : '';
    if (!tenantId || !record.appearance || typeof record.appearance !== 'object') {
      return null;
    }

    return {
      tenantId,
      appearance: normalizeTenantAppearance(record.appearance as Partial<TenantAppearanceConfig>),
    };
  } catch {
    return null;
  }
};

export const writeCachedTenantAppearanceBySlug = (
  rawSlug: string | null | undefined,
  payload: {
    tenantId: string;
    appearance: Partial<TenantAppearanceConfig> | null | undefined;
  }
): void => {
  const slug = String(rawSlug ?? '').trim().toLowerCase();
  const tenantId = String(payload.tenantId ?? '').trim();
  if (!slug || !tenantId) return;

  try {
    const storage = getSafeLocalStorage();
    if (!storage) return;

    const entry: CachedTenantAppearanceEntry = {
      tenantId,
      appearance: normalizeTenantAppearance(payload.appearance),
    };
    storage.setItem(`${TENANT_APPEARANCE_CACHE_PREFIX}${slug}`, JSON.stringify(entry));
  } catch {
    // Ignore storage quota or private mode errors.
  }
};

export const ensureFontPairingLoaded = (fontPairing: FontPairingId): void => {
  if (typeof document === 'undefined') return;
  const def = FONT_PAIRING_MAP[fontPairing];
  const existing = document.getElementById(TENANT_FONT_LINK_ID) as HTMLLinkElement | null;

  if (!def?.googleFontsUrl) {
    if (existing) {
      existing.remove();
    }
    return;
  }

  if (existing) {
    if (existing.href !== def.googleFontsUrl) {
      delete existing.dataset.loaded;
      existing.href = def.googleFontsUrl;
    }
    return;
  }

  const link = document.createElement('link');
  link.id = TENANT_FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href = def.googleFontsUrl;
  document.head.appendChild(link);
};

const extractPrimaryFontFamily = (fontStack: string): string => {
  const first = fontStack.split(',')[0]?.trim() || '';
  return first.replace(/^['"]|['"]$/g, '');
};

export const awaitFontPairingReady = async (
  fontPairing: FontPairingId,
  timeoutMs = 2500
): Promise<void> => {
  if (typeof document === 'undefined') return;

  ensureFontPairingLoaded(fontPairing);
  const def = FONT_PAIRING_MAP[fontPairing];

  if (def?.googleFontsUrl) {
    const link = document.getElementById(TENANT_FONT_LINK_ID) as HTMLLinkElement | null;
    if (link && !link.sheet && link.dataset.loaded !== 'true') {
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          link.removeEventListener('load', onLoad);
          link.removeEventListener('error', finish);
          resolve();
        };
        const onLoad = () => {
          link.dataset.loaded = 'true';
          finish();
        };
        const timer = setTimeout(finish, timeoutMs);
        link.addEventListener('load', onLoad, { once: true });
        link.addEventListener('error', finish, { once: true });
      });
    }
  }

  if (!document.fonts) return;

  const families = Array.from(
    new Set(
      [
        extractPrimaryFontFamily(def.display),
        extractPrimaryFontFamily(def.heading),
        extractPrimaryFontFamily(def.body),
      ].filter(Boolean)
    )
  );

  const fontRequests: Promise<FontFace[]>[] = [];
  for (const family of families) {
    const quoted = `"${family}"`;
    fontRequests.push(
      document.fonts.load(`400 24px ${quoted}`),
      document.fonts.load(`500 32px ${quoted}`),
      document.fonts.load(`600 32px ${quoted}`),
      document.fonts.load(`italic 500 48px ${quoted}`)
    );
  }

  try {
    await Promise.race([
      Promise.allSettled(fontRequests).then(() => document.fonts.ready),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch {
    // Fallback gracefully to available system fonts if font loading fails
  }
};

export const ensureAllFontPairingPreviewsLoaded = (): void => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(PREVIEW_FONTS_LINK_ID)) return;

  const families: string[] = [];
  for (const pairing of FONT_PAIRINGS) {
    if (!pairing.googleFontsUrl) continue;
    const urlObj = new URL(pairing.googleFontsUrl);
    for (const fam of urlObj.searchParams.getAll('family')) {
      if (!families.includes(fam)) {
        families.push(fam);
      }
    }
  }

  if (families.length === 0) return;

  const params = families.map((f) => `family=${encodeURIComponent(f)}`).join('&');
  const link = document.createElement('link');
  link.id = PREVIEW_FONTS_LINK_ID;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${params}&display=swap`;
  document.head.appendChild(link);
};

export const areAppearanceConfigsEqual = (
  a: Partial<TenantAppearanceConfig> | null | undefined,
  b: Partial<TenantAppearanceConfig> | null | undefined
): boolean => {
  const normA = normalizeTenantAppearance(a);
  const normB = normalizeTenantAppearance(b);
  return (
    normA.palettePreset === normB.palettePreset &&
    normA.customPrimaryHex === normB.customPrimaryHex &&
    normA.customAccentHex === normB.customAccentHex &&
    normA.surfaceTemperature === normB.surfaceTemperature &&
    normA.customBackgroundHex === normB.customBackgroundHex &&
    normA.backgroundStyle === normB.backgroundStyle &&
    normA.backgroundIntensity === normB.backgroundIntensity &&
    normA.defaultMode === normB.defaultMode &&
    normA.allowVisitorModeToggle === normB.allowVisitorModeToggle &&
    normA.fontPairing === normB.fontPairing &&
    normA.shapePreset === normB.shapePreset &&
    normA.surfaceStyle === normB.surfaceStyle &&
    normA.buttonStyle === normB.buttonStyle &&
    normA.density === normB.density &&
    normA.textScale === normB.textScale &&
    normA.heroLayout === normB.heroLayout &&
    normA.heroImageShape === normB.heroImageShape &&
    normA.heroImageFrame === normB.heroImageFrame &&
    normA.heroCopyPreset === normB.heroCopyPreset &&
    normA.heroCustomTitlePrefix === normB.heroCustomTitlePrefix &&
    normA.heroCustomTitleHighlight === normB.heroCustomTitleHighlight &&
    normA.heroCustomSubtitle === normB.heroCustomSubtitle &&
    normA.heroShowCaption === normB.heroShowCaption &&
    normA.navbarStyle === normB.navbarStyle &&
    normA.logoShape === normB.logoShape &&
    normA.portfolioLayout === normB.portfolioLayout &&
    normA.heroShowTrustPills === normB.heroShowTrustPills &&
    normA.showFloatingWhatsApp === normB.showFloatingWhatsApp &&
    normA.motionPreset === normB.motionPreset &&
    normA.heroHighlightStyle === normB.heroHighlightStyle &&
    normA.slotCardStyle === normB.slotCardStyle
  );
};
