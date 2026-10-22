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

const OWNER_INFO_COLLECTION = 'ownerinfo';
const OWNER_INFO_DOC = 'profile';
const PORTFOLIO_COLLECTION = 'portfolio';

export const DEFAULT_OWNER_INFO: OwnerInfo = {
  name: 'Estudio de Belleza & Estética',
  businessName: 'Estudio de Belleza',
  role: 'Especialista en Belleza y Cuidado Personal',
  description:
    'Brindamos atención personalizada de primer nivel. Nos enfocamos en realzar tu belleza natural con técnicas modernas, productos premium y un ambiente diseñado para tu máximo relax y confort.',
  pictureUrl: '',
  logoUrl: '',
  instagram: '@turnosweb.estetica',
  phone: '+54 9 11 1234-5678',
  email: 'contacto@turnosweb.com',
  location: 'Buenos Aires, Argentina',
};

export const getOwnerInfo = async (): Promise<OwnerInfo> => {
  try {
    const docRef = doc(db, OWNER_INFO_COLLECTION, OWNER_INFO_DOC);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return { ...DEFAULT_OWNER_INFO, ...snap.data() } as OwnerInfo;
    }
    return DEFAULT_OWNER_INFO;
  } catch (error) {
    console.error('Error al obtener ownerinfo:', error);
    return DEFAULT_OWNER_INFO;
  }
};

export const subscribeToOwnerInfo = (
  onSuccess: (data: OwnerInfo) => void,
  onError?: (error: Error) => void
) => {
  const docRef = doc(db, OWNER_INFO_COLLECTION, OWNER_INFO_DOC);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onSuccess({ ...DEFAULT_OWNER_INFO, ...snap.data() } as OwnerInfo);
      } else {
        onSuccess(DEFAULT_OWNER_INFO);
      }
    },
    (err) => {
      console.error('Error al escuchar ownerinfo:', err);
      if (onError) onError(err);
    }
  );
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
