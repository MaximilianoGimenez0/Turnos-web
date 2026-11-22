import { randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { getPreferenceClient, getPaymentClient } from './mercadoPago';
import {
  processExpiredSlots,
  retryPendingBookingEmails,
  cleanupPastSlotsMaintenance,
} from './cronJobs';
import {
  findConflictingActiveSlots,
  calculateConflictingAvailableSlots,
  computeEndDatetimeIso,
  getConflictSearchWindow,
  getMinServiceDurationMinutes,
  type SlotDocData,
} from './scheduling';
import {
  validateAndNormalizeClientPayload,
  maskEmail,
  type ClientPayload,
  type BookedServiceItem,
  type PriceExtra,
} from './bookingValidation';
import { verifyMercadoPagoSignature } from './webhookSecurity';
import { getOwnerProfileCached, type CachedOwnerProfile } from './ownerProfile';
import { getLiveServicesCatalogCached } from './servicesCatalog';
import { syncPublicSlotDocument, backfillAllPublicSlots } from './publicSlots';
import {
  adminCreateSlotsCore,
  adminAssignSlotCore,
  adminCancelSlotCore,
  adminReleaseSlotCore,
  adminDeleteSlotCore,
  type AdminNewSlotInput,
} from './adminSlots';
import { commitOperationsInChunks, type BatchOperation } from './batchUtils';
import {
  sendBookingConfirmationEmails,
  sendPaymentIncidentAlertEmail,
  type BookingEmailPayload,
} from './emailService';

admin.initializeApp();
const db = admin.firestore();

const PAYMENT_ATTEMPTS_COLLECTION = 'payment_attempts';
const PAYMENT_INCIDENTS_COLLECTION = 'payment_incidents';
const LOCK_DURATION_MS = 15 * 60 * 1000;
const MIN_BOOKING_ANTICIPATION_MS = 15 * 60 * 1000;
const STALE_EMAIL_PROCESSING_MS = 2 * 60 * 1000;

interface CreatePreferenceData {
  slotId: string;
  clientData: ClientPayload;
}

function getWebhookUrl(): string {
  const envUrl = (process.env.MP_WEBHOOK_URL || '').trim();
  if (envUrl && !envUrl.includes('tu-proyecto-id')) {
    return envUrl;
  }
  const projectId = process.env.GCLOUD_PROJECT || 'turnos-web-eb8b5';
  return `https://us-central1-${projectId}.cloudfunctions.net/mpWebhook`;
}

function formatDateTimeEsAr(datetime: string): { formattedDate: string; formattedTime: string } {
  const slotDate = new Date(datetime || new Date().toISOString());
  const validDate = isNaN(slotDate.getTime()) ? new Date() : slotDate;
  return {
    formattedDate: validDate.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    formattedTime: validDate.toLocaleTimeString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

function buildBookingEmailPayload(params: {
  slotId: string;
  paymentId: string;
  slotData: Record<string, unknown>;
  clientData: Record<string, unknown>;
  paidAmount: number;
  fallbackClientEmail: string;
  fallbackClientName: string;
  ownerProfile: CachedOwnerProfile;
}): BookingEmailPayload {
  const {
    slotId,
    paymentId,
    slotData,
    clientData,
    paidAmount,
    fallbackClientEmail,
    fallbackClientName,
    ownerProfile,
  } = params;

  const datetime =
    typeof slotData.datetime === 'string' && slotData.datetime
      ? slotData.datetime
      : new Date().toISOString();
  const { formattedDate, formattedTime } = formatDateTimeEsAr(datetime);

  const estimatedDurationMinutes = Number(
    clientData.estimatedDurationMinutes || slotData.estimatedDurationMinutes || 0
  );
  const estimatedDuration =
    (typeof clientData.estimatedDuration === 'string' && clientData.estimatedDuration) ||
    (typeof slotData.estimatedDuration === 'string' && slotData.estimatedDuration) ||
    (estimatedDurationMinutes > 0 ? `${estimatedDurationMinutes} min` : '');

  return {
    slotId,
    paymentId,
    serviceName:
      (typeof slotData.serviceName === 'string' && slotData.serviceName.trim()) ||
      (typeof clientData.selectedService === 'string' && clientData.selectedService.trim()) ||
      'Turno / Consulta',
    datetime,
    formattedDate,
    formattedTime,
    depositAmount: paidAmount,
    clientName:
      (typeof clientData.name === 'string' && clientData.name.trim()) ||
      fallbackClientName ||
      'Cliente',
    clientEmail:
      (typeof clientData.email === 'string' && clientData.email.trim()) ||
      fallbackClientEmail ||
      '',
    clientPhone: typeof clientData.phone === 'string' ? clientData.phone : '',
    clientNotes: typeof clientData.notes === 'string' ? clientData.notes : '',
    bookedServices: Array.isArray(clientData.bookedServices)
      ? (clientData.bookedServices as BookedServiceItem[])
      : [],
    selectedServices: Array.isArray(clientData.selectedServices)
      ? (clientData.selectedServices as string[])
      : [],
    selectedRules: Array.isArray(clientData.selectedRules)
      ? (clientData.selectedRules as string[])
      : [],
    selectedExtras: Array.isArray(clientData.selectedExtras)
      ? (clientData.selectedExtras as PriceExtra[])
      : [],
    basePrice: Number(clientData.basePrice || 0),
    extrasPrice: Number(clientData.extrasPrice || 0),
    estimatedPrice: Number(clientData.estimatedPrice || 0),
    estimatedDurationMinutes,
    estimatedDuration,
    ownerEmail: ownerProfile.ownerEmail,
    businessName: ownerProfile.businessName,
    businessLocation: ownerProfile.ownerLocation,
    businessPhone: ownerProfile.ownerPhone,
    businessInstagram: ownerProfile.ownerInstagram,
    businessLogoUrl: ownerProfile.logoUrl,
    adminUrl: (process.env.CLIENT_APP_URL || '').trim(),
  };
}

export const createPreference = onCall<CreatePreferenceData>(
  {
    cors: true,
    maxInstances: 10,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const data = request.data;
    const { slotId, clientData } = data || {};

    if (!slotId || typeof slotId !== 'string' || !clientData?.name || !clientData?.email) {
      throw new HttpsError(
        'invalid-argument',
        'Los datos del turno y del cliente (nombre, email) son obligatorios.'
      );
    }

    const slotRef = db.collection('slots').doc(slotId);
    const now = new Date();
    const nowMs = now.getTime();
    const nowIso = now.toISOString();
    const expiresAtDate = new Date(nowMs + LOCK_DURATION_MS);
    const expiresAtIso = expiresAtDate.toISOString();
    const lockToken = randomUUID();
    const liveCatalog = await getLiveServicesCatalogCached(db, nowMs);

    const txSummary = await db.runTransaction(async (transaction) => {
      const slotDoc = await transaction.get(slotRef);

      if (!slotDoc.exists) {
        throw new HttpsError('not-found', 'El turno seleccionado no existe en el sistema.');
      }

      const slotData = slotDoc.data() || {};
      const depositAmount = Number(slotData.depositAmount) || 5000;
      const slotDatetime = typeof slotData.datetime === 'string' ? slotData.datetime : '';

      if (slotData.status === 'confirmed') {
        throw new HttpsError(
          'failed-precondition',
          'Este turno ya ha sido reservado y confirmado previamente.'
        );
      }

      if (slotData.status === 'cancelled' || slotData.status === 'conflict' || slotData.status === 'past') {
        throw new HttpsError(
          'failed-precondition',
          'Este turno ya no se encuentra disponible para reserva.'
        );
      }

      const slotDateMs = slotDatetime ? new Date(slotDatetime).getTime() : 0;
      if (isNaN(slotDateMs) || slotDateMs <= nowMs + MIN_BOOKING_ANTICIPATION_MS) {
        throw new HttpsError(
          'failed-precondition',
          'Este turno ya no se encuentra disponible para reserva porque faltan menos de 15 minutos para su horario o ya ha transcurrido.'
        );
      }

      // Server-side validation and recalculation against live /services catalog (fallback to slot snapshot)
      const validationResult = validateAndNormalizeClientPayload(
        clientData,
        Array.isArray(slotData.services) ? slotData.services : undefined,
        Number(slotData.estimatedDurationMinutes) || 0,
        { requireEmail: true, liveCatalog }
      );

      if (!validationResult.valid) {
        throw new HttpsError('invalid-argument', validationResult.error);
      }

      const validated = validationResult.data;

      if (slotData.status === 'pending_payment' && slotData.expiresAt) {
        const expiresMs = new Date(slotData.expiresAt).getTime();
        const currentHolderEmail =
          typeof slotData.clientData?.email === 'string'
            ? slotData.clientData.email.trim().toLowerCase()
            : '';
        if (nowMs < expiresMs && currentHolderEmail !== validated.normalizedEmail) {
          throw new HttpsError(
            'resource-exhausted',
            'El turno se encuentra actualmente en proceso de pago por otro usuario. Intenta nuevamente en unos minutos.'
          );
        }
      }

      // Bounded conflict window: looks back 12h so already-started ongoing confirmed slots are NEVER missed
      const { windowStartIso, windowEndIso } = getConflictSearchWindow(
        slotDateMs,
        validated.estimatedDurationMinutes
      );

      const [activeConfirmedSnap, activePendingSnap] = await Promise.all([
        transaction.get(
          db
            .collection('slots')
            .where('status', '==', 'confirmed')
            .where('datetime', '>=', windowStartIso)
            .where('datetime', '<', windowEndIso)
        ),
        transaction.get(
          db
            .collection('slots')
            .where('status', '==', 'pending_payment')
            .where('expiresAt', '>', nowIso)
        ),
      ]);

      const activeSlots: SlotDocData[] = [
        ...activeConfirmedSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        ...activePendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      ];

      const conflictingSlots = findConflictingActiveSlots(
        {
          id: slotId,
          datetime: slotDatetime,
          estimatedDurationMinutes: validated.estimatedDurationMinutes,
          clientData: {
            email: validated.normalizedEmail,
            estimatedDurationMinutes: validated.estimatedDurationMinutes,
          },
        },
        activeSlots,
        nowMs
      );

      if (conflictingSlots.length > 0) {
        throw new HttpsError(
          'failed-precondition',
          'Este turno ya no está disponible porque entra en conflicto con otro turno reservado.'
        );
      }

      const minBaseFromServices = getMinServiceDurationMinutes(
        Array.isArray(slotData.services) ? slotData.services : undefined
      );
      const previousDurationMinutes =
        slotData.status === 'available'
          ? Number(slotData.estimatedDurationMinutes) || minBaseFromServices || 30
          : Number(slotData.previousDurationMinutes) || minBaseFromServices || 30;
      const previousDuration =
        slotData.status === 'available'
          ? typeof slotData.estimatedDuration === 'string' && slotData.estimatedDuration.trim()
            ? slotData.estimatedDuration
            : `${previousDurationMinutes} min`
          : typeof slotData.previousDuration === 'string' && slotData.previousDuration.trim()
          ? slotData.previousDuration
          : `${previousDurationMinutes} min`;

      const serviceName =
        (typeof slotData.serviceName === 'string' && slotData.serviceName.trim()) ||
        (typeof validated.clientDataToSave.selectedService === 'string' &&
          validated.clientDataToSave.selectedService) ||
        'Turno / Consulta';

      const pendingEndDatetime = computeEndDatetimeIso(
        slotDatetime,
        validated.estimatedDurationMinutes
      );

      transaction.update(slotRef, {
        status: 'pending_payment',
        previousDurationMinutes,
        previousDuration,
        estimatedDurationMinutes: validated.estimatedDurationMinutes,
        estimatedDuration: validated.estimatedDuration,
        ...(pendingEndDatetime ? { endDatetime: pendingEndDatetime } : {}),
        clientData: validated.clientDataToSave,
        expiresAt: expiresAtIso,
        lockToken,
        updatedAt: nowIso,
      });

      return {
        depositAmount,
        serviceName,
        slotDatetime,
        previousDurationMinutes,
        previousDuration,
        validated,
      };
    });

    const baseUrl = (process.env.CLIENT_APP_URL || 'https://turnos-web-eb8b5.web.app').trim();
    const webhookUrl = getWebhookUrl();

    logger.info('[createPreference] Creando preferencia en Mercado Pago.', {
      slotId,
      durationMinutes: txSummary.validated.estimatedDurationMinutes,
      clientEmail: maskEmail(txSummary.validated.normalizedEmail),
    });

    try {
      const preferenceClient = await getPreferenceClient();
      const mpPreference = await preferenceClient.create({
        body: {
          items: [
            {
              id: slotId,
              title: `Seña para reserva: ${txSummary.serviceName}`,
              description: `Reserva de turno para el día ${txSummary.slotDatetime}`,
              quantity: 1,
              unit_price: txSummary.depositAmount,
              currency_id: 'ARS',
            },
          ],
          payer: {
            name: txSummary.validated.normalizedName,
            email: txSummary.validated.normalizedEmail,
            phone: {
              number: txSummary.validated.normalizedPhone,
            },
          },
          back_urls: {
            success: `${baseUrl.replace(/\/$/, '')}/payment/success`,
            failure: `${baseUrl.replace(/\/$/, '')}/payment/failure`,
            pending: `${baseUrl.replace(/\/$/, '')}/payment/pending`,
          },
          auto_return: 'approved',
          notification_url: webhookUrl || undefined,
          external_reference: slotId,
          metadata: {
            slot_id: slotId,
            lock_token: lockToken,
            client_name: txSummary.validated.normalizedName,
            client_email: txSummary.validated.normalizedEmail,
            client_phone: txSummary.validated.normalizedPhone,
          },
          expires: true,
          expiration_date_from: nowIso,
          expiration_date_to: expiresAtIso,
        },
      });

      const attemptId = mpPreference.id || lockToken;
      const attemptRef = db.collection(PAYMENT_ATTEMPTS_COLLECTION).doc(attemptId);
      const updatedIso = new Date().toISOString();

      await Promise.all([
        slotRef.update({
          preferenceId: mpPreference.id || null,
          updatedAt: updatedIso,
        }),
        attemptRef.set({
          slotId,
          preferenceId: mpPreference.id || null,
          lockToken,
          depositAmount: txSummary.depositAmount,
          slotDatetime: txSummary.slotDatetime,
          serviceName: txSummary.serviceName,
          estimatedDurationMinutes: txSummary.validated.estimatedDurationMinutes,
          estimatedDuration: txSummary.validated.estimatedDuration,
          clientData: txSummary.validated.clientDataToSave,
          createdAt: nowIso,
          expiresAt: expiresAtIso,
          // Firestore native TTL field (30 days retention)
          expireAt: admin.firestore.Timestamp.fromMillis(nowMs + 30 * 24 * 60 * 60 * 1000),
        }),
      ]);

      return {
        preferenceId: mpPreference.id,
        initPoint: mpPreference.init_point,
        sandboxInitPoint: mpPreference.sandbox_init_point,
      };
    } catch (err: unknown) {
      logger.error('[createPreference] Error al crear preferencia en Mercado Pago.', {
        slotId,
        error: err instanceof Error ? err.message : String(err),
      });

      // Transactional rollback only if the slot still holds THIS exact lockToken
      await db
        .runTransaction(async (tx) => {
          const fresh = await tx.get(slotRef);
          if (!fresh.exists) return;
          const freshData = fresh.data() || {};
          if (freshData.status === 'pending_payment' && freshData.lockToken === lockToken) {
            tx.update(slotRef, {
              status: 'available',
              clientData: null,
              expiresAt: null,
              lockToken: null,
              preferenceId: null,
              endDatetime: null,
              estimatedDurationMinutes: txSummary.previousDurationMinutes,
              estimatedDuration: txSummary.previousDuration,
              updatedAt: new Date().toISOString(),
            });
          }
        })
        .catch((revertErr) => {
          logger.error('[createPreference] Error al revertir bloqueo de turno.', {
            slotId,
            error: revertErr instanceof Error ? revertErr.message : String(revertErr),
          });
        });

      const errorMsg =
        err instanceof Error ? err.message : 'Error al generar la preferencia de Mercado Pago';
      throw new HttpsError('internal', errorMsg);
    }
  }
);

async function resolveAttemptSnapshot(
  slotId: string,
  lockToken: string | undefined,
  preferenceId: string | undefined
): Promise<Record<string, unknown> | null> {
  if (preferenceId) {
    const snap = await db.collection(PAYMENT_ATTEMPTS_COLLECTION).doc(preferenceId).get();
    if (snap.exists) {
      return snap.data() as Record<string, unknown>;
    }
  }
  if (lockToken) {
    const querySnap = await db
      .collection(PAYMENT_ATTEMPTS_COLLECTION)
      .where('lockToken', '==', lockToken)
      .limit(1)
      .get();
    if (!querySnap.empty) {
      return querySnap.docs[0].data() as Record<string, unknown>;
    }
  }
  // Uses composite index (slotId ASC, createdAt DESC) to deterministically fetch the latest attempt
  const latestSnap = await db
    .collection(PAYMENT_ATTEMPTS_COLLECTION)
    .where('slotId', '==', slotId)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();
  if (latestSnap.empty) return null;

  return (latestSnap.docs[0].data() as Record<string, unknown>) || null;
}

type ConfirmationTxOutcome =
  | { kind: 'slot_not_found' }
  | {
      kind: 'already_confirmed_same_payment';
      shouldRetryEmails: boolean;
      needClient: boolean;
      needOwner: boolean;
      slotData: Record<string, unknown>;
    }
  | {
      kind: 'double_payment_incident';
      existingPaymentId: string;
      existingClientName: string;
      slotData: Record<string, unknown>;
    }
  | {
      kind: 'late_payment_conflict';
      reason: string;
      slotData: Record<string, unknown>;
    }
  | {
      kind: 'confirmed_now';
      slotData: Record<string, unknown>;
      effectiveClientData: Record<string, unknown>;
      effectiveDurationMinutes: number;
    };

export async function processPaymentConfirmation(
  paymentId: string | number,
  expectedSlotId?: string
) {
  const pid = String(paymentId);
  logger.info('[processPaymentConfirmation] Consultando pago en Mercado Pago.', {
    paymentId: pid,
  });

  const paymentClient = await getPaymentClient();
  const paymentData = await paymentClient.get({ id: pid });

  if (!paymentData || !paymentData.status) {
    logger.warn('[processPaymentConfirmation] Pago no encontrado en Mercado Pago.', {
      paymentId: pid,
    });
    return { success: false, status: 'payment_not_found' };
  }

  const slotId = String(paymentData.metadata?.slot_id || paymentData.external_reference || '').trim();
  if (!slotId) {
    logger.warn('[processPaymentConfirmation] Pago sin slot_id asociado.', { paymentId: pid });
    return { success: false, status: 'missing_slot_id' };
  }

  if (expectedSlotId && expectedSlotId !== slotId) {
    logger.warn('[processPaymentConfirmation] slotId no coincide con external_reference del pago.', {
      paymentId: pid,
      expectedSlotId,
      actualSlotId: slotId,
    });
    return { success: false, status: 'slot_mismatch' };
  }

  const slotRef = db.collection('slots').doc(slotId);
  const metadataLockToken =
    typeof paymentData.metadata?.lock_token === 'string'
      ? paymentData.metadata.lock_token
      : undefined;
  const orderPrefId =
    typeof (paymentData as unknown as { preference_id?: string }).preference_id === 'string'
      ? (paymentData as unknown as { preference_id?: string }).preference_id
      : undefined;

  const [initialSlotDoc, ownerProfile] = await Promise.all([
    slotRef.get(),
    getOwnerProfileCached(db),
  ]);

  if (!initialSlotDoc.exists) {
    logger.error('[processPaymentConfirmation] Turno no encontrado en Firestore.', {
      slotId,
      paymentId: pid,
    });
    return { success: false, status: 'slot_not_found' };
  }

  const initialSlotData = (initialSlotDoc.data() || {}) as Record<string, unknown>;

  if (paymentData.status === 'approved') {
    const currencyId = String(paymentData.currency_id || 'ARS').toUpperCase();
    const expectedDeposit = Number(initialSlotData.depositAmount) || 0;
    const paidAmount = Number(paymentData.transaction_amount || 0);

    if (currencyId !== 'ARS') {
      logger.warn('[processPaymentConfirmation] Moneda inesperada en pago aprobado.', {
        paymentId: pid,
        slotId,
        currencyId,
      });
      return { success: false, status: 'invalid_currency', slotId };
    }

    if (expectedDeposit > 0 && paidAmount > 0 && paidAmount + 1 < expectedDeposit) {
      logger.warn('[processPaymentConfirmation] Monto pagado menor a la seña requerida.', {
        paymentId: pid,
        slotId,
        paidAmount,
        expectedDeposit,
      });
      return { success: false, status: 'insufficient_amount', slotId };
    }

    // Recover snapshot if the slot's clientData was wiped by expiration before late payment arrived
    let attemptSnapshot: Record<string, unknown> | null = null;
    if (!initialSlotData.clientData || initialSlotData.status !== 'pending_payment') {
      attemptSnapshot = await resolveAttemptSnapshot(
        slotId,
        metadataLockToken,
        orderPrefId ||
          (typeof initialSlotData.preferenceId === 'string'
            ? initialSlotData.preferenceId
            : undefined)
      );
    }

    const fallbackClientEmail = String(
      paymentData.metadata?.client_email || paymentData.payer?.email || ''
    ).trim();
    const fallbackClientName = String(
      paymentData.metadata?.client_name || paymentData.payer?.first_name || 'Cliente'
    ).trim();
    const fallbackClientPhone = String(paymentData.metadata?.client_phone || '').trim();

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    // Atomic transaction returning explicit outcome (fixes sticky boolean bug F-01 + F-05)
    const txOutcome: ConfirmationTxOutcome = await db.runTransaction(async (transaction) => {
      const freshDoc = await transaction.get(slotRef);
      if (!freshDoc.exists) {
        return { kind: 'slot_not_found' };
      }

      const freshData = (freshDoc.data() || {}) as Record<string, unknown>;

      if (freshData.status === 'confirmed') {
        const existingPid = String(freshData.paymentId || '');
        if (!existingPid || existingPid === pid) {
          const emailStatus = String(freshData.emailStatus || '');
          const attempts = Number(freshData.emailAttempts || 0);
          const processingAtMs =
            typeof freshData.emailProcessingAt === 'string'
              ? new Date(freshData.emailProcessingAt).getTime()
              : 0;
          const isStaleProcessing =
            emailStatus === 'processing' &&
            processingAtMs > 0 &&
            nowMs - processingAtMs >= STALE_EMAIL_PROCESSING_MS;
          const isRecoverableFailure = emailStatus === 'failed' || emailStatus === 'partial';

          const existingClientData = (freshData.clientData || {}) as Record<string, unknown>;
          const needClient = !freshData.clientEmailSent && Boolean(existingClientData.email);
          const needOwner = !freshData.ownerEmailSent;
          const shouldRetryEmails =
            attempts < 3 && (isRecoverableFailure || isStaleProcessing) && (needClient || needOwner);

          if (shouldRetryEmails) {
            transaction.update(slotRef, {
              emailStatus: 'processing',
              emailProcessingAt: nowIso,
              emailAttempts: attempts + 1,
              updatedAt: nowIso,
            });
          }

          return {
            kind: 'already_confirmed_same_payment',
            shouldRetryEmails,
            needClient,
            needOwner,
            slotData: freshData,
          };
        }

        const existingClient = (freshData.clientData || {}) as Record<string, unknown>;
        return {
          kind: 'double_payment_incident',
          existingPaymentId: existingPid,
          existingClientName: String(existingClient.name || 'Cliente'),
          slotData: freshData,
        };
      }

      if (freshData.status === 'cancelled' || freshData.status === 'conflict' || freshData.status === 'past') {
        return {
          kind: 'late_payment_conflict',
          reason: `slot_status_${String(freshData.status)}`,
          slotData: freshData,
        };
      }

      const snapshotClient =
        attemptSnapshot && typeof attemptSnapshot.clientData === 'object' && attemptSnapshot.clientData
          ? (attemptSnapshot.clientData as Record<string, unknown>)
          : null;

      const freshClient =
        typeof freshData.clientData === 'object' && freshData.clientData
          ? (freshData.clientData as Record<string, unknown>)
          : null;

      const effectiveClientData: Record<string, unknown> = freshClient ||
        snapshotClient || {
          name: fallbackClientName,
          email: fallbackClientEmail,
          phone: fallbackClientPhone,
          notes: '',
        };

      const effectiveDurationMinutes = Number(
        effectiveClientData.estimatedDurationMinutes ||
          attemptSnapshot?.estimatedDurationMinutes ||
          freshData.estimatedDurationMinutes ||
          0
      );
      const effectiveDuration =
        (typeof effectiveClientData.estimatedDuration === 'string' &&
          effectiveClientData.estimatedDuration) ||
        (typeof attemptSnapshot?.estimatedDuration === 'string' &&
          attemptSnapshot.estimatedDuration) ||
        (typeof freshData.estimatedDuration === 'string' && freshData.estimatedDuration) ||
        (effectiveDurationMinutes > 0 ? `${effectiveDurationMinutes} min` : '');

      const slotDatetime = typeof freshData.datetime === 'string' ? freshData.datetime : '';
      const slotStartMs = slotDatetime ? new Date(slotDatetime).getTime() : 0;

      // Re-validate against confirmed slots in bounded window (prevents late-payment double booking)
      if (!isNaN(slotStartMs) && slotStartMs > 0) {
        const { windowStartIso, windowEndIso } = getConflictSearchWindow(
          slotStartMs,
          effectiveDurationMinutes
        );
        const confirmedWindowSnap = await transaction.get(
          db
            .collection('slots')
            .where('status', '==', 'confirmed')
            .where('datetime', '>=', windowStartIso)
            .where('datetime', '<', windowEndIso)
        );
        const confirmedSlots: SlotDocData[] = confirmedWindowSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        const overlaps = findConflictingActiveSlots(
          {
            id: slotId,
            datetime: slotDatetime,
            estimatedDurationMinutes: effectiveDurationMinutes,
            clientData: { estimatedDurationMinutes: effectiveDurationMinutes },
          },
          confirmedSlots,
          nowMs
        );
        if (overlaps.length > 0) {
          return {
            kind: 'late_payment_conflict',
            reason: 'overlapping_confirmed_slot',
            slotData: freshData,
          };
        }
      }

      const endDatetime = computeEndDatetimeIso(slotDatetime, effectiveDurationMinutes);

      transaction.update(slotRef, {
        status: 'confirmed',
        clientData: effectiveClientData,
        estimatedDurationMinutes: effectiveDurationMinutes,
        estimatedDuration: effectiveDuration,
        ...(endDatetime ? { endDatetime } : {}),
        paymentId: pid,
        paidAmount: paidAmount || expectedDeposit,
        paymentStatus: paymentData.status,
        expiresAt: null,
        lockToken: null,
        confirmedAt: nowIso,
        updatedAt: nowIso,
        emailStatus: 'processing',
        emailProcessingAt: nowIso,
        emailSent: false,
        clientEmailSent: false,
        ownerEmailSent: false,
        emailAttempts: 1,
      });

      return {
        kind: 'confirmed_now',
        slotData: freshData,
        effectiveClientData,
        effectiveDurationMinutes,
      };
    });

    if (txOutcome.kind === 'slot_not_found') {
      return { success: false, status: 'slot_not_found' };
    }

    if (
      txOutcome.kind === 'double_payment_incident' ||
      txOutcome.kind === 'late_payment_conflict'
    ) {
      const incidentRef = db.collection(PAYMENT_INCIDENTS_COLLECTION).doc(pid);
      const incidentExists = (await incidentRef.get()).exists;

      if (!incidentExists) {
        await incidentRef.set({
          kind: txOutcome.kind,
          slotId,
          paymentId: pid,
          paidAmount: paidAmount || expectedDeposit,
          slotDatetime: txOutcome.slotData.datetime || null,
          incomingClientName: fallbackClientName,
          incomingClientEmail: fallbackClientEmail,
          existingPaymentId:
            txOutcome.kind === 'double_payment_incident' ? txOutcome.existingPaymentId : null,
          existingClientName:
            txOutcome.kind === 'double_payment_incident' ? txOutcome.existingClientName : null,
          reason: txOutcome.kind === 'late_payment_conflict' ? txOutcome.reason : 'already_confirmed',
          createdAt: nowIso,
          resolved: false,
        });

        await sendPaymentIncidentAlertEmail({
          kind: txOutcome.kind,
          slotId,
          paymentId: pid,
          paidAmount: paidAmount || expectedDeposit,
          datetime:
            typeof txOutcome.slotData.datetime === 'string'
              ? txOutcome.slotData.datetime
              : undefined,
          incomingClientName: fallbackClientName,
          incomingClientEmail: fallbackClientEmail,
          incomingClientPhone: fallbackClientPhone || undefined,
          existingPaymentId:
            txOutcome.kind === 'double_payment_incident' ? txOutcome.existingPaymentId : undefined,
          existingClientName:
            txOutcome.kind === 'double_payment_incident' ? txOutcome.existingClientName : undefined,
          ownerEmail: ownerProfile.ownerEmail,
          businessName: ownerProfile.businessName,
          adminUrl: (process.env.CLIENT_APP_URL || '').trim(),
        });
      }

      logger.error('[processPaymentConfirmation] Incidente de pago detectado; no se sobrescribió el turno.', {
        kind: txOutcome.kind,
        slotId,
        paymentId: pid,
      });

      return {
        success: false,
        status: txOutcome.kind,
        slotId,
      };
    }

    if (txOutcome.kind === 'already_confirmed_same_payment') {
      const existingClientData = (txOutcome.slotData.clientData || {}) as Record<string, unknown>;
      const bookingDetails = buildBookingEmailPayload({
        slotId,
        paymentId: pid,
        slotData: txOutcome.slotData,
        clientData: existingClientData,
        paidAmount: paidAmount || expectedDeposit,
        fallbackClientEmail,
        fallbackClientName,
        ownerProfile,
      });

      if (txOutcome.shouldRetryEmails) {
        const retryResult = await sendBookingConfirmationEmails(bookingDetails, {
          sendClient: txOutcome.needClient,
          sendOwner: txOutcome.needOwner,
        });
        const finalClientSent = Boolean(txOutcome.slotData.clientEmailSent) || retryResult.clientSent;
        const finalOwnerSent = Boolean(txOutcome.slotData.ownerEmailSent) || retryResult.ownerSent;
        const hasClientEmail = Boolean(bookingDetails.clientEmail.trim());
        const allSent = (!hasClientEmail || finalClientSent) && finalOwnerSent;
        const nextStatus = allSent ? 'sent' : finalClientSent || finalOwnerSent ? 'partial' : 'failed';

        await slotRef.update({
          emailStatus: nextStatus,
          emailSent: allSent,
          clientEmailSent: finalClientSent,
          ownerEmailSent: finalOwnerSent,
          emailSentAt: allSent ? new Date().toISOString() : txOutcome.slotData.emailSentAt || null,
          emailResult: {
            clientSent: finalClientSent,
            ownerSent: finalOwnerSent,
            clientError: retryResult.clientError || null,
            ownerError: retryResult.ownerError || null,
          },
          updatedAt: new Date().toISOString(),
        });
      }

      return {
        success: true,
        status: 'confirmed',
        slotId,
        bookingDetails,
      };
    }

    // Confirmed just now: run conflict marking and parallel email delivery concurrently & isolated
    const bookingDetails = buildBookingEmailPayload({
      slotId,
      paymentId: pid,
      slotData: txOutcome.slotData,
      clientData: txOutcome.effectiveClientData,
      paidAmount: paidAmount || expectedDeposit,
      fallbackClientEmail,
      fallbackClientName,
      ownerProfile,
    });

    const markConflictsTask = async (): Promise<void> => {
      const slotDatetime = typeof txOutcome.slotData.datetime === 'string' ? txOutcome.slotData.datetime : '';
      const slotStartMs = slotDatetime ? new Date(slotDatetime).getTime() : 0;
      if (isNaN(slotStartMs) || slotStartMs <= 0) return;

      const { windowStartIso, windowEndIso } = getConflictSearchWindow(
        slotStartMs,
        txOutcome.effectiveDurationMinutes
      );

      const [availableSnap, expiredPendingSnap] = await Promise.all([
        db
          .collection('slots')
          .where('status', '==', 'available')
          .where('datetime', '>=', windowStartIso)
          .where('datetime', '<', windowEndIso)
          .get(),
        db
          .collection('slots')
          .where('status', '==', 'pending_payment')
          .where('expiresAt', '<=', nowIso)
          .get(),
      ]);

      const candidateSlots: SlotDocData[] = [
        ...availableSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        ...expiredPendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      ];

      const conflictingSlots = calculateConflictingAvailableSlots(
        {
          id: slotId,
          datetime: slotDatetime,
          estimatedDurationMinutes: txOutcome.effectiveDurationMinutes,
        },
        candidateSlots,
        nowMs
      );

      if (conflictingSlots.length > 0) {
        const conflictTimestamp = new Date().toISOString();
        const ops: BatchOperation[] = conflictingSlots
          .filter((c): c is SlotDocData & { id: string } => Boolean(c.id))
          .map((c) => ({
            type: 'update',
            ref: db.collection('slots').doc(c.id),
            data: {
              status: 'conflict',
              clientData: null,
              expiresAt: null,
              lockToken: null,
              updatedAt: conflictTimestamp,
            },
          }));
        await commitOperationsInChunks(db, ops);
      }
    };

    const sendEmailsTask = async (): Promise<void> => {
      const emailResult = await sendBookingConfirmationEmails(bookingDetails);
      const hasClientEmail = Boolean(bookingDetails.clientEmail.trim());
      const allRequiredSent =
        (!hasClientEmail || emailResult.clientSent) && emailResult.ownerSent;
      const anySent = emailResult.clientSent || emailResult.ownerSent;
      const nextEmailStatus = allRequiredSent ? 'sent' : anySent ? 'partial' : 'failed';

      await slotRef.update({
        emailStatus: nextEmailStatus,
        emailSent: allRequiredSent,
        clientEmailSent: emailResult.clientSent,
        ownerEmailSent: emailResult.ownerSent,
        emailSentAt: allRequiredSent ? new Date().toISOString() : null,
        emailResult: {
          clientSent: emailResult.clientSent,
          ownerSent: emailResult.ownerSent,
          clientError: emailResult.clientError || null,
          ownerError: emailResult.ownerError || null,
        },
        updatedAt: new Date().toISOString(),
      });
    };

    const [conflictsRes, emailsRes] = await Promise.allSettled([
      markConflictsTask(),
      sendEmailsTask(),
    ]);

    if (conflictsRes.status === 'rejected') {
      logger.error('[processPaymentConfirmation] Error no bloqueante al marcar conflictos.', {
        slotId,
        error:
          conflictsRes.reason instanceof Error
            ? conflictsRes.reason.message
            : String(conflictsRes.reason),
      });
    }

    if (emailsRes.status === 'rejected') {
      logger.error('[processPaymentConfirmation] Error al despachar/persistir estado de emails.', {
        slotId,
        error:
          emailsRes.reason instanceof Error ? emailsRes.reason.message : String(emailsRes.reason),
      });
      await slotRef
        .update({
          emailStatus: 'failed',
          emailSent: false,
          updatedAt: new Date().toISOString(),
        })
        .catch(() => {});
    }

    return {
      success: true,
      status: 'confirmed',
      slotId,
      bookingDetails,
    };
  }

  if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
    logger.info('[processPaymentConfirmation] Pago rechazado o cancelado.', {
      slotId,
      paymentId: pid,
      mpStatus: paymentData.status,
    });

    const rejectedEmail = String(
      paymentData.metadata?.client_email || paymentData.payer?.email || ''
    )
      .trim()
      .toLowerCase();

    // Transactional release without full-collection scan (fixes F-11 + F-12)
    await db.runTransaction(async (transaction) => {
      const freshDoc = await transaction.get(slotRef);
      if (!freshDoc.exists) return;
      const freshData = (freshDoc.data() || {}) as Record<string, unknown>;

      if (freshData.status !== 'pending_payment') return;

      // Guard: do not release if a newer checkout attempt replaced this lock
      if (metadataLockToken && freshData.lockToken && freshData.lockToken !== metadataLockToken) {
        return;
      }
      if (!metadataLockToken && rejectedEmail) {
        const holderEmail =
          typeof (freshData.clientData as Record<string, unknown> | undefined)?.email === 'string'
            ? String((freshData.clientData as Record<string, unknown>).email).trim().toLowerCase()
            : '';
        if (holderEmail && holderEmail !== rejectedEmail) {
          return;
        }
      }

      const minServiceDuration = getMinServiceDurationMinutes(
        Array.isArray(freshData.services) ? freshData.services : undefined
      );
      const baseDuration =
        typeof freshData.previousDurationMinutes === 'number' &&
        freshData.previousDurationMinutes > 0
          ? freshData.previousDurationMinutes
          : minServiceDuration > 0
          ? minServiceDuration
          : 30;
      const baseDurationLabel =
        typeof freshData.previousDuration === 'string' && freshData.previousDuration.trim()
          ? freshData.previousDuration
          : `${baseDuration} min`;

      const slotDatetime = typeof freshData.datetime === 'string' ? freshData.datetime : '';
      const slotStartMs = slotDatetime ? new Date(slotDatetime).getTime() : 0;
      let nextStatus: 'available' | 'conflict' = 'available';

      if (!isNaN(slotStartMs) && slotStartMs > 0) {
        const { windowStartIso, windowEndIso } = getConflictSearchWindow(slotStartMs, baseDuration);
        const confirmedSnap = await transaction.get(
          db
            .collection('slots')
            .where('status', '==', 'confirmed')
            .where('datetime', '>=', windowStartIso)
            .where('datetime', '<', windowEndIso)
        );
        const confirmedSlots: SlotDocData[] = confirmedSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        const overlaps = findConflictingActiveSlots(
          {
            id: slotId,
            datetime: slotDatetime,
            estimatedDurationMinutes: baseDuration,
            services: Array.isArray(freshData.services) ? freshData.services : undefined,
          },
          confirmedSlots,
          Date.now()
        );
        if (overlaps.length > 0) {
          nextStatus = 'conflict';
        }
      }

      transaction.update(slotRef, {
        status: nextStatus,
        clientData: null,
        estimatedDurationMinutes: baseDuration,
        estimatedDuration: baseDurationLabel,
        expiresAt: null,
        preferenceId: null,
        lockToken: null,
        endDatetime: null,
        updatedAt: new Date().toISOString(),
      });
    });

    return { success: false, status: paymentData.status, slotId };
  }

  return { success: false, status: paymentData.status || 'unknown', slotId };
}

export const mpWebhook = onRequest(
  {
    cors: true,
    maxInstances: 10,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (req, res) => {
    try {
      const query = req.query as Record<string, unknown>;
      const body = (req.body || {}) as Record<string, unknown>;
      const queryData = query.data as Record<string, unknown> | undefined;
      const bodyData = body.data as Record<string, unknown> | undefined;

      const rawPaymentId =
        query['data.id'] ||
        queryData?.id ||
        query.id ||
        bodyData?.id ||
        body.id ||
        (body.type === 'payment' ? bodyData?.id || body.id : null) ||
        (query.type === 'payment' ? query['data.id'] || query.id : null) ||
        (query.topic === 'payment' ? query.id : null);

      const dataIdForSignature = rawPaymentId ? String(rawPaymentId) : undefined;
      const sigResult = verifyMercadoPagoSignature({
        xSignatureHeader: req.get('x-signature') || undefined,
        xRequestIdHeader: req.get('x-request-id') || undefined,
        dataId: dataIdForSignature,
        secret: process.env.MP_WEBHOOK_SECRET,
      });

      if (!sigResult.enforced) {
        logger.warn('[mpWebhook] MP_WEBHOOK_SECRET no configurado; verificación HMAC omitida.');
      } else if (!sigResult.verified) {
        logger.warn('[mpWebhook] Firma HMAC inválida rechazada.', {
          reason: sigResult.reason,
          dataId: dataIdForSignature || null,
        });
        res.status(401).send({ error: 'Invalid webhook signature' });
        return;
      }

      if (!rawPaymentId) {
        logger.info('[mpWebhook] Notificación sin paymentId directo.');
        res.status(200).send({ status: 'ignored_no_payment_id' });
        return;
      }

      const result = await processPaymentConfirmation(String(rawPaymentId));
      res.status(200).send({
        received: true,
        success: result.success,
        status: result.status,
      });
    } catch (error: unknown) {
      logger.error('[mpWebhook] Error procesando webhook.', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).send({ error: 'Internal Server Error' });
    }
  }
);

export const verifyPayment = onCall<{ paymentId?: string; slotId?: string }>(
  {
    cors: true,
    maxInstances: 10,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const { paymentId, slotId } = request.data || {};
    const cleanPaymentId = typeof paymentId === 'string' ? paymentId.trim() : '';
    const cleanSlotId = typeof slotId === 'string' ? slotId.trim() : undefined;

    if (!cleanPaymentId) {
      throw new HttpsError('invalid-argument', 'Se requiere paymentId válido para verificar el pago.');
    }

    const result = await processPaymentConfirmation(cleanPaymentId, cleanSlotId);
    if (!result.bookingDetails) {
      return {
        success: result.success,
        status: result.status,
        slotId: result.slotId,
      };
    }

    const details = result.bookingDetails;
    const publicBookingDetails = {
      slotId: details.slotId,
      paymentId: details.paymentId,
      serviceName: details.serviceName,
      datetime: details.datetime,
      formattedDate: details.formattedDate,
      formattedTime: details.formattedTime,
      depositAmount: details.depositAmount,
      estimatedPrice: details.estimatedPrice,
      estimatedDurationMinutes: details.estimatedDurationMinutes,
      estimatedDuration: details.estimatedDuration,
      businessName: details.businessName,
      clientName: details.clientName,
      maskedClientEmail: maskEmail(details.clientEmail),
    };

    return {
      success: result.success,
      status: result.status,
      slotId: result.slotId,
      bookingDetails: publicBookingDetails,
    };
  }
);

export const syncPublicSlot = onDocumentWritten(
  {
    document: 'slots/{slotId}',
    maxInstances: 20,
    memory: '256MiB',
  },
  async (event) => {
    const slotId = event.params.slotId;
    const afterData = event.data?.after.exists
      ? (event.data.after.data() as Record<string, unknown>)
      : null;

    await syncPublicSlotDocument(db, slotId, afterData);
  }
);

export const backfillPublicSlots = onCall(
  {
    cors: true,
    maxInstances: 2,
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    }
    return backfillAllPublicSlots(db);
  }
);

export const adminCreateSlots = onCall<{ slots: AdminNewSlotInput[] }>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    }
    const slots = request.data?.slots;
    if (!Array.isArray(slots) || slots.length === 0) {
      throw new HttpsError('invalid-argument', 'Se requiere al menos un turno para crear.');
    }
    const createdIds = await adminCreateSlotsCore(db, slots);
    return { createdIds };
  }
);

export const adminAssignSlot = onCall<{ slotId: string; clientData: ClientPayload }>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    }
    await adminAssignSlotCore(db, request.data?.slotId, request.data?.clientData);
    return { success: true };
  }
);

export const adminCancelSlot = onCall<{ slotId: string }>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    }
    await adminCancelSlotCore(db, request.data?.slotId);
    return { success: true };
  }
);

export const adminReleaseSlot = onCall<{ slotId: string }>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    }
    return adminReleaseSlotCore(db, request.data?.slotId);
  }
);

export const adminDeleteSlot = onCall<{ slotId: string }>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    }
    await adminDeleteSlotCore(db, request.data?.slotId);
    return { success: true };
  }
);

export const releaseExpiredSlots = onSchedule(
  {
    schedule: 'every 10 minutes',
    maxInstances: 1,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async () => {
    const [expiredRes, emailRetryRes] = await Promise.allSettled([
      processExpiredSlots(db),
      retryPendingBookingEmails(db),
    ]);

    const errors: string[] = [];
    if (expiredRes.status === 'rejected') {
      const msg =
        expiredRes.reason instanceof Error
          ? expiredRes.reason.message
          : String(expiredRes.reason);
      logger.error('[releaseExpiredSlots] Falló processExpiredSlots.', { error: msg });
      errors.push(`processExpiredSlots: ${msg}`);
    }

    if (emailRetryRes.status === 'rejected') {
      const msg =
        emailRetryRes.reason instanceof Error
          ? emailRetryRes.reason.message
          : String(emailRetryRes.reason);
      logger.error('[releaseExpiredSlots] Falló retryPendingBookingEmails.', { error: msg });
      errors.push(`retryPendingBookingEmails: ${msg}`);
    }

    if (errors.length > 0) {
      throw new Error(errors.join(' | '));
    }
  }
);

export const cleanupPastSlots = onSchedule(
  {
    schedule: '0 0,8-23 * * *',
    timeZone: 'America/Argentina/Buenos_Aires',
    maxInstances: 1,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async () => {
    await cleanupPastSlotsMaintenance(db);
  }
);
