import React, { useEffect } from 'react';
import { SlidersHorizontal, Type } from 'lucide-react';
import {
  BUTTON_STYLES,
  DENSITY_SCALES,
  FONT_PAIRINGS,
  SHAPE_PRESETS,
  SURFACE_STYLES,
  TEXT_SCALES,
} from '../../../../config/themePresets';
import { ensureAllFontPairingPreviewsLoaded } from '../../../../services/themeEngine';
import type { TenantAppearanceConfig } from '../../../../types';
import { APPEARANCE_SETTINGS_TEXTS } from '../../../../texts';
import styles from '../AppearanceSettings.module.css';

interface TypographyAndGeometrySectionProps {
  draft: TenantAppearanceConfig;
  previewCssVars: Record<string, string>;
  activeFontLabel: string;
  activeTextScaleLabel: string;
  activeShapeLabel: string;
  activeSurfaceStyleLabel: string;
  activeButtonStyleLabel: string;
  activeDensityLabel: string;
  updateDraft: (
    updater: (prev: TenantAppearanceConfig) => TenantAppearanceConfig,
    coalesceKey?: string
  ) => void;
}

export const TypographyAndGeometrySection: React.FC<TypographyAndGeometrySectionProps> = ({
  draft,
  previewCssVars,
  activeFontLabel,
  activeTextScaleLabel,
  activeShapeLabel,
  activeSurfaceStyleLabel,
  activeButtonStyleLabel,
  activeDensityLabel,
  updateDraft,
}) => {
  useEffect(() => {
    ensureAllFontPairingPreviewsLoaded();
  }, []);

  return (
    <>
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
                    onClick={() => updateDraft((prev) => ({ ...prev, fontPairing: pairing.id }))}
                    aria-pressed={isActive}
                  >
                    <span className={styles.fontSample} style={{ fontFamily: pairing.display }}>
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
                    onClick={() => updateDraft((prev) => ({ ...prev, shapePreset: shape.id }))}
                    aria-pressed={isActive}
                  >
                    <div className={styles.optionCardTop}>
                      <span
                        className={styles.shapePreviewGlyph}
                        style={{
                          borderRadius: shape.radii.button,
                          borderColor: previewCssVars['--color-primary'],
                        }}
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
                    onClick={() => updateDraft((prev) => ({ ...prev, surfaceStyle: styleOpt.id }))}
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
            {/* Render button samples inside the drafted palette/radii instead of Admin's palette */}
            <div
              className={styles.segmentedGrid}
              style={{
                ['--swatch-primary' as string]: previewCssVars['--color-primary'],
                ['--swatch-primary-light' as string]: previewCssVars['--color-primary-light'],
                ['--swatch-primary-border' as string]: previewCssVars['--color-primary-border'],
                ['--swatch-inverse' as string]: previewCssVars['--text-inverse'],
                ['--swatch-btn-radius' as string]: previewCssVars['--radius-button'],
              }}
            >
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
                    onClick={() => updateDraft((prev) => ({ ...prev, buttonStyle: btnOpt.id }))}
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
    </>
  );
};

export default TypographyAndGeometrySection;
