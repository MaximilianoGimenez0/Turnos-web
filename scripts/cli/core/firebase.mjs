import { createRequire } from 'node:module';
import { REPO_ROOT, readDefaultProjectId, readDefaultStorageBucket } from './env.mjs';

export const DEFAULT_EMULATOR_HOSTS = {
  auth: '127.0.0.1:9099',
  firestore: '127.0.0.1:8080',
  storage: '127.0.0.1:9199',
};

export const loadFirebaseAdmin = () => {
  const candidateAnchors = [
    import.meta.url,
    new URL('../../../functions/package.json', import.meta.url),
  ];

  for (const anchor of candidateAnchors) {
    try {
      const req = createRequire(anchor);
      return req('firebase-admin');
    } catch {
      // Try next anchor
    }
  }

  throw new Error(
    'No se pudo cargar "firebase-admin". Instalá dependencias en "functions/" (npm --prefix functions install).'
  );
};

export const configureEmulatorEnvironment = (enabled) => {
  if (!enabled) {
    return {
      usingEmulator: Boolean(
        process.env.FIREBASE_AUTH_EMULATOR_HOST ||
          process.env.FIRESTORE_EMULATOR_HOST ||
          process.env.FIREBASE_STORAGE_EMULATOR_HOST
      ),
      restore: () => {},
    };
  }

  const prev = {
    FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
    FIREBASE_STORAGE_EMULATOR_HOST: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
    STORAGE_EMULATOR_HOST: process.env.STORAGE_EMULATOR_HOST,
  };

  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = DEFAULT_EMULATOR_HOSTS.auth;
  }
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = DEFAULT_EMULATOR_HOSTS.firestore;
  }
  if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = DEFAULT_EMULATOR_HOSTS.storage;
  }
  if (!process.env.STORAGE_EMULATOR_HOST) {
    const rawHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
    process.env.STORAGE_EMULATOR_HOST = /^https?:\/\//i.test(rawHost)
      ? rawHost
      : `http://${rawHost}`;
  }

  return {
    usingEmulator: true,
    restore: () => {
      for (const [key, val] of Object.entries(prev)) {
        if (val === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = val;
        }
      }
    },
  };
};

export const mergePlatformAdminClaims = (existingClaims, revoke = false) => {
  const safeExisting =
    existingClaims && typeof existingClaims === 'object' && !Array.isArray(existingClaims)
      ? { ...existingClaims }
      : {};

  return {
    ...safeExisting,
    platformAdmin: !revoke,
  };
};

export const removeTenantFromClaims = (existingClaims, tenantId) => {
  const safeExisting =
    existingClaims && typeof existingClaims === 'object' && !Array.isArray(existingClaims)
      ? { ...existingClaims }
      : {};

  const tenantsRaw = safeExisting.tenants;
  if (!tenantsRaw || typeof tenantsRaw !== 'object' || Array.isArray(tenantsRaw)) {
    return safeExisting;
  }

  const nextTenants = { ...tenantsRaw };
  delete nextTenants[tenantId];

  if (Object.keys(nextTenants).length > 0) {
    safeExisting.tenants = nextTenants;
  } else {
    delete safeExisting.tenants;
  }

  return safeExisting;
};

export const stripAllTenantsFromClaims = (existingClaims) => {
  const safeExisting =
    existingClaims && typeof existingClaims === 'object' && !Array.isArray(existingClaims)
      ? { ...existingClaims }
      : {};

  delete safeExisting.tenants;
  return safeExisting;
};

export const withAdminApp = async (
  { project = '', bucket = '', emulator = false, repoRoot = REPO_ROOT } = {},
  callback
) => {
  const admin = loadFirebaseAdmin();
  const emu = configureEmulatorEnvironment(Boolean(emulator));
  const projectId = String(project || '').trim() || readDefaultProjectId(repoRoot);
  const storageBucket =
    String(bucket || '').trim() || readDefaultStorageBucket(projectId, repoRoot);

  const appName = `turneado-cli-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const initConfig = { projectId, storageBucket };

  if (!emu.usingEmulator && typeof admin.credential?.applicationDefault === 'function') {
    initConfig.credential = admin.credential.applicationDefault();
  }

  const app = admin.initializeApp(initConfig, appName);

  try {
    const context = {
      admin,
      app,
      auth: app.auth(),
      db: app.firestore(),
      storage: app.storage(),
      bucket: app.storage().bucket(storageBucket),
      projectId,
      storageBucket,
      usingEmulator: emu.usingEmulator,
    };
    return await callback(context);
  } finally {
    await app.delete().catch(() => {});
    emu.restore();
  }
};

export const listAllAuthUsers = async (authClient) => {
  const users = [];
  let pageToken;

  do {
    const page = await authClient.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  return users;
};

/**
 * Finds the currently persisted SuperAdmin from `/platform_config/settings` or Auth `platformAdmin` claims.
 */
export const findExistingSuperAdmin = async ({ auth, db }) => {
  if (db) {
    try {
      const settingsSnap = await db.collection('platform_config').doc('settings').get();
      if (settingsSnap.exists) {
        const data = settingsSnap.data() || {};
        const candidateUid = typeof data.superadminUid === 'string' ? data.superadminUid.trim() : '';
        const candidateEmail =
          typeof data.superadminEmail === 'string' ? data.superadminEmail.trim().toLowerCase() : '';

        let matchedUser = null;
        if (candidateUid) {
          matchedUser = await auth.getUser(candidateUid).catch(() => null);
        }
        if (!matchedUser && candidateEmail) {
          matchedUser = await auth.getUserByEmail(candidateEmail).catch(() => null);
        }

        if (matchedUser && !matchedUser.disabled && matchedUser.customClaims?.platformAdmin === true) {
          return {
            user: matchedUser,
            email: (matchedUser.email || candidateEmail).trim().toLowerCase(),
            source: 'platform_config',
          };
        }
      }
    } catch {
      // Fallback to Auth scan below
    }
  }

  const allUsers = await listAllAuthUsers(auth);
  const adminUser = allUsers.find(
    (u) => !u.disabled && u.customClaims?.platformAdmin === true && Boolean(u.email)
  );
  if (adminUser) {
    return {
      user: adminUser,
      email: adminUser.email.trim().toLowerCase(),
      source: 'auth_claims',
    };
  }

  return null;
};

export const detectPersistedSuperAdmin = async (appOptions = {}) => {
  try {
    return await withAdminApp(appOptions, async ({ auth, db }) => {
      const found = await findExistingSuperAdmin({ auth, db });
      return found ? { uid: found.user.uid, email: found.email, source: found.source } : null;
    });
  } catch {
    return null;
  }
};
