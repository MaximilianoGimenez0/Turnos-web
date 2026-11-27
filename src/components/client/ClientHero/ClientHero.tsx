import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, MailCheck, ShieldCheck } from 'lucide-react';
import type { OwnerInfo, TenantAppearanceConfig } from '../../../types';
import { buildTenantPath } from '../../../services/tenantService';
import { applyImageFallback, DEFAULT_OWNER_ASSETS } from '../../../services/ownerDefaults';
import { resolveHeroCopy } from '../../../services/themeEngine';
import { CLIENT_VIEW_TEXTS } from '../../../texts';
import Button from '../../common/Button/Button';
import styles from './ClientHero.module.css';

export interface ClientHeroProps {
  appearance: TenantAppearanceConfig;
  owner: OwnerInfo;
  defaults: OwnerInfo;
  slug: string;
  onExploreSlots: () => void;
}

export const ClientHero: React.FC<ClientHeroProps> = ({
  appearance,
  owner,
  defaults,
  slug,
  onExploreSlots,
}) => {
  const { titlePrefix, titleHighlight, subtitle } = resolveHeroCopy(appearance);
  const {
    heroLayout,
    heroImageShape,
    heroImageFrame,
    heroShowCaption,
    heroShowTrustPills,
    heroHighlightStyle,
  } = appearance;

  const imageSrc = owner.heroImageUrl || defaults.heroImageUrl || DEFAULT_OWNER_ASSETS.heroImage;
  const fallbackSrc = defaults.heroImageUrl || DEFAULT_OWNER_ASSETS.heroImage;
  const captionTitle = owner.businessName || owner.name || CLIENT_VIEW_TEXTS.studioCard.title;
  const captionSub = owner.location || CLIENT_VIEW_TEXTS.studioCard.subtitle;

  const isOverlayBanner = heroLayout === 'overlay-banner';
  const isCenteredEditorial = heroLayout === 'centered';
  const isSculpturalShape =
    heroImageShape === 'arch' || heroImageShape === 'circle' || heroImageShape === 'organic';
  const isPolaroid = heroImageFrame === 'polaroid';
  const isFloatingCaption = heroImageFrame === 'floating-caption';
  const editorialKicker = owner.location
    ? `${captionTitle} · ${owner.location}`
    : captionTitle || CLIENT_VIEW_TEXTS.hero.badge;

  const renderNarrative = () => (
    <div className={styles.heroNarrative}>
      {isCenteredEditorial && (
        <div className={styles.editorialKicker}>
          <span className={styles.editorialKickerRule} aria-hidden="true" />
          <span className={styles.editorialKickerText}>{editorialKicker}</span>
          <span className={styles.editorialKickerRule} aria-hidden="true" />
        </div>
      )}

      <h1 className={styles.heroTitle}>
        {titlePrefix}{' '}
        <span className={styles.heroHighlight} data-hero-highlight={heroHighlightStyle}>
          {titleHighlight}
        </span>
      </h1>

      <p className={styles.heroSubtitle}>{subtitle}</p>

      <div className={styles.heroActions}>
        <Button
          variant="primary"
          size={heroLayout === 'minimal-compact' ? 'md' : 'lg'}
          onClick={onExploreSlots}
          rightIcon={<ArrowRight size={16} strokeWidth={1.5} />}
        >
          {CLIENT_VIEW_TEXTS.hero.exploreButton}
        </Button>

        <Link to={buildTenantPath(slug, '/about')}>
          <Button
            variant="outline"
            size={heroLayout === 'minimal-compact' ? 'md' : 'lg'}
            className={isOverlayBanner ? styles.overlaySecondaryBtn : undefined}
          >
            {CLIENT_VIEW_TEXTS.studioCard.aboutLink}
          </Button>
        </Link>
      </div>

      {heroShowTrustPills && (
        <div className={styles.trustPills}>
          <div className={styles.trustPill}>
            <ShieldCheck size={16} strokeWidth={1.5} className={styles.trustIcon} aria-hidden="true" />
            <span>{CLIENT_VIEW_TEXTS.trustPills.mpGuarantee}</span>
          </div>
          <div className={styles.trustPill}>
            <CreditCard size={16} strokeWidth={1.5} className={styles.trustIcon} aria-hidden="true" />
            <span>{CLIENT_VIEW_TEXTS.trustPills.paymentMethods}</span>
          </div>
          <div className={styles.trustPill}>
            <MailCheck size={16} strokeWidth={1.5} className={styles.trustIcon} aria-hidden="true" />
            <span>{CLIENT_VIEW_TEXTS.trustPills.instantReceipt}</span>
          </div>
        </div>
      )}
    </div>
  );

  if (isOverlayBanner) {
    return (
      <section className={styles.heroSection} data-hero-layout={heroLayout}>
        <div className="container">
          <div className={styles.overlayBannerCard}>
            <img
              src={imageSrc}
              alt={captionTitle}
              className={styles.overlayBannerBg}
              decoding="async"
              onError={(e) => applyImageFallback(e, fallbackSrc)}
            />
            <div className={styles.overlayBannerScrim} aria-hidden="true" />
            <div className={styles.overlayBannerInner}>
              {renderNarrative()}
              {heroShowCaption && (
                <div className={styles.overlayCaptionChip}>
                  <span className={styles.overlayCaptionTitle}>{captionTitle}</span>
                  <span className={styles.overlayCaptionSub}>{captionSub}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.heroSection} data-hero-layout={heroLayout}>
      <div className="container">
        <div
          className={`${styles.heroContainer} ${
            heroLayout === 'minimal-compact' ? styles.compactCard : ''
          }`}
        >
          {renderNarrative()}

          <div
            className={styles.heroMediaColumn}
            data-sculptural-stage={isCenteredEditorial && isSculpturalShape ? 'true' : undefined}
          >
            <figure
              className={styles.heroFigure}
              data-hero-shape={heroImageShape}
              data-hero-frame={heroImageFrame}
            >
              <div className={styles.heroFrameWrap}>
                <div className={styles.heroImageMat}>
                  <img
                    src={imageSrc}
                    alt={captionTitle}
                    className={styles.heroImage}
                    decoding="async"
                    onError={(e) => applyImageFallback(e, fallbackSrc)}
                  />
                </div>

                {heroShowCaption && isPolaroid && (
                  <figcaption className={styles.polaroidCaption}>
                    <span className={styles.heroCaptionTitle}>{captionTitle}</span>
                    <span className={styles.heroCaptionSub}>{captionSub}</span>
                  </figcaption>
                )}

                {heroShowCaption && isFloatingCaption && (
                  <figcaption className={styles.floatingCaption}>
                    <span className={styles.heroCaptionTitle}>{captionTitle}</span>
                    <span className={styles.heroCaptionSub}>{captionSub}</span>
                  </figcaption>
                )}
              </div>

              {heroShowCaption && !isPolaroid && !isFloatingCaption && (
                <figcaption className={styles.heroCaption}>
                  <span className={styles.heroCaptionTitle}>{captionTitle}</span>
                  <span className={styles.heroCaptionSub}>{captionSub}</span>
                </figcaption>
              )}
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClientHero;
