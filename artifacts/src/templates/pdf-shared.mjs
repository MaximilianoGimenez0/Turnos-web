import { BRAND_CONFIG } from '../config/brand.mjs';
import { ICONS, renderBrandIsotypeSvg } from '../config/icons.mjs';
import { buildQrSvg } from '../config/qr.mjs';
import { PDF_DOSSIER_COPY } from '../data/pdf-dossier.copy.mjs';

const A4_BRAND_LOGO_SVG = renderBrandIsotypeSvg({
  className: 'brand-icon',
  strokeColor: '#9e4f5e',
  fillOpacity: '0.15',
  strokeWidth: '4.4',
});

const A4_QR_SVG = buildQrSvg({
  background: '#ffffff',
  moduleColor: '#231c19',
  finderAccentColor: '#9e4f5e',
  label: 'QR Demo Turneado',
});

export function renderA4Header({ kicker, pill }) {
  return `
    <header class="doc-header">
      <div class="brand-lockup">
        ${A4_BRAND_LOGO_SVG}
        <div class="brand-meta">
          <span class="brand-kicker">${kicker}</span>
          <span class="brand-sub">${PDF_DOSSIER_COPY.shared.brandSub}</span>
        </div>
      </div>
      <div class="header-pill">
        <span class="pill-dot"></span>
        <span>${pill}</span>
      </div>
    </header>`;
}

export function renderA4Footer({ ctaHeadingHtml }) {
  return `
    <footer class="doc-footer">
      <div class="footer-left">
        <div class="footer-cta-title">${ctaHeadingHtml}</div>
        <div class="footer-contacts">
          <a class="contact-pill whatsapp" href="${BRAND_CONFIG.whatsappUrl}">
            ${ICONS.whatsapp}
            <span>WhatsApp: ${BRAND_CONFIG.whatsappDisplay}</span>
          </a>
          <a class="contact-pill demo" href="${BRAND_CONFIG.demoUrl}">
            ${ICONS.globe}
            <span>${BRAND_CONFIG.demoHost}</span>
          </a>
        </div>
        <p class="footer-author">
          Desarrollado por <strong>${BRAND_CONFIG.authorName}</strong> ·
          <a href="${BRAND_CONFIG.authorSiteUrl}">${BRAND_CONFIG.authorSiteHost}</a>
        </p>
      </div>

      <a class="qr-card" href="${BRAND_CONFIG.demoUrl}">
        <div class="qr-svg-wrap">${A4_QR_SVG}</div>
        <div class="qr-copy">
          <span class="qr-kicker">${PDF_DOSSIER_COPY.shared.qrKicker}</span>
          <span class="qr-title">${PDF_DOSSIER_COPY.shared.qrTitle}</span>
          <span class="qr-url">${BRAND_CONFIG.demoHost}</span>
        </div>
      </a>
    </footer>`;
}
