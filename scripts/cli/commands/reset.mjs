import { readDefaultProjectId } from '../core/env.mjs';
import { withAdminApp, listAllAuthUsers, stripAllTenantsFromClaims } from '../core/firebase.mjs';
import { colors, printBanner, printTable, askConfirmationPhrase } from '../core/prompt.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export const parseResetArgs = (argv) => {
  const options = {
    dryRun: false,
    confirmProject: '',
    keepSuperadmin: true,
    keepEmails: [],
    wipeAuthAll: false,
    skipStorage: false,
    skipAuth: false,
    yes: false,
    emulator: false,
    project: '',
    bucket: '',
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--keep-superadmin') {
      options.keepSuperadmin = true;
    } else if (arg === '--wipe-auth-all') {
      options.wipeAuthAll = true;
      options.keepSuperadmin = false;
    } else if (arg === '--skip-storage') {
      options.skipStorage = true;
    } else if (arg === '--skip-auth') {
      options.skipAuth = true;
    } else if (arg === '--yes' || arg === '-y') {
      options.yes = true;
    } else if (arg === '--emulator') {
      options.emulator = true;
    } else if (arg === '--confirm-project') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --confirm-project requiere el ID del proyecto.');
      }
      options.confirmProject = next.trim();
      i += 1;
    } else if (arg.startsWith('--confirm-project=')) {
      options.confirmProject = arg.slice('--confirm-project='.length).trim();
    } else if (arg === '--keep-email') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --keep-email requiere un correo electrónico.');
      }
      const parsed = next
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      options.keepEmails.push(...parsed);
      i += 1;
    } else if (arg.startsWith('--keep-email=')) {
      const parsed = arg
        .slice('--keep-email='.length)
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      options.keepEmails.push(...parsed);
    } else if (arg === '--project' || arg === '-p') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --project requiere un valor.');
      }
      options.project = next.trim();
      i += 1;
    } else if (arg.startsWith('--project=')) {
      options.project = arg.slice('--project='.length).trim();
    } else if (arg === '--bucket') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --bucket requiere un valor.');
      }
      options.bucket = next.trim();
      i += 1;
    } else if (arg.startsWith('--bucket=')) {
      options.bucket = arg.slice('--bucket='.length).trim();
    } else {
      throw new Error(`Argumento desconocido en reset: "${arg}". Usá --help para ver opciones.`);
    }
  }

  options.keepEmails = Array.from(new Set(options.keepEmails));
  return options;
};

export const printResetUsage = () => {
  console.log(`Uso:
  npm run cli -- reset --dry-run [--emulator] [--project <id>]
  npm run cli -- reset --confirm-project <projectId> [opciones]

Opciones:
  --dry-run                  Solo audita y muestra qué se borraría sin modificar nada.
  --confirm-project <id>     Obligatorio para ejecutar borrado real (debe coincidir con el proyecto).
  --keep-superadmin          Preserva cuentas con platformAdmin: true limpiando su mapa tenants (default).
  --keep-email <correo>      Preserva un correo puntual adicional (repetible o separado por comas).
  --wipe-auth-all            Elimina el 100% de usuarios en Firebase Auth (incluyendo SuperAdmin).
  --skip-storage             Omite el borrado de archivos en Cloud Storage.
  --skip-auth                Omite la eliminación/limpieza de cuentas en Firebase Auth.
  --yes, -y                  Omite la confirmación interactiva (requiere --confirm-project exacto).
  --emulator                 Ejecuta contra Firebase Emulators locales (9099/8080/9199).
  --project, -p <id>         ID del proyecto Firebase destino.
  --bucket <nombre>          Bucket de Cloud Storage destino.
  --help, -h                 Muestra esta ayuda.`);
};

const listBucketFilesSafe = async (bucket) => {
  try {
    const [files] = await bucket.getFiles();
    return { files, available: true };
  } catch (err) {
    const code = err?.code;
    const message = String(err?.message || '');
    if (code === 404 || /not found|does not exist/i.test(message)) {
      return { files: [], available: false };
    }
    throw err;
  }
};

const deleteBucketFilesSafe = async (bucket) => {
  const { files, available } = await listBucketFilesSafe(bucket);
  if (!available || files.length === 0) {
    return 0;
  }

  try {
    await bucket.deleteFiles({ force: true });
  } catch {
    // Fallback to deleting files individually (handles emulator edge cases)
    for (const file of files) {
      await file.delete({ ignoreNotFound: true }).catch(() => {});
    }
  }

  // Verify no stray files remain
  const after = await listBucketFilesSafe(bucket);
  if (after.files.length > 0) {
    for (const file of after.files) {
      await file.delete({ ignoreNotFound: true }).catch(() => {});
    }
  }

  return files.length;
};

export const runReset = async (options = {}) => {
  const opts = {
    dryRun: false,
    confirmProject: '',
    keepSuperadmin: true,
    keepEmails: [],
    wipeAuthAll: false,
    skipStorage: false,
    skipAuth: false,
    yes: false,
    emulator: false,
    project: '',
    bucket: '',
    ...options,
  };

  if (opts.wipeAuthAll) {
    opts.keepSuperadmin = false;
  }

  // Fail fast before loading firebase-admin or opening any remote connection
  const targetProjectId = String(opts.project || '').trim() || readDefaultProjectId();
  if (!opts.dryRun) {
    if (!opts.confirmProject) {
      throw new Error(
        `Operación bloqueada por seguridad: debés indicar --confirm-project ${targetProjectId} (o usar --dry-run para simular).`
      );
    }
    if (opts.confirmProject !== targetProjectId) {
      throw new Error(
        `Confirmación inválida: --confirm-project "${opts.confirmProject}" no coincide con el proyecto destino "${targetProjectId}".`
      );
    }
  }

  return withAdminApp(
    { project: targetProjectId, bucket: opts.bucket, emulator: opts.emulator },
    async ({ auth, db, bucket, projectId, storageBucket, usingEmulator }) => {

      const modeLabel = usingEmulator ? 'EMULADOR LOCAL' : 'PRODUCCIÓN / CLOUD';
      printBanner(
        opts.dryRun ? 'TurnosWeb Reset (DRY-RUN)' : 'TurnosWeb Reset (PURGA COMPLETA)',
        `Proyecto: ${projectId} | Entorno: ${modeLabel} | Bucket: ${storageBucket}`
      );

      // 1. Pre-audit
      const rootCollections = await db.listCollections();
      const collectionCounts = [];
      for (const col of rootCollections) {
        const docRefs = await col.listDocuments();
        collectionCounts.push({ name: col.id, count: docRefs.length });
      }

      const storageAudit = opts.skipStorage
        ? { files: [], available: true }
        : await listBucketFilesSafe(bucket);

      const allUsers = opts.skipAuth ? [] : await listAllAuthUsers(auth);
      const keepEmailSet = new Set(opts.keepEmails.map((e) => e.toLowerCase()));

      const usersToKeep = [];
      const usersToDelete = [];
      for (const user of allUsers) {
        const emailLower = (user.email || '').toLowerCase();
        const isSuperAdmin = user.customClaims?.platformAdmin === true;
        const shouldKeep =
          !opts.wipeAuthAll &&
          ((opts.keepSuperadmin && isSuperAdmin) || (emailLower && keepEmailSet.has(emailLower)));

        if (shouldKeep) {
          usersToKeep.push(user);
        } else {
          usersToDelete.push(user);
        }
      }

      const auditRows = [
        {
          resource: 'Firestore (colecciones raíz)',
          detail:
            collectionCounts.length > 0
              ? collectionCounts.map((c) => `${c.name}: ${c.count}`).join(', ')
              : '0 colecciones',
          action: collectionCounts.length > 0 ? 'BORRAR TODO' : 'Sin cambios',
        },
        {
          resource: `Cloud Storage (${storageBucket})`,
          detail: opts.skipStorage
            ? 'Omitido (--skip-storage)'
            : storageAudit.available
              ? `${storageAudit.files.length} archivo(s)`
              : 'Bucket no inicializado / vacío',
          action: opts.skipStorage
            ? 'OMITIR'
            : storageAudit.files.length > 0
              ? 'BORRAR TODO'
              : 'Sin cambios',
        },
        {
          resource: 'Firebase Auth (eliminar)',
          detail: opts.skipAuth ? 'Omitido (--skip-auth)' : `${usersToDelete.length} usuario(s)`,
          action: opts.skipAuth
            ? 'OMITIR'
            : usersToDelete.length > 0
              ? 'ELIMINAR CUENTAS'
              : 'Sin cambios',
        },
        {
          resource: 'Firebase Auth (preservar)',
          detail: opts.skipAuth
            ? 'Omitido (--skip-auth)'
            : `${usersToKeep.length} usuario(s) ${opts.wipeAuthAll ? '(modo --wipe-auth-all)' : '(claims tenants se limpian)'}`,
          action: opts.skipAuth ? 'OMITIR' : usersToKeep.length > 0 ? 'PRESERVAR + LIMPIAR CLAIMS' : 'Ninguno',
        },
      ];

      printTable(
        [
          { key: 'resource', label: 'RECURSO' },
          { key: 'detail', label: 'ESTADO ACTUAL' },
          { key: 'action', label: 'ACCIÓN' },
        ],
        auditRows
      );
      console.log('');

      const auditSummary = {
        projectId,
        storageBucket,
        usingEmulator,
        collectionsFound: collectionCounts,
        storageFilesFound: storageAudit.files.length,
        authUsersTotal: allUsers.length,
        authUsersToDelete: usersToDelete.length,
        authUsersToKeep: usersToKeep.length,
      };

      if (opts.dryRun) {
        console.log(colors.cyan('ℹ️  Modo --dry-run activo: no se modificó ni eliminó ningún dato.'));
        console.log('');
        return {
          ...auditSummary,
          dryRun: true,
          executed: false,
          cancelled: false,
        };
      }

      if (!opts.yes) {
        const expectedPhrase = `RESET ${projectId}`;
        const warning = usingEmulator
          ? `⚠️  Vas a vaciar por completo el emulador del proyecto "${projectId}".`
          : `⚠️  ATENCIÓN: Vas a BORRAR PERMANENTEMENTE todos los datos del proyecto "${projectId}" en la nube.`;
        const confirmed = await askConfirmationPhrase(expectedPhrase, warning);
        if (!confirmed) {
          console.log(colors.yellow('⏹️  Reset cancelado por el usuario. No se modificó ningún dato.'));
          console.log('');
          return {
            ...auditSummary,
            dryRun: false,
            executed: false,
            cancelled: true,
          };
        }
      }

      // 2. Trigger-safe deletion order
      // Step 1: Delete /tenants/{tenantId} parent docs first so onTenantOwnerInfoWritten skips
      const tenantDocRefs = await db.collection('tenants').listDocuments();
      if (tenantDocRefs.length > 0) {
        for (const chunk of chunkArray(tenantDocRefs, 400)) {
          const batch = db.batch();
          for (const ref of chunk) {
            batch.delete(ref);
          }
          await batch.commit();
        }
      }

      // Step 2: Delete /tenants/{tenantId}/slots subcollections before public_meta
      for (const tenantRef of tenantDocRefs) {
        await db.recursiveDelete(tenantRef.collection('slots'));
      }

      // Brief settle pause so in-flight syncPublicSlot triggers finish before recursiveDelete
      if (tenantDocRefs.length > 0) {
        await sleep(usingEmulator ? 350 : 800);
      }

      // Step 3: Recursive delete /tenants, /tenant_slugs, and any other root collections
      await db.recursiveDelete(db.collection('tenants'));
      await db.recursiveDelete(db.collection('tenant_slugs'));

      const currentRootCollections = await db.listCollections();
      for (const colRef of currentRootCollections) {
        await db.recursiveDelete(colRef);
      }

      // Step 4: Cloud Storage purge
      let deletedStorageFiles = 0;
      if (!opts.skipStorage) {
        deletedStorageFiles = await deleteBucketFilesSafe(bucket);
      }

      // Step 5: Firebase Auth purge & claim cleanup
      let deletedAuthUsers = 0;
      let cleanedPreservedUsers = 0;
      if (!opts.skipAuth) {
        if (usersToDelete.length > 0) {
          for (const batch of chunkArray(usersToDelete, 1000)) {
            const uids = batch.map((u) => u.uid);
            const res = await auth.deleteUsers(uids);
            deletedAuthUsers += res.successCount;
          }
        }

        for (const preserved of usersToKeep) {
          const existingClaims = preserved.customClaims || {};
          if (existingClaims.tenants !== undefined) {
            const nextClaims = stripAllTenantsFromClaims(existingClaims);
            await auth.setCustomUserClaims(preserved.uid, nextClaims);
            cleanedPreservedUsers += 1;
          }
        }
      }

      // Step 6: Second verification sweep for late async Cloud Function writes
      await sleep(usingEmulator ? 500 : 1500);
      let residualCollectionsCleaned = 0;
      const postSweepCollections = await db.listCollections();
      for (const colRef of postSweepCollections) {
        const docs = await colRef.listDocuments();
        if (docs.length > 0) {
          await db.recursiveDelete(colRef);
          residualCollectionsCleaned += 1;
        }
      }

      const finalCollections = [];
      for (const colRef of await db.listCollections()) {
        const docs = await colRef.listDocuments();
        if (docs.length > 0) {
          finalCollections.push(colRef.id);
        }
      }

      console.log(colors.green('✅ Reset completado correctamente.'));
      console.log(`   Colecciones restantes en Firestore: ${finalCollections.length}`);
      console.log(`   Archivos eliminados de Storage:     ${deletedStorageFiles}`);
      console.log(`   Usuarios eliminados de Auth:        ${deletedAuthUsers}`);
      console.log(`   SuperAdmins/cuentas preservadas:    ${usersToKeep.length} (claims limpiados: ${cleanedPreservedUsers})`);
      if (residualCollectionsCleaned > 0) {
        console.log(
          colors.dim(`   Limpieza post-triggers aplicada en ${residualCollectionsCleaned} colección(es) residual(es).`)
        );
      }
      console.log('');

      return {
        ...auditSummary,
        dryRun: false,
        executed: true,
        cancelled: false,
        deletedStorageFiles,
        deletedAuthUsers,
        preservedAuthUsers: usersToKeep.length,
        cleanedPreservedUsers,
        residualCollectionsCleaned,
        remainingCollections: finalCollections,
      };
    }
  );
};
