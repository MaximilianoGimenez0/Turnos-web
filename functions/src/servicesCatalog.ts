import type * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import type { CatalogService, PriceExtra } from './bookingValidation';

const SERVICES_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedServices: CatalogService[] | null = null;
let cachedAtMs = 0;

export const resetServicesCatalogCache = (): void => {
  cachedServices = null;
  cachedAtMs = 0;
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
  nowMs = Date.now()
): Promise<CatalogService[]> => {
  if (cachedServices && nowMs - cachedAtMs < SERVICES_CACHE_TTL_MS) {
    return cachedServices;
  }

  try {
    let snap = await db.collection('services').get();
    if (snap.empty) {
      snap = await db.collection('prices').get();
    }

    const mapped = snap.docs
      .map((docSnap) => mapDocToCatalogService(docSnap.id, docSnap.data() as Record<string, unknown>))
      .filter((item): item is CatalogService => item !== null);

    cachedServices = mapped;
    cachedAtMs = nowMs;
    return mapped;
  } catch (err) {
    logger.warn('[servicesCatalog] No se pudo cargar /services; se usará el snapshot del turno.', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
};
