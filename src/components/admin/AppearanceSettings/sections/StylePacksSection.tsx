import React, { useMemo } from 'react';
import { Check, Sparkles } from 'lucide-react';
import {
  FONT_PAIRING_MAP,
  PALETTE_PRESET_MAP,
  STYLE_PACKS,
  SURFACE_TEMPERATURES,
} from '../../../../config/themePresets';
import { areAppearanceConfigsEqual } from '../../../../services/themeEngine';
import type { TenantAppearanceConfig } from '../../../../types';
import { APPEARANCE_SETTINGS_TEXTS } from '../../../../texts';
import styles from '../AppearanceSettings.module.css';

interface StylePacksSectionProps {
  draft: TenantAppearanceConfig;
  onApplyPack: (packAppearance: TenantAppearanceConfig) => void;
}

export const StylePacksSection: React.FC<StylePacksSectionProps> = ({ draft, onApplyPack }) => {
  const activePackId = useMemo(() => {
    const found = STYLE_PACKS.find((pack) =>
      areAppearanceConfigsEqual(draft, pack.appearance)
    );
    return found?.id ?? null;
  }, [draft]);

  const activePackLabel = activePackId
    ? STYLE_PACKS.find((p) => p.id === activePackId)?.name ||
      APPEARANCE_SETTINGS_TEXTS.sections.packs.activePackBadge
    : APPEARANCE_SETTINGS_TEXTS.sections.packs.customMixChip;

  return (
    <div className={styles.sectionBlock}>
      <div className={styles.sectionHeaderBar}>
        <div className={styles.sectionHeaderLeft}>
          <span className={styles.sectionStepPill}>
            <Sparkles size={13} strokeWidth={1.9} aria-hidden="true" />
            <span>{APPEARANCE_SETTINGS_TEXTS.sections.packs.stepNum}</span>
          </span>
          <div className={styles.sectionHeaderText}>
            <h3 className={styles.sectionTitle}>
              {APPEARANCE_SETTINGS_TEXTS.sections.packs.title}
            </h3>
            <p className={styles.sectionSubtitle}>
              {APPEARANCE_SETTINGS_TEXTS.sections.packs.description}
            </p>
          </div>
        </div>
        <span className={styles.activeValueChip}>{activePackLabel}</span>
      </div>

      <div className={styles.sectionBody}>
        <div className={`${styles.featureGroupBox} ${styles.featureToneLight}`}>
          <div className={styles.packsGrid}>
            {STYLE_PACKS.map((pack) => {
              const isActive = activePackId === pack.id;
              const palette = PALETTE_PRESET_MAP[pack.appearance.palettePreset];
              const tempKey = pack.appearance.surfaceTemperature ?? palette.defaultSurface;
              const surface =
                SURFACE_TEMPERATURES[tempKey][
                  pack.appearance.defaultMode === 'dark' ? 'dark' : 'light'
                ];
              const primaryColor =
                pack.appearance.defaultMode === 'dark'
                  ? palette.primaryDark
                  : palette.primaryLight;
              const font = FONT_PAIRING_MAP[pack.appearance.fontPairing];

              return (
                <button
                  key={pack.id}
                  type="button"
                  className={`${styles.packCard} ${isActive ? styles.presetCardActive : ''}`}
                  onClick={() => onApplyPack(pack.appearance)}
                  aria-pressed={isActive}
                >
                  <div className={styles.packCardTop}>
                    <div className={styles.presetSwatches}>
                      <span
                        className={styles.swatchDot}
                        style={{ backgroundColor: surface.bgBody }}
                        title="Fondo"
                      />
                      <span
                        className={styles.swatchDot}
                        style={{ backgroundColor: primaryColor }}
                        title="Principal"
                      />
                      <span
                        className={styles.swatchDot}
                        style={{ backgroundColor: palette.accentLight }}
                        title="Acento"
                      />
                    </div>
                    <span className={styles.packNicheChip}>{pack.niche}</span>
                    {isActive && (
                      <span className={styles.presetCheck} aria-hidden="true">
                        <Check size={15} strokeWidth={2.4} />
                      </span>
                    )}
                  </div>

                  <div className={styles.packBody}>
                    <span
                      className={styles.packName}
                      style={{ fontFamily: font.display }}
                    >
                      {pack.name}
                    </span>
                    <span className={styles.presetDesc}>{pack.description}</span>
                  </div>

                  <div className={styles.packTagsRow}>
                    {pack.tags.map((tag) => (
                      <span key={tag} className={styles.packTagPill}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StylePacksSection;
