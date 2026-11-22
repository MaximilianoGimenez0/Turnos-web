import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderFeaturesPage, renderPricingPage, wrapDocument } from './pages.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const outDir = path.join(repoRoot, 'public', 'artifacts');

const CHROME_CANDIDATES = [
  path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
  path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
  path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft\\Edge\\Application\\msedge.exe'),
];

const chromePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chromePath) {
  throw new Error('No se encontró Google Chrome ni Microsoft Edge para renderizar los artefactos.');
}

fs.mkdirSync(outDir, { recursive: true });

const docs = [
  {
    name: 'turnosweb-a4-caracteristicas',
    title: 'TurnosWeb — Características y Experiencia de Reserva',
    html: renderFeaturesPage(),
    makePng: true,
  },
  {
    name: 'turnosweb-a4-plan-y-precios',
    title: 'TurnosWeb — Plan, Precios y Capacidad',
    html: renderPricingPage(),
    makePng: true,
  },
  {
    name: 'turnosweb-dossier-comercial',
    title: 'TurnosWeb — Dossier Comercial Completo',
    html: `${renderFeaturesPage()}\n${renderPricingPage()}`,
    makePng: false,
  },
];

function readPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function countPdfPages(filePath) {
  const raw = fs.readFileSync(filePath, 'latin1');
  const matches = raw.match(/\/Type\s*\/Page\b(?!s)/g);
  return matches ? matches.length : 0;
}

for (const item of docs) {
  const htmlPath = path.join(__dirname, `${item.name}.html`);
  fs.writeFileSync(htmlPath, wrapDocument({ title: item.title, bodyHtml: item.html }), 'utf8');
  const fileUrl = pathToFileURL(htmlPath).href;

  if (item.makePng) {
    const pngPath = path.join(outDir, `${item.name}.png`);
    execFileSync(
      chromePath,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--run-all-compositor-stages-before-draw',
        '--virtual-time-budget=8000',
        '--force-device-scale-factor=2',
        '--window-size=1240,1754',
        `--screenshot=${pngPath}`,
        fileUrl,
      ],
      { stdio: 'pipe' }
    );
    const dims = readPngDimensions(pngPath);
    const kb = Math.round(fs.statSync(pngPath).size / 1024);
    console.log(`PNG  ${path.relative(repoRoot, pngPath)} -> ${dims.width}x${dims.height} px (${kb} KB)`);
  }

  const pdfPath = path.join(outDir, `${item.name}.pdf`);
  execFileSync(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-pdf-header-footer',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=8000',
      `--print-to-pdf=${pdfPath}`,
      fileUrl,
    ],
    { stdio: 'pipe' }
  );
  const pages = countPdfPages(pdfPath);
  const kb = Math.round(fs.statSync(pdfPath).size / 1024);
  console.log(`PDF  ${path.relative(repoRoot, pdfPath)} -> ${pages} page(s) (${kb} KB)`);
}
