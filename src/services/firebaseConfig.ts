import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

if (
  import.meta.env.DEV &&
  (!firebaseConfig.apiKey || !firebaseConfig.projectId)
) {
  console.warn(
    '[firebaseConfig] Faltan variables VITE_FIREBASE_* en el archivo .env. Verificá la configuración de Firebase.'
  );
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

const createFirestoreInstance = (): Firestore => {
  const canUsePersistentCache =
    !useEmulators &&
    typeof window !== 'undefined' &&
    typeof indexedDB !== 'undefined';

  if (canUsePersistentCache) {
    try {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      return getFirestore(app);
    }
  }

  return getFirestore(app);
};

export const auth = getAuth(app);
export const db = createFirestoreInstance();
export const functions = getFunctions(app, 'us-central1');

const globalWithFlags = globalThis as typeof globalThis & {
  __turnosEmulatorsConnected?: boolean;
};
if (useEmulators && !globalWithFlags.__turnosEmulatorsConnected) {
  globalWithFlags.__turnosEmulatorsConnected = true;
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

export default app;
