import type {
  BackgroundIntensity,
  BackgroundStyleId,
  ButtonStyleId,
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
    button: string;
    buttonSm: string;
    chip: string;
    input: string;
    textarea: string;
    card: string;
    media: string;
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
    radii: {
      xs: '2px',
      sm: '3px',
      md: '4px',
      lg: '6px',
      xl: '8px',
      '2xl': '10px',
      button: '3px',
      buttonSm: '2px',
      chip: '3px',
      input: '3px',
      textarea: '3px',
      card: '4px',
      media: '2px',
    },
  },
  {
    id: 'soft',
    name: 'Suave',
    description: 'Equilibrio orgánico predeterminado.',
    radii: {
      xs: '6px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '20px',
      '2xl': '24px',
      button: '8px',
      buttonSm: '6px',
      chip: '9999px',
      input: '8px',
      textarea: '8px',
      card: '12px',
      media: '8px',
    },
  },
  {
    id: 'rounded',
    name: 'Redondeado',
    description: 'Curvas generosas y aire amigable.',
    radii: {
      xs: '8px',
      sm: '12px',
      md: '16px',
      lg: '20px',
      xl: '26px',
      '2xl': '30px',
      button: '12px',
      buttonSm: '10px',
      chip: '9999px',
      input: '12px',
      textarea: '12px',
      card: '18px',
      media: '14px',
    },
  },
  {
    id: 'pill',
    name: 'Cápsula',
    description: 'Botones y chips tipo píldora con campos y tarjetas suaves.',
    radii: {
      xs: '8px',
      sm: '12px',
      md: '18px',
      lg: '24px',
      xl: '28px',
      '2xl': '32px',
      button: '9999px',
      buttonSm: '9999px',
      chip: '9999px',
      input: '22px',
      textarea: '16px',
      card: '24px',
      media: '16px',
    },
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

export interface SimpleAppearanceOption<T extends string> {
  id: T;
  name: string;
  description: string;
}

export const NAVBAR_STYLES: readonly SimpleAppearanceOption<NavbarStyleId>[] = [
  {
    id: 'floating',
    name: 'Flotante al desplazarse',
    description: 'Barra limpia arriba que se convierte en cápsula flotante al bajar.',
  },
  {
    id: 'solid',
    name: 'Sólida fija',
    description: 'Cabecera anclada de ancho completo siempre visible y estable.',
  },
  {
    id: 'centered',
    name: 'Editorial centrada',
    description: 'Identidad y navegación equilibradas en barra de corte revista.',
  },
];

export const LOGO_SHAPES: readonly SimpleAppearanceOption<LogoShapeId>[] = [
  {
    id: 'rounded',
    name: 'Redondeado',
    description: 'Marco sutil que acompaña la curvatura del diseño.',
  },
  {
    id: 'square',
    name: 'Cuadrado',
    description: 'Corte recto y limpio de impronta arquitectónica.',
  },
  {
    id: 'circle',
    name: 'Circular',
    description: 'Medallón redondo ideal para monogramas e isotipos.',
  },
  {
    id: 'frameless',
    name: 'Sin marco',
    description: 'Logo libre sin caja ni borde, ideal para PNG transparentes.',
  },
];

export const PORTFOLIO_LAYOUTS: readonly SimpleAppearanceOption<PortfolioLayoutId>[] = [
  {
    id: 'grid',
    name: 'Grilla uniforme',
    description: 'Tarjetas proporcionadas en columnas ordenadas.',
  },
  {
    id: 'bento',
    name: 'Bento destacado',
    description: 'El primer trabajo cobra protagonismo doble en escritorio.',
  },
  {
    id: 'carousel',
    name: 'Carrusel deslizable',
    description: 'Tira horizontal con desplazamiento fluido y controles.',
  },
];

export interface MotionPresetOption extends SimpleAppearanceOption<MotionPresetId> {
  fastMs: string;
  baseMs: string;
  slowMs: string;
}

export const MOTION_PRESETS: readonly MotionPresetOption[] = [
  {
    id: 'fluid',
    name: 'Fluido',
    description: 'Entradas suaves y micro-transiciones expresivas.',
    fastMs: '150ms',
    baseMs: '220ms',
    slowMs: '300ms',
  },
  {
    id: 'subtle',
    name: 'Sutil',
    description: 'Transiciones breves sin desplazamientos llamativos.',
    fastMs: '100ms',
    baseMs: '140ms',
    slowMs: '180ms',
  },
  {
    id: 'none',
    name: 'Sin animaciones',
    description: 'Interfaz instantánea sin movimientos ni rebotes.',
    fastMs: '0ms',
    baseMs: '0ms',
    slowMs: '0ms',
  },
];

export const MOTION_PRESET_MAP: Record<MotionPresetId, MotionPresetOption> = MOTION_PRESETS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<MotionPresetId, MotionPresetOption>
);

export const HERO_HIGHLIGHT_STYLES: readonly SimpleAppearanceOption<HeroHighlightStyleId>[] = [
  {
    id: 'accent',
    name: 'Color de marca',
    description: 'Resalta las palabras clave con tu color principal.',
  },
  {
    id: 'italic',
    name: 'Cursiva editorial',
    description: 'Itálica elegante en contraste con el titular.',
  },
  {
    id: 'underline',
    name: 'Subrayado suave',
    description: 'Trazo de marcador tonal detrás de la frase destacada.',
  },
];

export const SLOT_CARD_STYLES: readonly SimpleAppearanceOption<SlotCardStyleId>[] = [
  {
    id: 'classic',
    name: 'Clásica',
    description: 'Tarjeta equilibrada con borde limpio y lectura amplia.',
  },
  {
    id: 'accent-bar',
    name: 'Banda de marca',
    description: 'Franja lateral en tu color principal para escaneo rápido.',
  },
  {
    id: 'compact',
    name: 'Compacta',
    description: 'Altura reducida para mostrar más horarios por pantalla.',
  },
];

export const HERO_FRAME_ALLOWED_SHAPES: Record<HeroImageFrameId, readonly HeroImageShapeId[]> = {
  'editorial-mat': ['portrait', 'arch', 'circle', 'square', 'landscape', 'organic'],
  'minimal-border': ['portrait', 'arch', 'circle', 'square', 'landscape', 'organic'],
  'double-line': ['portrait', 'arch', 'circle', 'square', 'landscape', 'organic'],
  'offset-accent': ['portrait', 'arch', 'circle', 'square', 'landscape', 'organic'],
  polaroid: ['portrait', 'square', 'landscape'],
  'floating-caption': ['portrait', 'arch', 'circle', 'square', 'landscape', 'organic'],
};

export const isHeroCombinationCompatible = (
  layout: HeroLayoutId,
  shape: HeroImageShapeId,
  frame: HeroImageFrameId
): {
  shapeApplicable: boolean;
  frameApplicable: boolean;
  shapeFrameCompatible: boolean;
  allowedShapesForFrame: readonly HeroImageShapeId[];
} => {
  const isOverlay = layout === 'overlay-banner';
  const allowedShapesForFrame = HERO_FRAME_ALLOWED_SHAPES[frame];
  const shapeFrameCompatible = allowedShapesForFrame.includes(shape);
  return {
    shapeApplicable: !isOverlay,
    frameApplicable: !isOverlay,
    shapeFrameCompatible,
    allowedShapesForFrame,
  };
};

export const coerceCompatibleHeroSettings = <
  T extends Pick<TenantAppearanceConfig, 'heroLayout' | 'heroImageShape' | 'heroImageFrame'>
>(
  next: T
): { config: T; adjustedReason: string | null } => {
  const allowed = HERO_FRAME_ALLOWED_SHAPES[next.heroImageFrame];
  if (!allowed.includes(next.heroImageShape)) {
    return {
      config: { ...next, heroImageShape: allowed[0] },
      adjustedReason: 'Se ajustó la silueta de la foto para que sea compatible con el marco Postal / Polaroid.',
    };
  }
  return { config: next, adjustedReason: null };
};

export interface StylePackDefinition {
  id: string;
  name: string;
  niche: string;
  description: string;
  tags: readonly string[];
  appearance: TenantAppearanceConfig;
}

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
  heroCopyPreset: 'modern-studio',
  heroCustomTitlePrefix: null,
  heroCustomTitleHighlight: null,
  heroCustomSubtitle: null,
  heroShowCaption: true,
  navbarStyle: 'floating',
  logoShape: 'rounded',
  portfolioLayout: 'grid',
  heroShowTrustPills: true,
  showFloatingWhatsApp: false,
  motionPreset: 'fluid',
  heroHighlightStyle: 'accent',
  slotCardStyle: 'classic',
};

export const STYLE_PACKS: readonly StylePackDefinition[] = [
  {
    id: 'nail-lash-atelier',
    name: 'Atelier Uñas & Pestañas',
    niche: 'Estética & Nail Studio',
    description: 'Peonía luminosa, arco editorial, tipografía con serif fina y galería tipo bento.',
    tags: ['Claro', 'Editorial', 'Bento'],
    appearance: {
      ...DEFAULT_TENANT_APPEARANCE,
      palettePreset: 'blush-peony',
      surfaceTemperature: 'blush',
      fontPairing: 'editorial',
      shapePreset: 'rounded',
      surfaceStyle: 'elevated',
      buttonStyle: 'solid',
      backgroundStyle: 'soft-gradient',
      backgroundIntensity: 'subtle',
      heroLayout: 'split-right',
      heroImageShape: 'arch',
      heroImageFrame: 'minimal-border',
      heroCopyPreset: 'editorial-beauty',
      heroHighlightStyle: 'italic',
      navbarStyle: 'floating',
      logoShape: 'circle',
      portfolioLayout: 'bento',
      slotCardStyle: 'classic',
    },
  },
  {
    id: 'barber-classic',
    name: 'Barbería Clásica',
    niche: 'Barbería & Grooming',
    description: 'Tonos cacao nocturnos, doble filete sobrio, cortes rectos y banda de acento en turnos.',
    tags: ['Oscuro', 'Clásico', 'Recto'],
    appearance: {
      ...DEFAULT_TENANT_APPEARANCE,
      palettePreset: 'cocoa-mocha',
      surfaceTemperature: 'warm',
      defaultMode: 'dark',
      fontPairing: 'classic',
      shapePreset: 'sharp',
      surfaceStyle: 'bordered',
      buttonStyle: 'solid',
      backgroundStyle: 'diagonal',
      backgroundIntensity: 'subtle',
      heroLayout: 'split-left',
      heroImageShape: 'portrait',
      heroImageFrame: 'double-line',
      heroCopyPreset: 'barber-craft',
      heroHighlightStyle: 'accent',
      navbarStyle: 'solid',
      logoShape: 'square',
      portfolioLayout: 'grid',
      slotCardStyle: 'accent-bar',
    },
  },
  {
    id: 'spa-botanical',
    name: 'Spa & Bienestar Botánico',
    niche: 'Spa, Masajes & Holística',
    description: 'Salvia orgánica, tarjetas cristal suave, aura de marca y carrusel de experiencias.',
    tags: ['Botánico', 'Cristal', 'Cápsula'],
    appearance: {
      ...DEFAULT_TENANT_APPEARANCE,
      palettePreset: 'sage-botanical',
      surfaceTemperature: 'sage',
      fontPairing: 'atelier',
      shapePreset: 'pill',
      surfaceStyle: 'glass',
      buttonStyle: 'soft',
      backgroundStyle: 'mesh-glow',
      backgroundIntensity: 'balanced',
      density: 'spacious',
      heroLayout: 'centered',
      heroImageShape: 'organic',
      heroImageFrame: 'editorial-mat',
      heroCopyPreset: 'wellness-calm',
      heroHighlightStyle: 'italic',
      navbarStyle: 'centered',
      logoShape: 'circle',
      portfolioLayout: 'carousel',
      showFloatingWhatsApp: true,
    },
  },
  {
    id: 'clinical-studio',
    name: 'Consultorio Clínico',
    niche: 'Salud, Odontología & Kinesiología',
    description: 'Cian médico de alto contraste, tipografía precisa, lectura clara y tarjetas compactas.',
    tags: ['Limpio', 'Alta lectura', 'Compacto'],
    appearance: {
      ...DEFAULT_TENANT_APPEARANCE,
      palettePreset: 'clinical-teal',
      surfaceTemperature: 'paper',
      fontPairing: 'clinical',
      shapePreset: 'soft',
      surfaceStyle: 'bordered',
      buttonStyle: 'solid',
      backgroundStyle: 'solid',
      heroLayout: 'split-right',
      heroImageShape: 'square',
      heroImageFrame: 'minimal-border',
      heroCopyPreset: 'clinical-trust',
      heroHighlightStyle: 'accent',
      navbarStyle: 'solid',
      logoShape: 'rounded',
      portfolioLayout: 'grid',
      slotCardStyle: 'compact',
      motionPreset: 'subtle',
    },
  },
  {
    id: 'urban-minimal',
    name: 'Estudio Minimal Urbano',
    niche: 'Diseño, Peluquería & Moda',
    description: 'Monocromo nítido sobre grilla arquitectónica, botones contorno y portada condensada.',
    tags: ['Minimal', 'Plano', 'Contorno'],
    appearance: {
      ...DEFAULT_TENANT_APPEARANCE,
      palettePreset: 'noir-minimal',
      surfaceTemperature: 'paper',
      fontPairing: 'minimal',
      shapePreset: 'sharp',
      surfaceStyle: 'flat',
      buttonStyle: 'outline',
      backgroundStyle: 'grid',
      backgroundIntensity: 'subtle',
      density: 'compact',
      heroLayout: 'minimal-compact',
      heroImageShape: 'landscape',
      heroImageFrame: 'offset-accent',
      heroCopyPreset: 'direct-action',
      heroHighlightStyle: 'underline',
      navbarStyle: 'solid',
      logoShape: 'frameless',
      portfolioLayout: 'grid',
      slotCardStyle: 'classic',
    },
  },
  {
    id: 'tattoo-art',
    name: 'Tattoo & Arte',
    niche: 'Tatuajes, Piercing & Arte Corporal',
    description: 'Borgoña intenso, banner inmersivo a sangre y galería en mosaico bento.',
    tags: ['Oscuro', 'Inmersivo', 'Expresivo'],
    appearance: {
      ...DEFAULT_TENANT_APPEARANCE,
      palettePreset: 'burgundy-noir',
      surfaceTemperature: 'neutral',
      defaultMode: 'dark',
      fontPairing: 'expressive',
      shapePreset: 'sharp',
      surfaceStyle: 'elevated',
      buttonStyle: 'solid',
      backgroundStyle: 'dots',
      backgroundIntensity: 'subtle',
      heroLayout: 'overlay-banner',
      heroCopyPreset: 'boutique-luxury',
      heroHighlightStyle: 'underline',
      navbarStyle: 'solid',
      logoShape: 'frameless',
      portfolioLayout: 'bento',
      slotCardStyle: 'accent-bar',
    },
  },
  {
    id: 'pilates-wellness',
    name: 'Pilates & Movimiento',
    niche: 'Pilates, Yoga & Entrenamiento',
    description: 'Arena cálida, tipografía amigable, placa flotante sobre foto en arco y tono cercano.',
    tags: ['Cálido', 'Suave', 'Cercano'],
    appearance: {
      ...DEFAULT_TENANT_APPEARANCE,
      palettePreset: 'pilates-sand',
      surfaceTemperature: 'warm',
      fontPairing: 'friendly',
      shapePreset: 'rounded',
      surfaceStyle: 'elevated',
      buttonStyle: 'soft',
      backgroundStyle: 'soft-gradient',
      backgroundIntensity: 'balanced',
      heroLayout: 'split-right',
      heroImageShape: 'arch',
      heroImageFrame: 'floating-caption',
      heroCopyPreset: 'warm-welcome',
      heroHighlightStyle: 'italic',
      navbarStyle: 'floating',
      logoShape: 'rounded',
      portfolioLayout: 'carousel',
      slotCardStyle: 'classic',
    },
  },
];
