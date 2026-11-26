import { maskSecretValue } from '../core/env.mjs';
import { withAdminApp, listAllAuthUsers, removeTenantFromClaims } from '../core/firebase.mjs';
import { colors, printBanner, printTable, askConfirmationPhrase } from '../core/prompt.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const parseTenantArgs = (argv) => {
  const options = {
    subcommand: '',
    target: '',
    confirm: '',
    dryRun: false,
    yes: false,
    emulator: false,
    project: '',
    bucket: '',
    help: false,
  };

  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--yes' || arg === '-y') {
      options.yes = true;
    } else if (arg === '--emulator') {
      options.emulator = true;
    } else if (arg === '--confirm') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --confirm requiere el slug o tenantId del negocio.');
      }
      options.confirm = next.trim();
      i += 1;
    } else if (arg.startsWith('--confirm=')) {
      options.confirm = arg.slice('--confirm='.length).trim();
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
    } else if (arg.startsWith('-')) {
      throw new Error(`Argumento desconocido en tenant: "${arg}". Usá --help para ver opciones.`);
    } else {
      positionals.push(arg.trim());
    }
  }

  options.subcommand = (positionals[0] || '').toLowerCase();
  options.target = positionals[1] || '';

  return options;
};

export const printTenantUsage = () => {
  console.log(`Uso:
  npm run cli -- tenant list [--emulator] [--project <id>]
  npm run cli -- tenant inspect <slug|tenantId> [--emulator] [--project <id>]
  npm run cli -- tenant delete <slug|tenantId> --confirm <slug|tenantId> [--dry-run] [--yes] [--emulator]

Subcomandos:
  list                       Lista todos los negocios registrados en /tenants.
  inspect <slug|tenantId>    Muestra resumen del tenant, conteos de subcolecciones y estado MP (enmascarado).
  delete <slug|tenantId>     Elimina permanentemente un tenant (Firestore + /tenant_slugs + Storage + claims).

Opciones:
  --confirm <slug|tenantId>  Obligatorio en delete real (debe coincidir con el slug o tenantId del negocio).
  --dry-run                  Simula tenant delete sin borrar nada.
  --yes, -y                  Omite confirmación interactiva en delete.
  --emulator                 Ejecuta contra Firebase Emulators locales.
  --project, -p <id>         ID del proyecto Firebase destino.
  --bucket <nombre>          Bucket de Cloud Storage destino.
  --help, -h                 Muestra esta ayuda.`);
};

const resolveTenantTarget = async (db, rawTarget) => {
  const target = String(rawTarget || '').trim();
  if (!target) {
    throw new Error('Debés indicar un <slug> o <tenantId>.');
  }

  let tenantId = '';
  let tenantSnap = null;

  if (/^tnt_[a-zA-Z0-9_-]+$/.test(target)) {
    const snap = await db.collection('tenants').doc(target).get();
    if (snap.exists) {
      tenantId = snap.id;
      tenantSnap = snap;
    }
  }

  if (!tenantSnap) {
    const slugSnap = await db.collection('tenant_slugs').doc(target.toLowerCase()).get();
    if (slugSnap.exists && typeof slugSnap.data()?.tenantId === 'string') {
      tenantId = slugSnap.data().tenantId;
      tenantSnap = await db.collection('tenants').doc(tenantId).get();
    }
  }

  if (!tenantSnap || !tenantSnap.exists) {
    throw new Error(`No se encontró ningún negocio para "${target}".`);
  }

  const tenantData = tenantSnap.data() || {};
  const slug = typeof tenantData.slug === 'string' ? tenantData.slug : '';

  return {
    tenantId,
    slug,
    tenantRef: tenantSnap.ref,
    tenantData,
  };
};

const listPrefixFilesSafe = async (bucket, prefix) => {
  try {
    const [files] = await bucket.getFiles({ prefix });
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

export const runTenantCommand = async (options = {}) => {
  const opts = {
    subcommand: '',
    target: '',
    confirm: '',
    dryRun: false,
    yes: false,
    emulator: false,
    project: '',
    bucket: '',
    ...options,
  };

  if (!['list', 'inspect', 'delete'].includes(opts.subcommand)) {
    throw new Error(
      `Subcomando de tenant inválido: "${opts.subcommand || '(vacío)'}". Usá "list", "inspect" o "delete".`
    );
  }

  return withAdminApp(
    { project: opts.project, bucket: opts.bucket, emulator: opts.emulator },
    async ({ auth, db, bucket, projectId, storageBucket, usingEmulator }) => {
      if (opts.subcommand === 'list') {
        printBanner(
          'Turneado Tenants — Listado',
          `Proyecto: ${projectId}${usingEmulator ? ' (Emulador)' : ''}`
        );

        const snap = await db.collection('tenants').get();
        const tenants = snap.docs
          .map((doc) => {
            const data = doc.data() || {};
            return {
              tenantId: doc.id,
              slug: data.slug || '-',
              name: data.name || '-',
              status: data.status || '-',
              isDemo: data.isDemo === true ? 'Sí' : 'No',
              mpConfigured: data.mpConfigured === true ? 'Sí' : 'No',
              createdAt: typeof data.createdAt === 'string' ? data.createdAt.slice(0, 19) : '-',
            };
          })
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

        printTable(
          [
            { key: 'tenantId', label: 'TENANT ID' },
            { key: 'slug', label: 'SLUG' },
            { key: 'name', label: 'NOMBRE' },
            { key: 'status', label: 'ESTADO' },
            { key: 'isDemo', label: 'DEMO' },
            { key: 'mpConfigured', label: 'MP' },
            { key: 'createdAt', label: 'CREADO' },
          ],
          tenants
        );
        console.log('');

        return { subcommand: 'list', projectId, count: tenants.length, tenants };
      }

      const resolved = await resolveTenantTarget(db, opts.target);
      const { tenantId, slug, tenantRef, tenantData } = resolved;

      if (opts.subcommand === 'inspect') {
        printBanner(
          `Turneado Tenant — Inspect (${slug || tenantId})`,
          `Proyecto: ${projectId}${usingEmulator ? ' (Emulador)' : ''}`
        );

        const [
          slugSnap,
          servicesSnap,
          portfolioSnap,
          slotsSnap,
          membersSnap,
          integrationsSnap,
          storageListing,
        ] = await Promise.all([
          slug ? db.collection('tenant_slugs').doc(slug).get() : Promise.resolve(null),
          tenantRef.collection('services').get(),
          tenantRef.collection('portfolio').get(),
          tenantRef.collection('slots').get(),
          tenantRef.collection('members').get(),
          tenantRef.collection('private_config').doc('integrations').get(),
          listPrefixFilesSafe(bucket, `tenants/${tenantId}/`),
        ]);

        const slotCountsByStatus = {};
        for (const doc of slotsSnap.docs) {
          const st = String(doc.data()?.status || 'unknown');
          slotCountsByStatus[st] = (slotCountsByStatus[st] || 0) + 1;
        }

        const integrationsRaw = integrationsSnap.exists ? integrationsSnap.data() || {} : {};
        const hasOwnToken =
          typeof integrationsRaw.mpAccessToken === 'string' &&
          integrationsRaw.mpAccessToken.trim().length > 0;
        const integrationsSummary = {
          configured: hasOwnToken || tenantData.isDemo === true,
          hasOwnToken,
          maskedAccessToken: hasOwnToken ? maskSecretValue(integrationsRaw.mpAccessToken) : null,
          hasWebhookSecret:
            typeof integrationsRaw.mpWebhookSecret === 'string' &&
            integrationsRaw.mpWebhookSecret.trim().length > 0,
        };

        const members = membersSnap.docs.map((doc) => {
          const d = doc.data() || {};
          return {
            uid: doc.id,
            email: d.email || '-',
            role: d.role || '-',
            active: d.active === true,
          };
        });

        console.log(`  Tenant ID:      ${tenantId}`);
        console.log(`  Slug activo:    ${slug || '-'}`);
        console.log(`  Slugs previos:  ${(tenantData.previousSlugs || []).join(', ') || '(ninguno)'}`);
        console.log(`  Nombre:         ${tenantData.name || '-'}`);
        console.log(`  Estado:         ${tenantData.status || '-'}`);
        console.log(`  Demo:           ${tenantData.isDemo === true ? 'Sí' : 'No'}`);
        console.log(`  Zona horaria:   ${tenantData.timezone || '-'}`);
        console.log(`  Bootstrap slug: ${slugSnap?.exists ? 'OK' : 'FALTA'}`);
        console.log(
          `  Mercado Pago:   ${integrationsSummary.hasOwnToken ? `Token propio (${integrationsSummary.maskedAccessToken})` : tenantData.isDemo ? 'Fallback Demo activo' : 'Sin configurar'} | Webhook secret: ${integrationsSummary.hasWebhookSecret ? 'Sí' : 'No'}`
        );
        console.log(
          `  Subcolecciones: services=${servicesSnap.size}, portfolio=${portfolioSnap.size}, slots=${slotsSnap.size}, members=${membersSnap.size}`
        );
        if (slotsSnap.size > 0) {
          const breakdown = Object.entries(slotCountsByStatus)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ');
          console.log(`  Turnos detalle: ${breakdown}`);
        }
        console.log(
          `  Storage:        ${storageListing.available ? `${storageListing.files.length} archivo(s) en tenants/${tenantId}/` : 'Bucket no inicializado'}`
        );
        console.log('');

        return {
          subcommand: 'inspect',
          projectId,
          tenantId,
          slug,
          tenant: tenantData,
          bootstrapExists: Boolean(slugSnap?.exists),
          counts: {
            services: servicesSnap.size,
            portfolio: portfolioSnap.size,
            slots: slotsSnap.size,
            slotsByStatus: slotCountsByStatus,
            members: membersSnap.size,
            storageFiles: storageListing.files.length,
          },
          members,
          integrations: integrationsSummary,
        };
      }

      // subcommand === 'delete'
      if (!opts.dryRun) {
        const acceptedConfirm = new Set(
          [tenantId, slug, opts.target].filter(Boolean).map((v) => v.toLowerCase())
        );
        if (!opts.confirm || !acceptedConfirm.has(opts.confirm.toLowerCase())) {
          throw new Error(
            `Operación bloqueada: debés pasar --confirm ${slug || tenantId} para eliminar este negocio (o usar --dry-run).`
          );
        }
      }

      printBanner(
        opts.dryRun
          ? `Turneado Tenant Delete (DRY-RUN: ${slug || tenantId})`
          : `Turneado Tenant Delete (${slug || tenantId})`,
        `Proyecto: ${projectId}${usingEmulator ? ' (Emulador)' : ''} | Bucket: ${storageBucket}`
      );

      const [slugDocsSnap, storageListing, subcollections, membersSnap] = await Promise.all([
        db.collection('tenant_slugs').where('tenantId', '==', tenantId).get(),
        listPrefixFilesSafe(bucket, `tenants/${tenantId}/`),
        tenantRef.listCollections(),
        tenantRef.collection('members').get(),
      ]);

      const affectedMemberUids = new Set(membersSnap.docs.map((doc) => doc.id));
      const allUsers = await listAllAuthUsers(auth);
      for (const user of allUsers) {
        if (user.customClaims?.tenants && user.customClaims.tenants[tenantId] !== undefined) {
          affectedMemberUids.add(user.uid);
        }
      }

      printTable(
        [
          { key: 'item', label: 'RECURSO' },
          { key: 'detail', label: 'DETALLE' },
        ],
        [
          { item: 'Tenant', detail: `${tenantId} (slug: ${slug || '-'})` },
          {
            item: 'Subcolecciones Firestore',
            detail: subcollections.map((c) => c.id).join(', ') || '(ninguna)',
          },
          {
            item: 'Documentos /tenant_slugs',
            detail: slugDocsSnap.docs.map((d) => d.id).join(', ') || '(ninguno)',
          },
          {
            item: `Storage (tenants/${tenantId}/)`,
            detail: `${storageListing.files.length} archivo(s)`,
          },
          {
            item: 'Auth Custom Claims a limpiar',
            detail: `${affectedMemberUids.size} usuario(s) (no borra cuentas Auth)`,
          },
        ]
      );
      console.log('');

      if (opts.dryRun) {
        console.log(colors.cyan('ℹ️  Modo --dry-run activo: no se eliminó ningún dato.'));
        console.log('');
        return {
          subcommand: 'delete',
          dryRun: true,
          executed: false,
          cancelled: false,
          tenantId,
          slug,
          slugDocsFound: slugDocsSnap.docs.map((d) => d.id),
          storageFilesFound: storageListing.files.length,
          affectedUsers: Array.from(affectedMemberUids),
        };
      }

      if (!opts.yes) {
        const expectedPhrase = `DELETE ${slug || tenantId}`;
        const confirmed = await askConfirmationPhrase(
          expectedPhrase,
          `⚠️  Vas a eliminar permanentemente el negocio "${tenantData.name || tenantId}" (${tenantId}).`
        );
        if (!confirmed) {
          console.log(colors.yellow('⏹️  Eliminación cancelada por el usuario.'));
          console.log('');
          return {
            subcommand: 'delete',
            dryRun: false,
            executed: false,
            cancelled: true,
            tenantId,
            slug,
          };
        }
      }

      // Trigger-safe single-tenant deletion order:
      // 1. Delete parent /tenants/{tenantId} first so onTenantOwnerInfoWritten skips
      await tenantRef.delete();

      // 2. Delete slots subcollection before public_meta
      await db.recursiveDelete(tenantRef.collection('slots'));
      await sleep(usingEmulator ? 300 : 800);

      // 3. Recursively delete all remaining subcollections of this tenant
      await db.recursiveDelete(tenantRef);

      // 4. Delete all /tenant_slugs pointing to this tenantId (current + previousSlugs aliases)
      const deletedSlugs = [];
      for (const slugDoc of slugDocsSnap.docs) {
        await slugDoc.ref.delete();
        deletedSlugs.push(slugDoc.id);
      }

      // 5. Delete Storage files under tenants/{tenantId}/
      let deletedStorageFiles = 0;
      if (storageListing.available && storageListing.files.length > 0) {
        try {
          await bucket.deleteFiles({ prefix: `tenants/${tenantId}/`, force: true });
        } catch {
          for (const file of storageListing.files) {
            await file.delete({ ignoreNotFound: true }).catch(() => {});
          }
        }
        const remainingStorage = await listPrefixFilesSafe(bucket, `tenants/${tenantId}/`);
        for (const file of remainingStorage.files) {
          await file.delete({ ignoreNotFound: true }).catch(() => {});
        }
        deletedStorageFiles = storageListing.files.length;
      }

      // 6. Remove tenantId from Auth Custom Claims of all affected users
      let cleanedUsersCount = 0;
      for (const uid of affectedMemberUids) {
        try {
          const userRecord = await auth.getUser(uid);
          const existingClaims = userRecord.customClaims || {};
          if (existingClaims.tenants && existingClaims.tenants[tenantId] !== undefined) {
            const nextClaims = removeTenantFromClaims(existingClaims, tenantId);
            await auth.setCustomUserClaims(uid, nextClaims);
            cleanedUsersCount += 1;
          }
        } catch (err) {
          if (err?.code !== 'auth/user-not-found') {
            throw err;
          }
        }
      }

      // 7. Second sweep to clean any late async trigger write
      await sleep(usingEmulator ? 400 : 1000);
      const residualSubcols = await tenantRef.listCollections();
      if (residualSubcols.length > 0) {
        await db.recursiveDelete(tenantRef);
      }
      const residualSlugs = await db.collection('tenant_slugs').where('tenantId', '==', tenantId).get();
      for (const doc of residualSlugs.docs) {
        await doc.ref.delete();
      }

      console.log(colors.green(`✅ Negocio ${tenantId} (${slug || '-'}) eliminado completamente.`));
      console.log(`   Slugs eliminados:      ${deletedSlugs.join(', ') || '(ninguno)'}`);
      console.log(`   Archivos de Storage:   ${deletedStorageFiles}`);
      console.log(`   Claims limpiados en:   ${cleanedUsersCount} usuario(s)`);
      console.log('');

      return {
        subcommand: 'delete',
        dryRun: false,
        executed: true,
        cancelled: false,
        tenantId,
        slug,
        deletedSlugs,
        deletedStorageFiles,
        cleanedUsersCount,
      };
    }
  );
};
