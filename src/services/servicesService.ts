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
import { clearPublicCache, PUBLIC_CACHE_KEYS } from './publicCache';
import type { ServiceItem, NewServiceData } from '../types';

const TENANTS_COLLECTION = 'tenants';
export const SERVICES_COLLECTION = 'services';

const assertTenantId = (tenantId: string): string => {
  const clean = String(tenantId ?? '').trim();
  if (!clean) {
    throw new Error('Se requiere un tenantId válido.');
  }
  return clean;
};

const getTenantServicesCollectionRef = (tenantId: string) =>
  collection(db, TENANTS_COLLECTION, assertTenantId(tenantId), SERVICES_COLLECTION);

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
  tenantId: string,
  onSuccess: (services: ServiceItem[]) => void,
  onError?: (error: Error) => void
) => {
  const qServices = query(getTenantServicesCollectionRef(tenantId), orderBy('createdAt', 'desc'));

  return onSnapshot(
    qServices,
    (snapshot) => {
      const services: ServiceItem[] = snapshot.docs.map((d) => mapServiceDoc(d.id, d.data()));
      onSuccess(services);
    },
    (err) => {
      console.error('Error al escuchar servicios en tiempo real:', err);
      if (onError) onError(err);
    }
  );
};

export const getServices = async (tenantId: string): Promise<ServiceItem[]> => {
  try {
    const qServices = query(getTenantServicesCollectionRef(tenantId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(qServices);
    return snapshot.docs.map((d) => mapServiceDoc(d.id, d.data()));
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    return [];
  }
};

export const addService = async (
  tenantId: string,
  serviceData: NewServiceData
): Promise<string> => {
  const validTenantId = assertTenantId(tenantId);
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

  const docRef = await addDoc(getTenantServicesCollectionRef(validTenantId), cleanData);
  clearPublicCache(validTenantId, PUBLIC_CACHE_KEYS.services);
  return docRef.id;
};

export const updateService = async (
  tenantId: string,
  id: string,
  serviceData: Partial<NewServiceData>
): Promise<void> => {
  const validTenantId = assertTenantId(tenantId);
  const docRef = doc(db, TENANTS_COLLECTION, validTenantId, SERVICES_COLLECTION, id);
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
  clearPublicCache(validTenantId, PUBLIC_CACHE_KEYS.services);
};

export const deleteService = async (tenantId: string, id: string): Promise<void> => {
  const validTenantId = assertTenantId(tenantId);
  const docRef = doc(db, TENANTS_COLLECTION, validTenantId, SERVICES_COLLECTION, id);
  await deleteDoc(docRef);
  clearPublicCache(validTenantId, PUBLIC_CACHE_KEYS.services);
};
