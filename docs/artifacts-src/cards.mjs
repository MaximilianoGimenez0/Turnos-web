import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND_LINKS } from './pages.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const qrData = JSON.parse(fs.readFileSync(path.join(__dirname, 'qr-matrix.json'), 'utf8'));

const CARD_BRAND_ISOTYPE_SVG = `
<svg class="front-logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" aria-hidden="true">
  <path fill="#8F3D4B" fill-opacity="0.16" d="M10 24a8 8 0 0 1 8-8h28a8 8 0 0 1 8 8v3H10v-3Z" />
  <g stroke="#8F3D4B" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="10" y="16" width="44" height="39" rx="8" />
    <path d="M21 9.5V16M43 9.5V16" />
    <path d="M22.5 39.5L28.5 45.5L41.5 32.5" />
  </g>
</svg>`;

const CHECK_ICON_SVG = `
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="20 6 9 17 4 12" />
</svg>`;

function buildEditorialQrSvg() {
  const n = qrData.size;
  const rows = qrData.rows;
  const isFinderCenter = (r, c) =>
    (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
    (r >= 2 && r <= 4 && c >= n - 5 && c <= n - 3) ||
    (r >= n - 5 && r <= n - 3 && c >= 2 && c <= 4);

  const darkRects = [];
  const mauveRects = [];

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (rows[r][c] === '1') {
        const rect = `<rect x="${c}" y="${r}" width="1.02" height="1.02"/>`;
        if (isFinderCenter(r, c)) mauveRects.push(rect);
        else darkRects.push(rect);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges" role="img" aria-label="QR Demo TurnosWeb">
    <rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#FCFBF9"/>
    <g fill="#241F1E">${darkRects.join('')}</g>
    <g fill="#8F3D4B">${mauveRects.join('')}</g>
  </svg>`;
}

const EDITORIAL_QR_SVG = buildEditorialQrSvg();

export function renderCardFront() {
  return `
  <main class="card-front" aria-label="TurnosWeb - Frente de tarjeta">
    <header class="front-header">
      <div class="front-brand">
        ${CARD_BRAND_ISOTYPE_SVG}
        <div class="front-brand-meta">
          <span class="front-brand-kicker">TurnosWeb · Sistema de Reservas &amp; Agenda Online</span>
          <span class="front-brand-sub">Estética, belleza &amp; estudios profesionales</span>
        </div>
      </div>

      <div class="front-live-indicator">
        <span class="live-dot-ring" aria-hidden="true">
          <span class="live-dot-core"></span>
        </span>
        <span class="live-indicator-text">Sincronización en tiempo real</span>
      </div>
    </header>

    <section class="front-main">
      <div class="front-copy-col">
        <h1 class="front-title">TurnosWeb</h1>
        <p class="front-subtitle">Reservas online con seña garantizada y cero ausentismo.</p>
        <p class="front-description">
          Agenda reactiva en vivo, cobro automatizado con Mercado Pago Checkout Pro,
          bloqueo concurrente de 15 minutos y motor inteligente anti-solapamiento.
        </p>

        <div class="front-features-grid">
          <span class="front-feature-chip">
            <span class="feature-dot" aria-hidden="true"></span>
            <span>Seña con Mercado Pago</span>
          </span>
          <span class="front-feature-chip">
            <span class="feature-dot" aria-hidden="true"></span>
            <span>Motor Anti-Conflictos</span>
          </span>
          <span class="front-feature-chip">
            <span class="feature-dot" aria-hidden="true"></span>
            <span>Comprobantes por Email</span>
          </span>
          <span class="front-feature-chip">
            <span class="feature-dot" aria-hidden="true"></span>
            <span>Backoffice &amp; Métricas</span>
          </span>
        </div>
      </div>

      <aside class="front-visual-col" aria-label="Vista previa de turno confirmado">
        <div class="preview-card">
          <div class="preview-top-row">
            <span class="preview-studio-label">
              <span class="preview-studio-dot" aria-hidden="true"></span>
              <span>Agenda en vivo</span>
            </span>
            <span class="preview-month-tag">Noviembre</span>
          </div>

          <div class="preview-days-strip">
            <div class="preview-day">
              <span class="preview-day-wd">Lun</span>
              <span class="preview-day-num">23</span>
            </div>
            <div class="preview-day preview-day-active">
              <span class="preview-day-wd">Mar</span>
              <span class="preview-day-num">24</span>
            </div>
            <div class="preview-day">
              <span class="preview-day-wd">Mié</span>
              <span class="preview-day-num">25</span>
            </div>
          </div>

          <div class="preview-slot-surface">
            <div class="preview-slot-top">
              <span class="preview-slot-time">10:30 hs</span>
              <span class="preview-slot-duration">1h 15m</span>
            </div>

            <div class="preview-slot-service">Lifting de pestañas</div>

            <div class="preview-slot-extras">
              <span class="preview-extra-pill">+ Nutrición keratina</span>
              <span class="preview-extra-pill">+ Tinte</span>
            </div>

            <div class="preview-slot-deposit">
              <span class="preview-deposit-label">Seña online asegurada</span>
              <span class="preview-deposit-amount">$5.000</span>
            </div>
          </div>

          <div class="preview-confirmed-bar">
            <span class="preview-confirmed-icon">${CHECK_ICON_SVG}</span>
            <div class="preview-confirmed-copy">
              <span class="preview-confirmed-title">Turno confirmado al instante</span>
              <span class="preview-confirmed-sub">Comprobante enviado por email</span>
            </div>
          </div>
        </div>
      </aside>
    </section>

    <footer class="front-footer">
      <div class="footer-col">
        <span class="footer-label">Plataforma en vivo</span>
        <span class="footer-value footer-value-accent">${BRAND_LINKS.demoHost}</span>
      </div>
      <div class="footer-col footer-col-right">
        <span class="footer-label">Autor</span>
        <span class="footer-value">${BRAND_LINKS.authorName}</span>
      </div>
    </footer>
  </main>`;
}

export function renderCardBack() {
  return `
  <main class="card-back" aria-label="TurnosWeb - Dorso de tarjeta">
    <section class="back-left">
      <div class="back-top-group">
        <span class="back-eyebrow">TurnosWeb · Experiencia de reserva</span>
        <h1 class="back-title">Turno asegurado</h1>
        <p class="back-subtitle">en tres simples pasos.</p>

        <ol class="back-steps">
          <li class="back-step">
            <span class="step-circle" aria-hidden="true">1</span>
            <div class="step-copy">
              <span class="step-title">Elegí tu horario y servicios</span>
              <span class="step-desc">Disponibilidad real por fecha, franja y adicionales.</span>
            </div>
          </li>
          <li class="back-step">
            <span class="step-circle" aria-hidden="true">2</span>
            <div class="step-copy">
              <span class="step-title">Aboná la seña online</span>
              <span class="step-desc">Bloqueo inmediato por 15 min vía Mercado Pago.</span>
            </div>
          </li>
          <li class="back-step">
            <span class="step-circle" aria-hidden="true">3</span>
            <div class="step-copy">
              <span class="step-title">Confirmación instantánea</span>
              <span class="step-desc">Comprobante automático al correo y agenda actualizada.</span>
            </div>
          </li>
        </ol>
      </div>

      <p class="back-footer">
        Desarrollado por <strong>${BRAND_LINKS.authorName}</strong> ·
        <span class="back-footer-host">${BRAND_LINKS.authorSiteHost}</span>
      </p>
    </section>

    <section class="back-right" aria-label="Código QR de demo en vivo">
      <div class="qr-editorial-card">
        <div class="qr-box">${EDITORIAL_QR_SVG}</div>
        <div class="qr-caption">
          <span class="qr-caption-kicker">Escanear demo en vivo</span>
          <span class="qr-caption-url">${BRAND_LINKS.demoHost}</span>
        </div>
      </div>
    </section>
  </main>`;
}

export function wrapCardDocument({ title, bodyHtml }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1600, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Plus+Jakarta+Sans:wght@400;500;600&family=Inter:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
  <link rel="stylesheet" href="./cards.css" />
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}
