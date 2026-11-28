#!/usr/bin/env node
import { createWriteStream, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { stdin as input, stdout as output } from 'node:process';
import { colors, askText } from './core/prompt.mjs';
import { detectPersistedSuperAdmin } from './core/firebase.mjs';
import {
  DEFAULT_PROJECT_ID,
  EMULATOR_DATA_DIR,
  EMULATOR_DATA_REL,
  LOCAL_ADMIN_EMAIL,
  LOCAL_ADMIN_PASSWORD,
  LOCAL_LOG_FILE,
  ROOT_DIR,
  cleanupLingeringFirebaseExports,
  getLocalRuntimeStatus,
  runWorkspaceCommand,
  spawnWorkspaceCommand,
  stopAllLocalServicesCleanly,
  waitForEmulatorsReady,
  waitForViteReady,
} from './core/localRuntime.mjs';

const MAX_LOG_LINES = 400;

const clearTerminalScreen = () => {
  if (output.isTTY) {
    output.write('\x1b[2J\x1b[3J\x1b[H');
  } else {
    console.clear();
  }
};

export const CONSOLE_ACTIONS = [
  {
    id: '1',
    group: 'local',
    label: 'Iniciar entorno local completo (Emuladores + Seed + npm run dev)',
    activeLabel: 'Detener entorno local completo (exporta datos y cierra todo)',
    cleanupLabel: 'Detener y limpiar procesos residuales (Emuladores / Vite)',
    constraintTag: 'Segundo plano · misma ventana',
    activeConstraintTag: 'Exporta datos y libera todos los puertos',
    cleanupConstraintTag: 'Cierra procesos colgados y libera puertos',
    checkPrecondition: () => ({ ok: true }),
  },
  {
    id: '2',
    group: 'local',
    label: 'Ver logs en vivo de Emuladores y Vite',
    constraintTag: 'Requiere entorno iniciado desde esta ventana',
    checkPrecondition: (state) => {
      if (!state.managedLocalActive && state.logCount === 0) {
        return {
          ok: false,
          reason:
            'Todavía no se inició el entorno local desde esta ventana. Elegí primero la opción [1].',
        };
      }
      return { ok: true };
    },
  },
  {
    id: '3',
    group: 'local',
    label: 'Reset datos + Dataseed /demo en emulador (preserva SuperAdmin)',
    constraintTag: 'Requiere emuladores activos · Sin re-ingresar credenciales',
    checkPrecondition: (state) => {
      if (!state.emulatorsRunning) {
        return {
          ok: false,
          reason:
            'Esta acción requiere los emuladores activos. Elegí primero la opción [1] para iniciarlos en segundo plano, o la opción [4] si querés borrar los datos offline.',
        };
      }
      return { ok: true };
    },
  },
  {
    id: '4',
    group: 'local',
    label: 'Borrar persistencia (.firebase\\emulator-data y restos firebase-export-*)',
    constraintTag: 'Requiere emuladores detenidos',
    checkPrecondition: (state) => {
      if (state.anyEmulatorRunning || state.managedLocalActive) {
        return {
          ok: false,
          reason:
            'No se puede borrar .firebase\\emulator-data con emuladores activos. Detenelos primero (opción [1]) o usá la opción [3] para reset en caliente.',
        };
      }
      return { ok: true };
    },
  },
  {
    id: '5',
    group: 'prod',
    label: 'Diagnóstico del entorno (Doctor)',
    constraintTag: 'Solo lectura',
    checkPrecondition: () => ({ ok: true }),
  },
  {
    id: '6',
    group: 'prod',
    label: 'Exportar backup JSON de Firestore',
    constraintTag: 'Solo lectura · Producción',
    checkPrecondition: () => ({ ok: true }),
  },
  {
    id: '7',
    group: 'prod',
    label: 'Listar negocios en producción (Tenants)',
    constraintTag: 'Solo lectura · Producción',
    checkPrecondition: () => ({ ok: true }),
  },
  {
    id: '8',
    group: 'prod',
    label: 'Sembrar SuperAdmin + /demo en entorno real',
    constraintTag: 'Producción · Reutiliza SuperAdmin si ya existe · No sobrescribe',
    checkPrecondition: () => ({ ok: true }),
  },
  {
    id: '9',
    group: 'prod',
    label: 'Limpiar todos los datos en producción (Reset)',
    constraintTag: 'Producción · Destructivo · Pide confirmación',
    checkPrecondition: () => ({ ok: true }),
  },
  {
    id: '10',
    group: 'tools',
    label: 'Sincronizar feriados',
    constraintTag: 'Local',
    checkPrecondition: () => ({ ok: true }),
  },
  {
    id: '11',
    group: 'tools',
    label: 'Tests unitarios + Build de producción',
    constraintTag: 'Local',
    checkPrecondition: () => ({ ok: true }),
  },
];

export const evaluateConsoleAction = (actionId, state) => {
  const normalized = String(actionId || '').trim();
  const action = CONSOLE_ACTIONS.find((a) => a.id === normalized);
  if (!action) {
    return { action: null, ok: false, reason: `Opción inválida: "${actionId}".` };
  }
  const check = action.checkPrecondition(state);
  return { action, ok: check.ok, reason: check.reason || '' };
};

const createLogManager = () => {
  const lines = [];
  const listeners = new Set();
  let fileStream = null;

  const ensureFileStream = () => {
    if (fileStream) return fileStream;
    try {
      mkdirSync(path.dirname(LOCAL_LOG_FILE), { recursive: true });
      fileStream = createWriteStream(LOCAL_LOG_FILE, { flags: 'a', encoding: 'utf8' });
    } catch {
      fileStream = null;
    }
    return fileStream;
  };

  const push = (source, rawChunk) => {
    const text = String(rawChunk || '').replace(/\r/g, '');
    const split = text.split('\n');
    for (const part of split) {
      if (!part) continue;
      const entry = {
        timestamp: new Date().toLocaleTimeString('es-AR', { hour12: false }),
        source,
        text: part,
      };
      lines.push(entry);
      if (lines.length > MAX_LOG_LINES) {
        lines.shift();
      }
      const stream = ensureFileStream();
      if (stream) {
        stream.write(`[${entry.timestamp}] [${entry.source}] ${entry.text}\n`);
      }
      for (const listener of listeners) {
        listener(entry);
      }
    }
  };

  const attachChildLogs = (child, source) => {
    if (child.stdout) {
      child.stdout.on('data', (chunk) => push(source, chunk));
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk) => push(source, chunk));
    }
  };

  const closeFile = () => {
    if (fileStream) {
      try {
        fileStream.end();
      } catch {
        // Ignore
      }
      fileStream = null;
    }
  };

  return {
    push,
    attachChildLogs,
    closeFile,
    getRecent: (count = 40) => lines.slice(-count),
    getCount: () => lines.length,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
};

const formatLogEntry = (entry) => {
  const sourceBadge =
    entry.source === 'VITE'
      ? colors.cyan('[VITE]')
      : entry.source === 'EMULATORS'
      ? colors.yellow('[EMUL]')
      : colors.green('[SYS] ');
  return `${colors.dim(entry.timestamp)} ${sourceBadge} ${entry.text}`;
};

const pressEnterToContinue = async () => {
  if (!input.isTTY) return;
  const rl = readline.createInterface({ input, output });
  try {
    await rl.question(colors.dim('\nPresioná Enter para volver al menú... '));
  } finally {
    rl.close();
  }
};

const viewLiveLogs = async (logs) => {
  clearTerminalScreen();
  console.log(colors.bold(colors.cyan('▸ Logs en vivo (Emuladores + Vite)')));
  console.log(
    colors.dim(
      `  Archivo: ${path.relative(ROOT_DIR, LOCAL_LOG_FILE)} · Presioná "q" o Enter para volver al menú sin detener nada.\n`
    )
  );

  for (const entry of logs.getRecent(40)) {
    console.log(formatLogEntry(entry));
  }

  const unsubscribe = logs.subscribe((entry) => {
    console.log(formatLogEntry(entry));
  });

  await new Promise((resolve) => {
    const finish = () => {
      unsubscribe();
      if (input.isTTY && typeof input.setRawMode === 'function') {
        input.setRawMode(false);
      }
      input.removeListener('data', onData);
      input.pause();
      resolve();
    };

    const onData = (buf) => {
      const str = buf.toString('utf8');
      if (str === 'q' || str === 'Q' || str === '\r' || str === '\n' || str === '\x1b' || str === '\x03') {
        finish();
      }
    };

    if (input.isTTY && typeof input.setRawMode === 'function') {
      input.setRawMode(true);
    }
    input.resume();
    input.on('data', onData);
  });
};

const renderMenu = (state) => {
  clearTerminalScreen();
  console.log(colors.bold('=========================================================================='));
  console.log(colors.bold(colors.cyan('  TURNEADO · Consola Operativa Unificada (Emulador + Producción)')));
  console.log(colors.bold('=========================================================================='));
  console.log(colors.dim(`  Directorio: ${ROOT_DIR}`));

  const emulLabel = state.emulatorsRunning
    ? colors.green(`● ACTIVOS (${state.openEmulatorNames.join(' · ')})`)
    : state.anyEmulatorRunning
    ? colors.yellow(`◐ PARCIALES (${state.openEmulatorNames.join(' · ')})`)
    : colors.dim('○ DETENIDOS');

  const viteLabel = state.viteRunning
    ? colors.green('● ACTIVO (http://localhost:5173/demo)')
    : colors.dim('○ DETENIDO');

  const persistLabel = state.hasPersistedData
    ? colors.cyan('.firebase\\emulator-data (guardada)')
    : colors.dim('.firebase\\emulator-data (vacía)');

  const managedHint = state.managedLocalActive
    ? colors.green(' [gestionado en esta ventana]')
    : '';

  console.log(`  Emuladores:   ${emulLabel}${managedHint}`);
  console.log(`  Frontend:     ${viteLabel}`);
  console.log(`  Persistencia: ${persistLabel}`);
  console.log(colors.dim('--------------------------------------------------------------------------'));

  const printGroup = (title, groupId) => {
    console.log('');
    console.log(colors.bold(`  ${title}`));
    for (const action of CONSOLE_ACTIONS.filter((a) => a.group === groupId)) {
      const isManagedToggle = action.id === '1' && state.managedLocalActive;
      const isExternalCleanup =
        action.id === '1' &&
        !state.managedLocalActive &&
        (state.anyEmulatorRunning || state.viteRunning);
      const label = isManagedToggle
        ? action.activeLabel
        : isExternalCleanup
        ? action.cleanupLabel
        : action.label;
      const tag = isManagedToggle
        ? action.activeConstraintTag
        : isExternalCleanup
        ? action.cleanupConstraintTag
        : action.constraintTag;
      const check = action.checkPrecondition(state);
      const idStr = `[${action.id}]`.padEnd(4);
      if (check.ok) {
        console.log(`  ${colors.cyan(idStr)} ${label} ${colors.dim(`— [${tag}]`)}`);
      } else {
        console.log(`  ${colors.dim(`${idStr} ${label} — [${tag}]`)}`);
      }
    }
  };

  printGroup('ENTORNO LOCAL (EMULADOR)', 'local');
  printGroup('ENTORNO REAL (PRODUCCIÓN FIREBASE)', 'prod');
  printGroup('UTILIDADES Y CALIDAD', 'tools');

  console.log('');
  console.log(
    `  ${colors.cyan('[R] ')} Actualizar estado    ${colors.cyan('[0] ')} Salir${
      state.managedLocalActive ? colors.dim(' (detiene emuladores y Vite limpiamente)') : ''
    }`
  );
  console.log(colors.bold('=========================================================================='));
  console.log('');
};

export const runInteractiveConsole = async () => {
  const logs = createLogManager();
  let emulatorsProc = null;
  let viteProc = null;
  let shuttingDown = false;

  const isManagedActive = () =>
    Boolean((emulatorsProc && emulatorsProc.exitCode === null) || (viteProc && viteProc.exitCode === null));

  const stopManagedLocal = async ({ forceSweepExternal = false } = {}) => {
    if (!isManagedActive() && !forceSweepExternal) return;
    console.log(
      colors.yellow('\n▸ Exportando datos y deteniendo Emuladores + Vite (árbol completo)...')
    );
    const result = await stopAllLocalServicesCleanly({
      viteProc,
      emulatorsProc,
      exportBeforeStop: true,
    });
    viteProc = null;
    emulatorsProc = null;

    if (result.exported) {
      console.log(colors.green('✓ Datos del emulador exportados en .firebase\\emulator-data.'));
    }
    if (result.killedOrphanPids.length > 0) {
      console.log(
        colors.dim(
          `  Procesos residuales cerrados (PIDs): ${result.killedOrphanPids.join(', ')}`
        )
      );
    }
    if (result.allStopped) {
      logs.push('SYSTEM', 'Todos los procesos locales y puertos fueron liberados correctamente.');
      console.log(colors.green('✓ Todos los emuladores y Vite quedaron completamente detenidos.\n'));
    } else {
      console.log(
        colors.yellow(
          `⚠ Algunos puertos siguen ocupados (${result.statusAfter.openEmulatorNames.join(', ') || 'Vite'}). Intentá nuevamente o revisá el Administrador de tareas.\n`
        )
      );
    }
  };

  const startManagedLocal = async () => {
    console.log(colors.cyan('\n▸ 1/4 Compilando Cloud Functions...'));
    const buildRes = await runWorkspaceCommand('npm', ['--prefix', 'functions', 'run', 'build']);
    if (buildRes.exitCode !== 0) {
      throw new Error('Falló la compilación de Cloud Functions.');
    }

    console.log(colors.cyan('\n▸ 2/4 Iniciando Firebase Emulators en segundo plano...'));
    cleanupLingeringFirebaseExports();
    const emulatorArgs = ['emulators:start', '--only', 'auth,firestore,storage,functions'];
    if (existsSync(EMULATOR_DATA_DIR)) {
      emulatorArgs.push(`--import=${EMULATOR_DATA_REL}`);
    }

    emulatorsProc = spawnWorkspaceCommand('firebase', emulatorArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    logs.attachChildLogs(emulatorsProc, 'EMULATORS');
    emulatorsProc.once('exit', (code) => {
      logs.push('SYSTEM', `Firebase Emulators finalizó (código ${code ?? 'desconocido'}).`);
    });

    await waitForEmulatorsReady(emulatorsProc);
    console.log(colors.green('✓ Emuladores activos (9099 / 8080 / 9199 / 5001).'));

    console.log(colors.cyan('\n▸ 3/4 Verificando SuperAdmin y dataseed /demo (idempotente)...'));
    const existingAdmin = await detectPersistedSuperAdmin({ emulator: true });
    const seedArgs = ['scripts/turneado-cli.mjs', 'init', '--with-demo', '--emulator'];
    if (!existingAdmin && !input.isTTY) {
      seedArgs.push('--admin-email', LOCAL_ADMIN_EMAIL, '--admin-password', LOCAL_ADMIN_PASSWORD);
    }
    const seedRes = await runWorkspaceCommand(process.execPath, seedArgs);
    if (seedRes.exitCode !== 0) {
      throw new Error('Falló la inicialización/seed en el emulador.');
    }
    const resolvedAdmin = existingAdmin || (await detectPersistedSuperAdmin({ emulator: true }));

    console.log(colors.cyan('\n▸ 4/4 Iniciando frontend con npm run dev (modo emulador) en segundo plano...'));
    viteProc = spawnWorkspaceCommand('npm', ['run', 'dev', '--', '--mode', 'emulator'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        VITE_USE_FIREBASE_EMULATORS: 'true',
      },
    });
    logs.attachChildLogs(viteProc, 'VITE');
    viteProc.once('exit', (code) => {
      logs.push('SYSTEM', `Vite finalizó (código ${code ?? 'desconocido'}).`);
    });

    const viteReady = await waitForViteReady(viteProc, 25_000);
    if (viteReady) {
      console.log(colors.green('✓ Frontend Vite activo en http://localhost:5173/demo'));
    } else {
      console.log(
        colors.yellow(
          '⚠ Vite sigue iniciando en segundo plano; revisá la opción [2] (Ver logs en vivo) si demora.'
        )
      );
    }

    console.log(colors.green('\n✓ Entorno local listo en segundo plano:'));
    console.log(`  App (/demo):       http://localhost:5173/demo`);
    console.log(`  Admin Demo:        http://localhost:5173/demo/login`);
    console.log(`  SuperAdmin:        http://localhost:5173/superadmin/login`);
    console.log(`  Emulator UI:       http://127.0.0.1:4000`);
    console.log(
      `  SuperAdmin:        ${resolvedAdmin?.email || '(configurado en Auth)'} (credenciales persistidas)`
    );
    console.log(colors.dim('  Podés seguir ejecutando cualquier acción desde este menú (o ver logs con [2]).'));
  };

  const handleSignalExit = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    await stopManagedLocal();
    logs.closeFile();
    process.exit(0);
  };

  process.on('SIGINT', handleSignalExit);
  process.on('SIGTERM', handleSignalExit);
  process.on('SIGHUP', handleSignalExit);

  try {
    while (!shuttingDown) {
      const runtime = await getLocalRuntimeStatus();
      const state = {
        ...runtime,
        managedLocalActive: isManagedActive(),
        logCount: logs.getCount(),
      };

      renderMenu(state);
      const rawChoice = await askText('Elegí una opción [0-11 / R]: ');
      const choice = rawChoice.trim().toUpperCase();

      if (!choice || choice === 'R') {
        continue;
      }

      if (choice === '0') {
        await stopManagedLocal();
        break;
      }

      const evaluation = evaluateConsoleAction(choice, state);
      if (!evaluation.ok) {
        console.log(colors.yellow(`\n⚠ ${evaluation.reason}`));
        await pressEnterToContinue();
        continue;
      }

      if (choice !== '2') {
        clearTerminalScreen();
        const activeTitle =
          choice === '1' && state.managedLocalActive
            ? evaluation.action.activeLabel
            : choice === '1' && (state.anyEmulatorRunning || state.viteRunning)
            ? evaluation.action.cleanupLabel
            : evaluation.action.label;
        console.log(colors.bold(colors.cyan(`▸ [${choice}] ${activeTitle}`)));
      }

      try {
        switch (choice) {
          case '1':
            if (state.managedLocalActive || state.anyEmulatorRunning || state.viteRunning) {
              await stopManagedLocal({ forceSweepExternal: true });
            } else {
              await startManagedLocal();
            }
            break;

          case '2':
            await viewLiveLogs(logs);
            continue;

          case '3': {
            console.log(colors.cyan('\n▸ 1/2 Limpiando datos del emulador (preservando SuperAdmin)...\n'));
            const resetRes = await runWorkspaceCommand('npm', [
              'run',
              'cli',
              '--',
              'reset',
              '--confirm-project',
              DEFAULT_PROJECT_ID,
              '--yes',
              '--emulator',
            ]);
            if (resetRes.exitCode === 0) {
              console.log(colors.cyan('\n▸ 2/2 Sembrando dataseed /demo en emulador...\n'));
              await runWorkspaceCommand('npm', ['run', 'emulators:seed']);
            }
            break;
          }

          case '4': {
            const hadPersisted = existsSync(EMULATOR_DATA_DIR);
            if (hadPersisted) {
              rmSync(EMULATOR_DATA_DIR, { recursive: true, force: true });
            }
            const removedExports = cleanupLingeringFirebaseExports();
            if (hadPersisted || removedExports.length > 0) {
              console.log(
                colors.green(
                  `\n✓ Limpieza completada (${
                    hadPersisted ? '.firebase\\emulator-data eliminada' : 'sin emulator-data'
                  }${
                    removedExports.length > 0
                      ? ` · ${removedExports.length} carpeta(s) firebase-export-* eliminada(s)`
                      : ''
                  }). El próximo inicio sembrará desde cero.`
                )
              );
            } else {
              console.log(
                colors.dim(
                  '\nNo había datos persistidos (.firebase\\emulator-data) ni carpetas firebase-export-* residuales.'
                )
              );
            }
            break;
          }

          case '5':
            console.log('');
            await runWorkspaceCommand('npm', ['run', 'cli', '--', 'doctor']);
            break;

          case '6':
            console.log('');
            await runWorkspaceCommand('npm', ['run', 'cli', '--', 'backup', 'export']);
            break;

          case '7':
            console.log('');
            await runWorkspaceCommand('npm', ['run', 'cli', '--', 'tenant', 'list']);
            break;

          case '8': {
            console.log(
              colors.yellow(
                `\n[ATENCIÓN] Esta acción inicializará / verificará SuperAdmin y /demo en el entorno REAL (${DEFAULT_PROJECT_ID}).`
              )
            );
            const confirmProd = await askText(
              'Presioná Enter para continuar (o escribí "n" para cancelar): '
            );
            if (confirmProd && ['n', 'no', 'cancel', 'cancelar'].includes(confirmProd.toLowerCase())) {
              console.log(colors.dim('Acción cancelada.'));
              break;
            }
            await runWorkspaceCommand('npm', ['run', 'cli', '--', 'init', '--with-demo']);
            break;
          }

          case '9':
            console.log(
              colors.red(
                `\n[PELIGRO] Reset en entorno REAL (${DEFAULT_PROJECT_ID}). La CLI solicitará confirmación escrita.\n`
              )
            );
            await runWorkspaceCommand('npm', [
              'run',
              'cli',
              '--',
              'reset',
              '--confirm-project',
              DEFAULT_PROJECT_ID,
            ]);
            break;

          case '10':
            console.log('');
            await runWorkspaceCommand('npm', ['run', 'holidays:sync']);
            break;

          case '11': {
            console.log(colors.cyan('\n▸ 1/2 Ejecutando tests unitarios...\n'));
            const testRes = await runWorkspaceCommand('npm', ['test']);
            if (testRes.exitCode === 0) {
              console.log(colors.cyan('\n▸ 2/2 Ejecutando build de producción...\n'));
              await runWorkspaceCommand('npm', ['run', 'build']);
            }
            break;
          }
        }
      } catch (err) {
        console.error(colors.red(`\n❌ Error: ${err instanceof Error ? err.message : err}`));
      }

      await pressEnterToContinue();
    }
  } finally {
    await stopManagedLocal();
    logs.closeFile();
  }
};

const isDirectExecution = () => {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
};

if (isDirectExecution()) {
  runInteractiveConsole().catch((err) => {
    console.error(colors.red(`❌ Error fatal en la consola: ${err instanceof Error ? err.message : err}`));
    process.exit(1);
  });
}
