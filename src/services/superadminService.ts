import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebaseConfig';
import {
  DEFAULT_TENANT_CURRENCY,
  DEFAULT_TENANT_TIMEZONE,
  TENANT_ID_REGEX,
  TENANT_SLUG_MAX_LENGTH,
} from '../config/tenantConstants';
import {
  normalizeTenantSlug,
  validateEmail,
  validateRequiredText,
  validateTenantId,
  validateTenantSlug,
} from '../utils/validators';
import { clearPublicCache, PUBLIC_CACHE_KEYS } from './publicCache';
import { invalidateTenantBootstrapCache } from './tenantService';
import { SUPERADMIN_TEXTS } from '../texts/pages/SuperAdmin';
import type {
  SuperAdminChangeTenantSlugPayload,
  SuperAdminChangeTenantSlugResponse,
  SuperAdminCreateTenantPayload,
  SuperAdminCreateTenantResponse,
  SuperAdminUpdateTenantPayload,
  SuperAdminUpdateTenantResponse,
  SuperAdminUpsertTenantMemberPayload,
  SuperAdminUpsertTenantMemberResponse,
  TenantDoc,
  TenantMemberDoc,
  TenantRole,
  TenantStatus,
} from '../types';

export type TenantFilterStatus = 'all' | 'active' | 'suspended' | 'demo';

export interface PlatformMetrics {
  total: number;
  active: number;
  suspended: number;
  mpConfigured: number;
  demoCount: number;
}

export interface SuperAdminTimezoneOption {
  value: string;
  label: string;
}

export const SUPERADMIN_TIMEZONE_OPTIONS: readonly SuperAdminTimezoneOption[] = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/Argentina/Cordoba', label: 'Córdoba (GMT-3)' },
  { value: 'America/Argentina/Mendoza', label: 'Mendoza (GMT-3)' },
  { value: 'America/Montevideo', label: 'Montevideo (GMT-3)' },
  { value: 'America/Santiago', label: 'Santiago (GMT-4 / GMT-3)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
  { value: 'America/Lima', label: 'Lima (GMT-5)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1 / GMT+2)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
] as const;

export const MIN_INITIAL_OWNER_PASSWORD_LENGTH = 8;

export const suggestSlugFromBusinessName = (name: string): string => {
  const normalized = normalizeTenantSlug(name);
  if (normalized.length <= TENANT_SLUG_MAX_LENGTH) {
    return normalized;
  }
  return normalized.slice(0, TENANT_SLUG_MAX_LENGTH).replace(/-+$/g, '');
};

export const isValidIanaTimezone = (timezone: string): boolean => {
  const trimmed = String(timezone ?? '').trim();
  if (!trimmed) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
};

export interface FormValidationResult<TFields extends string = string> {
  isValid: boolean;
  errors: Partial<Record<TFields, string>>;
}

export type CreateTenantField = 'name' | 'slug' | 'ownerEmail' | 'ownerPassword' | 'timezone';

export const validateCreateTenantInput = (
  input: SuperAdminCreateTenantPayload
): FormValidationResult<CreateTenantField> => {
  const errors: Partial<Record<CreateTenantField, string>> = {};

  const nameValidation = validateRequiredText(input.name, 'El nombre comercial', 2, 100);
  if (!nameValidation.isValid) {
    errors.name = nameValidation.error || SUPERADMIN_TEXTS.errors.invalidName;
  }

  const slugValidation = validateTenantSlug(String(input.slug ?? '').trim());
  if (!slugValidation.isValid) {
    errors.slug = slugValidation.error;
  }

  const emailValidation = validateEmail(input.ownerEmail, true);
  if (!emailValidation.isValid) {
    errors.ownerEmail = emailValidation.error;
  }

  const trimmedPassword = typeof input.ownerPassword === 'string' ? input.ownerPassword.trim() : '';
  if (trimmedPassword.length > 0 && trimmedPassword.length < MIN_INITIAL_OWNER_PASSWORD_LENGTH) {
    errors.ownerPassword = SUPERADMIN_TEXTS.errors.shortPassword;
  }

  const timezone = (input.timezone ?? DEFAULT_TENANT_TIMEZONE).trim();
  if (!isValidIanaTimezone(timezone)) {
    errors.timezone = SUPERADMIN_TEXTS.errors.invalidTimezone;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export type UpdateTenantField = 'tenantId' | 'name' | 'timezone' | 'status';

export const validateUpdateTenantInput = (
  input: SuperAdminUpdateTenantPayload
): FormValidationResult<UpdateTenantField> => {
  const errors: Partial<Record<UpdateTenantField, string>> = {};

  const tenantIdValidation = validateTenantId(input.tenantId);
  if (!tenantIdValidation.isValid) {
    errors.tenantId = tenantIdValidation.error || SUPERADMIN_TEXTS.errors.invalidTenantId;
  }

  if (input.name !== undefined) {
    const nameValidation = validateRequiredText(input.name, 'El nombre comercial', 2, 100);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error || SUPERADMIN_TEXTS.errors.invalidName;
    }
  }

  if (input.timezone !== undefined && !isValidIanaTimezone(input.timezone)) {
    errors.timezone = SUPERADMIN_TEXTS.errors.invalidTimezone;
  }

  if (input.status !== undefined && input.status !== 'active' && input.status !== 'suspended') {
    errors.status = 'Estado de negocio inválido.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export type ChangeSlugField = 'tenantId' | 'newSlug';

export const validateChangeSlugInput = (
  tenantId: string,
  newSlug: string,
  currentSlug?: string
): FormValidationResult<ChangeSlugField> => {
  const errors: Partial<Record<ChangeSlugField, string>> = {};

  const tenantIdValidation = validateTenantId(tenantId);
  if (!tenantIdValidation.isValid) {
    errors.tenantId = tenantIdValidation.error || SUPERADMIN_TEXTS.errors.invalidTenantId;
  }

  const trimmedSlug = String(newSlug ?? '').trim();
  const slugValidation = validateTenantSlug(trimmedSlug);
  if (!slugValidation.isValid) {
    errors.newSlug = slugValidation.error;
  } else if (currentSlug && trimmedSlug === currentSlug.trim().toLowerCase()) {
    errors.newSlug = SUPERADMIN_TEXTS.errors.sameSlug;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export type UpsertMemberField = 'tenantId' | 'email' | 'role';

export const validateUpsertMemberInput = (
  input: SuperAdminUpsertTenantMemberPayload
): FormValidationResult<UpsertMemberField> => {
  const errors: Partial<Record<UpsertMemberField, string>> = {};

  const tenantIdValidation = validateTenantId(input.tenantId);
  if (!tenantIdValidation.isValid) {
    errors.tenantId = tenantIdValidation.error || SUPERADMIN_TEXTS.errors.invalidTenantId;
  }

  const emailValidation = validateEmail(input.email, true);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }

  if (input.role !== 'owner' && input.role !== 'staff') {
    errors.role = 'El rol debe ser dueño o staff.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const computePlatformMetrics = (tenants: readonly TenantDoc[]): PlatformMetrics => {
  let active = 0;
  let suspended = 0;
  let mpConfigured = 0;
  let demoCount = 0;

  for (const tenant of tenants) {
    if (tenant.status === 'suspended') {
      suspended += 1;
    } else {
      active += 1;
    }
    if (tenant.mpConfigured) {
      mpConfigured += 1;
    }
    if (tenant.isDemo) {
      demoCount += 1;
    }
  }

  return {
    total: tenants.length,
    active,
    suspended,
    mpConfigured,
    demoCount,
  };
};

export const filterTenants = (
  tenants: readonly TenantDoc[],
  searchQuery: string,
  statusFilter: TenantFilterStatus = 'all'
): TenantDoc[] => {
  const cleanSearch = String(searchQuery ?? '').trim().toLowerCase();

  return tenants.filter((tenant) => {
    if (statusFilter === 'active' && tenant.status !== 'active') return false;
    if (statusFilter === 'suspended' && tenant.status !== 'suspended') return false;
    if (statusFilter === 'demo' && !tenant.isDemo) return false;

    if (!cleanSearch) return true;

    const haystacks = [
      tenant.name,
      tenant.slug,
      tenant.id,
      ...(tenant.previousSlugs ?? []),
    ];

    return haystacks.some((value) => String(value ?? '').toLowerCase().includes(cleanSearch));
  });
};

export const normalizeTenantDoc = (id: string, raw: Record<string, unknown>): TenantDoc => {
  const status: TenantStatus = raw.status === 'suspended' ? 'suspended' : 'active';
  const previousSlugs = Array.isArray(raw.previousSlugs)
    ? raw.previousSlugs.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : id,
    slug: typeof raw.slug === 'string' ? raw.slug.trim() : '',
    previousSlugs,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : id,
    status,
    isDemo: raw.isDemo === true,
    mpConfigured: raw.mpConfigured === true,
    timezone:
      typeof raw.timezone === 'string' && raw.timezone.trim()
        ? raw.timezone.trim()
        : DEFAULT_TENANT_TIMEZONE,
    currency:
      raw.currency === DEFAULT_TENANT_CURRENCY
        ? DEFAULT_TENANT_CURRENCY
        : DEFAULT_TENANT_CURRENCY,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
    createdByUid: typeof raw.createdByUid === 'string' ? raw.createdByUid : '',
  };
};

export const normalizeTenantMemberDoc = (
  id: string,
  raw: Record<string, unknown>
): TenantMemberDoc => {
  const role: TenantRole = raw.role === 'owner' ? 'owner' : 'staff';

  return {
    uid: typeof raw.uid === 'string' && raw.uid.trim() ? raw.uid.trim() : id,
    email: typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '',
    displayName: typeof raw.displayName === 'string' ? raw.displayName.trim() : '',
    role,
    active: raw.active !== false,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
  };
};

export const sortTenantMembers = (members: readonly TenantMemberDoc[]): TenantMemberDoc[] => {
  return [...members].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    if (a.role !== b.role) return a.role === 'owner' ? -1 : 1;
    return a.email.localeCompare(b.email);
  });
};

export const extractCallableErrorMessage = (err: unknown, fallback: string): string => {
  if (!err || typeof err !== 'object') {
    return fallback;
  }

  const firebaseErr = err as { code?: unknown; message?: unknown };
  const code = typeof firebaseErr.code === 'string' ? firebaseErr.code : '';
  const rawMessage = typeof firebaseErr.message === 'string' ? firebaseErr.message.trim() : '';

  if (code === 'functions/permission-denied' || code === 'permission-denied') {
    return SUPERADMIN_TEXTS.errors.permissionDenied;
  }
  if (code === 'functions/already-exists' && !rawMessage) {
    return SUPERADMIN_TEXTS.errors.slugAlreadyExists;
  }
  if (code === 'functions/not-found' && !rawMessage) {
    return SUPERADMIN_TEXTS.errors.userNotFound;
  }

  if (rawMessage && rawMessage !== 'internal') {
    return rawMessage.replace(/^FirebaseError:\s*/i, '').trim() || fallback;
  }

  return fallback;
};

const assertValidTenantId = (tenantId: string): string => {
  const clean = String(tenantId ?? '').trim();
  if (!TENANT_ID_REGEX.test(clean)) {
    throw new Error(SUPERADMIN_TEXTS.errors.invalidTenantId);
  }
  return clean;
};

const clearSlugBootstrapCache = (slug?: string | null): void => {
  const clean = String(slug ?? '').trim().toLowerCase();
  if (!clean) return;
  invalidateTenantBootstrapCache(clean);
  clearPublicCache(clean, PUBLIC_CACHE_KEYS.bootstrap);
};

export const subscribeToAllTenants = (
  onData: (tenants: TenantDoc[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const tenantsQuery = query(collection(db, 'tenants'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    tenantsQuery,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) =>
        normalizeTenantDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
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

export const subscribeToTenantMembers = (
  tenantId: string,
  onData: (members: TenantMemberDoc[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const validTenantId = assertValidTenantId(tenantId);
  const membersCol = collection(db, 'tenants', validTenantId, 'members');

  return onSnapshot(
    membersCol,
    (snapshot) => {
      const members = snapshot.docs.map((docSnap) =>
        normalizeTenantMemberDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      onData(sortTenantMembers(members));
    },
    (error) => {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  );
};

export const createTenant = async (
  payload: SuperAdminCreateTenantPayload
): Promise<SuperAdminCreateTenantResponse> => {
  const normalizedPayload: SuperAdminCreateTenantPayload = {
    name: payload.name.trim(),
    slug: payload.slug.trim().toLowerCase(),
    ownerEmail: payload.ownerEmail.trim().toLowerCase(),
    ...(payload.ownerPassword && payload.ownerPassword.trim()
      ? { ownerPassword: payload.ownerPassword.trim() }
      : {}),
    timezone: (payload.timezone || DEFAULT_TENANT_TIMEZONE).trim(),
    isDemo: Boolean(payload.isDemo),
  };

  const validation = validateCreateTenantInput(normalizedPayload);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError || SUPERADMIN_TEXTS.errors.genericActionError);
  }

  const callable = httpsCallable<SuperAdminCreateTenantPayload, SuperAdminCreateTenantResponse>(
    functions,
    'superadminCreateTenant'
  );
  const response = await callable(normalizedPayload);
  clearSlugBootstrapCache(response.data.slug);
  return response.data;
};

export const updateTenant = async (
  payload: SuperAdminUpdateTenantPayload,
  currentSlug?: string
): Promise<SuperAdminUpdateTenantResponse> => {
  const validTenantId = assertValidTenantId(payload.tenantId);
  const normalizedPayload: SuperAdminUpdateTenantPayload = {
    tenantId: validTenantId,
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
    ...(payload.timezone !== undefined ? { timezone: payload.timezone.trim() } : {}),
    ...(payload.isDemo !== undefined ? { isDemo: Boolean(payload.isDemo) } : {}),
  };

  const validation = validateUpdateTenantInput(normalizedPayload);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError || SUPERADMIN_TEXTS.errors.genericActionError);
  }

  const callable = httpsCallable<SuperAdminUpdateTenantPayload, SuperAdminUpdateTenantResponse>(
    functions,
    'superadminUpdateTenant'
  );
  const response = await callable(normalizedPayload);
  clearSlugBootstrapCache(currentSlug);
  return response.data;
};

export const changeTenantSlug = async (
  payload: SuperAdminChangeTenantSlugPayload,
  currentSlug?: string
): Promise<SuperAdminChangeTenantSlugResponse> => {
  const validTenantId = assertValidTenantId(payload.tenantId);
  const cleanNewSlug = payload.newSlug.trim().toLowerCase();

  const validation = validateChangeSlugInput(validTenantId, cleanNewSlug, currentSlug);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError || SUPERADMIN_TEXTS.errors.genericActionError);
  }

  const callable = httpsCallable<
    SuperAdminChangeTenantSlugPayload,
    SuperAdminChangeTenantSlugResponse
  >(functions, 'superadminChangeTenantSlug');

  const response = await callable({
    tenantId: validTenantId,
    newSlug: cleanNewSlug,
  });

  clearSlugBootstrapCache(response.data.previousSlug);
  clearSlugBootstrapCache(response.data.newSlug);
  if (currentSlug && currentSlug !== response.data.previousSlug) {
    clearSlugBootstrapCache(currentSlug);
  }

  return response.data;
};

export const upsertTenantMember = async (
  payload: SuperAdminUpsertTenantMemberPayload
): Promise<SuperAdminUpsertTenantMemberResponse> => {
  const validTenantId = assertValidTenantId(payload.tenantId);
  const normalizedPayload: SuperAdminUpsertTenantMemberPayload = {
    tenantId: validTenantId,
    email: payload.email.trim().toLowerCase(),
    role: payload.role,
    active: Boolean(payload.active),
  };

  const validation = validateUpsertMemberInput(normalizedPayload);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError || SUPERADMIN_TEXTS.errors.genericActionError);
  }

  const callable = httpsCallable<
    SuperAdminUpsertTenantMemberPayload,
    SuperAdminUpsertTenantMemberResponse
  >(functions, 'superadminUpsertTenantMember');

  const response = await callable(normalizedPayload);
  return response.data;
};
