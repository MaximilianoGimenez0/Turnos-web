import * as logger from 'firebase-functions/logger';
import { maskEmail } from './bookingValidation';
import { normalizeInstagramHandle, sanitizeEmailLogoUrl } from './ownerProfile';
import { formatSesFromHeader, isSesConfigured, sendSesEmail } from './sesMailer';
import {
  DEFAULT_EMAIL_THEME_PALETTE,
  resolveEmailThemeForAppearance,
  type EmailThemePalette,
  type SanitizedTenantAppearance,
} from './tenantAppearance';
import {
  resolveBookingSurcharge,
  type SurchargeType,
} from './surcharge';

export const EMAIL_THEME = {
  bgBody: '#faf7f2',
  bgSurface: '#ffffff',
  bgSubtle: '#f3efe7',
  borderSubtle: '#e6dfd5',
  borderMedium: '#d8cfc2',
  primary: '#9e4f5e',
  primaryLight: '#f7ecee',
  primaryBorder: '#e2c3c9',
  primaryDark: '#743541',
  accent: '#8c7258',
  accentLight: '#f4efe9',
  accentBorder: '#ddd2c5',
  textPrimary: '#231c19',
  textSecondary: '#5c514b',
  textMuted: '#7e716a',
  success: '#2c6e49',
  successBg: '#edf5f0',
  successBorder: '#bfd9c9',
  successText: '#225438',
  warning: '#9a5b13',
  warningBg: '#fbf4ea',
  warningBorder: '#ebd2b0',
  warningText: '#7d480d',
  danger: '#a63a47',
  dangerBg: '#fbf0f1',
  dangerBorder: '#eabdc3',
  dangerText: '#8f2d39',
} as const;

const BODY_FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO_FONT_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
const DEFAULT_EMAIL_TZ = 'America/Argentina/Buenos_Aires';

export const resolveEmailTimezone = (timezone?: string): string => {
  const trimmed = typeof timezone === 'string' ? timezone.trim() : '';
  if (!trimmed) return DEFAULT_EMAIL_TZ;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return trimmed;
  } catch {
    return DEFAULT_EMAIL_TZ;
  }
};

export interface PriceExtra {
  id?: string;
  name: string;
  price: number;
}

export interface BookedServiceExtra {
  id?: string;
  name: string;
  price: number;
  selected: boolean;
}

export interface BookedServiceItem {
  serviceId?: string;
  name: string;
  basePrice: number;
  durationMinutes?: number;
  extras?: BookedServiceExtra[];
}

export interface BookingEmailPayload {
  tenantId?: string;
  tenantSlug?: string;
  timezone?: string;
  slotId: string;
  paymentId: string;
  serviceName: string;
  datetime?: string;
  formattedDate?: string;
  formattedTime?: string;
  depositAmount: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientNotes?: string;
  bookedServices?: BookedServiceItem[];
  selectedServices?: string[];
  selectedRules?: string[];
  selectedExtras?: PriceExtra[];
  basePrice?: number;
  extrasPrice?: number;
  surchargeType?: SurchargeType;
  surchargeValue?: number;
  surchargeAmount?: number;
  surchargeReason?: string;
  estimatedDurationMinutes?: number;
  estimatedDuration?: string;
  estimatedPrice?: number;
  ownerEmail?: string;
  businessName?: string;
  businessLocation?: string;
  businessPhone?: string;
  businessInstagram?: string;
  businessLogoUrl?: string;
  appearance?: Partial<SanitizedTenantAppearance> | Record<string, unknown> | null;
  adminUrl?: string;
}

export interface SendEmailsOptions {
  sendClient?: boolean;
  sendOwner?: boolean;
}

export interface SendEmailsResult {
  clientSent: boolean;
  ownerSent: boolean;
  clientAttempted: boolean;
  ownerAttempted: boolean;
  clientMessageId?: string;
  ownerMessageId?: string;
  clientError?: string;
  ownerError?: string;
}

export interface PaymentIncidentPayload {
  tenantId?: string;
  tenantSlug?: string;
  timezone?: string;
  kind: 'double_payment_incident' | 'late_payment_conflict';
  slotId: string;
  paymentId: string;
  paidAmount: number;
  datetime?: string;
  incomingClientName: string;
  incomingClientEmail: string;
  incomingClientPhone?: string;
  existingPaymentId?: string;
  existingClientName?: string;
  ownerEmail: string;
  businessName?: string;
  appearance?: Partial<SanitizedTenantAppearance> | Record<string, unknown> | null;
  adminUrl?: string;
}

export const buildTenantFromHeader = (businessName?: string): string =>
  formatSesFromHeader(businessName);

export const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const formatCurrency = (amount?: number): string => {
  const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `$${value.toLocaleString('es-AR')}`;
};

const capitalizeFirst = (value: string): string => {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const formatBookingDate = (
  datetime?: string,
  fallbackDate?: string,
  timezone?: string
): string => {
  if (datetime) {
    const d = new Date(datetime);
    if (!isNaN(d.getTime())) {
      return capitalizeFirst(
        d.toLocaleDateString('es-AR', {
          timeZone: resolveEmailTimezone(timezone),
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    }
  }
  return fallbackDate ? capitalizeFirst(fallbackDate.trim()) : 'A coordinar';
};

export const formatBookingTime = (
  datetime?: string,
  fallbackTime?: string,
  timezone?: string
): string => {
  if (datetime) {
    const d = new Date(datetime);
    if (!isNaN(d.getTime())) {
      const timeStr = d.toLocaleTimeString('es-AR', {
        timeZone: resolveEmailTimezone(timezone),
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `${timeStr} hs`;
    }
  }
  if (fallbackTime) {
    const clean = fallbackTime.replace(/\s*hs\.?$/i, '').trim();
    return clean ? `${clean} hs` : 'A coordinar';
  }
  return 'A coordinar';
};

const parseDurationStringToMinutes = (raw?: string): number => {
  if (!raw || typeof raw !== 'string') return 0;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return 0;

  const hoursMinsMatch = trimmed.match(/^(\d+)\s*h(?:oras?|rs?)?\s*(\d+)\s*m(?:in(?:utos?)?)?$/i);
  if (hoursMinsMatch) {
    return Number(hoursMinsMatch[1]) * 60 + Number(hoursMinsMatch[2]);
  }
  const hoursOnlyMatch = trimmed.match(/^(\d+)\s*h(?:oras?|rs?)?$/i);
  if (hoursOnlyMatch) {
    return Number(hoursOnlyMatch[1]) * 60;
  }
  const minsOnlyMatch = trimmed.match(/^(\d+)\s*(?:min(?:utos?)?|m)?$/i);
  if (minsOnlyMatch) {
    return Number(minsOnlyMatch[1]);
  }
  return 0;
};

export const formatCompactEmailDuration = (minutes?: number, fallbackText?: string): string => {
  let effectiveMinutes =
    typeof minutes === 'number' && !isNaN(minutes) && minutes > 0 ? Math.round(minutes) : 0;

  if (effectiveMinutes <= 0 && fallbackText) {
    effectiveMinutes = parseDurationStringToMinutes(fallbackText);
  }

  if (effectiveMinutes > 0) {
    const hours = Math.floor(effectiveMinutes / 60);
    const mins = effectiveMinutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  const trimmedFallback = (fallbackText || '').trim();
  return trimmedFallback || 'A coordinar';
};

const resolveEffectiveDurationMinutes = (booking: BookingEmailPayload): number => {
  if (
    typeof booking.estimatedDurationMinutes === 'number' &&
    !isNaN(booking.estimatedDurationMinutes) &&
    booking.estimatedDurationMinutes > 0
  ) {
    return Math.round(booking.estimatedDurationMinutes);
  }

  if (Array.isArray(booking.bookedServices) && booking.bookedServices.length > 0) {
    const summed = booking.bookedServices.reduce((acc, svc) => {
      const mins =
        typeof svc.durationMinutes === 'number' && !isNaN(svc.durationMinutes) && svc.durationMinutes > 0
          ? svc.durationMinutes
          : 0;
      return acc + mins;
    }, 0);
    if (summed > 0) return Math.round(summed);
  }

  return parseDurationStringToMinutes(booking.estimatedDuration);
};

export const formatTimeRange = (
  datetime?: string,
  durationMinutes?: number,
  fallbackTime?: string,
  timezone?: string
): string => {
  const tz = resolveEmailTimezone(timezone);
  if (datetime) {
    const startDate = new Date(datetime);
    if (!isNaN(startDate.getTime())) {
      const startTimeStr = startDate.toLocaleTimeString('es-AR', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      if (typeof durationMinutes === 'number' && !isNaN(durationMinutes) && durationMinutes > 0) {
        const endDate = new Date(startDate.getTime() + Math.round(durationMinutes) * 60 * 1000);
        const endTimeStr = endDate.toLocaleTimeString('es-AR', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const startDayKey = startDate.toLocaleDateString('en-CA', { timeZone: tz });
        const endDayKey = endDate.toLocaleDateString('en-CA', { timeZone: tz });
        const nextDaySuffix = startDayKey !== endDayKey ? ' (+1d)' : '';
        return `${startTimeStr} – ${endTimeStr} hs${nextDaySuffix}`;
      }

      return `${startTimeStr} hs`;
    }
  }
  return formatBookingTime(undefined, fallbackTime, timezone);
};

export const buildWhatsAppLink = (phone?: string, prefillText?: string): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;

  const base = `https://wa.me/${digits}`;
  const trimmedText = (prefillText || '').trim();
  if (!trimmedText) return base;
  return `${base}?text=${encodeURIComponent(trimmedText)}`;
};

export const buildInstagramLink = (instagram?: string): { handle: string; url: string } | null => {
  const normalized = normalizeInstagramHandle(instagram);
  if (!normalized) return null;
  return {
    handle: normalized,
    url: `https://instagram.com/${encodeURIComponent(normalized.slice(1))}`,
  };
};

export const buildAdminPanelUrl = (adminUrl?: string, tenantSlug?: string): string | null => {
  const raw = (adminUrl || process.env.CLIENT_APP_URL || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    const cleanSlug = (tenantSlug || '').trim().replace(/^\/+|\/+$/g, '');

    if (cleanSlug) {
      const encodedSlug = encodeURIComponent(cleanSlug);
      if (cleanPath.endsWith(`/${encodedSlug}/admin`) || cleanPath.endsWith(`/${cleanSlug}/admin`)) {
        parsed.pathname = cleanPath;
      } else if (cleanPath.endsWith(`/${encodedSlug}`) || cleanPath.endsWith(`/${cleanSlug}`)) {
        parsed.pathname = `${cleanPath}/admin`;
      } else {
        parsed.pathname = `${cleanPath}/${encodedSlug}/admin`;
      }
    } else {
      parsed.pathname = cleanPath.endsWith('/admin') ? cleanPath : `${cleanPath}/admin`;
    }
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
};

const isUsableEmail = (email?: string): boolean => {
  const clean = (email || '').trim();
  return Boolean(clean) && clean.includes('@') && !clean.includes('placeholder');
};

const buildPreheaderHtml = (
  text: string,
  theme: EmailThemePalette = DEFAULT_EMAIL_THEME_PALETTE
): string => {
  const safe = escapeHtml(text);
  const filler = '&zwnj;&nbsp;'.repeat(48);
  return `<div style="display: none; max-height: 0; max-width: 0; overflow: hidden; opacity: 0; mso-hide: all; font-size: 1px; line-height: 1px; color: ${theme.bgBody};">${safe}${filler}</div>`;
};

type FinancialStatus = 'pending_balance' | 'paid_in_full' | 'deposit_only';

interface FinancialBreakdown {
  status: FinancialStatus;
  totalEstimated: number;
  depositPaid: number;
  salonBalance: number;
  surchargeAmount: number;
  surchargeLabel: string;
  surchargeMeta: string;
  servicesBreakdownHtml: string;
  servicesBreakdownText: string;
}

function appendSurchargeBreakdown(params: {
  booking: BookingEmailPayload;
  subtotal: number;
  theme: EmailThemePalette;
}): {
  surchargeAmount: number;
  surchargeLabel: string;
  surchargeMeta: string;
  addedToTotal: number;
  htmlRow: string;
  textLine: string;
} {
  const { booking, subtotal, theme } = params;
  const resolved = resolveBookingSurcharge({
    clientData: booking,
    subtotal,
  });

  const hasSurcharge =
    resolved.surchargeAmount > 0 ||
    (resolved.surcharge !== null &&
      resolved.surcharge.type === 'percentage' &&
      resolved.surcharge.value > 0);

  if (!hasSurcharge) {
    return {
      surchargeAmount: 0,
      surchargeLabel: '',
      surchargeMeta: '',
      addedToTotal: 0,
      htmlRow: '',
      textLine: '',
    };
  }

  const reason = resolved.surchargeReason?.trim();
  const surchargeLabel = reason ? `Recargo · ${reason}` : 'Recargo por tarifa especial';
  const isPercentage = resolved.surchargeType === 'percentage' && (resolved.surchargeValue || 0) > 0;
  const surchargeMeta = isPercentage
    ? `+${resolved.surchargeValue}% sobre servicios y extras`
    : subtotal <= 0
    ? 'A sumar al valor del servicio'
    : '';
  const metaHtml = surchargeMeta
    ? `<div style="font-size: 12px; color: ${theme.warning}; margin-top: 2px;">${escapeHtml(surchargeMeta)}</div>`
    : '';

  const htmlRow = `
    <tr style="background-color: ${theme.warningBg}; border-bottom: 1px solid ${theme.warningBorder};">
      <td style="padding: 10px 8px; vertical-align: top;">
        <div style="font-weight: 600; color: ${theme.warningText}; font-size: 13.5px;">${escapeHtml(surchargeLabel)}</div>
        ${metaHtml}
      </td>
      <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: ${theme.warningText}; font-size: 14px; vertical-align: top; white-space: nowrap; font-variant-numeric: tabular-nums;">
        +${formatCurrency(resolved.surchargeAmount)}
      </td>
    </tr>
  `;

  const textTagParts: string[] = [];
  if (reason) textTagParts.push(reason);
  else if (!isPercentage) textTagParts.push('Tarifa especial');
  if (isPercentage) textTagParts.push(`+${resolved.surchargeValue}%`);
  const textTag = textTagParts.length > 0 ? ` (${textTagParts.join(' · ')})` : '';
  const textLine = `• Recargo${textTag}: +${formatCurrency(resolved.surchargeAmount)}${
    subtotal <= 0 && !isPercentage ? ' (a sumar al servicio)' : ''
  }`;

  return {
    surchargeAmount: resolved.surchargeAmount,
    surchargeLabel: reason || (isPercentage ? `+${resolved.surchargeValue}%` : 'Tarifa especial'),
    surchargeMeta,
    addedToTotal: subtotal > 0 ? resolved.surchargeAmount : 0,
    htmlRow,
    textLine,
  };
}

function buildFinancialBreakdown(
  booking: BookingEmailPayload,
  theme: EmailThemePalette = DEFAULT_EMAIL_THEME_PALETTE
): FinancialBreakdown {
  const depositPaid = Number(booking.depositAmount) || 0;

  if (Array.isArray(booking.bookedServices) && booking.bookedServices.length > 0) {
    let calculatedTotal = 0;
    let htmlRows = '';
    const textLines: string[] = [];

    booking.bookedServices.forEach((service, sIndex) => {
      const sBase = Number(service.basePrice) || 0;
      calculatedTotal += sBase;
      const safeServiceName = escapeHtml(service.name);
      const serviceDurText =
        typeof service.durationMinutes === 'number' && service.durationMinutes > 0
          ? formatCompactEmailDuration(service.durationMinutes)
          : '';
      const durBadgeHtml = serviceDurText
        ? `<div style="font-size: 12px; color: ${theme.textMuted}; margin-top: 2px;">${escapeHtml(serviceDurText)}</div>`
        : '';

      htmlRows += `
        <tr style="border-bottom: 1px solid ${theme.borderSubtle};">
          <td style="padding: 11px 8px; vertical-align: top;">
            <div style="font-weight: 600; color: ${theme.textPrimary}; font-size: 14px;">${sIndex + 1}. ${safeServiceName}</div>
            ${durBadgeHtml}
          </td>
          <td style="padding: 11px 8px; text-align: right; font-weight: 600; color: ${theme.textPrimary}; font-size: 14px; vertical-align: top; white-space: nowrap; font-variant-numeric: tabular-nums;">
            ${formatCurrency(sBase)}
          </td>
        </tr>
      `;
      textLines.push(
        `• ${service.name}${serviceDurText ? ` (${serviceDurText})` : ''}: ${formatCurrency(sBase)}`
      );

      const selectedExtras = (service.extras || []).filter((e) => e.selected);
      if (selectedExtras.length > 0) {
        selectedExtras.forEach((extra) => {
          const ePrice = Number(extra.price) || 0;
          calculatedTotal += ePrice;
          const safeExtraName = escapeHtml(extra.name);
          htmlRows += `
            <tr style="background-color: ${theme.bgBody}; border-bottom: 1px dashed ${theme.borderSubtle};">
              <td style="padding: 8px 8px 8px 22px; color: ${theme.textSecondary}; font-size: 13px;">
                + Extra: ${safeExtraName}
              </td>
              <td style="padding: 8px 8px; text-align: right; color: ${theme.textSecondary}; font-size: 13px; white-space: nowrap; font-variant-numeric: tabular-nums;">
                +${formatCurrency(ePrice)}
              </td>
            </tr>
          `;
          textLines.push(`   + Extra ${extra.name}: +${formatCurrency(ePrice)}`);
        });
      }
    });

    const surchargeInfo = appendSurchargeBreakdown({
      booking,
      subtotal: calculatedTotal,
      theme,
    });
    if (surchargeInfo.htmlRow) {
      htmlRows += surchargeInfo.htmlRow;
      textLines.push(surchargeInfo.textLine);
      calculatedTotal += surchargeInfo.addedToTotal;
    }

    const finalTotal =
      booking.estimatedPrice && booking.estimatedPrice > 0
        ? booking.estimatedPrice
        : calculatedTotal;
    const status: FinancialStatus =
      finalTotal <= 0
        ? 'deposit_only'
        : Math.max(0, finalTotal - depositPaid) === 0
        ? 'paid_in_full'
        : 'pending_balance';
    const salonBalance = status === 'pending_balance' ? Math.max(0, finalTotal - depositPaid) : 0;

    return {
      status,
      totalEstimated: finalTotal,
      depositPaid,
      salonBalance,
      surchargeAmount: surchargeInfo.surchargeAmount,
      surchargeLabel: surchargeInfo.surchargeLabel,
      surchargeMeta: surchargeInfo.surchargeMeta,
      servicesBreakdownHtml: htmlRows,
      servicesBreakdownText: textLines.join('\n'),
    };
  }

  const basePrice = Number(booking.basePrice) || 0;
  let calculatedTotal = basePrice;
  const rawName =
    booking.serviceName ||
    (booking.selectedServices && booking.selectedServices.length > 0
      ? booking.selectedServices.join(', ')
      : 'Turno / Consulta');
  const safeName = escapeHtml(rawName);

  const hasExplicitExtras = Array.isArray(booking.selectedExtras) && booking.selectedExtras.length > 0;
  const extrasSum = hasExplicitExtras
    ? booking.selectedExtras!.reduce((sum, e) => sum + (Number(e.price) || 0), 0)
    : 0;
  calculatedTotal += extrasSum;

  const surchargeInfo = appendSurchargeBreakdown({
    booking,
    subtotal: calculatedTotal,
    theme,
  });
  calculatedTotal += surchargeInfo.addedToTotal;

  const finalTotal =
    booking.estimatedPrice && booking.estimatedPrice > 0
      ? booking.estimatedPrice
      : calculatedTotal;
  const status: FinancialStatus =
    finalTotal <= 0
      ? 'deposit_only'
      : Math.max(0, finalTotal - depositPaid) === 0
      ? 'paid_in_full'
      : 'pending_balance';
  const salonBalance = status === 'pending_balance' ? Math.max(0, finalTotal - depositPaid) : 0;

  const basePriceDisplay =
    basePrice > 0
      ? formatCurrency(basePrice)
      : status === 'deposit_only'
      ? `<span style="color: ${theme.textMuted}; font-weight: 500; font-size: 13px;">A confirmar</span>`
      : formatCurrency(finalTotal);

  let htmlRows = `
    <tr style="border-bottom: 1px solid ${theme.borderSubtle};">
      <td style="padding: 11px 8px; font-weight: 600; color: ${theme.textPrimary}; font-size: 14px;">${safeName}</td>
      <td style="padding: 11px 8px; text-align: right; font-weight: 600; color: ${theme.textPrimary}; font-size: 14px; white-space: nowrap; font-variant-numeric: tabular-nums;">${basePriceDisplay}</td>
    </tr>
  `;
  const textLines: string[] = [
    `• ${rawName}: ${
      basePrice > 0
        ? formatCurrency(basePrice)
        : status === 'deposit_only'
        ? 'A confirmar en el salón'
        : formatCurrency(finalTotal)
    }`,
  ];

  if (hasExplicitExtras) {
    booking.selectedExtras!.forEach((extra) => {
      const ePrice = Number(extra.price) || 0;
      const safeExtraName = escapeHtml(extra.name);
      htmlRows += `
        <tr style="background-color: ${theme.bgBody}; border-bottom: 1px dashed ${theme.borderSubtle};">
          <td style="padding: 8px 8px 8px 22px; color: ${theme.textSecondary}; font-size: 13px;">
            + Extra: ${safeExtraName}
          </td>
          <td style="padding: 8px 8px; text-align: right; color: ${theme.textSecondary}; font-size: 13px; white-space: nowrap; font-variant-numeric: tabular-nums;">
            +${formatCurrency(ePrice)}
          </td>
        </tr>
      `;
      textLines.push(`   + Extra ${extra.name}: +${formatCurrency(ePrice)}`);
    });
  }

  if (surchargeInfo.htmlRow) {
    htmlRows += surchargeInfo.htmlRow;
    textLines.push(surchargeInfo.textLine);
  }

  return {
    status,
    totalEstimated: finalTotal,
    depositPaid,
    salonBalance,
    surchargeAmount: surchargeInfo.surchargeAmount,
    surchargeLabel: surchargeInfo.surchargeLabel,
    surchargeMeta: surchargeInfo.surchargeMeta,
    servicesBreakdownHtml: htmlRows,
    servicesBreakdownText: textLines.join('\n'),
  };
}

function renderFinancialCardHtml(
  breakdown: FinancialBreakdown,
  variant: 'client' | 'owner',
  theme: EmailThemePalette = DEFAULT_EMAIL_THEME_PALETTE
): string {
  const depositLabel =
    variant === 'client' ? 'Seña abonada (Mercado Pago)' : 'Seña recibida (Mercado Pago)';
  const totalLabel = variant === 'client' ? 'Total estimado' : 'Total presupuestado';

  const topRows =
    breakdown.status !== 'deposit_only'
      ? `
        <tr>
          <td style="color: ${theme.textSecondary}; padding: 4px 0;">${totalLabel}</td>
          <td style="text-align: right; color: ${theme.textPrimary}; font-weight: 600; padding: 4px 0; white-space: nowrap; font-variant-numeric: tabular-nums;">${formatCurrency(breakdown.totalEstimated)}</td>
        </tr>
        <tr>
          <td style="color: ${theme.successText}; padding: 4px 0; font-weight: 600;">${depositLabel}</td>
          <td style="text-align: right; color: ${theme.successText}; font-weight: 600; padding: 4px 0; white-space: nowrap; font-variant-numeric: tabular-nums;">-${formatCurrency(breakdown.depositPaid)}</td>
        </tr>
      `
      : `
        <tr>
          <td style="color: ${theme.successText}; padding: 4px 0; font-weight: 600;">${depositLabel}</td>
          <td style="text-align: right; color: ${theme.successText}; font-weight: 600; padding: 4px 0; white-space: nowrap; font-variant-numeric: tabular-nums;">${formatCurrency(breakdown.depositPaid)}</td>
        </tr>
      `;

  let highlightBand: string;
  if (breakdown.status === 'pending_balance') {
    const subtitle =
      variant === 'client' ? 'A abonar al finalizar tu atención' : 'A cobrar en el salón';
    highlightBand = `
      <div style="background-color: ${theme.warningBg}; border-top: 1px solid ${theme.warningBorder}; padding: 15px 18px;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle;">
              <div style="font-size: 13px; font-weight: 700; color: ${theme.warningText}; letter-spacing: 0.2px;">
                Saldo pendiente
              </div>
              <div style="font-size: 12px; color: ${theme.warning}; margin-top: 2px;">${subtitle}</div>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <div style="font-size: 22px; font-weight: 700; color: ${theme.warningText}; white-space: nowrap; font-variant-numeric: tabular-nums;">
                ${formatCurrency(breakdown.salonBalance)}
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;
  } else if (breakdown.status === 'paid_in_full') {
    const subtitle =
      variant === 'client' ? 'Tu servicio quedó saldado por completo' : 'Servicio saldado por completo';
    highlightBand = `
      <div style="background-color: ${theme.successBg}; border-top: 1px solid ${theme.successBorder}; padding: 15px 18px;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle;">
              <div style="font-size: 13px; font-weight: 700; color: ${theme.successText}; letter-spacing: 0.2px;">
                Saldo pendiente
              </div>
              <div style="font-size: 12px; color: ${theme.success}; margin-top: 2px;">${subtitle}</div>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <div style="font-size: 18px; font-weight: 700; color: ${theme.successText}; white-space: nowrap; font-variant-numeric: tabular-nums;">
                $0 &middot; Saldado
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;
  } else {
    highlightBand = `
      <div style="background-color: ${theme.accentLight}; border-top: 1px solid ${theme.accentBorder}; padding: 15px 18px;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle;">
              <div style="font-size: 13px; font-weight: 700; color: ${theme.textPrimary};">
                Seña abonada
              </div>
              <div style="font-size: 12px; color: ${theme.textSecondary}; margin-top: 2px;">
                Total final a confirmar en el salón
              </div>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <div style="font-size: 20px; font-weight: 700; color: ${theme.textPrimary}; white-space: nowrap; font-variant-numeric: tabular-nums;">
                ${formatCurrency(breakdown.depositPaid)}
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  return `
    <div style="margin-bottom: 22px; border: 1px solid ${theme.borderSubtle}; border-radius: ${theme.cardRadiusPx}px; overflow: hidden; background-color: ${theme.bgSurface};">
      <div style="background-color: ${theme.bgSubtle}; padding: 13px 18px;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${topRows}
        </table>
      </div>
      ${highlightBand}
    </div>
  `;
}

function getFinancialPreheaderSummary(breakdown: FinancialBreakdown): string {
  if (breakdown.status === 'pending_balance') {
    return `Saldo pendiente: ${formatCurrency(breakdown.salonBalance)}`;
  }
  if (breakdown.status === 'paid_in_full') {
    return 'Saldado ($0 pendiente)';
  }
  return `Seña abonada: ${formatCurrency(breakdown.depositPaid)}`;
}

interface EmailLayoutParams {
  title: string;
  preheader: string;
  cardBorderColor?: string;
  theme?: EmailThemePalette;
  headerHtml: string;
  bodyHtml: string;
  footerHtml: string;
}

function buildEmailLayout(params: EmailLayoutParams): string {
  const theme = params.theme ?? DEFAULT_EMAIL_THEME_PALETTE;
  const {
    title,
    preheader,
    cardBorderColor = theme.borderMedium,
    headerHtml,
    bodyHtml,
    footerHtml,
  } = params;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${theme.bgBody}; font-family: ${BODY_FONT_STACK}; color: ${theme.textPrimary}; line-height: 1.55; -webkit-font-smoothing: antialiased;">
  ${buildPreheaderHtml(preheader, theme)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${theme.bgBody}; padding: 28px 12px;">
    <tr>
      <td align="center">
        <div style="max-width: 600px; width: 100%; margin: 0 auto; background-color: ${theme.bgSurface}; border-radius: ${theme.cardRadiusPx}px; overflow: hidden; border: 1px solid ${cardBorderColor}; text-align: left;">
          ${headerHtml}
          <div style="padding: 26px 24px;">
            ${bodyHtml}
          </div>
          <div style="background-color: ${theme.bgSubtle}; border-top: 1px solid ${theme.borderSubtle}; padding: 18px 24px; text-align: center; font-size: 12px; color: ${theme.textSecondary};">
            ${footerHtml}
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

const resolveBusinessPhone = (bookingPhone?: string, tenantId?: string): string => {
  if (tenantId) {
    return (bookingPhone || '').trim();
  }
  return (bookingPhone || process.env.BUSINESS_PHONE || process.env.OWNER_PHONE || '').trim();
};

export function buildClientEmailHtml(booking: BookingEmailPayload): string {
  const theme = resolveEmailThemeForAppearance(booking.appearance);
  const rawBrandName = (booking.businessName || process.env.BUSINESS_NAME || 'Turnos Web').trim();
  const brandName = escapeHtml(rawBrandName);
  const durationMinutes = resolveEffectiveDurationMinutes(booking);
  const displayDateRaw = formatBookingDate(booking.datetime, booking.formattedDate, booking.timezone);
  const displayTimeRangeRaw = formatTimeRange(
    booking.datetime,
    durationMinutes,
    booking.formattedTime,
    booking.timezone
  );
  const displayDurationRaw = formatCompactEmailDuration(durationMinutes, booking.estimatedDuration);

  const displayDate = escapeHtml(displayDateRaw);
  const displayTimeRange = escapeHtml(displayTimeRangeRaw);
  const displayDuration = escapeHtml(displayDurationRaw);
  const safeClientName = escapeHtml(booking.clientName || 'Cliente');
  const safeNotes = escapeHtml(booking.clientNotes?.trim());
  const safePaymentId = escapeHtml(booking.paymentId);
  const safeSlotId = escapeHtml(booking.slotId);
  const rawLocation = (booking.businessLocation || '').trim();
  const safeLocation = escapeHtml(rawLocation);
  const rawBusinessPhone = resolveBusinessPhone(booking.businessPhone, booking.tenantId);
  const businessWaUrl = buildWhatsAppLink(
    rawBusinessPhone,
    `Hola! Te escribo por mi turno del ${displayDateRaw} (${displayTimeRangeRaw}).`
  );
  const instagram = buildInstagramLink(booking.businessInstagram);
  const safeLogoUrl = sanitizeEmailLogoUrl(booking.businessLogoUrl);
  const breakdown = buildFinancialBreakdown(booking, theme);

  const preheader = `${displayDateRaw} · ${displayTimeRangeRaw} · ${getFinancialPreheaderSummary(breakdown)}`;

  const brandHeaderVisual = safeLogoUrl
    ? `<div style="margin-bottom: 12px;"><img src="${escapeHtml(safeLogoUrl)}" alt="${brandName}" style="max-height: 44px; max-width: 180px; width: auto; height: auto; display: inline-block; border-radius: 8px;" /></div>`
    : `<div style="font-family: ${theme.displayFontStack}; font-size: 19px; font-weight: 600; color: ${theme.primary}; letter-spacing: 0.4px; margin-bottom: 10px;">${brandName}</div>`;

  const headerHtml = `
    <div style="background-color: ${theme.primaryLight}; border-bottom: 1px solid ${theme.primaryBorder}; padding: 28px 24px 24px 24px; text-align: center;">
      ${brandHeaderVisual}
      <div style="display: inline-block; background-color: ${theme.successBg}; border: 1px solid ${theme.successBorder}; color: ${theme.successText}; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; padding: 4px 11px; border-radius: 9999px; margin-bottom: 12px;">
        Reserva confirmada
      </div>
      <h1 style="margin: 0; font-family: ${theme.displayFontStack}; font-size: 26px; font-weight: 700; color: ${theme.textPrimary}; line-height: 1.2;">
        Tu turno está confirmado
      </h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${theme.textSecondary};">
        Registramos tu seña correctamente. Te esperamos.
      </p>
    </div>
  `;

  const salonPaymentTip =
    breakdown.status === 'pending_balance'
      ? `<li style="margin-bottom: 6px;">El <strong>saldo pendiente (${formatCurrency(breakdown.salonBalance)})</strong> lo podés abonar en el salón en efectivo o transferencia.</li>`
      : breakdown.status === 'deposit_only'
      ? `<li style="margin-bottom: 6px;">El saldo final del servicio se confirma y abona en el salón al finalizar tu atención.</li>`
      : '';

  const whatsappCtaHtml = businessWaUrl
    ? `
      <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid ${theme.borderSubtle}; text-align: center;">
        <a href="${escapeHtml(businessWaUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: ${theme.buttonBg}; color: ${theme.buttonColor}; border: 1.5px solid ${theme.buttonBorder}; text-decoration: none; font-size: 14px; font-weight: 600; padding: 11px 22px; border-radius: ${theme.buttonRadiusPx}px;">
          Escribir por WhatsApp
        </a>
        <div style="font-size: 12px; color: ${theme.textMuted}; margin-top: 6px;">
          ¿Necesitás consultar o reprogramar? Escribinos directamente.
        </div>
      </div>
    `
    : '';

  const bodyHtml = `
    <p style="font-size: 15px; color: ${theme.textPrimary}; margin: 0 0 20px 0;">
      Hola <strong>${safeClientName}</strong>, gracias por tu reserva. A continuación tenés el comprobante con el horario y el detalle de tu cita:
    </p>

    <div style="background-color: ${theme.bgSubtle}; border: 1px solid ${theme.borderSubtle}; border-radius: ${theme.innerRadiusPx}px; padding: 16px 18px; margin-bottom: 22px;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 5px 0; color: ${theme.textMuted}; font-weight: 600; width: 92px; vertical-align: top;">Fecha</td>
          <td style="padding: 5px 0; color: ${theme.textPrimary}; font-weight: 600;">${displayDate}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: ${theme.textMuted}; font-weight: 600; vertical-align: top;">Horario</td>
          <td style="padding: 5px 0; color: ${theme.primaryDark}; font-weight: 700; font-variant-numeric: tabular-nums;">${displayTimeRange}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: ${theme.textMuted}; font-weight: 600; vertical-align: top;">Duración</td>
          <td style="padding: 5px 0; color: ${theme.textSecondary};">${displayDuration}</td>
        </tr>
        ${
          breakdown.surchargeAmount > 0
            ? `
          <tr>
            <td style="padding: 5px 0; color: ${theme.textMuted}; font-weight: 600; vertical-align: top;">Tarifa especial</td>
            <td style="padding: 5px 0;">
              <span style="display: inline-block; background-color: ${theme.warningBg}; border: 1px solid ${theme.warningBorder}; color: ${theme.warningText}; font-size: 12px; font-weight: 700; padding: 2px 9px; border-radius: 9999px; font-variant-numeric: tabular-nums;">
                +${formatCurrency(breakdown.surchargeAmount)} &middot; ${escapeHtml(breakdown.surchargeLabel)}
              </span>
            </td>
          </tr>
        `
            : ''
        }
        ${
          safeLocation
            ? `
          <tr>
            <td style="padding: 5px 0; color: ${theme.textMuted}; font-weight: 600; vertical-align: top;">Dirección</td>
            <td style="padding: 5px 0; color: ${theme.textPrimary};">${safeLocation}</td>
          </tr>
        `
            : ''
        }
      </table>
    </div>

    <div style="margin-bottom: 22px;">
      <h2 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.6px; color: ${theme.textMuted}; margin: 0 0 10px 0; font-weight: 700;">
        Servicios y extras
      </h2>
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid ${theme.borderMedium}; color: ${theme.textMuted}; font-size: 12px;">
            <th style="padding: 6px 8px; text-align: left; font-weight: 600;">Detalle</th>
            <th style="padding: 6px 8px; text-align: right; font-weight: 600;">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${breakdown.servicesBreakdownHtml}
        </tbody>
      </table>
    </div>

    ${renderFinancialCardHtml(breakdown, 'client', theme)}

    ${
      safeNotes
        ? `
      <div style="background-color: ${theme.bgBody}; border: 1px solid ${theme.borderSubtle}; border-radius: ${theme.innerRadiusPx}px; padding: 12px 15px; margin-bottom: 22px; font-size: 13px; color: ${theme.textSecondary};">
        <div style="font-weight: 600; color: ${theme.textPrimary}; margin-bottom: 3px;">Tus notas</div>
        <div>${safeNotes}</div>
      </div>
    `
        : ''
    }

    <div style="background-color: ${theme.bgBody}; border: 1px solid ${theme.borderSubtle}; border-radius: ${theme.innerRadiusPx}px; padding: 16px 18px; margin-bottom: 20px; font-size: 13px; color: ${theme.textSecondary};">
      <div style="font-weight: 700; color: ${theme.textPrimary}; margin-bottom: 8px;">Información importante para tu cita</div>
      <ul style="margin: 0; padding-left: 18px; line-height: 1.6;">
        <li style="margin-bottom: 6px;">Te pedimos llegar con <strong>5 a 10 minutos de anticipación</strong>.</li>
        ${salonPaymentTip}
        <li>En caso de necesitar reprogramar o cancelar, por favor avisanos con al menos 24 hs de anticipación para no perder la seña.</li>
      </ul>
      ${whatsappCtaHtml}
    </div>

    <div style="font-size: 12px; color: ${theme.textMuted}; text-align: center; border-top: 1px solid ${theme.borderSubtle}; padding-top: 14px; font-family: ${BODY_FONT_STACK};">
      Pago MP <span style="font-family: ${MONO_FONT_STACK};">#${safePaymentId}</span> &middot; Ref. turno <span style="font-family: ${MONO_FONT_STACK};">${safeSlotId}</span>
    </div>
  `;

  const footerMetaParts: string[] = [];
  if (safeLocation) footerMetaParts.push(safeLocation);
  if (instagram) {
    footerMetaParts.push(
      `<a href="${escapeHtml(instagram.url)}" target="_blank" rel="noopener noreferrer" style="color: ${theme.primary}; text-decoration: none; font-weight: 600;">${escapeHtml(instagram.handle)}</a>`
    );
  }

  const footerHtml = `
    <p style="margin: 0 0 4px 0; font-family: ${theme.displayFontStack}; font-size: 15px; font-weight: 600; color: ${theme.textPrimary};">${brandName}</p>
    ${
      footerMetaParts.length > 0
        ? `<p style="margin: 0 0 6px 0; color: ${theme.textSecondary};">${footerMetaParts.join(' &middot; ')}</p>`
        : ''
    }
    <p style="margin: 0; color: ${theme.textMuted};">Gracias por confiar en nosotros. ¡Nos vemos pronto!</p>
  `;

  return buildEmailLayout({
    title: `Confirmación de turno · ${rawBrandName}`,
    preheader,
    theme,
    headerHtml,
    bodyHtml,
    footerHtml,
  });
}

export function buildClientEmailText(booking: BookingEmailPayload): string {
  const brandName = (booking.businessName || process.env.BUSINESS_NAME || 'Turnos Web').trim();
  const durationMinutes = resolveEffectiveDurationMinutes(booking);
  const displayDate = formatBookingDate(booking.datetime, booking.formattedDate, booking.timezone);
  const displayTimeRange = formatTimeRange(
    booking.datetime,
    durationMinutes,
    booking.formattedTime,
    booking.timezone
  );
  const displayDuration = formatCompactEmailDuration(durationMinutes, booking.estimatedDuration);
  const location = (booking.businessLocation || '').trim();
  const businessWaUrl = buildWhatsAppLink(
    resolveBusinessPhone(booking.businessPhone, booking.tenantId),
    `Hola! Te escribo por mi turno del ${displayDate} (${displayTimeRange}).`
  );
  const instagram = buildInstagramLink(booking.businessInstagram);
  const breakdown = buildFinancialBreakdown(booking);

  const lines: string[] = [
    `${brandName} — TU TURNO ESTÁ CONFIRMADO`,
    '',
    `Hola ${booking.clientName || 'Cliente'}, registramos tu seña correctamente.`,
    '',
    'DETALLE DE TU CITA',
    `- Fecha: ${displayDate}`,
    `- Horario: ${displayTimeRange}`,
    `- Duración: ${displayDuration}`,
  ];
  if (location) lines.push(`- Dirección: ${location}`);
  if (breakdown.surchargeAmount > 0) {
    lines.push(`- Tarifa especial: +${formatCurrency(breakdown.surchargeAmount)} (${breakdown.surchargeLabel})`);
  }

  lines.push('', 'SERVICIOS Y EXTRAS', breakdown.servicesBreakdownText, '', 'RESUMEN DE PAGO');
  if (breakdown.status !== 'deposit_only') {
    lines.push(`- Total estimado: ${formatCurrency(breakdown.totalEstimated)}`);
  }
  lines.push(`- Seña abonada (Mercado Pago): ${formatCurrency(breakdown.depositPaid)}`);
  if (breakdown.status === 'pending_balance') {
    lines.push(`- Saldo pendiente en el salón: ${formatCurrency(breakdown.salonBalance)}`);
  } else if (breakdown.status === 'paid_in_full') {
    lines.push('- Saldo pendiente: $0 (Saldado por completo)');
  } else {
    lines.push('- Total final a confirmar en el salón');
  }

  if (booking.clientNotes?.trim()) {
    lines.push('', `Tus notas: ${booking.clientNotes.trim()}`);
  }

  lines.push(
    '',
    'INFORMACIÓN IMPORTANTE',
    '- Te pedimos llegar con 5 a 10 minutos de anticipación.'
  );
  if (breakdown.status === 'pending_balance') {
    lines.push(
      `- El saldo pendiente (${formatCurrency(breakdown.salonBalance)}) lo podés abonar en el salón en efectivo o transferencia.`
    );
  } else if (breakdown.status === 'deposit_only') {
    lines.push('- El saldo final del servicio se confirma y abona en el salón al finalizar tu atención.');
  }
  lines.push(
    '- En caso de necesitar reprogramar o cancelar, por favor avisanos con al menos 24 hs de anticipación para no perder la seña.'
  );

  if (businessWaUrl) {
    lines.push('', `Escribir por WhatsApp: ${businessWaUrl}`);
  }
  if (instagram) {
    lines.push(`Instagram: ${instagram.handle} (${instagram.url})`);
  }

  lines.push('', `Referencia: Pago MP #${booking.paymentId} · Turno ${booking.slotId}`);
  return lines.join('\n');
}

export function buildOwnerEmailHtml(booking: BookingEmailPayload): string {
  const theme = resolveEmailThemeForAppearance(booking.appearance);
  const rawBrandName = (booking.businessName || process.env.BUSINESS_NAME || 'Turnos Web').trim();
  const brandName = escapeHtml(rawBrandName);
  const durationMinutes = resolveEffectiveDurationMinutes(booking);
  const displayDateRaw = formatBookingDate(booking.datetime, booking.formattedDate, booking.timezone);
  const displayTimeRangeRaw = formatTimeRange(
    booking.datetime,
    durationMinutes,
    booking.formattedTime,
    booking.timezone
  );
  const displayDurationRaw = formatCompactEmailDuration(durationMinutes, booking.estimatedDuration);

  const displayDate = escapeHtml(displayDateRaw);
  const displayTimeRange = escapeHtml(displayTimeRangeRaw);
  const displayDuration = escapeHtml(displayDurationRaw);
  const rawClientName = booking.clientName || 'Cliente';
  const safeClientName = escapeHtml(rawClientName);
  const cleanClientEmail = (booking.clientEmail || '').trim();
  const safeClientEmail = escapeHtml(cleanClientEmail || 'No especificado');
  const rawClientPhone = (booking.clientPhone || '').trim();
  const safeClientPhone = escapeHtml(rawClientPhone || 'No especificado');
  const clientWaUrl = buildWhatsAppLink(
    rawClientPhone,
    `Hola ${rawClientName}, te escribo de ${rawBrandName} por tu turno del ${displayDateRaw} (${displayTimeRangeRaw}).`
  );
  const safeNotes = escapeHtml(booking.clientNotes?.trim());
  const safePaymentId = escapeHtml(booking.paymentId);
  const safeSlotId = escapeHtml(booking.slotId);
  const adminPanelUrl = buildAdminPanelUrl(booking.adminUrl, booking.tenantSlug);
  const breakdown = buildFinancialBreakdown(booking, theme);

  const preheader = `${rawClientName} · ${displayDateRaw} · ${displayTimeRangeRaw} · ${getFinancialPreheaderSummary(breakdown)}`;

  const headerHtml = `
    <div style="background-color: ${theme.textPrimary}; padding: 26px 24px; text-align: center; color: #ffffff;">
      <div style="display: inline-block; background-color: ${theme.successBg}; color: ${theme.successText}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700; padding: 4px 11px; border-radius: 9999px; margin-bottom: 10px;">
        Seña acreditada
      </div>
      <h1 style="margin: 0; font-family: ${theme.displayFontStack}; font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.2;">
        Nueva reserva confirmada
      </h1>
      <p style="margin: 7px 0 0 0; font-size: 14px; color: ${theme.borderMedium};">
        ${safeClientName} reservó un turno en ${brandName}
      </p>
    </div>
  `;

  const clientEmailCell = isUsableEmail(cleanClientEmail)
    ? `<a href="mailto:${escapeHtml(cleanClientEmail)}" style="color: ${theme.primary}; text-decoration: none; font-weight: 600;">${safeClientEmail}</a>`
    : `<span style="color: ${theme.textMuted};">${safeClientEmail}</span>`;

  const clientPhoneCell = clientWaUrl
    ? `${safeClientPhone} &nbsp;<a href="${escapeHtml(clientWaUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: ${theme.successBg}; border: 1px solid ${theme.successBorder}; color: ${theme.successText}; text-decoration: none; font-size: 12px; font-weight: 600; padding: 2px 9px; border-radius: 9999px;">WhatsApp</a>`
    : safeClientPhone;

  const adminCtaHtml = adminPanelUrl
    ? `
      <div style="text-align: center; margin: 4px 0 20px 0;">
        <a href="${escapeHtml(adminPanelUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: ${theme.buttonBg}; color: ${theme.buttonColor}; border: 1.5px solid ${theme.buttonBorder}; text-decoration: none; font-size: 14px; font-weight: 600; padding: 11px 22px; border-radius: ${theme.buttonRadiusPx}px;">
          Abrir Agenda en el Panel
        </a>
      </div>
    `
    : '';

  const bodyHtml = `
    <div style="background-color: ${theme.bgSubtle}; border: 1px solid ${theme.borderSubtle}; border-radius: ${theme.innerRadiusPx}px; padding: 16px 18px; margin-bottom: 18px;">
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; color: ${theme.primary}; font-weight: 700; margin-bottom: 10px;">
        Turno agendado
      </div>
      <table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 4px 0; color: ${theme.textMuted}; font-weight: 600; width: 92px;">Fecha</td>
          <td style="padding: 4px 0; color: ${theme.textPrimary}; font-weight: 600;">${displayDate}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: ${theme.textMuted}; font-weight: 600;">Horario</td>
          <td style="padding: 4px 0; color: ${theme.primaryDark}; font-weight: 700; font-variant-numeric: tabular-nums;">${displayTimeRange}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: ${theme.textMuted}; font-weight: 600;">Duración</td>
          <td style="padding: 4px 0; color: ${theme.textSecondary};">${displayDuration}</td>
        </tr>
        ${
          breakdown.surchargeAmount > 0
            ? `
          <tr>
            <td style="padding: 4px 0; color: ${theme.textMuted}; font-weight: 600; vertical-align: top;">Tarifa especial</td>
            <td style="padding: 4px 0;">
              <span style="display: inline-block; background-color: ${theme.warningBg}; border: 1px solid ${theme.warningBorder}; color: ${theme.warningText}; font-size: 12px; font-weight: 700; padding: 2px 9px; border-radius: 9999px; font-variant-numeric: tabular-nums;">
                +${formatCurrency(breakdown.surchargeAmount)} &middot; ${escapeHtml(breakdown.surchargeLabel)}
              </span>
            </td>
          </tr>
        `
            : ''
        }
      </table>
    </div>

    <div style="background-color: ${theme.bgSurface}; border: 1px solid ${theme.borderSubtle}; border-radius: ${theme.innerRadiusPx}px; padding: 16px 18px; margin-bottom: 20px;">
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; color: ${theme.textMuted}; font-weight: 700; margin-bottom: 10px;">
        Datos del cliente
      </div>
      <table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 4px 0; color: ${theme.textMuted}; font-weight: 600; width: 92px;">Nombre</td>
          <td style="padding: 4px 0; color: ${theme.textPrimary}; font-weight: 600;">${safeClientName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: ${theme.textMuted}; font-weight: 600;">Email</td>
          <td style="padding: 4px 0;">${clientEmailCell}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: ${theme.textMuted}; font-weight: 600;">Teléfono</td>
          <td style="padding: 4px 0; color: ${theme.textPrimary}; font-weight: 600;">${clientPhoneCell}</td>
        </tr>
        ${
          safeNotes
            ? `
          <tr>
            <td style="padding: 4px 0; color: ${theme.textMuted}; font-weight: 600; vertical-align: top;">Notas</td>
            <td style="padding: 4px 0; color: ${theme.textSecondary};">${safeNotes}</td>
          </tr>
        `
            : ''
        }
      </table>
    </div>

    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.6px; color: ${theme.textMuted}; margin: 0 0 10px 0; font-weight: 700;">
        Servicios y extras solicitados
      </h2>
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid ${theme.borderMedium}; color: ${theme.textMuted}; font-size: 12px;">
            <th style="padding: 6px 8px; text-align: left; font-weight: 600;">Servicio / Extra</th>
            <th style="padding: 6px 8px; text-align: right; font-weight: 600;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${breakdown.servicesBreakdownHtml}
        </tbody>
      </table>
    </div>

    ${renderFinancialCardHtml(breakdown, 'owner', theme)}

    ${adminCtaHtml}

    <div style="font-size: 12px; color: ${theme.textMuted}; text-align: center; border-top: 1px solid ${theme.borderSubtle}; padding-top: 14px;">
      Pago MP <span style="font-family: ${MONO_FONT_STACK};">#${safePaymentId}</span> &middot; Slot <span style="font-family: ${MONO_FONT_STACK};">${safeSlotId}</span>
    </div>
  `;

  const footerHtml = `
    <p style="margin: 0; color: ${theme.textSecondary}; font-weight: 600;">Panel de Administración &middot; ${brandName}</p>
  `;

  return buildEmailLayout({
    title: `Nueva reserva confirmada · ${rawBrandName}`,
    preheader,
    theme,
    headerHtml,
    bodyHtml,
    footerHtml,
  });
}

export function buildOwnerEmailText(booking: BookingEmailPayload): string {
  const brandName = (booking.businessName || process.env.BUSINESS_NAME || 'Turnos Web').trim();
  const durationMinutes = resolveEffectiveDurationMinutes(booking);
  const displayDate = formatBookingDate(booking.datetime, booking.formattedDate, booking.timezone);
  const displayTimeRange = formatTimeRange(
    booking.datetime,
    durationMinutes,
    booking.formattedTime,
    booking.timezone
  );
  const displayDuration = formatCompactEmailDuration(durationMinutes, booking.estimatedDuration);
  const clientWaUrl = buildWhatsAppLink(booking.clientPhone);
  const adminPanelUrl = buildAdminPanelUrl(booking.adminUrl, booking.tenantSlug);
  const breakdown = buildFinancialBreakdown(booking);

  const lines: string[] = [
    `${brandName} — NUEVA RESERVA CONFIRMADA`,
    '',
    'TURNO AGENDADO',
    `- Fecha: ${displayDate}`,
    `- Horario: ${displayTimeRange}`,
    `- Duración: ${displayDuration}`,
  ];
  if (breakdown.surchargeAmount > 0) {
    lines.push(`- Tarifa especial: +${formatCurrency(breakdown.surchargeAmount)} (${breakdown.surchargeLabel})`);
  }
  lines.push(
    '',
    'CLIENTE',
    `- Nombre: ${booking.clientName || 'Cliente'}`,
    `- Email: ${booking.clientEmail || 'No especificado'}`,
    `- Teléfono: ${booking.clientPhone || 'No especificado'}`,
  );
  if (clientWaUrl) lines.push(`- WhatsApp del cliente: ${clientWaUrl}`);
  if (booking.clientNotes?.trim()) lines.push(`- Notas: ${booking.clientNotes.trim()}`);

  lines.push('', 'SERVICIOS Y EXTRAS', breakdown.servicesBreakdownText, '', 'RESUMEN DE COBRO');
  if (breakdown.status !== 'deposit_only') {
    lines.push(`- Total presupuestado: ${formatCurrency(breakdown.totalEstimated)}`);
  }
  lines.push(`- Seña recibida (Mercado Pago): ${formatCurrency(breakdown.depositPaid)}`);
  if (breakdown.status === 'pending_balance') {
    lines.push(`- Saldo pendiente a cobrar en salón: ${formatCurrency(breakdown.salonBalance)}`);
  } else if (breakdown.status === 'paid_in_full') {
    lines.push('- Saldo pendiente: $0 (Saldado)');
  } else {
    lines.push('- Total final a confirmar en el salón');
  }

  if (adminPanelUrl) {
    lines.push('', `Abrir Agenda en el Panel: ${adminPanelUrl}`);
  }
  lines.push('', `Referencia: Pago MP #${booking.paymentId} · Slot ${booking.slotId}`);
  return lines.join('\n');
}

export function buildPaymentIncidentEmailHtml(incident: PaymentIncidentPayload): string {
  const theme = resolveEmailThemeForAppearance(incident.appearance);
  const rawBrandName = (incident.businessName || process.env.BUSINESS_NAME || 'Turnos Web').trim();
  const brandName = escapeHtml(rawBrandName);
  const title =
    incident.kind === 'double_payment_incident'
      ? 'Alerta: doble pago detectado en un mismo turno'
      : 'Alerta: pago tardío con conflicto de horario';
  const explanation =
    incident.kind === 'double_payment_incident'
      ? 'Se recibió un pago aprobado en Mercado Pago para un turno que ya estaba confirmado con otro pago. El turno original no fue sobrescrito.'
      : 'Se recibió un pago aprobado en Mercado Pago después de vencer el bloqueo temporal, pero el horario ya entra en conflicto con otro turno confirmado o fue cancelado. El turno no fue confirmado automáticamente para evitar doble reserva.';

  const displayDateRaw = formatBookingDate(incident.datetime, undefined, incident.timezone);
  const displayTimeRaw = formatBookingTime(incident.datetime, undefined, incident.timezone);
  const displayDate = escapeHtml(displayDateRaw);
  const displayTime = escapeHtml(displayTimeRaw);
  const cleanEmail = (incident.incomingClientEmail || '').trim();
  const clientWaUrl = buildWhatsAppLink(incident.incomingClientPhone);
  const adminPanelUrl = buildAdminPanelUrl(incident.adminUrl, incident.tenantSlug);

  const preheader = `Acción requerida · MP #${incident.paymentId} (${formatCurrency(incident.paidAmount)}) · ${incident.incomingClientName}`;

  const headerHtml = `
    <div style="background-color: ${theme.danger}; padding: 24px; text-align: center; color: #ffffff;">
      <div style="display: inline-block; background-color: ${theme.dangerBg}; color: ${theme.dangerText}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700; padding: 4px 11px; border-radius: 9999px; margin-bottom: 10px;">
        Acción requerida
      </div>
      <h1 style="margin: 0; font-family: ${theme.displayFontStack}; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.25;">
        ${escapeHtml(title)}
      </h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: ${theme.dangerBg};">${brandName}</p>
    </div>
  `;

  const contactBits: string[] = [];
  if (isUsableEmail(cleanEmail)) {
    contactBits.push(
      `<a href="mailto:${escapeHtml(cleanEmail)}" style="color: ${theme.primary}; text-decoration: none; font-weight: 600;">${escapeHtml(cleanEmail)}</a>`
    );
  }
  if (clientWaUrl) {
    contactBits.push(
      `<a href="${escapeHtml(clientWaUrl)}" target="_blank" rel="noopener noreferrer" style="color: ${theme.successText}; text-decoration: none; font-weight: 600;">WhatsApp</a>`
    );
  }

  const adminCtaHtml = adminPanelUrl
    ? `
      <div style="text-align: center; margin-top: 20px;">
        <a href="${escapeHtml(adminPanelUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: ${theme.textPrimary}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 11px 22px; border-radius: ${theme.buttonRadiusPx}px;">
          Revisar en el Panel Admin
        </a>
      </div>
    `
    : '';

  const bodyHtml = `
    <p style="margin: 0 0 18px 0; font-size: 14px; color: ${theme.textPrimary};">${escapeHtml(explanation)}</p>

    <div style="background-color: ${theme.dangerBg}; border: 1px solid ${theme.dangerBorder}; border-radius: ${theme.innerRadiusPx}px; padding: 16px 18px; font-size: 14px; color: ${theme.textPrimary};">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; color: ${theme.dangerText}; font-weight: 600; width: 130px; vertical-align: top;">Pago entrante MP</td>
          <td style="padding: 4px 0; font-weight: 700; font-variant-numeric: tabular-nums;">#${escapeHtml(incident.paymentId)} (${formatCurrency(incident.paidAmount)})</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: ${theme.dangerText}; font-weight: 600; vertical-align: top;">Cliente entrante</td>
          <td style="padding: 4px 0;">
            <strong>${escapeHtml(incident.incomingClientName)}</strong>${contactBits.length > 0 ? `<div style="font-size: 13px; margin-top: 2px;">${contactBits.join(' &middot; ')}</div>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: ${theme.dangerText}; font-weight: 600; vertical-align: top;">Turno afectado</td>
          <td style="padding: 4px 0;">${displayDate} &middot; ${displayTime}<div style="font-size: 12px; color: ${theme.textMuted}; font-family: ${MONO_FONT_STACK};">ID: ${escapeHtml(incident.slotId)}</div></td>
        </tr>
        ${
          incident.existingPaymentId
            ? `
          <tr>
            <td style="padding: 4px 0; color: ${theme.dangerText}; font-weight: 600; vertical-align: top;">Pago ya confirmado</td>
            <td style="padding: 4px 0;">#${escapeHtml(incident.existingPaymentId)} (${escapeHtml(incident.existingClientName || 'Cliente')})</td>
          </tr>
        `
            : ''
        }
      </table>
    </div>

    <p style="font-size: 13px; color: ${theme.textSecondary}; margin: 16px 0 0 0;">
      Acción sugerida: contactá al cliente para coordinar otro horario o emitir el reembolso desde Mercado Pago. El incidente quedó registrado en la colección <span style="font-family: ${MONO_FONT_STACK};">payment_incidents</span>.
    </p>
    ${adminCtaHtml}
  `;

  const footerHtml = `
    <p style="margin: 0; color: ${theme.textSecondary}; font-weight: 600;">Alerta automática de cobros &middot; ${brandName}</p>
  `;

  return buildEmailLayout({
    title,
    preheader,
    theme,
    cardBorderColor: theme.dangerBorder,
    headerHtml,
    bodyHtml,
    footerHtml,
  });
}

export function buildPaymentIncidentEmailText(incident: PaymentIncidentPayload): string {
  const brandName = (incident.businessName || process.env.BUSINESS_NAME || 'Turnos Web').trim();
  const title =
    incident.kind === 'double_payment_incident'
      ? 'ALERTA: DOBLE PAGO DETECTADO EN UN MISMO TURNO'
      : 'ALERTA: PAGO TARDÍO CON CONFLICTO DE HORARIO';
  const displayDate = formatBookingDate(incident.datetime, undefined, incident.timezone);
  const displayTime = formatBookingTime(incident.datetime, undefined, incident.timezone);
  const clientWaUrl = buildWhatsAppLink(incident.incomingClientPhone);
  const adminPanelUrl = buildAdminPanelUrl(incident.adminUrl, incident.tenantSlug);

  const lines: string[] = [
    `${brandName} — ${title}`,
    '',
    `- Pago entrante MP: #${incident.paymentId} (${formatCurrency(incident.paidAmount)})`,
    `- Cliente entrante: ${incident.incomingClientName} (${incident.incomingClientEmail || 'sin email'})`,
  ];
  if (clientWaUrl) lines.push(`- WhatsApp cliente: ${clientWaUrl}`);
  lines.push(`- Turno afectado: ${displayDate} · ${displayTime} (ID: ${incident.slotId})`);
  if (incident.existingPaymentId) {
    lines.push(
      `- Pago ya confirmado en el turno: #${incident.existingPaymentId} (${incident.existingClientName || 'Cliente'})`
    );
  }
  lines.push(
    '',
    'Acción sugerida: contactá al cliente para coordinar otro horario o emitir el reembolso desde Mercado Pago. El incidente quedó registrado en payment_incidents.'
  );
  if (adminPanelUrl) lines.push(`Panel Admin: ${adminPanelUrl}`);
  return lines.join('\n');
}

/**
 * Dispatches booking confirmation emails in parallel via Amazon SESv2
 * and supports selective retry per recipient without throwing blocking errors.
 */
export async function sendBookingConfirmationEmails(
  booking: BookingEmailPayload,
  options: SendEmailsOptions = {}
): Promise<SendEmailsResult> {
  const { sendClient = true, sendOwner = true } = options;

  const result: SendEmailsResult = {
    clientSent: !sendClient,
    ownerSent: !sendOwner,
    clientAttempted: false,
    ownerAttempted: false,
  };

  if (!isSesConfigured()) {
    logger.warn(
      '[SES] Configuración de Amazon SES incompleta o inválida en functions/.env. Se omite el envío.'
    );
    return {
      clientSent: false,
      ownerSent: false,
      clientAttempted: false,
      ownerAttempted: false,
      clientError: 'Amazon SES no configurado',
      ownerError: 'Amazon SES no configurado',
    };
  }

  const fromEmail = buildTenantFromHeader(booking.businessName);
  const cleanClientEmail = booking.clientEmail ? booking.clientEmail.trim() : '';
  const cleanOwnerEmail = (
    booking.ownerEmail ||
    (booking.tenantId ? '' : process.env.BUSINESS_EMAIL || process.env.OWNER_EMAIL || '')
  ).trim();
  const durationMinutes = resolveEffectiveDurationMinutes(booking);
  const displayDate = formatBookingDate(booking.datetime, booking.formattedDate, booking.timezone);
  const displayTimeRange = formatTimeRange(
    booking.datetime,
    durationMinutes,
    booking.formattedTime,
    booking.timezone
  );

  const clientTask = async (): Promise<void> => {
    if (!sendClient) return;
    if (!isUsableEmail(cleanClientEmail)) {
      logger.warn('[SES] Dirección de correo del cliente inválida o ausente.', {
        tenantId: booking.tenantId || null,
        slotId: booking.slotId,
      });
      result.clientError = 'Correo de cliente inválido o ausente';
      return;
    }

    result.clientAttempted = true;
    const outcome = await sendSesEmail({
      from: fromEmail,
      to: [cleanClientEmail],
      ...(isUsableEmail(cleanOwnerEmail) ? { replyTo: [cleanOwnerEmail] } : {}),
      subject: `Turno confirmado · ${displayDate} (${displayTimeRange})`,
      html: buildClientEmailHtml(booking),
      text: buildClientEmailText(booking),
    });

    if (!outcome.ok) {
      logger.error('[SES] Error al enviar email al cliente.', {
        tenantId: booking.tenantId || null,
        slotId: booking.slotId,
        recipient: maskEmail(cleanClientEmail),
        errorCode: outcome.errorCode,
        errorMessage: outcome.errorMessage,
      });
      result.clientError = outcome.errorMessage || outcome.errorCode || 'Error al enviar correo';
      return;
    }

    logger.info('[SES] Correo al cliente enviado.', {
      tenantId: booking.tenantId || null,
      slotId: booking.slotId,
      messageId: outcome.messageId,
      recipient: maskEmail(cleanClientEmail),
    });
    result.clientSent = true;
    result.clientMessageId = outcome.messageId;
  };

  const ownerTask = async (): Promise<void> => {
    if (!sendOwner) return;
    if (!cleanOwnerEmail || !cleanOwnerEmail.includes('@')) {
      logger.warn('[SES] Dirección de correo del negocio ausente o inválida.', {
        tenantId: booking.tenantId || null,
        slotId: booking.slotId,
      });
      result.ownerError = 'Correo del negocio inválido o ausente';
      return;
    }

    result.ownerAttempted = true;
    const outcome = await sendSesEmail({
      from: fromEmail,
      to: [cleanOwnerEmail],
      ...(isUsableEmail(cleanClientEmail) ? { replyTo: [cleanClientEmail] } : {}),
      subject: `Nueva reserva: ${booking.clientName || 'Cliente'} · ${displayDate} (${displayTimeRange})`,
      html: buildOwnerEmailHtml(booking),
      text: buildOwnerEmailText(booking),
    });

    if (!outcome.ok) {
      logger.error('[SES] Error al enviar email al negocio.', {
        tenantId: booking.tenantId || null,
        slotId: booking.slotId,
        recipient: maskEmail(cleanOwnerEmail),
        errorCode: outcome.errorCode,
        errorMessage: outcome.errorMessage,
      });
      result.ownerError = outcome.errorMessage || outcome.errorCode || 'Error al enviar correo';
      return;
    }

    logger.info('[SES] Correo al negocio enviado.', {
      tenantId: booking.tenantId || null,
      slotId: booking.slotId,
      messageId: outcome.messageId,
      recipient: maskEmail(cleanOwnerEmail),
    });
    result.ownerSent = true;
    result.ownerMessageId = outcome.messageId;
  };

  await Promise.all([clientTask(), ownerTask()]);
  return result;
}

export async function sendPaymentIncidentAlertEmail(
  incident: PaymentIncidentPayload
): Promise<boolean> {
  const cleanOwnerEmail = (
    incident.ownerEmail ||
    (incident.tenantId ? '' : process.env.BUSINESS_EMAIL || process.env.OWNER_EMAIL || '')
  ).trim();

  if (!isSesConfigured() || !cleanOwnerEmail || !cleanOwnerEmail.includes('@')) {
    logger.warn(
      '[SES] No se pudo enviar alerta de incidente de pago (configuración incompleta).',
      {
        tenantId: incident.tenantId || null,
        slotId: incident.slotId,
        paymentId: incident.paymentId,
      }
    );
    return false;
  }

  const cleanIncomingEmail = (incident.incomingClientEmail || '').trim();
  const subject =
    incident.kind === 'double_payment_incident'
      ? `URGENTE: Doble pago detectado · Turno ${incident.slotId} (MP #${incident.paymentId})`
      : `URGENTE: Pago tardío con conflicto · Turno ${incident.slotId} (MP #${incident.paymentId})`;

  const outcome = await sendSesEmail({
    from: buildTenantFromHeader(incident.businessName),
    to: [cleanOwnerEmail],
    ...(isUsableEmail(cleanIncomingEmail) ? { replyTo: [cleanIncomingEmail] } : {}),
    subject,
    html: buildPaymentIncidentEmailHtml(incident),
    text: buildPaymentIncidentEmailText(incident),
  });

  if (!outcome.ok) {
    logger.error('[SES] Error al enviar alerta de incidente de pago.', {
      tenantId: incident.tenantId || null,
      paymentId: incident.paymentId,
      recipient: maskEmail(cleanOwnerEmail),
      errorCode: outcome.errorCode,
      errorMessage: outcome.errorMessage,
    });
    return false;
  }

  logger.info('[SES] Alerta de incidente de pago enviada.', {
    tenantId: incident.tenantId || null,
    paymentId: incident.paymentId,
    messageId: outcome.messageId,
    recipient: maskEmail(cleanOwnerEmail),
  });
  return true;
}

export interface BuildBookingEmailPayloadFromSlotParams {
  tenantId: string;
  tenantSlug?: string;
  timezone?: string;
  slotId: string;
  paymentId: string;
  slotData: Record<string, unknown>;
  clientData: Record<string, unknown>;
  paidAmount: number;
  fallbackClientEmail?: string;
  fallbackClientName?: string;
  formattedDate?: string;
  formattedTime?: string;
  ownerProfile: {
    ownerEmail?: string;
    businessName?: string;
    ownerLocation?: string;
    ownerPhone?: string;
    ownerInstagram?: string;
    logoUrl?: string;
    appearance?: Partial<SanitizedTenantAppearance> | Record<string, unknown> | null;
  };
  adminUrl?: string;
}

export function buildBookingEmailPayloadFromSlot(
  params: BuildBookingEmailPayloadFromSlotParams
): BookingEmailPayload {
  const {
    tenantId,
    tenantSlug,
    timezone,
    slotId,
    paymentId,
    slotData,
    clientData,
    paidAmount,
    fallbackClientEmail = '',
    fallbackClientName = 'Cliente',
    formattedDate,
    formattedTime,
    ownerProfile,
    adminUrl = (process.env.CLIENT_APP_URL || '').trim(),
  } = params;

  const datetime =
    typeof slotData.datetime === 'string' && slotData.datetime ? slotData.datetime : undefined;
  const basePrice = Number(clientData.basePrice || 0);
  const extrasPrice = Number(clientData.extrasPrice || 0);
  const resolvedSurcharge = resolveBookingSurcharge({
    clientData,
    slotSurcharge: slotData.surcharge,
    subtotal: basePrice + extrasPrice,
  });

  const estimatedDurationMinutes = Number(
    clientData.estimatedDurationMinutes || slotData.estimatedDurationMinutes || 0
  );
  const estimatedDuration =
    (typeof clientData.estimatedDuration === 'string' && clientData.estimatedDuration) ||
    (typeof slotData.estimatedDuration === 'string' && slotData.estimatedDuration) ||
    (estimatedDurationMinutes > 0 ? `${estimatedDurationMinutes} min` : '');

  return {
    tenantId,
    tenantSlug: tenantSlug || undefined,
    timezone,
    slotId,
    paymentId,
    serviceName:
      (typeof slotData.serviceName === 'string' && slotData.serviceName.trim()) ||
      (typeof clientData.selectedService === 'string' && clientData.selectedService.trim()) ||
      'Turno / Consulta',
    datetime,
    ...(formattedDate ? { formattedDate } : {}),
    ...(formattedTime ? { formattedTime } : {}),
    depositAmount: paidAmount,
    clientName:
      (typeof clientData.name === 'string' && clientData.name.trim()) ||
      fallbackClientName ||
      'Cliente',
    clientEmail:
      (typeof clientData.email === 'string' && clientData.email.trim()) ||
      fallbackClientEmail ||
      '',
    clientPhone: typeof clientData.phone === 'string' ? clientData.phone : '',
    clientNotes: typeof clientData.notes === 'string' ? clientData.notes : '',
    bookedServices: Array.isArray(clientData.bookedServices)
      ? (clientData.bookedServices as BookedServiceItem[])
      : [],
    selectedServices: Array.isArray(clientData.selectedServices)
      ? (clientData.selectedServices as string[])
      : [],
    selectedRules: Array.isArray(clientData.selectedRules)
      ? (clientData.selectedRules as string[])
      : [],
    selectedExtras: Array.isArray(clientData.selectedExtras)
      ? (clientData.selectedExtras as PriceExtra[])
      : [],
    basePrice,
    extrasPrice,
    ...(resolvedSurcharge.surcharge
      ? {
          surchargeType: resolvedSurcharge.surchargeType,
          surchargeValue: resolvedSurcharge.surchargeValue,
          surchargeAmount: resolvedSurcharge.surchargeAmount,
          ...(resolvedSurcharge.surchargeReason
            ? { surchargeReason: resolvedSurcharge.surchargeReason }
            : {}),
        }
      : {}),
    estimatedPrice: Number(clientData.estimatedPrice || 0),
    estimatedDurationMinutes,
    estimatedDuration,
    ownerEmail: ownerProfile.ownerEmail,
    businessName: ownerProfile.businessName,
    businessLocation: ownerProfile.ownerLocation,
    businessPhone: ownerProfile.ownerPhone,
    businessInstagram: ownerProfile.ownerInstagram,
    businessLogoUrl: ownerProfile.logoUrl,
    appearance: ownerProfile.appearance,
    adminUrl,
  };
}
