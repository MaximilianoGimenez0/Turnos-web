import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../../src/services/firebaseConfig';
import {
  EMULATOR_HOST,
  FIRESTORE_PORT,
  AUTH_PORT,
  PROJECT_ID,
  initTestEmulators,
} from './emulatorConfig';

export const clearFirestoreData = async (): Promise<void> => {
  const url = `http://${EMULATOR_HOST}:${FIRESTORE_PORT}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  try {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      console.warn(`[testEnv] Failed to clear Firestore: ${res.statusText}`);
    }
  } catch (err) {
    console.warn('[testEnv] Could not reach Firestore emulator to clear data:', err);
  }
};

export const clearAuthUsers = async (): Promise<void> => {
  const url = `http://${EMULATOR_HOST}:${AUTH_PORT}/emulator/v1/projects/${PROJECT_ID}/accounts`;
  try {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      console.warn(`[testEnv] Failed to clear Auth: ${res.statusText}`);
    }
  } catch (err) {
    console.warn('[testEnv] Could not reach Auth emulator to clear accounts:', err);
  }
};

export const createTestUser = async (
  email = 'admin@turnosweb.com',
  password = 'Password123!'
) => {
  initTestEmulators();
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const signInTestUser = async (
  email = 'admin@turnosweb.com',
  password = 'Password123!'
) => {
  initTestEmulators();
  return await signInWithEmailAndPassword(auth, email, password);
};

export const signOutTestUser = async () => {
  initTestEmulators();
  await signOut(auth);
};

export const resetTestEnvironment = async () => {
  initTestEmulators();
  try {
    await signOutTestUser();
  } catch {
    // ignore if already signed out
  }
  await Promise.all([clearFirestoreData(), clearAuthUsers()]);
};

export const setupAuthenticatedAdmin = async (
  email = 'admin@turnosweb.com',
  password = 'Password123!'
) => {
  await resetTestEnvironment();
  await createTestUser(email, password);
  await signInTestUser(email, password);
};
