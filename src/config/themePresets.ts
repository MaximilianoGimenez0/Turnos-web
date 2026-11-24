import type {
  BackgroundIntensity,
  BackgroundStyleId,
  ButtonStyleId,
  DensityScaleId,
  FontPairingId,
  HeroCopyPresetId,
  HeroImageFrameId,
  HeroImageShapeId,
  HeroLayoutId,
  PalettePresetId,
  ShapePresetId,
  SurfaceStyleId,
  SurfaceTemperature,
  TenantAppearanceConfig,
  TextScaleId,
} from '../types';

export type PaletteCategoryId =
  | 'editorial'
  | 'warm'
  | 'botanical'
  | 'minimal'
  | 'vibrant'
  | 'clinical';

export interface PalettePresetDefinition {
  id: PalettePresetId;
  name: string;
  category: PaletteCategoryId;
  description: string;
  primaryLight: string;
  primaryDark: string;
  accentLight: string;
  accentDark: string;
  defaultSurface: SurfaceTemperature;
}

export interface SurfacePaletteTokens {
  bgBody: string;
  bgSurface: string;
  bgSurfaceElevated: string;
  bgSurfaceSubtle: string;
  bgSurfaceHover: string;
  bgBackdrop: string;
  borderSubtle: string;
  borderMedium: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  shadowRgb: string;
}

export interface FontPairingDefinition {
  id: FontPairingId;
  name: string;
  description: string;
  display: string;
  heading: string;
  body: string;
  googleFontsUrl: string | null;
}

export interface ShapePresetDefinition {
  id: ShapePresetId;
  name: string;
  description: string;
  radii: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
}

export interface SurfaceStyleDefinition {
  id: SurfaceStyleId;
  name: string;
  description: string;
}

export interface ButtonStyleDefinition {
  id: ButtonStyleId;
  name: string;
  description: string;
}

export interface BackgroundStyleDefinition {
  id: BackgroundStyleId;
  name: string;
  description: string;
}

export interface BackgroundIntensityDefinition {
  id: BackgroundIntensity;
  name: string;
  multiplier: number;
}

export interface DensityScaleDefinition {
  id: DensityScaleId;
  name: string;
  description: string;
  factor: number;
}

export interface TextScaleDefinition {
  id: TextScaleId;
  name: string;
  description: string;
  factor: number;
}

export const PALETTE_CATEGORY_LABELS: Record<PaletteCategoryId, string> = {
  editorial: 'Estética & Editorial',
  warm: 'Tierra & Boutique',
  botanical: 'Botánica & Spa',
  minimal: 'Minimal & Estudios',
  vibrant: 'Vibrante & Creativo',
  clinical: 'Clínico & Bienestar',
};

export const PALETTE_PRESETS: readonly PalettePresetDefinition[] = [
  // Estética & Editorial
  {
    id: 'rose-editorial',
    name: 'Rosa Editorial',
    category: 'editorial',
    description: 'Malva cálido clásico de estética y belleza.',
    primaryLight: '#9e4f5e',
    primaryDark: '#e8a1ae',
    accentLight: '#8c7258',
    accentDark: '#d2b699',
    defaultSurface: 'warm',
  },
  {
    id: 'blush-peony',
    name: 'Peonía Suave',
    category: 'editorial',
    description: 'Rosa peonía luminoso sobre seda rosada.',
    primaryLight: '#a94869',
    primaryDark: '#f0a6be',
    accentLight: '#96725e',
    accentDark: '#d8b7a5',
    defaultSurface: 'blush',
  },
  {
    id: 'burgundy-noir',
    name: 'Borgoña Atelier',
    category: 'editorial',
    description: 'Vino profundo de alta gama y elegancia.',
    primaryLight: '#7e2b3e',
    primaryDark: '#e394a6',
    accentLight: '#8d745a',
    accentDark: '#d0b89e',
    defaultSurface: 'warm',
  },
  {
    id: 'plum-velvet',
    name: 'Ciruela Terciopelo',
    category: 'editorial',
    description: 'Ciruela sofisticada sobre piedra limpia.',
    primaryLight: '#753f64',
    primaryDark: '#d89ec6',
    accentLight: '#856c7d',
    accentDark: '#c7b0bf',
    defaultSurface: 'neutral',
  },

  // Tierra & Boutique
  {
    id: 'terracotta-warm',
    name: 'Terracota Cálida',
    category: 'warm',
    description: 'Arcilla horneada con espíritu orgánico.',
    primaryLight: '#ad4f36',
    primaryDark: '#eba089',
    accentLight: '#8a6d52',
    accentDark: '#d1b598',
    defaultSurface: 'warm',
  },
  {
    id: 'champagne-bronze',
    name: 'Bronce Champagne',
    category: 'warm',
    description: 'Tono bronce editorial y arena refinada.',
    primaryLight: '#8c6037',
    primaryDark: '#ddb68c',
    accentLight: '#78634f',
    accentDark: '#c4b09c',
    defaultSurface: 'warm',
  },
  {
    id: 'cocoa-mocha',
    name: 'Cacao & Moka',
    category: 'warm',
    description: 'Marrón espresso envolvente y atemporal.',
    primaryLight: '#6e4736',
    primaryDark: '#d5a894',
    accentLight: '#8f7257',
    accentDark: '#cfb49a',
    defaultSurface: 'warm',
  },
  {
    id: 'amber-honey',
    name: 'Ámbar Dorado',
    category: 'warm',
    description: 'Ocre miel cálido con presencia serena.',
    primaryLight: '#945f1c',
    primaryDark: '#e4b878',
    accentLight: '#7c654d',
    accentDark: '#c7b19a',
    defaultSurface: 'warm',
  },

  // Botánica & Spa
  {
    id: 'sage-botanical',
    name: 'Salvia Botánica',
    category: 'botanical',
    description: 'Verde salvia natural para bienestar y skin care.',
    primaryLight: '#436852',
    primaryDark: '#96c7a8',
    accentLight: '#83725b',
    accentDark: '#cab9a2',
    defaultSurface: 'sage',
  },
  {
    id: 'eucalyptus-mist',
    name: 'Eucalipto Spa',
    category: 'botanical',
    description: 'Verde azulado fresco estilo spa contemporáneo.',
    primaryLight: '#2f6a64',
    primaryDark: '#87cbc3',
    accentLight: '#647674',
    accentDark: '#adc0be',
    defaultSurface: 'cool',
  },
  {
    id: 'olive-grove',
    name: 'Oliva Orgánica',
    category: 'botanical',
    description: 'Verde oliva mediterráneo de tono suave.',
    primaryLight: '#5a6635',
    primaryDark: '#b6c484',
    accentLight: '#857458',
    accentDark: '#cbbba0',
    defaultSurface: 'warm',
  },
  {
    id: 'ocean-slate',
    name: 'Pizarra Marina',
    category: 'botanical',
    description: 'Azul pizarra sereno para estética y spa.',
    primaryLight: '#335f78',
    primaryDark: '#8ebcd6',
    accentLight: '#637583',
    accentDark: '#adbecb',
    defaultSurface: 'cool',
  },

  // Minimal & Estudios
  {
    id: 'noir-minimal',
    name: 'Noir Minimal',
    category: 'minimal',
    description: 'Monocromo carbón para barberías y estudios.',
    primaryLight: '#2c2927',
    primaryDark: '#dfd8d1',
    accentLight: '#6e6761',
    accentDark: '#b8b0a8',
    defaultSurface: 'paper',
  },
  {
    id: 'midnight-indigo',
    name: 'Índigo Nocturno',
    category: 'minimal',
    description: 'Azul índigo limpio con aire arquitectónico.',
    primaryLight: '#3b4a7a',
    primaryDark: '#9fb0e3',
    accentLight: '#687187',
    accentDark: '#b2bad0',
    defaultSurface: 'cool',
  },
  {
    id: 'lavender-silk',
    name: 'Lavanda Seda',
    category: 'minimal',
    description: 'Violeta empolvado suave y contemporáneo.',
    primaryLight: '#664f8a',
    primaryDark: '#bfb0e0',
    accentLight: '#7c708a',
    accentDark: '#bfb4cd',
    defaultSurface: 'neutral',
  },
  {
    id: 'crimson-studio',
    name: 'Carmín Estudio',
    category: 'minimal',
    description: 'Rojo carmín sobrio con contraste editorial.',
    primaryLight: '#9c313f',
    primaryDark: '#eb94a0',
    accentLight: '#756662',
    accentDark: '#bfb0ac',
    defaultSurface: 'paper',
  },

  // Vibrante & Creativo
  {
    id: 'coral-sunset',
    name: 'Coral Atardecer',
    category: 'vibrant',
    description: 'Coral intenso y expresivo para nail art y estudios.',
    primaryLight: '#b33d2e',
    primaryDark: '#f29b8e',
    accentLight: '#8c6548',
    accentDark: '#d8b496',
    defaultSurface: 'warm',
  },
  {
    id: 'electric-cobalt',
    name: 'Cobalto Eléctrico',
    category: 'vibrant',
    description: 'Azul cobalto nítido sobre galería pura.',
    primaryLight: '#2451a6',
    primaryDark: '#92b6f5',
    accentLight: '#5c6b8a',
    accentDark: '#aebcd8',
    defaultSurface: 'paper',
  },
  {
    id: 'emerald-jewel',
    name: 'Esmeralda Joya',
    category: 'vibrant',
    description: 'Verde esmeralda profundo con energía boutique.',
    primaryLight: '#146b53',
    primaryDark: '#7ed4ba',
    accentLight: '#736c52',
    accentDark: '#c2ba9c',
    defaultSurface: 'sage',
  },
  {
    id: 'orchid-vivid',
    name: 'Orquídea Intensa',
    category: 'vibrant',
    description: 'Fucsia orquídea vibrante sobre porcelana rosada.',
    primaryLight: '#8a2d79',
    primaryDark: '#e396d4',
    accentLight: '#7a6375',
    accentDark: '#c7b0c2',
    defaultSurface: 'blush',
  },

  // Clínico & Bienestar
  {
    id: 'clinical-teal',
    name: 'Turquesa Clínico',
    category: 'clinical',
    description: 'Verde agua profesional para consultorios y salud.',
    primaryLight: '#18697a',
    primaryDark: '#7ecad9',
    accentLight: '#5a7378',
    accentDark: '#a6bfc4',
    defaultSurface: 'paper',
  },
  {
    id: 'nordic-blue',
    name: 'Azul Nórdico',
    category: 'clinical',
    description: 'Azul confiable y sereno para atención clínica.',
    primaryLight: '#2d5885',
    primaryDark: '#94bbe3',
    accentLight: '#607182',
    accentDark: '#adbcc9',
    defaultSurface: 'cool',
  },
  {
    id: 'pilates-sand',
    name: 'Arena Pilates',
    category: 'clinical',
    description: 'Tierra neutra calma para pilates, yoga y kinesiología.',
    primaryLight: '#7a5d42',
    primaryDark: '#d8bc9e',
    accentLight: '#6e6b62',
    accentDark: '#bbb7ad',
    defaultSurface: 'warm',
  },
  {
    id: 'titanium-slate',
    name: 'Grafito Titanio',
    category: 'clinical',
    description: 'Gris acero técnico de máxima sobriedad.',
    primaryLight: '#3d4956',
    primaryDark: '#aebccb',
    accentLight: '#636d78',
    accentDark: '#b2bbc5',
    defaultSurface: 'paper',
  },
];

export const PALETTE_PRESET_MAP: Record<PalettePresetId, PalettePresetDefinition> =
  PALETTE_PRESETS.reduce(
    (acc, preset) => {
      acc[preset.id] = preset;
      return acc;
    },
    {} as Record<PalettePresetId, PalettePresetDefinition>
  );

export const SURFACE_TEMPERATURE_ORDER: readonly SurfaceTemperature[] = [
  'warm',
  'neutral',
  'cool',
  'paper',
  'blush',
  'sage',
];

export const SURFACE_TEMPERATURES: Record<
  SurfaceTemperature,
  { name: string; description: string; light: SurfacePaletteTokens; dark: SurfacePaletteTokens }
> = {
  warm: {
    name: 'Cálida',
    description: 'Crema marfil en claro y espresso cacao en oscuro.',
    light: {
      bgBody: '#f1e9dc',
      bgSurface: '#faf5ec',
      bgSurfaceElevated: '#fdfaf4',
      bgSurfaceSubtle: '#e8dece',
      bgSurfaceHover: '#dfd3c0',
      bgBackdrop: 'rgba(35, 28, 25, 0.45)',
      borderSubtle: '#ded3c2',
      borderMedium: '#cdbfa9',
      borderStrong: '#b6a48d',
      textPrimary: '#231c19',
      textSecondary: '#5c514b',
      textMuted: '#7e716a',
      shadowRgb: '35, 28, 25',
    },
    dark: {
      bgBody: '#231c17',
      bgSurface: '#2d241e',
      bgSurfaceElevated: '#372c25',
      bgSurfaceSubtle: 'rgba(245, 235, 222, 0.06)',
      bgSurfaceHover: 'rgba(245, 235, 222, 0.11)',
      bgBackdrop: 'rgba(24, 18, 14, 0.72)',
      borderSubtle: 'rgba(245, 235, 222, 0.12)',
      borderMedium: 'rgba(245, 235, 222, 0.2)',
      borderStrong: 'rgba(245, 235, 222, 0.3)',
      textPrimary: '#f5ede3',
      textSecondary: '#cbbeb0',
      textMuted: '#a49485',
      shadowRgb: '14, 10, 8',
    },
  },
  neutral: {
    name: 'Neutra',
    description: 'Piedra limpia en claro y grafito suave en oscuro.',
    light: {
      bgBody: '#efeeec',
      bgSurface: '#f9f8f7',
      bgSurfaceElevated: '#ffffff',
      bgSurfaceSubtle: '#e5e3e0',
      bgSurfaceHover: '#dbd8d4',
      bgBackdrop: 'rgba(24, 23, 22, 0.45)',
      borderSubtle: '#dcd9d5',
      borderMedium: '#c8c4be',
      borderStrong: '#aca79f',
      textPrimary: '#1d1c1b',
      textSecondary: '#54514e',
      textMuted: '#75716c',
      shadowRgb: '24, 23, 22',
    },
    dark: {
      bgBody: '#1d1d1e',
      bgSurface: '#262628',
      bgSurfaceElevated: '#303033',
      bgSurfaceSubtle: 'rgba(244, 244, 246, 0.06)',
      bgSurfaceHover: 'rgba(244, 244, 246, 0.11)',
      bgBackdrop: 'rgba(14, 14, 15, 0.72)',
      borderSubtle: 'rgba(244, 244, 246, 0.12)',
      borderMedium: 'rgba(244, 244, 246, 0.2)',
      borderStrong: 'rgba(244, 244, 246, 0.3)',
      textPrimary: '#f3f2f0',
      textSecondary: '#c4c2be',
      textMuted: '#999690',
      shadowRgb: '8, 8, 10',
    },
  },
  cool: {
    name: 'Fría',
    description: 'Bruma marfil en claro y pizarra nocturna en oscuro.',
    light: {
      bgBody: '#eaeff3',
      bgSurface: '#f6f8fa',
      bgSurfaceElevated: '#ffffff',
      bgSurfaceSubtle: '#dee5ec',
      bgSurfaceHover: '#d2dce6',
      bgBackdrop: 'rgba(20, 28, 38, 0.45)',
      borderSubtle: '#d2dce5',
      borderMedium: '#bcc9d6',
      borderStrong: '#9eb0c2',
      textPrimary: '#192129',
      textSecondary: '#4a5866',
      textMuted: '#697887',
      shadowRgb: '20, 28, 38',
    },
    dark: {
      bgBody: '#192028',
      bgSurface: '#222b35',
      bgSurfaceElevated: '#2b3643',
      bgSurfaceSubtle: 'rgba(232, 240, 248, 0.06)',
      bgSurfaceHover: 'rgba(232, 240, 248, 0.11)',
      bgBackdrop: 'rgba(12, 16, 22, 0.74)',
      borderSubtle: 'rgba(232, 240, 248, 0.12)',
      borderMedium: 'rgba(232, 240, 248, 0.2)',
      borderStrong: 'rgba(232, 240, 248, 0.3)',
      textPrimary: '#edf3f8',
      textSecondary: '#bcc8d4',
      textMuted: '#8f9fae',
      shadowRgb: '8, 12, 18',
    },
  },
  paper: {
    name: 'Galería Pura',
    description: 'Blanco limpio estilo galería y carbón profundo en oscuro.',
    light: {
      bgBody: '#f5f5f7',
      bgSurface: '#ffffff',
      bgSurfaceElevated: '#ffffff',
      bgSurfaceSubtle: '#ebebef',
      bgSurfaceHover: '#e1e1e6',
      bgBackdrop: 'rgba(17, 17, 20, 0.45)',
      borderSubtle: '#e2e2e7',
      borderMedium: '#cdced6',
      borderStrong: '#b0b1bc',
      textPrimary: '#151518',
      textSecondary: '#4f5059',
      textMuted: '#6e707b',
      shadowRgb: '17, 17, 20',
    },
    dark: {
      bgBody: '#111113',
      bgSurface: '#1b1b1e',
      bgSurfaceElevated: '#242429',
      bgSurfaceSubtle: 'rgba(255, 255, 255, 0.06)',
      bgSurfaceHover: 'rgba(255, 255, 255, 0.11)',
      bgBackdrop: 'rgba(6, 6, 8, 0.76)',
      borderSubtle: 'rgba(255, 255, 255, 0.11)',
      borderMedium: 'rgba(255, 255, 255, 0.2)',
      borderStrong: 'rgba(255, 255, 255, 0.3)',
      textPrimary: '#f5f5f7',
      textSecondary: '#c3c4cc',
      textMuted: '#92949f',
      shadowRgb: '0, 0, 0',
    },
  },
  blush: {
    name: 'Seda Rosada',
    description: 'Porcelana con matiz rosa y burdeos nocturno en oscuro.',
    light: {
      bgBody: '#f5ecee',
      bgSurface: '#fcf8f9',
      bgSurfaceElevated: '#ffffff',
      bgSurfaceSubtle: '#ece0e3',
      bgSurfaceHover: '#e2d2d6',
      bgBackdrop: 'rgba(38, 24, 28, 0.45)',
      borderSubtle: '#e3d3d7',
      borderMedium: '#d2bdc3',
      borderStrong: '#b89ea5',
      textPrimary: '#261a1e',
      textSecondary: '#614d53',
      textMuted: '#826c73',
      shadowRgb: '38, 24, 28',
    },
    dark: {
      bgBody: '#22181b',
      bgSurface: '#2d2024',
      bgSurfaceElevated: '#38282d',
      bgSurfaceSubtle: 'rgba(248, 232, 237, 0.06)',
      bgSurfaceHover: 'rgba(248, 232, 237, 0.11)',
      bgBackdrop: 'rgba(18, 12, 14, 0.75)',
      borderSubtle: 'rgba(248, 232, 237, 0.12)',
      borderMedium: 'rgba(248, 232, 237, 0.2)',
      borderStrong: 'rgba(248, 232, 237, 0.3)',
      textPrimary: '#f7edf0',
      textSecondary: '#cfb9c0',
      textMuted: '#a68d96',
      shadowRgb: '14, 8, 10',
    },
  },
  sage: {
    name: 'Lino Botánico',
    description: 'Mineral salvia claro y bosque profundo en oscuro.',
    light: {
      bgBody: '#eaf0ec',
      bgSurface: '#f6faf7',
      bgSurfaceElevated: '#ffffff',
      bgSurfaceSubtle: '#dde7e0',
      bgSurfaceHover: '#d0ddd4',
      bgBackdrop: 'rgba(22, 34, 27, 0.45)',
      borderSubtle: '#d3dfd7',
      borderMedium: '#bccdc2',
      borderStrong: '#9eb4a6',
      textPrimary: '#19241d',
      textSecondary: '#495c50',
      textMuted: '#687d70',
      shadowRgb: '22, 34, 27',
    },
    dark: {
      bgBody: '#161f1a',
      bgSurface: '#1f2b24',
      bgSurfaceElevated: '#28372e',
      bgSurfaceSubtle: 'rgba(232, 245, 237, 0.06)',
      bgSurfaceHover: 'rgba(232, 245, 237, 0.11)',
      bgBackdrop: 'rgba(10, 15, 12, 0.75)',
      borderSubtle: 'rgba(232, 245, 237, 0.12)',
      borderMedium: 'rgba(232, 245, 237, 0.2)',
      borderStrong: 'rgba(232, 245, 237, 0.3)',
      textPrimary: '#edf5f0',
      textSecondary: '#bccdc2',
      textMuted: '#8ea396',
      shadowRgb: '8, 13, 10',
    },
  },
};

export const FONT_PAIRINGS: readonly FontPairingDefinition[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Cormorant Garamond + Plus Jakarta Sans + Inter',
    display: "'Cormorant Garamond', Georgia, serif",
    heading:
      "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    body: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    googleFontsUrl: null,
  },
  {
    id: 'classic',
    name: 'Clásico Boutique',
    description: 'Playfair Display + DM Sans',
    display: "'Playfair Display', Georgia, serif",
    heading: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@400;500;600&display=swap',
  },
  {
    id: 'modern',
    name: 'Moderno Geométrico',
    description: 'Outfit + Plus Jakarta Sans + Inter',
    display: "'Outfit', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    heading:
      "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    body: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap',
  },
  {
    id: 'minimal',
    name: 'Minimal Urbano',
    description: 'Space Grotesk + Inter',
    display:
      "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    heading:
      "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap',
  },
  {
    id: 'atelier',
    name: 'Atelier Orgánico',
    description: 'Fraunces + Plus Jakarta Sans',
    display: "'Fraunces', Georgia, serif",
    heading:
      "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    body: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&display=swap',
  },
  {
    id: 'clinical',
    name: 'Clínico Preciso',
    description: 'Manrope + Inter',
    display: "'Manrope', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    heading: "'Manrope', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&display=swap',
  },
  {
    id: 'expressive',
    name: 'Estudio Creativo',
    description: 'Syne + DM Sans',
    display: "'Syne', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    heading: "'Syne', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700&family=DM+Sans:wght@400;500;600&display=swap',
  },
  {
    id: 'friendly',
    name: 'Cercano & Suave',
    description: 'Lora + Nunito Sans',
    display: "'Lora', Georgia, serif",
    heading: "'Lora', Georgia, serif",
    body: "'Nunito Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Nunito+Sans:wght@400;500;600&display=swap',
  },
];

export const FONT_PAIRING_MAP: Record<FontPairingId, FontPairingDefinition> =
  FONT_PAIRINGS.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<FontPairingId, FontPairingDefinition>
  );

export const SHAPE_PRESETS: readonly ShapePresetDefinition[] = [
  {
    id: 'sharp',
    name: 'Recto',
    description: 'Esquinas arquitectónicas de precisión.',
    radii: { xs: '3px', sm: '4px', md: '6px', lg: '8px', xl: '10px', '2xl': '12px' },
  },
  {
    id: 'soft',
    name: 'Suave',
    description: 'Equilibrio orgánico predeterminado.',
    radii: { xs: '6px', sm: '8px', md: '12px', lg: '16px', xl: '20px', '2xl': '24px' },
  },
  {
    id: 'rounded',
    name: 'Redondeado',
    description: 'Curvas generosas y aire amigable.',
    radii: { xs: '10px', sm: '14px', md: '18px', lg: '24px', xl: '28px', '2xl': '32px' },
  },
  {
    id: 'pill',
    name: 'Cápsula',
    description: 'Botones y chips tipo píldora con tarjetas suaves.',
    radii: { xs: '9999px', sm: '9999px', md: '18px', lg: '24px', xl: '28px', '2xl': '32px' },
  },
];

export const SHAPE_PRESET_MAP: Record<ShapePresetId, ShapePresetDefinition> =
  SHAPE_PRESETS.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<ShapePresetId, ShapePresetDefinition>
  );

export const SURFACE_STYLES: readonly SurfaceStyleDefinition[] = [
  {
    id: 'bordered',
    name: 'Con borde',
    description: 'Contorno sutil de 1 px y sombra discreta.',
  },
  {
    id: 'elevated',
    name: 'Elevado',
    description: 'Tarjetas con relieve y sombras ambientales.',
  },
  {
    id: 'flat',
    name: 'Plano tonal',
    description: 'Sin sombras, separado solo por capas de color.',
  },
  {
    id: 'glass',
    name: 'Cristal suave',
    description: 'Translúcido con desenfoque ideal sobre fondos con textura.',
  },
];

export const BUTTON_STYLES: readonly ButtonStyleDefinition[] = [
  {
    id: 'solid',
    name: 'Relleno',
    description: 'Botón sólido de máxima jerarquía visual.',
  },
  {
    id: 'soft',
    name: 'Tonal suave',
    description: 'Fondo tintado delicado que se rellena al pasar el cursor.',
  },
  {
    id: 'outline',
    name: 'Contorno',
    description: 'Borde limpio y aire arquitectónico minimalista.',
  },
];

export const BACKGROUND_STYLES: readonly BackgroundStyleDefinition[] = [
  {
    id: 'solid',
    name: 'Liso',
    description: 'Fondo uniforme limpio sin texturas.',
  },
  {
    id: 'soft-gradient',
    name: 'Degradado suave',
    description: 'Transición atmosférica con matices de tu marca.',
  },
  {
    id: 'mesh-glow',
    name: 'Aura de marca',
    description: 'Halos radiales difusos en las esquinas.',
  },
  {
    id: 'dots',
    name: 'Trama de puntos',
    description: 'Micropuntos geométricos discretos.',
  },
  {
    id: 'grid',
    name: 'Grilla editorial',
    description: 'Cuadrícula arquitectónica minimalista.',
  },
  {
    id: 'diagonal',
    name: 'Líneas finas',
    description: 'Textura diagonal sutil tipo papel de estudio.',
  },
];

export const BACKGROUND_INTENSITIES: readonly BackgroundIntensityDefinition[] = [
  { id: 'subtle', name: 'Sutil', multiplier: 0.55 },
  { id: 'balanced', name: 'Equilibrada', multiplier: 1.0 },
  { id: 'vivid', name: 'Marcada', multiplier: 1.55 },
];

export const BACKGROUND_INTENSITY_MAP: Record<BackgroundIntensity, BackgroundIntensityDefinition> =
  BACKGROUND_INTENSITIES.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<BackgroundIntensity, BackgroundIntensityDefinition>
  );

export const DENSITY_SCALES: readonly DensityScaleDefinition[] = [
  { id: 'compact', name: 'Compacta', description: 'Más contenido visible por pantalla.', factor: 0.86 },
  { id: 'comfortable', name: 'Equilibrada', description: 'Ritmo estándar recomendado.', factor: 1.0 },
  { id: 'spacious', name: 'Amplia', description: 'Mayor respiración editorial.', factor: 1.14 },
];

export const DENSITY_SCALE_MAP: Record<DensityScaleId, DensityScaleDefinition> =
  DENSITY_SCALES.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<DensityScaleId, DensityScaleDefinition>
  );

export const TEXT_SCALES: readonly TextScaleDefinition[] = [
  { id: 'sm', name: 'Sutil', description: 'Tipografía ligeramente más compacta.', factor: 0.94 },
  { id: 'md', name: 'Estándar', description: 'Escala original balanceada.', factor: 1.0 },
  { id: 'lg', name: 'Amplia', description: 'Mayor tamaño para lectura cómoda.', factor: 1.06 },
];

export const TEXT_SCALE_MAP: Record<TextScaleId, TextScaleDefinition> =
  TEXT_SCALES.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<TextScaleId, TextScaleDefinition>
  );

export interface HeroLayoutDefinition {
  id: HeroLayoutId;
  name: string;
  description: string;
}

export interface HeroImageShapeDefinition {
  id: HeroImageShapeId;
  name: string;
  description: string;
}

export interface HeroImageFrameDefinition {
  id: HeroImageFrameId;
  name: string;
  description: string;
}

export interface HeroCopyPresetDefinition {
  id: HeroCopyPresetId;
  name: string;
  category: string;
  titlePrefix: string;
  titleHighlight: string;
  subtitle: string;
}

export const HERO_LAYOUTS: readonly HeroLayoutDefinition[] = [
  {
    id: 'split-right',
    name: 'Clásico a la derecha',
    description: 'Frase y botones a la izquierda, fotografía protagonista a la derecha.',
  },
  {
    id: 'split-left',
    name: 'Foto a la izquierda',
    description: 'Fotografía primero a la izquierda y narrativa a la derecha.',
  },
  {
    id: 'centered',
    name: 'Centrado editorial',
    description: 'Titular y acciones centrados arriba con la foto destacada debajo.',
  },
  {
    id: 'overlay-banner',
    name: 'Banner inmersivo',
    description: 'La fotografía ocupa todo el fondo con velo protector y texto encima.',
  },
  {
    id: 'minimal-compact',
    name: 'Compacto horizontal',
    description: 'Portada más condensada para acercar la agenda al primer pantallazo.',
  },
];

export const HERO_IMAGE_SHAPES: readonly HeroImageShapeDefinition[] = [
  {
    id: 'portrait',
    name: 'Retrato 4:5',
    description: 'Proporción vertical editorial clásica.',
  },
  {
    id: 'arch',
    name: 'Arco editorial',
    description: 'Curva superior semicircular tipo ventana de estudio.',
  },
  {
    id: 'circle',
    name: 'Círculo',
    description: 'Medallón 1:1 ideal para retratos y marcas personales.',
  },
  {
    id: 'square',
    name: 'Cuadrado 1:1',
    description: 'Proporción simétrica moderna y equilibrada.',
  },
  {
    id: 'landscape',
    name: 'Panorámico 16:10',
    description: 'Formato horizontal ideal para mostrar el local o espacio.',
  },
  {
    id: 'organic',
    name: 'Silueta orgánica',
    description: 'Contorno asimétrico suave de inspiración artesanal.',
  },
];

export const HERO_IMAGE_FRAMES: readonly HeroImageFrameDefinition[] = [
  {
    id: 'editorial-mat',
    name: 'Paspartú editorial',
    description: 'Marco limpio con aire interior, borde sutil y sombra suave.',
  },
  {
    id: 'minimal-border',
    name: 'Limpio a sangre',
    description: 'Fotografía completa con borde fino de 1px sin relleno.',
  },
  {
    id: 'double-line',
    name: 'Doble filete',
    description: 'Doble borde fino estilo revista y atelier.',
  },
  {
    id: 'offset-accent',
    name: 'Marco desplazado',
    description: 'Silueta trasera desplazada teñida con el color de tu marca.',
  },
  {
    id: 'polaroid',
    name: 'Postal / Polaroid',
    description: 'Base amplia que integra el nombre y ubicación dentro del marco.',
  },
  {
    id: 'floating-caption',
    name: 'Placa flotante',
    description: 'Foto limpia con tarjeta sutil superpuesta en la base.',
  },
];

export const HERO_COPY_PRESETS: readonly HeroCopyPresetDefinition[] = [
  {
    id: 'editorial-beauty',
    name: 'Estética y belleza',
    category: 'Estética',
    titlePrefix: 'Tu momento de cuidado y',
    titleHighlight: 'belleza personalizada',
    subtitle:
      'Elegí el servicio que buscás, seleccioná el horario que mejor te quede y asegurá tu lugar con seña 100% protegida por Mercado Pago.',
  },
  {
    id: 'modern-studio',
    name: 'Estudio ágil',
    category: 'Multirrubro',
    titlePrefix: 'Reservá tu próximo turno en',
    titleHighlight: 'cuestión de segundos',
    subtitle:
      'Consultá disponibilidad real, elegí el horario que mejor se adapte a tu rutina y confirmá tu cita al instante.',
  },
  {
    id: 'wellness-calm',
    name: 'Bienestar y calma',
    category: 'Bienestar',
    titlePrefix: 'Un espacio pensado para',
    titleHighlight: 'tu bienestar diario',
    subtitle:
      'Agendá tu sesión online sin esperas, con confirmación inmediata y recordatorios automáticos.',
  },
  {
    id: 'barber-craft',
    name: 'Oficio y estilo',
    category: 'Barbería',
    titlePrefix: 'Estilo, precisión y',
    titleHighlight: 'atención a tu medida',
    subtitle:
      'Elegí tu servicio, reservá el día y horario disponible y asegurá tu lugar de forma rápida y segura.',
  },
  {
    id: 'clinical-trust',
    name: 'Confianza profesional',
    category: 'Salud',
    titlePrefix: 'Atención profesional con',
    titleHighlight: 'turnos claros y puntuales',
    subtitle:
      'Seleccioná la prestación, elegí tu horario disponible y recibí confirmación inmediata por correo.',
  },
  {
    id: 'boutique-luxury',
    name: 'Experiencia boutique',
    category: 'Atelier',
    titlePrefix: 'Experiencias exclusivas,',
    titleHighlight: 'pensadas para vos',
    subtitle:
      'Agenda online actualizada en tiempo real para que reserves tu cita con total comodidad y respaldo.',
  },
  {
    id: 'direct-action',
    name: 'Directo y simple',
    category: 'Minimal',
    titlePrefix: 'Tu turno online,',
    titleHighlight: 'simple y sin vueltas',
    subtitle:
      'Mirá los horarios libres, elegí tu servicio y confirmá tu reserva en pocos pasos.',
  },
  {
    id: 'warm-welcome',
    name: 'Cercano y personal',
    category: 'Personal',
    titlePrefix: 'Te esperamos para',
    titleHighlight: 'cuidar cada detalle',
    subtitle:
      'Reservá tu horario desde el celular o la compu y recibí tu comprobante al instante.',
  },
];

export const HERO_COPY_PRESET_MAP: Record<HeroCopyPresetId, HeroCopyPresetDefinition> =
  HERO_COPY_PRESETS.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<HeroCopyPresetId, HeroCopyPresetDefinition>
  );

export const DEFAULT_TENANT_APPEARANCE: TenantAppearanceConfig = {
  palettePreset: 'rose-editorial',
  customPrimaryHex: null,
  customAccentHex: null,
  surfaceTemperature: null,
  customBackgroundHex: null,
  backgroundStyle: 'solid',
  backgroundIntensity: 'balanced',
  defaultMode: 'light',
  allowVisitorModeToggle: true,
  fontPairing: 'editorial',
  shapePreset: 'soft',
  surfaceStyle: 'bordered',
  buttonStyle: 'solid',
  density: 'comfortable',
  textScale: 'md',
  heroLayout: 'split-right',
  heroImageShape: 'portrait',
  heroImageFrame: 'editorial-mat',
  heroCopyPreset: 'editorial-beauty',
  heroCustomTitlePrefix: null,
  heroCustomTitleHighlight: null,
  heroCustomSubtitle: null,
  heroShowCaption: true,
};
