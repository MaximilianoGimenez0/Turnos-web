import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { wrapA4Document, wrapCardDocument } from './templates/layouts.mjs';
import { renderCardFront } from './templates/business-card-front.mjs';
import { renderCardBack } from './templates/business-card-back.mjs';
import { renderPdfPage1QuickView } from './templates/pdf-page-1-quick-view.mjs';
import { renderPdfPage2Details } from './templates/pdf-page-2-details.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactsRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(artifactsRoot, '..');
const tmpDir = path.join(artifactsRoot, '.tmp');

const publicArtifactsDir = path.join(repoRoot, 'public', 'artifacts');
const cardsOutDir = path.join(publicArtifactsDir, 'business-cards');
const pdfOutDir = path.join(publicArtifactsDir, 'pdf');
const imagesOutDir = path.join(publicArtifactsDir, 'images');

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith('--only='))?.split('=')[1] || 'all';
const keepHtml = args.includes('--keep-html');

if (!['all', 'cards', 'pdf'].includes(onlyArg)) {
  throw new Error(`Opción inválida --only=${onlyArg}. Usa all, cards o pdf.`);
}

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
  path.join(
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
    'Google\\Chrome\\Application\\chrome.exe'
  ),
  path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft\\Edge\\Application\\msedge.exe'),
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chromePath) {
  throw new Error('No se encontró Google Chrome ni Microsoft Edge para renderizar los artefactos.');
}

const BASE_CHROME_FLAGS = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=8000',
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

function renderPng({ htmlPath, outPath, width, height, scale = 2 }) {
  execFileSync(
    chromePath,
    [
      ...BASE_CHROME_FLAGS,
      `--force-device-scale-factor=${scale}`,
      `--window-size=${width},${height}`,
      `--screenshot=${outPath}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: 'pipe' }
  );
  const dims = readPngDimensions(outPath);
  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`PNG  ${path.relative(repoRoot, outPath)} -> ${dims.width}x${dims.height} px (${kb} KB)`);
}

function renderPdf({ htmlPath, outPath }) {
  execFileSync(
    chromePath,
    [
      ...BASE_CHROME_FLAGS,
      '--no-pdf-header-footer',
      `--print-to-pdf=${outPath}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: 'pipe' }
  );
  const pages = countPdfPages(outPath);
  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`PDF  ${path.relative(repoRoot, outPath)} -> ${pages} page(s) (${kb} KB)`);
}

fs.mkdirSync(tmpDir, { recursive: true });

try {
  if (onlyArg === 'all' || onlyArg === 'pdf') {
    fs.mkdirSync(pdfOutDir, { recursive: true });
    fs.mkdirSync(imagesOutDir, { recursive: true });

    const page1Html = renderPdfPage1QuickView();
    const page2Html = renderPdfPage2Details();

    const pdfJobs = [
      {
        name: 'turneado-page-1-quick-view',
        title: 'Turneado — Quick View y Experiencia de Reserva',
        bodyHtml: page1Html,
        makePng: true,
      },
      {
        name: 'turneado-page-2-details',
        title: 'Turneado — Propuesta Comercial, Plan y Detalles',
        bodyHtml: page2Html,
        makePng: true,
      },
      {
        name: 'turneado-dossier-comercial',
        title: 'Turneado — Dossier Comercial Completo',
        bodyHtml: `${page1Html}\n${page2Html}`,
        makePng: false,
      },
    ];

    for (const job of pdfJobs) {
      const htmlPath = path.join(tmpDir, `${job.name}.html`);
      fs.writeFileSync(htmlPath, wrapA4Document({ title: job.title, bodyHtml: job.bodyHtml }), 'utf8');

      if (job.makePng) {
        renderPng({
          htmlPath,
          outPath: path.join(imagesOutDir, `${job.name}.png`),
          width: 1240,
          height: 1754,
        });
      }

      renderPdf({
        htmlPath,
        outPath: path.join(pdfOutDir, `${job.name}.pdf`),
      });
    }
  }

  if (onlyArg === 'all' || onlyArg === 'cards') {
    fs.mkdirSync(cardsOutDir, { recursive: true });

    const frontHtml = renderCardFront();
    const backHtml = renderCardBack();

    const cardPngJobs = [
      {
        name: 'turneado-card-front',
        title: 'Turneado — Tarjeta de Presentación (Frente)',
        bodyHtml: frontHtml,
      },
      {
        name: 'turneado-card-back',
        title: 'Turneado — Tarjeta de Presentación (Dorso)',
        bodyHtml: backHtml,
      },
    ];

    for (const card of cardPngJobs) {
      const htmlPath = path.join(tmpDir, `${card.name}.html`);
      fs.writeFileSync(
        htmlPath,
        wrapCardDocument({ title: card.title, bodyHtml: card.bodyHtml, singleCard: true }),
        'utf8'
      );
      renderPng({
        htmlPath,
        outPath: path.join(cardsOutDir, `${card.name}.png`),
        width: 1600,
        height: 900,
      });
    }

    const printHtmlPath = path.join(tmpDir, 'turneado-card-print.html');
    fs.writeFileSync(
      printHtmlPath,
      wrapCardDocument({
        title: 'Turneado — Tarjeta de Presentación (Frente y Dorso)',
        bodyHtml: `${frontHtml}\n${backHtml}`,
        singleCard: false,
      }),
      'utf8'
    );
    renderPdf({
      htmlPath: printHtmlPath,
      outPath: path.join(cardsOutDir, 'turneado-card-print.pdf'),
    });
  }
} finally {
  if (!keepHtml && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
