import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutTemplate,
  Palette,
  Redo2,
  RotateCcw,
  Save,
  Sparkles,
  Type,
  Undo2,
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
  PALETTE_PRESETS,
  SHAPE_PRESETS,
  SURFACE_STYLES,
  SURFACE_TEMPERATURES,
  TEXT_SCALES,
  type PaletteCategoryId,
} from '../../../config/themePresets';
import { useOwnerInfo } from '../../../context/OwnerInfoContext';
import { usePortfolio } from '../../../context/PortfolioContext';
import { useTenant } from '../../../context/TenantContext';
import { useHorizontalScrollIndicator } from '../../../hooks/useHorizontalScrollIndicator';
import { resetTenantAppearance, updateTenantAppearance } from '../../../services/ownerService';
import {
  areAppearanceConfigsEqual,
  buildTenantCssVariables,
  ensureFontPairingLoaded,
  getThemeContrastSummary,
  normalizeHexColor,
  normalizeTenantAppearance,
  resolveEffectiveAppearanceSource,
  resolveEffectiveBrandHex,
  resolveEffectiveSurfaceTokens,
} from '../../../services/themeEngine';
import type { TenantAppearanceConfig } from '../../../types';
import { APPEARANCE_SETTINGS_TEXTS } from '../../../texts';
import AlertModal from '../../common/AlertModal';
import Button from '../../common/Button/Button';
import Loader from '../../common/Loader/Loader';
import { useAppearanceHistory } from './useAppearanceHistory';
import StylePacksSection from './sections/StylePacksSection';
import ColorsAndBackgroundSection from './sections/ColorsAndBackgroundSection';
import TypographyAndGeometrySection from './sections/TypographyAndGeometrySection';
import HeroAndStorefrontSection from './sections/HeroAndStorefrontSection';
import AppearanceLivePreview from './AppearanceLivePreview';
import styles from './AppearanceSettings.module.css';

type CategoryFilter = 'all' | PaletteCategoryId;
type EditorTabId = 'packs' | 'colors' | 'typography' | 'storefront';

export const AppearanceSettings: React.FC = () => {
  const { tenantId, slug, appearance: bootstrapAppearance, refreshTenant } = useTenant();
  const { owner, rawOwner, defaults, isLiveSynced } = useOwnerInfo();
  const { items: portfolioItems } = usePortfolio();

  const savedAppearance = useMemo<TenantAppearanceConfig>(
    () =>
      resolveEffectiveAppearanceSource({
        isLiveSynced,
        rawAppearance: rawOwner?.appearance,
        bootstrapAppearance,
      }),
    [isLiveSynced, rawOwner?.appearance, bootstrapAppearance]
  );

  const [activeTab, setActiveTab] = useState<EditorTabId>('packs');
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
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 1120px)').matches
      : false
  );
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollToTopRef = useRef(false);
  const controlsColumnRef = useRef<HTMLDivElement | null>(null);
  const {
    scrollRef: editorTabsRef,
    scrollState: tabsScrollState,
    updateScrollState: updateTabsScrollState,
  } = useHorizontalScrollIndicator<HTMLDivElement>();
  const editorTabBtnRefs = useRef<Partial<Record<EditorTabId, HTMLButtonElement | null>>>({});

  const clearSuccessMessage = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setSuccessMessage(null);
  }, []);

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
      controlsColumnRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
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

  useEffect(() => {
    controlsColumnRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const activeTabBtn = editorTabBtnRefs.current[activeTab];
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    activeTabBtn?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
    const rafId = window.requestAnimationFrame(updateTabsScrollState);
    return () => window.cancelAnimationFrame(rafId);
  }, [activeTab, updateTabsScrollState]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-width: 1120px)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsCompactViewport(e.matches);
      if (!e.matches) {
        setMobilePreviewOpen(false);
      }
    };
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  const isMobilePreviewVisible =
    isCompactViewport && mobilePreviewOpen && !saving && !resetting && !confirmResetOpen;

  useEffect(() => {
    if (!isMobilePreviewVisible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !errorMessage) {
        setMobilePreviewOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMobilePreviewVisible, errorMessage]);

  const { draft, canUndo, canRedo, pushDraft, undo, redo, resetHistory } = useAppearanceHistory(
    savedAppearance,
    clearSuccessMessage
  );

  // Keyboard shortcuts for Undo / Redo when not typing inside a text input/textarea
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault();
          undo();
        }
      } else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
        if (canRedo) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  const hasChanges = useMemo(
    () => !areAppearanceConfigsEqual(draft, savedAppearance),
    [draft, savedAppearance]
  );

  const previewMode: 'light' | 'dark' =
    previewModeOverride ?? (draft.defaultMode === 'dark' ? 'dark' : 'light');

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

  const lightContrastSummary = useMemo(() => getThemeContrastSummary(draft, 'light'), [draft]);
  const darkContrastSummary = useMemo(() => getThemeContrastSummary(draft, 'dark'), [draft]);

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

  const handleSelectPreset = (presetId: TenantAppearanceConfig['palettePreset']) => {
    setPrimaryHexDraft(null);
    setAccentHexDraft(null);
    setBgHexDraft(null);
    pushDraft((prev) => ({
      ...prev,
      palettePreset: presetId,
      customPrimaryHex: null,
      customAccentHex: null,
      surfaceTemperature: null,
      customBackgroundHex: null,
    }));
  };

  const handleApplyPack = (packAppearance: TenantAppearanceConfig) => {
    setPrimaryHexDraft(null);
    setAccentHexDraft(null);
    setBgHexDraft(null);
    setPreviewModeOverride(packAppearance.defaultMode === 'dark' ? 'dark' : 'light');
    pushDraft(() => ({ ...packAppearance }));
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
      pushDraft((prev) => ({ ...prev, [field]: null }), field);
      return;
    }

    const valid = normalizeHexColor(trimmed);
    if (valid) {
      pushDraft((prev) => ({ ...prev, [field]: valid }), field);
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
    pushDraft((prev) => ({ ...prev, [field]: valid }), field);
  };

  const handleClearHexDraft = (field: 'primary' | 'accent' | 'bg') => {
    if (field === 'primary') setPrimaryHexDraft(null);
    else if (field === 'accent') setAccentHexDraft(null);
    else setBgHexDraft(null);
  };

  const handleSave = async () => {
    setSaving(true);
    clearSuccessMessage();
    setErrorMessage(null);
    try {
      await updateTenantAppearance(tenantId, draft, slug);
      await refreshTenant();
      resetHistory(draft);
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
    resetHistory(savedAppearance);
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
      const defaultNorm = normalizeTenantAppearance(null);
      resetHistory(defaultNorm);
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

  const editorTabs: Array<{ id: EditorTabId; label: string; icon: typeof Sparkles }> = [
    { id: 'packs', label: APPEARANCE_SETTINGS_TEXTS.tabs.packs, icon: Sparkles },
    { id: 'colors', label: APPEARANCE_SETTINGS_TEXTS.tabs.colors, icon: Palette },
    { id: 'typography', label: APPEARANCE_SETTINGS_TEXTS.tabs.typography, icon: Type },
    { id: 'storefront', label: APPEARANCE_SETTINGS_TEXTS.tabs.storefront, icon: LayoutTemplate },
  ];

  const showUnifiedMobileDock =
    isCompactViewport && hasChanges && !isMobilePreviewVisible && !saving && !resetting && !confirmResetOpen;

  return (
    <div
      className={styles.container}
      data-has-mobile-dock={showUnifiedMobileDock ? 'true' : 'false'}
    >
      <section className={styles.card} aria-labelledby="appearance-settings-title">
        <header className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.titleRow}>
              <h2 id="appearance-settings-title" className={styles.title}>
                <Palette size={20} strokeWidth={1.75} className={styles.titleIcon} aria-hidden="true" />
                <span>{APPEARANCE_SETTINGS_TEXTS.header.title}</span>
              </h2>
              <div className={styles.headerMetaActions}>
                <div className={styles.historyBtnGroup}>
                  <button
                    type="button"
                    className={styles.historyBtn}
                    onClick={undo}
                    disabled={!canUndo || saving || resetting}
                    title={APPEARANCE_SETTINGS_TEXTS.actions.undo}
                    aria-label={APPEARANCE_SETTINGS_TEXTS.actions.undo}
                  >
                    <Undo2 size={14} strokeWidth={1.85} aria-hidden="true" />
                    <span>{APPEARANCE_SETTINGS_TEXTS.actions.undo}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.historyBtn}
                    onClick={redo}
                    disabled={!canRedo || saving || resetting}
                    title={APPEARANCE_SETTINGS_TEXTS.actions.redo}
                    aria-label={APPEARANCE_SETTINGS_TEXTS.actions.redo}
                  >
                    <Redo2 size={14} strokeWidth={1.85} aria-hidden="true" />
                    <span>{APPEARANCE_SETTINGS_TEXTS.actions.redo}</span>
                  </button>
                </div>
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

        <nav className={styles.editorTabsBar} aria-label="Secciones de apariencia">
          <div
            className={styles.editorTabsScrollArea}
            data-scroll-left={tabsScrollState.canScrollLeft ? 'true' : 'false'}
            data-scroll-right={tabsScrollState.canScrollRight ? 'true' : 'false'}
          >
            <div
              ref={editorTabsRef}
              role="tablist"
              className={`${styles.editorTabsList} ${
                tabsScrollState.hasOverflow ? styles.editorTabsListOverflow : ''
              }`}
              onScroll={updateTabsScrollState}
            >
              {editorTabs.map(({ id, label, icon: Icon }) => {
                const isSelected = activeTab === id;
                return (
                  <button
                    key={id}
                    ref={(el) => {
                      editorTabBtnRefs.current[id] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`${styles.editorTabBtn} ${isSelected ? styles.editorTabBtnActive : ''}`}
                    onClick={() => setActiveTab(id)}
                  >
                    <Icon size={15} strokeWidth={1.85} aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {tabsScrollState.hasOverflow && (
            <div className={styles.editorTabsIndicatorRow} aria-hidden="true">
              <div className={styles.editorTabsScrollTrack}>
                <div
                  className={styles.editorTabsScrollThumb}
                  style={{
                    width: `${tabsScrollState.thumbWidthPct}%`,
                    transform: `translateX(${tabsScrollState.thumbShiftPct}%)`,
                  }}
                />
              </div>
              <span className={styles.editorTabsScrollHint}>
                {tabsScrollState.canScrollLeft && <ChevronLeft size={12} strokeWidth={2} />}
                <span>Deslizá</span>
                {tabsScrollState.canScrollRight && <ChevronRight size={12} strokeWidth={2} />}
              </span>
            </div>
          )}
        </nav>

        <div className={styles.editorGrid}>
          <div ref={controlsColumnRef} className={styles.controlsColumn} role="tabpanel">
            {activeTab === 'packs' && (
              <StylePacksSection draft={draft} onApplyPack={handleApplyPack} />
            )}

            {activeTab === 'colors' && (
              <ColorsAndBackgroundSection
                draft={draft}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                filteredPresets={filteredPresets}
                activePaletteLabel={activePaletteLabel}
                activeSurfaceLabel={activeSurfaceLabel}
                activeBgStyleLabel={activeBgStyleLabel}
                activeIntensityLabel={activeIntensityLabel}
                activeDefaultModeLabel={activeDefaultModeLabel}
                primaryHexDisplay={primaryHexDisplay}
                accentHexDisplay={accentHexDisplay}
                bgHexDisplay={bgHexDisplay}
                effectiveLightBrand={effectiveLightBrand}
                effectivePreviewBrand={effectivePreviewBrand}
                effectiveLightSurface={effectiveLightSurface}
                effectiveDarkSurface={effectiveDarkSurface}
                effectivePreviewSurface={effectivePreviewSurface}
                lightContrastSummary={lightContrastSummary}
                darkContrastSummary={darkContrastSummary}
                previewMode={previewMode}
                onSelectPreset={handleSelectPreset}
                onHexInputChange={handleHexInputChange}
                onColorPickerChange={handleColorPickerChange}
                onClearHexDraft={handleClearHexDraft}
                onSetPreviewModeOverride={setPreviewModeOverride}
                updateDraft={pushDraft}
              />
            )}

            {activeTab === 'typography' && (
              <TypographyAndGeometrySection
                draft={draft}
                previewCssVars={previewCssVars}
                activeFontLabel={activeFontLabel}
                activeTextScaleLabel={activeTextScaleLabel}
                activeShapeLabel={activeShapeLabel}
                activeSurfaceStyleLabel={activeSurfaceStyleLabel}
                activeButtonStyleLabel={activeButtonStyleLabel}
                activeDensityLabel={activeDensityLabel}
                updateDraft={pushDraft}
              />
            )}

            {activeTab === 'storefront' && (
              <HeroAndStorefrontSection
                draft={draft}
                ownerPhone={owner.phone}
                portfolioCount={portfolioItems.length}
                activeHeroLayoutLabel={activeHeroLayoutLabel}
                activeHeroShapeLabel={activeHeroShapeLabel}
                activeHeroFrameLabel={activeHeroFrameLabel}
                activeHeroCopyLabel={activeHeroCopyLabel}
                updateDraft={pushDraft}
              />
            )}
          </div>

          {!isCompactViewport && (
            <AppearanceLivePreview
              draft={draft}
              published={savedAppearance}
              hasChanges={hasChanges}
              previewMode={previewMode}
              onPreviewModeChange={(m) => setPreviewModeOverride(m)}
              owner={owner}
              defaults={defaults}
              portfolioItems={portfolioItems}
            />
          )}
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

      {isCompactViewport &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            {isMobilePreviewVisible && (
              <div
                className={styles.mobilePreviewBackdrop}
                onClick={() => setMobilePreviewOpen(false)}
              >
                <div
                  id="appearance-mobile-preview-dialog"
                  className={styles.mobilePreviewDialog}
                  role="dialog"
                  aria-modal="true"
                  aria-label={APPEARANCE_SETTINGS_TEXTS.preview.mobileToggle.dialogAria}
                  onClick={(e) => e.stopPropagation()}
                >
                  <AppearanceLivePreview
                    draft={draft}
                    published={savedAppearance}
                    hasChanges={hasChanges}
                    previewMode={previewMode}
                    onPreviewModeChange={(m) => setPreviewModeOverride(m)}
                    owner={owner}
                    defaults={defaults}
                    portfolioItems={portfolioItems}
                    isFloating
                    onCloseFloating={() => setMobilePreviewOpen(false)}
                  />
                </div>
              </div>
            )}

            {showUnifiedMobileDock ? (
              <div
                className={styles.mobileSaveDock}
                role="region"
                aria-label="Acciones rápidas de guardado y vista previa"
              >
                <div className={styles.mobileSaveDockTop}>
                  <span className={`${styles.statusBadge} ${styles.statusUnsaved}`}>
                    {APPEARANCE_SETTINGS_TEXTS.header.unsavedBadge}
                  </span>
                  <button
                    type="button"
                    className={styles.mobileDockPreviewBtn}
                    aria-expanded={false}
                    aria-controls="appearance-mobile-preview-dialog"
                    onClick={() => setMobilePreviewOpen(true)}
                  >
                    <Eye size={14} strokeWidth={2} aria-hidden="true" />
                    <span>{APPEARANCE_SETTINGS_TEXTS.preview.mobileToggle.showLabel}</span>
                  </button>
                </div>

                <div className={styles.mobileSaveDockActions}>
                  <button
                    type="button"
                    className={styles.mobileDockUndoBtn}
                    onClick={undo}
                    disabled={!canUndo || saving || resetting}
                    title={APPEARANCE_SETTINGS_TEXTS.actions.undo}
                    aria-label={APPEARANCE_SETTINGS_TEXTS.actions.undo}
                  >
                    <Undo2 size={15} strokeWidth={1.9} aria-hidden="true" />
                    <span className={styles.mobileDockUndoLabel}>
                      {APPEARANCE_SETTINGS_TEXTS.actions.undo}
                    </span>
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDiscard}
                    disabled={saving || resetting}
                  >
                    {APPEARANCE_SETTINGS_TEXTS.actions.discardShort}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className={styles.mobileDockSaveBtn}
                    onClick={handleSave}
                    disabled={saving || resetting}
                    leftIcon={<Save size={14} strokeWidth={1.75} />}
                  >
                    {saving
                      ? APPEARANCE_SETTINGS_TEXTS.actions.saving
                      : APPEARANCE_SETTINGS_TEXTS.actions.saveShort}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={styles.mobilePreviewFab}
                data-open={isMobilePreviewVisible ? 'true' : 'false'}
                aria-expanded={isMobilePreviewVisible}
                aria-controls="appearance-mobile-preview-dialog"
                onClick={() => setMobilePreviewOpen((prev) => !prev)}
              >
                {isMobilePreviewVisible ? (
                  <>
                    <EyeOff size={16} strokeWidth={1.85} aria-hidden="true" />
                    <span>{APPEARANCE_SETTINGS_TEXTS.preview.mobileToggle.hideLabel}</span>
                  </>
                ) : (
                  <>
                    <Eye size={16} strokeWidth={1.85} aria-hidden="true" />
                    <span>{APPEARANCE_SETTINGS_TEXTS.preview.mobileToggle.showLabel}</span>
                  </>
                )}
              </button>
            )}
          </>,
          document.querySelector('[data-admin-layout="true"]') ?? document.body
        )}
    </div>
  );
};

export default AppearanceSettings;
