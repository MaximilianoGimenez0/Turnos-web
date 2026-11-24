import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteField,
  collection,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  type FieldValue,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { clearPublicCache, PUBLIC_CACHE_KEYS } from './publicCache';
import { invalidateTenantBootstrapCache } from './tenantService';
import type { OwnerInfo, PortfolioItem } from '../types';
import {
  FALLBACK_OWNER_INFO_SYNC,
  loadDefaultOwnerInfo,
  resolveOwnerInfo,
} from './ownerDefaults';

const TENANTS_COLLECTION = 'tenants';
const OWNER_INFO_COLLECTION = 'ownerinfo';
const OWNER_INFO_DOC = 'profile';
const PORTFOLIO_COLLECTION = 'portfolio';

export const DEFAULT_OWNER_INFO: OwnerInfo = FALLBACK_OWNER_INFO_SYNC;

const assertTenantId = (tenantId: string): string => {
  const clean = String(tenantId ?? '').trim();
  if (!clean) {
    throw new Error('Se requiere un tenantId válido.');
  }
  return clean;
};

const getOwnerProfileDocRef = (tenantId: string) =>
  doc(db, TENANTS_COLLECTION, assertTenantId(tenantId), OWNER_INFO_COLLECTION, OWNER_INFO_DOC);

const getPortfolioCollectionRef = (tenantId: string) =>
  collection(db, TENANTS_COLLECTION, assertTenantId(tenantId), PORTFOLIO_COLLECTION);

export const getRawOwnerInfo = async (tenantId: string): Promise<Partial<OwnerInfo> | null> => {
  const docRef = getOwnerProfileDocRef(tenantId);
  const snap = await getDoc(docRef);
  return snap.exists() ? (snap.data() as Partial<OwnerInfo>) : null;
};

export const getOwnerInfo = async (tenantId: string): Promise<OwnerInfo> => {
  const defaults = await loadDefaultOwnerInfo();
  try {
    const raw = await getRawOwnerInfo(tenantId);
    if (raw) {
      return resolveOwnerInfo(raw, defaults);
    }
    return { ...defaults };
  } catch (error) {
    console.error('Error al obtener ownerinfo:', error);
    return { ...defaults };
  }
};

export const subscribeToRawOwnerInfo = (
  tenantId: string,
  onSuccess: (data: Partial<OwnerInfo> | null) => void,
  onError?: (error: Error) => void
) => {
  const docRef = getOwnerProfileDocRef(tenantId);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onSuccess(snap.data() as Partial<OwnerInfo>);
      } else {
        onSuccess(null);
      }
    },
    (err) => {
      console.error('Error al escuchar ownerinfo:', err);
      if (onError) onError(err);
    }
  );
};

export const subscribeToOwnerInfo = (
  tenantId: string,
  onSuccess: (data: OwnerInfo) => void,
  onError?: (error: Error) => void
) => {
  let active = true;
  let currentDefaults: OwnerInfo = FALLBACK_OWNER_INFO_SYNC;
  let lastRaw: Partial<OwnerInfo> | null | undefined = undefined;

  loadDefaultOwnerInfo().then((loaded) => {
    if (!active) return;
    currentDefaults = loaded;
    if (lastRaw !== undefined) {
      onSuccess(resolveOwnerInfo(lastRaw, currentDefaults));
    }
  });

  const unsubscribe = subscribeToRawOwnerInfo(
    tenantId,
    (raw) => {
      lastRaw = raw;
      onSuccess(resolveOwnerInfo(raw, currentDefaults));
    },
    (err) => {
      onSuccess({ ...currentDefaults });
      if (onError) onError(err);
    }
  );

  return () => {
    active = false;
    unsubscribe();
  };
};

export const updateOwnerInfo = async (
  tenantId: string,
  info: Partial<OwnerInfo>,
  slug?: string
): Promise<void> => {
  const validTenantId = assertTenantId(tenantId);
  const docRef = getOwnerProfileDocRef(validTenantId);
  const payload: Record<string, string | FieldValue> = {
    updatedAt: new Date().toISOString(),
  };

  for (const [key, value] of Object.entries(info)) {
    if (value === undefined || key === 'updatedAt') continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      payload[key] = trimmed.length > 0 ? trimmed : deleteField();
    }
  }

  await setDoc(docRef, payload, { merge: true });
  clearPublicCache(validTenantId, PUBLIC_CACHE_KEYS.ownerInfo);
  if (slug) {
    invalidateTenantBootstrapCache(slug);
  }
};

export const getPortfolioItems = async (tenantId: string): Promise<PortfolioItem[]> => {
  const q = query(getPortfolioCollectionRef(tenantId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<PortfolioItem, 'id'>),
  }));
};

export const subscribeToPortfolio = (
  tenantId: string,
  onSuccess: (items: PortfolioItem[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(getPortfolioCollectionRef(tenantId), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: PortfolioItem[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<PortfolioItem, 'id'>),
      }));
      onSuccess(items);
    },
    (err) => {
      console.error('Error al escuchar portfolio:', err);
      if (onError) onError(err);
    }
  );
};

export const addPortfolioItem = async (
  tenantId: string,
  item: Omit<PortfolioItem, 'id' | 'createdAt'>
): Promise<string> => {
  const validTenantId = assertTenantId(tenantId);
  const cleanData = {
    title: item.title || '',
    category: item.category || '',
    description: item.description || '',
    imageUrl: item.imageUrl || '',
    createdAt: new Date().toISOString(),
  };
  const docRef = await addDoc(getPortfolioCollectionRef(validTenantId), cleanData);
  clearPublicCache(validTenantId, PUBLIC_CACHE_KEYS.portfolio);
  return docRef.id;
};

export const deletePortfolioItem = async (tenantId: string, id: string): Promise<void> => {
  const validTenantId = assertTenantId(tenantId);
  const docRef = doc(db, TENANTS_COLLECTION, validTenantId, PORTFOLIO_COLLECTION, id);
  await deleteDoc(docRef);
  clearPublicCache(validTenantId, PUBLIC_CACHE_KEYS.portfolio);
};
