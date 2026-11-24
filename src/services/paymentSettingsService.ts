import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseConfig';
import { TENANT_ID_REGEX } from '../config/tenantConstants';
import { clearPublicCache, PUBLIC_CACHE_KEYS } from './publicCache';
import { invalidateTenantBootstrapCache } from './tenantService';
import type {
  AdminGetPaymentSettingsPayload,
  AdminSavePaymentSettingsPayload,
  TenantPaymentSettingsSummary,
} from '../types';

const assertValidTenantId = (tenantId: string): string => {
  const clean = String(tenantId ?? '').trim();
  if (!TENANT_ID_REGEX.test(clean)) {
    throw new Error('Se requiere un identificador de negocio (tenantId) válido.');
  }
  return clean;
};

export const getPaymentSettingsSummary = async (
  tenantId: string
): Promise<TenantPaymentSettingsSummary> => {
  const validTenantId = assertValidTenantId(tenantId);
  const callable = httpsCallable<AdminGetPaymentSettingsPayload, TenantPaymentSettingsSummary>(
    functions,
    'adminGetPaymentSettingsSummary'
  );
  const response = await callable({ tenantId: validTenantId });
  return response.data;
};

export const savePaymentSettings = async (
  payload: AdminSavePaymentSettingsPayload,
  tenantSlug?: string
): Promise<TenantPaymentSettingsSummary> => {
  const validTenantId = assertValidTenantId(payload.tenantId);
  const callable = httpsCallable<AdminSavePaymentSettingsPayload, TenantPaymentSettingsSummary>(
    functions,
    'adminSavePaymentSettings'
  );
  const response = await callable({
    ...payload,
    tenantId: validTenantId,
  });

  if (tenantSlug) {
    invalidateTenantBootstrapCache(tenantSlug);
    clearPublicCache(tenantSlug, PUBLIC_CACHE_KEYS.bootstrap);
  }

  return response.data;
};
