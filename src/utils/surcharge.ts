import { FIELD_LIMITS } from '../config/fieldLimits';
import type { ClientData, SlotSurcharge, SurchargeType } from '../types';
import { BUSINESS_TIMEZONE, formatBusinessDateKey, isValidDateKey } from './dateUtils';

export const SURCHARGE_FIXED_MIN = 1;
export const SURCHARGE_FIXED_MAX = 5_000_000;
export const SURCHARGE_PERCENT_MIN = 1;
export const SURCHARGE_PERCENT_MAX = 200;
export const SURCHARGE_REASON_MIN = FIELD_LIMITS.slot.surchargeReason.min;
export const SURCHARGE_REASON_MAX = FIELD_LIMITS.slot.surchargeReason.max;

export const normalizeSurchargeReason = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.length < SURCHARGE_REASON_MIN) return undefined;
  return trimmed.slice(0, SURCHARGE_REASON_MAX);
};

export const normalizeSlotSurcharge = (raw: unknown): SlotSurcharge | null => {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const type = obj.type;
  if (type !== 'fixed' && type !== 'percentage') return null;

  const value = Number(obj.value);
  if (!Number.isFinite(value) || !Number.isInteger(value)) return null;

  if (type === 'fixed' && (value < SURCHARGE_FIXED_MIN || value > SURCHARGE_FIXED_MAX)) {
    return null;
  }
  if (type === 'percentage' && (value < SURCHARGE_PERCENT_MIN || value > SURCHARGE_PERCENT_MAX)) {
    return null;
  }

  const reason = normalizeSurchargeReason(obj.reason);
  return reason ? { type, value, reason } : { type, value };
};

export const calculateSurchargeAmount = (
  subtotal: number,
  surcharge?: SlotSurcharge | null
): number => {
  const normalized = normalizeSlotSurcharge(surcharge);
  if (!normalized) return 0;

  if (normalized.type === 'fixed') {
    return Math.round(normalized.value);
  }

  const safeSubtotal = typeof subtotal === 'number' && Number.isFinite(subtotal) && subtotal > 0
    ? subtotal
    : 0;
  if (safeSubtotal <= 0) return 0;
  return Math.round((safeSubtotal * normalized.value) / 100);
};

export interface ResolvedBookingSurcharge {
  surcharge: SlotSurcharge | null;
  surchargeType?: SurchargeType;
  surchargeValue?: number;
  surchargeAmount: number;
  surchargeReason?: string;
}

export interface SurchargeClientInput {
  basePrice?: number | null;
  extrasPrice?: number | null;
  surchargeType?: SurchargeType | null;
  surchargeValue?: number | null;
  surchargeAmount?: number | null;
  surchargeReason?: string | null;
}

export const resolveBookingSurcharge = (params: {
  clientData?: SurchargeClientInput | Partial<ClientData> | null;
  slotSurcharge?: SlotSurcharge | null;
  subtotal?: number;
}): ResolvedBookingSurcharge => {
  const { clientData, slotSurcharge, subtotal } = params;
  const computedSubtotal =
    typeof subtotal === 'number' && Number.isFinite(subtotal) && subtotal >= 0
      ? subtotal
      : Math.max(0, Number(clientData?.basePrice) || 0) +
        Math.max(0, Number(clientData?.extrasPrice) || 0);

  if (clientData && (clientData.surchargeType === 'fixed' || clientData.surchargeType === 'percentage')) {
    const snapshot = normalizeSlotSurcharge({
      type: clientData.surchargeType,
      value: clientData.surchargeValue,
      reason: clientData.surchargeReason,
    });
    if (snapshot) {
      const hasExplicitAmount =
        typeof clientData.surchargeAmount === 'number' &&
        Number.isFinite(clientData.surchargeAmount) &&
        clientData.surchargeAmount >= 0;
      const surchargeAmount = hasExplicitAmount
        ? Math.round(clientData.surchargeAmount!)
        : calculateSurchargeAmount(computedSubtotal, snapshot);

      return {
        surcharge: snapshot,
        surchargeType: snapshot.type,
        surchargeValue: snapshot.value,
        surchargeAmount,
        ...(snapshot.reason ? { surchargeReason: snapshot.reason } : {}),
      };
    }
  }

  if (
    clientData &&
    typeof clientData.surchargeAmount === 'number' &&
    Number.isFinite(clientData.surchargeAmount) &&
    clientData.surchargeAmount > 0
  ) {
    const amount = Math.round(clientData.surchargeAmount);
    const reason = normalizeSurchargeReason(clientData.surchargeReason);
    const fallbackSurcharge: SlotSurcharge = reason
      ? { type: 'fixed', value: amount, reason }
      : { type: 'fixed', value: amount };
    return {
      surcharge: fallbackSurcharge,
      surchargeType: 'fixed',
      surchargeValue: amount,
      surchargeAmount: amount,
      ...(reason ? { surchargeReason: reason } : {}),
    };
  }

  const normalizedSlotSurcharge = normalizeSlotSurcharge(slotSurcharge);
  if (normalizedSlotSurcharge) {
    const surchargeAmount = calculateSurchargeAmount(computedSubtotal, normalizedSlotSurcharge);
    return {
      surcharge: normalizedSlotSurcharge,
      surchargeType: normalizedSlotSurcharge.type,
      surchargeValue: normalizedSlotSurcharge.value,
      surchargeAmount,
      ...(normalizedSlotSurcharge.reason ? { surchargeReason: normalizedSlotSurcharge.reason } : {}),
    };
  }

  return {
    surcharge: null,
    surchargeAmount: 0,
  };
};

export const formatSurchargeValue = (surcharge: Pick<SlotSurcharge, 'type' | 'value'>): string => {
  if (surcharge.type === 'percentage') {
    return `+${Math.round(surcharge.value)}%`;
  }
  return `+$${Math.round(surcharge.value).toLocaleString('es-AR')}`;
};

export const formatSurchargeLabel = (
  surcharge: SlotSurcharge,
  options: {
    size?: 'xs' | 'sm' | 'md';
    showReason?: boolean;
    resolvedAmount?: number;
  } = {}
): string => {
  const { size = 'sm', showReason = false, resolvedAmount } = options;
  const valueText = formatSurchargeValue(surcharge);

  if (size === 'xs') {
    return valueText;
  }

  const hasResolved =
    surcharge.type === 'percentage' &&
    typeof resolvedAmount === 'number' &&
    Number.isFinite(resolvedAmount) &&
    resolvedAmount > 0;

  const amountPart =
    size === 'md' && hasResolved
      ? `${valueText} (+$${Math.round(resolvedAmount!).toLocaleString('es-AR')})`
      : valueText;

  const shouldIncludeReason = (size === 'md' || showReason) && Boolean(surcharge.reason?.trim());
  const reasonPart = shouldIncludeReason ? ` · ${surcharge.reason!.trim()}` : '';

  return `Recargo ${amountPart}${reasonPart}`;
};

export const formatSurchargeDetail = (
  surcharge: SlotSurcharge,
  resolvedAmount?: number
): string => {
  const valueText = formatSurchargeValue(surcharge);
  const resolvedText =
    surcharge.type === 'percentage' &&
    typeof resolvedAmount === 'number' &&
    Number.isFinite(resolvedAmount) &&
    resolvedAmount > 0
      ? ` (+$${Math.round(resolvedAmount).toLocaleString('es-AR')})`
      : '';
  const reasonText = surcharge.reason?.trim() ? ` (${surcharge.reason.trim()})` : '';
  const suffix =
    surcharge.type === 'percentage'
      ? 'Se aplica sobre los servicios y extras seleccionados.'
      : 'Se suma al total del servicio.';

  return `Recargo de ${valueText}${resolvedText}${reasonText}. ${suffix}`;
};

export const isWeekendDateKey = (
  input: Date | string | number | undefined | null,
  timeZone = BUSINESS_TIMEZONE
): boolean => {
  const dateKey =
    typeof input === 'string' && isValidDateKey(input)
      ? input.trim()
      : formatBusinessDateKey(input, timeZone);
  if (!isValidDateKey(dateKey)) return false;

  const [year, month, day] = dateKey.split('-').map(Number);
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (isNaN(utcNoon.getTime())) return false;
  const dayOfWeek = utcNoon.getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
};
