import { useState, useEffect, useCallback } from 'react';
import type { Slot, NewSlotData, ClientData } from '../types';
import {
  subscribeToAvailableSlots,
  subscribeToAllSlots,
  subscribeToSlotsInRange,
  createSlot,
  createMultipleSlots,
  cancelSlot,
  assignSlotManually,
  releaseSlot,
  deleteSlot,
  requestPaymentPreference,
  type AvailableSlotsSnapshot,
} from '../services/db';
import { useOptionalTenant } from '../context/TenantContext';

export interface SlotsRangeFilter {
  startIso: string;
  endIso: string;
}

interface UseSlotsOptions {
  tenantId?: string;
  mode?: 'available' | 'all';
  range?: SlotsRangeFilter | null;
}

export const useSlots = (options: UseSlotsOptions = { mode: 'available' }) => {
  const tenant = useOptionalTenant();
  const tenantId = options.tenantId ?? tenant?.tenantId ?? '';
  const mode = options.mode ?? 'available';
  const rangeStartIso = options.range?.startIso ?? null;
  const rangeEndIso = options.range?.endIso ?? null;
  const subscriptionKey = `${tenantId}:${
    mode === 'all' ? `all:${rangeStartIso ?? '*'}..${rangeEndIso ?? '*'}` : 'available'
  }`;

  const [slots, setSlots] = useState<Slot[]>([]);
  const [blockingSlots, setBlockingSlots] = useState<Slot[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = Boolean(tenantId) && loadedKey !== subscriptionKey;

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    let isSubscribed = true;

    const handleAllSuccess = (fetchedSlots: Slot[]) => {
      if (isSubscribed) {
        setSlots(fetchedSlots);
        setBlockingSlots([]);
        setError(null);
        setLoadedKey(subscriptionKey);
      }
    };

    const handleAvailableSuccess = (snapshot: AvailableSlotsSnapshot) => {
      if (isSubscribed) {
        setSlots(snapshot.availableSlots);
        setBlockingSlots(snapshot.blockingSlots);
        setError(null);
        setLoadedKey(subscriptionKey);
      }
    };

    const handleError = (err: Error) => {
      if (isSubscribed) {
        setError(err.message || 'Error al obtener los turnos');
        setLoadedKey(subscriptionKey);
      }
    };

    const unsubscribe =
      mode === 'all'
        ? rangeStartIso && rangeEndIso
          ? subscribeToSlotsInRange(
              tenantId,
              rangeStartIso,
              rangeEndIso,
              handleAllSuccess,
              handleError
            )
          : subscribeToAllSlots(tenantId, handleAllSuccess, handleError)
        : subscribeToAvailableSlots(tenantId, handleAvailableSuccess, handleError);

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [tenantId, mode, rangeStartIso, rangeEndIso, subscriptionKey]);

  const addSlot = useCallback(
    async (data: NewSlotData) => {
      setError(null);
      try {
        return await createSlot(tenantId, data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al crear el turno';
        setError(msg);
        throw err;
      }
    },
    [tenantId]
  );

  const addMultipleSlots = useCallback(
    async (dataArray: NewSlotData[]) => {
      setError(null);
      try {
        return await createMultipleSlots(tenantId, dataArray);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al crear los turnos';
        setError(msg);
        throw err;
      }
    },
    [tenantId]
  );

  const cancelExistingSlot = useCallback(
    async (slotId: string) => {
      setError(null);
      try {
        await cancelSlot(tenantId, slotId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al cancelar el turno';
        setError(msg);
        throw err;
      }
    },
    [tenantId]
  );

  const assignSlot = useCallback(
    async (slotId: string, clientData: ClientData) => {
      setError(null);
      try {
        await assignSlotManually(tenantId, slotId, clientData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al asignar el turno';
        setError(msg);
        throw err;
      }
    },
    [tenantId]
  );

  const releaseExistingSlot = useCallback(
    async (slotId: string) => {
      setError(null);
      try {
        await releaseSlot(tenantId, slotId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al liberar el turno';
        setError(msg);
        throw err;
      }
    },
    [tenantId]
  );

  const deleteExistingSlot = useCallback(
    async (slotId: string) => {
      setError(null);
      try {
        await deleteSlot(tenantId, slotId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al eliminar el turno';
        setError(msg);
        throw err;
      }
    },
    [tenantId]
  );

  const bookAndCheckout = useCallback(
    async (slotId: string, clientData: ClientData): Promise<string> => {
      setError(null);
      try {
        const prefResponse = await requestPaymentPreference(tenantId, {
          slotId,
          clientData,
        });

        return prefResponse.initPoint;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Error durante el proceso de reserva y pago';
        setError(msg);
        throw err;
      }
    },
    [tenantId]
  );

  return {
    slots,
    blockingSlots,
    loading,
    error,
    addSlot,
    addMultipleSlots,
    assignSlot,
    cancelExistingSlot,
    releaseExistingSlot,
    deleteExistingSlot,
    bookAndCheckout,
  };
};
