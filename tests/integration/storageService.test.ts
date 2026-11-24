import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { getDownloadURL, ref } from 'firebase/storage';
import {
  deleteImageFromStorage,
  getStorageInstance,
  uploadImageToStorage,
} from '../../src/services/storageService';
import { initTestEmulators } from '../setup/emulatorConfig';
import {
  createTestUserWithClaims,
  resetTestEnvironment,
  signInTestUserWithClaims,
  signOutTestUser,
} from '../setup/testEnvironment';

describe('Integración - storageService multi-tenant con Storage Emulator', () => {
  const password = 'Password123!';
  const ownerAEmail = 'owner-storage-a@turnosweb.com';
  const staffAEmail = 'staff-storage-a@turnosweb.com';
  const ownerBEmail = 'owner-storage-b@turnosweb.com';
  const tenantAId = 'tnt_stora';
  const tenantBId = 'tnt_storb';

  const makeMockJpeg = (name = 'test_foto.jpg') =>
    new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], name, {
      type: 'image/jpeg',
    });

  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await resetTestEnvironment();

    await createTestUserWithClaims(ownerAEmail, password, {
      tenants: { [tenantAId]: 'owner' },
    });
    await createTestUserWithClaims(staffAEmail, password, {
      tenants: { [tenantAId]: 'staff' },
    });
    await createTestUserWithClaims(ownerBEmail, password, {
      tenants: { [tenantBId]: 'owner' },
    });
    await signOutTestUser();
  });

  it('falla si se intenta subir un archivo nulo o tenantId inválido', async () => {
    await signInTestUserWithClaims(ownerAEmail, password);

    await expect(
      uploadImageToStorage(tenantAId, null as unknown as File, 'portfolio')
    ).rejects.toThrow('No se seleccionó ningún archivo para subir.');

    await expect(
      uploadImageToStorage('invalid-id', makeMockJpeg(), 'portfolio')
    ).rejects.toThrow(/tenantId válido/);
  });

  it('permite a ownerA subir y eliminar imágenes exclusivamente dentro de tenants/tnt_stora/...', async () => {
    await signInTestUserWithClaims(ownerAEmail, password);

    const downloadUrl = await uploadImageToStorage(tenantAId, makeMockJpeg('mi_logo.jpg'), 'logo');
    expect(downloadUrl).toBeTruthy();

    const uploadedRef = ref(getStorageInstance(), downloadUrl);
    expect(uploadedRef.fullPath).toMatch(new RegExp(`^tenants/${tenantAId}/logo/\\d+_mi_logo\\.jpg$`));

    await deleteImageFromStorage(tenantAId, downloadUrl);
    await expect(getDownloadURL(uploadedRef)).rejects.toMatchObject({
      code: 'storage/object-not-found',
    });
  });

  it('bloquea con storage/unauthorized la subida cross-tenant y la subida por staff', async () => {
    await signInTestUserWithClaims(ownerAEmail, password);
    await expect(
      uploadImageToStorage(tenantBId, makeMockJpeg('intrusion.jpg'), 'portfolio')
    ).rejects.toMatchObject({ code: 'storage/unauthorized' });

    await signInTestUserWithClaims(staffAEmail, password);
    await expect(
      uploadImageToStorage(tenantAId, makeMockJpeg('staff_attempt.jpg'), 'portfolio')
    ).rejects.toMatchObject({ code: 'storage/unauthorized' });
  });

  it('deleteImageFromStorage aborta sin borrar objetos pertenecientes a otro tenant o URLs externas', async () => {
    // ownerB uploads a file in tenantB
    await signInTestUserWithClaims(ownerBEmail, password);
    const tenantBUrl = await uploadImageToStorage(tenantBId, makeMockJpeg('privada.jpg'), 'hero');
    const tenantBRef = ref(getStorageInstance(), tenantBUrl);

    // ownerA attempts to delete tenantBUrl passing tenantAId -> client guard blocks it
    await signInTestUserWithClaims(ownerAEmail, password);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(deleteImageFromStorage(tenantAId, tenantBUrl)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();

    // Object in tenantB must still exist
    const stillAccessibleUrl = await getDownloadURL(tenantBRef);
    expect(stillAccessibleUrl).toBeTruthy();

    // External/empty URLs resolve safely
    await expect(
      deleteImageFromStorage(tenantAId, 'https://images.unsplash.com/photo-123')
    ).resolves.toBeUndefined();
    await expect(deleteImageFromStorage(tenantAId, '')).resolves.toBeUndefined();
  });
});
