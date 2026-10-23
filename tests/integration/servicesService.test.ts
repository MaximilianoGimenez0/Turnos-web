import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../src/services/firebaseConfig';
import {
  getServices,
  subscribeToServices,
  addService,
  updateService,
  deleteService,
} from '../../src/services/servicesService';
import type { ServiceItem } from '../../src/types';
import { initTestEmulators } from '../setup/emulatorConfig';
import { setupAuthenticatedAdmin } from '../setup/testEnvironment';
import { createServiceDataFixture } from '../setup/fixtures';

describe('Integración - servicesService con Firestore Emulator', () => {
  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await setupAuthenticatedAdmin();
  });

  it('addService crea un servicio en Firestore y retorna un ID válido', async () => {
    const serviceData = createServiceDataFixture({
      name: 'Perfilado de Cejas',
      basePrice: 8000,
      durationMinutes: 30,
    });

    const newId = await addService(serviceData);
    expect(newId).toBeTruthy();

    const services = await getServices();
    expect(services).toHaveLength(1);
    expect(services[0].id).toBe(newId);
    expect(services[0].name).toBe('Perfilado de Cejas');
    expect(services[0].basePrice).toBe(8000);
    expect(services[0].durationMinutes).toBe(30);
    expect(services[0].extras).toHaveLength(1);
  });

  it('updateService actualiza campos específicos y preserva los no modificados', async () => {
    const serviceData = createServiceDataFixture({
      name: 'Lifting Básico',
      basePrice: 15000,
    });
    const id = await addService(serviceData);

    await updateService(id, {
      name: 'Lifting Avanzado con Keratina',
      basePrice: 20000,
    });

    const services = await getServices();
    const updated = services.find((s) => s.id === id);
    expect(updated).toBeDefined();
    expect(updated?.name).toBe('Lifting Avanzado con Keratina');
    expect(updated?.basePrice).toBe(20000);
    expect(updated?.durationMinutes).toBe(60); // Preservado
    expect(updated?.updatedAt).toBeDefined();
  });

  it('deleteService elimina el documento de la colección services', async () => {
    const id1 = await addService(createServiceDataFixture({ name: 'Servicio 1' }));
    const id2 = await addService(createServiceDataFixture({ name: 'Servicio 2' }));

    let services = await getServices();
    expect(services).toHaveLength(2);

    await deleteService(id1);

    services = await getServices();
    expect(services).toHaveLength(1);
    expect(services[0].id).toBe(id2);
  });

  it('getServices y subscribeToServices utilizan fallback a /prices si /services está vacía', async () => {
    // Insertamos directamente en la colección legacy 'prices'
    await addDoc(collection(db, 'prices'), {
      name: 'Servicio Legacy desde Prices',
      basePrice: 9500,
      durationMinutes: 40,
      createdAt: new Date().toISOString(),
    });

    const services = await getServices();
    expect(services).toHaveLength(1);
    expect(services[0].name).toBe('Servicio Legacy desde Prices');
    expect(services[0].basePrice).toBe(9500);

    // Verificamos que subscribeToServices también emita el fallback
    const emittedServices: ServiceItem[] = await new Promise((resolve) => {
      const unsub = subscribeToServices((data) => {
        if (data.length > 0) {
          unsub();
          resolve(data);
        }
      });
    });

    expect(emittedServices).toHaveLength(1);
    expect(emittedServices[0].name).toBe('Servicio Legacy desde Prices');
  });

  it('subscribeToServices escucha actualizaciones en tiempo real', async () => {
    const received = await new Promise<ServiceItem[]>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout esperando snapshot')), 6000);
      const unsubscribe = subscribeToServices((services) => {
        if (services.some((s) => s.name === 'Servicio Reactivo')) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(services);
        }
      });

      addService(createServiceDataFixture({ name: 'Servicio Reactivo' })).catch(reject);
    });

    expect(received.length).toBeGreaterThanOrEqual(1);
    expect(received.some((s) => s.name === 'Servicio Reactivo')).toBe(true);
  });
});
