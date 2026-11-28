import { randomBytes } from 'crypto';
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { isValidEmail } from './bookingValidation';
import { sendOnboardingRequestEmails } from './emailService';
import { getPlatformSuperAdminEmail, type PlatformAuthListClient } from './platformConfig';
import { assertPlatformAdmin } from './tenantContext';

export const ONBOARDING_REQUESTS_COLLECTION = 'onboarding_requests';
export const ONBOARDING_REQUEST_STATUSES = [
  'pending',
  'contacted',
  'cancelled',
  'approved',
] as const;
export type OnboardingRequestStatus = (typeof ONBOARDING_REQUEST_STATUSES)[number];
export type OnboardingRequestEmailStatus = 'sent' | 'partial' | 'failed' | 'skipped';

export const RATE_LIMIT_WINDOW_MS = 3 * 60 * 1000;

export const ONBOARDING_FIELD_LIMITS = {
  nameMin: 2,
  nameMax: 80,
  emailMax: 120,
  phoneMin: 6,
  phoneMax: 25,
  phoneMinDigits: 6,
  notesMax: 500,
} as const;

const REQUEST_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]{3,63}$/;
const PHONE_CHAR_REGEX = /^[+]?[\d\s\-()]+$/;

export interface SubmitOnboardingRequestPayload {
  name: string;
  email: string;
  phone: string;
  notes?: string;
  website?: string;
}

export interface SubmitOnboardingRequestResult {
  requestId: string;
  status: OnboardingRequestStatus;
  createdAt: string;
  clientEmailSent: boolean;
}

export interface UpdateOnboardingRequestStatusPayload {
  requestId: string;
  status: OnboardingRequestStatus;
}

export interface UpdateOnboardingRequestStatusResult {
  success: true;
  requestId: string;
  status: OnboardingRequestStatus;
  updatedAt: string;
}

export type ValidateOnboardingPayloadResult =
  | {
      valid: true;
      honeypotTriggered: true;
    }
  | {
      valid: true;
      honeypotTriggered: false;
      data: {
        name: string;
        email: string;
        phone: string;
        notes: string;
      };
    }
  | {
      valid: false;
      error: string;
    };

const stripSingleLineControl = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return (
    value
      // eslint-disable-next-line no-control-regex
      .replace(/[\r\n\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
};

const stripMultiLineControl = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return (
    value
      .replace(/\r\n?/g, '\n')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
      .trim()
  );
};

export const validateOnboardingRequestPayload = (
  payload: unknown
): ValidateOnboardingPayloadResult => {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Los datos de la solicitud son obligatorios.' };
  }

  const raw = payload as Record<string, unknown>;
  const honeypot = typeof raw.website === 'string' ? raw.website.trim() : '';
  if (honeypot.length > 0) {
    return { valid: true, honeypotTriggered: true };
  }

  const name = stripSingleLineControl(raw.name);
  if (name.length < ONBOARDING_FIELD_LIMITS.nameMin || name.length > ONBOARDING_FIELD_LIMITS.nameMax) {
    return {
      valid: false,
      error: 'El nombre debe tener entre 2 y 80 caracteres.',
    };
  }

  const email = stripSingleLineControl(raw.email).toLowerCase();
  if (!email || email.length > ONBOARDING_FIELD_LIMITS.emailMax || !isValidEmail(email)) {
    return {
      valid: false,
      error: 'Ingresá un correo electrónico válido.',
    };
  }

  const phone = stripSingleLineControl(raw.phone);
  const phoneDigits = phone.replace(/\D/g, '');
  if (
    phone.length < ONBOARDING_FIELD_LIMITS.phoneMin ||
    phone.length > ONBOARDING_FIELD_LIMITS.phoneMax ||
    phoneDigits.length < ONBOARDING_FIELD_LIMITS.phoneMinDigits ||
    phoneDigits.length > 18 ||
    !PHONE_CHAR_REGEX.test(phone)
  ) {
    return {
      valid: false,
      error: 'Ingresá un teléfono válido (entre 6 y 25 caracteres, al menos 6 dígitos).',
    };
  }

  const notes = stripMultiLineControl(raw.notes);
  if (notes.length > ONBOARDING_FIELD_LIMITS.notesMax) {
    return {
      valid: false,
      error: 'La nota extra no puede superar los 500 caracteres.',
    };
  }

  return {
    valid: true,
    honeypotTriggered: false,
    data: { name, email, phone, notes },
  };
};

export const submitOnboardingRequestCore = async (
  db: admin.firestore.Firestore,
  authClient: PlatformAuthListClient | undefined,
  payload: SubmitOnboardingRequestPayload,
  nowMs = Date.now()
): Promise<SubmitOnboardingRequestResult> => {
  const validation = validateOnboardingRequestPayload(payload);
  if (!validation.valid) {
    throw new HttpsError('invalid-argument', validation.error);
  }

  const nowIso = new Date(nowMs).toISOString();
  if (validation.honeypotTriggered) {
    return {
      requestId: 'req_ignored',
      status: 'pending',
      createdAt: nowIso,
      clientEmailSent: false,
    };
  }

  const { name, email, phone, notes } = validation.data;
  const requestsCol = db.collection(ONBOARDING_REQUESTS_COLLECTION);
  const cutoffIso = new Date(nowMs - RATE_LIMIT_WINDOW_MS).toISOString();

  const recentSnap = await requestsCol
    .where('email', '==', email)
    .where('createdAt', '>=', cutoffIso)
    .limit(1)
    .get();

  if (!recentSnap.empty) {
    throw new HttpsError(
      'resource-exhausted',
      'Ya recibimos una solicitud reciente con este correo. Esperá unos minutos antes de volver a intentarlo.'
    );
  }

  const requestId = `req_${randomBytes(6).toString('hex')}`;
  const docRef = requestsCol.doc(requestId);

  await docRef.set({
    id: requestId,
    name,
    email,
    phone,
    notes,
    status: 'pending' as OnboardingRequestStatus,
    source: 'landing',
    emailStatus: 'skipped' as OnboardingRequestEmailStatus,
    clientEmailSent: false,
    adminEmailSent: false,
    createdAt: nowIso,
    updatedAt: nowIso,
    statusUpdatedAt: null,
    statusUpdatedByUid: null,
    statusUpdatedByEmail: null,
  });

  const superadminEmail = await getPlatformSuperAdminEmail(db, authClient, nowMs);
  const appUrl = (process.env.CLIENT_APP_URL || 'https://turneado.app').trim();

  const emailRes = await sendOnboardingRequestEmails({
    requestId,
    name,
    email,
    phone,
    notes,
    createdAt: nowIso,
    superadminEmail,
    appUrl,
  });

  let emailStatus: OnboardingRequestEmailStatus = 'skipped';
  if (emailRes.clientAttempted || emailRes.adminAttempted) {
    const clientOk = !emailRes.clientAttempted || emailRes.clientSent;
    const adminOk = !emailRes.adminAttempted || emailRes.adminSent;
    const anySent = emailRes.clientSent || emailRes.adminSent;

    if (clientOk && adminOk && anySent) {
      emailStatus = 'sent';
    } else if (anySent) {
      emailStatus = 'partial';
    } else {
      emailStatus = 'failed';
    }
  }

  await docRef
    .update({
      emailStatus,
      clientEmailSent: emailRes.clientSent,
      adminEmailSent: emailRes.adminSent,
      updatedAt: new Date().toISOString(),
    })
    .catch((err) => {
      logger.warn('[onboardingRequests] No se pudo actualizar estado de emails.', {
        requestId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

  return {
    requestId,
    status: 'pending',
    createdAt: nowIso,
    clientEmailSent: emailRes.clientSent,
  };
};

export const superadminUpdateOnboardingRequestStatusCore = async (
  db: admin.firestore.Firestore,
  actor: { uid: string; email?: string },
  payload: UpdateOnboardingRequestStatusPayload,
  nowMs = Date.now()
): Promise<UpdateOnboardingRequestStatusResult> => {
  const requestId = typeof payload?.requestId === 'string' ? payload.requestId.trim() : '';
  if (!REQUEST_ID_REGEX.test(requestId)) {
    throw new HttpsError('invalid-argument', 'El identificador de solicitud es inválido.');
  }

  const nextStatus = payload?.status;
  if (!ONBOARDING_REQUEST_STATUSES.includes(nextStatus)) {
    throw new HttpsError('invalid-argument', 'El estado de solicitud especificado es inválido.');
  }

  const docRef = db.collection(ONBOARDING_REQUESTS_COLLECTION).doc(requestId);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'La solicitud indicada no existe.');
  }

  const nowIso = new Date(nowMs).toISOString();
  await docRef.update({
    status: nextStatus,
    updatedAt: nowIso,
    statusUpdatedAt: nowIso,
    statusUpdatedByUid: actor.uid,
    statusUpdatedByEmail: actor.email || null,
  });

  return {
    success: true,
    requestId,
    status: nextStatus,
    updatedAt: nowIso,
  };
};

export const submitOnboardingRequest = onCall<SubmitOnboardingRequestPayload>(
  {
    cors: true,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    return submitOnboardingRequestCore(admin.firestore(), admin.auth(), request.data);
  }
);

export const superadminUpdateOnboardingRequestStatus =
  onCall<UpdateOnboardingRequestStatusPayload>(
    {
      cors: true,
      maxInstances: 5,
      memory: '256MiB',
      timeoutSeconds: 30,
    },
    async (request) => {
      const actor = assertPlatformAdmin(request);
      return superadminUpdateOnboardingRequestStatusCore(admin.firestore(), actor, request.data);
    }
  );
