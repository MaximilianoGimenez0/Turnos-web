import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Mail,
  MailCheck,
  MessageCircle,
  Moon,
  ShieldCheck,
  Sun,
  User,
  X,
} from 'lucide-react';
import {
  applyImageFallback,
  DEFAULT_OWNER_ASSETS,
  DEMO_PORTFOLIO_STOCK_IMAGES,
} from '../../../services/ownerDefaults';
import { buildTenantCssVariables, resolveHeroCopy } from '../../../services/themeEngine';
import type {
  OwnerInfo,
  PortfolioItem,
  ShapePresetId,
  TenantAppearanceConfig,
} from '../../../types';
import { APPEARANCE_SETTINGS_TEXTS, CLIENT_VIEW_TEXTS } from '../../../texts';
import styles from './AppearanceSettings.module.css';

interface AppearanceLivePreviewProps {
  draft: TenantAppearanceConfig;
  published: TenantAppearanceConfig;
  hasChanges: boolean;
  previewMode: 'light' | 'dark';
  onPreviewModeChange: (mode: 'light' | 'dark') => void;
  owner: OwnerInfo;
  defaults: OwnerInfo;
  portfolioItems: PortfolioItem[];
  isFloating?: boolean;
  onCloseFloating?: () => void;
}

const STOCK_SAMPLE_PORTFOLIO_URLS = [
  DEMO_PORTFOLIO_STOCK_IMAGES.space,
  DEMO_PORTFOLIO_STOCK_IMAGES.session,
  DEMO_PORTFOLIO_STOCK_IMAGES.quality,
  DEMO_PORTFOLIO_STOCK_IMAGES.experience,
] as const;

const EMAIL_CARD_RADIUS: Record<ShapePresetId, string> = {
  sharp: '4px',
  soft: '12px',
  rounded: '16px',
  pill: '18px',
};

const EMAIL_BTN_RADIUS: Record<ShapePresetId, string> = {
  sharp: '3px',
  soft: '8px',
  rounded: '12px',
  pill: '9999px',
};

export const AppearanceLivePreview: React.FC<AppearanceLivePreviewProps> = ({
  draft,
  published,
  hasChanges,
  previewMode,
  onPreviewModeChange,
  owner,
  defaults,
  portfolioItems,
  isFloating = false,
  onCloseFloating,
}) => {
  const [compareTarget, setCompareTarget] = useState<'draft' | 'published'>('draft');
  const portfolioCarouselRef = useRef<HTMLDivElement | null>(null);

  const activeConfig = hasChanges && compareTarget === 'published' ? published : draft;

  const { previewPortfolioCards, usingPortfolioSamples } = useMemo(() => {
    const realCards = portfolioItems.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.title,
      imageUrl: item.imageUrl,
    }));

    if (realCards.length >= 4) {
      return { previewPortfolioCards: realCards, usingPortfolioSamples: false };
    }

    const padded = [...realCards];
    const sampleTitles = APPEARANCE_SETTINGS_TEXTS.preview.portfolioSampleTitles;
    for (let i = padded.length; i < 4; i += 1) {
      padded.push({
        id: `sample-${i}`,
        title: sampleTitles[i] || `Trabajo ${i + 1}`,
        imageUrl: STOCK_SAMPLE_PORTFOLIO_URLS[i % STOCK_SAMPLE_PORTFOLIO_URLS.length],
      });
    }

    return {
      previewPortfolioCards: padded,
      usingPortfolioSamples: realCards.length < 3,
    };
  }, [portfolioItems]);

  const scrollMiniPortfolioCarousel = (direction: -1 | 1) => {
    const el = portfolioCarouselRef.current;
    if (!el) return;
    const step = Math.max(120, Math.round(el.clientWidth * 0.68));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  const previewCssVars = useMemo(
    () => buildTenantCssVariables(activeConfig, previewMode),
    [activeConfig, previewMode]
  );

  const lightEmailPreviewVars = useMemo(
    () => buildTenantCssVariables(activeConfig, 'light'),
    [activeConfig]
  );

  const displayName = owner.businessName || owner.name || 'Tu Negocio';
  const logoSrc = owner.logoUrl || defaults.logoUrl || DEFAULT_OWNER_ASSETS.logoImage;
  const heroImgSrc = owner.heroImageUrl || defaults.heroImageUrl || DEFAULT_OWNER_ASSETS.heroImage;
  const heroFallbackSrc = defaults.heroImageUrl || DEFAULT_OWNER_ASSETS.heroImage;
  const heroCopy = resolveHeroCopy(activeConfig);

  const emailBtnStyle: React.CSSProperties = useMemo(() => {
    const borderRadius = EMAIL_BTN_RADIUS[activeConfig.shapePreset];
    if (activeConfig.buttonStyle === 'soft') {
      return {
        backgroundColor: lightEmailPreviewVars['--color-primary-light'],
        color: lightEmailPreviewVars['--color-primary-active'],
        border: `1.5px solid ${lightEmailPreviewVars['--color-primary-border']}`,
        borderRadius,
      };
    }
    if (activeConfig.buttonStyle === 'outline') {
      return {
        backgroundColor: lightEmailPreviewVars['--bg-surface'],
        color: lightEmailPreviewVars['--color-primary'],
        border: `1.5px solid ${lightEmailPreviewVars['--color-primary']}`,
        borderRadius,
      };
    }
    return {
      backgroundColor: lightEmailPreviewVars['--color-primary'],
      color: lightEmailPreviewVars['--text-inverse'],
      border: `1.5px solid ${lightEmailPreviewVars['--color-primary']}`,
      borderRadius,
    };
  }, [activeConfig.buttonStyle, activeConfig.shapePreset, lightEmailPreviewVars]);

  const renderTrustPills = (isOverlay: boolean) => {
    if (!activeConfig.heroShowTrustPills) return null;
    const pills = [
      { key: 'mp', Icon: ShieldCheck, label: CLIENT_VIEW_TEXTS.trustPills.mpGuarantee },
      { key: 'pay', Icon: CreditCard, label: CLIENT_VIEW_TEXTS.trustPills.paymentMethods },
      { key: 'mail', Icon: MailCheck, label: CLIENT_VIEW_TEXTS.trustPills.instantReceipt },
    ];
    return (
      <div className={isOverlay ? styles.miniHeroOverlayTrustPills : styles.miniTrustPills}>
        {pills.map(({ key, Icon, label }) => (
          <span
            key={key}
            className={isOverlay ? styles.miniHeroOverlayTrustPill : styles.miniTrustPill}
          >
            <Icon
              size={11}
              strokeWidth={1.75}
              className={isOverlay ? styles.miniHeroOverlayTrustIcon : styles.miniTrustIcon}
              aria-hidden="true"
            />
            <span>{label}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <aside
      className={
        isFloating ? `${styles.previewColumn} ${styles.previewColumnFloating}` : styles.previewColumn
      }
      aria-label={APPEARANCE_SETTINGS_TEXTS.preview.title}
    >
      <div className={styles.previewHeader}>
        <h3 className={styles.previewTitle}>
          <Eye size={15} strokeWidth={1.75} aria-hidden="true" />
          <span>{APPEARANCE_SETTINGS_TEXTS.preview.title}</span>
        </h3>

        <div className={styles.previewControlsGroup}>
          {hasChanges && (
            <div className={styles.previewModeSwitch} role="group" aria-label="Comparar versiones">
              <button
                type="button"
                className={`${styles.previewModeBtn} ${
                  compareTarget === 'draft' ? styles.previewModeBtnActive : ''
                }`}
                onClick={() => setCompareTarget('draft')}
              >
                {APPEARANCE_SETTINGS_TEXTS.preview.compareDraft}
              </button>
              <button
                type="button"
                className={`${styles.previewModeBtn} ${
                  compareTarget === 'published' ? styles.previewModeBtnActive : ''
                }`}
                onClick={() => setCompareTarget('published')}
              >
                {APPEARANCE_SETTINGS_TEXTS.preview.comparePublished}
              </button>
            </div>
          )}

          <div className={styles.previewModeSwitch} role="group" aria-label="Modo de vista previa">
            <button
              type="button"
              className={`${styles.previewModeBtn} ${
                previewMode === 'light' ? styles.previewModeBtnActive : ''
              }`}
              onClick={() => onPreviewModeChange('light')}
            >
              <Sun size={12} strokeWidth={1.75} aria-hidden="true" />
              <span>{APPEARANCE_SETTINGS_TEXTS.preview.lightMode}</span>
            </button>
            <button
              type="button"
              className={`${styles.previewModeBtn} ${
                previewMode === 'dark' ? styles.previewModeBtnActive : ''
              }`}
              onClick={() => onPreviewModeChange('dark')}
            >
              <Moon size={12} strokeWidth={1.75} aria-hidden="true" />
              <span>{APPEARANCE_SETTINGS_TEXTS.preview.darkMode}</span>
            </button>
          </div>

          {isFloating && onCloseFloating && (
            <button
              type="button"
              className={styles.previewCloseBtn}
              onClick={onCloseFloating}
              aria-label={APPEARANCE_SETTINGS_TEXTS.preview.mobileToggle.closeAria}
              title={APPEARANCE_SETTINGS_TEXTS.preview.mobileToggle.closeAria}
            >
              <X size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div
        className={styles.previewCanvas}
        style={previewCssVars as React.CSSProperties}
        data-preview-mode={previewMode}
        data-shape-preset={activeConfig.shapePreset}
        data-surface-style={activeConfig.surfaceStyle}
        data-button-style={activeConfig.buttonStyle}
        data-navbar-style={activeConfig.navbarStyle}
        data-slot-card-style={activeConfig.slotCardStyle}
        data-portfolio-layout={activeConfig.portfolioLayout}
      >
        {/* Mini Navbar */}
        <div className={styles.miniNavbar}>
          <div className={styles.miniBrand}>
            <img
              src={logoSrc}
              alt={displayName}
              className={styles.miniLogo}
              data-logo-shape={activeConfig.logoShape}
              onError={(e) =>
                applyImageFallback(e, defaults.logoUrl || DEFAULT_OWNER_ASSETS.logoImage)
              }
            />
            <span className={styles.miniBrandName}>{displayName}</span>
          </div>
          <div className={styles.miniNavPills}>
            <span className={`${styles.miniNavPill} ${styles.miniNavPillActive}`}>
              {APPEARANCE_SETTINGS_TEXTS.preview.navTurnos}
            </span>
            <span className={styles.miniNavPill}>
              {APPEARANCE_SETTINGS_TEXTS.preview.navPrices}
            </span>
            {activeConfig.allowVisitorModeToggle && (
              <span className={styles.miniModeIcon} aria-hidden="true">
                {previewMode === 'dark' ? <Sun size={11} /> : <Moon size={11} />}
              </span>
            )}
          </div>
        </div>

        {/* Mini Hero */}
        {activeConfig.heroLayout === 'overlay-banner' ? (
          <div className={styles.miniHeroOverlay}>
            <img
              src={heroImgSrc}
              alt={displayName}
              className={styles.miniHeroOverlayBg}
              onError={(e) => applyImageFallback(e, heroFallbackSrc)}
            />
            <div className={styles.miniHeroOverlayScrim} aria-hidden="true" />
            <div className={styles.miniHeroOverlayBody}>
              <h4 className={styles.miniHeroOverlayHeading}>
                {heroCopy.titlePrefix}{' '}
                <span
                  className={styles.miniHeroOverlayHighlight}
                  data-hero-highlight={activeConfig.heroHighlightStyle}
                >
                  {heroCopy.titleHighlight}
                </span>
              </h4>
              <p className={styles.miniHeroOverlaySubtitle}>{heroCopy.subtitle}</p>
              {renderTrustPills(true)}
              {activeConfig.heroShowCaption && (
                <span className={styles.miniHeroOverlayChip}>
                  {displayName}
                  {owner.location ? ` · ${owner.location}` : ''}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.miniHero} data-mini-hero-layout={activeConfig.heroLayout}>
            <div className={styles.miniHeroText}>
              {activeConfig.heroLayout === 'centered' && (
                <div className={styles.miniEditorialKicker}>
                  <span className={styles.miniEditorialKickerRule} aria-hidden="true" />
                  <span>{displayName}</span>
                  <span className={styles.miniEditorialKickerRule} aria-hidden="true" />
                </div>
              )}
              <h4 className={styles.miniHeroHeading}>
                {heroCopy.titlePrefix}{' '}
                <span
                  className={styles.miniHeroHighlight}
                  data-hero-highlight={activeConfig.heroHighlightStyle}
                >
                  {heroCopy.titleHighlight}
                </span>
              </h4>
              <p className={styles.miniHeroSubtitle}>{heroCopy.subtitle}</p>
              {renderTrustPills(false)}
            </div>

            <div
              className={styles.miniHeroFigure}
              data-mini-shape={activeConfig.heroImageShape}
              data-mini-frame={activeConfig.heroImageFrame}
            >
              <div className={styles.miniHeroFrameWrap}>
                <div className={styles.miniHeroImageMat}>
                  <img
                    src={heroImgSrc}
                    alt={displayName}
                    className={styles.miniHeroImage}
                    onError={(e) => applyImageFallback(e, heroFallbackSrc)}
                  />
                </div>
                {activeConfig.heroShowCaption &&
                  (activeConfig.heroImageFrame === 'polaroid' ||
                    activeConfig.heroImageFrame === 'floating-caption') && (
                    <span
                      className={
                        activeConfig.heroImageFrame === 'polaroid'
                          ? styles.miniHeroPolaroidCaption
                          : styles.miniHeroFloatingCaption
                      }
                    >
                      {displayName}
                    </span>
                  )}
              </div>
              {activeConfig.heroShowCaption &&
                activeConfig.heroImageFrame !== 'polaroid' &&
                activeConfig.heroImageFrame !== 'floating-caption' && (
                  <span className={styles.miniHeroCaption}>{displayName}</span>
                )}
            </div>
          </div>
        )}

        {/* Mini Slot Card */}
        <div className={styles.miniSlotCard}>
          <div className={styles.miniSlotTop}>
            <div>
              <div className={styles.miniSlotDay}>
                {APPEARANCE_SETTINGS_TEXTS.preview.slotDay}
              </div>
              <div className={styles.miniSlotTime}>
                {APPEARANCE_SETTINGS_TEXTS.preview.slotTime}
              </div>
            </div>
            <span className={styles.miniStatusPill}>
              {APPEARANCE_SETTINGS_TEXTS.preview.slotStatus}
            </span>
          </div>

          <div className={styles.miniServiceTags}>
            {APPEARANCE_SETTINGS_TEXTS.preview.slotServices.map((srv) => (
              <span key={srv} className={styles.miniServiceTag}>
                {srv}
              </span>
            ))}
          </div>

          <div className={styles.miniSlotFooter}>
            <div className={styles.miniDepositGroup}>
              <span className={styles.miniDepositLabel}>
                {APPEARANCE_SETTINGS_TEXTS.preview.slotDepositLabel}
              </span>
              <span className={styles.miniDepositValue}>
                {APPEARANCE_SETTINGS_TEXTS.preview.slotDepositAmount}
              </span>
            </div>
            <span className={styles.miniCtaButton}>
              {APPEARANCE_SETTINGS_TEXTS.preview.slotCta}
            </span>
          </div>
        </div>

        {/* Mini Form Controls Sample (verifies pill/sharp/density readability live) */}
        <div className={styles.miniFormSample}>
          <span className={styles.miniFormLabel}>
            {APPEARANCE_SETTINGS_TEXTS.preview.formSectionLabel}
          </span>
          <div className={styles.miniInputRow}>
            <User size={13} strokeWidth={1.75} className={styles.miniInputIcon} aria-hidden="true" />
            <span className={styles.miniInputText}>
              {APPEARANCE_SETTINGS_TEXTS.preview.formInputPlaceholder}
            </span>
          </div>
          <div className={styles.miniTextareaBox}>
            {APPEARANCE_SETTINGS_TEXTS.preview.formTextareaPlaceholder}
          </div>
        </div>

        {/* Mini Portfolio Section (reflects grid | bento | carousel) */}
        <div className={styles.miniPortfolioSection}>
          <div className={styles.miniPortfolioHeader}>
            <div className={styles.miniPortfolioTitleGroup}>
              <span className={styles.miniPortfolioTitle}>
                {APPEARANCE_SETTINGS_TEXTS.preview.portfolioSectionLabel}
              </span>
              {usingPortfolioSamples && (
                <span className={styles.miniPortfolioSampleBadge}>
                  {APPEARANCE_SETTINGS_TEXTS.preview.portfolioSampleBadge}
                </span>
              )}
            </div>
            {activeConfig.portfolioLayout === 'carousel' && (
              <div className={styles.miniPortfolioCarouselControls}>
                <button
                  type="button"
                  className={styles.miniPortfolioArrowBtn}
                  onClick={() => scrollMiniPortfolioCarousel(-1)}
                  aria-label={APPEARANCE_SETTINGS_TEXTS.preview.portfolioPrevAria}
                >
                  <ChevronLeft size={12} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.miniPortfolioArrowBtn}
                  onClick={() => scrollMiniPortfolioCarousel(1)}
                  aria-label={APPEARANCE_SETTINGS_TEXTS.preview.portfolioNextAria}
                >
                  <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          <div
            ref={portfolioCarouselRef}
            className={`${styles.miniPortfolioGrid} ${
              activeConfig.portfolioLayout === 'bento'
                ? styles.miniPortfolioBento
                : activeConfig.portfolioLayout === 'carousel'
                ? styles.miniPortfolioCarousel
                : ''
            }`}
          >
            {previewPortfolioCards.map((card, idx) => (
              <div
                key={card.id}
                className={`${styles.miniPortfolioCard} ${
                  activeConfig.portfolioLayout === 'bento' && idx === 0
                    ? styles.miniPortfolioCardFeatured
                    : ''
                }`}
              >
                <div className={styles.miniPortfolioThumbWrap}>
                  <img
                    src={card.imageUrl}
                    alt={card.title}
                    className={styles.miniPortfolioThumb}
                    onError={(e) => applyImageFallback(e, heroFallbackSrc)}
                  />
                </div>
                <span className={styles.miniPortfolioCardTitle}>{card.title}</span>
              </div>
            ))}
          </div>
        </div>

        {activeConfig.showFloatingWhatsApp && (
          <div className={styles.miniFloatingWaRow}>
            <span className={styles.miniFloatingWaBtn}>
              <MessageCircle size={12} strokeWidth={2} aria-hidden="true" />
              <span>WhatsApp</span>
            </span>
          </div>
        )}
      </div>

      {/* Synchronized Light Email Card */}
      <div
        className={styles.miniEmailCard}
        style={{
          borderRadius: EMAIL_CARD_RADIUS[activeConfig.shapePreset],
          backgroundColor: lightEmailPreviewVars['--bg-surface'],
        }}
        aria-label={APPEARANCE_SETTINGS_TEXTS.preview.emailBadge}
      >
        <div
          className={styles.miniEmailHeader}
          style={{
            backgroundColor: lightEmailPreviewVars['--color-primary-light'],
            borderBottom: `1px solid ${lightEmailPreviewVars['--color-primary-border']}`,
          }}
        >
          <span className={styles.miniEmailLabel}>
            <Mail size={11} strokeWidth={2} aria-hidden="true" />
            <span>{APPEARANCE_SETTINGS_TEXTS.preview.emailBadge}</span>
          </span>
          <span
            className={styles.miniEmailBrand}
            style={{
              color: lightEmailPreviewVars['--color-primary'],
              fontFamily: lightEmailPreviewVars['--font-display'],
            }}
          >
            {displayName}
          </span>
        </div>
        <div className={styles.miniEmailBody}>
          <span className={styles.miniEmailHeading}>
            {APPEARANCE_SETTINGS_TEXTS.preview.emailHeading}
          </span>
          <span className={styles.miniEmailBtn} style={emailBtnStyle}>
            {APPEARANCE_SETTINGS_TEXTS.preview.emailCta}
          </span>
        </div>
      </div>
    </aside>
  );
};

export default AppearanceLivePreview;
