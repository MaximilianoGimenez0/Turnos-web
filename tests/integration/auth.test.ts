import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  loginWithEmail,
  logout,
  onAuthChange,
  mapFirebaseUser,
} from '../../src/services/auth';
import { initTestEmulators } from '../setup/emulatorConfig';
import {
  resetTestEnvironment,
  createTestUser,
} from '../setup/testEnvironment';

describe('Integración - authService con Firebase Auth Emulator', () => {
  const testEmail = 'admin@turnosweb.com';
  const testPassword = 'Password123!';

  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await resetTestEnvironment();
  });

  it('mapFirebaseUser mapea correctamente un usuario nulo o con datos', () => {
    expect(mapFirebaseUser(null)).toBeNull();

    const mockFirebaseUser = {
      uid: 'u-123',
      email: 'owner@estudio.com',
      displayName: 'Dueña Estudio',
    };
    const mapped = mapFirebaseUser(mockFirebaseUser as any);
    expect(mapped).toEqual({
      uid: 'u-123',
      email: 'owner@estudio.com',
      displayName: 'Dueña Estudio',
    });
  });

  it('inicia sesión exitosamente con credenciales válidas y recupera AuthUser', async () => {
    await createTestUser(testEmail, testPassword);

    const user = await loginWithEmail(testEmail, testPassword);
    expect(user).toBeDefined();
    expect(user.email).toBe(testEmail);
    expect(user.uid).toBeTruthy();
  });

  it('falla al iniciar sesión con contraseña incorrecta', async () => {
    await createTestUser(testEmail, testPassword);

    await expect(
      loginWithEmail(testEmail, 'WrongPassword999!')
    ).rejects.toThrow();
  });

  it('cierra sesión correctamente mediante logout()', async () => {
    await createTestUser(testEmail, testPassword);
    await loginWithEmail(testEmail, testPassword);

    await logout();

    let currentUser: any = undefined;
    const unsubscribe = onAuthChange((user) => {
      currentUser = user;
    });

    // Esperar a que el observer se sincronice
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(currentUser).toBeNull();
    unsubscribe();
  });

  it('onAuthChange emite el usuario tras login exitoso', async () => {
    await createTestUser(testEmail, testPassword);

    let observedUser: any = null;
    const unsubscribe = onAuthChange((user) => {
      observedUser = user;
    });

    await loginWithEmail(testEmail, testPassword);
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(observedUser).not.toBeNull();
    expect(observedUser.email).toBe(testEmail);
    unsubscribe();
  });
});
