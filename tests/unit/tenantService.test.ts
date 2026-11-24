import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildPublicCacheKey,
  clearPublicCache,
  PUBLIC_CACHE_KEYS,
  PUBLIC_CACHE_PREFIX,
  readPublicCache,
  writePublicCache,
} from '../../src/services/publicCache';
import {
  buildTenantPath,
  classifyTenantBootstrap,
  clearTenantNegativeCache,
  getCachedTenantResolution,
  getSlugCacheScope,
  invalidateTenantBootstrapCache,
  isValidTenantSlugFormat,
  normalizePublicSlugParam,
  parsePaymentExternalReference,
} from '../../src/services/tenantService';
import type { TenantSlugBootstrapDoc } from '../../src/types';

const makeBootstrap = (
  overrides?: Partial<TenantSlugBootstrapDoc>
): TenantSlugBootstrapDoc => ({
  tenantId: 'tnt_demo',
  slug: 'demo',
  status: 'active',
  redirectToSlug: null,
  timezone: 'America/Argentina/Buenos_Aires',
  currency: 'ARS',
  mpConfigured: true,
  isDemo: true,
  ownerProfile: { businessName: 'Estudio Demo' },
  updatedAt: '2026-11-24T00:00:00.000Z',
  ...overrides,
});

describe('tenantService & publicCache (Unidad)', () => {
  beforeEach(() => {
    clearPublicCache();
    clearTenantNegativeCache();
  });

  describe('buildTenantPath', () => {
    it('construye rutas raíz y subrutas normalizadas para un tenant', () => {
      expect(buildTenantPath('demo')).toBe('/demo');
      expect(buildTenantPath('demo', '')).toBe('/demo');
      expect(buildTenantPath('demo', '/')).toBe('/demo');
      expect(buildTenantPath('demo', '/prices')).toBe('/demo/prices');
      expect(buildTenantPath('demo', 'prices')).toBe('/demo/prices');
      expect(buildTenantPath('demo', '/payment/success')).toBe('/demo/payment/success');
      expect(buildTenantPath('  Estudio-Norte  ', '/about')).toBe('/estudio-norte/about');
    });
  });

  describe('parsePaymentExternalReference', () => {
    it('separa correctamente tenantId y slotId del formato tenantId:slotId', () => {
      expect(parsePaymentExternalReference('tnt_a:slot1')).toEqual({
        tenantId: 'tnt_a',
        slotId: 'slot1',
      });
      expect(parsePaymentExternalReference('tnt_demo:slot:extra')).toEqual({
        tenantId: 'tnt_demo',
        slotId: 'slot:extra',
      });
    });

    it('soporta formato legacy sin prefijo de tenantId y entradas vacías', () => {
      expect(parsePaymentExternalReference('slot-only')).toEqual({ slotId: 'slot-only' });
      expect(parsePaymentExternalReference('')).toEqual({});
      expect(parsePaymentExternalReference(null)).toEqual({});
      expect(parsePaymentExternalReference(undefined)).toEqual({});
    });
  });

  describe('validación rápida de formato de slug', () => {
    it('acepta slugs públicos válidos y rechaza formatos inválidos o reservados', () => {
      expect(normalizePublicSlugParam('  Estudio-Sur  ')).toBe('estudio-sur');
      expect(isValidTenantSlugFormat('demo')).toBe(true);
      expect(isValidTenantSlugFormat('estudio-belleza-2026')).toBe(true);

      expect(isValidTenantSlugFormat('ab')).toBe(false);
      expect(isValidTenantSlugFormat('Estudio_Mal')).toBe(false);
      expect(isValidTenantSlugFormat('con--guion')).toBe(false);
      expect(isValidTenantSlugFormat('superadmin')).toBe(false);
      expect(isValidTenantSlugFormat('admin')).toBe(false);
      expect(isValidTenantSlugFormat('prices')).toBe(false);
    });

    it('resuelve slugs con formato inválido como not_found sin consultar Firestore', () => {
      expect(getCachedTenantResolution('!!invalido!!')).toEqual({
        status: 'not_found',
        slug: '!!invalido!!',
      });
      expect(getCachedTenantResolution('superadmin')).toEqual({
        status: 'not_found',
        slug: 'superadmin',
      });
    });
  });

  describe('classifyTenantBootstrap', () => {
    it('clasifica correctamente active, suspended y redirect', () => {
      const activeRes = classifyTenantBootstrap(makeBootstrap(), false);
      expect(activeRes.status).toBe('active');

      const suspendedRes = classifyTenantBootstrap(
        makeBootstrap({ status: 'suspended' }),
        true
      );
      expect(suspendedRes.status).toBe('suspended');

      const redirectRes = classifyTenantBootstrap(
        makeBootstrap({ slug: 'viejo', redirectToSlug: 'nuevo' }),
        false
      );
      expect(redirectRes).toMatchObject({
        status: 'redirect',
        fromSlug: 'viejo',
        toSlug: 'nuevo',
      });
    });
  });

  describe('publicCache particionada por scopeKey', () => {
    it('genera claves con prefijo turnos_pub_v2:<scopeKey>:<resource>', () => {
      expect(buildPublicCacheKey('tnt_a', PUBLIC_CACHE_KEYS.services)).toBe(
        `${PUBLIC_CACHE_PREFIX}:tnt_a:services`
      );
      expect(buildPublicCacheKey('slug:demo', PUBLIC_CACHE_KEYS.bootstrap)).toBe(
        `${PUBLIC_CACHE_PREFIX}:slug:demo:bootstrap`
      );
    });

    it('aísla completamente las entradas entre tenantA y tenantB sin fugas', () => {
      writePublicCache('tnt_a', PUBLIC_CACHE_KEYS.services, [{ id: 's1', name: 'Servicio A' }]);
      writePublicCache('tnt_b', PUBLIC_CACHE_KEYS.services, [{ id: 's2', name: 'Servicio B' }]);

      expect(readPublicCache('tnt_a', PUBLIC_CACHE_KEYS.services)).toEqual([
        { id: 's1', name: 'Servicio A' },
      ]);
      expect(readPublicCache('tnt_b', PUBLIC_CACHE_KEYS.services)).toEqual([
        { id: 's2', name: 'Servicio B' },
      ]);

      // Limpiar solo tenantA no afecta a tenantB
      clearPublicCache('tnt_a', PUBLIC_CACHE_KEYS.services);
      expect(readPublicCache('tnt_a', PUBLIC_CACHE_KEYS.services)).toBeNull();
      expect(readPublicCache('tnt_b', PUBLIC_CACHE_KEYS.services)).toEqual([
        { id: 's2', name: 'Servicio B' },
      ]);
    });

    it('invalida el bootstrap de un slug específico sin afectar otros slugs', () => {
      writePublicCache(
        getSlugCacheScope('estudio-a'),
        PUBLIC_CACHE_KEYS.bootstrap,
        makeBootstrap({ tenantId: 'tnt_a', slug: 'estudio-a' })
      );
      writePublicCache(
        getSlugCacheScope('estudio-b'),
        PUBLIC_CACHE_KEYS.bootstrap,
        makeBootstrap({ tenantId: 'tnt_b', slug: 'estudio-b' })
      );

      expect(getCachedTenantResolution('estudio-a')?.status).toBe('active');
      expect(getCachedTenantResolution('estudio-b')?.status).toBe('active');

      invalidateTenantBootstrapCache('estudio-a');

      expect(getCachedTenantResolution('estudio-a')).toBeNull();
      expect(getCachedTenantResolution('estudio-b')?.status).toBe('active');
    });
  });
});
