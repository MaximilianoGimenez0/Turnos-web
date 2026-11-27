import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, QrCode } from 'lucide-react';
import { FONT_PAIRING_MAP } from '../../../config/themePresets';
import { useOwnerInfo } from '../../../context/OwnerInfoContext';
import { useTenant } from '../../../context/TenantContext';
import {
  ensureFontPairingLoaded,
  hexToRgb,
  normalizeTenantAppearance,
  resolveEffectiveBrandHex,
  resolveEffectiveSurfaceTokens,
} from '../../../services/themeEngine';
import { BUSINESS_CARD_GENERATOR_TEXTS } from '../../../texts/components/admin/BusinessCardGenerator';
import {
  buildQrSvg,
  downloadCanvasAsPng,
  drawQrToCanvas,
  drawRoundedRect,
  loadImageSafe,
} from '../../../utils/qrGenerator';
import { Button } from '../../common/Button/Button';
import styles from './BusinessCardGenerator.module.css';

const CARD_EXPORT_WIDTH = 1600;
const CARD_EXPORT_HEIGHT = 900;
const QR_ONLY_EXPORT_SIZE = 800;

const drawWrappedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): void => {
  const words = text.trim().split(/\s+/);
  let line = '';
  let drawnLines = 0;

  for (let i = 0; i < words.length; i += 1) {
    const candidate = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(candidate).width > maxWidth && line) {
      drawnLines += 1;
      const isLast = drawnLines >= maxLines;
      const output = isLast && i < words.length ? `${line.slice(0, -1)}…` : line;
      ctx.fillText(output, x, y + (drawnLines - 1) * lineHeight);
      if (isLast) return;
      line = words[i];
    } else {
      line = candidate;
    }
  }

  if (line && drawnLines < maxLines) {
    ctx.fillText(line, x, y + drawnLines * lineHeight);
  }
};

export const BusinessCardGenerator: React.FC = () => {
  const { slug, name, appearance } = useTenant();
  const { owner } = useOwnerInfo();

  const normalizedAppearance = useMemo(
    () => normalizeTenantAppearance(appearance),
    [appearance]
  );

  const [cardMode, setCardMode] = useState<'light' | 'dark'>(
    normalizedAppearance.defaultMode === 'dark' ? 'dark' : 'light'
  );
  const [copied, setCopied] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<'front' | 'back' | 'qr' | null>(null);

  const cleanSlug = (slug || 'demo').trim();
  const businessName = owner.businessName || owner.name || name || 'Turneado';

  const publicUrl = useMemo(() => {
    const isLocalHost =
      typeof window !== 'undefined' &&
      /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
    const origin =
      typeof window !== 'undefined' && !isLocalHost
        ? window.location.origin
        : 'https://turneado.app';
    return `${origin}/${cleanSlug}`;
  }, [cleanSlug]);

  const displayUrl = useMemo(() => publicUrl.replace(/^https?:\/\//i, ''), [publicUrl]);

  const palette = useMemo(() => {
    const surface = resolveEffectiveSurfaceTokens(normalizedAppearance, cardMode);
    const { primary, accent } = resolveEffectiveBrandHex(normalizedAppearance, cardMode);
    const fonts = FONT_PAIRING_MAP[normalizedAppearance.fontPairing];
    const pRgb = hexToRgb(primary);
    const aRgb = hexToRgb(accent);
    return {
      surface,
      primary,
      accent,
      fonts,
      primarySoft: `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${cardMode === 'light' ? 0.14 : 0.22})`,
      accentSoft: `rgba(${aRgb.r}, ${aRgb.g}, ${aRgb.b}, ${cardMode === 'light' ? 0.13 : 0.18})`,
    };
  }, [normalizedAppearance, cardMode]);

  const qrSvgMarkup = useMemo(
    () =>
      buildQrSvg(publicUrl, {
        background: '#ffffff',
        moduleColor: '#1f1916',
        finderAccentColor: palette.primary,
        label: `QR de ${businessName}`,
        quietZone: 1,
      }),
    [publicUrl, palette.primary, businessName]
  );

  const initials = useMemo(
    () =>
      businessName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'T',
    [businessName]
  );

  const stageVars = useMemo(
    () =>
      ({
        '--card-bg': palette.surface.bgBody,
        '--card-surface': palette.surface.bgSurface,
        '--card-border': palette.surface.borderMedium,
        '--card-text': palette.surface.textPrimary,
        '--card-muted': palette.surface.textMuted,
        '--card-primary': palette.primary,
        '--card-primary-soft': palette.primarySoft,
        '--card-accent-soft': palette.accentSoft,
        fontFamily: palette.fonts.body,
      }) as React.CSSProperties,
    [palette]
  );

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore clipboard failures on insecure origins
    }
  };

  const paintCardBackdrop = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = palette.surface.bgBody;
    ctx.fillRect(0, 0, CARD_EXPORT_WIDTH, CARD_EXPORT_HEIGHT);

    const p = hexToRgb(palette.primary);
    const a = hexToRgb(palette.accent);

    const g1 = ctx.createRadialGradient(220, 150, 20, 220, 150, 820);
    g1.addColorStop(0, `rgba(${p.r}, ${p.g}, ${p.b}, ${cardMode === 'light' ? 0.16 : 0.22})`);
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, CARD_EXPORT_WIDTH, CARD_EXPORT_HEIGHT);

    const g2 = ctx.createRadialGradient(1420, 760, 20, 1420, 760, 720);
    g2.addColorStop(0, `rgba(${a.r}, ${a.g}, ${a.b}, ${cardMode === 'light' ? 0.14 : 0.18})`);
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, CARD_EXPORT_WIDTH, CARD_EXPORT_HEIGHT);

    ctx.strokeStyle = palette.surface.borderMedium;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 28, 28, CARD_EXPORT_WIDTH - 56, CARD_EXPORT_HEIGHT - 56, 36);
    ctx.stroke();
  };

  const handleDownloadFront = async () => {
    setDownloadingKey('front');
    try {
      ensureFontPairingLoaded(normalizedAppearance.fontPairing);
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = document.createElement('canvas');
      canvas.width = CARD_EXPORT_WIDTH;
      canvas.height = CARD_EXPORT_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      paintCardBackdrop(ctx);

      const padX = 110;
      const logoSize = 148;
      const logoImg = owner.logoUrl ? await loadImageSafe(owner.logoUrl) : null;

      ctx.save();
      drawRoundedRect(ctx, padX, 110, logoSize, logoSize, logoSize / 2);
      ctx.fillStyle = palette.surface.bgSurface;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = palette.primary;
      ctx.stroke();

      if (logoImg) {
        ctx.save();
        drawRoundedRect(ctx, padX + 4, 114, logoSize - 8, logoSize - 8, (logoSize - 8) / 2);
        ctx.clip();
        ctx.drawImage(logoImg, padX + 4, 114, logoSize - 8, logoSize - 8);
        ctx.restore();
      } else {
        ctx.fillStyle = palette.primary;
        ctx.font = `700 54px ${palette.fonts.display}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, padX + logoSize / 2, 110 + logoSize / 2 + 2);
      }
      ctx.restore();

      const textX = padX + logoSize + 44;
      const maxTextWidth = CARD_EXPORT_WIDTH - textX - padX;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      ctx.fillStyle = palette.primary;
      ctx.font = `600 26px ${palette.fonts.body}`;
      ctx.fillText(
        (owner.role || 'RESERVA ONLINE').toUpperCase(),
        textX,
        162
      );

      ctx.fillStyle = palette.surface.textPrimary;
      ctx.font = `600 66px ${palette.fonts.display}`;
      ctx.fillText(businessName, textX, 238, maxTextWidth);

      const bioText =
        owner.description ||
        'Reservá tu turno online en segundos con confirmación inmediata.';
      ctx.fillStyle = palette.surface.textMuted;
      ctx.font = `400 32px ${palette.fonts.body}`;
      drawWrappedText(ctx, bioText, padX, 410, CARD_EXPORT_WIDTH - padX * 2, 48, 3);

      // Divider
      ctx.strokeStyle = palette.surface.borderMedium;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padX, 668);
      ctx.lineTo(CARD_EXPORT_WIDTH - padX, 668);
      ctx.stroke();

      // Contact info bottom left
      const contactParts: string[] = [];
      if (owner.instagram) {
        contactParts.push(
          owner.instagram.startsWith('@') ? owner.instagram : `@${owner.instagram}`
        );
      }
      if (owner.phone) contactParts.push(`WhatsApp: ${owner.phone}`);
      if (owner.location) contactParts.push(owner.location);

      ctx.fillStyle = palette.surface.textMuted;
      ctx.font = `500 28px ${palette.fonts.body}`;
      contactParts.slice(0, 2).forEach((line, idx) => {
        ctx.fillText(line, padX, 732 + idx * 44, 840);
      });

      // Pill bottom right
      ctx.font = `600 26px ${palette.fonts.body}`;
      const badgeLabel = displayUrl;
      const badgeW = Math.min(540, ctx.measureText(badgeLabel).width + 60);
      const badgeX = CARD_EXPORT_WIDTH - padX - badgeW;
      const badgeY = 716;

      drawRoundedRect(ctx, badgeX, badgeY, badgeW, 64, 32);
      ctx.fillStyle = palette.primarySoft;
      ctx.fill();

      ctx.fillStyle = palette.primary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeLabel, badgeX + badgeW / 2, badgeY + 32, badgeW - 36);

      await downloadCanvasAsPng(canvas, `tarjeta-frente-${cleanSlug}.png`);
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadBack = async () => {
    setDownloadingKey('back');
    try {
      ensureFontPairingLoaded(normalizedAppearance.fontPairing);
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = document.createElement('canvas');
      canvas.width = CARD_EXPORT_WIDTH;
      canvas.height = CARD_EXPORT_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      paintCardBackdrop(ctx);

      const padX = 110;
      const qrSize = 480;
      const qrX = CARD_EXPORT_WIDTH - padX - qrSize - 32;
      const qrY = (CARD_EXPORT_HEIGHT - qrSize - 64) / 2;

      // QR card holder
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 14;
      drawRoundedRect(ctx, qrX, qrY, qrSize + 64, qrSize + 64, 36);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();

      drawQrToCanvas(ctx, publicUrl, {
        x: qrX + 32,
        y: qrY + 32,
        sizePx: qrSize,
        background: '#ffffff',
        moduleColor: '#1f1916',
        finderAccentColor: palette.primary,
        quietZone: 1,
        radiusPx: 16,
      });

      const leftMaxW = qrX - padX - 70;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      ctx.fillStyle = palette.primary;
      ctx.font = `600 28px ${palette.fonts.body}`;
      ctx.fillText(businessName.toUpperCase(), padX, 200, leftMaxW);

      ctx.fillStyle = palette.surface.textPrimary;
      ctx.font = `600 54px ${palette.fonts.display}`;
      drawWrappedText(
        ctx,
        BUSINESS_CARD_GENERATOR_TEXTS.preview.scanCta,
        padX,
        290,
        leftMaxW,
        68,
        3
      );

      // Feature pills
      let pillX = padX;
      let pillY = 535;
      ctx.font = `500 25px ${palette.fonts.body}`;
      for (const feat of BUSINESS_CARD_GENERATOR_TEXTS.preview.features) {
        const w = ctx.measureText(feat).width + 44;
        if (pillX + w > padX + leftMaxW) {
          pillX = padX;
          pillY += 64;
        }
        drawRoundedRect(ctx, pillX, pillY, w, 48, 24);
        ctx.fillStyle = palette.surface.bgSurface;
        ctx.fill();
        ctx.strokeStyle = palette.surface.borderMedium;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = palette.surface.textPrimary;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(feat, pillX + 22, pillY + 24);
        pillX += w + 14;
      }

      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = palette.primary;
      ctx.font = `600 32px ${palette.fonts.body}`;
      ctx.fillText(displayUrl, padX, 748, leftMaxW);

      await downloadCanvasAsPng(canvas, `tarjeta-dorso-qr-${cleanSlug}.png`);
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadQrOnly = async () => {
    setDownloadingKey('qr');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = QR_ONLY_EXPORT_SIZE;
      canvas.height = QR_ONLY_EXPORT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      drawQrToCanvas(ctx, publicUrl, {
        x: 0,
        y: 0,
        sizePx: QR_ONLY_EXPORT_SIZE,
        background: '#ffffff',
        moduleColor: '#1f1916',
        finderAccentColor: palette.primary,
        quietZone: 2,
        radiusPx: 0,
      });

      await downloadCanvasAsPng(canvas, `qr-${cleanSlug}.png`);
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <section className={styles.container} aria-labelledby="business-card-generator-title">
      <div className={styles.header}>
        <h2 id="business-card-generator-title" className={styles.title}>
          {BUSINESS_CARD_GENERATOR_TEXTS.header.title}
        </h2>
        <p className={styles.subtitle}>{BUSINESS_CARD_GENERATOR_TEXTS.header.subtitle}</p>
      </div>

      <div className={styles.controlsRow}>
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>
            {BUSINESS_CARD_GENERATOR_TEXTS.controls.styleLabel}
          </span>
          <div className={styles.segmented} role="group" aria-label={BUSINESS_CARD_GENERATOR_TEXTS.controls.styleLabel}>
            <button
              type="button"
              className={`${styles.segmentBtn} ${cardMode === 'light' ? styles.segmentBtnActive : ''}`}
              onClick={() => setCardMode('light')}
            >
              {BUSINESS_CARD_GENERATOR_TEXTS.controls.styleLight}
            </button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${cardMode === 'dark' ? styles.segmentBtnActive : ''}`}
              onClick={() => setCardMode('dark')}
            >
              {BUSINESS_CARD_GENERATOR_TEXTS.controls.styleDark}
            </button>
          </div>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>
            {BUSINESS_CARD_GENERATOR_TEXTS.controls.publicUrlLabel}
          </span>
          <div className={styles.urlBox}>
            <span className={styles.urlText} title={publicUrl}>
              {publicUrl}
            </span>
            <button type="button" className={styles.copyBtn} onClick={handleCopyUrl}>
              {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
              <span>
                {copied
                  ? BUSINESS_CARD_GENERATOR_TEXTS.controls.copiedUrl
                  : BUSINESS_CARD_GENERATOR_TEXTS.controls.copyUrl}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className={styles.cardsGrid}>
        <div className={styles.cardColumn}>
          <span className={styles.sideLabel}>
            {BUSINESS_CARD_GENERATOR_TEXTS.preview.frontLabel}
          </span>
          <div className={styles.cardStage} style={stageVars}>
            <div className={styles.cardGlow} aria-hidden="true" />
            <div className={styles.cardFrontTop}>
              <div className={styles.brandRow}>
                <div className={styles.logoBox}>
                  {owner.logoUrl ? (
                    <img
                      src={owner.logoUrl}
                      alt={businessName}
                      className={styles.logoImg}
                    />
                  ) : (
                    <span className={styles.logoMonogram}>{initials}</span>
                  )}
                </div>
                <div className={styles.brandMeta}>
                  <span className={styles.cardKicker}>
                    {owner.role || 'Agenda Online'}
                  </span>
                  <h3
                    className={styles.cardName}
                    style={{ fontFamily: palette.fonts.display }}
                  >
                    {businessName}
                  </h3>
                </div>
              </div>
            </div>

            <p className={styles.cardBio}>
              {owner.description ||
                'Reservá tu turno online en segundos con confirmación inmediata.'}
            </p>

            <div className={styles.cardFrontFooter}>
              <div className={styles.contactStack}>
                {owner.instagram && (
                  <span className={styles.contactLine}>
                    {owner.instagram.startsWith('@')
                      ? owner.instagram
                      : `@${owner.instagram}`}
                  </span>
                )}
                {owner.phone && (
                  <span className={styles.contactLine}>WhatsApp: {owner.phone}</span>
                )}
              </div>
              <span className={styles.cardSlugBadge}>{displayUrl}</span>
            </div>
          </div>
        </div>

        <div className={styles.cardColumn}>
          <span className={styles.sideLabel}>
            {BUSINESS_CARD_GENERATOR_TEXTS.preview.backLabel}
          </span>
          <div className={styles.cardStage} style={stageVars}>
            <div className={styles.cardGlow} aria-hidden="true" />
            <div className={styles.cardBackLayout}>
              <div className={styles.backInfo}>
                <span className={styles.cardKicker}>{businessName}</span>
                <p
                  className={styles.backHeadline}
                  style={{ fontFamily: palette.fonts.display }}
                >
                  {BUSINESS_CARD_GENERATOR_TEXTS.preview.scanCta}
                </p>
                <div className={styles.featureList}>
                  {BUSINESS_CARD_GENERATOR_TEXTS.preview.features.map((feat) => (
                    <span key={feat} className={styles.featurePill}>
                      {feat}
                    </span>
                  ))}
                </div>
                <span className={styles.backUrl}>{displayUrl}</span>
              </div>

              <div className={styles.qrFrame}>
                <div
                  className={styles.qrSvgWrap}
                  dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.actionsRow}>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Download size={16} aria-hidden="true" />}
          onClick={handleDownloadFront}
          disabled={downloadingKey !== null}
        >
          {BUSINESS_CARD_GENERATOR_TEXTS.actions.downloadFront}
        </Button>
        <Button
          variant="secondary"
          size="md"
          leftIcon={<Download size={16} aria-hidden="true" />}
          onClick={handleDownloadBack}
          disabled={downloadingKey !== null}
        >
          {BUSINESS_CARD_GENERATOR_TEXTS.actions.downloadBack}
        </Button>
        <Button
          variant="outline"
          size="md"
          leftIcon={<QrCode size={16} aria-hidden="true" />}
          onClick={handleDownloadQrOnly}
          disabled={downloadingKey !== null}
        >
          {BUSINESS_CARD_GENERATOR_TEXTS.actions.downloadQrOnly}
        </Button>
      </div>
    </section>
  );
};
