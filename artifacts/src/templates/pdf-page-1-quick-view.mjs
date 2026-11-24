import { CHECK_ICON_TOAST_SVG, ICONS, MINI_LOGO_SVG } from '../config/icons.mjs';
import { PDF_DOSSIER_COPY } from '../data/pdf-dossier.copy.mjs';
import { renderA4Footer, renderA4Header } from './pdf-shared.mjs';

function renderFeaturePanel(panel, extraClass = '') {
  const itemsHtml = panel.items
    .map(
      (item) => `
          <li class="feature-item">
            <span class="feature-icon">${ICONS[item.icon]}</span>
            <p class="feature-text"><strong>${item.strong}</strong> ${item.text}</p>
          </li>`
    )
    .join('');

  return `
      <article class="feature-panel${extraClass ? ` ${extraClass}` : ''}">
        <div class="panel-header">
          <div class="panel-title-wrap">
            <span class="panel-kicker">${panel.kicker}</span>
            <h2 class="panel-title">${panel.title}</h2>
          </div>
          <span class="panel-icon-badge">${ICONS[panel.badgeIcon]}</span>
        </div>
        <ul class="feature-list">${itemsHtml}
        </ul>
      </article>`;
}

export function renderPdfPage1QuickView() {
  const p1 = PDF_DOSSIER_COPY.page1;

  const heroPillsHtml = p1.hero.pills
    .map(
      (pill) => `
          <span class="soft-pill">${ICONS[pill.icon]}<span>${pill.label}</span></span>`
    )
    .join('');

  const phoneDatesHtml = p1.phone.dates
    .map(
      (d) => `
            <div class="phone-date-chip${d.active ? ' active' : ''}">
              <span class="phone-date-day">${d.day}</span>
              <span class="phone-date-num">${d.num}</span>
            </div>`
    )
    .join('');

  const phoneTagsHtml = p1.phone.slotTags
    .map((tag) => `<span class="phone-slot-tag">${tag}</span>`)
    .join('\n              ');

  const stepsHtml = p1.steps.items
    .map(
      (step) => `
        <div class="step-card">
          <span class="step-num">${step.num}</span>
          <div>
            <div class="step-title">${step.title}</div>
            <p class="step-desc">${step.desc}</p>
          </div>
        </div>`
    )
    .join('');

  const highlightsHtml = p1.highlights
    .map(
      (chip) => `
      <div class="highlight-chip">${ICONS[chip.icon]}<span>${chip.label}</span></div>`
    )
    .join('');

  return `
  <section class="a4-page" aria-label="${p1.ariaLabel}">
    ${renderA4Header(p1.header)}

    <section class="hero-grid">
      <div>
        <h1 class="hero-brand-title">${p1.hero.title}</h1>
        <p class="hero-tagline">${p1.hero.tagline}</p>
        <p class="hero-copy">${p1.hero.copy}</p>
        <div class="hero-pills">${heroPillsHtml}
        </div>
      </div>

      <div class="phone-stage">
        <div class="phone-device">
          <div class="phone-topbar">
            <div class="phone-studio">
              <span class="phone-studio-dot">${MINI_LOGO_SVG}</span>
              <span>${p1.phone.studioName}</span>
            </div>
            <span class="phone-live-badge">${p1.phone.liveBadge}</span>
          </div>

          <div class="phone-dates">${phoneDatesHtml}
          </div>

          <div class="phone-slot-card">
            <div class="phone-slot-top">
              <span class="phone-slot-time">${p1.phone.slotTime}</span>
              <span class="phone-slot-dur">${p1.phone.slotDur}</span>
            </div>
            <div class="phone-slot-service">${p1.phone.slotService}</div>
            <div class="phone-slot-tags">
              ${phoneTagsHtml}
            </div>
            <div class="phone-slot-footer">
              <div class="phone-deposit">
                <span class="phone-deposit-label">${p1.phone.depositLabel}</span>
                <span class="phone-deposit-val">${p1.phone.depositVal}</span>
              </div>
              <span class="phone-cta">${p1.phone.cta}</span>
            </div>
          </div>

          <div class="phone-confirm-toast">
            <span class="phone-confirm-icon">${CHECK_ICON_TOAST_SVG}</span>
            <div class="phone-confirm-text">
              <span class="phone-confirm-title">${p1.phone.confirmTitle}</span>
              <span class="phone-confirm-sub">${p1.phone.confirmSub}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="steps-box">
      <div class="steps-header">
        <h2 class="section-heading">${p1.steps.headingHtml}</h2>
        <span class="section-eyebrow" style="margin-bottom:0">${p1.steps.eyebrow}</span>
      </div>
      <div class="steps-grid">${stepsHtml}
      </div>
    </section>

    <section class="columns-grid">
      ${renderFeaturePanel(p1.clientPanel)}
      ${renderFeaturePanel(p1.adminPanel, 'admin-panel')}
    </section>

    <section class="highlights-strip">${highlightsHtml}
    </section>

    ${renderA4Footer({ ctaHeadingHtml: p1.footerCtaHtml })}
  </section>`;
}
