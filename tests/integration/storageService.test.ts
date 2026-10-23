import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  uploadImageToStorage,
  deleteImageFromStorage,
} from '../../src/services/storageService';
import { initTestEmulators } from '../setup/emulatorConfig';
import { setupAuthenticatedAdmin } from '../setup/testEnvironment';

describe('Integración - storageService con Storage Emulator', () => {
  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await setupAuthenticatedAdmin();
  });

  it('falla si se intenta subir un archivo nulo o indefinido', async () => {
    await expect(
      uploadImageToStorage(null as unknown as File, 'portfolio')
    ).rejects.toThrow('No se seleccionó ningún archivo para subir.');
  });

  it('sube una imagen al emulador de Storage y devuelve una URL accesible', async () => {
    const fileContent = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // Fake JPEG header
    const mockFile = new File([fileContent], 'test_foto.jpg', { type: 'image/jpeg' });

    const downloadUrl = await uploadImageToStorage(mockFile, 'portfolio');
    expect(downloadUrl).toBeTruthy();
    expect(typeof downloadUrl).toBe('string');
  });

  it('deleteImageFromStorage ignora de forma segura URLs que no provienen de Firebase Storage', async () => {
    // No debe lanzar error
    await expect(deleteImageFromStorage('https://images.unsplash.com/photo-123')).resolves.toBeUndefined();
    await expect(deleteImageFromStorage('')).resolves.toBeUndefined();
  });
});
