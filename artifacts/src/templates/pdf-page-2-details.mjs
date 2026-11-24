import { BRAND_CONFIG } from '../config/brand.mjs';
import { ICONS } from '../config/icons.mjs';
import { PDF_DOSSIER_COPY } from '../data/pdf-dossier.copy.mjs';
import { renderA4Footer, renderA4Header } from './pdf-shared.mjs';

export function renderPdfPage2Details() {
  const p2 = PDF_DOSSIER_COPY.page2;
  const { currencySymbol, monthlyAmount, monthlyPeriod, setupAmount, setupPeriod } =
    BRAND_CONFIG.pricing;

  const problemsHtml = p2.problems.items
    .map(
      (item) => `
        <article class="problem-card">
          <span class="problem-badge">${ICONS[item.icon]}</span>
          <div>
            <h3 class="problem-pain">${item.pain}</h3>
            <p class="problem-solution">${item.solution}</p>
          </div>
        </article>`
    )
    .join('');

  const pillarsHtml = p2.pillars.items
    .map((pillar) => {
      const toneClass =
        pillar.tone === 'success'
          ? ' tone-success'
          : pillar.tone === 'accent'
            ? ' tone-accent'
            : '';
      return `
        <article class="pillar-card">
          <div class="pillar-head">
            <span class="pillar-icon${toneClass}">${ICONS[pillar.icon]}</span>
            <h3 class="pillar-title">${pillar.title}</h3>
          </div>
          <p class="pillar-desc">${pillar.desc}</p>
        </article>`;
    })
    .join('');

  const monthlyListHtml = p2.pricing.monthly.items
    .map(
      (text) => `
            <li><span class="price-check">${ICONS.check}</span><span>${text}</span></li>`
    )
    .join('');

  const setupListHtml = p2.pricing.setup.items
    .map(
      (text) => `
            <li><span class="price-check">${ICONS.check}</span><span>${text}</span></li>`
    )
    .join('');

  const capacityHtml = p2.capacity.items
    .map((card) => {
      const prefixHtml = card.prefix ? `<span class="capacity-prefix">${card.prefix}</span>` : '';
      return `
        <article class="capacity-card">
          <div class="capacity-top">
            <span class="capacity-num">${prefixHtml}${card.num}</span>
            <span class="capacity-icon">${ICONS[card.icon]}</span>
          </div>
          <div class="capacity-label">${card.label}</div>
          <p class="capacity-desc">${card.desc}</p>
        </article>`;
    })
    .join('');

  return `
  <section class="a4-page p2-page" aria-label="${p2.ariaLabel}">
    ${renderA4Header(p2.header)}

    <section class="p2-hero">
      <h1 class="p2-title">${p2.hero.titleHtml}</h1>
      <p class="p2-subtitle">${p2.hero.subtitle}</p>
    </section>

    <section>
      <span class="section-eyebrow">${p2.problems.eyebrow}</span>
      <div class="problems-grid">${problemsHtml}
      </div>
    </section>

    <section>
      <span class="section-eyebrow">${p2.pillars.eyebrow}</span>
      <div class="pillars-grid">${pillarsHtml}
      </div>
    </section>

    <section class="pricing-wrapper">
      <div class="pricing-columns">
        <div class="price-col">
          <span class="price-badge monthly">${p2.pricing.monthly.badge}</span>
          <div class="price-figure-row">
            <span class="price-currency">${currencySymbol}</span>
            <span class="price-amount">${monthlyAmount}</span>
            <span class="price-period">${monthlyPeriod}</span>
          </div>
          <ul class="price-list">${monthlyListHtml}
          </ul>
        </div>

        <div class="price-col setup-col">
          <span class="price-badge setup">${p2.pricing.setup.badge}</span>
          <div class="price-figure-row">
            <span class="price-currency">${currencySymbol}</span>
            <span class="price-amount">${setupAmount}</span>
            <span class="price-period">${setupPeriod}</span>
          </div>
          <ul class="price-list">${setupListHtml}
          </ul>
        </div>
      </div>

      <div class="roi-banner">
        ${ICONS.sparkles}
        <span>${p2.pricing.roiHtml}</span>
      </div>
    </section>

    <section class="capacity-section">
      <div class="capacity-header">
        <span class="section-eyebrow" style="margin-bottom:0">${p2.capacity.eyebrow}</span>
        <span class="capacity-note-inline">${p2.capacity.noteInline}</span>
      </div>

      <div class="capacity-grid">${capacityHtml}
      </div>
    </section>

    ${renderA4Footer({ ctaHeadingHtml: p2.footerCtaHtml })}
  </section>`;
}
