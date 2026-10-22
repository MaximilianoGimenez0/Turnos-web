import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { ServiceItem, NewServiceData } from '../types';

export const SERVICES_COLLECTION = 'services';
const PRICES_FALLBACK_COLLECTION = 'prices';

const mapServiceDoc = (id: string, data: Record<string, unknown>): ServiceItem => {
  return {
    id,
    name: String(data.name || '').trim(),
    basePrice: Number(data.basePrice ?? 0),
    durationMinutes: Number(data.durationMinutes ?? 60),
    extras: Array.isArray(data.extras)
      ? data.extras.map((ex: { id?: string; name: string; price: number }, idx: number) => ({
          id: ex.id || `extra-${idx}`,
          name: String(ex.name || '').trim(),
          price: Number(ex.price || 0),
        }))
      : [],
    description: String(data.description || '').trim(),
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
  };
};

export const subscribeToServices = (
  onSuccess: (services: ServiceItem[]) => void,
  onError?: (error: Error) => void
) => {
  const qServices = query(collection(db, SERVICES_COLLECTION), orderBy('createdAt', 'desc'));

  return onSnapshot(
    qServices,
    async (snapshot) => {
      if (!snapshot.empty) {
        const services: ServiceItem[] = snapshot.docs.map((d) => mapServiceDoc(d.id, d.data()));
        onSuccess(services);
      } else {
        // Fallback to legacy /prices collection during transition to unified /services schema
        try {
          const qPrices = query(
            collection(db, PRICES_FALLBACK_COLLECTION),
            orderBy('createdAt', 'desc')
          );
          const fallbackSnap = await getDocs(qPrices);
          const fallbackServices = fallbackSnap.docs.map((d) => mapServiceDoc(d.id, d.data()));
          onSuccess(fallbackServices);
        } catch {
          onSuccess([]);
        }
      }
    },
    (err) => {
      console.error('Error al escuchar servicios en tiempo real:', err);
      if (onError) onError(err);
    }
  );
};

export const getServices = async (): Promise<ServiceItem[]> => {
  try {
    const qServices = query(collection(db, SERVICES_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(qServices);

    if (!snapshot.empty) {
      return snapshot.docs.map((d) => mapServiceDoc(d.id, d.data()));
    }

    const qPrices = query(
      collection(db, PRICES_FALLBACK_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const fallbackSnap = await getDocs(qPrices);
    return fallbackSnap.docs.map((d) => mapServiceDoc(d.id, d.data()));
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    return [];
  }
};

export const addService = async (serviceData: NewServiceData): Promise<string> => {
  const now = new Date().toISOString();
  const cleanExtras = (serviceData.extras || []).map((ex, idx) => ({
    id: ex.id || `extra-${Date.now()}-${idx}`,
    name: ex.name.trim(),
    price: Number(ex.price || 0),
  }));

  const cleanData = {
    name: serviceData.name.trim(),
    basePrice: Number(serviceData.basePrice || 0),
    durationMinutes: Number(serviceData.durationMinutes || 60),
    extras: cleanExtras,
    description: (serviceData.description || '').trim(),
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, SERVICES_COLLECTION), cleanData);
  return docRef.id;
};

export const updateService = async (
  id: string,
  serviceData: Partial<NewServiceData>
): Promise<void> => {
  const docRef = doc(db, SERVICES_COLLECTION, id);
  const now = new Date().toISOString();

  const payload: Record<string, unknown> = {
    updatedAt: now,
  };

  if (serviceData.name !== undefined) {
    payload.name = serviceData.name.trim();
  }
  if (serviceData.basePrice !== undefined) {
    payload.basePrice = Number(serviceData.basePrice);
  }
  if (serviceData.durationMinutes !== undefined) {
    payload.durationMinutes = Number(serviceData.durationMinutes);
  }
  if (serviceData.description !== undefined) {
    payload.description = serviceData.description.trim();
  }
  if (serviceData.extras !== undefined) {
    payload.extras = serviceData.extras.map((ex, idx) => ({
      id: ex.id || `extra-${Date.now()}-${idx}`,
      name: ex.name.trim(),
      price: Number(ex.price || 0),
    }));
  }

  await updateDoc(docRef, payload);
};

export const deleteService = async (id: string): Promise<void> => {
  const docRef = doc(db, SERVICES_COLLECTION, id);
  await deleteDoc(docRef);
};
