import React, { useMemo } from 'react';
import { Check, LayoutTemplate, Store } from 'lucide-react';
import {
  HERO_COPY_PRESETS,
  HERO_HIGHLIGHT_STYLES,
  HERO_IMAGE_FRAMES,
  HERO_IMAGE_SHAPES,
  HERO_LAYOUTS,
  LOGO_SHAPES,
  MOTION_PRESETS,
  NAVBAR_STYLES,
  PORTFOLIO_LAYOUTS,
  SLOT_CARD_STYLES,
  coerceCompatibleHeroSettings,
  isHeroCombinationCompatible,
} from '../../../../config/themePresets';
import { FIELD_LIMITS } from '../../../../config/fieldLimits';
import type { TenantAppearanceConfig } from '../../../../types';
import { APPEARANCE_SETTINGS_TEXTS } from '../../../../texts';
import styles from '../AppearanceSettings.module.css';

interface HeroAndStorefrontSectionProps {
  draft: TenantAppearanceConfig;
  ownerPhone?: string;
  portfolioCount: number;
  activeHeroLayoutLabel: string;
  activeHeroShapeLabel: string;
  activeHeroFrameLabel: string;
  activeHeroCopyLabel: string;
  updateDraft: (
    updater: (prev: TenantAppearanceConfig) => TenantAppearanceConfig,
    coalesceKey?: string
  ) => void;
}

export const HeroAndStorefrontSection: React.FC<HeroAndStorefrontSectionProps> = ({
  draft,
  ownerPhone,
  portfolioCount,
  activeHeroLayoutLabel,
  activeHeroShapeLabel,
  activeHeroFrameLabel,
  activeHeroCopyLabel,
  updateDraft,
}) => {
  const heroCompatibility = useMemo(
    () =>
      isHeroCombinationCompatible(
        draft.heroLayout,
        draft.heroImageShape,
        draft.heroImageFrame
      ),
    [draft.heroLayout, draft.heroImageShape, draft.heroImageFrame]
  );

  const hasValidOwnerPhone = Boolean(ownerPhone && ownerPhone.replace(/\D/g, '').length >= 8);

  const activeNavbarLabel =
    NAVBAR_STYLES.find((n) => n.id === draft.navbarStyle)?.name || draft.navbarStyle;
  const activeLogoShapeLabel =
    LOGO_SHAPES.find((l) => l.id === draft.logoShape)?.name || draft.logoShape;
  const activePortfolioLabel =
    PORTFOLIO_LAYOUTS.find((p) => p.id === draft.portfolioLayout)?.name || draft.portfolioLayout;
  const activeMotionLabel =
    MOTION_PRESETS.find((m) => m.id === draft.motionPreset)?.name || draft.motionPreset;
  const activeHighlightLabel =
    HERO_HIGHLIGHT_STYLES.find((h) => h.id === draft.heroHighlightStyle)?.name ||
    draft.heroHighlightStyle;
  const activeSlotCardLabel =
    SLOT_CARD_STYLES.find((s) => s.id === draft.slotCardStyle)?.name || draft.slotCardStyle;

  return (
    <>
      {/* 06 · Hero Customization */}
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeaderBar}>
          <div className={styles.sectionHeaderLeft}>
            <span className={styles.sectionStepPill}>
              <LayoutTemplate size={13} strokeWidth={1.9} aria-hidden="true" />
              <span>{APPEARANCE_SETTINGS_TEXTS.sections.hero.stepNum}</span>
            </span>
            <div className={styles.sectionHeaderText}>
              <h3 className={styles.sectionTitle}>
                {APPEARANCE_SETTINGS_TEXTS.sections.hero.title}
              </h3>
              <p className={styles.sectionSubtitle}>
                {APPEARANCE_SETTINGS_TEXTS.sections.hero.description}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.sectionBody}>
          <div className={`${styles.featureGroupBox} ${styles.featureToneLight}`}>
            <div className={styles.featureHeaderRow}>
              <span className={styles.fieldLabel}>
                {APPEARANCE_SETTINGS_TEXTS.sections.hero.layoutLabel}
              </span>
              <span className={styles.activeValueChip}>{activeHeroLayoutLabel}</span>
            </div>
            <div className={styles.heroOptionGrid}>
              {HERO_LAYOUTS.map((layoutOpt) => {
                const isActive = draft.heroLayout === layoutOpt.id;
                return (
                  <button
                    key={layoutOpt.id}
                    type="button"
                    className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                    onClick={() => updateDraft((prev) => ({ ...prev, heroLayout: layoutOpt.id }))}
                    aria-pressed={isActive}
                  >
                    <div
                      className={styles.layoutSchematic}
                      data-schematic={layoutOpt.id}
                      aria-hidden="true"
                    >
                      <div className={styles.schematicText}>
                        <span className={styles.schematicLineLg} />
                        <span className={styles.schematicLineSm} />
                      </div>
                      <div className={styles.schematicMedia} />
                    </div>
                    <span className={styles.optionCardTop}>{layoutOpt.name}</span>
                    <span className={styles.optionCardDesc}>{layoutOpt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {!heroCompatibility.shapeApplicable && (
            <p className={styles.heroInfoNote}>
              {APPEARANCE_SETTINGS_TEXTS.sections.hero.overlayBannerFrameNote}
            </p>
          )}

          <div
            className={`${styles.featureGroupBox} ${styles.featureToneTint} ${
              !heroCompatibility.shapeApplicable ? styles.featureGroupDisabled : ''
            }`}
          >
            <div className={styles.featureHeaderRow}>
              <span className={styles.fieldLabel}>
                {APPEARANCE_SETTINGS_TEXTS.sections.hero.shapeLabel}
              </span>
              <span className={styles.activeValueChip}>{activeHeroShapeLabel}</span>
            </div>
            {draft.heroImageFrame === 'polaroid' && heroCompatibility.shapeApplicable && (
              <p className={styles.customHint}>
                {APPEARANCE_SETTINGS_TEXTS.sections.hero.polaroidShapeNote}
              </p>
            )}
            <div className={styles.heroOptionGrid}>
              {HERO_IMAGE_SHAPES.map((shapeOpt) => {
                const isAllowed = heroCompatibility.allowedShapesForFrame.includes(shapeOpt.id);
                const isDisabled = !heroCompatibility.shapeApplicable || !isAllowed;
                const isActive = draft.heroImageShape === shapeOpt.id;
                return (
                  <button
                    key={shapeOpt.id}
                    type="button"
                    disabled={isDisabled}
                    className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''} ${
                      isDisabled ? styles.optionCardDisabled : ''
                    }`}
                    onClick={() =>
                      updateDraft((prev) => ({ ...prev, heroImageShape: shapeOpt.id }))
                    }
                    aria-pressed={isActive}
                  >
                    <div className={styles.heroGlyphStage} aria-hidden="true">
                      <span className={styles.heroShapeGlyph} data-shape-glyph={shapeOpt.id} />
                    </div>
                    <span className={styles.optionCardTop}>{shapeOpt.name}</span>
                    <span className={styles.optionCardDesc}>{shapeOpt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`${styles.featureGroupBox} ${styles.featureToneLight} ${
              !heroCompatibility.frameApplicable ? styles.featureGroupDisabled : ''
            }`}
          >
            <div className={styles.featureHeaderRow}>
              <span className={styles.fieldLabel}>
                {APPEARANCE_SETTINGS_TEXTS.sections.hero.frameLabel}
              </span>
              <span className={styles.activeValueChip}>{activeHeroFrameLabel}</span>
            </div>
            <div className={styles.heroOptionGrid}>
              {HERO_IMAGE_FRAMES.map((frameOpt) => {
                const isActive = draft.heroImageFrame === frameOpt.id;
                return (
                  <button
                    key={frameOpt.id}
                    type="button"
                    disabled={!heroCompatibility.frameApplicable}
                    className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''} ${
                      !heroCompatibility.frameApplicable ? styles.optionCardDisabled : ''
                    }`}
                    onClick={() =>
                      updateDraft((prev) => {
                        const { config } = coerceCompatibleHeroSettings({
                          ...prev,
                          heroImageFrame: frameOpt.id,
                        });
                        return config;
                      })
                    }
                    aria-pressed={isActive}
                  >
                    <div className={styles.heroGlyphStage} aria-hidden="true">
                      <span className={styles.heroFrameGlyph} data-frame-glyph={frameOpt.id}>
                        <span className={styles.heroFrameInner} />
                      </span>
                    </div>
                    <span className={styles.optionCardTop}>{frameOpt.name}</span>
                    <span className={styles.optionCardDesc}>{frameOpt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${styles.featureGroupBox} ${styles.featureToneTint}`}>
            <div className={styles.featureHeaderRow}>
              <span className={styles.fieldLabel}>
                {APPEARANCE_SETTINGS_TEXTS.sections.hero.highlightStyleLabel}
              </span>
              <span className={styles.activeValueChip}>{activeHighlightLabel}</span>
            </div>
            <div className={styles.segmentedGrid}>
              {HERO_HIGHLIGHT_STYLES.map((opt) => {
                const isActive = draft.heroHighlightStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                    onClick={() =>
                      updateDraft((prev) => ({ ...prev, heroHighlightStyle: opt.id }))
                    }
                    aria-pressed={isActive}
                  >
                    <span className={styles.optionCardTop}>{opt.name}</span>
                    <span className={styles.optionCardDesc}>{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label
            className={`${styles.checkboxCard} ${
              draft.heroShowCaption ? styles.checkboxCardChecked : ''
            }`}
          >
            <span className={styles.checkboxControl}>
              <input
                type="checkbox"
                className={styles.checkboxNativeInput}
                checked={draft.heroShowCaption}
                onChange={(e) =>
                  updateDraft((prev) => ({
                    ...prev,
                    heroShowCaption: e.target.checked,
                  }))
                }
              />
              <span className={styles.checkboxBox} aria-hidden="true">
                {draft.heroShowCaption && <Check size={14} strokeWidth={3} />}
              </span>
            </span>
            <span className={styles.checkboxTextGroup}>
              <span className={styles.checkboxHeaderRow}>
                <span className={styles.checkboxLabel}>
                  {APPEARANCE_SETTINGS_TEXTS.sections.hero.showCaptionLabel}
                </span>
                <span
                  className={`${styles.checkboxStatusPill} ${
                    draft.heroShowCaption
                      ? styles.checkboxStatusEnabled
                      : styles.checkboxStatusLocked
                  }`}
                >
                  {draft.heroShowCaption
                    ? APPEARANCE_SETTINGS_TEXTS.sections.hero.captionVisibleBadge
                    : APPEARANCE_SETTINGS_TEXTS.sections.hero.captionHiddenBadge}
                </span>
              </span>
              <span className={styles.checkboxHint}>
                {APPEARANCE_SETTINGS_TEXTS.sections.hero.showCaptionHint}
              </span>
            </span>
          </label>

          <label
            className={`${styles.checkboxCard} ${
              draft.heroShowTrustPills ? styles.checkboxCardChecked : ''
            }`}
          >
            <span className={styles.checkboxControl}>
              <input
                type="checkbox"
                className={styles.checkboxNativeInput}
                checked={draft.heroShowTrustPills}
                onChange={(e) =>
                  updateDraft((prev) => ({
                    ...prev,
                    heroShowTrustPills: e.target.checked,
                  }))
                }
              />
              <span className={styles.checkboxBox} aria-hidden="true">
                {draft.heroShowTrustPills && <Check size={14} strokeWidth={3} />}
              </span>
            </span>
            <span className={styles.checkboxTextGroup}>
              <span className={styles.checkboxHeaderRow}>
                <span className={styles.checkboxLabel}>
                  {APPEARANCE_SETTINGS_TEXTS.sections.hero.showTrustPillsLabel}
                </span>
                <span
                  className={`${styles.checkboxStatusPill} ${
                    draft.heroShowTrustPills
                      ? styles.checkboxStatusEnabled
                      : styles.checkboxStatusLocked
                  }`}
                >
                  {draft.heroShowTrustPills
                    ? APPEARANCE_SETTINGS_TEXTS.sections.hero.captionVisibleBadge
                    : APPEARANCE_SETTINGS_TEXTS.sections.hero.captionHiddenBadge}
                </span>
              </span>
              <span className={styles.checkboxHint}>
                {APPEARANCE_SETTINGS_TEXTS.sections.hero.showTrustPillsHint}
              </span>
            </span>
          </label>

          <div className={`${styles.featureGroupBox} ${styles.featureToneTint}`}>
            <div className={styles.featureHeaderRow}>
              <span className={styles.fieldLabel}>
                {APPEARANCE_SETTINGS_TEXTS.sections.hero.copyPresetLabel}
              </span>
              <span className={styles.activeValueChip}>{activeHeroCopyLabel}</span>
            </div>
            <div className={styles.heroCopyGrid}>
              {HERO_COPY_PRESETS.map((copyOpt) => {
                const isActive = draft.heroCopyPreset === copyOpt.id;
                return (
                  <button
                    key={copyOpt.id}
                    type="button"
                    className={`${styles.heroCopyCard} ${
                      isActive ? styles.heroCopyCardActive : ''
                    }`}
                    onClick={() => updateDraft((prev) => ({ ...prev, heroCopyPreset: copyOpt.id }))}
                    aria-pressed={isActive}
                  >
                    <div className={styles.heroCopyHeader}>
                      <span className={styles.heroCopyName}>{copyOpt.name}</span>
                      <span className={styles.heroCopyCategory}>{copyOpt.category}</span>
                    </div>
                    <span className={styles.heroCopyQuote}>
                      {copyOpt.titlePrefix}{' '}
                      <strong className={styles.heroCopyHighlight}>{copyOpt.titleHighlight}</strong>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${styles.featureGroupBox} ${styles.featureToneLight}`}>
            <div className={styles.customHeader}>
              <div className={styles.featureHeaderRow}>
                <span className={styles.customTitle}>
                  {APPEARANCE_SETTINGS_TEXTS.sections.hero.customCopyTitle}
                </span>
                {(draft.heroCustomTitlePrefix ||
                  draft.heroCustomTitleHighlight ||
                  draft.heroCustomSubtitle) && (
                  <button
                    type="button"
                    className={styles.clearInlineBtn}
                    onClick={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        heroCustomTitlePrefix: null,
                        heroCustomTitleHighlight: null,
                        heroCustomSubtitle: null,
                      }))
                    }
                  >
                    {APPEARANCE_SETTINGS_TEXTS.sections.hero.clearCustomCopy}
                  </button>
                )}
              </div>
              <p className={styles.customHint}>
                {APPEARANCE_SETTINGS_TEXTS.sections.hero.customCopyHint}
              </p>
            </div>

            <div className={styles.heroCustomFieldsGrid}>
              <label className={styles.heroCustomField}>
                <span className={styles.heroCustomFieldTop}>
                  <span className={styles.fieldLabel}>
                    {APPEARANCE_SETTINGS_TEXTS.sections.hero.customPrefixLabel}
                  </span>
                  <span className={styles.charCounter}>
                    {(draft.heroCustomTitlePrefix || '').length}/
                    {FIELD_LIMITS.hero.titlePrefix.max}
                  </span>
                </span>
                <input
                  type="text"
                  className={styles.heroTextInput}
                  value={draft.heroCustomTitlePrefix || ''}
                  maxLength={FIELD_LIMITS.hero.titlePrefix.max}
                  placeholder={APPEARANCE_SETTINGS_TEXTS.sections.hero.customPrefixPlaceholder}
                  onChange={(e) =>
                    updateDraft(
                      (prev) => ({
                        ...prev,
                        heroCustomTitlePrefix: e.target.value || null,
                      }),
                      'heroCustomTitlePrefix'
                    )
                  }
                />
              </label>

              <label className={styles.heroCustomField}>
                <span className={styles.heroCustomFieldTop}>
                  <span className={styles.fieldLabel}>
                    {APPEARANCE_SETTINGS_TEXTS.sections.hero.customHighlightLabel}
                  </span>
                  <span className={styles.charCounter}>
                    {(draft.heroCustomTitleHighlight || '').length}/
                    {FIELD_LIMITS.hero.titleHighlight.max}
                  </span>
                </span>
                <input
                  type="text"
                  className={styles.heroTextInput}
                  value={draft.heroCustomTitleHighlight || ''}
                  maxLength={FIELD_LIMITS.hero.titleHighlight.max}
                  placeholder={APPEARANCE_SETTINGS_TEXTS.sections.hero.customHighlightPlaceholder}
                  onChange={(e) =>
                    updateDraft(
                      (prev) => ({
                        ...prev,
                        heroCustomTitleHighlight: e.target.value || null,
                      }),
                      'heroCustomTitleHighlight'
                    )
                  }
                />
              </label>

              <label className={`${styles.heroCustomField} ${styles.heroCustomFieldFull}`}>
                <span className={styles.heroCustomFieldTop}>
                  <span className={styles.fieldLabel}>
                    {APPEARANCE_SETTINGS_TEXTS.sections.hero.customSubtitleLabel}
                  </span>
                  <span className={styles.charCounter}>
                    {(draft.heroCustomSubtitle || '').length}/{FIELD_LIMITS.hero.subtitle.max}
                  </span>
                </span>
                <input
                  type="text"
                  className={styles.heroTextInput}
                  value={draft.heroCustomSubtitle || ''}
                  maxLength={FIELD_LIMITS.hero.subtitle.max}
                  placeholder={APPEARANCE_SETTINGS_TEXTS.sections.hero.customSubtitlePlaceholder}
                  onChange={(e) =>
                    updateDraft(
                      (prev) => ({
                        ...prev,
                        heroCustomSubtitle: e.target.value || null,
                      }),
                      'heroCustomSubtitle'
                    )
                  }
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 07 · Storefront Header, Logo, Portfolio & Motion (Proposals C & D) */}
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeaderBar}>
          <div className={styles.sectionHeaderLeft}>
            <span className={styles.sectionStepPill}>
              <Store size={13} strokeWidth={1.9} aria-hidden="true" />
              <span>{APPEARANCE_SETTINGS_TEXTS.sections.storefront.stepNum}</span>
            </span>
            <div className={styles.sectionHeaderText}>
              <h3 className={styles.sectionTitle}>
                {APPEARANCE_SETTINGS_TEXTS.sections.storefront.title}
              </h3>
              <p className={styles.sectionSubtitle}>
                {APPEARANCE_SETTINGS_TEXTS.sections.storefront.description}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.sectionBody}>
          <div className={`${styles.featureGroupBox} ${styles.featureToneLight}`}>
            <div className={styles.featureHeaderRow}>
              <span className={styles.fieldLabel}>
                {APPEARANCE_SETTINGS_TEXTS.sections.storefront.navbarStyleLabel}
              </span>
              <span className={styles.activeValueChip}>{activeNavbarLabel}</span>
            </div>
            <div className={styles.segmentedGrid}>
              {NAVBAR_STYLES.map((opt) => {
                const isActive = draft.navbarStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                    onClick={() => updateDraft((prev) => ({ ...prev, navbarStyle: opt.id }))}
                    aria-pressed={isActive}
                  >
                    <span className={styles.optionCardTop}>{opt.name}</span>
                    <span className={styles.optionCardDesc}>{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${styles.featureGroupBox} ${styles.featureToneTint}`}>
            <div className={styles.featureHeaderRow}>
              <span className={styles.fieldLabel}>
                {APPEARANCE_SETTINGS_TEXTS.sections.storefront.logoShapeLabel}
              </span>
              <span className={styles.activeValueChip}>{activeLogoShapeLabel}</span>
            </div>
            <div className={styles.segmentedGrid}>
              {LOGO_SHAPES.map((opt) => {
                const isActive = draft.logoShape === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                    onClick={() => updateDraft((prev) => ({ ...prev, logoShape: opt.id }))}
                    aria-pressed={isActive}
                  >
                    <span className={styles.optionCardTop}>{opt.name}</span>
                    <span className={styles.optionCardDesc}>{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${styles.featureGroupBox} ${styles.featureToneLight}`}>
            <div className={styles.featureHeaderRow}>
              <span className={styles.fieldLabel}>
                {APPEARANCE_SETTINGS_TEXTS.sections.storefront.portfolioLayoutLabel}
              </span>
              <span className={styles.activeValueChip}>{activePortfolioLabel}</span>
            </div>
            <div className={styles.segmentedGrid}>
              {PORTFOLIO_LAYOUTS.map((opt) => {
                const isActive = draft.portfolioLayout === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                    onClick={() => updateDraft((prev) => ({ ...prev, portfolioLayout: opt.id }))}
                    aria-pressed={isActive}
                  >
                    <div
                      className={styles.portfolioSchematic}
                      data-portfolio-schematic={opt.id}
                      aria-hidden="true"
                    >
                      <span className={styles.portfolioSchematicTile} />
                      <span className={styles.portfolioSchematicTile} />
                      <span className={styles.portfolioSchematicTile} />
                      <span className={styles.portfolioSchematicTile} />
                    </div>
                    <span className={styles.optionCardTop}>{opt.name}</span>
                    <span className={styles.optionCardDesc}>{opt.description}</span>
                  </button>
                );
              })}
            </div>
            {draft.portfolioLayout === 'bento' && portfolioCount < 3 && (
              <p className={styles.inlineWarningHint}>
                {APPEARANCE_SETTINGS_TEXTS.sections.storefront.portfolioBentoMinItemsHint}
              </p>
            )}
          </div>

          <div className={`${styles.featureGroupBox} ${styles.featureToneTint}`}>
            <div className={styles.featureHeaderRow}>
              <span className={styles.fieldLabel}>
                {APPEARANCE_SETTINGS_TEXTS.sections.storefront.slotCardStyleLabel}
              </span>
              <span className={styles.activeValueChip}>{activeSlotCardLabel}</span>
            </div>
            <div className={styles.segmentedGrid}>
              {SLOT_CARD_STYLES.map((opt) => {
                const isActive = draft.slotCardStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                    onClick={() => updateDraft((prev) => ({ ...prev, slotCardStyle: opt.id }))}
                    aria-pressed={isActive}
                  >
                    <span className={styles.optionCardTop}>{opt.name}</span>
                    <span className={styles.optionCardDesc}>{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${styles.featureGroupBox} ${styles.featureToneLight}`}>
            <div className={styles.featureHeaderRow}>
              <span className={styles.fieldLabel}>
                {APPEARANCE_SETTINGS_TEXTS.sections.storefront.motionPresetLabel}
              </span>
              <span className={styles.activeValueChip}>{activeMotionLabel}</span>
            </div>
            <div className={styles.segmentedGrid}>
              {MOTION_PRESETS.map((opt) => {
                const isActive = draft.motionPreset === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                    onClick={() => updateDraft((prev) => ({ ...prev, motionPreset: opt.id }))}
                    aria-pressed={isActive}
                  >
                    <span className={styles.optionCardTop}>{opt.name}</span>
                    <span className={styles.optionCardDesc}>{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label
            className={`${styles.checkboxCard} ${
              draft.showFloatingWhatsApp ? styles.checkboxCardChecked : ''
            }`}
          >
            <span className={styles.checkboxControl}>
              <input
                type="checkbox"
                className={styles.checkboxNativeInput}
                checked={draft.showFloatingWhatsApp}
                onChange={(e) =>
                  updateDraft((prev) => ({
                    ...prev,
                    showFloatingWhatsApp: e.target.checked,
                  }))
                }
              />
              <span className={styles.checkboxBox} aria-hidden="true">
                {draft.showFloatingWhatsApp && <Check size={14} strokeWidth={3} />}
              </span>
            </span>
            <span className={styles.checkboxTextGroup}>
              <span className={styles.checkboxHeaderRow}>
                <span className={styles.checkboxLabel}>
                  {APPEARANCE_SETTINGS_TEXTS.sections.storefront.floatingWhatsappLabel}
                </span>
                <span
                  className={`${styles.checkboxStatusPill} ${
                    draft.showFloatingWhatsApp
                      ? styles.checkboxStatusEnabled
                      : styles.checkboxStatusLocked
                  }`}
                >
                  {draft.showFloatingWhatsApp
                    ? APPEARANCE_SETTINGS_TEXTS.sections.hero.captionVisibleBadge
                    : APPEARANCE_SETTINGS_TEXTS.sections.hero.captionHiddenBadge}
                </span>
              </span>
              <span className={styles.checkboxHint}>
                {APPEARANCE_SETTINGS_TEXTS.sections.storefront.floatingWhatsappHint}
              </span>
              {draft.showFloatingWhatsApp && !hasValidOwnerPhone && (
                <span className={styles.inlineWarningHint}>
                  {APPEARANCE_SETTINGS_TEXTS.sections.storefront.floatingWhatsappMissingPhone}
                </span>
              )}
            </span>
          </label>
        </div>
      </div>
    </>
  );
};

export default HeroAndStorefrontSection;
