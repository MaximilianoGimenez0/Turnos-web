import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const qrData = JSON.parse(fs.readFileSync(path.join(__dirname, 'qr-matrix.json'), 'utf8'));

export const BRAND_LINKS = {
  demoUrl: 'https://turnos-web.maxigimenez.com.ar',
  demoHost: 'turnos-web.maxigimenez.com.ar',
  authorName: 'Maximiliano Giménez',
  authorSiteUrl: 'https://maxigimenez.com.ar',
  authorSiteHost: 'maxigimenez.com.ar',
  whatsappDisplay: '+54 9 11 4067-5852',
  whatsappUrl: 'https://wa.me/5491140675852',
};

const BRAND_LOGO_SVG = `
<svg class="brand-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">
  <path fill="#9e4f5e" fill-opacity="0.14" d="M5.5 23.5a10.5 10.5 0 0 1 10.5-10.5h32a10.5 10.5 0 0 1 10.5 10.5V26h-53v-2.5Z" />
  <rect x="5.5" y="13" width="53" height="46" rx="10.5" fill="none" stroke="#9e4f5e" stroke-width="4.8" stroke-linejoin="round" />
  <path d="M20 5.5v11M44 5.5v11" fill="none" stroke="#9e4f5e" stroke-width="4.8" stroke-linecap="round" />
  <path d="M20.5 41.2l7.8 7.8 15.8-16.2" fill="none" stroke="#9e4f5e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

const MINI_LOGO_SVG = `
<svg width="15" height="15" viewBox="0 0 64 64" fill="none" aria-hidden="true">
  <rect x="6" y="13" width="52" height="45" rx="10" stroke="#9e4f5e" stroke-width="6"/>
  <path d="M20 6v10M44 6v10" stroke="#9e4f5e" stroke-width="6" stroke-linecap="round"/>
  <path d="M20 41l8 8 16-16" stroke="#9e4f5e" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const ICONS = {
  creditCard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
  sparkles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.6L18.5 9.5l-4.7 1.9L12 16l-1.8-4.6L5.5 9.5l4.7-1.9L12 3z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/></svg>`,
  smartphone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  calendarCheck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>`,
  calculator: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
  userCheck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>`,
  palette: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3.3 0 6-2.7 6-6 0-4.9-4.5-8.6-10-8.6z"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  dollar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  trendingUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
};

function buildQrSvg() {
  const n = qrData.size;
  const rows = qrData.rows;
  const isFinderCenter = (r, c) =>
    (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
    (r >= 2 && r <= 4 && c >= n - 5 && c <= n - 3) ||
    (r >= n - 5 && r <= n - 3 && c >= 2 && c <= 4);

  const darkRects = [];
  const roseRects = [];

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (rows[r][c] === '1') {
        const rect = `<rect x="${c}" y="${r}" width="1.02" height="1.02"/>`;
        if (isFinderCenter(r, c)) roseRects.push(rect);
        else darkRects.push(rect);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges" role="img" aria-label="QR Demo TurnosWeb">
    <rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#ffffff"/>
    <g fill="#231c19">${darkRects.join('')}</g>
    <g fill="#9e4f5e">${roseRects.join('')}</g>
  </svg>`;
}

const QR_SVG = buildQrSvg();

function renderFooter({ ctaHeadingHtml }) {
  return `
    <footer class="doc-footer">
      <div class="footer-left">
        <div class="footer-cta-title">${ctaHeadingHtml}</div>
        <div class="footer-contacts">
          <a class="contact-pill whatsapp" href="${BRAND_LINKS.whatsappUrl}">
            ${ICONS.whatsapp}
            <span>WhatsApp: ${BRAND_LINKS.whatsappDisplay}</span>
          </a>
          <a class="contact-pill demo" href="${BRAND_LINKS.demoUrl}">
            ${ICONS.globe}
            <span>${BRAND_LINKS.demoHost}</span>
          </a>
        </div>
        <p class="footer-author">
          Desarrollado por <strong>${BRAND_LINKS.authorName}</strong> ·
          <a href="${BRAND_LINKS.authorSiteUrl}">${BRAND_LINKS.authorSiteHost}</a>
        </p>
      </div>

      <a class="qr-card" href="${BRAND_LINKS.demoUrl}">
        <div class="qr-svg-wrap">${QR_SVG}</div>
        <div class="qr-copy">
          <span class="qr-kicker">Escanear demo en vivo</span>
          <span class="qr-title">Probá la plataforma</span>
          <span class="qr-url">${BRAND_LINKS.demoHost}</span>
        </div>
      </a>
    </footer>`;
}

export function renderFeaturesPage() {
  return `
  <section class="a4-page" aria-label="TurnosWeb - Características">
    <header class="doc-header">
          <div class="brand-lockup">
            ${BRAND_LOGO_SVG}
            <div class="brand-meta">
              <span class="brand-kicker">TurnosWeb · Sistema de Reservas &amp; Agenda Online</span>
              <span class="brand-sub">Estética, belleza &amp; estudios profesionales</span>
            </div>
          </div>
          <div class="header-pill">
            <span class="pill-dot"></span>
            <span>Sincronización en tiempo real</span>
          </div>
        </header>

        <section class="hero-grid">
          <div>
            <h1 class="hero-brand-title">TurnosWeb</h1>
            <p class="hero-tagline">Tu agenda online abierta 24/7, con seña garantizada y cero ausentismo.</p>
            <p class="hero-copy">
              Una web moderna con la estética de tu estudio para que tus clientas elijan servicio,
              día y horario, y aseguren su lugar abonando la seña con Mercado Pago — sin idas y vueltas por WhatsApp.
            </p>
            <div class="hero-pills">
              <span class="soft-pill">${ICONS.creditCard}<span>Seña con Mercado Pago</span></span>
              <span class="soft-pill">${ICONS.sparkles}<span>Marca 100% propia</span></span>
              <span class="soft-pill">${ICONS.smartphone}<span>Sin descargar apps</span></span>
            </div>
          </div>

          <div class="phone-stage">
            <div class="phone-device">
              <div class="phone-topbar">
                <div class="phone-studio">
                  <span class="phone-studio-dot">${MINI_LOGO_SVG}</span>
                  <span>Estudio de Belleza</span>
                </div>
                <span class="phone-live-badge">Agenda en vivo</span>
              </div>

              <div class="phone-dates">
                <div class="phone-date-chip active">
                  <span class="phone-date-day">Hoy</span>
                  <span class="phone-date-num">22 Nov</span>
                </div>
                <div class="phone-date-chip">
                  <span class="phone-date-day">Mañana</span>
                  <span class="phone-date-num">23 Nov</span>
                </div>
                <div class="phone-date-chip">
                  <span class="phone-date-day">Mar</span>
                  <span class="phone-date-num">24 Nov</span>
                </div>
              </div>

              <div class="phone-slot-card">
                <div class="phone-slot-top">
                  <span class="phone-slot-time">10:30 hs</span>
                  <span class="phone-slot-dur">1h 15m</span>
                </div>
                <div class="phone-slot-service">Lifting de pestañas</div>
                <div class="phone-slot-tags">
                  <span class="phone-slot-tag">+ Nutrición keratina</span>
                  <span class="phone-slot-tag">+ Tinte</span>
                </div>
                <div class="phone-slot-footer">
                  <div class="phone-deposit">
                    <span class="phone-deposit-label">Seña online</span>
                    <span class="phone-deposit-val">$5.000</span>
                  </div>
                  <span class="phone-cta">Reservar →</span>
                </div>
              </div>

              <div class="phone-confirm-toast">
                <span class="phone-confirm-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <div class="phone-confirm-text">
                  <span class="phone-confirm-title">Turno confirmado al instante</span>
                  <span class="phone-confirm-sub">Comprobante automático enviado al email</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="steps-box">
          <div class="steps-header">
            <h2 class="section-heading">Turno asegurado <em>en tres simples pasos</em></h2>
            <span class="section-eyebrow" style="margin-bottom:0">Experiencia sin fricción</span>
          </div>
          <div class="steps-grid">
            <div class="step-card">
              <span class="step-num">1</span>
              <div>
                <div class="step-title">Elige horario y servicios</div>
                <p class="step-desc">Disponibilidad real por día, franja horaria, servicios y opcionales con presupuesto estimado.</p>
              </div>
            </div>
            <div class="step-card">
              <span class="step-num">2</span>
              <div>
                <div class="step-title">Abona la seña online</div>
                <p class="step-desc">Bloqueo inmediato por 15 minutos mientras paga con Mercado Pago (débito, crédito o saldo).</p>
              </div>
            </div>
            <div class="step-card">
              <span class="step-num">3</span>
              <div>
                <div class="step-title">Confirmación automática</div>
                <p class="step-desc">Comprobante por email para tu clienta y para vos, con el turno agendado al segundo.</p>
              </div>
            </div>
          </div>
        </section>

        <section class="columns-grid">
          <article class="feature-panel">
            <div class="panel-header">
              <div class="panel-title-wrap">
                <span class="panel-kicker">Sitio público con tu marca</span>
                <h2 class="panel-title">Para tus clientas</h2>
              </div>
              <span class="panel-icon-badge">${ICONS.sparkles}</span>
            </div>
            <ul class="feature-list">
              <li class="feature-item">
                <span class="feature-icon">${ICONS.calendar}</span>
                <p class="feature-text"><strong>Agenda reactiva 24/7:</strong> buscador inteligente, filtros por día, mañana/tarde y vista rápida o en fichas.</p>
              </li>
              <li class="feature-item">
                <span class="feature-icon">${ICONS.calculator}</span>
                <p class="feature-text"><strong>Catálogo y calculadora de precios:</strong> combinan servicios y extras para ver duración y total estimado antes de reservar.</p>
              </li>
              <li class="feature-item">
                <span class="feature-icon">${ICONS.image}</span>
                <p class="feature-text"><strong>Portfolio y sección "Sobre mí":</strong> mostrá tus mejores trabajos, ubicación, Instagram y acceso directo a tu WhatsApp.</p>
              </li>
              <li class="feature-item">
                <span class="feature-icon">${ICONS.lock}</span>
                <p class="feature-text"><strong>Reserva segura sin cuentas:</strong> bloqueo temporal de 15 min para evitar dobles pagos y cobro protegido vía Mercado Pago.</p>
              </li>
              <li class="feature-item">
                <span class="feature-icon">${ICONS.mail}</span>
                <p class="feature-text"><strong>Comprobante claro por email:</strong> fecha, horario, servicios elegidos, seña abonada y saldo restante a pagar en el local.</p>
              </li>
            </ul>
          </article>

          <article class="feature-panel admin-panel">
            <div class="panel-header">
              <div class="panel-title-wrap">
                <span class="panel-kicker">Panel privado de gestión</span>
                <h2 class="panel-title">Para tu estudio</h2>
              </div>
              <span class="panel-icon-badge">${ICONS.calendarCheck}</span>
            </div>
            <ul class="feature-list">
              <li class="feature-item">
                <span class="feature-icon">${ICONS.clock}</span>
                <p class="feature-text"><strong>Agenda diaria cronológica:</strong> vista por día, semana o mes con duración real, saldo pendiente y contacto rápido a WhatsApp.</p>
              </li>
              <li class="feature-item">
                <span class="feature-icon">${ICONS.layers}</span>
                <p class="feature-text"><strong>Carga masiva de turnos:</strong> generá múltiples fechas y franjas en segundos con detección automática de horarios repetidos.</p>
              </li>
              <li class="feature-item">
                <span class="feature-icon">${ICONS.shield}</span>
                <p class="feature-text"><strong>Motor anti-solapamiento:</strong> calcula duraciones combinadas, bloquea horarios en conflicto y los reactiva solos si alguien cancela.</p>
              </li>
              <li class="feature-item">
                <span class="feature-icon">${ICONS.userCheck}</span>
                <p class="feature-text"><strong>Control manual total:</strong> asigná clientas que te escriben por WhatsApp, liberá bloqueos o cancelá turnos en un clic.</p>
              </li>
              <li class="feature-item">
                <span class="feature-icon">${ICONS.chart}</span>
                <p class="feature-text"><strong>Métricas y autogestión:</strong> ingresos por señas del mes, gráficos de actividad y edición libre de logo, fotos, servicios y precios.</p>
              </li>
            </ul>
          </article>
        </section>

        <section class="highlights-strip">
          <div class="highlight-chip">${ICONS.palette}<span>Estética de tu estudio</span></div>
          <div class="highlight-chip">${ICONS.moon}<span>Modo claro y oscuro</span></div>
          <div class="highlight-chip">${ICONS.smartphone}<span>100% móvil y PC</span></div>
          <div class="highlight-chip">${ICONS.zap}<span>Actualización en vivo</span></div>
        </section>

        ${renderFooter({
          ctaHeadingHtml: 'Probá la experiencia real <em>y consultame por WhatsApp</em>',
        })}
  </section>`;
}

export function renderPricingPage() {
  return `
  <section class="a4-page" aria-label="TurnosWeb - Plan, Precio y Capacidad">
    <header class="doc-header">
          <div class="brand-lockup">
            ${BRAND_LOGO_SVG}
            <div class="brand-meta">
              <span class="brand-kicker">TurnosWeb · Propuesta Comercial &amp; Plan Integral</span>
              <span class="brand-sub">Estética, belleza &amp; estudios profesionales</span>
            </div>
          </div>
          <div class="header-pill">
            <span class="pill-dot"></span>
            <span>Plan integral · Todo incluido</span>
          </div>
        </header>

        <section class="p2-hero">
          <h1 class="p2-title">Ordená tu agenda y cuidá tu tiempo: <em>un sistema que se paga solo evitando ausencias.</em></h1>
          <p class="p2-subtitle">
            Todo lo que tu estudio necesita para automatizar reservas, cobrar señas con Mercado Pago y ofrecer
            una experiencia impecable — en un plan simple, claro y listo para usar desde el primer día.
          </p>
        </section>

        <section>
          <span class="section-eyebrow">Problemas reales que elimina desde el día 1</span>
          <div class="problems-grid">
            <article class="problem-card">
              <span class="problem-badge">${ICONS.shield}</span>
              <div>
                <h3 class="problem-pain">Ausencias y cancelaciones a último momento</h3>
                <p class="problem-solution">La seña previa por Mercado Pago asegura el compromiso de cada clienta y protege el valor de tu horario.</p>
              </div>
            </article>

            <article class="problem-card">
              <span class="problem-badge">${ICONS.clock}</span>
              <div>
                <h3 class="problem-pain">Horas perdidas respondiendo "¿tenés turno?"</h3>
                <p class="problem-solution">Un único link en tu bio de Instagram o WhatsApp muestra tus horarios libres actualizados al segundo, las 24 h.</p>
              </div>
            </article>

            <article class="problem-card">
              <span class="problem-badge">${ICONS.calendarCheck}</span>
              <div>
                <h3 class="problem-pain">Superposición de horarios y errores de cuaderno</h3>
                <p class="problem-solution">El motor de duraciones bloquea automáticamente horarios en conflicto e impide dobles reservas simultáneas.</p>
              </div>
            </article>

            <article class="problem-card">
              <span class="problem-badge">${ICONS.dollar}</span>
              <div>
                <h3 class="problem-pain">Confusión con precios, extras y saldo pendiente</h3>
                <p class="problem-solution">Cada clienta ve el estimado al reservar y recibe por email exactamente cuánto señó y cuánto abona en el estudio.</p>
              </div>
            </article>

            <article class="problem-card">
              <span class="problem-badge">${ICONS.trendingUp}</span>
              <div>
                <h3 class="problem-pain">Falta de control sobre señas e ingresos del mes</h3>
                <p class="problem-solution">Consultá tus señas cobradas del mes, historial de comprobantes de Mercado Pago y gráficos de evolución en un clic.</p>
              </div>
            </article>

            <article class="problem-card">
              <span class="problem-badge">${ICONS.sparkles}</span>
              <div>
                <h3 class="problem-pain">Depender de apps genéricas que opacan tu marca</h3>
                <p class="problem-solution">Tu propia web con tu logo, tus fotos de trabajos y correos elegantes diseñados con la identidad de tu estudio.</p>
              </div>
            </article>
          </div>
        </section>

        <section class="pricing-wrapper">
          <div class="pricing-columns">
            <div class="price-col">
              <span class="price-badge monthly">Abono mensual · Todo incluido</span>
              <div class="price-figure-row">
                <span class="price-currency">$</span>
                <span class="price-amount">18.000</span>
                <span class="price-period">/ mes</span>
              </div>
              <ul class="price-list">
                <li><span class="price-check">${ICONS.check}</span><span>Sitio web activo 24/7, hosting, base de datos y almacenamiento de imágenes en la nube.</span></li>
                <li><span class="price-check">${ICONS.check}</span><span>Integración directa con tu cuenta de Mercado Pago (tarjetas, débito y dinero en cuenta).</span></li>
                <li><span class="price-check">${ICONS.check}</span><span>Envío automático de comprobantes de reserva por email para tus clientas y tu estudio.</span></li>
                <li><span class="price-check">${ICONS.check}</span><span>Mantenimiento automático de agenda, actualizaciones y soporte técnico incluidos.</span></li>
              </ul>
            </div>

            <div class="price-col setup-col">
              <span class="price-badge setup">Alta del servicio · Una sola vez</span>
              <div class="price-figure-row">
                <span class="price-currency">$</span>
                <span class="price-amount">25.000</span>
                <span class="price-period">pago único</span>
              </div>
              <ul class="price-list">
                <li><span class="price-check">${ICONS.check}</span><span>Puesta en marcha completa llave en mano lista para recibir reservas online.</span></li>
                <li><span class="price-check">${ICONS.check}</span><span>Personalización con tu nombre comercial, logo, foto de portada, bio y redes.</span></li>
                <li><span class="price-check">${ICONS.check}</span><span>Vinculación de tu Mercado Pago y carga inicial de tus servicios, precios y extras.</span></li>
                <li><span class="price-check">${ICONS.check}</span><span>Acompañamiento inicial para que domines tu panel administrador en minutos.</span></li>
              </ul>
            </div>
          </div>

          <div class="roi-banner">
            ${ICONS.sparkles}
            <span>Con evitar apenas <strong>1 o 2 ausencias al mes</strong>, el abono mensual ya se paga solo y recuperás horas libres todas las semanas.</span>
          </div>
        </section>

        <section class="capacity-section">
          <div class="capacity-header">
            <span class="section-eyebrow" style="margin-bottom:0">Capacidad estimada incluida en el plan</span>
            <span class="capacity-note-inline">Margen holgado para profesionales independientes y estudios de alta demanda</span>
          </div>

          <div class="capacity-grid">
            <article class="capacity-card">
              <div class="capacity-top">
                <span class="capacity-num"><span class="capacity-prefix">Hasta</span>1.200</span>
                <span class="capacity-icon">${ICONS.calendarCheck}</span>
              </div>
              <div class="capacity-label">Turnos confirmados / mes</div>
              <p class="capacity-desc">Hasta ~40 turnos por día con cobro de seña, control anti-conflictos y doble comprobante por email.</p>
            </article>

            <article class="capacity-card">
              <div class="capacity-top">
                <span class="capacity-num">+30.000</span>
                <span class="capacity-icon">${ICONS.users}</span>
              </div>
              <div class="capacity-label">Visitas mensuales a tu web</div>
              <p class="capacity-desc">Clientas entrando desde Instagram, WhatsApp y Google a ver tu agenda, precios y portfolio sin cortes.</p>
            </article>

            <article class="capacity-card">
              <div class="capacity-top">
                <span class="capacity-num">24/7</span>
                <span class="capacity-icon">${ICONS.zap}</span>
              </div>
              <div class="capacity-label">Reservas en simultáneo</div>
              <p class="capacity-desc">Varias clientas reservando a la vez con bloqueo concurrente de 15 min y sincronización en tiempo real.</p>
            </article>
          </div>
        </section>

        ${renderFooter({
          ctaHeadingHtml: '¿Querés tu agenda online <em>funcionando esta semana?</em>',
        })}
  </section>`;
}

export function wrapDocument({ title, bodyHtml }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1240, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Plus+Jakarta+Sans:wght@400;500;600&family=Inter:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
  <link rel="stylesheet" href="./shared.css" />
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}
