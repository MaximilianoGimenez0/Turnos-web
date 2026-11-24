import {
  collection,
  doc,
  getDocs,
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
  VerifyPaymentPayload,
  PublicVerifiedBookingSummary,
  AdminCreateSlotsPayload,
  AdminSlotActionPayload,
  AdminAssignSlotPayload,
} from '../types';

const TENANTS_COLLECTION = 'tenants';
const SLOTS_COLLECTION = 'slots';
const PUBLIC_META_COLLECTION = 'public_meta';
const PUBLIC_AVAILABILITY_DOC = 'availability';
const PUBLIC_LOOKBACK_MS = 12 * 60 * 60 * 1000;

export interface AvailableSlotsSnapshot {
  availableSlots: Slot[];
  blockingSlots: Slot[];
}

const assertTenantId = (tenantId: string): string => {
  const clean = String(tenantId ?? '').trim();
  if (!clean) {
    throw new Error('Se requiere un tenantId válido.');
  }
  return clean;
};

const getTenantSlotsCollectionRef = (tenantId: string) =>
  collection(db, TENANTS_COLLECTION, assertTenantId(tenantId), SLOTS_COLLECTION);

const getTenantAvailabilityDocRef = (tenantId: string) =>
  doc(
    db,
    TENANTS_COLLECTION,
    assertTenantId(tenantId),
    PUBLIC_META_COLLECTION,
    PUBLIC_AVAILABILITY_DOC
  );

/**
 * Subscribes to the consolidated PII-free `tenants/{tenantId}/public_meta/availability` document
 * (1 Firestore read per visit), unpacking available, pending_payment and confirmed slots with a
 * 12-hour lookback so ongoing appointments are never missed.
 */
export const subscribeToAvailableSlots = (
  tenantId: string,
  onSuccess: (payload: AvailableSlotsSnapshot) => void,
  onError?: (error: Error) => void
) => {
  const validTenantId = assertTenantId(tenantId);
  const availabilityRef = getTenantAvailabilityDocRef(validTenantId);

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
    availabilityRef,
    (snapshot) => {
      hasInitialSnapshot = true;
      const lookbackStartMs = Date.now() - PUBLIC_LOOKBACK_MS;
      const docData = snapshot.exists()
        ? (snapshot.data() as { slots?: Record<string, Omit<Slot, 'id'>> })
        : null;
      const slotsMap =
        docData && docData.slots && typeof docData.slots === 'object'
          ? docData.slots
          : {};

      rawDocs = Object.entries(slotsMap)
        .filter(([, value]) => Boolean(value && typeof value === 'object'))
        .map(([id, value]) => ({
          id,
          tenantId: validTenantId,
          ...value,
        }))
        .filter((slot) => {
          const ms = slot.datetime ? new Date(slot.datetime).getTime() : 0;
          return !isNaN(ms) && ms >= lookbackStartMs;
        })
        .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

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

export const subscribeToSlotsInRange = (
  tenantId: string,
  startIso: string,
  endIso: string,
  onSuccess: (slots: Slot[]) => void,
  onError?: (error: Error) => void
) => {
  const validTenantId = assertTenantId(tenantId);
  const q = query(
    getTenantSlotsCollectionRef(validTenantId),
    where('datetime', '>=', startIso),
    where('datetime', '<=', endIso),
    orderBy('datetime', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const slots: Slot[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        tenantId: validTenantId,
        ...(docSnap.data() as Omit<Slot, 'id'>),
      }));
      onSuccess(slots);
    },
    (err) => {
      console.error('Error al escuchar turnos del período:', err);
      if (onError) onError(err);
    }
  );
};

export const subscribeToAllSlots = (
  tenantId: string,
  onSuccess: (slots: Slot[]) => void,
  onError?: (error: Error) => void
) => {
  const validTenantId = assertTenantId(tenantId);
  const q = query(getTenantSlotsCollectionRef(validTenantId), orderBy('datetime', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const slots: Slot[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        tenantId: validTenantId,
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

export const fetchAllSlotsOnce = async (tenantId: string): Promise<Slot[]> => {
  const validTenantId = assertTenantId(tenantId);
  const q = query(getTenantSlotsCollectionRef(validTenantId), orderBy('datetime', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    tenantId: validTenantId,
    ...(docSnap.data() as Omit<Slot, 'id'>),
  }));
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

export const createMultipleSlots = async (
  tenantId: string,
  slotsData: NewSlotData[]
): Promise<string[]> => {
  const validTenantId = assertTenantId(tenantId);
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

  const createSlotsFn = httpsCallable<AdminCreateSlotsPayload, { createdIds: string[] }>(
    functions,
    'adminCreateSlots'
  );
  const result = await createSlotsFn({ tenantId: validTenantId, slots: sanitizedSlots });
  return result.data.createdIds;
};

export const createSlot = async (tenantId: string, slotData: NewSlotData): Promise<string> => {
  const createdIds = await createMultipleSlots(tenantId, [slotData]);
  if (!createdIds[0]) {
    throw new Error('No se pudo crear el turno seleccionado.');
  }
  return createdIds[0];
};

export const cancelSlot = async (tenantId: string, slotId: string): Promise<void> => {
  const validTenantId = assertTenantId(tenantId);
  const cancelFn = httpsCallable<AdminSlotActionPayload, { success: boolean }>(
    functions,
    'adminCancelSlot'
  );
  await cancelFn({ tenantId: validTenantId, slotId });
};

export const assignSlotManually = async (
  tenantId: string,
  slotId: string,
  clientData: ClientData
): Promise<void> => {
  const validTenantId = assertTenantId(tenantId);
  const sanitizedClient = sanitizeClientData(clientData);
  if (!sanitizedClient.name) {
    throw new Error('El nombre del cliente es obligatorio para asignar el turno.');
  }

  const assignFn = httpsCallable<AdminAssignSlotPayload, { success: boolean }>(
    functions,
    'adminAssignSlot'
  );
  await assignFn({ tenantId: validTenantId, slotId, clientData: sanitizedClient });
};

export const releaseSlot = async (tenantId: string, slotId: string): Promise<void> => {
  const validTenantId = assertTenantId(tenantId);
  const releaseFn = httpsCallable<AdminSlotActionPayload, { status: 'available' | 'conflict' }>(
    functions,
    'adminReleaseSlot'
  );
  await releaseFn({ tenantId: validTenantId, slotId });
};

export const deleteSlot = async (tenantId: string, slotId: string): Promise<void> => {
  const validTenantId = assertTenantId(tenantId);
  const deleteFn = httpsCallable<AdminSlotActionPayload, { success: boolean }>(
    functions,
    'adminDeleteSlot'
  );
  await deleteFn({ tenantId: validTenantId, slotId });
};

export interface VerifyPaymentResult {
  success: boolean;
  status?: string;
  slotId?: string;
  bookingDetails?: PublicVerifiedBookingSummary;
}

export const requestPaymentPreference = async (
  tenantId: string,
  payload: Omit<CreatePreferencePayload, 'tenantId'> & { tenantId?: string }
): Promise<CreatePreferenceResponse> => {
  const validTenantId = assertTenantId(tenantId);
  const createPreferenceFn = httpsCallable<CreatePreferencePayload, CreatePreferenceResponse>(
    functions,
    'createPreference'
  );
  const result = await createPreferenceFn({
    ...payload,
    tenantId: validTenantId,
  });
  return result.data;
};

export const verifySlotPayment = async (
  tenantId: string,
  paymentId?: string,
  slotId?: string
): Promise<VerifyPaymentResult> => {
  const validTenantId = assertTenantId(tenantId);
  const verifyPaymentFn = httpsCallable<VerifyPaymentPayload, VerifyPaymentResult>(
    functions,
    'verifyPayment'
  );
  const result = await verifyPaymentFn({
    tenantId: validTenantId,
    paymentId,
    slotId,
  });
  return result.data;
};
