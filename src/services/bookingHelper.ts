import type {
  ClientData,
  ServiceItem,
  BookedServiceItem,
  PriceExtra,
} from '../types';

export const formatEstimatedDuration = (minutes: number): string => {
  if (!minutes || isNaN(minutes) || minutes <= 0) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m (${minutes} min)` : `${hours}h (${minutes} min)`;
};

export const formatCompactDuration = (minutes: number): string => {
  if (!minutes || isNaN(minutes) || minutes <= 0) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
};

export interface ResolvedSlotDuration {
  minutes: number | null;
  label: string | null;
}

export const resolveSlotDuration = (slot: {
  estimatedDurationMinutes?: number;
  estimatedDuration?: string;
  clientData?: {
    estimatedDurationMinutes?: number;
    estimatedDuration?: string;
    bookedServices?: Array<{ durationMinutes?: number }>;
  } | null;
}): ResolvedSlotDuration => {
  const clientMinutes = Number(slot.clientData?.estimatedDurationMinutes);
  if (!isNaN(clientMinutes) && clientMinutes > 0) {
    return { minutes: clientMinutes, label: formatCompactDuration(clientMinutes) };
  }

  if (Array.isArray(slot.clientData?.bookedServices) && slot.clientData.bookedServices.length > 0) {
    const bookedMinutes = slot.clientData.bookedServices.reduce((sum, bs) => {
      const m = Number(bs.durationMinutes);
      return sum + (!isNaN(m) && m > 0 ? m : 0);
    }, 0);
    if (bookedMinutes > 0) {
      return { minutes: bookedMinutes, label: formatCompactDuration(bookedMinutes) };
    }
  }

  const slotMinutes = Number(slot.estimatedDurationMinutes);
  if (!isNaN(slotMinutes) && slotMinutes > 0) {
    return { minutes: slotMinutes, label: formatCompactDuration(slotMinutes) };
  }

  const textFallback =
    slot.clientData?.estimatedDuration?.trim() || slot.estimatedDuration?.trim() || '';
  if (textFallback) {
    return { minutes: null, label: textFallback };
  }

  return { minutes: null, label: null };
};

export const formatSlotEndTime = (
  datetime: string,
  durationMinutes: number | null | undefined
): string | null => {
  if (!datetime || !durationMinutes || isNaN(durationMinutes) || durationMinutes <= 0) {
    return null;
  }
  const startMs = new Date(datetime).getTime();
  if (isNaN(startMs)) return null;

  const endDate = new Date(startMs + durationMinutes * 60 * 1000);
  return endDate.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export type SlotFinancialState = 'pending_balance' | 'paid_in_full' | 'deposit_only';

export interface ResolvedSlotFinancials {
  paidDeposit: number;
  estimatedTotal: number | null;
  pendingBalance: number | null;
  state: SlotFinancialState;
}

export const resolveSlotFinancials = (slot: {
  paidAmount?: number | null;
  depositAmount?: number | null;
  clientData?: { estimatedPrice?: number | null } | null;
}): ResolvedSlotFinancials => {
  const rawPaid = Number(slot.paidAmount);
  const rawDeposit = Number(slot.depositAmount);
  const paidDeposit =
    !isNaN(rawPaid) && rawPaid > 0
      ? rawPaid
      : !isNaN(rawDeposit) && rawDeposit > 0
      ? rawDeposit
      : 0;

  const rawEstimated = Number(slot.clientData?.estimatedPrice);
  const estimatedTotal = !isNaN(rawEstimated) && rawEstimated > 0 ? rawEstimated : null;

  if (estimatedTotal === null) {
    return {
      paidDeposit,
      estimatedTotal: null,
      pendingBalance: null,
      state: 'deposit_only',
    };
  }

  const pendingBalance = Math.max(0, estimatedTotal - paidDeposit);
  return {
    paidDeposit,
    estimatedTotal,
    pendingBalance,
    state: pendingBalance > 0 ? 'pending_balance' : 'paid_in_full',
  };
};

export const calculateDurationFromServices = (
  selectedServiceNames: string[] = [],
  availableServices: ServiceItem[] = []
): number => {
  if (!selectedServiceNames || selectedServiceNames.length === 0) return 0;
  return selectedServiceNames.reduce((total, sName) => {
    const found = availableServices.find(
      (s) => s.name.trim().toLowerCase() === sName.trim().toLowerCase()
    );
    return total + (found ? found.durationMinutes : 0);
  }, 0);
};

export const calculatePriceFromServices = (
  selectedServiceNames: string[] = [],
  availableServices: ServiceItem[] = []
): number => {
  if (!selectedServiceNames || selectedServiceNames.length === 0) return 0;
  return selectedServiceNames.reduce((total, sName) => {
    const found = availableServices.find(
      (s) => s.name.trim().toLowerCase() === sName.trim().toLowerCase()
    );
    return total + (found && !isNaN(Number(found.basePrice)) ? Number(found.basePrice) : 0);
  }, 0);
};

export const sanitizeClientData = (clientData?: Partial<ClientData> | null): ClientData => {
  const name = (clientData?.name || '').trim();
  const email = (clientData?.email || '').trim().toLowerCase();
  const phone = (clientData?.phone || '').trim();
  const notes = (clientData?.notes || '').trim();
  const selectedRules = Array.isArray(clientData?.selectedRules)
    ? clientData.selectedRules.map((r) => r.trim()).filter(Boolean)
    : [];

  let bookedServices: BookedServiceItem[] | undefined = undefined;
  if (Array.isArray(clientData?.bookedServices) && clientData.bookedServices.length > 0) {
    bookedServices = clientData.bookedServices.map((bs, sIdx) => ({
      serviceId: String(bs.serviceId || `srv-${sIdx}`),
      name: String(bs.name || '').trim(),
      basePrice:
        !isNaN(Number(bs.basePrice)) && Number(bs.basePrice) >= 0 ? Number(bs.basePrice) : 0,
      durationMinutes:
        !isNaN(Number(bs.durationMinutes)) && Number(bs.durationMinutes) >= 0
          ? Number(bs.durationMinutes)
          : 0,
      extras: Array.isArray(bs.extras)
        ? bs.extras.map((ex, eIdx) => ({
            id: String(ex.id || `extra-${eIdx}`),
            name: String(ex.name || '').trim(),
            price: !isNaN(Number(ex.price)) && Number(ex.price) >= 0 ? Number(ex.price) : 0,
            selected: Boolean(ex.selected),
          }))
        : [],
    }));
  }

  let selectedServices = Array.isArray(clientData?.selectedServices)
    ? clientData.selectedServices.map((s) => s.trim()).filter(Boolean)
    : [];

  if (bookedServices && bookedServices.length > 0) {
    selectedServices = bookedServices.map((s) => s.name).filter(Boolean);
  }

  let selectedService = (clientData?.selectedService || '').trim();
  if (!selectedService && selectedServices.length > 0) {
    selectedService = selectedServices.join(' + ');
  }

  let basePrice =
    !isNaN(Number(clientData?.basePrice)) && Number(clientData?.basePrice) >= 0
      ? Number(clientData?.basePrice)
      : 0;

  if (bookedServices && bookedServices.length > 0) {
    const sumBase = bookedServices.reduce((sum, s) => sum + s.basePrice, 0);
    if (sumBase > 0 || basePrice === 0) {
      basePrice = sumBase;
    }
  }

  let selectedExtras: PriceExtra[] = [];
  if (bookedServices && bookedServices.length > 0) {
    bookedServices.forEach((s) => {
      s.extras.forEach((ex) => {
        if (ex.selected) {
          selectedExtras.push({
            id: ex.id,
            name: ex.name,
            price: ex.price,
          });
        }
      });
    });
  } else if (Array.isArray(clientData?.selectedExtras)) {
    selectedExtras = clientData.selectedExtras.map((ex, idx) => ({
      id: String(ex.id || `extra-${idx}`),
      name: String(ex.name || '').trim(),
      price: !isNaN(Number(ex.price)) && Number(ex.price) >= 0 ? Number(ex.price) : 0,
    }));
  }

  // Synthesize bookedServices for backward compatibility with legacy slot records
  if (!bookedServices && (selectedServices.length > 0 || selectedService)) {
    const sName = selectedServices[0] || selectedService || 'Servicio';
    bookedServices = [
      {
        serviceId: 'srv-legacy',
        name: sName,
        basePrice,
        durationMinutes: Number(clientData?.estimatedDurationMinutes) || 30,
        extras: selectedExtras.map((e) => ({
          ...e,
          selected: true,
        })),
      },
    ];
  }

  const extrasPrice = selectedExtras.reduce((sum, ex) => sum + ex.price, 0);

  let rawMinutes = Number(clientData?.estimatedDurationMinutes);
  if ((isNaN(rawMinutes) || rawMinutes <= 0) && bookedServices && bookedServices.length > 0) {
    rawMinutes = bookedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  }
  const estimatedDurationMinutes = !isNaN(rawMinutes) && rawMinutes > 0 ? rawMinutes : 0;

  const estimatedDuration =
    clientData?.estimatedDuration && clientData.estimatedDuration.trim() !== ''
      ? clientData.estimatedDuration.trim()
      : formatEstimatedDuration(estimatedDurationMinutes);

  const rawEstimatedPrice = Number(clientData?.estimatedPrice);
  const estimatedPrice =
    !isNaN(rawEstimatedPrice) && rawEstimatedPrice >= 0
      ? rawEstimatedPrice
      : basePrice + extrasPrice;

  return {
    name,
    email,
    phone,
    notes,
    bookedServices,
    selectedRules: selectedRules.length > 0 ? selectedRules : selectedServices,
    selectedService: selectedService || undefined,
    selectedServices: selectedServices.length > 0 ? selectedServices : undefined,
    basePrice,
    selectedExtras,
    extrasPrice,
    estimatedDurationMinutes,
    estimatedDuration,
    estimatedPrice,
  };
};
