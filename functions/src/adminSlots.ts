import type * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { commitOperationsInChunks, type BatchOperation } from './batchUtils';
import {
  formatServerDuration,
  validateAndNormalizeClientPayload,
  type ClientPayload,
} from './bookingValidation';
import { getLiveServicesCatalogCached } from './servicesCatalog';
import {
  calculateConflictingAvailableSlots,
  calculateSlotsToReactivate,
  computeEndDatetimeIso,
  findConflictingActiveSlots,
  getConflictSearchWindow,
  getMinServiceDurationMinutes,
  getSlotInterval,
  type SlotDocData,
} from './scheduling';
import { getTenantSlotsCollection, validateTenantIdOrThrow } from './tenantContext';
import {
  normalizeSlotSurcharge,
  validateAdminSlotSurcharge,
  type SlotSurcharge,
} from './surcharge';

export interface AdminNewSlotInput {
  datetime: string;
  depositAmount: number;
  serviceName?: string;
  services?: unknown[];
  estimatedDurationMinutes?: number;
  estimatedDuration?: string;
  surcharge?: SlotSurcharge | null;
}

const sanitizeAdminServices = (services?: unknown[]): Record<string, unknown>[] => {
  if (!Array.isArray(services)) return [];

  const sanitized: Record<string, unknown>[] = [];
  services.forEach((raw, idx) => {
    if (typeof raw === 'string') {
      const name = raw.trim();
      if (!name) return;
      sanitized.push({
        id: `srv-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        basePrice: 0,
        durationMinutes: 30,
        extras: [],
        description: '',
      });
      return;
    }

    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      const name = typeof obj.name === 'string' ? obj.name.trim() : '';
      if (!name) return;
      const basePrice = Number(obj.basePrice);
      const durationMinutes = Number(obj.durationMinutes);
      const rawExtras = Array.isArray(obj.extras) ? obj.extras : [];
      const extras = rawExtras
        .filter((ex): ex is Record<string, unknown> => typeof ex === 'object' && ex !== null)
        .map((ex, eIdx) => ({
          id: typeof ex.id === 'string' && ex.id.trim() ? ex.id.trim() : `extra-${eIdx}`,
          name: typeof ex.name === 'string' ? ex.name.trim() : '',
          price: !isNaN(Number(ex.price)) && Number(ex.price) >= 0 ? Number(ex.price) : 0,
        }))
        .filter((ex) => ex.name.length > 0);

      sanitized.push({
        id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : `srv-${idx}`,
        name,
        basePrice: !isNaN(basePrice) && basePrice >= 0 ? basePrice : 0,
        durationMinutes: !isNaN(durationMinutes) && durationMinutes > 0 ? durationMinutes : 30,
        extras,
        description: typeof obj.description === 'string' ? obj.description.trim() : '',
      });
    }
  });

  return sanitized;
};

export const resolveBaseSlotDuration = (
  slotData: Record<string, unknown>
): { minutes: number; label: string } => {
  const prevMinutes = Number(slotData.previousDurationMinutes);
  if (!isNaN(prevMinutes) && prevMinutes > 0) {
    const prevLabel =
      typeof slotData.previousDuration === 'string' && slotData.previousDuration.trim()
        ? slotData.previousDuration.trim()
        : formatServerDuration(prevMinutes) || `${prevMinutes} min`;
    return { minutes: Math.round(prevMinutes), label: prevLabel };
  }

  const minService = getMinServiceDurationMinutes(
    Array.isArray(slotData.services) ? slotData.services : undefined
  );
  if (minService > 0) {
    return {
      minutes: minService,
      label: formatServerDuration(minService) || `${minService} min`,
    };
  }

  return { minutes: 30, label: '30 min' };
};

export const adminCreateSlotsCore = async (
  db: admin.firestore.Firestore,
  tenantId: string,
  slotsInput: AdminNewSlotInput[],
  nowMs = Date.now()
): Promise<string[]> => {
  const validTenantId = validateTenantIdOrThrow(tenantId);
  if (!Array.isArray(slotsInput) || slotsInput.length === 0) {
    return [];
  }

  const slotsCol = getTenantSlotsCollection(db, validTenantId);
  const nowIso = new Date(nowMs).toISOString();
  const seenTimes = new Set<number>();
  const prepared: Array<{
    datetime: string;
    timeMs: number;
    depositAmount: number;
    serviceName: string;
    services: Record<string, unknown>[];
    durationMinutes: number;
    durationLabel: string;
    surcharge: SlotSurcharge | null;
  }> = [];

  for (const item of slotsInput) {
    const cleanServices = sanitizeAdminServices(item.services);
    if (cleanServices.length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'No se puede crear un turno sin asignar al menos un servicio.'
      );
    }

    const timeMs = item.datetime ? new Date(item.datetime).getTime() : NaN;
    if (isNaN(timeMs)) {
      throw new HttpsError('invalid-argument', 'La fecha u hora de uno de los turnos es inválida.');
    }
    if (timeMs <= nowMs) {
      throw new HttpsError(
        'failed-precondition',
        'No se pueden crear turnos en horarios que ya transcurrieron.'
      );
    }

    if (seenTimes.has(timeMs)) {
      throw new HttpsError('invalid-argument', 'La lista contiene horarios duplicados.');
    }
    seenTimes.add(timeMs);

    const depositAmount = Number(item.depositAmount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      throw new HttpsError(
        'invalid-argument',
        'El monto de la seña debe ser un número positivo.'
      );
    }

    const minServiceDuration = getMinServiceDurationMinutes(cleanServices);
    const durationMinutes =
      minServiceDuration > 0
        ? minServiceDuration
        : typeof item.estimatedDurationMinutes === 'number' && item.estimatedDurationMinutes > 0
        ? Math.round(item.estimatedDurationMinutes)
        : 30;
    const durationLabel = formatServerDuration(durationMinutes) || `${durationMinutes} min`;
    const surcharge = validateAdminSlotSurcharge(item.surcharge);

    prepared.push({
      datetime: new Date(timeMs).toISOString(),
      timeMs,
      depositAmount: Math.round(depositAmount),
      serviceName: typeof item.serviceName === 'string' ? item.serviceName.trim() : '',
      services: cleanServices,
      durationMinutes,
      durationLabel,
      surcharge,
    });
  }

  const minTimeMs = Math.min(...prepared.map((p) => p.timeMs));
  const maxEndMs = Math.max(...prepared.map((p) => p.timeMs + p.durationMinutes * 60 * 1000));
  const { windowStartIso } = getConflictSearchWindow(minTimeMs, 60);
  const windowEndIso = new Date(maxEndMs + 60 * 1000).toISOString();

  const [windowSlotsSnap, activePendingSnap] = await Promise.all([
    slotsCol
      .where('status', 'in', ['available', 'confirmed', 'pending_payment', 'conflict'])
      .where('datetime', '>=', windowStartIso)
      .where('datetime', '<', windowEndIso)
      .get(),
    slotsCol
      .where('status', '==', 'pending_payment')
      .where('expiresAt', '>', nowIso)
      .get(),
  ]);

  const seenDocIds = new Set<string>();
  const nearbySlots: SlotDocData[] = [];
  for (const docSnap of [...windowSlotsSnap.docs, ...activePendingSnap.docs]) {
    if (seenDocIds.has(docSnap.id)) continue;
    seenDocIds.add(docSnap.id);
    nearbySlots.push({ id: docSnap.id, ...docSnap.data() });
  }

  for (const item of prepared) {
    const isExactDuplicate = nearbySlots.some(
      (s) =>
        s.status !== 'cancelled' &&
        s.datetime &&
        new Date(s.datetime).getTime() === item.timeMs
    );
    if (isExactDuplicate) {
      throw new HttpsError(
        'already-exists',
        'Ya existe un turno creado en uno de los horarios seleccionados.'
      );
    }

    const conflicts = findConflictingActiveSlots(
      {
        datetime: item.datetime,
        estimatedDurationMinutes: item.durationMinutes,
      },
      nearbySlots,
      nowMs
    );
    if (conflicts.length > 0) {
      throw new HttpsError(
        'failed-precondition',
        'No se puede crear el turno porque entra en conflicto con otro turno ya reservado.'
      );
    }
  }

  const createdIds: string[] = [];
  const ops: BatchOperation[] = prepared.map((item) => {
    const ref = slotsCol.doc();
    createdIds.push(ref.id);
    return {
      type: 'set',
      ref,
      data: {
        tenantId: validTenantId,
        datetime: item.datetime,
        depositAmount: item.depositAmount,
        serviceName: item.serviceName,
        services: item.services,
        estimatedDurationMinutes: item.durationMinutes,
        estimatedDuration: item.durationLabel,
        previousDurationMinutes: item.durationMinutes,
        previousDuration: item.durationLabel,
        ...(item.surcharge ? { surcharge: item.surcharge } : {}),
        status: 'available',
        clientData: null,
        expiresAt: null,
        lockToken: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    };
  });

  await commitOperationsInChunks(db, ops);
  return createdIds;
};

export const adminAssignSlotCore = async (
  db: admin.firestore.Firestore,
  tenantId: string,
  slotId: string,
  clientData: ClientPayload,
  nowMs = Date.now()
): Promise<void> => {
  const validTenantId = validateTenantIdOrThrow(tenantId);
  const cleanSlotId = typeof slotId === 'string' ? slotId.trim() : '';
  if (!cleanSlotId) {
    throw new HttpsError('invalid-argument', 'El identificador del turno es obligatorio.');
  }

  const slotsCol = getTenantSlotsCollection(db, validTenantId);
  const slotRef = slotsCol.doc(cleanSlotId);
  const nowIso = new Date(nowMs).toISOString();
  const liveCatalog = await getLiveServicesCatalogCached(db, validTenantId, nowMs);

  const txResult = await db.runTransaction(async (transaction) => {
    const slotDoc = await transaction.get(slotRef);
    if (!slotDoc.exists) {
      throw new HttpsError('not-found', 'El turno seleccionado no existe.');
    }

    const slotData = (slotDoc.data() || {}) as Record<string, unknown>;
    const status = String(slotData.status || '');

    if (status === 'confirmed') {
      throw new HttpsError(
        'failed-precondition',
        'Este turno ya se encuentra confirmado por otro cliente.'
      );
    }
    if (status === 'conflict') {
      throw new HttpsError(
        'failed-precondition',
        'Este turno está en conflicto con otro turno reservado y no puede asignarse.'
      );
    }
    if (status === 'past') {
      throw new HttpsError('failed-precondition', 'No se puede asignar un turno pasado.');
    }
    if (status === 'pending_payment') {
      const expiresMs =
        typeof slotData.expiresAt === 'string' ? new Date(slotData.expiresAt).getTime() : 0;
      if (expiresMs > nowMs) {
        throw new HttpsError(
          'resource-exhausted',
          'Este turno está siendo pagado en este momento por un cliente. Esperá a que finalice o venza el bloqueo.'
        );
      }
    }

    const validation = validateAndNormalizeClientPayload(
      clientData,
      Array.isArray(slotData.services) ? slotData.services : undefined,
      Number(slotData.estimatedDurationMinutes) || 0,
      {
        requireEmail: false,
        liveCatalog,
        slotSurcharge: normalizeSlotSurcharge(slotData.surcharge),
      }
    );

    if (!validation.valid) {
      throw new HttpsError('invalid-argument', validation.error);
    }

    const validated = validation.data;
    const slotDatetime = typeof slotData.datetime === 'string' ? slotData.datetime : '';
    const slotStartMs = slotDatetime ? new Date(slotDatetime).getTime() : 0;

    if (!isNaN(slotStartMs) && slotStartMs > 0) {
      const { windowStartIso, windowEndIso } = getConflictSearchWindow(
        slotStartMs,
        validated.estimatedDurationMinutes
      );

      const [confirmedSnap, activePendingSnap] = await Promise.all([
        transaction.get(
          slotsCol
            .where('status', '==', 'confirmed')
            .where('datetime', '>=', windowStartIso)
            .where('datetime', '<', windowEndIso)
        ),
        transaction.get(
          slotsCol
            .where('status', '==', 'pending_payment')
            .where('expiresAt', '>', nowIso)
        ),
      ]);

      const activeSlots: SlotDocData[] = [
        ...confirmedSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        ...activePendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      ];

      const conflicts = findConflictingActiveSlots(
        {
          id: cleanSlotId,
          datetime: slotDatetime,
          estimatedDurationMinutes: validated.estimatedDurationMinutes,
          clientData: { estimatedDurationMinutes: validated.estimatedDurationMinutes },
        },
        activeSlots,
        nowMs
      );

      if (conflicts.length > 0) {
        throw new HttpsError(
          'failed-precondition',
          'No se puede asignar este turno porque entra en conflicto de horario con otro turno ya confirmado o en proceso de pago.'
        );
      }
    }

    const baseDuration = resolveBaseSlotDuration(slotData);
    const endDatetime = computeEndDatetimeIso(slotDatetime, validated.estimatedDurationMinutes);

    transaction.update(slotRef, {
      status: 'confirmed',
      previousDurationMinutes: baseDuration.minutes,
      previousDuration: baseDuration.label,
      estimatedDurationMinutes: validated.estimatedDurationMinutes,
      estimatedDuration: validated.estimatedDuration,
      ...(endDatetime ? { endDatetime } : {}),
      clientData: validated.clientDataToSave,
      confirmedAt: nowIso,
      paymentStatus: 'manual_admin',
      expiresAt: null,
      lockToken: null,
      updatedAt: nowIso,
    });

    return {
      slotDatetime,
      slotStartMs,
      effectiveDurationMinutes: validated.estimatedDurationMinutes,
    };
  });

  // Mark overlapping available and expired pending_payment slots in bounded window as conflict
  if (!isNaN(txResult.slotStartMs) && txResult.slotStartMs > 0) {
    const { windowStartIso, windowEndIso } = getConflictSearchWindow(
      txResult.slotStartMs,
      txResult.effectiveDurationMinutes
    );

    const [availableSnap, expiredPendingSnap] = await Promise.all([
      slotsCol
        .where('status', '==', 'available')
        .where('datetime', '>=', windowStartIso)
        .where('datetime', '<', windowEndIso)
        .get(),
      slotsCol
        .where('status', '==', 'pending_payment')
        .where('expiresAt', '<=', nowIso)
        .get(),
    ]);

    const candidates: SlotDocData[] = [
      ...availableSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      ...expiredPendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    ];

    const conflicting = calculateConflictingAvailableSlots(
      {
        id: cleanSlotId,
        datetime: txResult.slotDatetime,
        estimatedDurationMinutes: txResult.effectiveDurationMinutes,
      },
      candidates,
      nowMs
    );

    if (conflicting.length > 0) {
      const ops: BatchOperation[] = conflicting
        .filter((c): c is SlotDocData & { id: string } => Boolean(c.id))
        .map((c) => ({
          type: 'update',
          ref: slotsCol.doc(c.id),
          data: {
            status: 'conflict',
            clientData: null,
            expiresAt: null,
            lockToken: null,
            endDatetime: null,
            updatedAt: nowIso,
          },
        }));
      await commitOperationsInChunks(db, ops);
    }
  }
};

async function reactivateFreedConflictsInWindow(
  db: admin.firestore.Firestore,
  tenantId: string,
  releasedSlot: SlotDocData & { id: string },
  nowMs: number,
  nowIso: string
): Promise<number> {
  const interval = getSlotInterval(releasedSlot);
  if (!interval) return 0;

  const slotsCol = getTenantSlotsCollection(db, tenantId);
  const { windowStartIso, windowEndIso } = getConflictSearchWindow(
    interval.startMs,
    Math.max(interval.durationMinutes, 60)
  );
  // Look ahead sufficiently so remaining confirmed slots overlapping a conflict candidate are also seen
  const extendedEndIso = new Date(
    Math.max(interval.endMs, new Date(windowEndIso).getTime()) + 12 * 60 * 60 * 1000
  ).toISOString();

  const [conflictSnap, confirmedSnap, activePendingSnap] = await Promise.all([
    slotsCol
      .where('status', '==', 'conflict')
      .where('datetime', '>=', windowStartIso)
      .where('datetime', '<', extendedEndIso)
      .get(),
    slotsCol
      .where('status', '==', 'confirmed')
      .where('datetime', '>=', windowStartIso)
      .where('datetime', '<', extendedEndIso)
      .get(),
    slotsCol
      .where('status', '==', 'pending_payment')
      .where('expiresAt', '>', nowIso)
      .get(),
  ]);

  if (conflictSnap.empty) return 0;

  const conflictDocsMap = new Map<string, Record<string, unknown>>();
  const allWindowSlots: SlotDocData[] = [];

  for (const docSnap of conflictSnap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    conflictDocsMap.set(docSnap.id, data);
    const baseDur = resolveBaseSlotDuration(data);
    allWindowSlots.push({
      id: docSnap.id,
      ...data,
      estimatedDurationMinutes: baseDur.minutes,
    });
  }
  for (const docSnap of confirmedSnap.docs) {
    allWindowSlots.push({ id: docSnap.id, ...docSnap.data() });
  }
  for (const docSnap of activePendingSnap.docs) {
    allWindowSlots.push({ id: docSnap.id, ...docSnap.data() });
  }

  const toReactivate = calculateSlotsToReactivate(releasedSlot, allWindowSlots, nowMs);
  if (toReactivate.length === 0) return 0;

  const ops: BatchOperation[] = toReactivate
    .filter((item): item is SlotDocData & { id: string } => Boolean(item.id))
    .map((item) => {
      const originalData = conflictDocsMap.get(item.id) || {};
      const baseDur = resolveBaseSlotDuration(originalData);
      return {
        type: 'update',
        ref: slotsCol.doc(item.id),
        data: {
          status: 'available',
          clientData: null,
          estimatedDurationMinutes: baseDur.minutes,
          estimatedDuration: baseDur.label,
          expiresAt: null,
          lockToken: null,
          endDatetime: null,
          updatedAt: nowIso,
        },
      };
    });

  await commitOperationsInChunks(db, ops);
  return ops.length;
}

export const adminCancelSlotCore = async (
  db: admin.firestore.Firestore,
  tenantId: string,
  slotId: string,
  nowMs = Date.now()
): Promise<void> => {
  const validTenantId = validateTenantIdOrThrow(tenantId);
  const cleanSlotId = typeof slotId === 'string' ? slotId.trim() : '';
  if (!cleanSlotId) {
    throw new HttpsError('invalid-argument', 'El identificador del turno es obligatorio.');
  }

  const slotRef = getTenantSlotsCollection(db, validTenantId).doc(cleanSlotId);
  const nowIso = new Date(nowMs).toISOString();

  const previousData = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(slotRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'El turno no existe.');
    }
    const data = (snap.data() || {}) as Record<string, unknown>;
    transaction.update(slotRef, {
      status: 'cancelled',
      expiresAt: null,
      lockToken: null,
      updatedAt: nowIso,
    });
    return data;
  });

  if (previousData.status === 'confirmed') {
    await reactivateFreedConflictsInWindow(
      db,
      validTenantId,
      { id: cleanSlotId, ...previousData },
      nowMs,
      nowIso
    );
  }
};

export const adminReleaseSlotCore = async (
  db: admin.firestore.Firestore,
  tenantId: string,
  slotId: string,
  nowMs = Date.now()
): Promise<{ status: 'available' | 'conflict' }> => {
  const validTenantId = validateTenantIdOrThrow(tenantId);
  const cleanSlotId = typeof slotId === 'string' ? slotId.trim() : '';
  if (!cleanSlotId) {
    throw new HttpsError('invalid-argument', 'El identificador del turno es obligatorio.');
  }

  const slotsCol = getTenantSlotsCollection(db, validTenantId);
  const slotRef = slotsCol.doc(cleanSlotId);
  const nowIso = new Date(nowMs).toISOString();

  const txOutcome = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(slotRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'El turno no existe.');
    }
    const data = (snap.data() || {}) as Record<string, unknown>;
    const baseDur = resolveBaseSlotDuration(data);
    const slotDatetime = typeof data.datetime === 'string' ? data.datetime : '';
    const slotStartMs = slotDatetime ? new Date(slotDatetime).getTime() : 0;

    let nextStatus: 'available' | 'conflict' = 'available';

    if (!isNaN(slotStartMs) && slotStartMs > 0) {
      const { windowStartIso, windowEndIso } = getConflictSearchWindow(
        slotStartMs,
        baseDur.minutes
      );
      const [confirmedSnap, activePendingSnap] = await Promise.all([
        transaction.get(
          slotsCol
            .where('status', '==', 'confirmed')
            .where('datetime', '>=', windowStartIso)
            .where('datetime', '<', windowEndIso)
        ),
        transaction.get(
          slotsCol
            .where('status', '==', 'pending_payment')
            .where('expiresAt', '>', nowIso)
        ),
      ]);

      const activeSlots: SlotDocData[] = [
        ...confirmedSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        ...activePendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      ];

      const conflicts = findConflictingActiveSlots(
        {
          id: cleanSlotId,
          datetime: slotDatetime,
          estimatedDurationMinutes: baseDur.minutes,
        },
        activeSlots,
        nowMs
      );
      if (conflicts.length > 0) {
        nextStatus = 'conflict';
      }
    }

    transaction.update(slotRef, {
      status: nextStatus,
      clientData: null,
      estimatedDurationMinutes: baseDur.minutes,
      estimatedDuration: baseDur.label,
      previousDurationMinutes: baseDur.minutes,
      previousDuration: baseDur.label,
      expiresAt: null,
      lockToken: null,
      preferenceId: null,
      paymentId: null,
      paidAmount: null,
      paymentStatus: null,
      confirmedAt: null,
      endDatetime: null,
      updatedAt: nowIso,
    });

    return { previousData: data, nextStatus };
  });

  if (txOutcome.previousData.status === 'confirmed') {
    await reactivateFreedConflictsInWindow(
      db,
      validTenantId,
      { id: cleanSlotId, ...txOutcome.previousData },
      nowMs,
      nowIso
    );
  }

  return { status: txOutcome.nextStatus };
};

export const adminDeleteSlotCore = async (
  db: admin.firestore.Firestore,
  tenantId: string,
  slotId: string,
  nowMs = Date.now()
): Promise<void> => {
  const validTenantId = validateTenantIdOrThrow(tenantId);
  const cleanSlotId = typeof slotId === 'string' ? slotId.trim() : '';
  if (!cleanSlotId) {
    throw new HttpsError('invalid-argument', 'El identificador del turno es obligatorio.');
  }

  const slotRef = getTenantSlotsCollection(db, validTenantId).doc(cleanSlotId);
  const nowIso = new Date(nowMs).toISOString();

  const snap = await slotRef.get();
  if (!snap.exists) {
    return;
  }

  const data = (snap.data() || {}) as Record<string, unknown>;
  await slotRef.delete();

  if (data.status === 'confirmed' || data.status === 'pending_payment') {
    await reactivateFreedConflictsInWindow(
      db,
      validTenantId,
      { id: cleanSlotId, ...data },
      nowMs,
      nowIso
    );
  }
};
