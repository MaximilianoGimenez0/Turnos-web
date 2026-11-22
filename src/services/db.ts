import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebaseConfig';
import { sanitizeClientData } from './bookingHelper';
import {
  extractActiveBlockingSlots,
  filterClientAvailableSlots,
} from './schedulingService';
import type {
  Slot,
  NewSlotData,
  ClientData,
  ServiceItem,
  CreatePreferencePayload,
  CreatePreferenceResponse,
  PublicVerifiedBookingSummary,
} from '../types';

const SLOTS_COLLECTION = 'slots';
const PUBLIC_SLOTS_COLLECTION = 'public_slots';
const PUBLIC_LOOKBACK_MS = 12 * 60 * 60 * 1000;

export interface AvailableSlotsSnapshot {
  availableSlots: Slot[];
  blockingSlots: Slot[];
}

/**
 * Subscribes to the PII-free `public_slots` projection (available, pending_payment, confirmed)
 * bounded to a 12-hour lookback so ongoing confirmed appointments are never missed.
 */
export const subscribeToAvailableSlots = (
  onSuccess: (payload: AvailableSlotsSnapshot) => void,
  onError?: (error: Error) => void
) => {
  const lookbackStartIso = new Date(Date.now() - PUBLIC_LOOKBACK_MS).toISOString();
  const q = query(
    collection(db, PUBLIC_SLOTS_COLLECTION),
    where('status', 'in', ['available', 'pending_payment', 'confirmed']),
    where('datetime', '>=', lookbackStartIso),
    orderBy('datetime', 'asc')
  );

  let rawDocs: Slot[] = [];
  let hasInitialSnapshot = false;

  const emitFiltered = () => {
    if (!hasInitialSnapshot) return;
    const nowMs = Date.now();
    onSuccess({
      availableSlots: filterClientAvailableSlots(rawDocs, nowMs),
      blockingSlots: extractActiveBlockingSlots(rawDocs, nowMs),
    });
  };

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      hasInitialSnapshot = true;
      rawDocs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Slot, 'id'>),
      }));
      emitFiltered();
    },
    (err) => {
      console.error('Error al escuchar turnos disponibles:', err);
      if (onError) onError(err);
    }
  );

  // Single 30s timer re-evaluates lock expirations and 15-min booking anticipation without extra reads
  const timer = setInterval(emitFiltered, 30_000);

  return () => {
    clearInterval(timer);
    unsubscribe();
  };
};

export const subscribeToAllSlots = (
  onSuccess: (slots: Slot[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(collection(db, SLOTS_COLLECTION), orderBy('datetime', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const slots: Slot[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Slot, 'id'>),
      }));
      onSuccess(slots);
    },
    (err) => {
      console.error('Error al escuchar todos los turnos:', err);
      if (onError) onError(err);
    }
  );
};

export const sanitizeSlotServices = (services?: (ServiceItem | string)[]): ServiceItem[] => {
  if (!services || !Array.isArray(services)) return [];
  return services.map((s) => {
    if (typeof s === 'string') {
      return {
        id: `srv-${s.trim().toLowerCase().replace(/\s+/g, '-')}`,
        name: s.trim(),
        basePrice: 0,
        durationMinutes: 30,
        extras: [],
        description: '',
      };
    }
    return {
      id: String(s.id || `srv-${Date.now()}`),
      name: String(s.name || '').trim(),
      basePrice: !isNaN(Number(s.basePrice)) && Number(s.basePrice) >= 0 ? Number(s.basePrice) : 0,
      durationMinutes:
        !isNaN(Number(s.durationMinutes)) && Number(s.durationMinutes) > 0
          ? Number(s.durationMinutes)
          : 30,
      extras: Array.isArray(s.extras)
        ? s.extras.map((ex, idx) => ({
            id: String(ex.id || `extra-${idx}`),
            name: String(ex.name || '').trim(),
            price: !isNaN(Number(ex.price)) && Number(ex.price) >= 0 ? Number(ex.price) : 0,
          }))
        : [],
      description: String(s.description || '').trim(),
    };
  });
};

export const createMultipleSlots = async (slotsData: NewSlotData[]): Promise<string[]> => {
  if (slotsData.length === 0) return [];

  const sanitizedSlots = slotsData.map((slotData) => {
    const cleanServices = sanitizeSlotServices(slotData.services);
    if (cleanServices.length === 0) {
      throw new Error('No se puede crear turnos sin asignar al menos un servicio.');
    }
    return {
      ...slotData,
      services: cleanServices,
    };
  });

  const createSlotsFn = httpsCallable<{ slots: NewSlotData[] }, { createdIds: string[] }>(
    functions,
    'adminCreateSlots'
  );
  const result = await createSlotsFn({ slots: sanitizedSlots });
  return result.data.createdIds;
};

export const createSlot = async (slotData: NewSlotData): Promise<string> => {
  const createdIds = await createMultipleSlots([slotData]);
  if (!createdIds[0]) {
    throw new Error('No se pudo crear el turno seleccionado.');
  }
  return createdIds[0];
};

export const cancelSlot = async (slotId: string): Promise<void> => {
  const cancelFn = httpsCallable<{ slotId: string }, { success: boolean }>(
    functions,
    'adminCancelSlot'
  );
  await cancelFn({ slotId });
};

export const assignSlotManually = async (
  slotId: string,
  clientData: ClientData
): Promise<void> => {
  const sanitizedClient = sanitizeClientData(clientData);
  if (!sanitizedClient.name) {
    throw new Error('El nombre del cliente es obligatorio para asignar el turno.');
  }

  const assignFn = httpsCallable<{ slotId: string; clientData: ClientData }, { success: boolean }>(
    functions,
    'adminAssignSlot'
  );
  await assignFn({ slotId, clientData: sanitizedClient });
};

export const releaseSlot = async (slotId: string): Promise<void> => {
  const releaseFn = httpsCallable<{ slotId: string }, { status: 'available' | 'conflict' }>(
    functions,
    'adminReleaseSlot'
  );
  await releaseFn({ slotId });
};

export const deleteSlot = async (slotId: string): Promise<void> => {
  const deleteFn = httpsCallable<{ slotId: string }, { success: boolean }>(
    functions,
    'adminDeleteSlot'
  );
  await deleteFn({ slotId });
};

export const triggerPublicSlotsBackfill = async (): Promise<{
  upsertedCount: number;
  deletedCount: number;
}> => {
  const backfillFn = httpsCallable<undefined, { upsertedCount: number; deletedCount: number }>(
    functions,
    'backfillPublicSlots'
  );
  const result = await backfillFn();
  return result.data;
};

export interface VerifyPaymentResult {
  success: boolean;
  status?: string;
  slotId?: string;
  bookingDetails?: PublicVerifiedBookingSummary;
}

export const requestPaymentPreference = async (
  payload: CreatePreferencePayload
): Promise<CreatePreferenceResponse> => {
  const createPreferenceFn = httpsCallable<CreatePreferencePayload, CreatePreferenceResponse>(
    functions,
    'createPreference'
  );
  const result = await createPreferenceFn(payload);
  return result.data;
};

export const verifySlotPayment = async (
  paymentId?: string,
  slotId?: string
): Promise<VerifyPaymentResult> => {
  const verifyPaymentFn = httpsCallable<
    { paymentId?: string; slotId?: string },
    VerifyPaymentResult
  >(functions, 'verifyPayment');
  const result = await verifyPaymentFn({ paymentId, slotId });
  return result.data;
};
