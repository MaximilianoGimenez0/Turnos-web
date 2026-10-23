import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';
import { connectStorageEmulator } from 'firebase/storage';
import { connectFunctionsEmulator } from 'firebase/functions';
import { db, auth, storage, functions } from '../../src/services/firebaseConfig';

export const EMULATOR_HOST = '127.0.0.1';
export const FIRESTORE_PORT = 8080;
export const AUTH_PORT = 9099;
export const STORAGE_PORT = 9199;
export const FUNCTIONS_PORT = 5001;
export const PROJECT_ID = 'turnos-web-eb8b5';

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
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_PORT}`, {
      disableWarnings: true,
    });
  } catch (err: unknown) {
    if (!(err instanceof Error && err.message.includes('already'))) {
      console.warn('[EmulatorConfig] Warning connecting Auth emulator:', err);
    }
  }

  try {
    connectStorageEmulator(storage, EMULATOR_HOST, STORAGE_PORT);
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
