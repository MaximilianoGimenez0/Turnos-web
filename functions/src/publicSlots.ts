import type * as admin from 'firebase-admin';
import { commitOperationsInChunks, type BatchOperation } from './batchUtils';
import {
  computeEndDatetimeIso,
  getMinServiceDurationMinutes,
  getSlotInterval,
  type SlotDocData,
} from './scheduling';

export const PUBLIC_SLOTS_COLLECTION = 'public_slots';

const PUBLIC_VISIBLE_STATUSES = new Set(['available', 'pending_payment', 'confirmed']);

/**
 * Builds a strict PII-free public projection of a slot document for ClientView & BookingModal.
 * Returns null when the document should be removed from `public_slots` (past, cancelled, conflict, deleted).
 */
export const buildPublicSlotProjection = (
  slotData: Record<string, unknown> | undefined | null
): Record<string, unknown> | null => {
  if (!slotData) return null;

  const status = typeof slotData.status === 'string' ? slotData.status : '';
  if (!PUBLIC_VISIBLE_STATUSES.has(status)) {
    return null;
  }

  const datetime = typeof slotData.datetime === 'string' ? slotData.datetime : '';
  if (!datetime) return null;

  const interval = getSlotInterval(slotData as SlotDocData);
  const resolvedDurationMinutes = interval ? interval.durationMinutes : 0;
  const endDatetime =
    typeof slotData.endDatetime === 'string' && slotData.endDatetime
      ? slotData.endDatetime
      : computeEndDatetimeIso(datetime, resolvedDurationMinutes);

  const updatedAt =
    typeof slotData.updatedAt === 'string' && slotData.updatedAt
      ? slotData.updatedAt
      : new Date().toISOString();

  // Confirmed slots only expose the busy interval needed to prevent overlaps in ClientView/BookingModal
  if (status === 'confirmed') {
    return {
      datetime,
      ...(endDatetime ? { endDatetime } : {}),
      status: 'confirmed',
      estimatedDurationMinutes: resolvedDurationMinutes,
      updatedAt,
    };
  }

  const services = Array.isArray(slotData.services) ? slotData.services : [];
  const rules = Array.isArray(slotData.rules) ? slotData.rules : [];
  const baseDurationMinutes =
    typeof slotData.previousDurationMinutes === 'number' && slotData.previousDurationMinutes > 0
      ? slotData.previousDurationMinutes
      : getMinServiceDurationMinutes(services) || resolvedDurationMinutes || 30;
  const baseDurationLabel =
    typeof slotData.previousDuration === 'string' && slotData.previousDuration.trim()
      ? slotData.previousDuration.trim()
      : `${baseDurationMinutes} min`;

  const commonPublic = {
    datetime,
    status,
    depositAmount: Number(slotData.depositAmount) || 0,
    serviceName: typeof slotData.serviceName === 'string' ? slotData.serviceName : '',
    services,
    ...(rules.length > 0 ? { rules } : {}),
    updatedAt,
  };

  if (status === 'pending_payment') {
    return {
      ...commonPublic,
      ...(endDatetime ? { endDatetime } : {}),
      estimatedDurationMinutes: resolvedDurationMinutes || baseDurationMinutes,
      estimatedDuration:
        typeof slotData.estimatedDuration === 'string' && slotData.estimatedDuration
          ? slotData.estimatedDuration
          : `${resolvedDurationMinutes || baseDurationMinutes} min`,
      previousDurationMinutes: baseDurationMinutes,
      previousDuration: baseDurationLabel,
      expiresAt: typeof slotData.expiresAt === 'string' ? slotData.expiresAt : null,
    };
  }

  // status === 'available'
  const availableDuration =
    typeof slotData.estimatedDurationMinutes === 'number' && slotData.estimatedDurationMinutes > 0
      ? slotData.estimatedDurationMinutes
      : baseDurationMinutes;

  return {
    ...commonPublic,
    estimatedDurationMinutes: availableDuration,
    estimatedDuration:
      typeof slotData.estimatedDuration === 'string' && slotData.estimatedDuration
        ? slotData.estimatedDuration
        : `${availableDuration} min`,
    expiresAt: null,
  };
};

export const syncPublicSlotDocument = async (
  db: admin.firestore.Firestore,
  slotId: string,
  afterData: Record<string, unknown> | undefined | null
): Promise<'upserted' | 'deleted'> => {
  const publicRef = db.collection(PUBLIC_SLOTS_COLLECTION).doc(slotId);
  const projection = buildPublicSlotProjection(afterData);

  if (!projection) {
    await publicRef.delete();
    return 'deleted';
  }

  await publicRef.set(projection);
  return 'upserted';
};

export const backfillAllPublicSlots = async (
  db: admin.firestore.Firestore
): Promise<{ upsertedCount: number; deletedCount: number }> => {
  const [slotsSnap, existingPublicSnap] = await Promise.all([
    db.collection('slots').get(),
    db.collection(PUBLIC_SLOTS_COLLECTION).get(),
  ]);

  const validIds = new Set<string>();
  const ops: BatchOperation[] = [];
  let upsertedCount = 0;
  let deletedCount = 0;

  for (const docSnap of slotsSnap.docs) {
    const projection = buildPublicSlotProjection(docSnap.data() as Record<string, unknown>);
    if (projection) {
      validIds.add(docSnap.id);
      ops.push({
        type: 'set',
        ref: db.collection(PUBLIC_SLOTS_COLLECTION).doc(docSnap.id),
        data: projection,
      });
      upsertedCount++;
    }
  }

  for (const pubSnap of existingPublicSnap.docs) {
    if (!validIds.has(pubSnap.id)) {
      ops.push({
        type: 'delete',
        ref: pubSnap.ref,
      });
      deletedCount++;
    }
  }

  if (ops.length > 0) {
    await commitOperationsInChunks(db, ops);
  }

  return { upsertedCount, deletedCount };
};
