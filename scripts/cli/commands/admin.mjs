import { mergePlatformAdminClaims, withAdminApp } from '../core/firebase.mjs';
import { colors, printBanner } from '../core/prompt.mjs';

export const parseAdminArgs = (argv) => {
  const [subcommand, ...rest] = argv;
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    return { help: true };
  }

  if (subcommand !== 'promote' && subcommand !== 'revoke') {
    throw new Error(`Subcomando inválido para admin: "${subcommand}". Usá "promote" o "revoke".`);
  }

  const options = {
    action: subcommand,
    email: '',
    uid: '',
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
    } else if (arg === '--email' || arg === '-e') {
      const next = rest[i + 1];
      if (!next || next.startsWith('-')) throw new Error('La opción --email requiere un valor.');
      options.email = next.trim().toLowerCase();
      i += 1;
    } else if (arg.startsWith('--email=')) {
      options.email = arg.slice('--email='.length).trim().toLowerCase();
    } else if (arg === '--uid' || arg === '-u') {
      const next = rest[i + 1];
      if (!next || next.startsWith('-')) throw new Error('La opción --uid requiere un valor.');
      options.uid = next.trim();
      i += 1;
    } else if (arg.startsWith('--uid=')) {
      options.uid = arg.slice('--uid='.length).trim();
    } else if (arg === '--project' || arg === '-p') {
      const next = rest[i + 1];
      if (!next || next.startsWith('-')) throw new Error('La opción --project requiere un valor.');
      options.project = next.trim();
      i += 1;
    } else if (arg.startsWith('--project=')) {
      options.project = arg.slice('--project='.length).trim();
    } else {
      throw new Error(`Argumento desconocido en admin ${subcommand}: "${arg}".`);
    }
  }

  return options;
};

export const printAdminUsage = () => {
  console.log(`Uso:
  npm run cli -- admin promote --email <correo> [--emulator] [--project <projectId>]
  npm run cli -- admin promote --uid <uid> [--emulator] [--project <projectId>]
  npm run cli -- admin revoke --email <correo> [--emulator] [--project <projectId>]`);
};

export const runAdminCommand = async (options, { silent = false } = {}) => {
  const cleanEmail = String(options.email || '').trim().toLowerCase();
  const cleanUid = String(options.uid || '').trim();
  const revoke = options.action === 'revoke' || Boolean(options.revoke);

  if (!cleanEmail && !cleanUid) {
    throw new Error('Debés indicar --email <correo> o --uid <uid>.');
  }

  return withAdminApp(
    { project: options.project, emulator: options.emulator },
    async ({ auth, projectId, usingEmulator }) => {
      const userRecord = cleanUid
        ? await auth.getUser(cleanUid)
        : await auth.getUserByEmail(cleanEmail);

      const nextClaims = mergePlatformAdminClaims(userRecord.customClaims || {}, revoke);
      await auth.setCustomUserClaims(userRecord.uid, nextClaims);

      const result = {
        uid: userRecord.uid,
        email: userRecord.email || cleanEmail || null,
        projectId,
        platformAdmin: nextClaims.platformAdmin,
        preservedTenants:
          nextClaims.tenants && typeof nextClaims.tenants === 'object' ? nextClaims.tenants : {},
        claims: nextClaims,
        usingAuthEmulator: usingEmulator,
      };

      if (!silent) {
        printBanner(`TurnosWeb CLI · Admin (${revoke ? 'revoke' : 'promote'})`);
        console.log(
          result.platformAdmin
            ? colors.green('✓ Custom Claim platformAdmin: true asignado correctamente.')
            : colors.yellow('✓ Custom Claim platformAdmin: false actualizado (permiso revocado).')
        );
        console.log(`  Proyecto: ${projectId}${usingEmulator ? ' (Emulator)' : ''}`);
        console.log(`  Usuario:  ${result.email ?? '(sin email)'} (UID: ${result.uid})`);
        console.log(`  Tenants preservados: ${Object.keys(result.preservedTenants).length}`);
        console.log('');
      }

      return result;
    }
  );
};
