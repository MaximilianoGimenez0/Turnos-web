import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../src/services/firebaseConfig';
import { initTestEmulators } from '../setup/emulatorConfig';
import {
  createTestUserWithClaims,
  resetTestEnvironment,
  seedFirestoreDocument,
  signInTestUserWithClaims,
  signOutTestUser,
} from '../setup/testEnvironment';
import type {
  SubmitOnboardingRequestPayload,
  SubmitOnboardingRequestResponse,
  SuperAdminUpdateOnboardingRequestStatusPayload,
  SuperAdminUpdateOnboardingRequestStatusResponse,
} from '../../src/types';

describe('Integración — Onboarding Requests & Platform Config (Rules + Cloud Functions)', () => {
  const password = 'Password123!';
  const ownerEmail = 'owner.req@turneado.app';
  const staffEmail = 'staff.req@turneado.app';
  const superAdminEmail = 'superadmin.req@turneado.app';

  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await resetTestEnvironment();

    await Promise.all([
      createTestUserWithClaims(ownerEmail, password, {
        tenants: { tnt_req1: 'owner' },
      }),
      createTestUserWithClaims(staffEmail, password, {
        tenants: { tnt_req1: 'staff' },
      }),
      createTestUserWithClaims(superAdminEmail, password, {
        platformAdmin: true,
      }),
    ]);

    await signOutTestUser();

    await seedFirestoreDocument('platform_config/settings', {
      superadminEmail: superAdminEmail,
      superadminUid: 'sa_seed_1',
      updatedAt: new Date().toISOString(),
      updatedBy: 'cli:init',
    });

    await seedFirestoreDocument('onboarding_requests/req_seeded123456', {
      id: 'req_seeded123456',
      name: 'Estudio Seeded',
      email: 'seeded@estudio.com',
      phone: '+54 9 11 4444-5555',
      notes: 'Consulta inicial',
      status: 'pending',
      source: 'landing',
      emailStatus: 'skipped',
      clientEmailSent: false,
      adminEmailSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusUpdatedAt: null,
      statusUpdatedByUid: null,
      statusUpdatedByEmail: null,
    });
  });

  it('reglas Firestore bloquean /platform_config/settings para todos y restringen /onboarding_requests a platformAdmin', async () => {
    // Anónimo
    await expect(getDoc(doc(db, 'platform_config', 'settings'))).rejects.toThrow();
    await expect(
      setDoc(doc(db, 'platform_config', 'settings'), { superadminEmail: 'hack@test.com' })
    ).rejects.toThrow();
    await expect(getDoc(doc(db, 'onboarding_requests', 'req_seeded123456'))).rejects.toThrow();
    await expect(getDocs(collection(db, 'onboarding_requests'))).rejects.toThrow();
    await expect(
      setDoc(doc(db, 'onboarding_requests', 'req_direct'), { name: 'Hack' })
    ).rejects.toThrow();

    // Owner y Staff
    for (const userEmail of [ownerEmail, staffEmail]) {
      await signInTestUserWithClaims(userEmail, password);
      await expect(getDoc(doc(db, 'platform_config', 'settings'))).rejects.toThrow();
      await expect(getDoc(doc(db, 'onboarding_requests', 'req_seeded123456'))).rejects.toThrow();
      await expect(getDocs(collection(db, 'onboarding_requests'))).rejects.toThrow();
      await expect(
        setDoc(doc(db, 'onboarding_requests', 'req_direct'), { name: 'Hack' })
      ).rejects.toThrow();
    }

    // PlatformAdmin: sigue bloqueado en /platform_config y escritura directa, pero puede leer/listar /onboarding_requests
    await signInTestUserWithClaims(superAdminEmail, password);
    await expect(getDoc(doc(db, 'platform_config', 'settings'))).rejects.toThrow();
    await expect(
      setDoc(doc(db, 'platform_config', 'settings'), { superadminEmail: 'hack@test.com' })
    ).rejects.toThrow();

    const singleSnap = await getDoc(doc(db, 'onboarding_requests', 'req_seeded123456'));
    expect(singleSnap.exists()).toBe(true);
    expect(singleSnap.data()?.name).toBe('Estudio Seeded');

    const listSnap = await getDocs(collection(db, 'onboarding_requests'));
    expect(listSnap.size).toBe(1);

    await expect(
      updateDoc(doc(db, 'onboarding_requests', 'req_seeded123456'), { status: 'approved' })
    ).rejects.toThrow();
  });

  it('submitOnboardingRequest crea solicitud pending, rechaza inválidos, aplica rate-limit 3 min e ignora honeypot', async () => {
    const submitFn = httpsCallable<
      SubmitOnboardingRequestPayload,
      SubmitOnboardingRequestResponse
    >(functions, 'submitOnboardingRequest');

    // Payload inválido -> invalid-argument
    await expect(
      submitFn({
        name: 'A',
        email: 'bad-email',
        phone: '123',
      })
    ).rejects.toThrow(/invalid|nombre|correo/i);

    // Honeypot -> éxito simulado sin persistir
    const honeypotRes = await submitFn({
      name: 'Bot Test',
      email: 'bot@test.com',
      phone: '+54 9 11 5555-6666',
      website: 'https://bot.example.com',
    });
    expect(honeypotRes.data.requestId).toBe('req_ignored');

    // Envío válido -> crea doc pending en Firestore
    const validRes = await submitFn({
      name: 'Estudio Magnolia',
      email: 'hola@magnolia.com',
      phone: '+54 9 11 6666-7777',
      notes: 'Somos 4 profesionales',
    });
    expect(validRes.data.requestId).toMatch(/^req_[a-f0-9]{12}$/);
    expect(validRes.data.status).toBe('pending');

    // Segundo envío inmediato con el mismo email -> resource-exhausted
    await expect(
      submitFn({
        name: 'Estudio Magnolia',
        email: 'hola@magnolia.com',
        phone: '+54 9 11 6666-7777',
      })
    ).rejects.toThrow(/reciente|minutos/i);

    // Verificar documento guardado como SuperAdmin
    await signInTestUserWithClaims(superAdminEmail, password);
    const savedSnap = await getDoc(doc(db, 'onboarding_requests', validRes.data.requestId));
    expect(savedSnap.exists()).toBe(true);
    expect(savedSnap.data()?.status).toBe('pending');
    expect(savedSnap.data()?.email).toBe('hola@magnolia.com');
    expect(savedSnap.data()?.notes).toBe('Somos 4 profesionales');
  });

  it('superadminUpdateOnboardingRequestStatus cambia estados para platformAdmin y deniega a no-admins', async () => {
    const updateStatusFn = httpsCallable<
      SuperAdminUpdateOnboardingRequestStatusPayload,
      SuperAdminUpdateOnboardingRequestStatusResponse
    >(functions, 'superadminUpdateOnboardingRequestStatus');

    // Anónimo -> unauthenticated / error
    await signOutTestUser();
    await expect(
      updateStatusFn({ requestId: 'req_seeded123456', status: 'contacted' })
    ).rejects.toThrow();

    // Owner no admin -> permission-denied
    await signInTestUserWithClaims(ownerEmail, password);
    await expect(
      updateStatusFn({ requestId: 'req_seeded123456', status: 'contacted' })
    ).rejects.toThrow(/permiso|permission/i);

    // SuperAdmin -> cambia entre los 4 estados y persiste
    await signInTestUserWithClaims(superAdminEmail, password);
    for (const nextStatus of ['contacted', 'approved', 'cancelled', 'pending'] as const) {
      const res = await updateStatusFn({ requestId: 'req_seeded123456', status: nextStatus });
      expect(res.data.success).toBe(true);
      expect(res.data.status).toBe(nextStatus);

      const snap = await getDoc(doc(db, 'onboarding_requests', 'req_seeded123456'));
      expect(snap.data()?.status).toBe(nextStatus);
      expect(snap.data()?.statusUpdatedByEmail).toBe(superAdminEmail);
    }

    // ID inexistente -> not-found
    await expect(
      updateStatusFn({ requestId: 'req_noexiste999', status: 'contacted' })
    ).rejects.toThrow(/no existe|not-found/i);
  });
});
