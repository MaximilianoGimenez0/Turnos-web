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

export interface SlotsRangeFilter {
  startIso: string;
  endIso: string;
}

interface UseSlotsOptions {
  mode?: 'available' | 'all';
  range?: SlotsRangeFilter | null;
}

export const useSlots = (options: UseSlotsOptions = { mode: 'available' }) => {
  const mode = options.mode ?? 'available';
  const rangeStartIso = options.range?.startIso ?? null;
  const rangeEndIso = options.range?.endIso ?? null;
  const subscriptionKey =
    mode === 'all' ? `all:${rangeStartIso ?? '*'}..${rangeEndIso ?? '*'}` : 'available';

  const [slots, setSlots] = useState<Slot[]>([]);
  const [blockingSlots, setBlockingSlots] = useState<Slot[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = loadedKey !== subscriptionKey;

  useEffect(() => {
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
          ? subscribeToSlotsInRange(rangeStartIso, rangeEndIso, handleAllSuccess, handleError)
          : subscribeToAllSlots(handleAllSuccess, handleError)
        : subscribeToAvailableSlots(handleAvailableSuccess, handleError);

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [mode, rangeStartIso, rangeEndIso, subscriptionKey]);

  const addSlot = useCallback(async (data: NewSlotData) => {
    setError(null);
    try {
      return await createSlot(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear el turno';
      setError(msg);
      throw err;
    }
  }, []);

  const addMultipleSlots = useCallback(async (dataArray: NewSlotData[]) => {
    setError(null);
    try {
      return await createMultipleSlots(dataArray);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear los turnos';
      setError(msg);
      throw err;
    }
  }, []);

  const cancelExistingSlot = useCallback(async (slotId: string) => {
    setError(null);
    try {
      await cancelSlot(slotId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cancelar el turno';
      setError(msg);
      throw err;
    }
  }, []);

  const assignSlot = useCallback(async (slotId: string, clientData: ClientData) => {
    setError(null);
    try {
      await assignSlotManually(slotId, clientData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al asignar el turno';
      setError(msg);
      throw err;
    }
  }, []);

  const releaseExistingSlot = useCallback(async (slotId: string) => {
    setError(null);
    try {
      await releaseSlot(slotId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al liberar el turno';
      setError(msg);
      throw err;
    }
  }, []);

  const deleteExistingSlot = useCallback(async (slotId: string) => {
    setError(null);
    try {
      await deleteSlot(slotId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar el turno';
      setError(msg);
      throw err;
    }
  }, []);

  const bookAndCheckout = useCallback(
    async (slotId: string, clientData: ClientData): Promise<string> => {
      setError(null);
      try {
        const prefResponse = await requestPaymentPreference({
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
    []
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
