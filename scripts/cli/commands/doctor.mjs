import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  REPO_ROOT,
  auditEnvConfig,
  parseEnvFile,
  readDefaultProjectId,
  readDefaultStorageBucket,
} from '../core/env.mjs';
import { withAdminApp } from '../core/firebase.mjs';
import { colors, printBanner } from '../core/prompt.mjs';

export const parseDoctorArgs = (argv) => {
  const options = {
    project: '',
    bucket: '',
    emulator: false,
    skipConnectivity: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--emulator') {
      options.emulator = true;
    } else if (arg === '--skip-connectivity') {
      options.skipConnectivity = true;
    } else if (arg === '--project' || arg === '-p') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) throw new Error('La opción --project requiere un valor.');
      options.project = next.trim();
      i += 1;
    } else if (arg.startsWith('--project=')) {
      options.project = arg.slice('--project='.length).trim();
    } else if (arg === '--bucket') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) throw new Error('La opción --bucket requiere un valor.');
      options.bucket = next.trim();
      i += 1;
    } else if (arg.startsWith('--bucket=')) {
      options.bucket = arg.slice('--bucket='.length).trim();
    } else {
      throw new Error(`Argumento desconocido en doctor: "${arg}". Usá --help.`);
    }
  }

  return options;
};

export const printDoctorUsage = () => {
  console.log(`Uso:
  npm run cli -- doctor [--emulator] [--project <projectId>] [--bucket <bucket>] [--skip-connectivity]

Qué verifica:
  - Versión de Node.js, presencia de firebase-admin y .firebaserc.
  - Consistencia de .env y functions/.env (redacta secretos, detecta placeholders o emails inválidos).
  - Conectividad real con Firebase Auth, Firestore y Cloud Storage.`);
};

export const runDoctor = async (options = {}, { repoRoot = REPO_ROOT, silent = false } = {}) => {
  const projectId = String(options.project || '').trim() || readDefaultProjectId(repoRoot);
  const storageBucket =
    String(options.bucket || '').trim() || readDefaultStorageBucket(projectId, repoRoot);

  const rootEnvPath = path.join(repoRoot, '.env');
  const functionsEnvPath = path.join(repoRoot, 'functions', '.env');
  const hasRootEnvFile = existsSync(rootEnvPath);
  const hasFunctionsEnvFile = existsSync(functionsEnvPath);

  const checks = [
    {
      level: 'ok',
      scope: 'Node.js',
      message: `${process.version} (proyecto objetivo: ${projectId}${options.emulator ? ' · EMULADOR' : ''})`,
    },
    ...auditEnvConfig({
      rootEnv: parseEnvFile(rootEnvPath),
      functionsEnv: parseEnvFile(functionsEnvPath),
      hasRootEnvFile,
      hasFunctionsEnvFile,
    }),
  ];

  const credSource = options.emulator
    ? 'Firebase Emulators (127.0.0.1)'
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? `Service Account JSON (${process.env.GOOGLE_APPLICATION_CREDENTIALS})`
      : 'Application Default Credentials (gcloud ADC)';

  checks.push({
    level: 'ok',
    scope: 'Credenciales Admin',
    message: credSource,
  });

  if (!options.skipConnectivity) {
    try {
      await withAdminApp(
        { project: projectId, bucket: storageBucket, emulator: options.emulator, repoRoot },
        async ({ auth, db, bucket }) => {
          const authList = await auth.listUsers(1);
          checks.push({
            level: 'ok',
            scope: 'Firebase Auth',
            message: `Conectado correctamente (muestra: ${authList.users.length} usuario(s) leídos).`,
          });

          const collections = await db.listCollections();
          checks.push({
            level: 'ok',
            scope: 'Cloud Firestore',
            message: `Conectado correctamente (${collections.length} colección(es) raíz).`,
          });

          try {
            const [files] = await bucket.getFiles({ maxResults: 1 });
            checks.push({
              level: 'ok',
              scope: 'Cloud Storage',
              message: `Bucket "${storageBucket}" accesible (${files.length} archivo(s) en muestra).`,
            });
          } catch (storageErr) {
            const msg = storageErr instanceof Error ? storageErr.message : String(storageErr);
            checks.push({
              level: 'warn',
              scope: 'Cloud Storage',
              message: `No se pudo listar el bucket "${storageBucket}": ${msg}`,
            });
          }
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      checks.push({
        level: 'error',
        scope: 'Conectividad Firebase Admin',
        message: `${msg}. Ver tutorial de gcloud/ADC en artifacts/cli-and-gcloud-guide.md`,
      });
    }
  }

  const errorCount = checks.filter((c) => c.level === 'error').length;
  const warnCount = checks.filter((c) => c.level === 'warn').length;

  if (!silent) {
    printBanner('TurnosWeb CLI · Diagnóstico de Entorno (doctor)');
    for (const check of checks) {
      const icon =
        check.level === 'ok'
          ? colors.green('✓')
          : check.level === 'warn'
            ? colors.yellow('⚠')
            : colors.red('✗');
      console.log(`  ${icon} ${colors.bold(check.scope)}: ${check.message}`);
    }
    console.log('');
    console.log(
      errorCount > 0
        ? colors.red(`Resultado: ${errorCount} error(es), ${warnCount} advertencia(s).`)
        : warnCount > 0
          ? colors.yellow(`Resultado: listo con ${warnCount} advertencia(s).`)
          : colors.green('Resultado: entorno saludable y listo para operar.')
    );
    console.log('');
  }

  return { projectId, storageBucket, checks, errorCount, warnCount, ok: errorCount === 0 };
};
