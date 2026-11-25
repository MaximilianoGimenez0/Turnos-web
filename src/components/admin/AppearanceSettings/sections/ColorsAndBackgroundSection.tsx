import React from 'react';
import { AlertTriangle, Check, CheckCircle2, Layers, Monitor, Moon, Palette, Sun } from 'lucide-react';
import {
  BACKGROUND_INTENSITIES,
  BACKGROUND_STYLES,
  PALETTE_CATEGORY_LABELS,
  PALETTE_PRESETS,
  SURFACE_TEMPERATURES,
  SURFACE_TEMPERATURE_ORDER,
  type PaletteCategoryId,
  type SurfacePaletteTokens,
} from '../../../../config/themePresets';
import {
  buildBackgroundPatternTokens,
  rgbToHsl,
  hexToRgb,
  type ThemeContrastSummary,
} from '../../../../services/themeEngine';
import type {
  DefaultThemeMode,
  SurfaceTemperature,
  TenantAppearanceConfig,
} from '../../../../types';
import { APPEARANCE_SETTINGS_TEXTS } from '../../../../texts';
import styles from '../AppearanceSettings.module.css';

type CategoryFilter = 'all' | PaletteCategoryId;

const CATEGORY_ORDER: readonly PaletteCategoryId[] = [
  'editorial',
  'warm',
  'botanical',
  'minimal',
  'vibrant',
  'clinical',
];

const SURFACE_TEMP_OPTIONS: readonly (SurfaceTemperature | null)[] = [
  null,
  ...SURFACE_TEMPERATURE_ORDER,
];

interface ColorsAndBackgroundSectionProps {
  draft: TenantAppearanceConfig;
  categoryFilter: CategoryFilter;
  onCategoryFilterChange: (cat: CategoryFilter) => void;
  filteredPresets: readonly (typeof PALETTE_PRESETS)[number][];
  activePaletteLabel: string;
  activeSurfaceLabel: string;
  activeBgStyleLabel: string;
  activeIntensityLabel: string;
  activeDefaultModeLabel: string;
  primaryHexDisplay: string;
  accentHexDisplay: string;
  bgHexDisplay: string;
  effectiveLightBrand: { primary: string; accent: string };
  effectivePreviewBrand: { primary: string; accent: string };
  effectiveLightSurface: SurfacePaletteTokens;
  effectiveDarkSurface: SurfacePaletteTokens;
  effectivePreviewSurface: SurfacePaletteTokens;
  lightContrastSummary: ThemeContrastSummary;
  darkContrastSummary: ThemeContrastSummary;
  previewMode: 'light' | 'dark';
  onSelectPreset: (presetId: TenantAppearanceConfig['palettePreset']) => void;
  onHexInputChange: (
    field: 'customPrimaryHex' | 'customAccentHex' | 'customBackgroundHex',
    value: string
  ) => void;
  onColorPickerChange: (
    field: 'customPrimaryHex' | 'customAccentHex' | 'customBackgroundHex',
    hex: string
  ) => void;
  onClearHexDraft: (field: 'primary' | 'accent' | 'bg') => void;
  onSetPreviewModeOverride: (mode: 'light' | 'dark' | null) => void;
  updateDraft: (
    updater: (prev: TenantAppearanceConfig) => TenantAppearanceConfig,
    coalesceKey?: string
  ) => void;
}

export const ColorsAndBackgroundSection: React.FC<ColorsAndBackgroundSectionProps> = ({
  draft,
  categoryFilter,
  onCategoryFilterChange,
  filteredPresets,
  activePaletteLabel,
  activeSurfaceLabel,
  activeBgStyleLabel,
  activeIntensityLabel,
  activeDefaultModeLabel,
  primaryHexDisplay,
  accentHexDisplay,
  bgHexDisplay,
  effectiveLightBrand,
  effectivePreviewBrand,
  effectiveLightSurface,
  effectiveDarkSurface,
  effectivePreviewSurface,
  lightContrastSummary,
  darkContrastSummary,
  previewMode,
  onSelectPreset,
  onHexInputChange,
  onColorPickerChange,
  onClearHexDraft,
  onSetPreviewModeOverride,
  updateDraft,
}) => {
  const customBgIsDarkHex = Boolean(
    draft.customBackgroundHex && rgbToHsl(hexToRgb(draft.customBackgroundHex)).l < 50
  );
  const showLightClampedBgHint =
    Boolean(draft.customBackgroundHex) &&
    lightContrastSummary.wasBackgroundClamped &&
    customBgIsDarkHex &&
    draft.defaultMode === 'light';

  return (
    <>
      {/* 01 · Palette & Custom Brand Colors */}
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeaderBar}>
          <div className={styles.sectionHeaderLeft}>
            <span className={styles.sectionStepPill}>
              <Palette size={13} strokeWidth={1.9} aria-hidden="true" />
              <span>{APPEARANCE_SETTINGS_TEXTS.sections.palette.stepNum}</span>
            </span>
            <div className={styles.sectionHeaderText}>
              <h3 className={styles.sectionTitle}>
                {APPEARANCE_SETTINGS_TEXTS.sections.palette.title}
              </h3>
              <p className={styles.sectionSubtitle}>
                {APPEARANCE_SETTINGS_TEXTS.sections.palette.description}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.sectionBody}>
          <div className={`${styles.featureGroupBox} ${styles.featureToneLight}`}>
            <div className={styles.featureHeaderRow}>
              <span className={styles.fieldLabel}>
                {APPEARANCE_SETTINGS_TEXTS.sections.palette.presetsLabel}
              </span>
              <span className={styles.activeValueChip}>{activePaletteLabel}</span>
            </div>

            <div className={styles.categoryBar} role="tablist" aria-label="Categorías de paletas">
              <button
                type="button"
                role="tab"
                aria-selected={categoryFilter === 'all'}
                className={`${styles.categoryPill} ${
                  categoryFilter === 'all' ? styles.categoryPillActive : ''
                }`}
                onClick={() => onCategoryFilterChange('all')}
              >
                {APPEARANCE_SETTINGS_TEXTS.sections.palette.allCategories} ({PALETTE_PRESETS.length})
              </button>
              {CATEGORY_ORDER.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === cat}
                  className={`${styles.categoryPill} ${
                    categoryFilter === cat ? styles.categoryPillActive : ''
                  }`}
                  onClick={() => onCategoryFilterChange(cat)}
                >
                  {PALETTE_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            <div className={styles.presetsGrid}>
              {filteredPresets.map((preset) => {
                const isActive =
                  draft.palettePreset === preset.id &&
                  !draft.customPrimaryHex &&
                  !draft.customAccentHex;
                const surfaceBg = SURFACE_TEMPERATURES[preset.defaultSurface].light.bgBody;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`${styles.presetCard} ${isActive ? styles.presetCardActive : ''}`}
                    onClick={() => onSelectPreset(preset.id)}
                    aria-pressed={isActive}
                  >
                    <div className={styles.presetSwatches}>
                      <span
                        className={styles.swatchDot}
                        style={{ backgroundColor: surfaceBg }}
                        title="Superficie"
                      />
                      <span
                        className={styles.swatchDot}
                        style={{ backgroundColor: preset.primaryLight }}
                        title="Principal"
                      />
                      <span
                        className={styles.swatchDot}
                        style={{ backgroundColor: preset.accentLight }}
                        title="Acento"
                      />
                      {isActive && (
                        <span className={styles.presetCheck} aria-hidden="true">
                          <Check size={15} strokeWidth={2.4} />
                        </span>
                      )}
                    </div>
                    <span className={styles.presetName}>{preset.name}</span>
                    <span className={styles.presetDesc}>{preset.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${styles.featureGroupBox} ${styles.featureToneTint}`}>
            <div className={styles.customHeader}>
              <span className={styles.customTitle}>
                {APPEARANCE_SETTINGS_TEXTS.sections.palette.customTitle}
              </span>
              <p className={styles.customHint}>
                {APPEARANCE_SETTINGS_TEXTS.sections.palette.customHint}
              </p>
            </div>

            <div className={styles.colorInputsRow}>
              <div className={styles.colorField}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="appearance-primary-hex" className={styles.fieldLabel}>
                    {APPEARANCE_SETTINGS_TEXTS.sections.palette.primaryLabel}
                  </label>
                  {draft.customPrimaryHex && (
                    <button
                      type="button"
                      className={styles.clearInlineBtn}
                      onClick={() => {
                        onClearHexDraft('primary');
                        updateDraft((prev) => ({ ...prev, customPrimaryHex: null }));
                      }}
                    >
                      {APPEARANCE_SETTINGS_TEXTS.sections.palette.clearCustom}
                    </button>
                  )}
                </div>
                <div className={styles.colorControlGroup}>
                  <input
                    type="color"
                    aria-label={APPEARANCE_SETTINGS_TEXTS.sections.palette.primaryLabel}
                    className={styles.nativeColorInput}
                    value={draft.customPrimaryHex || effectiveLightBrand.primary}
                    onChange={(e) => onColorPickerChange('customPrimaryHex', e.target.value)}
                  />
                  <input
                    id="appearance-primary-hex"
                    type="text"
                    className={styles.hexInput}
                    value={primaryHexDisplay}
                    placeholder={effectiveLightBrand.primary}
                    maxLength={7}
                    onChange={(e) => onHexInputChange('customPrimaryHex', e.target.value)}
                    onBlur={() => onClearHexDraft('primary')}
                  />
                </div>
              </div>

              <div className={styles.colorField}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="appearance-accent-hex" className={styles.fieldLabel}>
                    {APPEARANCE_SETTINGS_TEXTS.sections.palette.accentLabel}
                  </label>
                  {draft.customAccentHex && (
                    <button
                      type="button"
                      className={styles.clearInlineBtn}
                      onClick={() => {
                        onClearHexDraft('accent');
                        updateDraft((prev) => ({ ...prev, customAccentHex: null }));
                      }}
                    >
                      {APPEARANCE_SETTINGS_TEXTS.sections.palette.clearCustom}
                    </button>
                  )}
                </div>
                <div className={styles.colorControlGroup}>
                  <input
                    type="color"
                    aria-label={APPEARANCE_SETTINGS_TEXTS.sections.palette.accentLabel}
                    className={styles.nativeColorInput}
                    value={draft.customAccentHex || effectiveLightBrand.accent}
                    onChange={(e) => onColorPickerChange('customAccentHex', e.target.value)}
                  />
                  <input
                    id="appearance-accent-hex"
                    type="text"
                    className={styles.hexInput}
                    value={accentHexDisplay}
                    placeholder={effectiveLightBrand.accent}
                    maxLength={7}
                    onChange={(e) => onHexInputChange('customAccentHex', e.target.value)}
                    onBlur={() => onClearHexDraft('accent')}
                  />
                </div>
              </div>
            </div>

            <div className={styles.contrastTrafficCard}>
              <span className={styles.contrastTrafficTitle}>
                {APPEARANCE_SETTINGS_TEXTS.sections.palette.dualContrastTitle}
              </span>
              <div className={styles.contrastBadgeRow}>
                <span
                  className={`${styles.contrastBadge} ${
                    lightContrastSummary.passesAA ? '' : styles.contrastBadgeWarn
                  }`}
                >
                  <Sun size={12} strokeWidth={2} aria-hidden="true" />
                  <span
                    className={styles.contrastSwatch}
                    style={{ backgroundColor: lightContrastSummary.primaryHex }}
                  />
                  <span>
                    {APPEARANCE_SETTINGS_TEXTS.sections.palette.lightCheckLabel(
                      lightContrastSummary.primaryOnSurfaceRatio
                    )}
                  </span>
                  <CheckCircle2 size={12} strokeWidth={2.2} aria-hidden="true" />
                </span>

                <span
                  className={`${styles.contrastBadge} ${
                    darkContrastSummary.passesAA ? '' : styles.contrastBadgeWarn
                  }`}
                >
                  <Moon size={12} strokeWidth={2} aria-hidden="true" />
                  <span
                    className={styles.contrastSwatch}
                    style={{ backgroundColor: darkContrastSummary.primaryHex }}
                  />
                  <span>
                    {APPEARANCE_SETTINGS_TEXTS.sections.palette.darkCheckLabel(
                      darkContrastSummary.primaryOnSurfaceRatio
                    )}
                  </span>
                  <CheckCircle2 size={12} strokeWidth={2.2} aria-hidden="true" />
                </span>

                {draft.buttonStyle === 'soft' && (
                  <span className={styles.contrastBadge}>
                    <span>
                      {APPEARANCE_SETTINGS_TEXTS.sections.palette.softBtnLabel(
                        (previewMode === 'dark' ? darkContrastSummary : lightContrastSummary)
                          .softButtonRatio
                      )}
                    </span>
                  </span>
                )}
              </div>

              {(lightContrastSummary.wasPrimaryAdjusted ||
                lightContrastSummary.wasAccentAdjusted) && (
                <p className={styles.contrastAdjustmentNote}>
                  {lightContrastSummary.wasPrimaryAdjusted
                    ? APPEARANCE_SETTINGS_TEXTS.sections.palette.calibratedPrimaryNote
                    : APPEARANCE_SETTINGS_TEXTS.sections.palette.calibratedAccentNote}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 02 · Background & Surfaces */}
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeaderBar}>
          <div className={styles.sectionHeaderLeft}>
            <span className={styles.sectionStepPill}>
              <Layers size={13} strokeWidth={1.9} aria-hidden="true" />
              <span>{APPEARANCE_SETTINGS_TEXTS.sections.background.stepNum}</span>
            </span>
            <div className={styles.sectionHeaderText}>
              <h3 className={styles.sectionTitle}>
                {APPEARANCE_SETTINGS_TEXTS.sections.background.title}
              </h3>
              <p className={styles.sectionSubtitle}>
                {APPEARANCE_SETTINGS_TEXTS.sections.background.description}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.sectionBody}>
          <div className={`${styles.featureGroupBox} ${styles.featureToneLight}`}>
            <div className={styles.featureHeaderRow}>
              <span className={styles.fieldLabel}>
                {APPEARANCE_SETTINGS_TEXTS.sections.background.surfaceTempLabel}
              </span>
              <span className={styles.activeValueChip}>{activeSurfaceLabel}</span>
            </div>
            <div className={styles.surfaceGrid}>
              {SURFACE_TEMP_OPTIONS.map((tempOpt) => {
                const isActive =
                  !draft.customBackgroundHex && draft.surfaceTemperature === tempOpt;
                const label = tempOpt
                  ? SURFACE_TEMPERATURES[tempOpt].name
                  : APPEARANCE_SETTINGS_TEXTS.sections.background.surfaceAuto;
                const lightDot = tempOpt ? SURFACE_TEMPERATURES[tempOpt].light.bgBody : null;
                const darkDot = tempOpt ? SURFACE_TEMPERATURES[tempOpt].dark.bgBody : null;

                return (
                  <button
                    key={tempOpt ?? 'auto'}
                    type="button"
                    className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                    onClick={() => {
                      onClearHexDraft('bg');
                      updateDraft((prev) => ({
                        ...prev,
                        surfaceTemperature: tempOpt,
                        customBackgroundHex: null,
                      }));
                    }}
                    aria-pressed={isActive}
                  >
                    <div className={styles.optionCardTop}>
                      {lightDot && darkDot && (
                        <span className={styles.dualSurfaceDots} aria-hidden="true">
                          <span
                            className={styles.tempPreviewDot}
                            style={{ backgroundColor: lightDot }}
                          />
                          <span
                            className={`${styles.tempPreviewDot} ${styles.tempPreviewDotOverlap}`}
                            style={{ backgroundColor: darkDot }}
                          />
                        </span>
                      )}
                      <span>{label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${styles.featureGroupBox} ${styles.featureToneTint}`}>
            <div className={styles.customHeader}>
              <span className={styles.customTitle}>
                {APPEARANCE_SETTINGS_TEXTS.sections.background.customBgTitle}
              </span>
              <p className={styles.customHint}>
                {APPEARANCE_SETTINGS_TEXTS.sections.background.customBgHint}
              </p>
            </div>

            <div className={styles.colorField}>
              <div className={styles.fieldLabelRow}>
                <label htmlFor="appearance-bg-hex" className={styles.fieldLabel}>
                  {APPEARANCE_SETTINGS_TEXTS.sections.background.customBgLabel}
                </label>
                {draft.customBackgroundHex && (
                  <button
                    type="button"
                    className={styles.clearInlineBtn}
                    onClick={() => {
                      onClearHexDraft('bg');
                      updateDraft((prev) => ({ ...prev, customBackgroundHex: null }));
                    }}
                  >
                    {APPEARANCE_SETTINGS_TEXTS.sections.background.clearCustomBg}
                  </button>
                )}
              </div>
              <div className={styles.colorControlGroup}>
                <input
                  type="color"
                  aria-label={APPEARANCE_SETTINGS_TEXTS.sections.background.customBgLabel}
                  className={styles.nativeColorInput}
                  value={draft.customBackgroundHex || effectivePreviewSurface.bgBody}
                  onChange={(e) => onColorPickerChange('customBackgroundHex', e.target.value)}
                />
                <input
                  id="appearance-bg-hex"
                  type="text"
                  className={styles.hexInput}
                  value={bgHexDisplay}
                  placeholder={effectivePreviewSurface.bgBody}
                  maxLength={7}
                  onChange={(e) => onHexInputChange('customBackgroundHex', e.target.value)}
                  onBlur={() => onClearHexDraft('bg')}
                />
              </div>
            </div>

            {draft.customBackgroundHex && (
              <div className={styles.derivedPreviewChips}>
                <span className={styles.derivedChip}>
                  <span
                    className={styles.contrastSwatch}
                    style={{ backgroundColor: effectiveLightSurface.bgBody }}
                  />
                  <span>
                    {APPEARANCE_SETTINGS_TEXTS.sections.background.derivedLightLabel}:{' '}
                    {effectiveLightSurface.bgBody}
                  </span>
                </span>
                <span className={styles.derivedChip}>
                  <span
                    className={styles.contrastSwatch}
                    style={{ backgroundColor: effectiveDarkSurface.bgBody }}
                  />
                  <span>
                    {APPEARANCE_SETTINGS_TEXTS.sections.background.derivedDarkLabel}:{' '}
                    {effectiveDarkSurface.bgBody}
                  </span>
                </span>
              </div>
            )}

            {showLightClampedBgHint && (
              <div className={styles.smartWarningBox} role="status">
                <AlertTriangle size={15} strokeWidth={2} aria-hidden="true" />
                <div className={styles.smartWarningBody}>
                  <span>{APPEARANCE_SETTINGS_TEXTS.sections.background.clampedLightWarning}</span>
                  <button
                    type="button"
                    className={styles.smartWarningAction}
                    onClick={() => {
                      onSetPreviewModeOverride('dark');
                      updateDraft((prev) => ({ ...prev, defaultMode: 'dark' }));
                    }}
                  >
                    {APPEARANCE_SETTINGS_TEXTS.sections.background.switchToDarkCta}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={`${styles.featureGroupBox} ${styles.featureToneLight}`}>
            <div className={styles.featureHeaderRow}>
              <span className={styles.fieldLabel}>
                {APPEARANCE_SETTINGS_TEXTS.sections.background.styleLabel}
              </span>
              <span className={styles.activeValueChip}>{activeBgStyleLabel}</span>
            </div>
            <div className={styles.bgStylesGrid}>
              {BACKGROUND_STYLES.map((bgStyle) => {
                const isActive = draft.backgroundStyle === bgStyle.id;
                const tilePattern = buildBackgroundPatternTokens(
                  bgStyle.id,
                  draft.backgroundIntensity,
                  previewMode,
                  effectivePreviewBrand.primary,
                  effectivePreviewBrand.accent,
                  effectivePreviewSurface.textPrimary
                );

                return (
                  <button
                    key={bgStyle.id}
                    type="button"
                    className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                    onClick={() =>
                      updateDraft((prev) => ({ ...prev, backgroundStyle: bgStyle.id }))
                    }
                    aria-pressed={isActive}
                  >
                    <div
                      className={styles.bgStylePreviewTile}
                      style={{
                        backgroundColor: effectivePreviewSurface.bgBody,
                        backgroundImage: tilePattern.image,
                        backgroundSize: tilePattern.size,
                      }}
                      aria-hidden="true"
                    />
                    <span className={styles.optionCardTop}>{bgStyle.name}</span>
                    <span className={styles.optionCardDesc}>{bgStyle.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {draft.backgroundStyle !== 'solid' && (
            <div className={`${styles.featureGroupBox} ${styles.featureToneTint}`}>
              <div className={styles.featureHeaderRow}>
                <span className={styles.fieldLabel}>
                  {APPEARANCE_SETTINGS_TEXTS.sections.background.intensityLabel}
                </span>
                <span className={styles.activeValueChip}>{activeIntensityLabel}</span>
              </div>
              <div className={styles.segmentedGrid}>
                {BACKGROUND_INTENSITIES.map((opt) => {
                  const isActive = draft.backgroundIntensity === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                      onClick={() =>
                        updateDraft((prev) => ({ ...prev, backgroundIntensity: opt.id }))
                      }
                      aria-pressed={isActive}
                    >
                      <span className={styles.optionCardTop}>{opt.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 03 · Color Mode */}
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeaderBar}>
          <div className={styles.sectionHeaderLeft}>
            <span className={styles.sectionStepPill}>
              <Sun size={13} strokeWidth={1.9} aria-hidden="true" />
              <span>{APPEARANCE_SETTINGS_TEXTS.sections.mode.stepNum}</span>
            </span>
            <div className={styles.sectionHeaderText}>
              <h3 className={styles.sectionTitle}>
                {APPEARANCE_SETTINGS_TEXTS.sections.mode.title}
              </h3>
              <p className={styles.sectionSubtitle}>
                {APPEARANCE_SETTINGS_TEXTS.sections.mode.description}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.sectionBody}>
          <div className={`${styles.featureGroupBox} ${styles.featureToneLight}`}>
            <div className={styles.featureHeaderRow}>
              <span className={styles.fieldLabel}>
                {APPEARANCE_SETTINGS_TEXTS.sections.mode.defaultModeLabel}
              </span>
              <span className={styles.activeValueChip}>{activeDefaultModeLabel}</span>
            </div>
            <div className={styles.segmentedGrid}>
              {(
                [
                  { id: 'light', label: APPEARANCE_SETTINGS_TEXTS.sections.mode.light, icon: Sun },
                  { id: 'dark', label: APPEARANCE_SETTINGS_TEXTS.sections.mode.dark, icon: Moon },
                  {
                    id: 'system',
                    label: APPEARANCE_SETTINGS_TEXTS.sections.mode.system,
                    icon: Monitor,
                  },
                ] as Array<{ id: DefaultThemeMode; label: string; icon: typeof Sun }>
              ).map(({ id, label, icon: Icon }) => {
                const isActive = draft.defaultMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                    onClick={() => {
                      onSetPreviewModeOverride(id === 'system' ? null : id);
                      updateDraft((prev) => ({ ...prev, defaultMode: id }));
                    }}
                    aria-pressed={isActive}
                  >
                    <div className={styles.optionCardTop}>
                      <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                      <span>{label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <label
            className={`${styles.checkboxCard} ${
              draft.allowVisitorModeToggle ? styles.checkboxCardChecked : ''
            }`}
          >
            <span className={styles.checkboxControl}>
              <input
                type="checkbox"
                className={styles.checkboxNativeInput}
                checked={draft.allowVisitorModeToggle}
                onChange={(e) =>
                  updateDraft((prev) => ({
                    ...prev,
                    allowVisitorModeToggle: e.target.checked,
                  }))
                }
              />
              <span className={styles.checkboxBox} aria-hidden="true">
                {draft.allowVisitorModeToggle && <Check size={14} strokeWidth={3} />}
              </span>
            </span>
            <span className={styles.checkboxTextGroup}>
              <span className={styles.checkboxHeaderRow}>
                <span className={styles.checkboxLabel}>
                  {APPEARANCE_SETTINGS_TEXTS.sections.mode.allowToggleLabel}
                </span>
                <span
                  className={`${styles.checkboxStatusPill} ${
                    draft.allowVisitorModeToggle
                      ? styles.checkboxStatusEnabled
                      : styles.checkboxStatusLocked
                  }`}
                >
                  {draft.allowVisitorModeToggle
                    ? APPEARANCE_SETTINGS_TEXTS.sections.mode.toggleEnabledBadge
                    : APPEARANCE_SETTINGS_TEXTS.sections.mode.toggleLockedBadge}
                </span>
              </span>
              <span className={styles.checkboxHint}>
                {APPEARANCE_SETTINGS_TEXTS.sections.mode.allowToggleHint}
              </span>
            </span>
          </label>
        </div>
      </div>
    </>
  );
};

export default ColorsAndBackgroundSection;
