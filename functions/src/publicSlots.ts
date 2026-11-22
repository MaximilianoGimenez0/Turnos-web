import type * as admin from 'firebase-admin';
import {
  computeEndDatetimeIso,
  getMinServiceDurationMinutes,
  getSlotInterval,
  type SlotDocData,
} from './scheduling';

export const PUBLIC_META_COLLECTION = 'public_meta';
export const PUBLIC_AVAILABILITY_DOC = 'availability';

const PUBLIC_VISIBLE_STATUSES = new Set(['available', 'pending_payment', 'confirmed']);
const RETRYABLE_WRITE_CODES = new Set([4, 8, 10, 14]); // DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED, ABORTED, UNAVAILABLE

export interface PublicSyncFirestoreHelpers {
  createSlotFieldPath: (slotId: string) => admin.firestore.FieldPath | string;
  deleteFieldValue: () => unknown;
}

const compactPublicServices = (rawServices: unknown): unknown[] => {
  if (!Array.isArray(rawServices)) return [];

  const compacted: unknown[] = [];
  for (const raw of rawServices) {
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed) compacted.push(trimmed);
      continue;
    }

    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      const name = typeof obj.name === 'string' ? obj.name.trim() : '';
      if (!name) continue;

      const basePrice = Number(obj.basePrice);
      const durationMinutes = Number(obj.durationMinutes);
      const rawExtras = Array.isArray(obj.extras) ? obj.extras : [];
      const extras = rawExtras
        .filter((ex): ex is Record<string, unknown> => typeof ex === 'object' && ex !== null)
        .map((ex, idx) => ({
          id: typeof ex.id === 'string' && ex.id.trim() ? ex.id.trim() : `extra-${idx}`,
          name: typeof ex.name === 'string' ? ex.name.trim() : '',
          price: !isNaN(Number(ex.price)) && Number(ex.price) >= 0 ? Number(ex.price) : 0,
        }))
        .filter((ex) => ex.name.length > 0);

      compacted.push({
        ...(typeof obj.id === 'string' && obj.id.trim() ? { id: obj.id.trim() } : {}),
        name,
        basePrice: !isNaN(basePrice) && basePrice >= 0 ? basePrice : 0,
        durationMinutes: !isNaN(durationMinutes) && durationMinutes > 0 ? durationMinutes : 30,
        ...(extras.length > 0 ? { extras } : {}),
      });
    }
  }

  return compacted;
};

/**
 * Builds a strict PII-free, compact public projection of a slot document for ClientView & BookingModal.
 * Returns null when the document should be removed from `public_meta/availability` (past, cancelled, conflict, deleted).
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

  const services = compactPublicServices(slotData.services);
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

const deepEqualIgnoringUpdatedAt = (a: unknown, b: unknown, isRoot = false): boolean => {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqualIgnoringUpdatedAt(a[i], b[i], false)) return false;
    }
    return true;
  }

  if (typeof a === 'object') {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA).filter((k) => !(isRoot && k === 'updatedAt'));
    const keysB = Object.keys(objB).filter((k) => !(isRoot && k === 'updatedAt'));
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
      if (!deepEqualIgnoringUpdatedAt(objA[key], objB[key], false)) return false;
    }
    return true;
  }

  return false;
};

/**
 * Compares two public projections ignoring `updatedAt` so internal backend metadata mutations
 * (e.g., `preferenceId`, `emailStatus`, no-op deletes) skip redundant writes and client fan-out.
 */
export const arePublicProjectionsEqual = (
  beforeProjection: Record<string, unknown> | null,
  afterProjection: Record<string, unknown> | null
): boolean => {
  if (beforeProjection === null && afterProjection === null) return true;
  if (beforeProjection === null || afterProjection === null) return false;
  return deepEqualIgnoringUpdatedAt(beforeProjection, afterProjection, true);
};

const isRetryableFirestoreError = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false;
  const rawCode = (err as { code?: unknown }).code;
  if (typeof rawCode === 'number') return RETRYABLE_WRITE_CODES.has(rawCode);
  if (typeof rawCode === 'string') {
    const upper = rawCode.toUpperCase();
    return (
      upper.includes('ABORTED') ||
      upper.includes('DEADLINE_EXCEEDED') ||
      upper.includes('RESOURCE_EXHAUSTED') ||
      upper.includes('UNAVAILABLE')
    );
  }
  return false;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const writeWithContentionRetry = async (
  task: () => Promise<unknown>,
  maxAttempts = 4
): Promise<void> => {
  let attempt = 0;
  while (true) {
    try {
      await task();
      return;
    } catch (err) {
      attempt++;
      if (attempt >= maxAttempts || !isRetryableFirestoreError(err)) {
        throw err;
      }
      const backoffMs = 80 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 60);
      await sleep(backoffMs);
    }
  }
};

export const syncPublicSlotDocument = async (
  db: admin.firestore.Firestore,
  slotId: string,
  beforeData: Record<string, unknown> | undefined | null,
  afterData: Record<string, unknown> | undefined | null,
  helpers?: PublicSyncFirestoreHelpers
): Promise<'upserted' | 'deleted' | 'skipped'> => {
  const beforeProjection = buildPublicSlotProjection(beforeData);
  const afterProjection = buildPublicSlotProjection(afterData);

  if (arePublicProjectionsEqual(beforeProjection, afterProjection)) {
    return 'skipped';
  }

  const availabilityRef = db.collection(PUBLIC_META_COLLECTION).doc(PUBLIC_AVAILABILITY_DOC);
  const slotFieldPath = helpers ? helpers.createSlotFieldPath(slotId) : `slots.${slotId}`;
  const updatedAt = new Date().toISOString();

  if (!afterProjection) {
    const deleteSentinel = helpers ? helpers.deleteFieldValue() : null;
    await writeWithContentionRetry(() =>
      availabilityRef.set(
        {
          slots: { [slotId]: deleteSentinel },
          updatedAt,
        },
        { mergeFields: [slotFieldPath, 'updatedAt'] }
      )
    );
    return 'deleted';
  }

  await writeWithContentionRetry(() =>
    availabilityRef.set(
      {
        slots: { [slotId]: afterProjection },
        updatedAt,
      },
      { mergeFields: [slotFieldPath, 'updatedAt'] }
    )
  );
  return 'upserted';
};
