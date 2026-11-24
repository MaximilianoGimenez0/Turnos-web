import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  Slot,
  ClientData,
  PriceExtra,
  BookedServiceItem,
  BookedServiceExtra,
} from '../../../types';
import { useServices } from '../../../context/ServicesContext';
import { useTenant } from '../../../context/TenantContext';
import {
  formatEstimatedDuration,
  resolveSlotServicesWithLiveCatalog,
} from '../../../services/bookingHelper';
import { validateSlotNoConflict } from '../../../services/schedulingService';
import { formatBusinessTime } from '../../../utils/dateUtils';

export interface UseSlotBookingFormOptions {
  slot: Slot;
  existingSlots?: Slot[];
  initialClientData?: ClientData | null;
  onClose: () => void;
  disableEscapeClose?: boolean;
}

export function buildInitialExtrasMap(clientData?: ClientData | null): Record<string, string[]> {
  const initial: Record<string, string[]> = {};
  if (clientData?.bookedServices && clientData.bookedServices.length > 0) {
    clientData.bookedServices.forEach((bs) => {
      initial[bs.serviceId] = (bs.extras || []).filter((e) => e.selected).map((e) => e.id);
    });
  }
  return initial;
}

export function buildInitialServiceNames(clientData?: ClientData | null): string[] {
  if (!clientData) return [];
  if (clientData.selectedServices && clientData.selectedServices.length > 0) {
    return clientData.selectedServices;
  }
  if (clientData.selectedService) {
    return [clientData.selectedService];
  }
  return [];
}

export function useSlotBookingForm({
  slot,
  existingSlots,
  initialClientData,
  onClose,
  disableEscapeClose = false,
}: UseSlotBookingFormOptions) {
  const { timezone } = useTenant();
  const { services: allServices } = useServices();

  const [selectedServiceNames, setSelectedServiceNames] = useState<string[]>(() =>
    buildInitialServiceNames(initialClientData)
  );
  const [selectedExtrasByService, setSelectedExtrasByService] = useState<Record<string, string[]>>(
    () => buildInitialExtrasMap(initialClientData)
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableEscapeClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, disableEscapeClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const relevantServices = useMemo(
    () => resolveSlotServicesWithLiveCatalog(slot, allServices),
    [slot, allServices]
  );

  const activeServices = useMemo(() => {
    if (relevantServices.length === 1) {
      return relevantServices;
    }
    return relevantServices.filter((s) => selectedServiceNames.includes(s.name));
  }, [relevantServices, selectedServiceNames]);

  const handleToggleService = useCallback(
    (serviceName: string) => {
      const service = relevantServices.find((s) => s.name === serviceName);
      setSelectedServiceNames((prev) => {
        if (prev.includes(serviceName)) {
          if (service) {
            setSelectedExtrasByService((extrasPrev) => {
              const next = { ...extrasPrev };
              delete next[service.id];
              return next;
            });
          }
          return prev.filter((s) => s !== serviceName);
        }
        return [...prev, serviceName];
      });
    },
    [relevantServices]
  );

  const handleToggleServiceExtra = useCallback((serviceId: string, extraId: string) => {
    setSelectedExtrasByService((prev) => {
      const current = prev[serviceId] || [];
      const updated = current.includes(extraId)
        ? current.filter((id) => id !== extraId)
        : [...current, extraId];
      return {
        ...prev,
        [serviceId]: updated,
      };
    });
  }, []);

  const bookedServices: BookedServiceItem[] = useMemo(() => {
    return activeServices.map((service) => {
      const checkedIds = selectedExtrasByService[service.id] || [];
      const extras: BookedServiceExtra[] = (service.extras || []).map((ex) => ({
        id: ex.id,
        name: ex.name,
        price: ex.price,
        selected: checkedIds.includes(ex.id),
      }));
      return {
        serviceId: service.id,
        name: service.name,
        basePrice: service.basePrice,
        durationMinutes: service.durationMinutes,
        extras,
      };
    });
  }, [activeServices, selectedExtrasByService]);

  const selectedExtras: PriceExtra[] = useMemo(() => {
    const result: PriceExtra[] = [];
    bookedServices.forEach((s) => {
      s.extras.forEach((ex) => {
        if (ex.selected) {
          result.push({
            id: ex.id,
            name: ex.name,
            price: ex.price,
          });
        }
      });
    });
    return result;
  }, [bookedServices]);

  const hasConfiguredExtras = useMemo(
    () => activeServices.some((s) => (s.extras || []).length > 0),
    [activeServices]
  );

  const totalEstimatedMinutes = useMemo(() => {
    const total = bookedServices.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    return total > 0 ? total : 0;
  }, [bookedServices]);

  const baseServicePrice = useMemo(
    () => bookedServices.reduce((sum, s) => sum + (s.basePrice || 0), 0),
    [bookedServices]
  );

  const totalExtrasPrice = useMemo(
    () => selectedExtras.reduce((acc, curr) => acc + (curr.price || 0), 0),
    [selectedExtras]
  );

  const totalFinalEstimatedPrice = useMemo(
    () => (baseServicePrice || 0) + totalExtrasPrice,
    [baseServicePrice, totalExtrasPrice]
  );

  const balanceDueAtSalon = useMemo(() => {
    const balance = totalFinalEstimatedPrice - (slot.depositAmount || 0);
    return balance > 0 ? balance : 0;
  }, [totalFinalEstimatedPrice, slot.depositAmount]);

  const liveConflictValidation = useMemo(() => {
    if (!existingSlots || existingSlots.length === 0 || totalEstimatedMinutes <= 0) {
      return { isValid: true, conflictingSlots: [] };
    }
    return validateSlotNoConflict(
      {
        id: slot.id,
        datetime: slot.datetime,
        estimatedDurationMinutes: totalEstimatedMinutes,
      },
      existingSlots
    );
  }, [existingSlots, slot.id, slot.datetime, totalEstimatedMinutes]);

  const hasLiveDurationConflict = activeServices.length > 0 && !liveConflictValidation.isValid;

  const formattedDate = useMemo(() => {
    const slotDate = new Date(slot.datetime);
    if (isNaN(slotDate.getTime())) return slot.datetime;
    return slotDate.toLocaleDateString('es-AR', {
      timeZone: timezone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [slot.datetime, timezone]);

  const formattedTime = useMemo(
    () => formatBusinessTime(slot.datetime, timezone),
    [slot.datetime, timezone]
  );

  const buildClientDataPayload = useCallback(
    (fields: { name: string; email: string; phone: string; notes: string }, fallbackTitle: string): ClientData => {
      const serviceTitle =
        activeServices.map((s) => s.name).join(' + ') || slot.serviceName || fallbackTitle;

      return {
        name: fields.name.trim(),
        email: fields.email.trim().toLowerCase(),
        phone: fields.phone.trim(),
        notes: fields.notes.trim() || '',
        bookedServices,
        selectedService: serviceTitle,
        selectedServices: activeServices.map((s) => s.name),
        selectedRules: activeServices.map((s) => s.name),
        basePrice: baseServicePrice,
        selectedExtras,
        extrasPrice: totalExtrasPrice,
        estimatedDurationMinutes: totalEstimatedMinutes,
        estimatedDuration:
          totalEstimatedMinutes > 0 ? formatEstimatedDuration(totalEstimatedMinutes) : '30 min',
        estimatedPrice: totalFinalEstimatedPrice,
      };
    },
    [
      activeServices,
      slot.serviceName,
      bookedServices,
      baseServicePrice,
      selectedExtras,
      totalExtrasPrice,
      totalEstimatedMinutes,
      totalFinalEstimatedPrice,
    ]
  );

  return {
    relevantServices,
    activeServices,
    selectedServiceNames,
    selectedExtrasByService,
    bookedServices,
    selectedExtras,
    hasConfiguredExtras,
    totalEstimatedMinutes,
    baseServicePrice,
    totalExtrasPrice,
    totalFinalEstimatedPrice,
    balanceDueAtSalon,
    hasLiveDurationConflict,
    formattedDate,
    formattedTime,
    handleToggleService,
    handleToggleServiceExtra,
    buildClientDataPayload,
  };
}
