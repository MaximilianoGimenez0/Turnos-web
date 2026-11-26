import {
  calculateSurchargeAmount,
  normalizeSlotSurcharge,
  type SlotSurcharge,
  type SurchargeType,
} from './surcharge';

export interface PriceExtra {
  id: string;
  name: string;
  price: number;
}

export interface BookedServiceExtra {
  id: string;
  name: string;
  price: number;
  selected: boolean;
}

export interface BookedServiceItem {
  serviceId: string;
  name: string;
  basePrice: number;
  durationMinutes: number;
  extras: BookedServiceExtra[];
}

export interface CatalogService {
  id?: string;
  name: string;
  basePrice: number;
  durationMinutes: number;
  extras?: PriceExtra[];
}

export interface ClientPayload {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  bookedServices?: BookedServiceItem[];
  selectedRules?: string[];
  selectedService?: string;
  selectedServices?: string[];
  basePrice?: number;
  selectedExtras?: PriceExtra[];
  extrasPrice?: number;
  surchargeType?: SurchargeType;
  surchargeValue?: number;
  surchargeAmount?: number;
  surchargeReason?: string;
  estimatedDurationMinutes?: number;
  estimatedDuration?: string;
  estimatedPrice?: number;
}

export interface ValidatedBookingData {
  clientDataToSave: Record<string, unknown>;
  estimatedDurationMinutes: number;
  estimatedDuration: string;
  normalizedEmail: string;
  normalizedName: string;
  normalizedPhone: string;
}

export interface ValidateBookingOptions {
  requireEmail?: boolean;
  liveCatalog?: CatalogService[];
  slotSurcharge?: SlotSurcharge | null;
}

export const MAX_BOOKING_DURATION_MINUTES = 720;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 120;
const MAX_PHONE_LENGTH = 25;
const MAX_NOTES_LENGTH = 500;

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

export const isValidEmail = (email: string): boolean => {
  const trimmed = (email || '').trim();
  return trimmed.length > 0 && trimmed.length <= MAX_EMAIL_LENGTH && EMAIL_REGEX.test(trimmed);
};

export const maskEmail = (email?: string | null): string => {
  if (!email) return '[none]';
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 1) return '***';
  return `${trimmed.slice(0, 2)}***${trimmed.slice(atIndex)}`;
};

export const formatServerDuration = (minutes: number): string => {
  if (!minutes || isNaN(minutes) || minutes <= 0) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
};

const extractCatalogServices = (rawServices: unknown[] | undefined): CatalogService[] => {
  if (!Array.isArray(rawServices)) return [];

  const catalog: CatalogService[] = [];
  for (const item of rawServices) {
    if (typeof item === 'string') {
      const name = item.trim();
      if (!name) continue;
      catalog.push({
        name,
        basePrice: 0,
        durationMinutes: 30,
        extras: [],
      });
      continue;
    }

    if (typeof item === 'object' && item !== null && 'name' in item) {
      const obj = item as Record<string, unknown>;
      const name = typeof obj.name === 'string' ? obj.name.trim() : '';
      if (!name) continue;

      const basePrice = Number(obj.basePrice);
      const durationMinutes = Number(obj.durationMinutes);
      const rawExtras = Array.isArray(obj.extras) ? obj.extras : [];
      const extras: PriceExtra[] = rawExtras
        .filter((ex): ex is Record<string, unknown> => typeof ex === 'object' && ex !== null)
        .map((ex, idx) => ({
          id: typeof ex.id === 'string' && ex.id.trim() ? ex.id.trim() : `extra-${idx}`,
          name: typeof ex.name === 'string' ? ex.name.trim() : '',
          price: !isNaN(Number(ex.price)) && Number(ex.price) >= 0 ? Number(ex.price) : 0,
        }))
        .filter((ex) => ex.name.length > 0);

      catalog.push({
        id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : undefined,
        name,
        basePrice: !isNaN(basePrice) && basePrice >= 0 ? basePrice : 0,
        durationMinutes: !isNaN(durationMinutes) && durationMinutes > 0 ? durationMinutes : 30,
        extras,
      });
    }
  }
  return catalog;
};

const findCatalogMatch = (
  catalog: CatalogService[],
  serviceId?: string,
  name?: string
): CatalogService | undefined => {
  if (serviceId) {
    const byId = catalog.find((c) => c.id && c.id === serviceId);
    if (byId) return byId;
  }
  if (name) {
    const target = name.trim().toLowerCase();
    return catalog.find((c) => c.name.trim().toLowerCase() === target);
  }
  return undefined;
};

/**
 * Resolves live pricing/duration/extras from /services for the subset of services enabled on a slot,
 * falling back to the slot's embedded snapshot if a service was deleted from /services.
 */
export const resolveAuthoritativeSlotCatalog = (
  slotServices: unknown[] | undefined,
  liveCatalog?: CatalogService[]
): CatalogService[] => {
  const embedded = extractCatalogServices(slotServices);
  if (embedded.length === 0) return [];
  if (!Array.isArray(liveCatalog) || liveCatalog.length === 0) return embedded;

  return embedded.map((slotItem) => {
    const liveMatch = findCatalogMatch(liveCatalog, slotItem.id, slotItem.name);
    if (!liveMatch) return slotItem;
    return {
      id: liveMatch.id || slotItem.id,
      name: liveMatch.name,
      basePrice: liveMatch.basePrice,
      durationMinutes: liveMatch.durationMinutes,
      extras: liveMatch.extras || [],
    };
  });
};

export const validateAndNormalizeClientPayload = (
  clientData: ClientPayload | undefined,
  slotServices: unknown[] | undefined,
  fallbackDurationMinutes = 0,
  options: ValidateBookingOptions = {}
):
  | { valid: true; data: ValidatedBookingData }
  | { valid: false; error: string } => {
  const { requireEmail = true, liveCatalog, slotSurcharge } = options;
  const normalizedSlotSurcharge = normalizeSlotSurcharge(slotSurcharge);

  if (!clientData) {
    return {
      valid: false,
      error: 'Los datos del cliente son obligatorios.',
    };
  }

  const normalizedName = typeof clientData.name === 'string' ? clientData.name.trim() : '';
  if (normalizedName.length < 2 || normalizedName.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: 'El nombre del cliente debe tener entre 2 y 80 caracteres.',
    };
  }

  const normalizedEmail =
    typeof clientData.email === 'string' ? clientData.email.trim().toLowerCase() : '';
  if (requireEmail || normalizedEmail.length > 0) {
    if (!isValidEmail(normalizedEmail)) {
      return {
        valid: false,
        error: 'El correo electrónico del cliente no tiene un formato válido.',
      };
    }
  }

  const normalizedPhone =
    typeof clientData.phone === 'string' ? clientData.phone.trim().slice(0, MAX_PHONE_LENGTH) : '';
  const normalizedNotes =
    typeof clientData.notes === 'string' ? clientData.notes.trim().slice(0, MAX_NOTES_LENGTH) : '';

  const catalog = resolveAuthoritativeSlotCatalog(slotServices, liveCatalog);

  if (catalog.length > 0) {
    const verifiedBookedServices: BookedServiceItem[] = [];
    const seenServiceKeys = new Set<string>();

    if (Array.isArray(clientData.bookedServices) && clientData.bookedServices.length > 0) {
      for (const requested of clientData.bookedServices) {
        const match = findCatalogMatch(catalog, requested.serviceId, requested.name);
        if (!match) {
          return {
            valid: false,
            error: `El servicio seleccionado ("${requested.name || 'desconocido'}") no está habilitado para este turno.`,
          };
        }

        const dedupeKey = match.id || match.name.toLowerCase();
        if (seenServiceKeys.has(dedupeKey)) continue;
        seenServiceKeys.add(dedupeKey);

        const requestedSelectedIds = new Set(
          (requested.extras || [])
            .filter((ex) => ex && ex.selected)
            .map((ex) => (ex.id || '').trim().toLowerCase())
            .filter(Boolean)
        );
        const requestedSelectedNames = new Set(
          (requested.extras || [])
            .filter((ex) => ex && ex.selected)
            .map((ex) => (ex.name || '').trim().toLowerCase())
            .filter(Boolean)
        );

        const verifiedExtras: BookedServiceExtra[] = (match.extras || []).map((authExtra) => ({
          id: authExtra.id,
          name: authExtra.name,
          price: authExtra.price,
          selected:
            requestedSelectedIds.has(authExtra.id.toLowerCase()) ||
            requestedSelectedNames.has(authExtra.name.toLowerCase()),
        }));

        verifiedBookedServices.push({
          serviceId: match.id || `srv-${verifiedBookedServices.length}`,
          name: match.name,
          basePrice: match.basePrice,
          durationMinutes: match.durationMinutes,
          extras: verifiedExtras,
        });
      }
    } else {
      const requestedNames =
        Array.isArray(clientData.selectedServices) && clientData.selectedServices.length > 0
          ? clientData.selectedServices
          : Array.isArray(clientData.selectedRules) && clientData.selectedRules.length > 0
          ? clientData.selectedRules
          : clientData.selectedService
          ? [clientData.selectedService]
          : catalog.length === 1
          ? [catalog[0].name]
          : [];

      const flatExtraIds = new Set(
        (clientData.selectedExtras || [])
          .map((ex) => (ex.id || '').trim().toLowerCase())
          .filter(Boolean)
      );
      const flatExtraNames = new Set(
        (clientData.selectedExtras || [])
          .map((ex) => (ex.name || '').trim().toLowerCase())
          .filter(Boolean)
      );

      for (const reqName of requestedNames) {
        const match = findCatalogMatch(catalog, undefined, reqName);
        if (!match) {
          return {
            valid: false,
            error: `El servicio seleccionado ("${reqName}") no está habilitado para este turno.`,
          };
        }

        const dedupeKey = match.id || match.name.toLowerCase();
        if (seenServiceKeys.has(dedupeKey)) continue;
        seenServiceKeys.add(dedupeKey);

        const verifiedExtras: BookedServiceExtra[] = (match.extras || []).map((authExtra) => ({
          id: authExtra.id,
          name: authExtra.name,
          price: authExtra.price,
          selected:
            flatExtraIds.has(authExtra.id.toLowerCase()) ||
            flatExtraNames.has(authExtra.name.toLowerCase()),
        }));

        verifiedBookedServices.push({
          serviceId: match.id || `srv-${verifiedBookedServices.length}`,
          name: match.name,
          basePrice: match.basePrice,
          durationMinutes: match.durationMinutes,
          extras: verifiedExtras,
        });
      }
    }

    if (verifiedBookedServices.length === 0) {
      return {
        valid: false,
        error: 'Debés seleccionar al menos un servicio válido para reservar este turno.',
      };
    }

    const basePrice = verifiedBookedServices.reduce((sum, s) => sum + s.basePrice, 0);
    const selectedExtras: PriceExtra[] = [];
    for (const srv of verifiedBookedServices) {
      for (const ex of srv.extras) {
        if (ex.selected) {
          selectedExtras.push({ id: ex.id, name: ex.name, price: ex.price });
        }
      }
    }
    const extrasPrice = selectedExtras.reduce((sum, ex) => sum + ex.price, 0);
    const subtotal = basePrice + extrasPrice;
    const surchargeAmount = calculateSurchargeAmount(subtotal, normalizedSlotSurcharge);
    const estimatedPrice = subtotal > 0 ? subtotal + surchargeAmount : 0;
    const estimatedDurationMinutes = Math.min(
      MAX_BOOKING_DURATION_MINUTES,
      verifiedBookedServices.reduce((sum, s) => sum + s.durationMinutes, 0)
    );
    const estimatedDuration = formatServerDuration(estimatedDurationMinutes);
    const selectedServiceNames = verifiedBookedServices.map((s) => s.name);

    return {
      valid: true,
      data: {
        normalizedEmail,
        normalizedName,
        normalizedPhone,
        estimatedDurationMinutes,
        estimatedDuration,
        clientDataToSave: {
          name: normalizedName,
          email: normalizedEmail,
          phone: normalizedPhone,
          notes: normalizedNotes,
          bookedServices: verifiedBookedServices,
          selectedService: selectedServiceNames.join(' + '),
          selectedServices: selectedServiceNames,
          selectedRules: selectedServiceNames,
          basePrice,
          selectedExtras,
          extrasPrice,
          ...(normalizedSlotSurcharge
            ? {
                surchargeType: normalizedSlotSurcharge.type,
                surchargeValue: normalizedSlotSurcharge.value,
                surchargeAmount,
                ...(normalizedSlotSurcharge.reason
                  ? { surchargeReason: normalizedSlotSurcharge.reason }
                  : {}),
              }
            : {}),
          estimatedPrice,
          estimatedDurationMinutes,
          estimatedDuration,
        },
      },
    };
  }

  // Fallback for legacy slots without structured service objects
  const rawDuration = Number(clientData.estimatedDurationMinutes ?? fallbackDurationMinutes ?? 0);
  const clampedDuration =
    !isNaN(rawDuration) && rawDuration > 0
      ? Math.min(MAX_BOOKING_DURATION_MINUTES, Math.round(rawDuration))
      : Math.min(MAX_BOOKING_DURATION_MINUTES, Math.max(0, fallbackDurationMinutes));

  const estimatedDuration = formatServerDuration(clampedDuration);
  const selectedRules = Array.isArray(clientData.selectedRules)
    ? clientData.selectedRules
        .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
        .slice(0, 20)
    : [];

  const clientDataToSave: Record<string, unknown> = {
    name: normalizedName,
    email: normalizedEmail,
    phone: normalizedPhone,
    notes: normalizedNotes,
    selectedRules,
    estimatedDurationMinutes: clampedDuration,
    estimatedDuration,
  };

  if (typeof clientData.selectedService === 'string' && clientData.selectedService.trim()) {
    clientDataToSave.selectedService = clientData.selectedService.trim().slice(0, 150);
  }
  if (Array.isArray(clientData.selectedServices)) {
    clientDataToSave.selectedServices = clientData.selectedServices
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .slice(0, 20);
  }
  const legacyBase =
    typeof clientData.basePrice === 'number' &&
    !isNaN(clientData.basePrice) &&
    clientData.basePrice >= 0
      ? clientData.basePrice
      : undefined;
  const legacyExtras =
    typeof clientData.extrasPrice === 'number' &&
    !isNaN(clientData.extrasPrice) &&
    clientData.extrasPrice >= 0
      ? clientData.extrasPrice
      : undefined;

  if (legacyBase !== undefined) {
    clientDataToSave.basePrice = legacyBase;
  }
  if (legacyExtras !== undefined) {
    clientDataToSave.extrasPrice = legacyExtras;
  }

  if (normalizedSlotSurcharge) {
    const subtotal = (legacyBase || 0) + (legacyExtras || 0);
    const surchargeAmount = calculateSurchargeAmount(subtotal, normalizedSlotSurcharge);
    clientDataToSave.surchargeType = normalizedSlotSurcharge.type;
    clientDataToSave.surchargeValue = normalizedSlotSurcharge.value;
    clientDataToSave.surchargeAmount = surchargeAmount;
    if (normalizedSlotSurcharge.reason) {
      clientDataToSave.surchargeReason = normalizedSlotSurcharge.reason;
    }

    if (subtotal > 0) {
      clientDataToSave.estimatedPrice = subtotal + surchargeAmount;
    } else if (legacyBase === 0) {
      clientDataToSave.estimatedPrice = 0;
    } else if (
      typeof clientData.estimatedPrice === 'number' &&
      !isNaN(clientData.estimatedPrice) &&
      clientData.estimatedPrice > 0
    ) {
      const legacyEstimatedSurcharge = calculateSurchargeAmount(
        clientData.estimatedPrice,
        normalizedSlotSurcharge
      );
      clientDataToSave.surchargeAmount = legacyEstimatedSurcharge;
      clientDataToSave.estimatedPrice = clientData.estimatedPrice + legacyEstimatedSurcharge;
    } else if (
      typeof clientData.estimatedPrice === 'number' &&
      !isNaN(clientData.estimatedPrice) &&
      clientData.estimatedPrice >= 0
    ) {
      clientDataToSave.estimatedPrice = clientData.estimatedPrice;
    }
  } else if (
    typeof clientData.estimatedPrice === 'number' &&
    !isNaN(clientData.estimatedPrice) &&
    clientData.estimatedPrice >= 0
  ) {
    clientDataToSave.estimatedPrice = clientData.estimatedPrice;
  }

  return {
    valid: true,
    data: {
      normalizedEmail,
      normalizedName,
      normalizedPhone,
      estimatedDurationMinutes: clampedDuration,
      estimatedDuration,
      clientDataToSave,
    },
  };
};
