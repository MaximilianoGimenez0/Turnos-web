import { BACKGROUND_INTENSITY_MAP } from '../config/themePresets';
import {
  type CanvasAppearanceTokens,
  hexToRgb,
} from '../services/themeEngine';
import type { LogoShapeId } from '../types';
import { drawRoundedRect } from './qrGenerator';

const clampAlpha = (value: number): number => Math.min(0.36, Math.max(0.02, Number(value.toFixed(3))));

export const paintTenantBackgroundToCanvas = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tokens: CanvasAppearanceTokens
): void => {
  const { config, mode, bgBody, primary, accent, textPrimary } = tokens;
  ctx.fillStyle = bgBody;
  ctx.fillRect(0, 0, width, height);

  if (config.backgroundStyle === 'solid') {
    return;
  }

  const mult = BACKGROUND_INTENSITY_MAP[config.backgroundIntensity]?.multiplier ?? 1.0;
  const p = hexToRgb(primary);
  const a = hexToRgb(accent);
  const t = hexToRgb(textPrimary);
  const alpha = (base: number) => clampAlpha(base * mult);

  if (config.backgroundStyle === 'soft-gradient') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha(mode === 'light' ? 0.13 : 0.16)})`);
    grad.addColorStop(0.5, 'transparent');
    grad.addColorStop(1, `rgba(${a.r}, ${a.g}, ${a.b}, ${alpha(mode === 'light' ? 0.09 : 0.11)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (config.backgroundStyle === 'mesh-glow') {
    const spots: Array<[number, number, number, typeof p, number]> = [
      [width * 0.14, height * 0.15, Math.max(width, height) * 0.48, p, alpha(mode === 'light' ? 0.15 : 0.18)],
      [width * 0.88, height * 0.18, Math.max(width, height) * 0.44, a, alpha(mode === 'light' ? 0.13 : 0.15)],
      [width * 0.52, height * 0.92, Math.max(width, height) * 0.5, p, alpha(mode === 'light' ? 0.09 : 0.12)],
    ];

    for (const [cx, cy, radius, rgb, spotAlpha] of spots) {
      const radial = ctx.createRadialGradient(cx, cy, 16, cx, cy, radius);
      radial.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${spotAlpha})`);
      radial.addColorStop(1, 'transparent');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);
    }
    return;
  }

  if (config.backgroundStyle === 'dots') {
    ctx.fillStyle = `rgba(${t.r}, ${t.g}, ${t.b}, ${alpha(mode === 'light' ? 0.13 : 0.15)})`;
    const step = Math.max(24, Math.round(Math.min(width, height) * 0.032));
    const dotRadius = Math.max(1.8, step * 0.065);
    for (let y = step / 2; y < height; y += step) {
      for (let x = step / 2; x < width; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  if (config.backgroundStyle === 'grid') {
    ctx.strokeStyle = `rgba(${t.r}, ${t.g}, ${t.b}, ${alpha(mode === 'light' ? 0.075 : 0.095)})`;
    ctx.lineWidth = Math.max(1, Math.round(Math.min(width, height) * 0.0012));
    const step = Math.max(36, Math.round(Math.min(width, height) * 0.05));
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    return;
  }

  if (config.backgroundStyle === 'diagonal') {
    ctx.save();
    ctx.strokeStyle = `rgba(${t.r}, ${t.g}, ${t.b}, ${alpha(mode === 'light' ? 0.075 : 0.09)})`;
    ctx.lineWidth = Math.max(1, Math.round(Math.min(width, height) * 0.0012));
    const step = Math.max(22, Math.round(Math.min(width, height) * 0.025));
    for (let start = -height; start < width + height; start += step) {
      ctx.beginPath();
      ctx.moveTo(start, 0);
      ctx.lineTo(start - height, height);
      ctx.stroke();
    }
    ctx.restore();
  }
};

export const drawStyledCanvasCard = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  tokens: CanvasAppearanceTokens,
  options?: {
    fill?: string;
    stroke?: string;
    lineWidth?: number;
  }
): void => {
  ctx.save();
  if (tokens.shadowBlur > 0 && tokens.shadowColor !== 'transparent') {
    ctx.shadowColor = tokens.shadowColor;
    ctx.shadowBlur = tokens.shadowBlur;
    ctx.shadowOffsetY = tokens.shadowOffsetY;
  }
  drawRoundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = options?.fill ?? tokens.surfaceFill;
  ctx.fill();
  ctx.restore();

  const strokeColor = options?.stroke ?? tokens.surfaceStroke;
  if (strokeColor && strokeColor !== 'transparent') {
    ctx.save();
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = options?.lineWidth ?? 1.8;
    ctx.stroke();
    ctx.restore();
  }
};

export const resolveCanvasLogoRadius = (logoShape: LogoShapeId, sizePx: number): number => {
  switch (logoShape) {
    case 'circle':
      return sizePx / 2;
    case 'rounded':
      return Math.round(sizePx * 0.22);
    case 'square':
      return Math.max(4, Math.round(sizePx * 0.05));
    case 'frameless':
      return 0;
  }
};
