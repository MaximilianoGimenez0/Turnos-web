import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../../src/services/firebaseConfig';
import { initTestEmulators } from '../setup/emulatorConfig';
import {
  resetTestEnvironment,
  createTestUser,
  signInTestUser,
  signOutTestUser,
} from '../setup/testEnvironment';

describe('Integración - Security Rules (firestore.rules)', () => {
  const adminEmail = 'admin@turnosweb.com';
  const adminPassword = 'Password123!';

  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await resetTestEnvironment();
  });

  describe('Lectura pública (Unauthenticated Read)', () => {
    it('permite lectura pública de colecciones sin estar autenticado', async () => {
      await signOutTestUser();

      // Lectura pública de /services
      const servicesSnap = await getDocs(collection(db, 'services'));
      expect(servicesSnap.empty).toBe(true);

      // Lectura pública de /slots
      const slotsSnap = await getDocs(collection(db, 'slots'));
      expect(slotsSnap.empty).toBe(true);
    });
  });

  describe('Escritura protegida (Authentication Required)', () => {
    it('bloquea escrituras directas de usuarios anónimos en /services', async () => {
      await signOutTestUser();

      await expect(
        addDoc(collection(db, 'services'), {
          name: 'Servicio Inyectado No Autorizado',
          basePrice: 1000,
        })
      ).rejects.toThrow();
    });

    it('bloquea escrituras directas de usuarios anónimos en /slots', async () => {
      await signOutTestUser();

      await expect(
        addDoc(collection(db, 'slots'), {
          datetime: '2026-11-30T10:00:00.000Z',
          status: 'confirmed',
        })
      ).rejects.toThrow();
    });

    it('permite escritura si el usuario está autenticado como administrador', async () => {
      await createTestUser(adminEmail, adminPassword);
      await signInTestUser(adminEmail, adminPassword);

      const docRef = await addDoc(collection(db, 'services'), {
        name: 'Servicio Creado por Admin',
        basePrice: 12000,
        durationMinutes: 45,
        createdAt: new Date().toISOString(),
      });

      expect(docRef.id).toBeTruthy();
    });
  });
});
