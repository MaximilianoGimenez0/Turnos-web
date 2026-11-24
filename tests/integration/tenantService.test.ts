import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  clearTenantNegativeCache,
  getCachedTenantResolution,
  invalidateTenantBootstrapCache,
  resolveTenantBySlug,
} from '../../src/services/tenantService';
import { clearPublicCache } from '../../src/services/publicCache';
import { initTestEmulators } from '../setup/emulatorConfig';
import { resetTestEnvironment, seedTestTenant } from '../setup/testEnvironment';

describe('Integración - tenantService con Firestore Emulator', () => {
  beforeAll(async () => {
    initTestEmulators();
    await resetTestEnvironment();

    await seedTestTenant({
      tenantId: 'tnt_demo',
      slug: 'demo',
      name: 'Estudio Demo',
      status: 'active',
      isDemo: true,
      mpConfigured: true,
      ownerProfile: {
        businessName: 'Estudio Demo Oficial',
        name: 'Camila Demo',
      },
    });

    await seedTestTenant({
      tenantId: 'tnt_paused',
      slug: 'salon-pausado',
      name: 'Salón Pausado',
      status: 'suspended',
      isDemo: false,
      mpConfigured: false,
      ownerProfile: {
        businessName: 'Salón Pausado Beauty',
      },
    });

    await seedTestTenant({
      tenantId: 'tnt_renamed',
      slug: 'nuevo-estudio',
      name: 'Nuevo Estudio',
      status: 'active',
      isDemo: false,
      mpConfigured: true,
    });

    await seedTestTenant({
      tenantId: 'tnt_renamed',
      slug: 'viejo-estudio',
      name: 'Nuevo Estudio',
      status: 'active',
      redirectToSlug: 'nuevo-estudio',
    });
  });

  beforeEach(() => {
    clearPublicCache();
    clearTenantNegativeCache();
  });

  it('resuelve un tenant activo en 1 lectura y lo cachea por slug', async () => {
    const first = await resolveTenantBySlug('demo');
    expect(first.status).toBe('active');
    if (first.status !== 'active') return;

    expect(first.fromCache).toBe(false);
    expect(first.tenant.tenantId).toBe('tnt_demo');
    expect(first.tenant.slug).toBe('demo');
    expect(first.tenant.mpConfigured).toBe(true);
    expect(first.tenant.ownerProfile.businessName).toBe('Estudio Demo Oficial');

    // Segunda resolución debe responder desde caché sin golpear red
    const second = await resolveTenantBySlug('DEMO');
    expect(second.status).toBe('active');
    if (second.status !== 'active') return;
    expect(second.fromCache).toBe(true);
    expect(second.tenant.tenantId).toBe('tnt_demo');
  });

  it('resuelve un tenant suspendido con status suspended', async () => {
    const result = await resolveTenantBySlug('salon-pausado');
    expect(result.status).toBe('suspended');
    if (result.status !== 'suspended') return;

    expect(result.tenant.tenantId).toBe('tnt_paused');
    expect(result.tenant.ownerProfile.businessName).toBe('Salón Pausado Beauty');
  });

  it('resuelve un slug antiguo con redirectToSlug hacia el nuevo slug', async () => {
    const result = await resolveTenantBySlug('viejo-estudio');
    expect(result.status).toBe('redirect');
    if (result.status !== 'redirect') return;

    expect(result.fromSlug).toBe('viejo-estudio');
    expect(result.toSlug).toBe('nuevo-estudio');
  });

  it('resuelve un slug inexistente como not_found y registra caché negativa en memoria', async () => {
    const result = await resolveTenantBySlug('slug-que-no-existe');
    expect(result).toEqual({
      status: 'not_found',
      slug: 'slug-que-no-existe',
    });

    // Caché negativa evita re-lecturas inmediatas
    expect(getCachedTenantResolution('slug-que-no-existe')).toEqual({
      status: 'not_found',
      slug: 'slug-que-no-existe',
    });

    invalidateTenantBootstrapCache('slug-que-no-existe');
    expect(getCachedTenantResolution('slug-que-no-existe')).toBeNull();
  });
});
