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
import type { AuthUser } from '../../src/types';

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
    const mapped = mapFirebaseUser(mockFirebaseUser as unknown as Parameters<typeof mapFirebaseUser>[0]);
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

    const logoutPromise = new Promise<AuthUser | null>((resolve) => {
      const unsubscribe = onAuthChange((user) => {
        if (user === null) {
          unsubscribe();
          resolve(user);
        }
      });
    });

    await logout();
    const currentUser = await logoutPromise;
    expect(currentUser).toBeNull();
  });

  it('onAuthChange emite el usuario tras login exitoso', async () => {
    await createTestUser(testEmail, testPassword);

    const authPromise = new Promise<AuthUser>((resolve) => {
      const unsubscribe = onAuthChange((user) => {
        if (user && user.email === testEmail) {
          unsubscribe();
          resolve(user);
        }
      });
    });

    await loginWithEmail(testEmail, testPassword);
    const observedUser = await authPromise;

    expect(observedUser).not.toBeNull();
    expect(observedUser.email).toBe(testEmail);
  });
});
