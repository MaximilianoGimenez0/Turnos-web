import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const qrData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'qr-matrix.json'), 'utf8')
);

export function buildQrSvg({
  background = '#ffffff',
  moduleColor = '#231c19',
  finderAccentColor = '#9e4f5e',
  label = 'QR Demo TurnosWeb',
} = {}) {
  const n = qrData.size;
  const rows = qrData.rows;

  const isFinderCenter = (r, c) =>
    (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
    (r >= 2 && r <= 4 && c >= n - 5 && c <= n - 3) ||
    (r >= n - 5 && r <= n - 3 && c >= 2 && c <= 4);

  const darkRects = [];
  const accentRects = [];

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (rows[r][c] === '1') {
        const rect = `<rect x="${c}" y="${r}" width="1.02" height="1.02"/>`;
        if (isFinderCenter(r, c)) accentRects.push(rect);
        else darkRects.push(rect);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges" role="img" aria-label="${label}">
    <rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="${background}"/>
    <g fill="${moduleColor}">${darkRects.join('')}</g>
    <g fill="${finderAccentColor}">${accentRects.join('')}</g>
  </svg>`;
}
