import { HttpsError } from 'firebase-functions/v2/https';

export type SurchargeType = 'fixed' | 'percentage';

export interface SlotSurcharge {
  type: SurchargeType;
  value: number;
  reason?: string;
}

export const SURCHARGE_FIXED_MIN = 1;
export const SURCHARGE_FIXED_MAX = 5_000_000;
export const SURCHARGE_PERCENT_MIN = 1;
export const SURCHARGE_PERCENT_MAX = 200;
export const SURCHARGE_REASON_MIN = 2;
export const SURCHARGE_REASON_MAX = 60;

export const normalizeSurchargeReason = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length < SURCHARGE_REASON_MIN) return undefined;
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

export const validateAdminSlotSurcharge = (raw: unknown): SlotSurcharge | null => {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new HttpsError('invalid-argument', 'La configuración de recargo es inválida.');
  }

  const obj = raw as Record<string, unknown>;
  const type = obj.type;
  if (type !== 'fixed' && type !== 'percentage') {
    throw new HttpsError(
      'invalid-argument',
      'El tipo de recargo debe ser monto fijo o porcentaje.'
    );
  }

  const rawValue = obj.value;
  const numValue = Number(rawValue);
  if (
    rawValue === '' ||
    rawValue === null ||
    rawValue === undefined ||
    typeof rawValue === 'boolean' ||
    !Number.isFinite(numValue) ||
    !Number.isInteger(numValue)
  ) {
    throw new HttpsError('invalid-argument', 'El valor del recargo debe ser un número entero.');
  }

  if (type === 'fixed' && (numValue < SURCHARGE_FIXED_MIN || numValue > SURCHARGE_FIXED_MAX)) {
    throw new HttpsError(
      'invalid-argument',
      'El recargo fijo debe estar entre $1 y $5.000.000.'
    );
  }

  if (
    type === 'percentage' &&
    (numValue < SURCHARGE_PERCENT_MIN || numValue > SURCHARGE_PERCENT_MAX)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'El recargo porcentual debe estar entre 1% y 200%.'
    );
  }

  let cleanReason: string | undefined;
  if (obj.reason !== undefined && obj.reason !== null) {
    if (typeof obj.reason !== 'string') {
      throw new HttpsError('invalid-argument', 'El motivo del recargo debe ser texto.');
    }
    const trimmed = obj.reason.trim();
    if (trimmed.length > 0) {
      if (trimmed.length < SURCHARGE_REASON_MIN) {
        throw new HttpsError(
          'invalid-argument',
          `El motivo del recargo debe tener al menos ${SURCHARGE_REASON_MIN} caracteres.`
        );
      }
      if (trimmed.length > SURCHARGE_REASON_MAX) {
        throw new HttpsError(
          'invalid-argument',
          `El motivo del recargo no puede superar los ${SURCHARGE_REASON_MAX} caracteres.`
        );
      }
      cleanReason = trimmed;
    }
  }

  return cleanReason
    ? { type, value: numValue, reason: cleanReason }
    : { type, value: numValue };
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

  const safeSubtotal =
    typeof subtotal === 'number' && Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0;
  if (safeSubtotal <= 0) return 0;
  return Math.round((safeSubtotal * normalized.value) / 100);
};

export interface SurchargeSnapshotClientLike {
  basePrice?: number;
  extrasPrice?: number;
  surchargeType?: unknown;
  surchargeValue?: unknown;
  surchargeAmount?: unknown;
  surchargeReason?: unknown;
}

export interface ResolvedBookingSurcharge {
  surcharge: SlotSurcharge | null;
  surchargeType?: SurchargeType;
  surchargeValue?: number;
  surchargeAmount: number;
  surchargeReason?: string;
}

export const resolveBookingSurcharge = (params: {
  clientData?: SurchargeSnapshotClientLike | Record<string, unknown> | null;
  slotSurcharge?: unknown;
  subtotal?: number;
}): ResolvedBookingSurcharge => {
  const { clientData, slotSurcharge, subtotal } = params;
  const cd = (clientData || null) as Record<string, unknown> | null;
  const computedSubtotal =
    typeof subtotal === 'number' && Number.isFinite(subtotal) && subtotal >= 0
      ? subtotal
      : Math.max(0, Number(cd?.basePrice) || 0) + Math.max(0, Number(cd?.extrasPrice) || 0);

  if (cd && (cd.surchargeType === 'fixed' || cd.surchargeType === 'percentage')) {
    const snapshot = normalizeSlotSurcharge({
      type: cd.surchargeType,
      value: cd.surchargeValue,
      reason: cd.surchargeReason,
    });
    if (snapshot) {
      const hasExplicitAmount =
        typeof cd.surchargeAmount === 'number' &&
        Number.isFinite(cd.surchargeAmount) &&
        cd.surchargeAmount >= 0;
      const surchargeAmount = hasExplicitAmount
        ? Math.round(cd.surchargeAmount as number)
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
    cd &&
    typeof cd.surchargeAmount === 'number' &&
    Number.isFinite(cd.surchargeAmount) &&
    cd.surchargeAmount > 0
  ) {
    const amount = Math.round(cd.surchargeAmount);
    const reason = normalizeSurchargeReason(cd.surchargeReason);
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
