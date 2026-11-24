#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDefaultProjectId as readDefaultProjectIdCore } from './cli/core/env.mjs';
import {
  loadFirebaseAdmin,
  mergePlatformAdminClaims as mergePlatformAdminClaimsCore,
} from './cli/core/firebase.mjs';

const __filename = fileURLToPath(import.meta.url);

export const readDefaultProjectId = () => readDefaultProjectIdCore();

export const parseCliArgs = (argv) => {
  const options = {
    email: '',
    uid: '',
    project: '',
    revoke: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--revoke') {
      options.revoke = true;
    } else if (arg === '--email' || arg === '-e') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --email requiere un valor.');
      }
      options.email = next.trim().toLowerCase();
      i += 1;
    } else if (arg.startsWith('--email=')) {
      options.email = arg.slice('--email='.length).trim().toLowerCase();
    } else if (arg === '--uid' || arg === '-u') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --uid requiere un valor.');
      }
      options.uid = next.trim();
      i += 1;
    } else if (arg.startsWith('--uid=')) {
      options.uid = arg.slice('--uid='.length).trim();
    } else if (arg === '--project' || arg === '-p') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --project requiere un valor.');
      }
      options.project = next.trim();
      i += 1;
    } else if (arg.startsWith('--project=')) {
      options.project = arg.slice('--project='.length).trim();
    } else {
      throw new Error(`Argumento desconocido: "${arg}". Usá --help para ver las opciones válidas.`);
    }
  }

  return options;
};

export const mergePlatformAdminClaims = (existingClaims, revoke = false) =>
  mergePlatformAdminClaimsCore(existingClaims, revoke);

export const printUsage = () => {
  console.log(`Uso:
  npm run admin:bootstrap -- --email <correo> [--revoke] [--project <projectId>]
  npm run admin:bootstrap -- --uid <uid> [--revoke] [--project <projectId>]

Opciones:
  --email, -e    Correo electrónico del usuario en Firebase Auth.
  --uid, -u      UID del usuario en Firebase Auth (alternativa a --email).
  --revoke       Revoca el claim platformAdmin (establece platformAdmin: false) preservando tenants.
  --project, -p  ID del proyecto de Firebase (default: .firebaserc o env).
  --help, -h     Muestra esta ayuda.

Variables de entorno soportadas para desarrollo local:
  FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
  GOOGLE_APPLICATION_CREDENTIALS=/ruta/a/serviceAccount.json`);
};

export const bootstrapPlatformAdmin = async ({
  email = '',
  uid = '',
  project = '',
  revoke = false,
} = {}) => {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanUid = String(uid || '').trim();

  if (!cleanEmail && !cleanUid) {
    throw new Error('Debés indicar --email <correo> o --uid <uid>.');
  }

  const admin = loadFirebaseAdmin();
  const projectId = String(project || '').trim() || readDefaultProjectId();
  const appName = `bootstrap-platform-admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const usingAuthEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const initConfig = { projectId };
  if (!usingAuthEmulator && typeof admin.credential?.applicationDefault === 'function') {
    initConfig.credential = admin.credential.applicationDefault();
  }

  const app = admin.initializeApp(initConfig, appName);

  try {
    const auth = app.auth();
    const userRecord = cleanUid
      ? await auth.getUser(cleanUid)
      : await auth.getUserByEmail(cleanEmail);

    const existingClaims = userRecord.customClaims || {};
    const nextClaims = mergePlatformAdminClaims(existingClaims, Boolean(revoke));

    await auth.setCustomUserClaims(userRecord.uid, nextClaims);

    return {
      uid: userRecord.uid,
      email: userRecord.email || cleanEmail || null,
      projectId,
      platformAdmin: nextClaims.platformAdmin,
      preservedTenants:
        nextClaims.tenants && typeof nextClaims.tenants === 'object' ? nextClaims.tenants : {},
      claims: nextClaims,
      usingAuthEmulator,
    };
  } finally {
    await app.delete().catch(() => {});
  }
};

const isDirectExecution = () => {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === path.resolve(__filename);
};

if (isDirectExecution()) {
  (async () => {
    try {
      const options = parseCliArgs(process.argv.slice(2));
      if (options.help) {
        printUsage();
        process.exit(0);
      }

      const result = await bootstrapPlatformAdmin(options);
      const preservedTenantCount = Object.keys(result.preservedTenants).length;

      console.log('');
      console.log(
        result.platformAdmin
          ? '✅ Custom Claim platformAdmin: true asignado correctamente.'
          : '✅ Custom Claim platformAdmin: false actualizado (permiso revocado).'
      );
      console.log(`   Proyecto: ${result.projectId}${result.usingAuthEmulator ? ' (Auth Emulator)' : ''}`);
      console.log(`   Usuario:  ${result.email ?? '(sin email)'} (UID: ${result.uid})`);
      console.log(`   Tenants preservados en claims: ${preservedTenantCount}`);
      console.log(
        '   Importante: cerrá sesión y volvé a ingresar, o invocá refreshClaims() para refrescar el ID token.'
      );
      console.log('');
      process.exit(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ Error en bootstrap-platform-admin: ${message}`);
      process.exit(1);
    }
  })();
}
