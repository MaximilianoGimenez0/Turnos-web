import type * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import {
  applyPreconditionedOperations,
  commitOperationsInChunks,
  type BatchOperation,
} from './batchUtils';
import {
  findConflictingActiveSlots,
  getConflictSearchWindow,
  getMinServiceDurationMinutes,
  type SlotDocData,
} from './scheduling';
import {
  buildBookingEmailPayloadFromSlot,
  sendBookingConfirmationEmails,
} from './emailService';
import { getOwnerProfileCached } from './ownerProfile';
import {
  DEFAULT_TENANT_TIMEZONE,
  extractTenantIdFromSlotRef,
  getTenantDocRef,
  getTenantSlotsCollection,
  isValidTimezone,
} from './tenantContext';

const MAX_EMAIL_RETRY_ATTEMPTS = 3;
const STALE_EMAIL_PROCESSING_MS = 2 * 60 * 1000;
const EMAIL_RETRY_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const EXPIRED_SLOTS_BATCH_LIMIT = 500;
const EMAIL_RETRY_BATCH_LIMIT = 200;
const CLEANUP_SLOTS_BATCH_LIMIT = 1000;

interface CronTenantMeta {
  slug: string;
  timezone: string;
  name: string;
  isDemo: boolean;
}

export const processExpiredSlots = async (
  db: admin.firestore.Firestore,
  nowMs = Date.now()
): Promise<{
  releasedCount: number;
  conflictedCount: number;
  deletedExpiredCount: number;
  skippedConcurrent: number;
}> => {
  const nowIso = new Date(nowMs).toISOString();

  // Indexed COLLECTION_GROUP query on (status ASC, expiresAt ASC)
  const snapshot = await db
    .collectionGroup('slots')
    .where('status', '==', 'pending_payment')
    .where('expiresAt', '<=', nowIso)
    .limit(EXPIRED_SLOTS_BATCH_LIMIT)
    .get();

  if (snapshot.empty) {
    return { releasedCount: 0, conflictedCount: 0, deletedExpiredCount: 0, skippedConcurrent: 0 };
  }

  // Group expired slots strictly by tenantId so conflict windows never cross tenant boundaries
  const docsByTenant = new Map<string, admin.firestore.QueryDocumentSnapshot[]>();
  for (const docSnap of snapshot.docs) {
    const tenantId = extractTenantIdFromSlotRef(docSnap.ref);
    if (!tenantId) continue;
    const list = docsByTenant.get(tenantId);
    if (list) {
      list.push(docSnap);
    } else {
      docsByTenant.set(tenantId, [docSnap]);
    }
  }

  const operations: BatchOperation[] = [];
  let expectedDeleted = 0;
  let expectedReleased = 0;
  let expectedConflicted = 0;

  for (const [tenantId, tenantDocs] of docsByTenant.entries()) {
    const futureExpiredDocs = tenantDocs.filter((docSnap) => {
      const slotDateMs = docSnap.data().datetime ? new Date(docSnap.data().datetime).getTime() : 0;
      return slotDateMs === 0 || slotDateMs > nowMs;
    });

    let confirmedWindowSlots: SlotDocData[] = [];
    if (futureExpiredDocs.length > 0) {
      const timestamps = futureExpiredDocs
        .map((d) => (d.data().datetime ? new Date(d.data().datetime).getTime() : 0))
        .filter((t) => t > 0);

      if (timestamps.length > 0) {
        const minStart = Math.min(...timestamps);
        const maxStart = Math.max(...timestamps);
        const { windowStartIso } = getConflictSearchWindow(minStart, 60);
        const { windowEndIso } = getConflictSearchWindow(maxStart, 720);

        const confirmedSnap = await getTenantSlotsCollection(db, tenantId)
          .where('status', '==', 'confirmed')
          .where('datetime', '>=', windowStartIso)
          .where('datetime', '<', windowEndIso)
          .get();

        confirmedWindowSlots = confirmedSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    }

    for (const docSnap of tenantDocs) {
      const slotData = docSnap.data();
      const slotDateMs = slotData.datetime ? new Date(slotData.datetime).getTime() : 0;
      const precondition: admin.firestore.Precondition = {
        lastUpdateTime: docSnap.updateTime,
      };

      if (slotDateMs > 0 && slotDateMs <= nowMs) {
        operations.push({
          type: 'delete',
          ref: docSnap.ref,
          precondition,
        });
        expectedDeleted++;
      } else {
        const minServiceDuration = getMinServiceDurationMinutes(
          Array.isArray(slotData.services) ? slotData.services : undefined
        );
        const baseDuration =
          typeof slotData.previousDurationMinutes === 'number' &&
          slotData.previousDurationMinutes > 0
            ? slotData.previousDurationMinutes
            : minServiceDuration > 0
            ? minServiceDuration
            : 30;
        const baseDurationLabel =
          typeof slotData.previousDuration === 'string' && slotData.previousDuration.trim()
            ? slotData.previousDuration.trim()
            : `${baseDuration} min`;

        const overlapsConfirmed =
          confirmedWindowSlots.length > 0 &&
          findConflictingActiveSlots(
            {
              id: docSnap.id,
              datetime: slotData.datetime,
              estimatedDurationMinutes: baseDuration,
              services: slotData.services,
            },
            confirmedWindowSlots,
            nowMs
          ).length > 0;

        const nextStatus = overlapsConfirmed ? 'conflict' : 'available';
        if (overlapsConfirmed) {
          expectedConflicted++;
        } else {
          expectedReleased++;
        }

        operations.push({
          type: 'update',
          ref: docSnap.ref,
          precondition,
          data: {
            status: nextStatus,
            clientData: null,
            estimatedDurationMinutes: baseDuration,
            estimatedDuration: baseDurationLabel,
            expiresAt: null,
            preferenceId: null,
            lockToken: null,
            endDatetime: null,
            updatedAt: nowIso,
          },
        });
      }
    }
  }

  const outcome = await applyPreconditionedOperations(operations);

  if (outcome.failed > 0) {
    throw new Error(`[processExpiredSlots] Fallaron ${outcome.failed} operaciones inesperadas.`);
  }

  logger.info('[processExpiredSlots] Completado.', {
    tenantsProcessed: docsByTenant.size,
    succeeded: outcome.succeeded,
    skippedConcurrent: outcome.skippedPrecondition,
    expectedReleased,
    expectedConflicted,
    expectedDeleted,
  });

  return {
    releasedCount: outcome.skippedPrecondition === 0 ? expectedReleased : outcome.succeeded,
    conflictedCount: expectedConflicted,
    deletedExpiredCount: expectedDeleted,
    skippedConcurrent: outcome.skippedPrecondition,
  };
};

export const retryPendingBookingEmails = async (
  db: admin.firestore.Firestore,
  nowMs = Date.now()
): Promise<{ retriedCount: number; sentCount: number; failedCount: number }> => {
  const lookbackIso = new Date(nowMs - EMAIL_RETRY_LOOKBACK_MS).toISOString();

  // Single unified COLLECTION_GROUP query using composite index (emailStatus ASC, updatedAt ASC)
  const pendingEmailsSnap = await db
    .collectionGroup('slots')
    .where('emailStatus', 'in', ['failed', 'partial', 'processing'])
    .where('updatedAt', '>=', lookbackIso)
    .limit(EMAIL_RETRY_BATCH_LIMIT)
    .get();

  const candidates: Array<{
    tenantId: string;
    docSnap: admin.firestore.QueryDocumentSnapshot;
  }> = [];

  for (const docSnap of pendingEmailsSnap.docs) {
    const tenantId = extractTenantIdFromSlotRef(docSnap.ref);
    if (!tenantId) continue;

    const data = docSnap.data();
    if (data.status !== 'confirmed') continue;
    const attempts = Number(data.emailAttempts || 0);
    if (attempts >= MAX_EMAIL_RETRY_ATTEMPTS) continue;
    if (data.emailStatus === 'processing') {
      const processingAtMs = data.emailProcessingAt
        ? new Date(data.emailProcessingAt).getTime()
        : data.updatedAt
        ? new Date(data.updatedAt).getTime()
        : 0;
      if (processingAtMs > 0 && nowMs - processingAtMs < STALE_EMAIL_PROCESSING_MS) {
        continue;
      }
    }
    candidates.push({ tenantId, docSnap });
  }

  if (candidates.length === 0) {
    return { retriedCount: 0, sentCount: 0, failedCount: 0 };
  }

  // Invocation-scoped tenant metadata map (never module-global)
  const tenantMetaMap = new Map<string, CronTenantMeta>();
  const loadTenantMeta = async (tenantId: string): Promise<CronTenantMeta> => {
    const cached = tenantMetaMap.get(tenantId);
    if (cached) return cached;

    const tenantSnap = await getTenantDocRef(db, tenantId).get();
    const raw = tenantSnap.exists ? ((tenantSnap.data() || {}) as Record<string, unknown>) : {};
    const tz =
      typeof raw.timezone === 'string' && isValidTimezone(raw.timezone.trim())
        ? raw.timezone.trim()
        : DEFAULT_TENANT_TIMEZONE;
    const meta: CronTenantMeta = {
      slug: typeof raw.slug === 'string' ? raw.slug.trim() : '',
      timezone: tz,
      name: typeof raw.name === 'string' ? raw.name.trim() : 'Turnos Web',
      isDemo: raw.isDemo === true,
    };
    tenantMetaMap.set(tenantId, meta);
    return meta;
  };

  let retriedCount = 0;
  let sentCount = 0;
  let failedCount = 0;

  for (const { tenantId, docSnap } of candidates) {
    const claim = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(docSnap.ref);
      if (!fresh.exists) return null;
      const data = fresh.data() || {};

      if (data.status !== 'confirmed') return null;
      const attempts = Number(data.emailAttempts || 0);
      if (attempts >= MAX_EMAIL_RETRY_ATTEMPTS) return null;

      const needClient = !data.clientEmailSent && Boolean(data.clientData?.email);
      const needOwner = !data.ownerEmailSent;
      if (!needClient && !needOwner) return null;

      if (data.emailStatus === 'processing') {
        const processingAtMs = data.emailProcessingAt
          ? new Date(data.emailProcessingAt).getTime()
          : 0;
        if (processingAtMs > 0 && nowMs - processingAtMs < STALE_EMAIL_PROCESSING_MS) {
          return null;
        }
      }

      const nowIso = new Date().toISOString();
      tx.update(docSnap.ref, {
        emailStatus: 'processing',
        emailProcessingAt: nowIso,
        emailAttempts: attempts + 1,
        updatedAt: nowIso,
      });

      return { data, needClient, needOwner };
    });

    if (!claim) continue;
    retriedCount++;

    const tenantMeta = await loadTenantMeta(tenantId);
    const ownerProfile = await getOwnerProfileCached(db, tenantId, nowMs, {
      name: tenantMeta.name,
      isDemo: tenantMeta.isDemo,
    });

    const { data, needClient, needOwner } = claim;
    const clientData = (data.clientData || {}) as Record<string, unknown>;
    const bookingDetails = buildBookingEmailPayloadFromSlot({
      tenantId,
      tenantSlug: tenantMeta.slug || undefined,
      timezone: tenantMeta.timezone,
      slotId: docSnap.id,
      paymentId: String(data.paymentId || 'unknown'),
      slotData: data,
      clientData,
      paidAmount: Number(data.paidAmount || data.depositAmount || 0),
      fallbackClientEmail: String(clientData.email || ''),
      fallbackClientName: String(clientData.name || 'Cliente'),
      ownerProfile,
      adminUrl: (process.env.CLIENT_APP_URL || '').trim(),
    });

    const emailResult = await sendBookingConfirmationEmails(bookingDetails, {
      sendClient: needClient,
      sendOwner: needOwner,
    });

    const finalClientSent = Boolean(data.clientEmailSent) || emailResult.clientSent;
    const finalOwnerSent = Boolean(data.ownerEmailSent) || emailResult.ownerSent;
    const hasClientEmail = Boolean(bookingDetails.clientEmail.trim());
    const allRequiredSent = (!hasClientEmail || finalClientSent) && finalOwnerSent;
    const anySent = finalClientSent || finalOwnerSent;
    const nextEmailStatus = allRequiredSent ? 'sent' : anySent ? 'partial' : 'failed';

    await docSnap.ref.update({
      emailStatus: nextEmailStatus,
      emailSent: allRequiredSent,
      clientEmailSent: finalClientSent,
      ownerEmailSent: finalOwnerSent,
      emailSentAt: allRequiredSent ? new Date().toISOString() : data.emailSentAt || null,
      emailResult: {
        clientSent: finalClientSent,
        ownerSent: finalOwnerSent,
        clientError: emailResult.clientError || null,
        ownerError: emailResult.ownerError || null,
      },
      updatedAt: new Date().toISOString(),
    });

    if (allRequiredSent) {
      sentCount++;
    } else {
      failedCount++;
    }
  }

  logger.info('[retryPendingBookingEmails] Completado.', {
    retriedCount,
    sentCount,
    failedCount,
  });

  return { retriedCount, sentCount, failedCount };
};

export const cleanupPastSlotsMaintenance = async (
  db: admin.firestore.Firestore,
  nowMs = Date.now()
): Promise<{
  deletedPastAvailableCount: number;
  markedPastConfirmedCount: number;
  markedPastCancelledCount: number;
}> => {
  const nowIso = new Date(nowMs).toISOString();

  // Single unified COLLECTION_GROUP maintenance query using composite index (status ASC, datetime ASC)
  const pastCandidatesSnap = await db
    .collectionGroup('slots')
    .where('status', 'in', ['available', 'conflict', 'confirmed', 'cancelled'])
    .where('datetime', '<=', nowIso)
    .limit(CLEANUP_SLOTS_BATCH_LIMIT)
    .get();

  const operations: BatchOperation[] = [];
  let deletedPastAvailableCount = 0;
  let markedPastConfirmedCount = 0;
  let markedPastCancelledCount = 0;

  for (const docSnap of pastCandidatesSnap.docs) {
    if (!extractTenantIdFromSlotRef(docSnap.ref)) continue;

    const slotData = docSnap.data();
    const status = typeof slotData.status === 'string' ? slotData.status : '';

    if (status === 'available' || status === 'conflict') {
      operations.push({
        type: 'delete',
        ref: docSnap.ref,
      });
      deletedPastAvailableCount++;
      continue;
    }

    if (status === 'confirmed') {
      const endMsFromField =
        typeof slotData.endDatetime === 'string' ? new Date(slotData.endDatetime).getTime() : NaN;

      let isPast = false;
      if (!isNaN(endMsFromField) && endMsFromField > 0) {
        isPast = endMsFromField <= nowMs;
      } else {
        const slotStartMs = slotData.datetime ? new Date(slotData.datetime).getTime() : 0;
        if (slotStartMs > 0) {
          const rawDuration =
            slotData.clientData?.estimatedDurationMinutes ??
            slotData.estimatedDurationMinutes ??
            0;
          const durationMinutes =
            typeof rawDuration === 'number' && !isNaN(rawDuration) && rawDuration > 0
              ? rawDuration
              : 0;
          const slotEndMs = slotStartMs + durationMinutes * 60 * 1000;
          isPast = slotEndMs <= nowMs;
        }
      }

      if (isPast) {
        operations.push({
          type: 'update',
          ref: docSnap.ref,
          data: {
            status: 'past',
            pastOutcome: 'completed',
            updatedAt: nowIso,
          },
        });
        markedPastConfirmedCount++;
      }
      continue;
    }

    if (status === 'cancelled') {
      operations.push({
        type: 'update',
        ref: docSnap.ref,
        data: {
          status: 'past',
          pastOutcome: 'cancelled',
          updatedAt: nowIso,
        },
      });
      markedPastCancelledCount++;
    }
  }

  if (operations.length > 0) {
    await commitOperationsInChunks(db, operations);
  }

  logger.info('[cleanupPastSlotsMaintenance] Completado.', {
    deletedPastAvailableCount,
    markedPastConfirmedCount,
    markedPastCancelledCount,
    totalCommitted: operations.length,
  });

  return {
    deletedPastAvailableCount,
    markedPastConfirmedCount,
    markedPastCancelledCount,
  };
};
