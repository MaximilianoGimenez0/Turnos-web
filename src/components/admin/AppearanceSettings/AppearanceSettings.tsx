import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Eye,
  Layers,
  LayoutTemplate,
  Mail,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sun,
  Type,
} from 'lucide-react';
import {
  BACKGROUND_INTENSITIES,
  BACKGROUND_STYLES,
  BUTTON_STYLES,
  DENSITY_SCALES,
  FONT_PAIRINGS,
  HERO_COPY_PRESETS,
  HERO_IMAGE_FRAMES,
  HERO_IMAGE_SHAPES,
  HERO_LAYOUTS,
  PALETTE_CATEGORY_LABELS,
  PALETTE_PRESETS,
  SHAPE_PRESETS,
  SURFACE_STYLES,
  SURFACE_TEMPERATURES,
  SURFACE_TEMPERATURE_ORDER,
  TEXT_SCALES,
  type PaletteCategoryId,
} from '../../../config/themePresets';
import { FIELD_LIMITS } from '../../../config/fieldLimits';
import { useOwnerInfo } from '../../../context/OwnerInfoContext';
import { useTenant } from '../../../context/TenantContext';
import { applyImageFallback, DEFAULT_OWNER_ASSETS } from '../../../services/ownerDefaults';
import { resetTenantAppearance, updateTenantAppearance } from '../../../services/ownerService';
import {
  areAppearanceConfigsEqual,
  buildBackgroundPatternTokens,
  buildTenantCssVariables,
  ensureFontPairingLoaded,
  getThemeContrastSummary,
  normalizeHexColor,
  normalizeTenantAppearance,
  resolveEffectiveBrandHex,
  resolveEffectiveSurfaceTokens,
  resolveHeroCopy,
} from '../../../services/themeEngine';
import type {
  DefaultThemeMode,
  SurfaceTemperature,
  TenantAppearanceConfig,
} from '../../../types';
import { APPEARANCE_SETTINGS_TEXTS } from '../../../texts';
import AlertModal from '../../common/AlertModal';
import Button from '../../common/Button/Button';
import Loader from '../../common/Loader/Loader';
import styles from './AppearanceSettings.module.css';

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

export const AppearanceSettings: React.FC = () => {
  const { tenantId, slug, appearance: bootstrapAppearance, refreshTenant } = useTenant();
  const { owner, rawOwner, defaults, isLiveSynced } = useOwnerInfo();

  const savedAppearance = useMemo<TenantAppearanceConfig>(
    () =>
      normalizeTenantAppearance(
        isLiveSynced ? rawOwner?.appearance : (rawOwner?.appearance ?? bootstrapAppearance)
      ),
    [isLiveSynced, rawOwner?.appearance, bootstrapAppearance]
  );

  const [draftOverride, setDraftOverride] = useState<TenantAppearanceConfig | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [previewModeOverride, setPreviewModeOverride] = useState<'light' | 'dark' | null>(null);
  const [primaryHexDraft, setPrimaryHexDraft] = useState<string | null>(null);
  const [accentHexDraft, setAccentHexDraft] = useState<string | null>(null);
  const [bgHexDraft, setBgHexDraft] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollToTopRef = useRef(false);

  const clearSuccessMessage = () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setSuccessMessage(null);
  };

  const showTemporarySuccess = (message: string) => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    setSuccessMessage(message);
    successTimerRef.current = setTimeout(() => {
      setSuccessMessage(null);
      successTimerRef.current = null;
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pendingScrollToTopRef.current || saving || resetting) return;
    pendingScrollToTopRef.current = false;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const rafId = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [saving, resetting]);

  const draft = draftOverride ?? savedAppearance;
  const hasChanges = useMemo(
    () => !areAppearanceConfigsEqual(draft, savedAppearance),
    [draft, savedAppearance]
  );

  const previewMode: 'light' | 'dark' =
    previewModeOverride ?? (draft.defaultMode === 'dark' ? 'dark' : 'light');

  const updateDraft = (updater: (prev: TenantAppearanceConfig) => TenantAppearanceConfig) => {
    clearSuccessMessage();
    setDraftOverride((curr) => updater(curr ?? savedAppearance));
  };

  useEffect(() => {
    ensureFontPairingLoaded(draft.fontPairing);
  }, [draft.fontPairing]);

  const filteredPresets = useMemo(
    () =>
      categoryFilter === 'all'
        ? PALETTE_PRESETS
        : PALETTE_PRESETS.filter((preset) => preset.category === categoryFilter),
    [categoryFilter]
  );

  const previewCssVars = useMemo(
    () => buildTenantCssVariables(draft, previewMode),
    [draft, previewMode]
  );

  const lightEmailPreviewVars = useMemo(
    () => buildTenantCssVariables(draft, 'light'),
    [draft]
  );

  const contrastSummary = useMemo(
    () => getThemeContrastSummary(draft, previewMode),
    [draft, previewMode]
  );

  const effectiveLightBrand = useMemo(() => resolveEffectiveBrandHex(draft, 'light'), [draft]);
  const effectivePreviewBrand = useMemo(
    () => resolveEffectiveBrandHex(draft, previewMode),
    [draft, previewMode]
  );
  const effectiveLightSurface = useMemo(
    () => resolveEffectiveSurfaceTokens(draft, 'light'),
    [draft]
  );
  const effectiveDarkSurface = useMemo(
    () => resolveEffectiveSurfaceTokens(draft, 'dark'),
    [draft]
  );
  const effectivePreviewSurface =
    previewMode === 'dark' ? effectiveDarkSurface : effectiveLightSurface;

  const wasPrimaryAdjusted = useMemo(() => {
    if (!draft.customPrimaryHex) return false;
    return draft.customPrimaryHex.toLowerCase() !== contrastSummary.primaryHex.toLowerCase();
  }, [draft.customPrimaryHex, contrastSummary.primaryHex]);

  const handleSelectPreset = (presetId: TenantAppearanceConfig['palettePreset']) => {
    setPrimaryHexDraft(null);
    setAccentHexDraft(null);
    setBgHexDraft(null);
    updateDraft((prev) => ({
      ...prev,
      palettePreset: presetId,
      customPrimaryHex: null,
      customAccentHex: null,
      surfaceTemperature: null,
      customBackgroundHex: null,
    }));
  };

  const handleHexInputChange = (
    field: 'customPrimaryHex' | 'customAccentHex' | 'customBackgroundHex',
    value: string
  ) => {
    if (field === 'customPrimaryHex') {
      setPrimaryHexDraft(value);
    } else if (field === 'customAccentHex') {
      setAccentHexDraft(value);
    } else {
      setBgHexDraft(value);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      updateDraft((prev) => ({ ...prev, [field]: null }));
      return;
    }

    const valid = normalizeHexColor(trimmed);
    if (valid) {
      updateDraft((prev) => ({ ...prev, [field]: valid }));
    }
  };

  const handleColorPickerChange = (
    field: 'customPrimaryHex' | 'customAccentHex' | 'customBackgroundHex',
    hex: string
  ) => {
    const valid = normalizeHexColor(hex);
    if (!valid) return;
    if (field === 'customPrimaryHex') {
      setPrimaryHexDraft(null);
    } else if (field === 'customAccentHex') {
      setAccentHexDraft(null);
    } else {
      setBgHexDraft(null);
    }
    updateDraft((prev) => ({ ...prev, [field]: valid }));
  };

  const handleSave = async () => {
    setSaving(true);
    clearSuccessMessage();
    setErrorMessage(null);
    try {
      await updateTenantAppearance(tenantId, draft, slug);
      await refreshTenant();
      setDraftOverride(null);
      setPrimaryHexDraft(null);
      setAccentHexDraft(null);
      setBgHexDraft(null);
      pendingScrollToTopRef.current = true;
      showTemporarySuccess(APPEARANCE_SETTINGS_TEXTS.feedback.savedSuccess);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : APPEARANCE_SETTINGS_TEXTS.feedback.saveErrorMessage
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraftOverride(null);
    setPrimaryHexDraft(null);
    setAccentHexDraft(null);
    setBgHexDraft(null);
    setPreviewModeOverride(null);
    clearSuccessMessage();
  };

  const handleConfirmReset = async () => {
    setConfirmResetOpen(false);
    setResetting(true);
    clearSuccessMessage();
    setErrorMessage(null);
    try {
      await resetTenantAppearance(tenantId, slug);
      await refreshTenant();
      setDraftOverride(null);
      setPrimaryHexDraft(null);
      setAccentHexDraft(null);
      setBgHexDraft(null);
      setPreviewModeOverride(null);
      pendingScrollToTopRef.current = true;
      showTemporarySuccess(APPEARANCE_SETTINGS_TEXTS.feedback.resetSuccess);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : APPEARANCE_SETTINGS_TEXTS.feedback.saveErrorMessage
      );
    } finally {
      setResetting(false);
    }
  };

  const displayName = owner.businessName || owner.name || 'Tu Negocio';
  const logoSrc = owner.logoUrl || defaults.logoUrl || DEFAULT_OWNER_ASSETS.logoImage;
  const primaryHexDisplay = primaryHexDraft ?? (draft.customPrimaryHex || '');
  const accentHexDisplay = accentHexDraft ?? (draft.customAccentHex || '');
  const bgHexDisplay = bgHexDraft ?? (draft.customBackgroundHex || '');

  const activePaletteLabel =
    draft.customPrimaryHex || draft.customAccentHex
      ? APPEARANCE_SETTINGS_TEXTS.sections.palette.customModeChip
      : PALETTE_PRESETS.find((p) => p.id === draft.palettePreset)?.name || draft.palettePreset;

  const activeSurfaceLabel = draft.customBackgroundHex
    ? draft.customBackgroundHex
    : draft.surfaceTemperature
    ? SURFACE_TEMPERATURES[draft.surfaceTemperature].name
    : APPEARANCE_SETTINGS_TEXTS.sections.background.surfaceAuto;

  const activeBgStyleLabel =
    BACKGROUND_STYLES.find((b) => b.id === draft.backgroundStyle)?.name || draft.backgroundStyle;

  const activeIntensityLabel =
    BACKGROUND_INTENSITIES.find((i) => i.id === draft.backgroundIntensity)?.name ||
    draft.backgroundIntensity;

  const activeDefaultModeLabel =
    draft.defaultMode === 'dark'
      ? APPEARANCE_SETTINGS_TEXTS.sections.mode.dark
      : draft.defaultMode === 'system'
      ? APPEARANCE_SETTINGS_TEXTS.sections.mode.system
      : APPEARANCE_SETTINGS_TEXTS.sections.mode.light;

  const activeFontLabel =
    FONT_PAIRINGS.find((f) => f.id === draft.fontPairing)?.name || draft.fontPairing;

  const activeTextScaleLabel =
    TEXT_SCALES.find((t) => t.id === draft.textScale)?.name || draft.textScale;

  const activeShapeLabel =
    SHAPE_PRESETS.find((s) => s.id === draft.shapePreset)?.name || draft.shapePreset;

  const activeSurfaceStyleLabel =
    SURFACE_STYLES.find((s) => s.id === draft.surfaceStyle)?.name || draft.surfaceStyle;

  const activeButtonStyleLabel =
    BUTTON_STYLES.find((b) => b.id === draft.buttonStyle)?.name || draft.buttonStyle;

  const activeDensityLabel =
    DENSITY_SCALES.find((d) => d.id === draft.density)?.name || draft.density;

  const activeHeroLayoutLabel =
    HERO_LAYOUTS.find((l) => l.id === draft.heroLayout)?.name || draft.heroLayout;

  const activeHeroShapeLabel =
    HERO_IMAGE_SHAPES.find((s) => s.id === draft.heroImageShape)?.name || draft.heroImageShape;

  const activeHeroFrameLabel =
    HERO_IMAGE_FRAMES.find((f) => f.id === draft.heroImageFrame)?.name || draft.heroImageFrame;

  const activeHeroCopyLabel =
    draft.heroCustomTitlePrefix || draft.heroCustomTitleHighlight || draft.heroCustomSubtitle
      ? APPEARANCE_SETTINGS_TEXTS.sections.hero.customCopyChip
      : HERO_COPY_PRESETS.find((c) => c.id === draft.heroCopyPreset)?.name || draft.heroCopyPreset;

  return (
    <div className={styles.container}>
      <section className={styles.card} aria-labelledby="appearance-settings-title">
        <header className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.titleRow}>
              <h2 id="appearance-settings-title" className={styles.title}>
                <Palette size={20} strokeWidth={1.75} className={styles.titleIcon} aria-hidden="true" />
                <span>{APPEARANCE_SETTINGS_TEXTS.header.title}</span>
              </h2>
              <span
                className={`${styles.statusBadge} ${
                  hasChanges ? styles.statusUnsaved : styles.statusSaved
                }`}
              >
                {hasChanges ? (
                  APPEARANCE_SETTINGS_TEXTS.header.unsavedBadge
                ) : (
                  <>
                    <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" />
                    <span>{APPEARANCE_SETTINGS_TEXTS.header.savedBadge}</span>
                  </>
                )}
              </span>
            </div>
            <p className={styles.subtitle}>{APPEARANCE_SETTINGS_TEXTS.header.subtitle}</p>
          </div>
        </header>

        {successMessage && (
          <div className={styles.successAlertBand}>
            <div className={styles.successAlert} role="status" aria-live="polite">
              <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        <div className={styles.editorGrid}>
          <div className={styles.controlsColumn}>
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
                      onClick={() => setCategoryFilter('all')}
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
                        onClick={() => setCategoryFilter(cat)}
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
                          onClick={() => handleSelectPreset(preset.id)}
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
                            setPrimaryHexDraft(null);
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
                        onChange={(e) => handleColorPickerChange('customPrimaryHex', e.target.value)}
                      />
                      <input
                        id="appearance-primary-hex"
                        type="text"
                        className={styles.hexInput}
                        value={primaryHexDisplay}
                        placeholder={effectiveLightBrand.primary}
                        maxLength={7}
                        onChange={(e) => handleHexInputChange('customPrimaryHex', e.target.value)}
                        onBlur={() => setPrimaryHexDraft(null)}
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
                            setAccentHexDraft(null);
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
                        onChange={(e) => handleColorPickerChange('customAccentHex', e.target.value)}
                      />
                      <input
                        id="appearance-accent-hex"
                        type="text"
                        className={styles.hexInput}
                        value={accentHexDisplay}
                        placeholder={effectiveLightBrand.accent}
                        maxLength={7}
                        onChange={(e) => handleHexInputChange('customAccentHex', e.target.value)}
                        onBlur={() => setAccentHexDraft(null)}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.contrastBadgeRow}>
                  <span className={styles.contrastBadge}>
                    <span
                      className={styles.contrastSwatch}
                      style={{ backgroundColor: contrastSummary.primaryHex }}
                    />
                    <span>
                      {wasPrimaryAdjusted
                        ? APPEARANCE_SETTINGS_TEXTS.sections.palette.contrastAdjusted(
                            contrastSummary.primaryOnSurfaceRatio
                          )
                        : APPEARANCE_SETTINGS_TEXTS.sections.palette.contrastOk(
                            contrastSummary.primaryOnSurfaceRatio
                          )}
                    </span>
                  </span>
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
                          setBgHexDraft(null);
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
                          setBgHexDraft(null);
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
                      onChange={(e) => handleColorPickerChange('customBackgroundHex', e.target.value)}
                    />
                    <input
                      id="appearance-bg-hex"
                      type="text"
                      className={styles.hexInput}
                      value={bgHexDisplay}
                      placeholder={effectivePreviewSurface.bgBody}
                      maxLength={7}
                      onChange={(e) => handleHexInputChange('customBackgroundHex', e.target.value)}
                      onBlur={() => setBgHexDraft(null)}
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
                          className={`${styles.optionCard} ${
                            isActive ? styles.optionCardActive : ''
                          }`}
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

            {/* 03 · Color Mode + High-Visibility Accessible Checkbox */}
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
                          setPreviewModeOverride(id === 'system' ? null : id);
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

            {/* 04 · Typography */}
            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeaderBar}>
                <div className={styles.sectionHeaderLeft}>
                  <span className={styles.sectionStepPill}>
                    <Type size={13} strokeWidth={1.9} aria-hidden="true" />
                    <span>{APPEARANCE_SETTINGS_TEXTS.sections.typography.stepNum}</span>
                  </span>
                  <div className={styles.sectionHeaderText}>
                    <h3 className={styles.sectionTitle}>
                      {APPEARANCE_SETTINGS_TEXTS.sections.typography.title}
                    </h3>
                    <p className={styles.sectionSubtitle}>
                      {APPEARANCE_SETTINGS_TEXTS.sections.typography.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.sectionBody}>
                <div className={`${styles.featureGroupBox} ${styles.featureToneLight}`}>
                  <div className={styles.featureHeaderRow}>
                    <span className={styles.fieldLabel}>
                      {APPEARANCE_SETTINGS_TEXTS.sections.typography.pairingLabel}
                    </span>
                    <span className={styles.activeValueChip}>{activeFontLabel}</span>
                  </div>
                  <div className={styles.fontGrid}>
                  {FONT_PAIRINGS.map((pairing) => {
                    const isActive = draft.fontPairing === pairing.id;
                    return (
                      <button
                        key={pairing.id}
                        type="button"
                        className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                        onClick={() =>
                          updateDraft((prev) => ({ ...prev, fontPairing: pairing.id }))
                        }
                        aria-pressed={isActive}
                      >
                        <span
                          className={styles.fontSample}
                          style={{ fontFamily: pairing.display }}
                        >
                          {APPEARANCE_SETTINGS_TEXTS.sections.typography.sampleGlyph}
                        </span>
                        <span className={styles.optionCardTop}>{pairing.name}</span>
                        <span className={styles.optionCardDesc}>{pairing.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

                <div className={`${styles.featureGroupBox} ${styles.featureToneTint}`}>
                  <div className={styles.featureHeaderRow}>
                    <span className={styles.fieldLabel}>
                      {APPEARANCE_SETTINGS_TEXTS.sections.typography.textScaleLabel}
                    </span>
                    <span className={styles.activeValueChip}>{activeTextScaleLabel}</span>
                  </div>
                  <div className={styles.segmentedGrid}>
                  {TEXT_SCALES.map((scale) => {
                    const isActive = draft.textScale === scale.id;
                    return (
                      <button
                        key={scale.id}
                        type="button"
                        className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                        onClick={() => updateDraft((prev) => ({ ...prev, textScale: scale.id }))}
                        aria-pressed={isActive}
                      >
                        <span className={styles.optionCardTop}>{scale.name}</span>
                        <span className={styles.optionCardDesc}>{scale.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              </div>
            </div>

            {/* 05 · Shapes, Cards, Buttons & Density */}
            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeaderBar}>
                <div className={styles.sectionHeaderLeft}>
                  <span className={styles.sectionStepPill}>
                    <SlidersHorizontal size={13} strokeWidth={1.9} aria-hidden="true" />
                    <span>{APPEARANCE_SETTINGS_TEXTS.sections.geometry.stepNum}</span>
                  </span>
                  <div className={styles.sectionHeaderText}>
                    <h3 className={styles.sectionTitle}>
                      {APPEARANCE_SETTINGS_TEXTS.sections.geometry.title}
                    </h3>
                    <p className={styles.sectionSubtitle}>
                      {APPEARANCE_SETTINGS_TEXTS.sections.geometry.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.sectionBody}>
                <div className={`${styles.featureGroupBox} ${styles.featureToneLight}`}>
                  <div className={styles.featureHeaderRow}>
                    <span className={styles.fieldLabel}>
                      {APPEARANCE_SETTINGS_TEXTS.sections.geometry.shapeLabel}
                    </span>
                    <span className={styles.activeValueChip}>{activeShapeLabel}</span>
                  </div>
                  <div className={styles.segmentedGrid}>
                  {SHAPE_PRESETS.map((shape) => {
                    const isActive = draft.shapePreset === shape.id;
                    return (
                      <button
                        key={shape.id}
                        type="button"
                        className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                        onClick={() =>
                          updateDraft((prev) => ({ ...prev, shapePreset: shape.id }))
                        }
                        aria-pressed={isActive}
                      >
                        <div className={styles.optionCardTop}>
                          <span
                            className={styles.shapePreviewGlyph}
                            style={{ borderRadius: shape.radii.sm }}
                            aria-hidden="true"
                          />
                          <span>{shape.name}</span>
                        </div>
                        <span className={styles.optionCardDesc}>{shape.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

                <div className={`${styles.featureGroupBox} ${styles.featureToneTint}`}>
                  <div className={styles.featureHeaderRow}>
                    <span className={styles.fieldLabel}>
                      {APPEARANCE_SETTINGS_TEXTS.sections.geometry.surfaceStyleLabel}
                    </span>
                    <span className={styles.activeValueChip}>{activeSurfaceStyleLabel}</span>
                  </div>
                  <div className={styles.segmentedGrid}>
                  {SURFACE_STYLES.map((styleOpt) => {
                    const isActive = draft.surfaceStyle === styleOpt.id;
                    return (
                      <button
                        key={styleOpt.id}
                        type="button"
                        className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                        onClick={() =>
                          updateDraft((prev) => ({ ...prev, surfaceStyle: styleOpt.id }))
                        }
                        aria-pressed={isActive}
                      >
                        <span className={styles.optionCardTop}>{styleOpt.name}</span>
                        <span className={styles.optionCardDesc}>{styleOpt.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

                <div className={`${styles.featureGroupBox} ${styles.featureToneLight}`}>
                  <div className={styles.featureHeaderRow}>
                    <span className={styles.fieldLabel}>
                      {APPEARANCE_SETTINGS_TEXTS.sections.geometry.buttonStyleLabel}
                    </span>
                    <span className={styles.activeValueChip}>{activeButtonStyleLabel}</span>
                  </div>
                  <div className={styles.segmentedGrid}>
                  {BUTTON_STYLES.map((btnOpt) => {
                    const isActive = draft.buttonStyle === btnOpt.id;
                    const sampleClass =
                      btnOpt.id === 'soft'
                        ? styles.buttonSampleSoft
                        : btnOpt.id === 'outline'
                        ? styles.buttonSampleOutline
                        : styles.buttonSampleSolid;

                    return (
                      <button
                        key={btnOpt.id}
                        type="button"
                        className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                        onClick={() =>
                          updateDraft((prev) => ({ ...prev, buttonStyle: btnOpt.id }))
                        }
                        aria-pressed={isActive}
                      >
                        <span className={`${styles.buttonStyleSample} ${sampleClass}`} aria-hidden="true">
                          {APPEARANCE_SETTINGS_TEXTS.sections.geometry.buttonPreviewSample}
                        </span>
                        <span className={styles.optionCardTop}>{btnOpt.name}</span>
                        <span className={styles.optionCardDesc}>{btnOpt.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

                <div className={`${styles.featureGroupBox} ${styles.featureToneTint}`}>
                  <div className={styles.featureHeaderRow}>
                    <span className={styles.fieldLabel}>
                      {APPEARANCE_SETTINGS_TEXTS.sections.geometry.densityLabel}
                    </span>
                    <span className={styles.activeValueChip}>{activeDensityLabel}</span>
                  </div>
                  <div className={styles.segmentedGrid}>
                  {DENSITY_SCALES.map((densityOpt) => {
                    const isActive = draft.density === densityOpt.id;
                    return (
                      <button
                        key={densityOpt.id}
                        type="button"
                        className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                        onClick={() => updateDraft((prev) => ({ ...prev, density: densityOpt.id }))}
                        aria-pressed={isActive}
                      >
                        <span className={styles.optionCardTop}>{densityOpt.name}</span>
                        <span className={styles.optionCardDesc}>{densityOpt.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              </div>
            </div>

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
                        onClick={() =>
                          updateDraft((prev) => ({ ...prev, heroLayout: layoutOpt.id }))
                        }
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

              {draft.heroLayout === 'overlay-banner' && (
                <p className={styles.heroInfoNote}>
                  {APPEARANCE_SETTINGS_TEXTS.sections.hero.overlayBannerFrameNote}
                </p>
              )}

              <div className={`${styles.featureGroupBox} ${styles.featureToneTint}`}>
                <div className={styles.featureHeaderRow}>
                  <span className={styles.fieldLabel}>
                    {APPEARANCE_SETTINGS_TEXTS.sections.hero.shapeLabel}
                  </span>
                  <span className={styles.activeValueChip}>{activeHeroShapeLabel}</span>
                </div>
                <div className={styles.heroOptionGrid}>
                  {HERO_IMAGE_SHAPES.map((shapeOpt) => {
                    const isActive = draft.heroImageShape === shapeOpt.id;
                    return (
                      <button
                        key={shapeOpt.id}
                        type="button"
                        className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                        onClick={() =>
                          updateDraft((prev) => ({ ...prev, heroImageShape: shapeOpt.id }))
                        }
                        aria-pressed={isActive}
                      >
                        <div className={styles.heroGlyphStage} aria-hidden="true">
                          <span
                            className={styles.heroShapeGlyph}
                            data-shape-glyph={shapeOpt.id}
                          />
                        </div>
                        <span className={styles.optionCardTop}>{shapeOpt.name}</span>
                        <span className={styles.optionCardDesc}>{shapeOpt.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`${styles.featureGroupBox} ${styles.featureToneLight}`}>
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
                        className={`${styles.optionCard} ${isActive ? styles.optionCardActive : ''}`}
                        onClick={() =>
                          updateDraft((prev) => ({ ...prev, heroImageFrame: frameOpt.id }))
                        }
                        aria-pressed={isActive}
                      >
                        <div className={styles.heroGlyphStage} aria-hidden="true">
                          <span
                            className={styles.heroFrameGlyph}
                            data-frame-glyph={frameOpt.id}
                          >
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
                        onClick={() =>
                          updateDraft((prev) => ({ ...prev, heroCopyPreset: copyOpt.id }))
                        }
                        aria-pressed={isActive}
                      >
                        <div className={styles.heroCopyHeader}>
                          <span className={styles.heroCopyName}>{copyOpt.name}</span>
                          <span className={styles.heroCopyCategory}>{copyOpt.category}</span>
                        </div>
                        <span className={styles.heroCopyQuote}>
                          {copyOpt.titlePrefix}{' '}
                          <strong className={styles.heroCopyHighlight}>
                            {copyOpt.titleHighlight}
                          </strong>
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
                        updateDraft((prev) => ({
                          ...prev,
                          heroCustomTitlePrefix: e.target.value || null,
                        }))
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
                      placeholder={
                        APPEARANCE_SETTINGS_TEXTS.sections.hero.customHighlightPlaceholder
                      }
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          heroCustomTitleHighlight: e.target.value || null,
                        }))
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
                        updateDraft((prev) => ({
                          ...prev,
                          heroCustomSubtitle: e.target.value || null,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Isolated Storefront & Email Preview */}
          <aside className={styles.previewColumn} aria-label={APPEARANCE_SETTINGS_TEXTS.preview.title}>
            <div className={styles.previewHeader}>
              <h3 className={styles.previewTitle}>
                <Eye size={15} strokeWidth={1.75} aria-hidden="true" />
                <span>{APPEARANCE_SETTINGS_TEXTS.preview.title}</span>
              </h3>
              <div className={styles.previewModeSwitch} role="group" aria-label="Modo de vista previa">
                <button
                  type="button"
                  className={`${styles.previewModeBtn} ${
                    previewMode === 'light' ? styles.previewModeBtnActive : ''
                  }`}
                  onClick={() => setPreviewModeOverride('light')}
                >
                  <Sun size={12} strokeWidth={1.75} aria-hidden="true" />
                  <span>{APPEARANCE_SETTINGS_TEXTS.preview.lightMode}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.previewModeBtn} ${
                    previewMode === 'dark' ? styles.previewModeBtnActive : ''
                  }`}
                  onClick={() => setPreviewModeOverride('dark')}
                >
                  <Moon size={12} strokeWidth={1.75} aria-hidden="true" />
                  <span>{APPEARANCE_SETTINGS_TEXTS.preview.darkMode}</span>
                </button>
              </div>
            </div>

            <div
              className={styles.previewCanvas}
              style={previewCssVars as React.CSSProperties}
              data-preview-mode={previewMode}
              data-surface-style={draft.surfaceStyle}
              data-button-style={draft.buttonStyle}
            >
              <div className={styles.miniNavbar}>
                <div className={styles.miniBrand}>
                  <img
                    src={logoSrc}
                    alt={displayName}
                    className={styles.miniLogo}
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
                  {draft.allowVisitorModeToggle && (
                    <span className={styles.miniModeIcon} aria-hidden="true">
                      {previewMode === 'dark' ? <Sun size={11} /> : <Moon size={11} />}
                    </span>
                  )}
                </div>
              </div>

              {(() => {
                const heroCopy = resolveHeroCopy(draft);
                const heroImgSrc =
                  owner.heroImageUrl || defaults.heroImageUrl || DEFAULT_OWNER_ASSETS.heroImage;
                const heroFallbackSrc = defaults.heroImageUrl || DEFAULT_OWNER_ASSETS.heroImage;

                if (draft.heroLayout === 'overlay-banner') {
                  return (
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
                          <span className={styles.miniHeroOverlayHighlight}>
                            {heroCopy.titleHighlight}
                          </span>
                        </h4>
                        <p className={styles.miniHeroOverlaySubtitle}>{heroCopy.subtitle}</p>
                        {draft.heroShowCaption && (
                          <span className={styles.miniHeroOverlayChip}>
                            {displayName}
                            {owner.location ? ` · ${owner.location}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    className={styles.miniHero}
                    data-mini-hero-layout={draft.heroLayout}
                  >
                    <div className={styles.miniHeroText}>
                      <h4 className={styles.miniHeroHeading}>
                        {heroCopy.titlePrefix}{' '}
                        <span className={styles.miniHeroHighlight}>
                          {heroCopy.titleHighlight}
                        </span>
                      </h4>
                      <p className={styles.miniHeroSubtitle}>{heroCopy.subtitle}</p>
                    </div>

                    <div
                      className={styles.miniHeroFigure}
                      data-mini-shape={draft.heroImageShape}
                      data-mini-frame={draft.heroImageFrame}
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
                        {draft.heroShowCaption &&
                          (draft.heroImageFrame === 'polaroid' ||
                            draft.heroImageFrame === 'floating-caption') && (
                            <span
                              className={
                                draft.heroImageFrame === 'polaroid'
                                  ? styles.miniHeroPolaroidCaption
                                  : styles.miniHeroFloatingCaption
                              }
                            >
                              {displayName}
                            </span>
                          )}
                      </div>
                      {draft.heroShowCaption &&
                        draft.heroImageFrame !== 'polaroid' &&
                        draft.heroImageFrame !== 'floating-caption' && (
                          <span className={styles.miniHeroCaption}>{displayName}</span>
                        )}
                    </div>
                  </div>
                );
              })()}

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
            </div>

            <div className={styles.miniEmailCard} aria-label={APPEARANCE_SETTINGS_TEXTS.preview.emailBadge}>
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
                <span
                  className={styles.miniEmailBtn}
                  style={{
                    backgroundColor: lightEmailPreviewVars['--color-primary'],
                    color: lightEmailPreviewVars['--text-inverse'],
                  }}
                >
                  {APPEARANCE_SETTINGS_TEXTS.preview.emailCta}
                </span>
              </div>
            </div>
          </aside>
        </div>

        <footer className={styles.footer}>
          <Button
            variant="ghost"
            size="md"
            onClick={() => setConfirmResetOpen(true)}
            disabled={saving || resetting}
            leftIcon={<RotateCcw size={15} strokeWidth={1.75} />}
          >
            {resetting
              ? APPEARANCE_SETTINGS_TEXTS.actions.resetting
              : APPEARANCE_SETTINGS_TEXTS.actions.reset}
          </Button>

          <div className={styles.footerRight}>
            {!hasChanges && (
              <span className={styles.noChangesText}>
                {APPEARANCE_SETTINGS_TEXTS.actions.noChanges}
              </span>
            )}
            {hasChanges && (
              <Button
                variant="outline"
                size="md"
                onClick={handleDiscard}
                disabled={saving || resetting}
              >
                {APPEARANCE_SETTINGS_TEXTS.actions.discard}
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={!hasChanges || saving || resetting}
              leftIcon={<Save size={15} strokeWidth={1.75} />}
            >
              {saving ? APPEARANCE_SETTINGS_TEXTS.actions.saving : APPEARANCE_SETTINGS_TEXTS.actions.save}
            </Button>
          </div>
        </footer>
      </section>

      {(saving || resetting) && (
        <Loader
          fullScreen
          title={
            resetting
              ? APPEARANCE_SETTINGS_TEXTS.loader.resettingTitle
              : APPEARANCE_SETTINGS_TEXTS.loader.savingTitle
          }
          subtitle={APPEARANCE_SETTINGS_TEXTS.loader.subtitle}
          icon="heart"
        />
      )}

      <AlertModal
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        type="warning"
        title={APPEARANCE_SETTINGS_TEXTS.feedback.resetModalTitle}
        message={APPEARANCE_SETTINGS_TEXTS.feedback.resetModalMessage}
        confirmText={APPEARANCE_SETTINGS_TEXTS.feedback.resetConfirm}
        onConfirm={handleConfirmReset}
        secondaryText={APPEARANCE_SETTINGS_TEXTS.feedback.resetCancel}
        onSecondary={() => setConfirmResetOpen(false)}
        closeOnBackdropClick
        closeOnEscape
      />

      <AlertModal
        isOpen={Boolean(errorMessage)}
        onClose={() => setErrorMessage(null)}
        type="error"
        title={APPEARANCE_SETTINGS_TEXTS.feedback.saveErrorTitle}
        message={errorMessage || APPEARANCE_SETTINGS_TEXTS.feedback.saveErrorMessage}
        closeOnBackdropClick
        closeOnEscape
      />
    </div>
  );
};

export default AppearanceSettings;
