import { BRAND_CONFIG } from '../config/brand.mjs';
import { buildQrSvg } from '../config/qr.mjs';
import { BUSINESS_CARD_COPY } from '../data/business-card.copy.mjs';

const EDITORIAL_QR_SVG = buildQrSvg({
  background: '#fcfbf9',
  moduleColor: '#231c19',
  finderAccentColor: '#843c4a',
  label: 'QR Demo Turneado',
});

export function renderCardBack() {
  const copy = BUSINESS_CARD_COPY.back;

  const stepsHtml = copy.steps
    .map(
      (step) => `
          <li class="back-step">
            <span class="step-circle" aria-hidden="true">${step.num}</span>
            <div class="step-copy">
              <span class="step-title">${step.title}</span>
              <span class="step-desc">${step.desc}</span>
            </div>
          </li>`
    )
    .join('');

  return `
  <main class="card-face card-back" aria-label="${copy.ariaLabel}">
    <section class="back-left">
      <div class="back-top-group">
        <span class="back-eyebrow">${copy.eyebrow}</span>
        <h1 class="back-title">${copy.title}</h1>
        <p class="back-subtitle">${copy.subtitle}</p>

        <ol class="back-steps">${stepsHtml}
        </ol>
      </div>

      <p class="back-footer">
        <span>Desarrollado por <strong>${BRAND_CONFIG.authorName}</strong></span>
        <span class="back-footer-sep" aria-hidden="true">·</span>
        <span class="back-footer-host">${BRAND_CONFIG.authorSiteHost}</span>
        <span class="back-footer-sep" aria-hidden="true">·</span>
        <strong>${BRAND_CONFIG.whatsappDisplay}</strong>
      </p>
    </section>

    <section class="back-right" aria-label="${copy.qr.ariaLabel}">
      <div class="qr-editorial-card">
        <div class="qr-box">${EDITORIAL_QR_SVG}</div>
        <div class="qr-caption">
          <span class="qr-caption-kicker">${copy.qr.kicker}</span>
          <span class="qr-caption-url">${BRAND_CONFIG.demoHost}</span>
        </div>
      </div>
    </section>
  </main>`;
}
