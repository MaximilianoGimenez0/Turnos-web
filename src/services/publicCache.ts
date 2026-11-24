export const PUBLIC_CACHE_PREFIX = 'turnos_pub_v2';

export const PUBLIC_CACHE_KEYS = {
  bootstrap: 'bootstrap',
  ownerInfo: 'ownerInfo',
  services: 'services',
  portfolio: 'portfolio',
} as const;

export type PublicCacheResource = (typeof PUBLIC_CACHE_KEYS)[keyof typeof PUBLIC_CACHE_KEYS] | string;

export const DEFAULT_PUBLIC_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEnvelope<T> {
  storedAt: number;
  data: T;
}

const memoryCache = new Map<string, CacheEnvelope<unknown>>();

const normalizeSegment = (value: string): string => String(value ?? '').trim();

export const buildPublicCacheKey = (scopeKey: string, resource: PublicCacheResource): string => {
  const cleanScope = normalizeSegment(scopeKey);
  const cleanResource = normalizeSegment(resource);
  if (!cleanScope || !cleanResource) {
    throw new Error('publicCache requiere scopeKey y resource válidos.');
  }
  return `${PUBLIC_CACHE_PREFIX}:${cleanScope}:${cleanResource}`;
};

export const readPublicCache = <T>(
  scopeKey: string,
  resource: PublicCacheResource,
  ttlMs = DEFAULT_PUBLIC_CACHE_TTL_MS
): T | null => {
  const cleanScope = normalizeSegment(scopeKey);
  const cleanResource = normalizeSegment(resource);
  if (!cleanScope || !cleanResource) return null;

  const key = buildPublicCacheKey(cleanScope, cleanResource);
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

export const writePublicCache = <T>(
  scopeKey: string,
  resource: PublicCacheResource,
  data: T
): void => {
  const cleanScope = normalizeSegment(scopeKey);
  const cleanResource = normalizeSegment(resource);
  if (!cleanScope || !cleanResource) return;

  const key = buildPublicCacheKey(cleanScope, cleanResource);
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

const removeSessionStorageKeysByPrefix = (prefix: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const keysToDelete: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToDelete.push(k);
      }
    }
    keysToDelete.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // Ignore storage errors
  }
};

export const clearPublicCache = (scopeKey?: string, resource?: PublicCacheResource): void => {
  const cleanScope = scopeKey ? normalizeSegment(scopeKey) : '';
  const cleanResource = resource ? normalizeSegment(resource) : '';

  if (cleanScope && cleanResource) {
    const exactKey = buildPublicCacheKey(cleanScope, cleanResource);
    memoryCache.delete(exactKey);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(exactKey);
      } catch {
        // Ignore storage errors
      }
    }
    return;
  }

  if (cleanScope) {
    const scopePrefix = `${PUBLIC_CACHE_PREFIX}:${cleanScope}:`;
    for (const k of Array.from(memoryCache.keys())) {
      if (k.startsWith(scopePrefix)) {
        memoryCache.delete(k);
      }
    }
    removeSessionStorageKeysByPrefix(scopePrefix);
    return;
  }

  memoryCache.clear();
  removeSessionStorageKeysByPrefix(`${PUBLIC_CACHE_PREFIX}:`);
};
