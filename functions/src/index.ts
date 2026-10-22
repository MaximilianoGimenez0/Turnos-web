import * as admin from 'firebase-admin';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { preference, payment } from './mercadoPago';
import { cleanupAllExpiredAndPastSlots } from './cronJobs';
import {
  findConflictingActiveSlots,
  calculateConflictingAvailableSlots,
  calculateSlotsToReactivate,
  SlotDocData,
} from './scheduling';
import { sendBookingConfirmationEmails } from './emailService';

admin.initializeApp();
const db = admin.firestore();

interface PriceExtra {
  id: string;
  name: string;
  price: number;
}

interface BookedServiceExtra {
  id: string;
  name: string;
  price: number;
  selected: boolean;
}

interface BookedServiceItem {
  serviceId: string;
  name: string;
  basePrice: number;
  durationMinutes: number;
  extras: BookedServiceExtra[];
}

interface ClientPayload {
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  bookedServices?: BookedServiceItem[];
  selectedRules?: string[];
  selectedService?: string;
  selectedServices?: string[];
  basePrice?: number;
  selectedExtras?: PriceExtra[];
  extrasPrice?: number;
  estimatedDurationMinutes?: number;
  estimatedDuration?: string;
  estimatedPrice?: number;
}

interface CreatePreferenceData {
  slotId: string;
  clientData: ClientPayload;
}

function getWebhookUrl(): string {
  // Fall back to runtime GCP project ID if the default placeholder URL is unchanged
  const envUrl = process.env.MP_WEBHOOK_URL;
  if (envUrl && !envUrl.includes('tu-proyecto-id')) {
    return envUrl;
  }
  const projectId = process.env.GCLOUD_PROJECT || 'turnos-web-eb8b5';
  return `https://us-central1-${projectId}.cloudfunctions.net/mpWebhook`;
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

  if (!slotId || !clientData?.name || !clientData?.email) {
    throw new HttpsError(
      'invalid-argument',
      'Los datos del turno y del cliente (nombre, email) son obligatorios.'
    );
  }

  const slotRef = db.collection('slots').doc(slotId);
  const now = new Date();
  const nowMs = now.getTime();
  const expiresAtDate = new Date(nowMs + 15 * 60 * 1000);
  const expiresAtIso = expiresAtDate.toISOString();

  const selectedRules = clientData.selectedRules || [];
  const estimatedDurationMinutes = Number(clientData.estimatedDurationMinutes ?? 0);
  const estimatedDuration =
    clientData.estimatedDuration ||
    (estimatedDurationMinutes > 0 ? `${estimatedDurationMinutes} min` : '');

  const clientDataToSave: Record<string, unknown> = {
    name: clientData.name || '',
    email: clientData.email || '',
    phone: clientData.phone || '',
    notes: clientData.notes || '',
    selectedRules,
    estimatedDurationMinutes,
    estimatedDuration,
  };

  if (Array.isArray(clientData.bookedServices)) {
    clientDataToSave.bookedServices = clientData.bookedServices;
  }
  if (clientData.selectedService) {
    clientDataToSave.selectedService = clientData.selectedService;
  }
  if (Array.isArray(clientData.selectedServices)) {
    clientDataToSave.selectedServices = clientData.selectedServices;
  }
  if (typeof clientData.basePrice === 'number') {
    clientDataToSave.basePrice = clientData.basePrice;
  }
  if (Array.isArray(clientData.selectedExtras)) {
    clientDataToSave.selectedExtras = clientData.selectedExtras;
  }
  if (typeof clientData.extrasPrice === 'number') {
    clientDataToSave.extrasPrice = clientData.extrasPrice;
  }
  if (typeof clientData.estimatedPrice === 'number') {
    clientDataToSave.estimatedPrice = clientData.estimatedPrice;
  }

  let depositAmount = 5000;
  let serviceName = 'Turno / Consulta';
  let slotDatetime = '';

  await db.runTransaction(async (transaction) => {
    const slotDoc = await transaction.get(slotRef);

    if (!slotDoc.exists) {
      throw new HttpsError('not-found', 'El turno seleccionado no existe en el sistema.');
    }

    const slotData = slotDoc.data();
    depositAmount = Number(slotData?.depositAmount) || 5000;
    serviceName = slotData?.serviceName || 'Turno / Consulta';
    slotDatetime = slotData?.datetime || '';

    if (slotData?.status === 'confirmed') {
      throw new HttpsError(
        'failed-precondition',
        'Este turno ya ha sido reservado y confirmado previamente.'
      );
    }

    // Minimum anticipation matches the 15-minute reservation lock to prevent booking immediate or past slots
    const slotDateMs = slotData?.datetime ? new Date(slotData.datetime).getTime() : 0;
    const MIN_BOOKING_ANTICIPATION_MS = 15 * 60 * 1000;
    if (slotDateMs <= nowMs + MIN_BOOKING_ANTICIPATION_MS) {
      throw new HttpsError(
        'failed-precondition',
        'Este turno ya no se encuentra disponible para reserva porque faltan menos de 15 minutos para su horario o ya ha transcurrido.'
      );
    }

    if (slotData?.status === 'pending_payment' && slotData.expiresAt) {
      const expiresMs = new Date(slotData.expiresAt).getTime();
      if (nowMs < expiresMs && slotData.clientData?.email !== clientData.email) {
        throw new HttpsError(
          'resource-exhausted',
          'El turno se encuentra actualmente en proceso de pago por otro usuario. Intenta nuevamente en unos minutos.'
        );
      }
    }

    const activeConfirmedSnap = await transaction.get(
      db.collection('slots')
        .where('status', '==', 'confirmed')
        .where('datetime', '>=', now.toISOString())
    );

    const activePendingSnap = await transaction.get(
      db.collection('slots').where('status', '==', 'pending_payment')
    );

    const activeSlots: SlotDocData[] = [
      ...activeConfirmedSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      ...activePendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    ];

    const conflictingSlots = findConflictingActiveSlots(
      {
        id: slotId,
        datetime: slotData?.datetime,
        estimatedDurationMinutes,
        clientData: { ...clientData, estimatedDurationMinutes },
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

    transaction.update(slotRef, {
      status: 'pending_payment',
      estimatedDurationMinutes,
      estimatedDuration,
      clientData: clientDataToSave,
      expiresAt: expiresAtIso,
      updatedAt: now.toISOString(),
    });
  });

  const baseUrl = process.env.CLIENT_APP_URL || 'https://turnos-web-eb8b5.web.app';
  const webhookUrl = getWebhookUrl();

  console.log(`[createPreference] Configurando preferencia con notification_url: ${webhookUrl}`);

  try {
    const mpPreference = await preference.create({
      body: {
        items: [
          {
            id: slotId,
            title: `Seña para reserva: ${serviceName}`,
            description: `Reserva de turno para el día ${slotDatetime}`,
            quantity: 1,
            unit_price: depositAmount,
            currency_id: 'ARS',
          },
        ],
        payer: {
          name: clientData.name,
          email: clientData.email,
          phone: {
            number: clientData.phone || '',
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
          client_name: clientData.name,
          client_email: clientData.email,
          client_phone: clientData.phone || '',
        },
        expires: true,
        expiration_date_from: now.toISOString(),
        expiration_date_to: expiresAtDate.toISOString(),
      },
    });

    await slotRef.update({
      preferenceId: mpPreference.id,
      updatedAt: new Date().toISOString(),
    });

    return {
      preferenceId: mpPreference.id,
      initPoint: mpPreference.init_point,
      sandboxInitPoint: mpPreference.sandbox_init_point,
    };
  } catch (err: unknown) {
    console.error('[createPreference] Error al interactuar con Mercado Pago:', err);
    // Revert slot lock when preference creation fails
    await slotRef.update({
      status: 'available',
      clientData: null,
      expiresAt: null,
      updatedAt: new Date().toISOString(),
    }).catch(revertErr => {
      console.error('[createPreference] Error crítico al revertir bloqueo de turno:', revertErr);
    });

    const errorMsg =
      err instanceof Error ? err.message : 'Error al generar la preferencia de Mercado Pago';
    throw new HttpsError('internal', errorMsg);
  }
});

export async function processPaymentConfirmation(paymentId: string | number) {
  console.log(`[processPaymentConfirmation] Consultando estado del pago ID: ${paymentId} en Mercado Pago...`);

  const paymentData = await payment.get({ id: String(paymentId) });

  if (!paymentData || !paymentData.status) {
    console.warn(`[processPaymentConfirmation] No se pudo recuperar la información del pago ${paymentId}`);
    return { success: false, status: 'payment_not_found' };
  }

  const slotId = paymentData.metadata?.slot_id || paymentData.external_reference;

  if (!slotId) {
    console.warn(`[processPaymentConfirmation] El pago ${paymentId} no tiene asociado un slot_id.`);
    return { success: false, status: 'missing_slot_id' };
  }

  const slotRef = db.collection('slots').doc(slotId);
  const slotDoc = await slotRef.get();

  if (!slotDoc.exists) {
    console.error(`[processPaymentConfirmation] Turno ${slotId} no encontrado en Firestore.`);
    return { success: false, status: 'slot_not_found' };
  }

  const slotData = slotDoc.data();

  if (paymentData.status === 'approved') {
    console.log(`[processPaymentConfirmation] Pago APROBADO para el turno ${slotId}! Confirmando...`);

    const clientEmail =
      paymentData.metadata?.client_email ||
      paymentData.payer?.email ||
      slotData?.clientData?.email ||
      '';

    const clientName =
      paymentData.metadata?.client_name ||
      paymentData.payer?.first_name ||
      slotData?.clientData?.name ||
      'Cliente';

    const slotDate = new Date(slotData?.datetime || new Date().toISOString());
    const formattedDate = slotDate.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const formattedTime = slotDate.toLocaleTimeString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const selectedRules = slotData?.clientData?.selectedRules || [];
    const estimatedDurationMinutes =
      slotData?.clientData?.estimatedDurationMinutes || slotData?.estimatedDurationMinutes || 0;
    const estimatedDuration =
      slotData?.clientData?.estimatedDuration ||
      slotData?.estimatedDuration ||
      (estimatedDurationMinutes > 0 ? `${estimatedDurationMinutes} min` : '');

    const bookingDetails = {
      slotId,
      paymentId: String(paymentId),
      serviceName: slotData?.serviceName || 'Turno / Consulta',
      datetime: slotData?.datetime || new Date().toISOString(),
      formattedDate,
      formattedTime,
      depositAmount: Number(paymentData.transaction_amount || slotData?.depositAmount || 0),
      clientName,
      clientEmail,
      clientPhone: slotData?.clientData?.phone || '',
      clientNotes: slotData?.clientData?.notes || '',
      bookedServices: slotData?.clientData?.bookedServices || [],
      selectedServices: slotData?.clientData?.selectedServices || [],
      selectedRules,
      selectedExtras: slotData?.clientData?.selectedExtras || [],
      basePrice: slotData?.clientData?.basePrice || 0,
      extrasPrice: slotData?.clientData?.extrasPrice || 0,
      estimatedPrice: slotData?.clientData?.estimatedPrice || 0,
      estimatedDurationMinutes,
      estimatedDuration,
      ownerEmail: process.env.BUSINESS_EMAIL || process.env.OWNER_EMAIL || 'maxxi02gimenez@gmail.com',
    };

    // Mutually exclusive transaction prevents duplicate confirmations and emails across webhook and frontend return
    let isFirstConfirmation = false;

    await db.runTransaction(async (transaction) => {
      const freshSlotDoc = await transaction.get(slotRef);
      if (!freshSlotDoc.exists) return;
      const freshSlotData = freshSlotDoc.data();

      if (
        freshSlotData?.status === 'confirmed' ||
        freshSlotData?.emailSent ||
        freshSlotData?.emailStatus === 'processing'
      ) {
        return;
      }

      transaction.update(slotRef, {
        status: 'confirmed',
        paymentId: String(paymentId),
        paidAmount: paymentData.transaction_amount || freshSlotData?.depositAmount,
        paymentStatus: paymentData.status,
        expiresAt: null,
        confirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailStatus: 'processing',
        emailSent: true,
      });

      isFirstConfirmation = true;
    });

    if (!isFirstConfirmation) {
      console.log(`[processPaymentConfirmation] Turno ${slotId} ya confirmado o en procesamiento por otro hilo. Retorno idempotente sin duplicar correos.`);
      return {
        success: true,
        status: 'confirmed',
        bookingDetails,
      };
    }

    const availableSnap = await db
      .collection('slots')
      .where('status', '==', 'available')
      .get();
    const pendingSnap = await db
      .collection('slots')
      .where('status', '==', 'pending_payment')
      .get();

    const candidateSlots: SlotDocData[] = [
      ...availableSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      ...pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    ];

    const confirmedSlotObj = {
      id: slotId,
      datetime: slotData?.datetime,
      estimatedDurationMinutes,
    };
    const conflictingSlots = calculateConflictingAvailableSlots(confirmedSlotObj, candidateSlots);

    if (conflictingSlots.length > 0) {
      const conflictBatch = db.batch();
      for (const conflict of conflictingSlots) {
        if (conflict.id) {
          const conflictRef = db.collection('slots').doc(conflict.id);
          conflictBatch.update(conflictRef, {
            status: 'conflict',
            updatedAt: new Date().toISOString(),
          });
        }
      }
      await conflictBatch.commit();
    }

    try {
      console.log(`[processPaymentConfirmation] Despachando correos de confirmación para turno ${slotId} vía Resend...`);
      const emailResult = await sendBookingConfirmationEmails(bookingDetails);
      await slotRef.update({
        emailStatus: 'sent',
        emailSentAt: new Date().toISOString(),
        emailResult: {
          clientSent: emailResult.clientSent,
          ownerSent: emailResult.ownerSent,
          clientError: emailResult.clientError || null,
          ownerError: emailResult.ownerError || null,
        },
      });
    } catch (emailErr) {
      console.error('[processPaymentConfirmation] Error no bloqueante al enviar emails vía Resend:', emailErr);
    }

    return {
      success: true,
      status: 'confirmed',
      bookingDetails,
    };
  } else if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
    console.log(
      `[processPaymentConfirmation] Pago RECHAZADO o CANCELADO (${paymentData.status}) para el turno ${slotId}`
    );
    if (slotData?.status === 'pending_payment') {
      const allSlotsSnapshot = await db.collection('slots').get();
      const allSlots: SlotDocData[] = allSlotsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      const batch = db.batch();

      const remainingConfirmed = allSlots.filter((s) => s.id !== slotId && s.status === 'confirmed');
      const conflictingWithOther = findConflictingActiveSlots(
        { id: slotId, datetime: slotData?.datetime, estimatedDurationMinutes: slotData?.estimatedDurationMinutes || 0 },
        remainingConfirmed,
        Date.now()
      );
      const newStatus = conflictingWithOther.length > 0 ? 'conflict' : 'available';

      batch.update(slotRef, {
        status: newStatus,
        clientData: null,
        estimatedDurationMinutes: 0,
        estimatedDuration: '',
        expiresAt: null,
        updatedAt: new Date().toISOString(),
      });

      const slotsToReactivate = calculateSlotsToReactivate(
        { id: slotId, datetime: slotData?.datetime, estimatedDurationMinutes: slotData?.estimatedDurationMinutes || 0 },
        allSlots
      );

      for (const reactivated of slotsToReactivate) {
        if (reactivated.id) {
          const reactivatedRef = db.collection('slots').doc(reactivated.id);
          batch.update(reactivatedRef, {
            status: 'available',
            clientData: null,
            estimatedDurationMinutes: 0,
            estimatedDuration: '',
            expiresAt: null,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      await batch.commit();
    }
    return { success: false, status: paymentData.status, slotId };
  }

  return { success: false, status: paymentData.status || 'unknown' };
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
    console.log('[mpWebhook] Notificación recibida:', { query, body });

    // Extract payment ID across heterogeneous Mercado Pago IPN and webhook payload formats
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

    if (!rawPaymentId) {
      console.log('[mpWebhook] Notificación sin ID de pago directo. Respondiendo 200 OK.');
      res.status(200).send({ status: 'ignored_no_payment_id' });
      return;
    }

    const result = await processPaymentConfirmation(String(rawPaymentId));
    res.status(200).send(result);
  } catch (error: unknown) {
    console.error('[mpWebhook] Error procesando webhook:', error);
    res.status(500).send({
      error: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
});

export const verifyPayment = onCall<{ paymentId?: string; slotId?: string }>(
  {
    cors: true,
    maxInstances: 10,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
  const { paymentId, slotId } = request.data || {};

  if (!paymentId && !slotId) {
    throw new HttpsError('invalid-argument', 'Se requiere paymentId o slotId.');
  }

  let pid = paymentId;
  if (!pid && slotId) {
    const slotDoc = await db.collection('slots').doc(slotId).get();
    if (slotDoc.exists) {
      pid = slotDoc.data()?.paymentId;
    }
  }

  if (!pid) {
    throw new HttpsError('not-found', 'No se encontró el ID de pago a verificar.');
  }

  const result = await processPaymentConfirmation(pid);
  return result;
});

export const releaseExpiredSlots = onSchedule(
  {
    schedule: 'every 30 minutes',
    maxInstances: 1,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async () => {
  try {
    const summary = await cleanupAllExpiredAndPastSlots(db);
    console.log(
      `[releaseExpiredSlots] Tarea completada exitosamente. Liberados: ${summary.releasedCount}, Eliminados expirados: ${summary.deletedExpiredCount}, Eliminados pasados disponibles: ${summary.deletedPastAvailableCount}, Concluidos pasados: ${summary.markedPastConfirmedCount}, Cancelados pasados: ${summary.markedPastCancelledCount}`
    );
  } catch (error) {
    console.error('[releaseExpiredSlots] Error al ejecutar cron de limpieza de turnos:', error);
  }
});
