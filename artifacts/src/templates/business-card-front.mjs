import { BRAND_CONFIG } from '../config/brand.mjs';
import { CHECK_ICON_CARD_SVG, renderBrandIsotypeSvg } from '../config/icons.mjs';
import { BUSINESS_CARD_COPY } from '../data/business-card.copy.mjs';

const CARD_BRAND_ISOTYPE_SVG = renderBrandIsotypeSvg({
  className: 'front-logo-svg',
  strokeColor: '#843c4a',
  fillOpacity: '0.16',
  strokeWidth: '4.2',
});

export function renderCardFront() {
  const copy = BUSINESS_CARD_COPY.front;

  const featureChipsHtml = copy.hero.features
    .map(
      (label) => `
          <span class="front-feature-chip">
            <span class="feature-dot" aria-hidden="true"></span>
            <span>${label}</span>
          </span>`
    )
    .join('');

  const daysHtml = copy.preview.days
    .map(
      (day) => `
            <div class="preview-day${day.active ? ' preview-day-active' : ''}">
              <span class="preview-day-wd">${day.wd}</span>
              <span class="preview-day-num">${day.num}</span>
            </div>`
    )
    .join('');

  const extrasHtml = copy.preview.slotExtras
    .map((extra) => `<span class="preview-extra-pill">${extra}</span>`)
    .join('\n              ');

  return `
  <main class="card-face card-front" aria-label="${copy.ariaLabel}">
    <header class="front-header">
      <div class="front-brand">
        ${CARD_BRAND_ISOTYPE_SVG}
        <div class="front-brand-meta">
          <span class="front-brand-kicker">${copy.header.kicker}</span>
          <span class="front-brand-sub">${copy.header.sub}</span>
        </div>
      </div>

      <div class="front-live-indicator">
        <span class="live-dot-ring" aria-hidden="true">
          <span class="live-dot-core"></span>
        </span>
        <span class="live-indicator-text">${copy.header.liveIndicator}</span>
      </div>
    </header>

    <section class="front-main">
      <div class="front-copy-col">
        <h1 class="front-title">${copy.hero.title}</h1>
        <p class="front-subtitle">${copy.hero.subtitle}</p>
        <p class="front-description">${copy.hero.description}</p>

        <div class="front-features-grid">${featureChipsHtml}
        </div>
      </div>

      <aside class="front-visual-col" aria-label="${copy.preview.ariaLabel}">
        <div class="preview-card">
          <div class="preview-top-row">
            <span class="preview-studio-label">
              <span class="preview-studio-dot" aria-hidden="true"></span>
              <span>${copy.preview.studioLabel}</span>
            </span>
            <span class="preview-month-tag">${copy.preview.monthTag}</span>
          </div>

          <div class="preview-days-strip">${daysHtml}
          </div>

          <div class="preview-slot-surface">
            <div class="preview-slot-top">
              <span class="preview-slot-time">${copy.preview.slotTime}</span>
              <span class="preview-slot-duration">${copy.preview.slotDuration}</span>
            </div>

            <div class="preview-slot-service">${copy.preview.slotService}</div>

            <div class="preview-slot-extras">
              ${extrasHtml}
            </div>

            <div class="preview-slot-deposit">
              <span class="preview-deposit-label">${copy.preview.depositLabel}</span>
              <span class="preview-deposit-amount">${copy.preview.depositAmount}</span>
            </div>
          </div>

          <div class="preview-confirmed-bar">
            <span class="preview-confirmed-icon">${CHECK_ICON_CARD_SVG}</span>
            <div class="preview-confirmed-copy">
              <span class="preview-confirmed-title">${copy.preview.confirmedTitle}</span>
              <span class="preview-confirmed-sub">${copy.preview.confirmedSub}</span>
            </div>
          </div>
        </div>
      </aside>
    </section>

    <footer class="front-footer">
      <div class="footer-col">
        <span class="footer-label">${copy.footer.platformLabel}</span>
        <span class="footer-value footer-value-accent">${BRAND_CONFIG.demoHost}</span>
      </div>
      <div class="footer-col footer-col-center">
        <span class="footer-label">${copy.footer.whatsappLabel}</span>
        <span class="footer-value">${BRAND_CONFIG.whatsappDisplay}</span>
      </div>
      <div class="footer-col footer-col-right">
        <span class="footer-label">${copy.footer.authorLabel}</span>
        <span class="footer-value">${BRAND_CONFIG.authorName}</span>
      </div>
    </footer>
  </main>`;
}
