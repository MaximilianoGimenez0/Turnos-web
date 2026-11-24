import { describe, expect, it } from 'vitest';
import {
  computePlatformMetrics,
  extractCallableErrorMessage,
  extractSuperAdminReadErrorMessage,
  filterTenants,
  isPermissionDeniedError,
  isValidIanaTimezone,
  normalizeTenantDoc,
  normalizeTenantMemberDoc,
  sortTenantMembers,
  suggestSlugFromBusinessName,
  validateChangeSlugInput,
  validateCreateTenantInput,
  validateUpdateTenantInput,
  validateUpsertMemberInput,
} from '../../src/services/superadminService';
import {
  mergePlatformAdminClaims,
  parseCliArgs,
} from '../../scripts/bootstrap-platform-admin.mjs';
import { createTenantDocFixture, createTenantMemberFixture } from '../setup/fixtures';

describe('superadminService - helpers puros y validaciones', () => {
  describe('suggestSlugFromBusinessName', () => {
    it('normaliza acentos, espacios y caracteres especiales en slug válido', () => {
      expect(suggestSlugFromBusinessName('Salón Magnolia & Co.')).toBe('salon-magnolia-co');
      expect(suggestSlugFromBusinessName('  Estudio   Áura  2026! ')).toBe('estudio-aura-2026');
    });

    it('recorta al máximo permitido sin dejar guiones al final', () => {
      const longName = 'Estudio de Belleza Integral y Estética Avanzada Buenos Aires Centro';
      const slug = suggestSlugFromBusinessName(longName);
      expect(slug.length).toBeLessThanOrEqual(40);
      expect(slug.endsWith('-')).toBe(false);
    });
  });

  describe('isValidIanaTimezone', () => {
    it('acepta zonas horarias IANA válidas y rechaza inválidas', () => {
      expect(isValidIanaTimezone('America/Argentina/Buenos_Aires')).toBe(true);
      expect(isValidIanaTimezone('UTC')).toBe(true);
      expect(isValidIanaTimezone('Europe/Madrid')).toBe(true);
      expect(isValidIanaTimezone('')).toBe(false);
      expect(isValidIanaTimezone('Mars/Olympus_Mons')).toBe(false);
    });
  });

  describe('validateCreateTenantInput', () => {
    it('valida correctamente un payload completo', () => {
      const result = validateCreateTenantInput({
        name: 'Salón Magnolia',
        slug: 'magnolia',
        ownerEmail: 'duena@magnolia.com',
        ownerPassword: 'Password123!',
        timezone: 'America/Argentina/Buenos_Aires',
        isDemo: false,
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('permite omitir ownerPassword cuando el usuario ya existe en Auth', () => {
      const result = validateCreateTenantInput({
        name: 'Salón Magnolia',
        slug: 'magnolia',
        ownerEmail: 'duena@magnolia.com',
      });
      expect(result.isValid).toBe(true);
    });

    it('rechaza slug reservado, email inválido, contraseña menor a 8 chars y timezone inválida', () => {
      const result = validateCreateTenantInput({
        name: 'A',
        slug: 'superadmin',
        ownerEmail: 'correo-invalido',
        ownerPassword: 'short',
        timezone: 'Invalid/Zone',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeTruthy();
      expect(result.errors.slug).toBeTruthy();
      expect(result.errors.ownerEmail).toBeTruthy();
      expect(result.errors.ownerPassword).toBeTruthy();
      expect(result.errors.timezone).toBeTruthy();
    });
  });

  describe('validateUpdateTenantInput', () => {
    it('valida tenantId con TENANT_ID_REGEX y campos editables', () => {
      expect(
        validateUpdateTenantInput({
          tenantId: 'tnt_demo',
          name: 'Estudio Demo',
          status: 'active',
          timezone: 'America/Argentina/Buenos_Aires',
          isDemo: true,
        }).isValid
      ).toBe(true);

      const invalid = validateUpdateTenantInput({
        tenantId: 'bad_id',
        name: 'X',
        timezone: 'Bad/Timezone',
      });
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors.tenantId).toBeTruthy();
      expect(invalid.errors.name).toBeTruthy();
      expect(invalid.errors.timezone).toBeTruthy();
    });
  });

  describe('validateChangeSlugInput', () => {
    it('rechaza slug igual al actual y slugs reservados', () => {
      const same = validateChangeSlugInput('tnt_alpha1', 'magnolia', 'magnolia');
      expect(same.isValid).toBe(false);
      expect(same.errors.newSlug).toBeTruthy();

      const reserved = validateChangeSlugInput('tnt_alpha1', 'admin', 'magnolia');
      expect(reserved.isValid).toBe(false);
      expect(reserved.errors.newSlug).toBeTruthy();

      const ok = validateChangeSlugInput('tnt_alpha1', 'magnolia-studio', 'magnolia');
      expect(ok.isValid).toBe(true);
    });
  });

  describe('validateUpsertMemberInput', () => {
    it('valida tenantId, email y rol permitido', () => {
      expect(
        validateUpsertMemberInput({
          tenantId: 'tnt_alpha1',
          email: 'staff@magnolia.com',
          role: 'staff',
          active: true,
        }).isValid
      ).toBe(true);

      const invalid = validateUpsertMemberInput({
        tenantId: 'invalid',
        email: 'no-email',
        role: 'guest' as 'staff',
        active: true,
      });
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors.tenantId).toBeTruthy();
      expect(invalid.errors.email).toBeTruthy();
      expect(invalid.errors.role).toBeTruthy();
    });
  });

  describe('computePlatformMetrics y filterTenants', () => {
    const tenants = [
      createTenantDocFixture({
        id: 'tnt_demo',
        slug: 'demo',
        name: 'Estudio Demo',
        status: 'active',
        isDemo: true,
        mpConfigured: true,
      }),
      createTenantDocFixture({
        id: 'tnt_magnolia',
        slug: 'magnolia-studio',
        previousSlugs: ['magnolia'],
        name: 'Salón Magnolia',
        status: 'active',
        isDemo: false,
        mpConfigured: true,
      }),
      createTenantDocFixture({
        id: 'tnt_aura',
        slug: 'estudio-aura',
        name: 'Estudio Aura',
        status: 'suspended',
        isDemo: false,
        mpConfigured: false,
      }),
    ];

    it('calcula métricas globales exactas', () => {
      expect(computePlatformMetrics(tenants)).toEqual({
        total: 3,
        active: 2,
        suspended: 1,
        mpConfigured: 2,
        demoCount: 1,
      });
    });

    it('filtra por estado y busca por nombre, slug, tenantId y previousSlugs', () => {
      expect(filterTenants(tenants, '', 'all')).toHaveLength(3);
      expect(filterTenants(tenants, '', 'active')).toHaveLength(2);
      expect(filterTenants(tenants, '', 'suspended').map((t) => t.id)).toEqual(['tnt_aura']);
      expect(filterTenants(tenants, '', 'demo').map((t) => t.id)).toEqual(['tnt_demo']);

      expect(filterTenants(tenants, 'tnt_aura', 'all').map((t) => t.id)).toEqual(['tnt_aura']);
      expect(filterTenants(tenants, 'magnolia', 'all').map((t) => t.id)).toEqual(['tnt_magnolia']);
      expect(filterTenants(tenants, 'ESTUDIO DEMO', 'active').map((t) => t.id)).toEqual([
        'tnt_demo',
      ]);
    });
  });

  describe('normalización y ordenamiento de documentos', () => {
    it('normaliza TenantDoc con valores seguros por defecto', () => {
      const normalized = normalizeTenantDoc('tnt_test1', {
        slug: 'test-studio',
        name: 'Test Studio',
        status: 'suspended',
        isDemo: true,
        mpConfigured: true,
        previousSlugs: ['old-slug', 123, ''],
      });
      expect(normalized.id).toBe('tnt_test1');
      expect(normalized.status).toBe('suspended');
      expect(normalized.previousSlugs).toEqual(['old-slug']);
      expect(normalized.isDemo).toBe(true);
      expect(normalized.mpConfigured).toBe(true);
    });

    it('ordena miembros priorizando activos y dueños antes que staff', () => {
      const members = [
        createTenantMemberFixture({ uid: 'u3', email: 'z@a.com', role: 'staff', active: false }),
        createTenantMemberFixture({ uid: 'u2', email: 'b@a.com', role: 'staff', active: true }),
        createTenantMemberFixture({ uid: 'u1', email: 'c@a.com', role: 'owner', active: true }),
      ];

      expect(sortTenantMembers(members).map((m) => m.uid)).toEqual(['u1', 'u2', 'u3']);

      const normalizedMember = normalizeTenantMemberDoc('uid-x', {
        email: '  USER@Example.com ',
        role: 'owner',
      });
      expect(normalizedMember.email).toBe('user@example.com');
      expect(normalizedMember.active).toBe(true);
    });

    it('formatea mensajes de error de callables limpiamente', () => {
      expect(
        extractCallableErrorMessage({ code: 'functions/permission-denied', message: 'denied' }, 'fallback')
      ).toContain('permisos');
      expect(
        extractCallableErrorMessage(new Error('FirebaseError: El slug ya está en uso.'), 'fallback')
      ).toBe('El slug ya está en uso.');
      expect(extractCallableErrorMessage(null, 'fallback')).toBe('fallback');
    });

    it('distingue permission-denied sin claim vs con claim SuperAdmin verificado', () => {
      expect(isPermissionDeniedError({ code: 'permission-denied' })).toBe(true);
      expect(isPermissionDeniedError({ code: 'functions/permission-denied' })).toBe(true);
      expect(isPermissionDeniedError(new Error('Missing or insufficient permissions.'))).toBe(true);
      expect(isPermissionDeniedError({ code: 'unavailable', message: 'offline' })).toBe(false);

      const withoutClaim = extractSuperAdminReadErrorMessage(
        { code: 'permission-denied', message: 'Missing or insufficient permissions.' },
        { fallback: 'fallback', hasVerifiedPlatformClaim: false }
      );
      expect(withoutClaim).toContain('No tenés permisos de administrador de plataforma');

      const withVerifiedClaim = extractSuperAdminReadErrorMessage(
        { code: 'permission-denied', message: 'Missing or insufficient permissions.' },
        { fallback: 'fallback', hasVerifiedPlatformClaim: true }
      );
      expect(withVerifiedClaim).toContain('firestore.rules');
      expect(withVerifiedClaim).not.toContain('No tenés permisos de administrador de plataforma');

      const networkErr = extractSuperAdminReadErrorMessage(
        { code: 'unavailable', message: 'Servicio temporalmente no disponible' },
        { fallback: 'fallback', hasVerifiedPlatformClaim: true }
      );
      expect(networkErr).toBe('Servicio temporalmente no disponible');
    });
  });
});

describe('bootstrap-platform-admin CLI helpers', () => {
  it('parsea flags --email, --uid, --project y --revoke', () => {
    expect(
      parseCliArgs(['--email', 'Admin@TurnosWeb.com', '--project=turnos-web-eb8b5'])
    ).toEqual({
      email: 'admin@turnosweb.com',
      uid: '',
      project: 'turnos-web-eb8b5',
      revoke: false,
      help: false,
    });

    expect(parseCliArgs(['--uid', 'uid_123', '--revoke'])).toEqual({
      email: '',
      uid: 'uid_123',
      project: '',
      revoke: true,
      help: false,
    });

    expect(() => parseCliArgs(['--unknown'])).toThrow(/Argumento desconocido/);
    expect(() => parseCliArgs(['--email'])).toThrow(/requiere un valor/);
  });

  it('fusiona platformAdmin preservando el mapa tenants existente', () => {
    const promoted = mergePlatformAdminClaims(
      { tenants: { tnt_demo: 'owner', tnt_other: 'staff' } },
      false
    );
    expect(promoted).toEqual({
      tenants: { tnt_demo: 'owner', tnt_other: 'staff' },
      platformAdmin: true,
    });

    const revoked = mergePlatformAdminClaims(promoted, true);
    expect(revoked).toEqual({
      tenants: { tnt_demo: 'owner', tnt_other: 'staff' },
      platformAdmin: false,
    });
  });
});
