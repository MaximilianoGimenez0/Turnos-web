import type * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import type { CatalogService, PriceExtra } from './bookingValidation';
import { getTenantServicesCollection, validateTenantIdOrThrow } from './tenantContext';

interface ServicesCacheEntry {
  services: CatalogService[];
  cachedAtMs: number;
}

const SERVICES_CACHE_TTL_MS = 5 * 60 * 1000;
const SERVICES_CACHE_MAX_ENTRIES = 200;

const servicesCatalogCache = new Map<string, ServicesCacheEntry>();

export const resetServicesCatalogCache = (tenantId?: string): void => {
  if (tenantId) {
    servicesCatalogCache.delete(tenantId);
    return;
  }
  servicesCatalogCache.clear();
};

const setCachedEntry = (tenantId: string, entry: ServicesCacheEntry): void => {
  if (servicesCatalogCache.has(tenantId)) {
    servicesCatalogCache.delete(tenantId);
  } else if (servicesCatalogCache.size >= SERVICES_CACHE_MAX_ENTRIES) {
    const oldestKey = servicesCatalogCache.keys().next().value;
    if (oldestKey !== undefined) {
      servicesCatalogCache.delete(oldestKey);
    }
  }
  servicesCatalogCache.set(tenantId, entry);
};

const mapDocToCatalogService = (id: string, data: Record<string, unknown>): CatalogService | null => {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!name) return null;

  const basePrice = Number(data.basePrice);
  const durationMinutes = Number(data.durationMinutes);
  const rawExtras = Array.isArray(data.extras) ? data.extras : [];
  const extras: PriceExtra[] = rawExtras
    .filter((ex): ex is Record<string, unknown> => typeof ex === 'object' && ex !== null)
    .map((ex, idx) => ({
      id: typeof ex.id === 'string' && ex.id.trim() ? ex.id.trim() : `extra-${idx}`,
      name: typeof ex.name === 'string' ? ex.name.trim() : '',
      price: !isNaN(Number(ex.price)) && Number(ex.price) >= 0 ? Number(ex.price) : 0,
    }))
    .filter((ex) => ex.name.length > 0);

  return {
    id,
    name,
    basePrice: !isNaN(basePrice) && basePrice >= 0 ? basePrice : 0,
    durationMinutes: !isNaN(durationMinutes) && durationMinutes > 0 ? durationMinutes : 30,
    extras,
  };
};

export const getLiveServicesCatalogCached = async (
  db: admin.firestore.Firestore,
  tenantId: string,
  nowMs = Date.now()
): Promise<CatalogService[]> => {
  const validTenantId = validateTenantIdOrThrow(tenantId);
  const existing = servicesCatalogCache.get(validTenantId);
  if (existing && nowMs - existing.cachedAtMs < SERVICES_CACHE_TTL_MS) {
    servicesCatalogCache.delete(validTenantId);
    servicesCatalogCache.set(validTenantId, existing);
    return existing.services;
  }

  try {
    const snap = await getTenantServicesCollection(db, validTenantId).get();

    const mapped = snap.docs
      .map((docSnap) => mapDocToCatalogService(docSnap.id, docSnap.data() as Record<string, unknown>))
      .filter((item): item is CatalogService => item !== null);

    setCachedEntry(validTenantId, { services: mapped, cachedAtMs: nowMs });
    return mapped;
  } catch (err) {
    logger.warn(
      '[servicesCatalog] No se pudo cargar /tenants/{tenantId}/services; se usará el snapshot del turno.',
      {
        tenantId: validTenantId,
        error: err instanceof Error ? err.message : String(err),
      }
    );
    return [];
  }
};
