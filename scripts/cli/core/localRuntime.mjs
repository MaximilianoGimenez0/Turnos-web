import { execFile, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
export const DEFAULT_PROJECT_ID = 'turnos-web-eb8b5';
export const EMULATOR_DATA_REL = '.firebase/emulator-data';
export const EMULATOR_DATA_DIR = path.join(ROOT_DIR, '.firebase', 'emulator-data');
export const EMULATOR_DATA_STAGING_REL = '.firebase/emulator-data.staging';
export const EMULATOR_DATA_STAGING_DIR = path.join(ROOT_DIR, '.firebase', 'emulator-data.staging');
export const FIREBASE_EXPORT_PREFIX = 'firebase-export-';
export const LOCAL_LOG_FILE = path.join(ROOT_DIR, '.firebase', 'dev-local.log');
export const LOCAL_ADMIN_EMAIL = (process.env.LOCAL_ADMIN_EMAIL || 'admin@local.test')
  .trim()
  .toLowerCase();
export const LOCAL_ADMIN_PASSWORD = process.env.LOCAL_ADMIN_PASSWORD || 'LocalAdmin123!';

export const EMULATOR_PORTS = [
  { name: 'Auth', host: '127.0.0.1', port: 9099 },
  { name: 'Firestore', host: '127.0.0.1', port: 8080 },
  { name: 'Storage', host: '127.0.0.1', port: 9199 },
  { name: 'Functions', host: '127.0.0.1', port: 5001 },
];

// Auxiliary Firebase Emulator Suite ports (UI, Hub, Logging)
export const EMULATOR_AUX_PORTS = [4000, 4400, 4500];

export const VITE_PORT = { name: 'Vite', host: '127.0.0.1', port: 5173 };

export const ALL_LOCAL_MANAGED_PORTS = [
  ...EMULATOR_PORTS.map((p) => p.port),
  ...EMULATOR_AUX_PORTS,
  VITE_PORT.port,
];

const IS_WIN = process.platform === 'win32';

export const quoteWinArg = (arg) => {
  const str = String(arg);
  if (str.length === 0) return '""';
  if (!/[\s"&|<>^()]/.test(str)) return str;
  return `"${str.replace(/"/g, '\\"')}"`;
};

export const spawnWorkspaceCommand = (command, args = [], options = {}) => {
  const useShell = IS_WIN && command !== process.execPath;
  if (useShell) {
    return spawn([command, ...args].map(quoteWinArg).join(' '), {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: true,
      ...options,
    });
  }
  return spawn(command, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: false,
    ...options,
  });
};

export const runWorkspaceCommand = (command, args = [], options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawnWorkspaceCommand(command, args, options);
    child.on('error', reject);
    child.on('exit', (code) => {
      resolve({ exitCode: code ?? 1 });
    });
  });

export const isPortOpen = (host, port, timeoutMs = 600) =>
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

export const isVitePortOpen = async (timeoutMs = 600) => {
  const [ipv4, ipv6] = await Promise.all([
    isPortOpen('127.0.0.1', VITE_PORT.port, timeoutMs),
    isPortOpen('::1', VITE_PORT.port, timeoutMs),
  ]);
  return ipv4 || ipv6;
};

export const getLocalRuntimeStatus = async () => {
  const [emulatorChecks, viteRunning] = await Promise.all([
    Promise.all(
      EMULATOR_PORTS.map(async (item) => ({
        ...item,
        open: await isPortOpen(item.host, item.port),
      }))
    ),
    isVitePortOpen(),
  ]);

  const openEmulatorNames = emulatorChecks.filter((c) => c.open).map((c) => c.name);
  return {
    emulatorsRunning: emulatorChecks.every((c) => c.open),
    anyEmulatorRunning: openEmulatorNames.length > 0,
    openEmulatorNames,
    viteRunning,
    hasPersistedData: existsSync(EMULATOR_DATA_DIR),
  };
};

export const waitForEmulatorsReady = async (emulatorsProc, timeoutMs = 90_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (emulatorsProc && emulatorsProc.exitCode !== null) {
      throw new Error(
        `Firebase Emulators se detuvo inesperadamente (código ${emulatorsProc.exitCode}).`
      );
    }

    const status = await getLocalRuntimeStatus();
    if (status.emulatorsRunning) {
      return status;
    }

    await new Promise((r) => setTimeout(r, 750));
  }

  throw new Error('Tiempo de espera agotado aguardando que inicien los Firebase Emulators.');
};

export const waitForViteReady = async (viteProc, timeoutMs = 25_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (viteProc && viteProc.exitCode !== null) {
      throw new Error(
        `El servidor de desarrollo Vite se detuvo inesperadamente (código ${viteProc.exitCode}).`
      );
    }
    if (await isVitePortOpen(500)) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
};

/**
 * Parses `netstat -ano` output on Windows and returns unique PIDs listening on the target ports.
 */
export const parseListeningPidsFromNetstat = (stdout, targetPorts, excludePid = process.pid) => {
  const portSet = new Set(targetPorts.map((p) => Number(p)));
  const pids = new Set();
  const lines = String(stdout || '').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('TCP')) continue;
    const parts = line.split(/\s+/);
    // Expected columns: Proto, LocalAddress, ForeignAddress, State, PID
    if (parts.length < 5) continue;
    const localAddr = parts[1];
    const state = parts[3].toUpperCase();
    const pid = Number(parts[4]);

    if (state !== 'LISTENING') continue;
    if (!Number.isInteger(pid) || pid <= 0 || pid === excludePid) continue;

    const lastColon = localAddr.lastIndexOf(':');
    if (lastColon === -1) continue;
    const port = Number(localAddr.slice(lastColon + 1));
    if (portSet.has(port)) {
      pids.add(pid);
    }
  }

  return Array.from(pids);
};

const execFileText = (file, args) =>
  new Promise((resolve) => {
    execFile(file, args, { windowsHide: true }, (_err, stdout) => {
      resolve(String(stdout || ''));
    });
  });

const killPidTree = (pid) =>
  new Promise((resolve) => {
    if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) {
      resolve();
      return;
    }
    if (IS_WIN) {
      const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.once('exit', () => resolve());
      killer.once('error', () => resolve());
      return;
    }
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Already exited
    }
    resolve();
  });

export const findListeningPidsOnPorts = async (targetPorts = ALL_LOCAL_MANAGED_PORTS) => {
  if (IS_WIN) {
    const out = await execFileText('netstat', ['-ano', '-p', 'TCP']);
    return parseListeningPidsFromNetstat(out, targetPorts, process.pid);
  }

  const pids = new Set();
  for (const port of targetPorts) {
    const out = await execFileText('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN']);
    for (const token of out.split(/\s+/)) {
      const pid = Number(token.trim());
      if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) {
        pids.add(pid);
      }
    }
  }
  return Array.from(pids);
};

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableFsLockError = (err) => {
  const code = err && typeof err === 'object' ? err.code : '';
  return code === 'EPERM' || code === 'EBUSY' || code === 'EEXIST' || code === 'ENOTEMPTY';
};

/**
 * Replaces `destDir` with `srcDir`, retrying brief Windows Defender / file-handle locks
 * and falling back to copy + delete if cross-directory rename hits EPERM.
 */
export const replaceDirSafelyWithRetry = async (srcDir, destDir, maxAttempts = 5) => {
  mkdirSync(path.dirname(destDir), { recursive: true });
  rmSync(destDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 150 });

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      renameSync(srcDir, destDir);
      return true;
    } catch (err) {
      if (!isRetryableFsLockError(err) || attempt === maxAttempts) {
        if (!isRetryableFsLockError(err)) throw err;
        break;
      }
      rmSync(destDir, { recursive: true, force: true, maxRetries: 4, retryDelay: 120 });
      await sleepMs(150 * attempt);
    }
  }

  // Fallback on stubborn Windows EPERM during directory rename
  rmSync(destDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 150 });
  cpSync(srcDir, destDir, { recursive: true });
  rmSync(srcDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 150 });
  return true;
};

/**
 * Removes orphaned `firebase-export-*` directories in root and leftover staging folders.
 */
export const cleanupLingeringFirebaseExports = (rootDir = ROOT_DIR) => {
  const removed = [];
  let entries = [];
  try {
    entries = readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return removed;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(FIREBASE_EXPORT_PREFIX)) continue;
    const fullPath = path.join(rootDir, entry.name);
    try {
      rmSync(fullPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
      if (!existsSync(fullPath)) {
        removed.push(entry.name);
      }
    } catch {
      // Ignore locked folder during cleanup
    }
  }

  const stagingDir = path.join(rootDir, '.firebase', 'emulator-data.staging');
  if (existsSync(stagingDir)) {
    try {
      rmSync(stagingDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
    } catch {
      // Ignore
    }
  }

  return removed;
};

const findNewestCompleteFirebaseExport = (rootDir, minMtimeMs = 0) => {
  let entries = [];
  try {
    entries = readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return '';
  }

  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(FIREBASE_EXPORT_PREFIX)) continue;
    const fullPath = path.join(rootDir, entry.name);
    const metadataPath = path.join(fullPath, 'firebase-export-metadata.json');
    if (!existsSync(metadataPath)) continue;
    try {
      const stats = statSync(fullPath);
      if (stats.mtimeMs >= minMtimeMs) {
        candidates.push({ fullPath, mtimeMs: stats.mtimeMs });
      }
    } catch {
      // Ignore stat errors
    }
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0]?.fullPath || '';
};

export const exportEmulatorDataBestEffort = async () => {
  const startedAtMs = Date.now() - 1500;
  try {
    rmSync(EMULATOR_DATA_STAGING_DIR, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
    const res = await runWorkspaceCommand(
      'firebase',
      ['emulators:export', EMULATOR_DATA_STAGING_REL, '--force'],
      { stdio: 'ignore' }
    );

    const stagedMeta = path.join(EMULATOR_DATA_STAGING_DIR, 'firebase-export-metadata.json');
    if (res.exitCode === 0 && existsSync(stagedMeta)) {
      await replaceDirSafelyWithRetry(EMULATOR_DATA_STAGING_DIR, EMULATOR_DATA_DIR);
      return true;
    }

    // If `firebase-tools` failed its own internal rename on Windows (leaving a fresh `firebase-export-*`),
    // rescue the complete snapshot into `.firebase/emulator-data` before sweeping leftovers.
    const rescuedDir = findNewestCompleteFirebaseExport(ROOT_DIR, startedAtMs);
    if (rescuedDir) {
      await replaceDirSafelyWithRetry(rescuedDir, EMULATOR_DATA_DIR);
      return true;
    }

    return false;
  } catch {
    return false;
  } finally {
    cleanupLingeringFirebaseExports(ROOT_DIR);
  }
};

export const terminateChildGracefully = async (child, waitMs = 2500) => {
  if (!child || !child.pid) return;
  const pid = child.pid;

  if (IS_WIN) {
    // On Windows, `shell: true` spawns cmd.exe -> firebase -> java/node children.
    // `child.kill('SIGINT')` often leaves Java/Node children orphaned, so always kill the full tree.
    await killPidTree(pid);
    return;
  }

  if (child.exitCode !== null) return;

  await new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };

    child.once('exit', finish);
    try {
      child.kill('SIGINT');
    } catch {
      finish();
      return;
    }

    setTimeout(async () => {
      if (done) return;
      await killPidTree(pid);
      finish();
    }, waitMs).unref();
  });
};

/**
 * Cleanly shuts down managed Vite + Firebase Emulators AND sweeps any orphaned
 * Java/Node child processes still listening on local emulator/Vite ports.
 */
export const stopAllLocalServicesCleanly = async ({
  viteProc = null,
  emulatorsProc = null,
  exportBeforeStop = true,
} = {}) => {
  const statusBefore = await getLocalRuntimeStatus();
  let exported = false;

  if (exportBeforeStop && statusBefore.emulatorsRunning) {
    exported = await exportEmulatorDataBestEffort();
  }

  if (viteProc) {
    await terminateChildGracefully(viteProc);
  }
  if (emulatorsProc) {
    await terminateChildGracefully(emulatorsProc);
  }

  // Sweep any orphaned child processes (e.g., Java Firestore emulator or lingering Node workers)
  const lingeringPids = await findListeningPidsOnPorts(ALL_LOCAL_MANAGED_PORTS);
  if (lingeringPids.length > 0) {
    await Promise.all(lingeringPids.map((pid) => killPidTree(pid)));
    await new Promise((r) => setTimeout(r, 400));
  }

  cleanupLingeringFirebaseExports(ROOT_DIR);

  const statusAfter = await getLocalRuntimeStatus();
  return {
    exported,
    killedOrphanPids: lingeringPids,
    allStopped: !statusAfter.anyEmulatorRunning && !statusAfter.viteRunning,
    statusAfter,
  };
};
