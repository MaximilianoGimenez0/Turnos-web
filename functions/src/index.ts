import { randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { getTenantMpClients, resolveTenantMpCredentials } from './mercadoPago';
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
} from './bookingValidation';
import { formatSurchargeValue, normalizeSlotSurcharge } from './surcharge';
import {
  parsePaymentExternalReference,
  verifyMercadoPagoSignature,
} from './webhookSecurity';
import { getOwnerProfileCached, type CachedOwnerProfile } from './ownerProfile';
import { getLiveServicesCatalogCached } from './servicesCatalog';
import { syncPublicSlotDocument } from './publicSlots';
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
  buildBookingEmailPayloadFromSlot,
  resolveEmailTimezone,
  sendBookingConfirmationEmails,
  sendPaymentIncidentAlertEmail,
  type BookingEmailPayload,
} from './emailService';
import {
  assertTenantRole,
  getActiveTenantOrThrow,
  getTenantOrThrow,
  getTenantPaymentAttemptsCollection,
  getTenantPaymentIncidentsCollection,
  getTenantSlotsCollection,
  isValidTenantId,
  validateTenantIdOrThrow,
  type TenantDoc,
} from './tenantContext';
import { buildTenantWebhookUrl } from './paymentSettings';

admin.initializeApp();
const db = admin.firestore();

export {
  onTenantDocWritten,
  onTenantOwnerInfoWritten,
  onTenantMemberWritten,
} from './tenantSync';
export {
  adminGetPaymentSettingsSummary,
  adminSavePaymentSettings,
} from './paymentSettings';
export {
  superadminCreateTenant,
  superadminUpdateTenant,
  superadminChangeTenantSlug,
  superadminUpsertTenantMember,
} from './superadminTenants';
export {
  submitOnboardingRequest,
  superadminUpdateOnboardingRequestStatus,
} from './onboardingRequests';

const LOCK_DURATION_MS = 15 * 60 * 1000;
const MIN_BOOKING_ANTICIPATION_MS = 15 * 60 * 1000;
const STALE_EMAIL_PROCESSING_MS = 2 * 60 * 1000;

interface CreatePreferenceData {
  tenantId: string;
  slotId: string;
  clientData: ClientPayload;
}

export { parsePaymentExternalReference } from './webhookSecurity';

function formatDateTimeForTimezone(
  datetime: string,
  timezone?: string
): { formattedDate: string; formattedTime: string } {
  const tz = resolveEmailTimezone(timezone);
  const slotDate = new Date(datetime || new Date().toISOString());
  const validDate = isNaN(slotDate.getTime()) ? new Date() : slotDate;
  return {
    formattedDate: validDate.toLocaleDateString('es-AR', {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    formattedTime: validDate.toLocaleTimeString('es-AR', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

function buildBookingEmailPayload(params: {
  tenant: Pick<TenantDoc, 'id' | 'slug' | 'timezone'>;
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
    tenant,
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
  const { formattedDate, formattedTime } = formatDateTimeForTimezone(datetime, tenant.timezone);

  return buildBookingEmailPayloadFromSlot({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    timezone: tenant.timezone,
    slotId,
    paymentId,
    slotData: { ...slotData, datetime },
    clientData,
    paidAmount,
    fallbackClientEmail,
    fallbackClientName,
    formattedDate,
    formattedTime,
    ownerProfile,
    adminUrl: (process.env.CLIENT_APP_URL || '').trim(),
  });
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
    const tenantId = validateTenantIdOrThrow(data?.tenantId);
    const { slotId, clientData } = data || {};

    if (!slotId || typeof slotId !== 'string' || !clientData?.name || !clientData?.email) {
      throw new HttpsError(
        'invalid-argument',
        'Los datos del turno y del cliente (nombre, email) son obligatorios.'
      );
    }

    const tenant = await getActiveTenantOrThrow(db, tenantId);

    // Resolve tenant MP credentials before locking the slot to prevent orphaned pending_payment locks
    const { preferenceClient } = await getTenantMpClients(db, tenant);

    const slotsCol = getTenantSlotsCollection(db, tenantId);
    const slotRef = slotsCol.doc(slotId);
    const now = new Date();
    const nowMs = now.getTime();
    const nowIso = now.toISOString();
    const expiresAtDate = new Date(nowMs + LOCK_DURATION_MS);
    const expiresAtIso = expiresAtDate.toISOString();
    const lockToken = randomUUID();
    const liveCatalog = await getLiveServicesCatalogCached(db, tenantId, nowMs);

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

      if (
        slotData.status === 'cancelled' ||
        slotData.status === 'conflict' ||
        slotData.status === 'past'
      ) {
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

      const slotSurcharge = normalizeSlotSurcharge(slotData.surcharge);
      const validationResult = validateAndNormalizeClientPayload(
        clientData,
        Array.isArray(slotData.services) ? slotData.services : undefined,
        Number(slotData.estimatedDurationMinutes) || 0,
        { requireEmail: true, liveCatalog, slotSurcharge }
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

      const { windowStartIso, windowEndIso } = getConflictSearchWindow(
        slotDateMs,
        validated.estimatedDurationMinutes
      );

      const [activeConfirmedSnap, activePendingSnap] = await Promise.all([
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
        slotSurcharge,
        previousDurationMinutes,
        previousDuration,
        validated,
      };
    });

    const baseUrl = (process.env.CLIENT_APP_URL || 'https://turnos-web-eb8b5.web.app')
      .trim()
      .replace(/\/+$/, '');
    const webhookUrl = buildTenantWebhookUrl(tenantId);
    const tenantBaseUrl = `${baseUrl}/${encodeURIComponent(tenant.slug)}`;

    logger.info('[createPreference] Creando preferencia en Mercado Pago.', {
      tenantId,
      tenantSlug: tenant.slug,
      slotId,
      durationMinutes: txSummary.validated.estimatedDurationMinutes,
      clientEmail: maskEmail(txSummary.validated.normalizedEmail),
    });

    try {
      const surchargeDescription = txSummary.slotSurcharge
        ? ` · Tarifa especial: ${formatSurchargeValue(txSummary.slotSurcharge)}${
            txSummary.slotSurcharge.reason ? ` (${txSummary.slotSurcharge.reason})` : ''
          }`
        : '';

      const mpPreference = await preferenceClient.create({
        body: {
          items: [
            {
              id: slotId,
              title: `Seña para reserva: ${txSummary.serviceName}`,
              description: `Reserva de turno para el día ${txSummary.slotDatetime}${surchargeDescription}`,
              quantity: 1,
              unit_price: txSummary.depositAmount,
              currency_id: tenant.currency || 'ARS',
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
            success: `${tenantBaseUrl}/payment/success`,
            failure: `${tenantBaseUrl}/payment/failure`,
            pending: `${tenantBaseUrl}/payment/pending`,
          },
          auto_return: 'approved',
          notification_url: webhookUrl || undefined,
          external_reference: `${tenantId}:${slotId}`,
          metadata: {
            tenant_id: tenantId,
            tenant_slug: tenant.slug,
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
      const attemptRef = getTenantPaymentAttemptsCollection(db, tenantId).doc(attemptId);
      const updatedIso = new Date().toISOString();

      await Promise.all([
        slotRef.update({
          preferenceId: mpPreference.id || null,
          updatedAt: updatedIso,
        }),
        attemptRef.set({
          tenantId,
          tenantSlug: tenant.slug,
          slotId,
          preferenceId: mpPreference.id || null,
          lockToken,
          depositAmount: txSummary.depositAmount,
          slotDatetime: txSummary.slotDatetime,
          serviceName: txSummary.serviceName,
          estimatedDurationMinutes: txSummary.validated.estimatedDurationMinutes,
          estimatedDuration: txSummary.validated.estimatedDuration,
          ...(txSummary.slotSurcharge ? { surcharge: txSummary.slotSurcharge } : {}),
          clientData: txSummary.validated.clientDataToSave,
          createdAt: nowIso,
          expiresAt: expiresAtIso,
          // Firestore native TTL field (30 days retention)
          expireAt: Timestamp.fromMillis(nowMs + 30 * 24 * 60 * 60 * 1000),
        }),
      ]);

      return {
        preferenceId: mpPreference.id,
        initPoint: mpPreference.init_point,
        sandboxInitPoint: mpPreference.sandbox_init_point,
      };
    } catch (err: unknown) {
      logger.error('[createPreference] Error al crear preferencia en Mercado Pago.', {
        tenantId,
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
            tenantId,
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
  tenantId: string,
  slotId: string,
  lockToken: string | undefined,
  preferenceId: string | undefined
): Promise<Record<string, unknown> | null> {
  const attemptsCol = getTenantPaymentAttemptsCollection(db, tenantId);

  if (preferenceId) {
    const snap = await attemptsCol.doc(preferenceId).get();
    if (snap.exists) {
      return snap.data() as Record<string, unknown>;
    }
  }
  if (lockToken) {
    const querySnap = await attemptsCol.where('lockToken', '==', lockToken).limit(1).get();
    if (!querySnap.empty) {
      return querySnap.docs[0].data() as Record<string, unknown>;
    }
  }
  // Uses composite index (slotId ASC, createdAt DESC) to deterministically fetch the latest attempt
  const latestSnap = await attemptsCol
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
  tenantId: string,
  paymentId: string | number,
  expectedSlotId?: string
) {
  const validTenantId = validateTenantIdOrThrow(tenantId);
  const pid = String(paymentId);
  const tenant = await getTenantOrThrow(db, validTenantId);

  logger.info('[processPaymentConfirmation] Consultando pago en Mercado Pago.', {
    tenantId: validTenantId,
    paymentId: pid,
  });

  const { paymentClient } = await getTenantMpClients(db, tenant);
  const paymentData = await paymentClient.get({ id: pid });

  if (!paymentData || !paymentData.status) {
    logger.warn('[processPaymentConfirmation] Pago no encontrado en Mercado Pago.', {
      tenantId: validTenantId,
      paymentId: pid,
    });
    return { success: false, status: 'payment_not_found' };
  }

  // Strict webhook-tenant binding invariant: verify metadata.tenant_id & external_reference prefix
  const parsedRef = parsePaymentExternalReference(paymentData.external_reference);
  const metaTenantId =
    typeof paymentData.metadata?.tenant_id === 'string'
      ? paymentData.metadata.tenant_id.trim()
      : undefined;
  const boundTenantId = metaTenantId || parsedRef.tenantId;

  if (
    !boundTenantId ||
    boundTenantId !== validTenantId ||
    (metaTenantId && parsedRef.tenantId && metaTenantId !== parsedRef.tenantId)
  ) {
    logger.error(
      '[processPaymentConfirmation] ALERTA DE SEGURIDAD: tenant_id del pago no coincide con el tenant invocado.',
      {
        expectedTenantId: validTenantId,
        metaTenantId: metaTenantId || null,
        refTenantId: parsedRef.tenantId || null,
        paymentId: pid,
      }
    );
    return { success: false, status: 'tenant_mismatch' };
  }

  const slotId = String(paymentData.metadata?.slot_id || parsedRef.slotId || '').trim();
  if (!slotId) {
    logger.warn('[processPaymentConfirmation] Pago sin slot_id asociado.', {
      tenantId: validTenantId,
      paymentId: pid,
    });
    return { success: false, status: 'missing_slot_id' };
  }

  if (expectedSlotId && expectedSlotId !== slotId) {
    logger.warn('[processPaymentConfirmation] slotId no coincide con external_reference del pago.', {
      tenantId: validTenantId,
      paymentId: pid,
      expectedSlotId,
      actualSlotId: slotId,
    });
    return { success: false, status: 'slot_mismatch' };
  }

  const slotsCol = getTenantSlotsCollection(db, validTenantId);
  const slotRef = slotsCol.doc(slotId);
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
    getOwnerProfileCached(db, validTenantId, Date.now(), {
      name: tenant.name,
      isDemo: tenant.isDemo,
    }),
  ]);

  if (!initialSlotDoc.exists) {
    logger.error('[processPaymentConfirmation] Turno no encontrado en Firestore.', {
      tenantId: validTenantId,
      slotId,
      paymentId: pid,
    });
    return { success: false, status: 'slot_not_found' };
  }

  const initialSlotData = (initialSlotDoc.data() || {}) as Record<string, unknown>;

  if (paymentData.status === 'approved') {
    const expectedCurrency = (tenant.currency || 'ARS').toUpperCase();
    const currencyId = String(paymentData.currency_id || expectedCurrency).toUpperCase();
    const expectedDeposit = Number(initialSlotData.depositAmount) || 0;
    const paidAmount = Number(paymentData.transaction_amount || 0);

    if (currencyId !== expectedCurrency) {
      logger.warn('[processPaymentConfirmation] Moneda inesperada en pago aprobado.', {
        tenantId: validTenantId,
        paymentId: pid,
        slotId,
        currencyId,
        expectedCurrency,
      });
      return { success: false, status: 'invalid_currency', slotId };
    }

    if (expectedDeposit > 0 && paidAmount > 0 && paidAmount + 1 < expectedDeposit) {
      logger.warn('[processPaymentConfirmation] Monto pagado menor a la seña requerida.', {
        tenantId: validTenantId,
        paymentId: pid,
        slotId,
        paidAmount,
        expectedDeposit,
      });
      return { success: false, status: 'insufficient_amount', slotId };
    }

    let attemptSnapshot: Record<string, unknown> | null = null;
    if (!initialSlotData.clientData || initialSlotData.status !== 'pending_payment') {
      attemptSnapshot = await resolveAttemptSnapshot(
        validTenantId,
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
            attempts < 3 &&
            (isRecoverableFailure || isStaleProcessing) &&
            (needClient || needOwner);

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

      if (
        freshData.status === 'cancelled' ||
        freshData.status === 'conflict' ||
        freshData.status === 'past'
      ) {
        return {
          kind: 'late_payment_conflict',
          reason: `slot_status_${String(freshData.status)}`,
          slotData: freshData,
        };
      }

      const snapshotClient =
        attemptSnapshot &&
        typeof attemptSnapshot.clientData === 'object' &&
        attemptSnapshot.clientData
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

      if (!isNaN(slotStartMs) && slotStartMs > 0) {
        const { windowStartIso, windowEndIso } = getConflictSearchWindow(
          slotStartMs,
          effectiveDurationMinutes
        );
        const confirmedWindowSnap = await transaction.get(
          slotsCol
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
      const incidentRef = getTenantPaymentIncidentsCollection(db, validTenantId).doc(pid);
      const incidentExists = (await incidentRef.get()).exists;

      if (!incidentExists) {
        await incidentRef.set({
          tenantId: validTenantId,
          tenantSlug: tenant.slug,
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
          tenantId: validTenantId,
          tenantSlug: tenant.slug,
          timezone: tenant.timezone,
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
          appearance: ownerProfile.appearance,
          adminUrl: (process.env.CLIENT_APP_URL || '').trim(),
        });
      }

      logger.error(
        '[processPaymentConfirmation] Incidente de pago detectado; no se sobrescribió el turno.',
        {
          tenantId: validTenantId,
          kind: txOutcome.kind,
          slotId,
          paymentId: pid,
        }
      );

      return {
        success: false,
        status: txOutcome.kind,
        slotId,
      };
    }

    if (txOutcome.kind === 'already_confirmed_same_payment') {
      const existingClientData = (txOutcome.slotData.clientData || {}) as Record<string, unknown>;
      const bookingDetails = buildBookingEmailPayload({
        tenant,
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

    const bookingDetails = buildBookingEmailPayload({
      tenant,
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
      const slotDatetime =
        typeof txOutcome.slotData.datetime === 'string' ? txOutcome.slotData.datetime : '';
      const slotStartMs = slotDatetime ? new Date(slotDatetime).getTime() : 0;
      if (isNaN(slotStartMs) || slotStartMs <= 0) return;

      const { windowStartIso, windowEndIso } = getConflictSearchWindow(
        slotStartMs,
        txOutcome.effectiveDurationMinutes
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
            ref: slotsCol.doc(c.id),
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
        tenantId: validTenantId,
        slotId,
        error:
          conflictsRes.reason instanceof Error
            ? conflictsRes.reason.message
            : String(conflictsRes.reason),
      });
    }

    if (emailsRes.status === 'rejected') {
      logger.error('[processPaymentConfirmation] Error al despachar/persistir estado de emails.', {
        tenantId: validTenantId,
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
      tenantId: validTenantId,
      slotId,
      paymentId: pid,
      mpStatus: paymentData.status,
    });

    const rejectedEmail = String(
      paymentData.metadata?.client_email || paymentData.payer?.email || ''
    )
      .trim()
      .toLowerCase();

    await db.runTransaction(async (transaction) => {
      const freshDoc = await transaction.get(slotRef);
      if (!freshDoc.exists) return;
      const freshData = (freshDoc.data() || {}) as Record<string, unknown>;

      if (freshData.status !== 'pending_payment') return;

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
          slotsCol
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
      const rawTenantId = typeof query.tenantId === 'string' ? query.tenantId.trim() : '';

      if (!isValidTenantId(rawTenantId)) {
        logger.warn('[mpWebhook] tenantId ausente o inválido en query.', {
          tenantId: rawTenantId || null,
        });
        res.status(400).send({ error: 'Invalid or missing tenantId' });
        return;
      }

      let tenant: TenantDoc;
      try {
        tenant = await getTenantOrThrow(db, rawTenantId);
      } catch (err) {
        if (err instanceof HttpsError && err.code === 'not-found') {
          res.status(404).send({ error: 'Tenant not found' });
          return;
        }
        throw err;
      }

      let creds: { accessToken: string; webhookSecret: string; source: 'tenant' | 'demo_env' };
      try {
        creds = await resolveTenantMpCredentials(db, tenant);
      } catch (err) {
        if (err instanceof HttpsError && err.code === 'failed-precondition') {
          logger.warn('[mpWebhook] Tenant sin credenciales MP configuradas.', {
            tenantId: rawTenantId,
          });
          res.status(400).send({ error: 'Tenant payment credentials not configured' });
          return;
        }
        throw err;
      }

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
        secret: creds.webhookSecret,
      });

      if (!sigResult.enforced) {
        logger.warn('[mpWebhook] Webhook secret no configurado para este tenant; HMAC omitido.', {
          tenantId: rawTenantId,
        });
      } else if (!sigResult.verified) {
        logger.warn('[mpWebhook] Firma HMAC inválida rechazada.', {
          tenantId: rawTenantId,
          reason: sigResult.reason,
          dataId: dataIdForSignature || null,
        });
        res.status(401).send({ error: 'Invalid webhook signature' });
        return;
      }

      if (!rawPaymentId) {
        logger.info('[mpWebhook] Notificación sin paymentId directo.', {
          tenantId: rawTenantId,
        });
        res.status(200).send({ status: 'ignored_no_payment_id', tenantId: rawTenantId });
        return;
      }

      const result = await processPaymentConfirmation(rawTenantId, String(rawPaymentId));
      if (result.status === 'tenant_mismatch') {
        res.status(403).send({
          error: 'Payment tenant mismatch',
          status: 'tenant_mismatch',
        });
        return;
      }

      res.status(200).send({
        received: true,
        tenantId: rawTenantId,
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

const toPublicBookingDetails = (details: BookingEmailPayload) => ({
  slotId: details.slotId,
  paymentId: details.paymentId,
  serviceName: details.serviceName,
  datetime: details.datetime,
  formattedDate: details.formattedDate,
  formattedTime: details.formattedTime,
  depositAmount: details.depositAmount,
  basePrice: details.basePrice,
  extrasPrice: details.extrasPrice,
  ...(details.surchargeType ? { surchargeType: details.surchargeType } : {}),
  ...(details.surchargeValue !== undefined ? { surchargeValue: details.surchargeValue } : {}),
  ...(details.surchargeAmount !== undefined ? { surchargeAmount: details.surchargeAmount } : {}),
  ...(details.surchargeReason ? { surchargeReason: details.surchargeReason } : {}),
  estimatedPrice: details.estimatedPrice,
  estimatedDurationMinutes: details.estimatedDurationMinutes,
  estimatedDuration: details.estimatedDuration,
  businessName: details.businessName,
  clientName: details.clientName,
  maskedClientEmail: maskEmail(details.clientEmail),
});

export const verifyPayment = onCall<{ tenantId: string; paymentId?: string; slotId?: string }>(
  {
    cors: true,
    maxInstances: 10,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const tenantId = validateTenantIdOrThrow(request.data?.tenantId);
    const { paymentId, slotId } = request.data || {};
    const cleanPaymentId = typeof paymentId === 'string' ? paymentId.trim() : '';
    const cleanSlotId = typeof slotId === 'string' ? slotId.trim() : undefined;

    if (!cleanPaymentId) {
      throw new HttpsError(
        'invalid-argument',
        'Se requiere paymentId válido para verificar el pago.'
      );
    }

    // Fast-path: if mpWebhook already confirmed this slot + sent emails, avoid redundant MP API & transaction
    if (cleanSlotId) {
      const slotSnap = await getTenantSlotsCollection(db, tenantId).doc(cleanSlotId).get();
      if (slotSnap.exists) {
        const slotData = (slotSnap.data() || {}) as Record<string, unknown>;
        if (
          slotData.status === 'confirmed' &&
          String(slotData.paymentId || '') === cleanPaymentId &&
          slotData.emailStatus === 'sent'
        ) {
          const tenant = await getTenantOrThrow(db, tenantId);
          const ownerProfile = await getOwnerProfileCached(db, tenantId, Date.now(), {
            name: tenant.name,
            isDemo: tenant.isDemo,
          });
          const existingClientData = (slotData.clientData || {}) as Record<string, unknown>;
          const details = buildBookingEmailPayload({
            tenant,
            slotId: cleanSlotId,
            paymentId: cleanPaymentId,
            slotData,
            clientData: existingClientData,
            paidAmount: Number(slotData.paidAmount || slotData.depositAmount || 0),
            fallbackClientEmail: String(existingClientData.email || ''),
            fallbackClientName: String(existingClientData.name || 'Cliente'),
            ownerProfile,
          });

          return {
            success: true,
            status: 'confirmed',
            slotId: cleanSlotId,
            bookingDetails: toPublicBookingDetails(details),
          };
        }
      }
    }

    const result = await processPaymentConfirmation(tenantId, cleanPaymentId, cleanSlotId);
    if (!result.bookingDetails) {
      return {
        success: result.success,
        status: result.status,
        slotId: result.slotId,
      };
    }

    return {
      success: result.success,
      status: result.status,
      slotId: result.slotId,
      bookingDetails: toPublicBookingDetails(result.bookingDetails),
    };
  }
);

export const syncPublicSlot = onDocumentWritten(
  {
    document: 'tenants/{tenantId}/slots/{slotId}',
    maxInstances: 20,
    memory: '256MiB',
  },
  async (event) => {
    const tenantId = event.params.tenantId;
    const slotId = event.params.slotId;
    if (!isValidTenantId(tenantId)) {
      logger.warn('[syncPublicSlot] tenantId inválido omitido.', { tenantId, slotId });
      return;
    }

    const beforeData = event.data?.before.exists
      ? (event.data.before.data() as Record<string, unknown>)
      : null;
    const afterData = event.data?.after.exists
      ? (event.data.after.data() as Record<string, unknown>)
      : null;

    await syncPublicSlotDocument(db, tenantId, slotId, beforeData, afterData, {
      createSlotFieldPath: (id) => new FieldPath('slots', id),
      deleteFieldValue: () => FieldValue.delete(),
    });
  }
);

export const adminCreateSlots = onCall<{ tenantId: string; slots: AdminNewSlotInput[] }>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    const tenantId = validateTenantIdOrThrow(request.data?.tenantId);
    await assertTenantRole(request, db, tenantId, ['owner', 'staff']);
    const slots = request.data?.slots;
    if (!Array.isArray(slots) || slots.length === 0) {
      throw new HttpsError('invalid-argument', 'Se requiere al menos un turno para crear.');
    }
    const createdIds = await adminCreateSlotsCore(db, tenantId, slots);
    return { createdIds };
  }
);

export const adminAssignSlot = onCall<{
  tenantId: string;
  slotId: string;
  clientData: ClientPayload;
}>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const tenantId = validateTenantIdOrThrow(request.data?.tenantId);
    await assertTenantRole(request, db, tenantId, ['owner', 'staff']);
    await adminAssignSlotCore(db, tenantId, request.data?.slotId, request.data?.clientData);
    return { success: true };
  }
);

export const adminCancelSlot = onCall<{ tenantId: string; slotId: string }>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const tenantId = validateTenantIdOrThrow(request.data?.tenantId);
    await assertTenantRole(request, db, tenantId, ['owner', 'staff']);
    await adminCancelSlotCore(db, tenantId, request.data?.slotId);
    return { success: true };
  }
);

export const adminReleaseSlot = onCall<{ tenantId: string; slotId: string }>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const tenantId = validateTenantIdOrThrow(request.data?.tenantId);
    await assertTenantRole(request, db, tenantId, ['owner', 'staff']);
    return adminReleaseSlotCore(db, tenantId, request.data?.slotId);
  }
);

export const adminDeleteSlot = onCall<{ tenantId: string; slotId: string }>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const tenantId = validateTenantIdOrThrow(request.data?.tenantId);
    await assertTenantRole(request, db, tenantId, ['owner', 'staff']);
    await adminDeleteSlotCore(db, tenantId, request.data?.slotId);
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
