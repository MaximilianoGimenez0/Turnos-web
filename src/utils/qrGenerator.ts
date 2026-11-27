import QRCode from 'qrcode';

export interface QrMatrix {
  size: number;
  modules: boolean[][];
}

export const generateQrMatrix = (text: string): QrMatrix => {
  const payload = String(text || '').trim() || 'https://turneado.app';
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const modules: boolean[][] = [];

  for (let r = 0; r < size; r += 1) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c += 1) {
      row.push(Boolean(data[r * size + c]));
    }
    modules.push(row);
  }

  return { size, modules };
};

export interface QrSvgOptions {
  background?: string;
  moduleColor?: string;
  finderAccentColor?: string;
  label?: string;
  quietZone?: number;
}

const isFinderModule = (r: number, c: number, size: number): boolean =>
  (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
  (r >= 2 && r <= 4 && c >= size - 5 && c <= size - 3) ||
  (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4);

export const buildQrSvg = (text: string, options: QrSvgOptions = {}): string => {
  const {
    background = '#ffffff',
    moduleColor = '#231c19',
    finderAccentColor = '#9e4f5e',
    label = 'Código QR',
    quietZone = 2,
  } = options;

  const { size, modules } = generateQrMatrix(text);
  const darkRects: string[] = [];
  const accentRects: string[] = [];

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!modules[r][c]) continue;
      const rect = `<rect x="${c}" y="${r}" width="1.02" height="1.02"/>`;
      if (isFinderModule(r, c, size)) {
        accentRects.push(rect);
      } else {
        darkRects.push(rect);
      }
    }
  }

  const total = size + quietZone * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-quietZone} ${-quietZone} ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="${label}"><rect x="${-quietZone}" y="${-quietZone}" width="${total}" height="${total}" fill="${background}"/><g fill="${moduleColor}">${darkRects.join('')}</g><g fill="${finderAccentColor}">${accentRects.join('')}</g></svg>`;
};

export interface QrCanvasDrawOptions {
  x: number;
  y: number;
  sizePx: number;
  background?: string;
  moduleColor?: string;
  finderAccentColor?: string;
  quietZone?: number;
  radiusPx?: number;
}

export const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

export const drawQrToCanvas = (
  ctx: CanvasRenderingContext2D,
  text: string,
  options: QrCanvasDrawOptions
): void => {
  const {
    x,
    y,
    sizePx,
    background = '#ffffff',
    moduleColor = '#231c19',
    finderAccentColor = '#9e4f5e',
    quietZone = 2,
    radiusPx = 12,
  } = options;

  const { size, modules } = generateQrMatrix(text);
  const totalModules = size + quietZone * 2;
  const cellSize = sizePx / totalModules;

  ctx.save();
  drawRoundedRect(ctx, x, y, sizePx, sizePx, radiusPx);
  ctx.fillStyle = background;
  ctx.fill();

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!modules[r][c]) continue;
      ctx.fillStyle = isFinderModule(r, c, size) ? finderAccentColor : moduleColor;
      const mx = x + (c + quietZone) * cellSize;
      const my = y + (r + quietZone) * cellSize;
      ctx.fillRect(mx, my, cellSize + 0.35, cellSize + 0.35);
    }
  }
  ctx.restore();
};

export const loadImageSafe = (src: string, timeoutMs = 4500): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (!src || typeof Image === 'undefined') {
      resolve(null);
      return;
    }

    let settled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(img);
      }
    };

    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(null);
      }
    };

    img.src = src;
  });

export const downloadCanvasAsPng = async (
  canvas: HTMLCanvasElement,
  filename: string
): Promise<void> => {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), 'image/png')
  );

  if (!blob) {
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
