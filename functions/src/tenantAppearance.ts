export type BackendPalettePresetId =
  | 'rose-editorial'
  | 'blush-peony'
  | 'burgundy-noir'
  | 'plum-velvet'
  | 'terracotta-warm'
  | 'champagne-bronze'
  | 'cocoa-mocha'
  | 'amber-honey'
  | 'sage-botanical'
  | 'eucalyptus-mist'
  | 'olive-grove'
  | 'ocean-slate'
  | 'noir-minimal'
  | 'midnight-indigo'
  | 'lavender-silk'
  | 'crimson-studio'
  | 'coral-sunset'
  | 'electric-cobalt'
  | 'emerald-jewel'
  | 'orchid-vivid'
  | 'clinical-teal'
  | 'nordic-blue'
  | 'pilates-sand'
  | 'titanium-slate';

export type BackendSurfaceTemperature = 'warm' | 'neutral' | 'cool' | 'paper' | 'blush' | 'sage';
export type BackendFontPairingId =
  | 'editorial'
  | 'classic'
  | 'modern'
  | 'minimal'
  | 'atelier'
  | 'clinical'
  | 'expressive'
  | 'friendly';
export type BackendShapePresetId = 'sharp' | 'soft' | 'rounded' | 'pill';
export type BackendSurfaceStyleId = 'bordered' | 'elevated' | 'flat' | 'glass';
export type BackendButtonStyleId = 'solid' | 'soft' | 'outline';
export type BackendBackgroundStyleId =
  | 'solid'
  | 'soft-gradient'
  | 'mesh-glow'
  | 'dots'
  | 'grid'
  | 'diagonal';
export type BackendBackgroundIntensity = 'subtle' | 'balanced' | 'vivid';
export type BackendDensityScaleId = 'compact' | 'comfortable' | 'spacious';
export type BackendTextScaleId = 'sm' | 'md' | 'lg';
export type BackendDefaultThemeMode = 'light' | 'dark' | 'system';
export type BackendHeroLayoutId =
  | 'split-right'
  | 'split-left'
  | 'centered'
  | 'overlay-banner'
  | 'minimal-compact';
export type BackendHeroImageShapeId =
  | 'portrait'
  | 'arch'
  | 'circle'
  | 'square'
  | 'landscape'
  | 'organic';
export type BackendHeroImageFrameId =
  | 'editorial-mat'
  | 'minimal-border'
  | 'double-line'
  | 'offset-accent'
  | 'polaroid'
  | 'floating-caption';
export type BackendHeroCopyPresetId =
  | 'editorial-beauty'
  | 'modern-studio'
  | 'wellness-calm'
  | 'barber-craft'
  | 'clinical-trust'
  | 'boutique-luxury'
  | 'direct-action'
  | 'warm-welcome';

export interface SanitizedTenantAppearance {
  palettePreset: BackendPalettePresetId;
  customPrimaryHex: string | null;
  customAccentHex: string | null;
  surfaceTemperature: BackendSurfaceTemperature | null;
  customBackgroundHex: string | null;
  backgroundStyle: BackendBackgroundStyleId;
  backgroundIntensity: BackendBackgroundIntensity;
  defaultMode: BackendDefaultThemeMode;
  allowVisitorModeToggle: boolean;
  fontPairing: BackendFontPairingId;
  shapePreset: BackendShapePresetId;
  surfaceStyle: BackendSurfaceStyleId;
  buttonStyle: BackendButtonStyleId;
  density: BackendDensityScaleId;
  textScale: BackendTextScaleId;
  heroLayout: BackendHeroLayoutId;
  heroImageShape: BackendHeroImageShapeId;
  heroImageFrame: BackendHeroImageFrameId;
  heroCopyPreset: BackendHeroCopyPresetId;
  heroCustomTitlePrefix: string | null;
  heroCustomTitleHighlight: string | null;
  heroCustomSubtitle: string | null;
  heroShowCaption: boolean;
}

export interface EmailThemePalette {
  bgBody: string;
  bgSurface: string;
  bgSubtle: string;
  borderSubtle: string;
  borderMedium: string;
  primary: string;
  primaryLight: string;
  primaryBorder: string;
  primaryDark: string;
  primaryForeground: string;
  accent: string;
  accentLight: string;
  accentBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  successBg: string;
  successBorder: string;
  successText: string;
  warning: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  displayFontStack: string;
}

interface PresetLightColors {
  primaryLight: string;
  accentLight: string;
  defaultSurface: BackendSurfaceTemperature;
}

const BACKEND_PALETTE_PRESETS: Record<BackendPalettePresetId, PresetLightColors> = {
  'rose-editorial': { primaryLight: '#9e4f5e', accentLight: '#8c7258', defaultSurface: 'warm' },
  'blush-peony': { primaryLight: '#a94869', accentLight: '#96725e', defaultSurface: 'blush' },
  'burgundy-noir': { primaryLight: '#7e2b3e', accentLight: '#8d745a', defaultSurface: 'warm' },
  'plum-velvet': { primaryLight: '#753f64', accentLight: '#856c7d', defaultSurface: 'neutral' },
  'terracotta-warm': { primaryLight: '#ad4f36', accentLight: '#8a6d52', defaultSurface: 'warm' },
  'champagne-bronze': { primaryLight: '#8c6037', accentLight: '#78634f', defaultSurface: 'warm' },
  'cocoa-mocha': { primaryLight: '#6e4736', accentLight: '#8f7257', defaultSurface: 'warm' },
  'amber-honey': { primaryLight: '#945f1c', accentLight: '#7c654d', defaultSurface: 'warm' },
  'sage-botanical': { primaryLight: '#436852', accentLight: '#83725b', defaultSurface: 'sage' },
  'eucalyptus-mist': { primaryLight: '#2f6a64', accentLight: '#647674', defaultSurface: 'cool' },
  'olive-grove': { primaryLight: '#5a6635', accentLight: '#857458', defaultSurface: 'warm' },
  'ocean-slate': { primaryLight: '#335f78', accentLight: '#637583', defaultSurface: 'cool' },
  'noir-minimal': { primaryLight: '#2c2927', accentLight: '#6e6761', defaultSurface: 'paper' },
  'midnight-indigo': { primaryLight: '#3b4a7a', accentLight: '#687187', defaultSurface: 'cool' },
  'lavender-silk': { primaryLight: '#664f8a', accentLight: '#7c708a', defaultSurface: 'neutral' },
  'crimson-studio': { primaryLight: '#9c313f', accentLight: '#756662', defaultSurface: 'paper' },
  'coral-sunset': { primaryLight: '#b33d2e', accentLight: '#8c6548', defaultSurface: 'warm' },
  'electric-cobalt': { primaryLight: '#2451a6', accentLight: '#5c6b8a', defaultSurface: 'paper' },
  'emerald-jewel': { primaryLight: '#146b53', accentLight: '#736c52', defaultSurface: 'sage' },
  'orchid-vivid': { primaryLight: '#8a2d79', accentLight: '#7a6375', defaultSurface: 'blush' },
  'clinical-teal': { primaryLight: '#18697a', accentLight: '#5a7378', defaultSurface: 'paper' },
  'nordic-blue': { primaryLight: '#2d5885', accentLight: '#607182', defaultSurface: 'cool' },
  'pilates-sand': { primaryLight: '#7a5d42', accentLight: '#6e6b62', defaultSurface: 'warm' },
  'titanium-slate': { primaryLight: '#3d4956', accentLight: '#636d78', defaultSurface: 'paper' },
};

const EMAIL_SURFACE_BY_TEMP: Record<
  BackendSurfaceTemperature,
  {
    bgBody: string;
    bgSurface: string;
    bgSubtle: string;
    borderSubtle: string;
    borderMedium: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
  }
> = {
  warm: {
    bgBody: '#faf7f2',
    bgSurface: '#ffffff',
    bgSubtle: '#f3efe7',
    borderSubtle: '#e6dfd5',
    borderMedium: '#d8cfc2',
    textPrimary: '#231c19',
    textSecondary: '#5c514b',
    textMuted: '#7e716a',
  },
  neutral: {
    bgBody: '#f4f3f1',
    bgSurface: '#ffffff',
    bgSubtle: '#eceae7',
    borderSubtle: '#dfddd9',
    borderMedium: '#cfccc6',
    textPrimary: '#1d1c1b',
    textSecondary: '#54514e',
    textMuted: '#75716c',
  },
  cool: {
    bgBody: '#f0f4f8',
    bgSurface: '#ffffff',
    bgSubtle: '#e7edf3',
    borderSubtle: '#d5dfe8',
    borderMedium: '#c0cedb',
    textPrimary: '#192129',
    textSecondary: '#4a5866',
    textMuted: '#697887',
  },
  paper: {
    bgBody: '#f5f5f7',
    bgSurface: '#ffffff',
    bgSubtle: '#ededf0',
    borderSubtle: '#e2e2e7',
    borderMedium: '#cdced6',
    textPrimary: '#151518',
    textSecondary: '#4f5059',
    textMuted: '#6e707b',
  },
  blush: {
    bgBody: '#f8f2f4',
    bgSurface: '#ffffff',
    bgSubtle: '#f1e7ea',
    borderSubtle: '#e5d6db',
    borderMedium: '#d5c0c6',
    textPrimary: '#261a1e',
    textSecondary: '#614d53',
    textMuted: '#826c73',
  },
  sage: {
    bgBody: '#f1f5f2',
    bgSurface: '#ffffff',
    bgSubtle: '#e6eee8',
    borderSubtle: '#d6e2da',
    borderMedium: '#c0d1c6',
    textPrimary: '#19241d',
    textSecondary: '#495c50',
    textMuted: '#687d70',
  },
};

const SERIF_DISPLAY_STACK = "Georgia, 'Times New Roman', serif";
const SANS_DISPLAY_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF_PAIRINGS = new Set<BackendFontPairingId>([
  'editorial',
  'classic',
  'atelier',
  'friendly',
]);

export const DEFAULT_EMAIL_THEME_PALETTE: EmailThemePalette = {
  bgBody: '#faf7f2',
  bgSurface: '#ffffff',
  bgSubtle: '#f3efe7',
  borderSubtle: '#e6dfd5',
  borderMedium: '#d8cfc2',
  primary: '#9e4f5e',
  primaryLight: '#f7ecee',
  primaryBorder: '#e2c3c9',
  primaryDark: '#743541',
  primaryForeground: '#ffffff',
  accent: '#8c7258',
  accentLight: '#f4efe9',
  accentBorder: '#ddd2c5',
  textPrimary: '#231c19',
  textSecondary: '#5c514b',
  textMuted: '#7e716a',
  success: '#2c6e49',
  successBg: '#edf5f0',
  successBorder: '#bfd9c9',
  successText: '#225438',
  warning: '#9a5b13',
  warningBg: '#fbf4ea',
  warningBorder: '#ebd2b0',
  warningText: '#7d480d',
  danger: '#a63a47',
  dangerBg: '#fbf0f1',
  dangerBorder: '#eabdc3',
  dangerText: '#8f2d39',
  displayFontStack: SERIF_DISPLAY_STACK,
};

const VALID_SURFACE_TEMPS = new Set<BackendSurfaceTemperature>([
  'warm',
  'neutral',
  'cool',
  'paper',
  'blush',
  'sage',
]);
const VALID_MODES = new Set<BackendDefaultThemeMode>(['light', 'dark', 'system']);
const VALID_FONTS = new Set<BackendFontPairingId>([
  'editorial',
  'classic',
  'modern',
  'minimal',
  'atelier',
  'clinical',
  'expressive',
  'friendly',
]);
const VALID_SHAPES = new Set<BackendShapePresetId>(['sharp', 'soft', 'rounded', 'pill']);
const VALID_SURFACE_STYLES = new Set<BackendSurfaceStyleId>([
  'bordered',
  'elevated',
  'flat',
  'glass',
]);
const VALID_BUTTON_STYLES = new Set<BackendButtonStyleId>(['solid', 'soft', 'outline']);
const VALID_BG_STYLES = new Set<BackendBackgroundStyleId>([
  'solid',
  'soft-gradient',
  'mesh-glow',
  'dots',
  'grid',
  'diagonal',
]);
const VALID_BG_INTENSITIES = new Set<BackendBackgroundIntensity>(['subtle', 'balanced', 'vivid']);
const VALID_DENSITIES = new Set<BackendDensityScaleId>(['compact', 'comfortable', 'spacious']);
const VALID_TEXT_SCALES = new Set<BackendTextScaleId>(['sm', 'md', 'lg']);
const VALID_HERO_LAYOUTS = new Set<BackendHeroLayoutId>([
  'split-right',
  'split-left',
  'centered',
  'overlay-banner',
  'minimal-compact',
]);
const VALID_HERO_SHAPES = new Set<BackendHeroImageShapeId>([
  'portrait',
  'arch',
  'circle',
  'square',
  'landscape',
  'organic',
]);
const VALID_HERO_FRAMES = new Set<BackendHeroImageFrameId>([
  'editorial-mat',
  'minimal-border',
  'double-line',
  'offset-accent',
  'polaroid',
  'floating-caption',
]);
const VALID_HERO_COPY_PRESETS = new Set<BackendHeroCopyPresetId>([
  'editorial-beauty',
  'modern-studio',
  'wellness-calm',
  'barber-craft',
  'clinical-trust',
  'boutique-luxury',
  'direct-action',
  'warm-welcome',
]);

const sanitizeHeroText = (raw: unknown, maxLength: number): string | null => {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
};

const HEX_6_REGEX = /^#[0-9a-f]{6}$/i;
const HEX_3_REGEX = /^#[0-9a-f]{3}$/i;

const clamp = (val: number, min: number, max: number): number => Math.min(max, Math.max(min, val));

export const sanitizeHexColor = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (HEX_3_REGEX.test(withHash)) {
    return `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`;
  }
  return HEX_6_REGEX.test(withHash) ? withHash : null;
};

export const sanitizeTenantAppearance = (raw: unknown): SanitizedTenantAppearance | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const obj = raw as Record<string, unknown>;
  const palettePreset: BackendPalettePresetId =
    typeof obj.palettePreset === 'string' && obj.palettePreset in BACKEND_PALETTE_PRESETS
      ? (obj.palettePreset as BackendPalettePresetId)
      : 'rose-editorial';

  const customPrimaryHex = sanitizeHexColor(obj.customPrimaryHex);
  const customAccentHex = sanitizeHexColor(obj.customAccentHex);
  const customBackgroundHex = sanitizeHexColor(obj.customBackgroundHex);

  const surfaceTemperature: BackendSurfaceTemperature | null =
    typeof obj.surfaceTemperature === 'string' &&
    VALID_SURFACE_TEMPS.has(obj.surfaceTemperature as BackendSurfaceTemperature)
      ? (obj.surfaceTemperature as BackendSurfaceTemperature)
      : null;

  const backgroundStyle: BackendBackgroundStyleId =
    typeof obj.backgroundStyle === 'string' &&
    VALID_BG_STYLES.has(obj.backgroundStyle as BackendBackgroundStyleId)
      ? (obj.backgroundStyle as BackendBackgroundStyleId)
      : 'solid';

  const backgroundIntensity: BackendBackgroundIntensity =
    typeof obj.backgroundIntensity === 'string' &&
    VALID_BG_INTENSITIES.has(obj.backgroundIntensity as BackendBackgroundIntensity)
      ? (obj.backgroundIntensity as BackendBackgroundIntensity)
      : 'balanced';

  const defaultMode: BackendDefaultThemeMode =
    typeof obj.defaultMode === 'string' && VALID_MODES.has(obj.defaultMode as BackendDefaultThemeMode)
      ? (obj.defaultMode as BackendDefaultThemeMode)
      : 'light';

  const allowVisitorModeToggle =
    typeof obj.allowVisitorModeToggle === 'boolean' ? obj.allowVisitorModeToggle : true;

  const fontPairing: BackendFontPairingId =
    typeof obj.fontPairing === 'string' && VALID_FONTS.has(obj.fontPairing as BackendFontPairingId)
      ? (obj.fontPairing as BackendFontPairingId)
      : 'editorial';

  const shapePreset: BackendShapePresetId =
    typeof obj.shapePreset === 'string' && VALID_SHAPES.has(obj.shapePreset as BackendShapePresetId)
      ? (obj.shapePreset as BackendShapePresetId)
      : 'soft';

  const surfaceStyle: BackendSurfaceStyleId =
    typeof obj.surfaceStyle === 'string' &&
    VALID_SURFACE_STYLES.has(obj.surfaceStyle as BackendSurfaceStyleId)
      ? (obj.surfaceStyle as BackendSurfaceStyleId)
      : 'bordered';

  const buttonStyle: BackendButtonStyleId =
    typeof obj.buttonStyle === 'string' &&
    VALID_BUTTON_STYLES.has(obj.buttonStyle as BackendButtonStyleId)
      ? (obj.buttonStyle as BackendButtonStyleId)
      : 'solid';

  const density: BackendDensityScaleId =
    typeof obj.density === 'string' && VALID_DENSITIES.has(obj.density as BackendDensityScaleId)
      ? (obj.density as BackendDensityScaleId)
      : 'comfortable';

  const textScale: BackendTextScaleId =
    typeof obj.textScale === 'string' && VALID_TEXT_SCALES.has(obj.textScale as BackendTextScaleId)
      ? (obj.textScale as BackendTextScaleId)
      : 'md';

  const heroLayout: BackendHeroLayoutId =
    typeof obj.heroLayout === 'string' &&
    VALID_HERO_LAYOUTS.has(obj.heroLayout as BackendHeroLayoutId)
      ? (obj.heroLayout as BackendHeroLayoutId)
      : 'split-right';

  const heroImageShape: BackendHeroImageShapeId =
    typeof obj.heroImageShape === 'string' &&
    VALID_HERO_SHAPES.has(obj.heroImageShape as BackendHeroImageShapeId)
      ? (obj.heroImageShape as BackendHeroImageShapeId)
      : 'portrait';

  const heroImageFrame: BackendHeroImageFrameId =
    typeof obj.heroImageFrame === 'string' &&
    VALID_HERO_FRAMES.has(obj.heroImageFrame as BackendHeroImageFrameId)
      ? (obj.heroImageFrame as BackendHeroImageFrameId)
      : 'editorial-mat';

  const heroCopyPreset: BackendHeroCopyPresetId =
    typeof obj.heroCopyPreset === 'string' &&
    VALID_HERO_COPY_PRESETS.has(obj.heroCopyPreset as BackendHeroCopyPresetId)
      ? (obj.heroCopyPreset as BackendHeroCopyPresetId)
      : 'editorial-beauty';

  const heroCustomTitlePrefix = sanitizeHeroText(obj.heroCustomTitlePrefix, 45);
  const heroCustomTitleHighlight = sanitizeHeroText(obj.heroCustomTitleHighlight, 35);
  const heroCustomSubtitle = sanitizeHeroText(obj.heroCustomSubtitle, 150);
  const heroShowCaption = typeof obj.heroShowCaption === 'boolean' ? obj.heroShowCaption : true;

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
  };
};

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

const hexToRgb = (hex: string): Rgb => {
  const clean = sanitizeHexColor(hex) || '#9e4f5e';
  const num = parseInt(clean.slice(1), 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const rgbToHex = ({ r, g, b }: Rgb): string => {
  const toByte = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
};

const rgbToHsl = ({ r, g, b }: Rgb): Hsl => {
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

const hslToHex = ({ h, s, l }: Hsl): string => {
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

  return rgbToHex({
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  });
};

const getLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v: number) => {
    const srgb = v / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const getContrastRatio = (hexA: string, hexB: string): number => {
  const a = getLuminance(hexA);
  const b = getLuminance(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

const ensureLightModeReadable = (hex: string, surfaceHex: string, minRatio = 4.5): string => {
  const clean = sanitizeHexColor(hex) || '#9e4f5e';
  if (getContrastRatio(clean, surfaceHex) >= minRatio) {
    return clean;
  }
  const hsl = rgbToHsl(hexToRgb(clean));
  let l = hsl.l;
  for (let i = 0; i < 60; i += 1) {
    l = clamp(l - 2, 10, 90);
    const candidate = hslToHex({ h: hsl.h, s: hsl.s, l });
    if (getContrastRatio(candidate, surfaceHex) >= minRatio) {
      return candidate;
    }
  }
  return hslToHex({ h: hsl.h, s: hsl.s, l: 24 });
};

const pickButtonForeground = (bgHex: string, darkFallback: string): string => {
  const whiteRatio = getContrastRatio(bgHex, '#ffffff');
  const darkRatio = getContrastRatio(bgHex, darkFallback);
  return whiteRatio >= darkRatio ? '#ffffff' : darkFallback;
};

export const resolveEmailThemeForAppearance = (raw: unknown): EmailThemePalette => {
  const sanitized = sanitizeTenantAppearance(raw);
  if (!sanitized) {
    return DEFAULT_EMAIL_THEME_PALETTE;
  }

  const preset = BACKEND_PALETTE_PRESETS[sanitized.palettePreset];
  const surfaceTemp = sanitized.surfaceTemperature ?? preset.defaultSurface;
  const displayFontStack = SERIF_PAIRINGS.has(sanitized.fontPairing)
    ? SERIF_DISPLAY_STACK
    : SANS_DISPLAY_STACK;

  if (
    sanitized.palettePreset === 'rose-editorial' &&
    !sanitized.customPrimaryHex &&
    !sanitized.customAccentHex &&
    !sanitized.customBackgroundHex &&
    surfaceTemp === 'warm'
  ) {
    return {
      ...DEFAULT_EMAIL_THEME_PALETTE,
      displayFontStack,
    };
  }

  const baseSurface = EMAIL_SURFACE_BY_TEMP[surfaceTemp];
  const surface = sanitized.customBackgroundHex
    ? (() => {
        const bgHsl = rgbToHsl(hexToRgb(sanitized.customBackgroundHex));
        const sat = bgHsl.s <= 6 ? bgHsl.s : clamp(Math.round(bgHsl.s * 0.55), 8, 28);
        return {
          ...baseSurface,
          bgBody: hslToHex({ h: bgHsl.h, s: sat, l: 96 }),
          bgSubtle: hslToHex({ h: bgHsl.h, s: sat, l: 92 }),
          borderSubtle: hslToHex({ h: bgHsl.h, s: sat, l: 86 }),
          borderMedium: hslToHex({ h: bgHsl.h, s: sat, l: 78 }),
        };
      })()
    : baseSurface;

  const primary = ensureLightModeReadable(
    sanitized.customPrimaryHex ?? preset.primaryLight,
    surface.bgSurface,
    4.5
  );
  const accent = ensureLightModeReadable(
    sanitized.customAccentHex ?? preset.accentLight,
    surface.bgSurface,
    3.8
  );

  const primaryHsl = rgbToHsl(hexToRgb(primary));
  const accentHsl = rgbToHsl(hexToRgb(accent));

  return {
    ...DEFAULT_EMAIL_THEME_PALETTE,
    ...surface,
    primary,
    primaryDark: hslToHex({
      h: primaryHsl.h,
      s: primaryHsl.s,
      l: clamp(primaryHsl.l - 12, 10, 44),
    }),
    primaryLight: hslToHex({
      h: primaryHsl.h,
      s: clamp(primaryHsl.s, 14, 42),
      l: 95,
    }),
    primaryBorder: hslToHex({
      h: primaryHsl.h,
      s: clamp(primaryHsl.s, 14, 42),
      l: 83,
    }),
    primaryForeground: pickButtonForeground(primary, surface.textPrimary),
    accent,
    accentLight: hslToHex({
      h: accentHsl.h,
      s: clamp(accentHsl.s, 10, 32),
      l: 94,
    }),
    accentBorder: hslToHex({
      h: accentHsl.h,
      s: clamp(accentHsl.s, 10, 30),
      l: 82,
    }),
    displayFontStack,
  };
};
