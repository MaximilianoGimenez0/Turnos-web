#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDoctorArgs, printDoctorUsage, runDoctor } from './cli/commands/doctor.mjs';
import { parseResetArgs, printResetUsage, runReset } from './cli/commands/reset.mjs';
import { parseInitArgs, printInitUsage, runInit } from './cli/commands/init.mjs';
import { parseAdminArgs, printAdminUsage, runAdminCommand } from './cli/commands/admin.mjs';
import { parseTenantArgs, printTenantUsage, runTenantCommand } from './cli/commands/tenant.mjs';
import { parseBackupArgs, printBackupUsage, runBackupExport } from './cli/commands/backup.mjs';
import { colors } from './cli/core/prompt.mjs';

const __filename = fileURLToPath(import.meta.url);

export const printRootHelp = () => {
  console.log(`Turneado Operations CLI — Administración unificada de entorno y ciclo de vida

Uso:
  npm run cli -- <comando> [subcomando] [opciones]

Comandos disponibles:
  doctor                     Audita entorno, .env, functions/.env, credenciales ADC y conectividad Firebase.
  reset                      Purga completa controlada de Firestore, Storage y Auth (con guardrails).
  init                       Configuración inicial limpia (SuperAdmin y seed opcional --with-demo).
  admin <promote|revoke>     Asigna o revoca el claim platformAdmin en Firebase Auth.
  tenant <list|inspect|delete>
                             Lista, inspecciona o elimina permanentemente un negocio específico.
  backup export              Exporta un snapshot JSON local en backups/ (excluye secretos por defecto).

Flags transversales:
  --emulator                 Opera contra Firebase Emulators locales (Auth:9099, Firestore:8080, Storage:9199).
  --project, -p <id>         Sobrescribe el proyecto Firebase por defecto (.firebaserc).
  --help, -h                 Muestra la ayuda general o la ayuda del comando indicado.

Ejemplos rápidos:
  npm run cli -- doctor
  npm run cli -- backup export
  npm run cli -- reset --dry-run --emulator
  npm run cli -- reset --confirm-project turnos-web-eb8b5
  npm run cli -- init --admin-email admin@tu-dominio.app --with-demo
  npm run cli -- tenant list`);
};

export const runCli = async (argv = []) => {
  const [commandRaw, ...rest] = argv;
  const command = (commandRaw || '').trim().toLowerCase();

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printRootHelp();
    return { exitCode: 0 };
  }

  switch (command) {
    case 'doctor': {
      const options = parseDoctorArgs(rest);
      if (options.help) {
        printDoctorUsage();
        return { exitCode: 0 };
      }
      const result = await runDoctor(options);
      return { exitCode: result.hasErrors ? 1 : 0, result };
    }

    case 'reset': {
      const options = parseResetArgs(rest);
      if (options.help) {
        printResetUsage();
        return { exitCode: 0 };
      }
      const result = await runReset(options);
      return { exitCode: 0, result };
    }

    case 'init': {
      const options = parseInitArgs(rest);
      if (options.help) {
        printInitUsage();
        return { exitCode: 0 };
      }
      const result = await runInit(options);
      return { exitCode: 0, result };
    }

    case 'admin': {
      const options = parseAdminArgs(rest);
      if (options.help) {
        printAdminUsage();
        return { exitCode: 0 };
      }
      const result = await runAdminCommand(options);
      return { exitCode: 0, result };
    }

    case 'tenant': {
      const options = parseTenantArgs(rest);
      if (options.help) {
        printTenantUsage();
        return { exitCode: 0 };
      }
      const result = await runTenantCommand(options);
      return { exitCode: 0, result };
    }

    case 'backup': {
      const options = parseBackupArgs(rest);
      if (options.help) {
        printBackupUsage();
        return { exitCode: 0 };
      }
      const result = await runBackupExport(options);
      return { exitCode: 0, result };
    }

    default:
      throw new Error(
        `Comando desconocido: "${commandRaw}". Ejecutá "npm run cli -- --help" para ver los comandos disponibles.`
      );
  }
};

const isDirectExecution = () => {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === path.resolve(__filename);
};

if (isDirectExecution()) {
  (async () => {
    try {
      const { exitCode } = await runCli(process.argv.slice(2));
      process.exit(exitCode ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(colors.red(`❌ Error: ${message}`));
      process.exit(1);
    }
  })();
}
