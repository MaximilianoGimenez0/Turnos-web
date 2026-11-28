import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../core/env.mjs';
import { withAdminApp } from '../core/firebase.mjs';
import { colors, printBanner } from '../core/prompt.mjs';

const BACKUP_TENANT_SUBCOLLECTIONS = [
  'members',
  'ownerinfo',
  'public_meta',
  'services',
  'portfolio',
  'slots',
  'payment_attempts',
  'payment_incidents',
];

export const parseBackupArgs = (argv) => {
  const [subcommand, ...rest] = argv;
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    return { help: true };
  }
  if (subcommand !== 'export') {
    throw new Error(`Subcomando inválido para backup: "${subcommand}". Usá "export".`);
  }

  const options = {
    action: 'export',
    out: '',
    includeSecrets: false,
    project: '',
    emulator: false,
    help: false,
  };

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--emulator') {
      options.emulator = true;
    } else if (arg === '--include-secrets') {
      options.includeSecrets = true;
    } else if (arg === '--out' || arg === '-o') {
      const next = rest[i + 1];
      if (!next || next.startsWith('-')) throw new Error('La opción --out requiere una ruta.');
      options.out = next.trim();
      i += 1;
    } else if (arg.startsWith('--out=')) {
      options.out = arg.slice('--out='.length).trim();
    } else if (arg === '--project' || arg === '-p') {
      const next = rest[i + 1];
      if (!next || next.startsWith('-')) throw new Error('La opción --project requiere un valor.');
      options.project = next.trim();
      i += 1;
    } else if (arg.startsWith('--project=')) {
      options.project = arg.slice('--project='.length).trim();
    } else {
      throw new Error(`Argumento desconocido en backup export: "${arg}".`);
    }
  }

  return options;
};

export const printBackupUsage = () => {
  console.log(`Uso:
  npm run cli -- backup export [--out <archivo.json>] [--include-secrets] [--emulator] [--project <projectId>]

Notas:
  - Por defecto EXCLUYE private_config/integrations (credenciales de Mercado Pago).
  - Guarda el respaldo en backups/backup-<projectId>-<timestamp>.json (carpeta ignorada por Git).`);
};

const serializeFirestoreValue = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue);
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = serializeFirestoreValue(v);
    }
    return out;
  }
  return value;
};

export const runBackupExport = async (options = {}, { repoRoot = REPO_ROOT, silent = false } = {}) => {
  return withAdminApp(
    { project: options.project, emulator: options.emulator, repoRoot },
    async ({ db, projectId, usingEmulator }) => {
      const exportedAt = new Date().toISOString();
      const [slugSnap, platformConfigSnap, onboardingSnap] = await Promise.all([
        db.collection('tenant_slugs').get(),
        db.collection('platform_config').get(),
        db.collection('onboarding_requests').get(),
      ]);
      const tenantSlugs = {};
      for (const docSnap of slugSnap.docs) {
        tenantSlugs[docSnap.id] = serializeFirestoreValue(docSnap.data());
      }
      const platformConfig = {};
      for (const docSnap of platformConfigSnap.docs) {
        platformConfig[docSnap.id] = serializeFirestoreValue(docSnap.data());
      }
      const onboardingRequests = {};
      for (const docSnap of onboardingSnap.docs) {
        onboardingRequests[docSnap.id] = serializeFirestoreValue(docSnap.data());
      }

      const tenantsSnap = await db.collection('tenants').get();
      const tenants = {};
      const subcollectionsToExport = options.includeSecrets
        ? [...BACKUP_TENANT_SUBCOLLECTIONS, 'private_config']
        : [...BACKUP_TENANT_SUBCOLLECTIONS];

      let totalSubDocs = 0;

      for (const tenantDoc of tenantsSnap.docs) {
        const subcollections = {};
        for (const subName of subcollectionsToExport) {
          const subSnap = await tenantDoc.ref.collection(subName).get();
          const subDocs = {};
          for (const d of subSnap.docs) {
            subDocs[d.id] = serializeFirestoreValue(d.data());
            totalSubDocs += 1;
          }
          subcollections[subName] = subDocs;
        }

        tenants[tenantDoc.id] = {
          data: serializeFirestoreValue(tenantDoc.data()),
          subcollections,
        };
      }

      const payload = {
        meta: {
          projectId,
          usingEmulator,
          exportedAt,
          includesPrivateSecrets: Boolean(options.includeSecrets),
          tenantCount: tenantsSnap.size,
          slugCount: slugSnap.size,
          subDocCount: totalSubDocs,
          platformConfigCount: platformConfigSnap.size,
          onboardingRequestCount: onboardingSnap.size,
        },
        platform_config: platformConfig,
        onboarding_requests: onboardingRequests,
        tenant_slugs: tenantSlugs,
        tenants,
      };

      const safeTimestamp = exportedAt.replace(/[:.]/g, '-');
      const outputPath = options.out
        ? path.resolve(repoRoot, options.out)
        : path.join(repoRoot, 'backups', `backup-${projectId}-${safeTimestamp}.json`);

      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

      if (!silent) {
        printBanner('Turneado CLI · Backup Export');
        if (options.includeSecrets) {
          console.log(
            colors.yellow(
              '⚠ Advertencia: este respaldo incluye private_config/integrations. Guardalo en un lugar seguro y nunca lo subas a Git.'
            )
          );
        }
        console.log(colors.green(`✓ Respaldo exportado: ${outputPath}`));
        console.log(
          `  Tenants: ${tenantsSnap.size} | Slugs: ${slugSnap.size} | Subdocumentos: ${totalSubDocs}`
        );
        console.log('');
      }

      return { outputPath, payload };
    }
  );
};
