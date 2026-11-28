#!/usr/bin/env node
import { existsSync } from 'node:fs';
import {
  EMULATOR_DATA_DIR,
  EMULATOR_DATA_REL,
  LOCAL_ADMIN_EMAIL,
  LOCAL_ADMIN_PASSWORD,
  runWorkspaceCommand,
  spawnWorkspaceCommand,
  stopAllLocalServicesCleanly,
  waitForEmulatorsReady,
} from './cli/core/localRuntime.mjs';

let emulatorsProc = null;
let viteProc = null;
let shuttingDown = false;

const runCommandOrThrow = async (command, args) => {
  const res = await runWorkspaceCommand(command, args);
  if (res.exitCode !== 0) {
    throw new Error(`El comando "${command} ${args.join(' ')}" finalizó con código ${res.exitCode}.`);
  }
};

const shutdown = async (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  await stopAllLocalServicesCleanly({
    viteProc,
    emulatorsProc,
    exportBeforeStop: true,
  });
  process.exit(exitCode);
};

process.on('SIGINT', () => void shutdown(0));
process.on('SIGTERM', () => void shutdown(0));
process.on('SIGHUP', () => void shutdown(0));

const main = async () => {
  console.log('\n▸ Turneado · Entorno Local con Firebase Emulators\n');
  console.log('1/4 Compilando Cloud Functions...');
  await runCommandOrThrow('npm', ['--prefix', 'functions', 'run', 'build']);

  console.log('\n2/4 Iniciando Firebase Emulators (Auth, Firestore, Storage, Functions)...');
  const emulatorArgs = ['emulators:start', '--only', 'auth,firestore,storage,functions'];
  if (existsSync(EMULATOR_DATA_DIR)) {
    emulatorArgs.push(`--import=${EMULATOR_DATA_REL}`);
  }
  emulatorArgs.push(`--export-on-exit=${EMULATOR_DATA_REL}`);

  emulatorsProc = spawnWorkspaceCommand('firebase', emulatorArgs);
  emulatorsProc.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`\n[dev:local] Firebase Emulators finalizó (código ${code ?? 'desconocido'}).`);
      void shutdown(code || 1);
    }
  });

  await waitForEmulatorsReady(emulatorsProc);
  console.log('\n✓ Emuladores activos.');

  console.log('\n3/4 Verificando usuario SuperAdmin y negocio /demo en el emulador (idempotente)...');
  await runCommandOrThrow(process.execPath, [
    'scripts/turneado-cli.mjs',
    'init',
    '--admin-email',
    LOCAL_ADMIN_EMAIL,
    '--admin-password',
    LOCAL_ADMIN_PASSWORD,
    '--with-demo',
    '--emulator',
  ]);

  console.log('4/4 Iniciando frontend Vite en modo emulador...\n');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('  App (/demo):       http://localhost:5173/demo');
  console.log('  Login negocio:     http://localhost:5173/demo/login');
  console.log('  Login SuperAdmin:  http://localhost:5173/superadmin/login');
  console.log('  Emulator UI:       http://127.0.0.1:4000');
  console.log(`  Credenciales:      ${LOCAL_ADMIN_EMAIL} / ${LOCAL_ADMIN_PASSWORD}`);
  console.log('  Persistencia:      .firebase/emulator-data (al cerrar con Ctrl+C)');
  console.log('─────────────────────────────────────────────────────────────\n');

  const viteArgs = ['run', 'dev', '--', '--mode', 'emulator', ...process.argv.slice(2)];
  viteProc = spawnWorkspaceCommand('npm', viteArgs, {
    env: { ...process.env, VITE_USE_FIREBASE_EMULATORS: 'true' },
  });
  viteProc.on('exit', (code) => {
    if (!shuttingDown) {
      void shutdown(code ?? 0);
    }
  });
};

main().catch((err) => {
  console.error('\n[dev:local] Error:', err instanceof Error ? err.message : err);
  void shutdown(1);
});
