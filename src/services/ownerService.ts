import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { OwnerInfo, PortfolioItem } from '../types';
import {
  FALLBACK_OWNER_INFO_SYNC,
  loadDefaultOwnerInfo,
  resolveOwnerInfo,
} from './ownerDefaults';

const OWNER_INFO_COLLECTION = 'ownerinfo';
const OWNER_INFO_DOC = 'profile';
const PORTFOLIO_COLLECTION = 'portfolio';

export const DEFAULT_OWNER_INFO: OwnerInfo = FALLBACK_OWNER_INFO_SYNC;

export const getOwnerInfo = async (): Promise<OwnerInfo> => {
  const defaults = await loadDefaultOwnerInfo();
  try {
    const docRef = doc(db, OWNER_INFO_COLLECTION, OWNER_INFO_DOC);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return resolveOwnerInfo(snap.data() as Partial<OwnerInfo>, defaults);
    }
    return { ...defaults };
  } catch (error) {
    console.error('Error al obtener ownerinfo:', error);
    return { ...defaults };
  }
};

export const subscribeToRawOwnerInfo = (
  onSuccess: (data: Partial<OwnerInfo> | null) => void,
  onError?: (error: Error) => void
) => {
  const docRef = doc(db, OWNER_INFO_COLLECTION, OWNER_INFO_DOC);

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

export const updateOwnerInfo = async (info: Partial<OwnerInfo>): Promise<void> => {
  const docRef = doc(db, OWNER_INFO_COLLECTION, OWNER_INFO_DOC);
  await setDoc(
    docRef,
    {
      ...info,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
};

export const subscribeToPortfolio = (
  onSuccess: (items: PortfolioItem[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(collection(db, PORTFOLIO_COLLECTION), orderBy('createdAt', 'desc'));

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
  item: Omit<PortfolioItem, 'id' | 'createdAt'>
): Promise<string> => {
  const cleanData = {
    title: item.title || '',
    category: item.category || '',
    description: item.description || '',
    imageUrl: item.imageUrl || '',
    createdAt: new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, PORTFOLIO_COLLECTION), cleanData);
  return docRef.id;
};

export const deletePortfolioItem = async (id: string): Promise<void> => {
  const docRef = doc(db, PORTFOLIO_COLLECTION, id);
  await deleteDoc(docRef);
};
