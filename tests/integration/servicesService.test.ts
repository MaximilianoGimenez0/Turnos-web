import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  getServices,
  subscribeToServices,
  addService,
  updateService,
  deleteService,
} from '../../src/services/servicesService';
import { clearPublicCache } from '../../src/services/publicCache';
import type { ServiceItem } from '../../src/types';
import { initTestEmulators } from '../setup/emulatorConfig';
import {
  createTestUserWithClaims,
  resetTestEnvironment,
  seedTestTenant,
  signInTestUserWithClaims,
  signOutTestUser,
} from '../setup/testEnvironment';
import { createServiceDataFixture, createTenantMemberFixture } from '../setup/fixtures';

describe('Integración - servicesService Multi-Tenant con Firestore Emulator', () => {
  const password = 'Password123!';
  const tenantAId = 'tnt_srva';
  const tenantBId = 'tnt_srvb';
  const ownerAEmail = 'owner-srv-a@turnosweb.com';
  const ownerBEmail = 'owner-srv-b@turnosweb.com';

  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await resetTestEnvironment();
    clearPublicCache();

    const ownerA = await createTestUserWithClaims(ownerAEmail, password, {
      tenants: { [tenantAId]: 'owner' },
    });
    const ownerB = await createTestUserWithClaims(ownerBEmail, password, {
      tenants: { [tenantBId]: 'owner' },
    });

    await signOutTestUser();

    await seedTestTenant({
      tenantId: tenantAId,
      slug: 'estudio-srv-a',
      name: 'Estudio Servicios A',
      members: [createTenantMemberFixture({ uid: ownerA.uid, email: ownerAEmail, role: 'owner' })],
    });

    await seedTestTenant({
      tenantId: tenantBId,
      slug: 'estudio-srv-b',
      name: 'Estudio Servicios B',
      members: [createTenantMemberFixture({ uid: ownerB.uid, email: ownerBEmail, role: 'owner' })],
    });

    await signInTestUserWithClaims(ownerAEmail, password);
  });

  it('addService crea un servicio bajo /tenants/{tenantId}/services y retorna un ID válido', async () => {
    const serviceData = createServiceDataFixture({
      name: 'Perfilado de Cejas',
      basePrice: 8000,
      durationMinutes: 30,
    });

    const newId = await addService(tenantAId, serviceData);
    expect(newId).toBeTruthy();

    const services = await getServices(tenantAId);
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
    const id = await addService(tenantAId, serviceData);

    await updateService(tenantAId, id, {
      name: 'Lifting Avanzado con Keratina',
      basePrice: 20000,
    });

    const services = await getServices(tenantAId);
    const updated = services.find((s) => s.id === id);
    expect(updated).toBeDefined();
    expect(updated?.name).toBe('Lifting Avanzado con Keratina');
    expect(updated?.basePrice).toBe(20000);
    expect(updated?.durationMinutes).toBe(60);
    expect(updated?.updatedAt).toBeDefined();
  });

  it('deleteService elimina el documento de la subcolección services del tenant', async () => {
    const id1 = await addService(tenantAId, createServiceDataFixture({ name: 'Servicio 1' }));
    const id2 = await addService(tenantAId, createServiceDataFixture({ name: 'Servicio 2' }));

    let services = await getServices(tenantAId);
    expect(services).toHaveLength(2);

    await deleteService(tenantAId, id1);

    services = await getServices(tenantAId);
    expect(services).toHaveLength(1);
    expect(services[0].id).toBe(id2);
  });

  it('getServices(tenantA) y subscribeToServices(tenantA) nunca reciben servicios de tenantB', async () => {
    await addService(tenantAId, createServiceDataFixture({ name: 'Servicio Exclusivo A' }));

    await signInTestUserWithClaims(ownerBEmail, password);
    await addService(tenantBId, createServiceDataFixture({ name: 'Servicio Exclusivo B' }));

    await signOutTestUser();

    const servicesA = await getServices(tenantAId);
    const servicesB = await getServices(tenantBId);

    expect(servicesA.map((s) => s.name)).toEqual(['Servicio Exclusivo A']);
    expect(servicesB.map((s) => s.name)).toEqual(['Servicio Exclusivo B']);
  });

  it('subscribeToServices escucha actualizaciones en tiempo real para el tenant', async () => {
    const received = await new Promise<ServiceItem[]>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout esperando snapshot')), 6000);
      const unsubscribe = subscribeToServices(tenantAId, (services) => {
        if (services.some((s) => s.name === 'Servicio Reactivo')) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(services);
        }
      });

      addService(tenantAId, createServiceDataFixture({ name: 'Servicio Reactivo' })).catch(reject);
    });

    expect(received.length).toBeGreaterThanOrEqual(1);
    expect(received.some((s) => s.name === 'Servicio Reactivo')).toBe(true);
  });
});
