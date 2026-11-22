import { describe, it, expect, beforeEach } from 'vitest';
import {
  compressImageForUpload,
  deleteImageFromStorage,
  MAX_STORAGE_UPLOAD_BYTES,
} from '../../src/services/storageService';
import {
  clearPublicCache,
  PUBLIC_CACHE_KEYS,
  readPublicCache,
  writePublicCache,
} from '../../src/services/publicCache';

describe('storageService y publicCache (OPT-03, OPT-11, OPT-13)', () => {
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

  it('deleteImageFromStorage ignora URLs locales o externas sin tocar Firebase Storage', async () => {
    await expect(deleteImageFromStorage('')).resolves.toBeUndefined();
    await expect(deleteImageFromStorage('/default/hero.webp')).resolves.toBeUndefined();
    await expect(deleteImageFromStorage('https://example.com/photo.jpg')).resolves.toBeUndefined();
  });

  it('publicCache almacena, expira según TTL y limpia entradas correctamente', () => {
    expect(readPublicCache(PUBLIC_CACHE_KEYS.services)).toBeNull();

    const sample = [{ id: 's1', name: 'Lifting' }];
    writePublicCache(PUBLIC_CACHE_KEYS.services, sample);

    expect(readPublicCache(PUBLIC_CACHE_KEYS.services, 60_000)).toEqual(sample);
    // TTL de 0ms expira de inmediato
    expect(readPublicCache(PUBLIC_CACHE_KEYS.services, 0)).toBeNull();

    writePublicCache(PUBLIC_CACHE_KEYS.ownerInfo, { value: { name: 'Sofía' } });
    clearPublicCache(PUBLIC_CACHE_KEYS.ownerInfo);
    expect(readPublicCache(PUBLIC_CACHE_KEYS.ownerInfo)).toBeNull();
  });
});
