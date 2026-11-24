import { describe, it, expect } from 'vitest';
import {
  areAuthUsersEqual,
  canManageTenantSettings,
  extractCustomClaims,
  getTenantRoleFromClaims,
  hasTenantAccess,
  mapFirebaseUser,
} from '../../src/services/auth';

describe('authClaims - extracción y validación de Custom Claims', () => {
  it('extractCustomClaims devuelve defaults seguros ante claims nulos o malformados', () => {
    expect(extractCustomClaims(null)).toEqual({ platformAdmin: false, tenants: {} });
    expect(extractCustomClaims(undefined)).toEqual({ platformAdmin: false, tenants: {} });
    expect(
      extractCustomClaims({
        platformAdmin: 'true',
        tenants: ['tnt_demo'],
      })
    ).toEqual({ platformAdmin: false, tenants: {} });
  });

  it('extractCustomClaims filtra tenantIds y roles inválidos', () => {
    const claims = extractCustomClaims({
      platformAdmin: false,
      tenants: {
        tnt_demo: 'owner',
        tnt_alpha1: 'staff',
        tnt_badrole: 'superadmin',
        invalid_key: 'owner',
        '../escape': 'owner',
        tnt_empty: '',
      },
    });

    expect(claims).toEqual({
      platformAdmin: false,
      tenants: {
        tnt_demo: 'owner',
        tnt_alpha1: 'staff',
      },
    });
  });

  it('diferencia correctamente permisos entre owner, staff, platformAdmin y usuarios ajenos', () => {
    const ownerUser = {
      platformAdmin: false,
      tenants: { tnt_alpha: 'owner' as const },
    };
    const staffUser = {
      platformAdmin: false,
      tenants: { tnt_alpha: 'staff' as const },
    };
    const platformAdminUser = {
      platformAdmin: true,
      tenants: {},
    };

    expect(getTenantRoleFromClaims(ownerUser, 'tnt_alpha')).toBe('owner');
    expect(hasTenantAccess(ownerUser, 'tnt_alpha')).toBe(true);
    expect(canManageTenantSettings(ownerUser, 'tnt_alpha')).toBe(true);

    expect(getTenantRoleFromClaims(ownerUser, 'tnt_beta')).toBeNull();
    expect(hasTenantAccess(ownerUser, 'tnt_beta')).toBe(false);
    expect(canManageTenantSettings(ownerUser, 'tnt_beta')).toBe(false);

    expect(getTenantRoleFromClaims(staffUser, 'tnt_alpha')).toBe('staff');
    expect(hasTenantAccess(staffUser, 'tnt_alpha')).toBe(true);
    expect(canManageTenantSettings(staffUser, 'tnt_alpha')).toBe(false);

    expect(getTenantRoleFromClaims(platformAdminUser, 'tnt_beta')).toBe('owner');
    expect(hasTenantAccess(platformAdminUser, 'tnt_beta')).toBe(true);
    expect(canManageTenantSettings(platformAdminUser, 'tnt_beta')).toBe(true);

    // Invalid tenantId is always rejected even for platformAdmin
    expect(getTenantRoleFromClaims(platformAdminUser, 'not-a-tenant')).toBeNull();
    expect(hasTenantAccess(platformAdminUser, '')).toBe(false);
  });

  it('mapFirebaseUser incluye platformAdmin y mapa tenants normalizado', () => {
    expect(mapFirebaseUser(null)).toBeNull();

    const mockUser = {
      uid: 'uid-owner-1',
      email: 'owner@estudio.com',
      displayName: null,
    };

    const mapped = mapFirebaseUser(
      mockUser as unknown as Parameters<typeof mapFirebaseUser>[0],
      {
        platformAdmin: true,
        tenants: { tnt_demo: 'owner', tnt_other: 'staff' },
      }
    );

    expect(mapped).toEqual({
      uid: 'uid-owner-1',
      email: 'owner@estudio.com',
      displayName: 'owner',
      platformAdmin: true,
      tenants: {
        tnt_demo: 'owner',
        tnt_other: 'staff',
      },
    });
  });

  it('areAuthUsersEqual detecta cambios en platformAdmin, uid o roles de tenants', () => {
    const base = {
      uid: 'u1',
      email: 'admin@turnosweb.com',
      displayName: 'Admin',
      platformAdmin: true,
      tenants: { tnt_demo: 'owner' as const },
    };

    expect(areAuthUsersEqual(base, { ...base, tenants: { tnt_demo: 'owner' } })).toBe(true);
    expect(areAuthUsersEqual(null, null)).toBe(true);
    expect(areAuthUsersEqual(base, null)).toBe(false);
    expect(areAuthUsersEqual(base, { ...base, platformAdmin: false })).toBe(false);
    expect(areAuthUsersEqual(base, { ...base, uid: 'u2' })).toBe(false);
    expect(areAuthUsersEqual(base, { ...base, tenants: { tnt_demo: 'staff' } })).toBe(false);
    expect(
      areAuthUsersEqual(base, { ...base, tenants: { tnt_demo: 'owner', tnt_alpha: 'owner' } })
    ).toBe(false);
  });
});
