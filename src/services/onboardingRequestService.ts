import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { FIELD_LIMITS } from '../config/fieldLimits';
import { db, functions } from './firebaseConfig';
import { validateEmail, validatePhone, validateRequiredText } from '../utils/validators';
import type {
  OnboardingRequestDoc,
  OnboardingRequestEmailStatus,
  OnboardingRequestStatus,
  SubmitOnboardingRequestPayload,
  SubmitOnboardingRequestResponse,
  SuperAdminUpdateOnboardingRequestStatusPayload,
  SuperAdminUpdateOnboardingRequestStatusResponse,
} from '../types';

export type OnboardingRequestField = 'name' | 'email' | 'phone' | 'notes';
export type OnboardingRequestFilterStatus = 'all' | OnboardingRequestStatus;

export interface OnboardingRequestValidationResult {
  isValid: boolean;
  errors: Partial<Record<OnboardingRequestField, string>>;
}

export interface OnboardingRequestMetrics {
  total: number;
  pending: number;
  contacted: number;
  approved: number;
  cancelled: number;
}

const VALID_STATUSES: readonly OnboardingRequestStatus[] = [
  'pending',
  'contacted',
  'cancelled',
  'approved',
];

const VALID_EMAIL_STATUSES: readonly OnboardingRequestEmailStatus[] = [
  'sent',
  'partial',
  'failed',
  'skipped',
];

const sanitizeSingleLineInput = (value: string): string =>
  String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\r\n\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const sanitizeNotesInput = (value: string): string =>
  String(value ?? '')
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .trim();

export const validateOnboardingRequestInput = (
  input: SubmitOnboardingRequestPayload
): OnboardingRequestValidationResult => {
  const errors: Partial<Record<OnboardingRequestField, string>> = {};
  const limits = FIELD_LIMITS.onboardingRequest;

  const cleanName = sanitizeSingleLineInput(input.name);
  const nameResult = validateRequiredText(cleanName, 'El nombre', limits.name.min, limits.name.max);
  if (!nameResult.isValid) {
    errors.name = nameResult.error;
  }

  const cleanEmail = sanitizeSingleLineInput(input.email).toLowerCase();
  const emailResult = validateEmail(cleanEmail, true, limits.email.max);
  if (!emailResult.isValid) {
    errors.email = emailResult.error;
  }

  const cleanPhone = sanitizeSingleLineInput(input.phone);
  if (cleanPhone.length > 0 && cleanPhone.length < limits.phone.min) {
    errors.phone = `El teléfono debe tener al menos ${limits.phone.min} caracteres.`;
  } else {
    const phoneResult = validatePhone(cleanPhone, true, limits.phone.max);
    if (!phoneResult.isValid) {
      errors.phone = phoneResult.error;
    }
  }

  const cleanNotes = sanitizeNotesInput(input.notes ?? '');
  if (cleanNotes.length > limits.notes.max) {
    errors.notes = `La nota extra no puede superar los ${limits.notes.max} caracteres.`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const normalizeOnboardingRequestDoc = (
  id: string,
  raw: Record<string, unknown>
): OnboardingRequestDoc => {
  const rawStatus = raw.status as OnboardingRequestStatus;
  const status: OnboardingRequestStatus = VALID_STATUSES.includes(rawStatus)
    ? rawStatus
    : 'pending';

  const rawEmailStatus = raw.emailStatus as OnboardingRequestEmailStatus;
  const emailStatus: OnboardingRequestEmailStatus = VALID_EMAIL_STATUSES.includes(rawEmailStatus)
    ? rawEmailStatus
    : 'skipped';

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : id,
    name: typeof raw.name === 'string' ? raw.name.trim() : '',
    email: typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '',
    phone: typeof raw.phone === 'string' ? raw.phone.trim() : '',
    notes: typeof raw.notes === 'string' ? raw.notes.trim() : '',
    status,
    source: 'landing',
    emailStatus,
    clientEmailSent: raw.clientEmailSent === true,
    adminEmailSent: raw.adminEmailSent === true,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
    statusUpdatedAt: typeof raw.statusUpdatedAt === 'string' ? raw.statusUpdatedAt : null,
    statusUpdatedByUid: typeof raw.statusUpdatedByUid === 'string' ? raw.statusUpdatedByUid : null,
    statusUpdatedByEmail:
      typeof raw.statusUpdatedByEmail === 'string' ? raw.statusUpdatedByEmail : null,
  };
};

export const submitOnboardingRequest = async (
  payload: SubmitOnboardingRequestPayload
): Promise<SubmitOnboardingRequestResponse> => {
  const validation = validateOnboardingRequestInput(payload);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError || 'Revisá los datos ingresados antes de enviar.');
  }

  const normalizedPayload: SubmitOnboardingRequestPayload = {
    name: sanitizeSingleLineInput(payload.name),
    email: sanitizeSingleLineInput(payload.email).toLowerCase(),
    phone: sanitizeSingleLineInput(payload.phone),
    notes: sanitizeNotesInput(payload.notes ?? ''),
    ...(payload.website ? { website: payload.website } : {}),
  };

  const callable = httpsCallable<SubmitOnboardingRequestPayload, SubmitOnboardingRequestResponse>(
    functions,
    'submitOnboardingRequest'
  );
  const response = await callable(normalizedPayload);
  return response.data;
};

export const subscribeToOnboardingRequests = (
  onData: (requests: OnboardingRequestDoc[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const requestsQuery = query(
    collection(db, 'onboarding_requests'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) =>
        normalizeOnboardingRequestDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      onData(list);
    },
    (error) => {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  );
};

export const updateOnboardingRequestStatus = async (
  payload: SuperAdminUpdateOnboardingRequestStatusPayload
): Promise<SuperAdminUpdateOnboardingRequestStatusResponse> => {
  const cleanId = String(payload.requestId ?? '').trim();
  if (!cleanId) {
    throw new Error('El identificador de solicitud es obligatorio.');
  }
  if (!VALID_STATUSES.includes(payload.status)) {
    throw new Error('Estado de solicitud inválido.');
  }

  const callable = httpsCallable<
    SuperAdminUpdateOnboardingRequestStatusPayload,
    SuperAdminUpdateOnboardingRequestStatusResponse
  >(functions, 'superadminUpdateOnboardingRequestStatus');
  const response = await callable({ requestId: cleanId, status: payload.status });
  return response.data;
};

export const computeOnboardingRequestMetrics = (
  requests: readonly OnboardingRequestDoc[]
): OnboardingRequestMetrics => {
  let pending = 0;
  let contacted = 0;
  let approved = 0;
  let cancelled = 0;

  for (const req of requests) {
    if (req.status === 'pending') pending += 1;
    else if (req.status === 'contacted') contacted += 1;
    else if (req.status === 'approved') approved += 1;
    else if (req.status === 'cancelled') cancelled += 1;
  }

  return {
    total: requests.length,
    pending,
    contacted,
    approved,
    cancelled,
  };
};

export const filterOnboardingRequests = (
  requests: readonly OnboardingRequestDoc[],
  searchQuery: string,
  statusFilter: OnboardingRequestFilterStatus = 'all'
): OnboardingRequestDoc[] => {
  const cleanSearch = String(searchQuery ?? '').trim().toLowerCase();

  return requests.filter((req) => {
    if (statusFilter !== 'all' && req.status !== statusFilter) {
      return false;
    }

    if (!cleanSearch) return true;

    const haystacks = [req.name, req.email, req.phone, req.notes, req.id];
    return haystacks.some((val) => String(val ?? '').toLowerCase().includes(cleanSearch));
  });
};
