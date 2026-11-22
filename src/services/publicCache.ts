export const PUBLIC_CACHE_KEYS = {
  ownerInfo: 'turnos_pub_owner_v1',
  services: 'turnos_pub_services_v1',
  portfolio: 'turnos_pub_portfolio_v1',
} as const;

export const DEFAULT_PUBLIC_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEnvelope<T> {
  storedAt: number;
  data: T;
}

const memoryCache = new Map<string, CacheEnvelope<unknown>>();

export const readPublicCache = <T>(
  key: string,
  ttlMs = DEFAULT_PUBLIC_CACHE_TTL_MS
): T | null => {
  const now = Date.now();
  const mem = memoryCache.get(key);
  if (mem) {
    if (now - mem.storedAt < ttlMs) {
      return mem.data as T;
    }
    memoryCache.delete(key);
  }

  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (
      parsed &&
      typeof parsed.storedAt === 'number' &&
      now - parsed.storedAt < ttlMs &&
      'data' in parsed
    ) {
      memoryCache.set(key, parsed);
      return parsed.data;
    }
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage quota/privacy restrictions
  }

  return null;
};

export const writePublicCache = <T>(key: string, data: T): void => {
  const envelope: CacheEnvelope<T> = {
    storedAt: Date.now(),
    data,
  };
  memoryCache.set(key, envelope);

  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Ignore storage quota/privacy restrictions
  }
};

export const clearPublicCache = (key?: string): void => {
  if (key) {
    memoryCache.delete(key);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // Ignore storage errors
      }
    }
    return;
  }

  memoryCache.clear();
  if (typeof window !== 'undefined') {
    try {
      Object.values(PUBLIC_CACHE_KEYS).forEach((k) => window.sessionStorage.removeItem(k));
    } catch {
      // Ignore storage errors
    }
  }
};
