#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const EMULATOR_DATA_REL = '.firebase/emulator-data';
const EMULATOR_DATA_DIR = path.join(ROOT_DIR, '.firebase', 'emulator-data');
const LOCAL_ADMIN_EMAIL = (process.env.LOCAL_ADMIN_EMAIL || 'admin@local.test').trim().toLowerCase();
const LOCAL_ADMIN_PASSWORD = process.env.LOCAL_ADMIN_PASSWORD || 'LocalAdmin123!';
const EMULATOR_PORTS = [
  { name: 'Auth', host: '127.0.0.1', port: 9099 },
  { name: 'Firestore', host: '127.0.0.1', port: 8080 },
  { name: 'Storage', host: '127.0.0.1', port: 9199 },
  { name: 'Functions', host: '127.0.0.1', port: 5001 },
];

const IS_WIN = process.platform === 'win32';
const activeChildren = new Set();
let shuttingDown = false;

const quoteWinArg = (arg) => {
  const str = String(arg);
  if (str.length === 0) return '""';
  if (!/[\s"&|<>^()]/.test(str)) return str;
  return `"${str.replace(/"/g, '\\"')}"`;
};

const spawnManaged = (command, args = [], options = {}) => {
  const useShell = IS_WIN && command !== process.execPath;
  const child = useShell
    ? spawn([command, ...args].map(quoteWinArg).join(' '), {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: true,
      ...options,
    })
    : spawn(command, args, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: false,
      ...options,
    });

  activeChildren.add(child);
  child.on('exit', () => activeChildren.delete(child));
  return child;
};

const runCommandAndWait = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawnManaged(command, args);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`El comando "${command} ${args.join(' ')}" finalizó con código ${code}.`));
      }
    });
  });

const isPortOpen = (host, port, timeoutMs = 800) =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });

const waitForEmulators = async (emulatorsProc, timeoutMs = 90_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (emulatorsProc.exitCode !== null) {
      throw new Error(`Firebase Emulators se detuvo inesperadamente (código ${emulatorsProc.exitCode}).`);
    }

    const checks = await Promise.all(
      EMULATOR_PORTS.map(async (item) => ({
        ...item,
        open: await isPortOpen(item.host, item.port),
      }))
    );

    if (checks.every((item) => item.open)) {
      return;
    }

    await new Promise((r) => setTimeout(r, 750));
  }

  throw new Error('Tiempo de espera agotado aguardando que inicien los Firebase Emulators.');
};

const shutdown = (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of activeChildren) {
    if (child.exitCode === null) {
      try {
        child.kill('SIGINT');
      } catch {
        // Ignore if already terminated
      }
    }
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 1500).unref();
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const main = async () => {
  console.log('\n▸ Turneado · Entorno Local con Firebase Emulators\n');
  console.log('1/4 Compilando Cloud Functions...');
  await runCommandAndWait('npm', ['--prefix', 'functions', 'run', 'build']);

  console.log('\n2/4 Iniciando Firebase Emulators (Auth, Firestore, Storage, Functions)...');
  const emulatorArgs = ['emulators:start', '--only', 'auth,firestore,storage,functions'];
  if (existsSync(EMULATOR_DATA_DIR)) {
    emulatorArgs.push(`--import=${EMULATOR_DATA_REL}`);
  }
  emulatorArgs.push(`--export-on-exit=${EMULATOR_DATA_REL}`);

  const emulatorsProc = spawnManaged('firebase', emulatorArgs);
  emulatorsProc.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`\n[dev:local] Firebase Emulators finalizó (código ${code ?? 'desconocido'}).`);
      shutdown(code || 1);
    }
  });

  await waitForEmulators(emulatorsProc);
  console.log('\n✓ Emuladores activos.');

  console.log('\n3/4 Verificando usuario SuperAdmin y negocio /demo en el emulador (idempotente)...');
  await runCommandAndWait(process.execPath, [
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

  const viteArgs = ['vite', '--mode', 'emulator', ...process.argv.slice(2)];
  const viteProc = spawnManaged('npx', viteArgs);
  viteProc.on('exit', (code) => {
    if (!shuttingDown) {
      shutdown(code ?? 0);
    }
  });
};

main().catch((err) => {
  console.error('\n[dev:local] Error:', err instanceof Error ? err.message : err);
  shutdown(1);
});
