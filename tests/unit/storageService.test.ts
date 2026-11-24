import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildTenantStoragePath,
  compressImageForUpload,
  deleteImageFromStorage,
  isTenantStoragePath,
  MAX_STORAGE_UPLOAD_BYTES,
  uploadImageToStorage,
} from '../../src/services/storageService';
import {
  clearPublicCache,
  PUBLIC_CACHE_KEYS,
  readPublicCache,
  writePublicCache,
} from '../../src/services/publicCache';

describe('storageService y publicCache (multi-tenant)', () => {
  beforeEach(() => {
    clearPublicCache();
  });

  it('compressImageForUpload preserva archivos SVG sin rasterizar', async () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';
    const svgFile = new File([svgContent], 'logo.svg', { type: 'image/svg+xml' });

    const result = await compressImageForUpload(svgFile, 'logo');
    expect(result).toBe(svgFile);
    expect(result.type).toBe('image/svg+xml');
    expect(result.name).toBe('logo.svg');
  });

  it('compressImageForUpload devuelve el archivo original de forma segura en entornos sin Canvas/DOM', async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const jpgFile = new File([bytes], 'foto-trabajo.jpg', { type: 'image/jpeg' });

    const result = await compressImageForUpload(jpgFile, 'portfolio');
    expect(result).toBe(jpgFile);
    expect(MAX_STORAGE_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });

  it('buildTenantStoragePath genera rutas aisladas bajo tenants/{tenantId}/{folder}/...', () => {
    const path = buildTenantStoragePath('tnt_alpha', 'logo', 'mi logo especial!.png');
    expect(path).toMatch(/^tenants\/tnt_alpha\/logo\/\d+_mi_logo_especial_.png$/);

    expect(() => buildTenantStoragePath('invalid_tenant', 'logo', 'a.png')).toThrow(
      /tenantId válido/
    );
  });

  it('isTenantStoragePath valida estrictamente el prefijo del tenant', () => {
    expect(isTenantStoragePath('tnt_alpha', 'tenants/tnt_alpha/logo/123_logo.webp')).toBe(true);
    expect(isTenantStoragePath('tnt_alpha', '/tenants/tnt_alpha/hero/123_hero.webp')).toBe(true);
    expect(isTenantStoragePath('tnt_alpha', 'tenants/tnt_beta/logo/123_logo.webp')).toBe(false);
    expect(isTenantStoragePath('tnt_alpha', 'tenants/tnt_alpha2/logo/123_logo.webp')).toBe(false);
    expect(isTenantStoragePath('tnt_alpha', 'default/images/logo-fallback.svg')).toBe(false);
    expect(isTenantStoragePath('invalid', 'tenants/invalid/logo/123.webp')).toBe(false);
  });

  it('uploadImageToStorage rechaza tenantId inválido antes de tocar Storage', async () => {
    const jpgFile = new File([new Uint8Array([0xff, 0xd8])], 'foto.jpg', { type: 'image/jpeg' });
    await expect(uploadImageToStorage('bad-id', jpgFile, 'portfolio')).rejects.toThrow(
      /tenantId válido/
    );
  });

  it('deleteImageFromStorage ignora URLs locales, externas o con tenantId inválido sin tocar Firebase Storage', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(deleteImageFromStorage('tnt_demo', '')).resolves.toBeUndefined();
    await expect(
      deleteImageFromStorage('tnt_demo', '/default/images/logo-fallback.svg')
    ).resolves.toBeUndefined();
    await expect(
      deleteImageFromStorage('tnt_demo', 'https://example.com/photo.jpg')
    ).resolves.toBeUndefined();
    await expect(
      deleteImageFromStorage('invalid-id', 'https://firebasestorage.googleapis.com/v0/b/x/o/y')
    ).resolves.toBeUndefined();
    warnSpy.mockRestore();
  });

  it('publicCache almacena, expira según TTL y limpia entradas correctamente', () => {
    const scopeKey = 'tnt_demo';
    expect(readPublicCache(scopeKey, PUBLIC_CACHE_KEYS.services)).toBeNull();

    const sample = [{ id: 's1', name: 'Lifting' }];
    writePublicCache(scopeKey, PUBLIC_CACHE_KEYS.services, sample);

    expect(readPublicCache(scopeKey, PUBLIC_CACHE_KEYS.services, 60_000)).toEqual(sample);
    expect(readPublicCache(scopeKey, PUBLIC_CACHE_KEYS.services, 0)).toBeNull();

    writePublicCache(scopeKey, PUBLIC_CACHE_KEYS.ownerInfo, { value: { name: 'Sofía' } });
    clearPublicCache(scopeKey, PUBLIC_CACHE_KEYS.ownerInfo);
    expect(readPublicCache(scopeKey, PUBLIC_CACHE_KEYS.ownerInfo)).toBeNull();
  });
});
