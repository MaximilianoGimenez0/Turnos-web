import { useState, useEffect, useCallback } from 'react';
import type { Slot, NewSlotData, ClientData } from '../types';
import {
  subscribeToAvailableSlots,
  subscribeToAllSlots,
  createSlot,
  createMultipleSlots,
  cancelSlot,
  assignSlotManually,
  releaseSlot,
  deleteSlot,
  reserveSlotForPayment,
  requestPaymentPreference,
} from '../services/db';

interface UseSlotsOptions {
  mode?: 'available' | 'all';
}

export const useSlots = (options: UseSlotsOptions = { mode: 'available' }) => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    const handleSuccess = (fetchedSlots: Slot[]) => {
      if (isSubscribed) {
        setSlots(fetchedSlots);
        setLoading(false);
      }
    };

    const handleError = (err: Error) => {
      if (isSubscribed) {
        setError(err.message || 'Error al obtener los turnos');
        setLoading(false);
      }
    };

    const unsubscribe =
      options.mode === 'all'
        ? subscribeToAllSlots(handleSuccess, handleError)
        : subscribeToAvailableSlots(handleSuccess, handleError);

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [options.mode]);

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

  /**
   * Reserva temporalmente el turno y obtiene la URL de Checkout Pro de Mercado Pago
   */
  const bookAndCheckout = useCallback(
    async (slotId: string, clientData: ClientData): Promise<string> => {
      setError(null);
      try {
        // 1. Bloqueo temporal por 15 minutos en Firestore
        await reserveSlotForPayment(slotId, clientData, 15);

        // 2. Crear la preferencia en Mercado Pago vía Cloud Function
        const prefResponse = await requestPaymentPreference({
          slotId,
          clientData,
        });

        // 3. Devolver la URL de redirección a Mercado Pago
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
