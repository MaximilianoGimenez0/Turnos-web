import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';
import { connectStorageEmulator } from 'firebase/storage';
import { connectFunctionsEmulator } from 'firebase/functions';
import { db, auth, functions } from '../../src/services/firebaseConfig';
import { getStorageInstance } from '../../src/services/storageService';

export const EMULATOR_HOST = '127.0.0.1';
export const FIRESTORE_PORT = 8080;
export const AUTH_PORT = 9099;
export const STORAGE_PORT = 9199;
export const FUNCTIONS_PORT = 5001;
export const PROJECT_ID = 'turnos-web-eb8b5';
export const STORAGE_BUCKET = 'turnos-web-eb8b5.firebasestorage.app';

export const FIRESTORE_EMULATOR_URL = `http://${EMULATOR_HOST}:${FIRESTORE_PORT}`;
export const AUTH_EMULATOR_URL = `http://${EMULATOR_HOST}:${AUTH_PORT}`;
export const STORAGE_EMULATOR_URL = `http://${EMULATOR_HOST}:${STORAGE_PORT}`;

let isConnected = false;

export const initTestEmulators = () => {
  if (isConnected) return;

  try {
    connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_PORT);
  } catch (err: unknown) {
    if (!(err instanceof Error && err.message.includes('already'))) {
      console.warn('[EmulatorConfig] Warning connecting Firestore emulator:', err);
    }
  }

  try {
    connectAuthEmulator(auth, AUTH_EMULATOR_URL, {
      disableWarnings: true,
    });
  } catch (err: unknown) {
    if (!(err instanceof Error && err.message.includes('already'))) {
      console.warn('[EmulatorConfig] Warning connecting Auth emulator:', err);
    }
  }

  try {
    connectStorageEmulator(getStorageInstance(), EMULATOR_HOST, STORAGE_PORT);
  } catch (err: unknown) {
    if (!(err instanceof Error && err.message.includes('already'))) {
      console.warn('[EmulatorConfig] Warning connecting Storage emulator:', err);
    }
  }

  try {
    connectFunctionsEmulator(functions, EMULATOR_HOST, FUNCTIONS_PORT);
  } catch (err: unknown) {
    if (!(err instanceof Error && err.message.includes('already'))) {
      console.warn('[EmulatorConfig] Warning connecting Functions emulator:', err);
    }
  }

  isConnected = true;
};
