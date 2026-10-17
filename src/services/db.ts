import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebaseConfig';
import { sanitizeClientData } from './bookingHelper';
import {
  validateSlotNoConflict,
  calculateConflictingAvailableSlots,
  calculateSlotsToReactivate,
  filterClientAvailableSlots,
} from './schedulingService';
import type {
  Slot,
  SlotStatus,
  NewSlotData,
  ClientData,
  ServiceItem,
  CreatePreferencePayload,
  CreatePreferenceResponse,
  BookingEmailPayload,
} from '../types';

const SLOTS_COLLECTION = 'slots';

/**
 * Obtiene todos los turnos registrados de forma asíncrona única (útil para validaciones)
 */
export const getAllSlotsAsync = async (): Promise<Slot[]> => {
  const q = query(collection(db, SLOTS_COLLECTION), orderBy('datetime', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<Slot, 'id'>),
  }));
};

/**
 * Escucha en tiempo real los turnos disponibles para clientes.
 * Descarta turnos pasados (<15 min), turnos con bloqueo de pago activo ('pending_payment')
 * y CUALQUIER turno disponible que entre en conflicto de horario con un turno pendiente activo.
 * Re-evalúa periódicamente cada 30 segundos para desbloquear turnos expirados en el frontend.
 */
export const subscribeToAvailableSlots = (
  onSuccess: (slots: Slot[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(
    collection(db, SLOTS_COLLECTION),
    where('status', 'in', ['available', 'pending_payment']),
    orderBy('datetime', 'asc')
  );

  let rawDocs: Slot[] = [];

  const emitFiltered = () => {
    const filtered = filterClientAvailableSlots(rawDocs);
    onSuccess(filtered);
  };

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
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

  // Intervalo para re-evaluar la lista cruda cada 30 segundos:
  // Libera automáticamente turnos pendientes vencidos sin esperar mutaciones en Firestore.
  const timer = setInterval(emitFiltered, 30000);

  return () => {
    clearInterval(timer);
    unsubscribe();
  };
};

/**
 * Escucha en tiempo real todos los turnos (para panel de administración)
 */
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

/**
 * Sanitiza y valida la lista de servicios asociados al turno antes de persistir en Firestore
 */
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

/**
 * CASO 1: Crea un nuevo turno en la base de datos validando que no entre en conflicto con turnos reservados (Admin)
 */
export const createSlot = async (slotData: NewSlotData): Promise<string> => {
  const cleanServices = sanitizeSlotServices(slotData.services);
  if (cleanServices.length === 0) {
    throw new Error('No se puede crear el turno sin asignar al menos un servicio.');
  }

  const existingSlots = await getAllSlotsAsync();
  const durationMinutes = slotData.estimatedDurationMinutes ?? 30;
  const durationStr = slotData.estimatedDuration || `${durationMinutes} min`;

  // Validar que no exista ya un turno en ese mismo horario
  const isExactDuplicate = existingSlots.some(
    (s) =>
      s.status !== 'cancelled' &&
      new Date(s.datetime).getTime() === new Date(slotData.datetime).getTime()
  );
  if (isExactDuplicate) {
    throw new Error('Ya existe un turno creado en el horario seleccionado.');
  }

  const validation = validateSlotNoConflict(
    { datetime: slotData.datetime, estimatedDurationMinutes: durationMinutes },
    existingSlots
  );

  if (!validation.isValid) {
    throw new Error('No se puede crear el turno porque entra en conflicto con otro turno ya reservado.');
  }

  const docRef = await addDoc(collection(db, SLOTS_COLLECTION), {
    ...slotData,
    services: cleanServices,
    estimatedDurationMinutes: durationMinutes,
    estimatedDuration: durationStr,
    status: 'available',
    clientData: null,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return docRef.id;
};

/**
 * CASO 1: Crea múltiples turnos de forma masiva en una sola operación validando conflictos (Admin)
 */
export const createMultipleSlots = async (slotsData: NewSlotData[]): Promise<string[]> => {
  if (slotsData.length === 0) return [];

  // Validar que todos los turnos tengan servicios asignados
  for (const slotData of slotsData) {
    const cleanServices = sanitizeSlotServices(slotData.services);
    if (cleanServices.length === 0) {
      throw new Error('No se puede crear turnos sin asignar al menos un servicio.');
    }
  }

  const existingSlots = await getAllSlotsAsync();
  const seenTimes = new Set<number>();

  // Validar duplicados exactos y solapamiento contra turnos confirmados existentes
  for (const slotData of slotsData) {
    const timeMs = new Date(slotData.datetime).getTime();
    if (seenTimes.has(timeMs)) {
      throw new Error('La lista contiene horarios duplicados.');
    }
    seenTimes.add(timeMs);

    const isExactDuplicate = existingSlots.some(
      (s) => s.status !== 'cancelled' && new Date(s.datetime).getTime() === timeMs
    );
    if (isExactDuplicate) {
      const dateFormatted = new Date(slotData.datetime).toLocaleString('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      throw new Error(`Ya existe un turno creado en el horario ${dateFormatted}.`);
    }

    const durationMinutes = slotData.estimatedDurationMinutes ?? 30;
    const validation = validateSlotNoConflict(
      { datetime: slotData.datetime, estimatedDurationMinutes: durationMinutes },
      existingSlots
    );
    if (!validation.isValid) {
      throw new Error('No se puede crear el turno porque entra en conflicto con otro turno ya reservado.');
    }
  }

  const batch = writeBatch(db);
  const now = new Date().toISOString();
  const createdIds: string[] = [];

  for (const slotData of slotsData) {
    const slotDocRef = doc(collection(db, SLOTS_COLLECTION));
    createdIds.push(slotDocRef.id);
    const durationMinutes = slotData.estimatedDurationMinutes ?? 30;
    const durationStr = slotData.estimatedDuration || `${durationMinutes} min`;
    const cleanServices = sanitizeSlotServices(slotData.services);

    batch.set(slotDocRef, {
      ...slotData,
      services: cleanServices,
      estimatedDurationMinutes: durationMinutes,
      estimatedDuration: durationStr,
      status: 'available',
      clientData: null,
      expiresAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
  return createdIds;
};

/**
 * CASO 4: Cancela un turno existente y libera automáticamente turnos en conflicto sin solapamiento (Admin)
 * NOTA: Los turnos cancelados manualmente permanecen 'cancelled' y solo se reactivan los 'conflict'.
 */
export const cancelSlot = async (slotId: string): Promise<void> => {
  const allSlots = await getAllSlotsAsync();
  const targetSlot = allSlots.find((s) => s.id === slotId);

  if (!targetSlot) {
    throw new Error('El turno no existe.');
  }

  const batch = writeBatch(db);
  const nowIso = new Date().toISOString();

  // 1. Cancelar el turno objetivo (estado 'cancelled' definitivo)
  const slotRef = doc(db, SLOTS_COLLECTION, slotId);
  batch.update(slotRef, {
    status: 'cancelled',
    updatedAt: nowIso,
  });

  // 2. Si el turno cancelado estaba confirmado, evaluar y reactivar SOLO turnos en 'conflict' que quedaron libres
  if (targetSlot.status === 'confirmed') {
    const slotsToReactivate = calculateSlotsToReactivate(targetSlot, allSlots);
    for (const reactivated of slotsToReactivate) {
      const reactivatedRef = doc(db, SLOTS_COLLECTION, reactivated.id);
      batch.update(reactivatedRef, {
        status: 'available',
        clientData: null,
        estimatedDurationMinutes: 0,
        estimatedDuration: '',
        expiresAt: null,
        updatedAt: nowIso,
      });
    }
  }

  await batch.commit();
};

/**
 * CASO 2 y 3: Asigna y confirma manualmente un turno disponible marcando en 'conflict' los turnos superpuestos (Admin)
 */
export const assignSlotManually = async (
  slotId: string,
  clientData: ClientData
): Promise<void> => {
  const allSlots = await getAllSlotsAsync();
  const targetSlot = allSlots.find((s) => s.id === slotId);

  if (!targetSlot) {
    throw new Error('El turno seleccionado no existe.');
  }

  if (targetSlot.status === 'confirmed') {
    throw new Error('Este turno ya se encuentra confirmado por otro cliente.');
  }

  const sanitizedClient = sanitizeClientData(clientData);

  if (!sanitizedClient.name) {
    throw new Error('El nombre del cliente es obligatorio para asignar el turno.');
  }

  const hasConfiguredServices =
    (targetSlot.services && targetSlot.services.length > 0) ||
    (targetSlot.rules && targetSlot.rules.length > 0);
  const clientHasService =
    (sanitizedClient.selectedServices && sanitizedClient.selectedServices.length > 0) ||
    (sanitizedClient.selectedRules && sanitizedClient.selectedRules.length > 0) ||
    Boolean(sanitizedClient.selectedService);

  if (hasConfiguredServices && !clientHasService) {
    throw new Error('Debes seleccionar al menos un servicio para asignar el turno.');
  }

  // Validar conflictos temporales exclusivamente contra otros turnos activos confirmados o en pago
  const validation = validateSlotNoConflict(
    {
      id: slotId,
      datetime: targetSlot.datetime,
      estimatedDurationMinutes: sanitizedClient.estimatedDurationMinutes,
      clientData: sanitizedClient,
    },
    allSlots
  );

  if (!validation.isValid) {
    throw new Error(
      'No se puede asignar este turno porque entra en conflicto de horario con otro turno ya confirmado.'
    );
  }

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  // 1. Confirmar el turno asignado
  const slotRef = doc(db, SLOTS_COLLECTION, slotId);
  batch.update(slotRef, {
    status: 'confirmed',
    estimatedDurationMinutes: sanitizedClient.estimatedDurationMinutes || 0,
    estimatedDuration: sanitizedClient.estimatedDuration || '',
    clientData: sanitizedClient,
    confirmedAt: now,
    paymentStatus: 'manual_admin',
    expiresAt: null,
    updatedAt: now,
  });

  // 2. Pasar turnos disponibles superpuestos al estado 'conflict'
  const confirmedDummySlot = {
    id: slotId,
    datetime: targetSlot.datetime,
    estimatedDurationMinutes: sanitizedClient.estimatedDurationMinutes,
    clientData: sanitizedClient,
  };
  const conflictingAvailableSlots = calculateConflictingAvailableSlots(confirmedDummySlot, allSlots);

  for (const conflicting of conflictingAvailableSlots) {
    const conflictRef = doc(db, SLOTS_COLLECTION, conflicting.id);
    batch.update(conflictRef, {
      status: 'conflict',
      updatedAt: now,
    });
  }

  await batch.commit();
};

/**
 * CASO 4: Libera un turno (pasa a available si no tiene conflicto o a conflict si colisiona) y reactiva turnos en conflicto
 */
export const releaseSlot = async (slotId: string): Promise<void> => {
  const allSlots = await getAllSlotsAsync();
  const targetSlot = allSlots.find((s) => s.id === slotId);

  if (!targetSlot) {
    throw new Error('El turno no existe.');
  }

  const batch = writeBatch(db);
  const nowIso = new Date().toISOString();

  // 1. Comprobar si el turno al liberarse colisiona con algún turno confirmado restante
  const remainingConfirmed = allSlots.filter((s) => s.id !== slotId && s.status === 'confirmed');
  const targetValidation = validateSlotNoConflict(
    {
      id: slotId,
      datetime: targetSlot.datetime,
      estimatedDurationMinutes: targetSlot.estimatedDurationMinutes || 0,
    },
    remainingConfirmed
  );

  const newStatus: SlotStatus = targetValidation.isValid ? 'available' : 'conflict';

  // 2. Liberar el turno objetivo con el estado correspondiente
  const slotRef = doc(db, SLOTS_COLLECTION, slotId);
  batch.update(slotRef, {
    status: newStatus,
    clientData: null,
    estimatedDurationMinutes: 0,
    estimatedDuration: '',
    expiresAt: null,
    preferenceId: null,
    paymentId: null,
    paidAmount: null,
    paymentStatus: null,
    confirmedAt: null,
    updatedAt: nowIso,
  });

  // 3. Si estaba confirmado, re-evaluar turnos en 'conflict' para reactivar a 'available' si quedaron sin conflicto
  if (targetSlot.status === 'confirmed') {
    const slotsToReactivate = calculateSlotsToReactivate(targetSlot, allSlots);
    for (const reactivated of slotsToReactivate) {
      const reactivatedRef = doc(db, SLOTS_COLLECTION, reactivated.id);
      batch.update(reactivatedRef, {
        status: 'available',
        clientData: null,
        estimatedDurationMinutes: 0,
        estimatedDuration: '',
        expiresAt: null,
        updatedAt: nowIso,
      });
    }
  }

  await batch.commit();
};

/**
 * CASO 4.1: Elimina físicamente un turno de Firestore (Admin).
 * Si el turno eliminado estaba confirmado o bloqueando disponibilidad ('confirmed' o 'pending_payment'),
 * reactiva atómicamente en un writeBatch cualquier turno en estado 'conflict' que quede liberado sin solapamientos.
 */
export const deleteSlot = async (slotId: string): Promise<void> => {
  const allSlots = await getAllSlotsAsync();
  const targetSlot = allSlots.find((s) => s.id === slotId);
  const slotRef = doc(db, SLOTS_COLLECTION, slotId);

  if (!targetSlot) {
    await deleteDoc(slotRef);
    return;
  }

  const batch = writeBatch(db);
  const nowIso = new Date().toISOString();

  // 1. Eliminar físicamente el documento
  batch.delete(slotRef);

  // 2. Si el turno estaba activo bloqueando, reactivar turnos en 'conflict' que quedaron libres
  if (targetSlot.status === 'confirmed' || targetSlot.status === 'pending_payment') {
    const slotsToReactivate = calculateSlotsToReactivate(targetSlot, allSlots);
    for (const reactivated of slotsToReactivate) {
      const reactivatedRef = doc(db, SLOTS_COLLECTION, reactivated.id);
      batch.update(reactivatedRef, {
        status: 'available',
        clientData: null,
        estimatedDurationMinutes: 0,
        estimatedDuration: '',
        expiresAt: null,
        updatedAt: nowIso,
      });
    }
  }

  await batch.commit();
};

/**
 * CASO 2: Bloquea temporalmente un turno para iniciar el proceso de pago.
 * Utiliza una transacción atómica y validación de overlap temporal contra turnos reservados.
 */
export const reserveSlotForPayment = async (
  _slotId: string,
  _clientData: ClientData,
  lockMinutes = 15
): Promise<{ expiresAt: string }> => {
  // La lógica transaccional de bloqueo se movió al backend (Cloud Function: createPreference)
  // por motivos de seguridad, para que firestore.rules impida escrituras públicas en 'slots'.
  const expiresAtDate = new Date(Date.now() + lockMinutes * 60 * 1000);
  return { expiresAt: expiresAtDate.toISOString() };
};

export interface VerifyPaymentResult {
  success: boolean;
  status?: string;
  slotId?: string;
  bookingDetails?: BookingEmailPayload;
}

/**
 * Llama a la Cloud Function 'createPreference' de Mercado Pago
 */
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

/**
 * Llama a la Cloud Function 'verifyPayment' para verificar y confirmar el turno de inmediato al retornar
 */
export const verifySlotPayment = async (
  paymentId?: string,
  slotId?: string
): Promise<VerifyPaymentResult> => {
  const verifyPaymentFn = httpsCallable<{ paymentId?: string; slotId?: string }, VerifyPaymentResult>(
    functions,
    'verifyPayment'
  );
  const result = await verifyPaymentFn({ paymentId, slotId });
  return result.data;
};



