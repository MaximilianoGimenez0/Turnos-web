import { describe, expect, it } from 'vitest';
import {
  auditEnvConfig,
  extractEmailAddressFromFromHeader,
  formatEnvValueForDisplay,
  maskSecretValue,
} from '../../scripts/cli/core/env.mjs';
import {
  findExistingSuperAdmin,
  mergePlatformAdminClaims,
  removeTenantFromClaims,
  stripAllTenantsFromClaims,
} from '../../scripts/cli/core/firebase.mjs';
import { parseDoctorArgs } from '../../scripts/cli/commands/doctor.mjs';
import { parseResetArgs, runReset } from '../../scripts/cli/commands/reset.mjs';
import {
  buildDemoSeedData,
  parseInitArgs,
  validateSlug,
  validateTimezone,
} from '../../scripts/cli/commands/init.mjs';
import { parseAdminArgs } from '../../scripts/cli/commands/admin.mjs';
import { parseTenantArgs } from '../../scripts/cli/commands/tenant.mjs';
import { parseBackupArgs } from '../../scripts/cli/commands/backup.mjs';
import { CONSOLE_ACTIONS, evaluateConsoleAction } from '../../scripts/cli/console.mjs';
import {
  cleanupLingeringFirebaseExports,
  parseListeningPidsFromNetstat,
  replaceDirSafelyWithRetry,
} from '../../scripts/cli/core/localRuntime.mjs';
import { runCli } from '../../scripts/turneado-cli.mjs';

describe('Turneado Operations CLI — Unit Tests', () => {
  describe('parsing de argumentos de todos los subcomandos', () => {
    it('parsea flags de doctor correctamente', () => {
      expect(
        parseDoctorArgs(['--emulator', '--project', 'mi-proj', '--bucket=mi-bucket', '--skip-connectivity'])
      ).toEqual({
        emulator: true,
        project: 'mi-proj',
        bucket: 'mi-bucket',
        skipConnectivity: true,
        help: false,
      });

      expect(() => parseDoctorArgs(['--desconocido'])).toThrow(/Argumento desconocido/);
      expect(() => parseDoctorArgs(['--project'])).toThrow(/requiere un valor/);
    });

    it('parsea flags de reset incluyendo --keep-email repetible y --wipe-auth-all', () => {
      const parsed = parseResetArgs([
        '--confirm-project=turnos-web-eb8b5',
        '--keep-email',
        'Uno@Test.com,dos@test.com',
        '--keep-email=uno@test.com',
        '--skip-storage',
        '--yes',
        '--emulator',
      ]);

      expect(parsed).toEqual({
        dryRun: false,
        confirmProject: 'turnos-web-eb8b5',
        keepSuperadmin: true,
        keepEmails: ['uno@test.com', 'dos@test.com'],
        wipeAuthAll: false,
        skipStorage: true,
        skipAuth: false,
        yes: true,
        emulator: true,
        project: '',
        bucket: '',
        help: false,
      });

      const wipeAll = parseResetArgs(['--wipe-auth-all', '--dry-run']);
      expect(wipeAll.wipeAuthAll).toBe(true);
      expect(wipeAll.keepSuperadmin).toBe(false);
      expect(wipeAll.dryRun).toBe(true);

      expect(() => parseResetArgs(['--confirm-project'])).toThrow(/requiere el ID/);
      expect(() => parseResetArgs(['--invalid'])).toThrow(/Argumento desconocido/);
    });

    it('parsea flags de init correctamente', () => {
      expect(
        parseInitArgs([
          '--admin-email',
          'Root@Turneado.App',
          '--admin-password=Clave1234',
          '--with-demo',
          '--demo-slug',
          'mi-demo',
          '--demo-name=Estudio Prueba',
          '--timezone=America/Argentina/Buenos_Aires',
          '--emulator',
        ])
      ).toEqual({
        adminEmail: 'root@turneado.app',
        adminPassword: 'Clave1234',
        withDemo: true,
        demoSlug: 'mi-demo',
        demoName: 'Estudio Prueba',
        timezone: 'America/Argentina/Buenos_Aires',
        emulator: true,
        project: '',
        bucket: '',
        help: false,
      });

      expect(() => parseInitArgs(['--admin-email'])).toThrow(/requiere un correo/);
      expect(() => parseInitArgs(['--foo'])).toThrow(/Argumento desconocido/);
    });

    it('parsea flags de admin promote/revoke', () => {
      expect(parseAdminArgs(['promote', '--email', 'Admin@Test.com', '--emulator'])).toEqual({
        action: 'promote',
        email: 'admin@test.com',
        uid: '',
        project: '',
        emulator: true,
        help: false,
      });

      expect(parseAdminArgs(['revoke', '--uid=uid_abc'])).toEqual({
        action: 'revoke',
        email: '',
        uid: 'uid_abc',
        project: '',
        emulator: false,
        help: false,
      });

      expect(() => parseAdminArgs(['promote', '--bad'])).toThrow(/Argumento desconocido/);
    });

    it('parsea flags de tenant list/inspect/delete', () => {
      expect(
        parseTenantArgs(['delete', 'demo', '--confirm', 'demo', '--dry-run', '--emulator'])
      ).toEqual({
        subcommand: 'delete',
        target: 'demo',
        confirm: 'demo',
        dryRun: true,
        yes: false,
        emulator: true,
        project: '',
        bucket: '',
        help: false,
      });

      expect(() => parseTenantArgs(['delete', 'demo', '--confirm'])).toThrow(/requiere el slug/);
      expect(() => parseTenantArgs(['list', '--unknown'])).toThrow(/Argumento desconocido/);
    });

    it('parsea flags de backup export', () => {
      expect(
        parseBackupArgs(['export', '--out', 'backups/custom.json', '--include-secrets', '--emulator'])
      ).toEqual({
        action: 'export',
        out: 'backups/custom.json',
        includeSecrets: true,
        emulator: true,
        project: '',
        help: false,
      });

      expect(() => parseBackupArgs(['export', '--out'])).toThrow(/requiere una ruta/);
      expect(() => parseBackupArgs(['export', '--extra'])).toThrow(/Argumento desconocido/);
    });

    it('rutea --help y rechaza comandos desconocidos en runCli', async () => {
      const helpResult = await runCli(['--help']);
      expect(helpResult.exitCode).toBe(0);

      await expect(runCli(['comando-inexistente'])).rejects.toThrow(/Comando desconocido/);
    });
  });

  describe('guardrails de seguridad en reset', () => {
    it('rechaza inmediatamente reset sin --confirm-project', async () => {
      await expect(
        runReset({
          dryRun: false,
          confirmProject: '',
          project: 'turnos-web-eb8b5',
          emulator: true,
        })
      ).rejects.toThrow(/--confirm-project turnos-web-eb8b5/);
    });

    it('rechaza inmediatamente reset cuando --confirm-project no coincide con el proyecto destino', async () => {
      await expect(
        runReset({
          dryRun: false,
          confirmProject: 'otro-proyecto',
          project: 'turnos-web-eb8b5',
          emulator: true,
        })
      ).rejects.toThrow(/no coincide con el proyecto destino/);
    });
  });

  describe('validaciones de doctor y redacción de secretos', () => {
    it('enmascara valores sensibles y preserva valores no sensibles', () => {
      expect(maskSecretValue('AKIA_SUPER_SECRET_TOKEN_987654321')).toBe('AKIA_S...4321');
      expect(maskSecretValue('short')).toBe('****');
      expect(maskSecretValue('')).toBe('(vacío)');

      expect(formatEnvValueForDisplay('AWS_ACCESS_KEY_ID', 'AKIA1234567890ABCDEF')).not.toContain(
        '1234567890'
      );
      expect(
        formatEnvValueForDisplay('AWS_SECRET_ACCESS_KEY', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCY123456')
      ).not.toContain('K7MDENG');
      expect(formatEnvValueForDisplay('MP_ACCESS_TOKEN', 'APP_USR-999999999999')).not.toContain(
        '999999999'
      );
      expect(formatEnvValueForDisplay('CLIENT_APP_URL', 'https://turneado.app')).toBe(
        'https://turneado.app'
      );
    });

    it('extrae dirección de email desde cabeceras From', () => {
      expect(extractEmailAddressFromFromHeader('Turneado <noreply@turneado.app>')).toBe(
        'noreply@turneado.app'
      );
      expect(extractEmailAddressFromFromHeader('noreply@turneado.app')).toBe(
        'noreply@turneado.app'
      );
    });

    it('detecta SES_FROM_EMAIL sin @, AWS_REGION ausente, MP_WEBHOOK_URL con placeholder y CLIENT_APP_URL local sin filtrar secretos', () => {
      const rawAwsAccessKey = 'AKIAIOSFODNN7SUPERSECRETKEY';
      const rawAwsSecretKey = 'wJalrXUtnFEMI/K7MDENG/SUPERSECRETVALUE123456';
      const rawMpSecret = 'TEST-99887766554433221100';

      const checks = auditEnvConfig({
        hasRootEnvFile: true,
        hasFunctionsEnvFile: true,
        rootEnv: {
          VITE_FIREBASE_API_KEY: 'AIzaTest',
          VITE_FIREBASE_AUTH_DOMAIN: 'turnos-web-eb8b5.firebaseapp.com',
          VITE_FIREBASE_PROJECT_ID: 'turnos-web-eb8b5',
          VITE_FIREBASE_STORAGE_BUCKET: 'turnos-web-eb8b5.firebasestorage.app',
          VITE_FIREBASE_MESSAGING_SENDER_ID: '12345',
          VITE_FIREBASE_APP_ID: '1:12345:web:abc',
        },
        functionsEnv: {
          CLIENT_APP_URL: 'http://localhost:5173',
          MP_WEBHOOK_URL: 'https://us-central1-tu-proyecto-id.cloudfunctions.net/mpWebhook',
          AWS_REGION: '',
          AWS_ACCESS_KEY_ID: rawAwsAccessKey,
          AWS_SECRET_ACCESS_KEY: rawAwsSecretKey,
          SES_FROM_EMAIL: 'Turneado <sin-arroba.app>',
          MP_ACCESS_TOKEN: rawMpSecret,
        },
      });

      const regionCheck = checks.find((c) => c.scope === 'AWS_REGION');
      expect(regionCheck?.level).toBe('error');

      const fromCheck = checks.find((c) => c.scope === 'SES_FROM_EMAIL');
      expect(fromCheck?.level).toBe('error');

      const webhookCheck = checks.find((c) => c.scope === 'MP_WEBHOOK_URL');
      expect(webhookCheck?.level).toBe('error');

      const appUrlCheck = checks.find((c) => c.scope === 'CLIENT_APP_URL');
      expect(appUrlCheck?.level).toBe('warn');

      const serialized = JSON.stringify(checks);
      expect(serialized).not.toContain(rawAwsAccessKey);
      expect(serialized).not.toContain(rawAwsSecretKey);
      expect(serialized).not.toContain(rawMpSecret);
    });
  });

  describe('helpers de Custom Claims y seed demo', () => {
    it('gestiona claims de platformAdmin y tenants correctamente', () => {
      const promoted = mergePlatformAdminClaims({ tenants: { tnt_a: 'owner', tnt_b: 'staff' } }, false);
      expect(promoted).toEqual({
        platformAdmin: true,
        tenants: { tnt_a: 'owner', tnt_b: 'staff' },
      });

      const removedOne = removeTenantFromClaims(promoted, 'tnt_a');
      expect(removedOne).toEqual({
        platformAdmin: true,
        tenants: { tnt_b: 'staff' },
      });

      const removedLast = removeTenantFromClaims(removedOne, 'tnt_b');
      expect(removedLast).toEqual({ platformAdmin: true });
      expect('tenants' in removedLast).toBe(false);

      const stripped = stripAllTenantsFromClaims(promoted);
      expect(stripped).toEqual({ platformAdmin: true });
    });

    it('valida slugs reservados y zonas horarias IANA', () => {
      expect(validateSlug('demo')).toBe('demo');
      expect(() => validateSlug('superadmin')).toThrow(/reservado/);
      expect(() => validateSlug('a')).toThrow(/inválido/);

      expect(validateTimezone('America/Argentina/Buenos_Aires')).toBe(
        'America/Argentina/Buenos_Aires'
      );
      expect(() => validateTimezone('Zona/Inexistente')).toThrow(/inválida/);
    });

    it('genera estructura completa, semana con >=8 turnos/día, 5 manuales, 5 MP, historial y proyección PII-free (compatible emulador y producción)', () => {
      const refNow = new Date('2026-11-24T12:00:00.000Z');
      const tz = 'America/Argentina/Buenos_Aires';
      const seed = buildDemoSeedData({
        ownerUid: 'uid_owner_1',
        ownerEmail: 'admin@turneado.app',
        demoSlug: 'demo',
        demoName: 'Atelier Bruma',
        timezone: tz,
        now: refNow,
      });

      expect(seed.tenantId).toBe('tnt_demo');
      expect(seed.tenantDoc.isDemo).toBe(true);
      expect(seed.tenantDoc.mpConfigured).toBe(true);
      expect(seed.slugDoc.tenantId).toBe('tnt_demo');
      expect(seed.slugDoc.slug).toBe('demo');
      expect(seed.services.length).toBeGreaterThanOrEqual(7);
      expect(seed.portfolio).toHaveLength(4);

      // Perfil ficticio completo y portable (sin localhost, apto para producción y emulador)
      expect(seed.ownerProfile.name).toBeTruthy();
      expect(seed.ownerProfile.instagram).toMatch(/^@/);
      expect(seed.ownerProfile.phone).toMatch(/^\+54/);
      expect(seed.ownerProfile.pictureUrl).toMatch(/^\/default\/images\//);
      expect(seed.ownerProfile.heroImageUrl).toMatch(/^\/default\/images\//);
      const serializedSeed = JSON.stringify(seed);
      expect(serializedSeed).not.toContain('localhost');
      expect(serializedSeed).not.toContain('127.0.0.1');

      // Verifica parseo de init para ambos entornos (emulador y real)
      expect(parseInitArgs(['--admin-email=ops@turneado.app', '--with-demo']).emulator).toBe(false);
      expect(
        parseInitArgs(['--admin-email=ops@turneado.app', '--with-demo', '--emulator']).emulator
      ).toBe(true);

      for (const work of seed.portfolio) {
        expect(work.title.length).toBeGreaterThanOrEqual(2);
        expect(work.title.length).toBeLessThanOrEqual(80);
        expect(work.category.length).toBeGreaterThanOrEqual(2);
        expect(work.category.length).toBeLessThanOrEqual(40);
        expect(work.imageUrl).toMatch(/^\/default\/images\/demo-work-\d+\.jpg$/);
        expect(Number.isNaN(new Date(work.createdAt).getTime())).toBe(false);
      }

      // Agrupar por fecha local del negocio
      const formatLocalKey = (iso: string) => {
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(new Date(iso));
        const y = parts.find((p) => p.type === 'year')?.value;
        const m = parts.find((p) => p.type === 'month')?.value;
        const d = parts.find((p) => p.type === 'day')?.value;
        return `${y}-${m}-${d}`;
      };

      const slotsByDay = new Map<string, Array<(typeof seed.slots)[number]>>();
      for (const slot of seed.slots) {
        const key = formatLocalKey(slot.data.datetime);
        if (!slotsByDay.has(key)) slotsByDay.set(key, []);
        slotsByDay.get(key)!.push(slot);
      }

      // 7 días corridos desde hoy (2026-11-24..2026-11-30), >= 8 turnos por día
      const weekKeys = [
        '2026-11-24',
        '2026-11-25',
        '2026-11-26',
        '2026-11-27',
        '2026-11-28',
        '2026-11-29',
        '2026-11-30',
      ];
      let daysWith5Manual = 0;
      let daysWith5Mp = 0;

      for (const dayKey of weekKeys) {
        const daySlots = slotsByDay.get(dayKey) || [];
        expect(daySlots.length).toBeGreaterThanOrEqual(8);

        const manualConfirmed = daySlots.filter(
          (s) => s.data.status === 'confirmed' && s.data.paymentStatus === 'manual_admin'
        );
        const mpConfirmed = daySlots.filter(
          (s) =>
            s.data.status === 'confirmed' &&
            s.data.paymentStatus === 'approved' &&
            Boolean(s.data.paymentId) &&
            Number(s.data.paidAmount) > 0
        );

        if (manualConfirmed.length >= 5) daysWith5Manual += 1;
        if (mpConfirmed.length >= 5) daysWith5Mp += 1;

        // Verificar que los turnos confirmados de ese día no se solapen
        const confirmedSorted = daySlots
          .filter((s) => s.data.status === 'confirmed')
          .sort((a, b) => a.data.datetime.localeCompare(b.data.datetime));
        for (let i = 0; i < confirmedSorted.length - 1; i += 1) {
          const currEnd = new Date(confirmedSorted[i].data.endDatetime!).getTime();
          const nextStart = new Date(confirmedSorted[i + 1].data.datetime).getTime();
          expect(currEnd).toBeLessThanOrEqual(nextStart);
        }
      }

      expect(daysWith5Manual).toBeGreaterThanOrEqual(1);
      expect(daysWith5Mp).toBeGreaterThanOrEqual(1);

      // Historial en mes anterior para comparativas de Métricas
      const prevMonthPastSlots = seed.slots.filter(
        (s) => s.data.status === 'past' && formatLocalKey(s.data.datetime).startsWith('2026-10-')
      );
      expect(prevMonthPastSlots.length).toBeGreaterThanOrEqual(5);

      // Proyección estrictamente PII-free en public_meta/availability
      const availSlots = seed.availabilityDoc.slots as Record<string, Record<string, unknown>>;
      for (const slot of seed.slots) {
        const projected = availSlots[slot.id];
        if (slot.data.status === 'available') {
          expect(projected).toBeDefined();
          expect(projected.status).toBe('available');
          expect(projected.datetime).toBe(slot.data.datetime);
        } else if (slot.data.status === 'confirmed') {
          expect(projected).toBeDefined();
          expect(projected.status).toBe('confirmed');
          expect(projected.clientData).toBeUndefined();
          expect(projected.paymentId).toBeUndefined();
          expect(projected.paidAmount).toBeUndefined();
        } else {
          // past / cancelled no se publican en availability
          expect(projected).toBeUndefined();
        }
      }
    });

    it('valida precondiciones y restricciones explícitas en la consola interactiva (console.mjs)', () => {
      const stoppedState = {
        emulatorsRunning: false,
        anyEmulatorRunning: false,
        viteRunning: false,
        managedLocalActive: false,
        logCount: 0,
      };

      const runningManagedState = {
        emulatorsRunning: true,
        anyEmulatorRunning: true,
        viteRunning: true,
        managedLocalActive: true,
        logCount: 12,
      };

      const runningExternalState = {
        emulatorsRunning: true,
        anyEmulatorRunning: true,
        viteRunning: false,
        managedLocalActive: false,
        logCount: 0,
      };

      // Con emuladores detenidos: [1] y [4] (borrar persistencia) permitidos; [2] y [3] bloqueados
      expect(evaluateConsoleAction('1', stoppedState).ok).toBe(true);
      expect(evaluateConsoleAction('4', stoppedState).ok).toBe(true);
      expect(evaluateConsoleAction('2', stoppedState).ok).toBe(false);
      expect(evaluateConsoleAction('3', stoppedState).ok).toBe(false);

      // Con emuladores activos gestionados: [1] (detener), [2], [3] permitidos; [4] bloqueado
      expect(evaluateConsoleAction('1', runningManagedState).ok).toBe(true);
      expect(evaluateConsoleAction('2', runningManagedState).ok).toBe(true);
      expect(evaluateConsoleAction('3', runningManagedState).ok).toBe(true);
      expect(evaluateConsoleAction('4', runningManagedState).ok).toBe(false);

      // Con emuladores corriendo en otra terminal / residuales: [1] permite limpiarlos, [3] permitido, [4] bloqueado
      expect(evaluateConsoleAction('1', runningExternalState).ok).toBe(true);
      expect(evaluateConsoleAction('3', runningExternalState).ok).toBe(true);
      expect(evaluateConsoleAction('4', runningExternalState).ok).toBe(false);

      // Parseo seguro de PIDs en netstat (Windows) para limpiar puertos colgados
      const sampleNetstat = [
        '  TCP    127.0.0.1:8080         0.0.0.0:0              LISTENING       14200',
        '  TCP    127.0.0.1:9099         0.0.0.0:0              LISTENING       14201',
        '  TCP    [::1]:5173             [::]:0                 LISTENING       15900',
        '  TCP    127.0.0.1:8080         127.0.0.1:51234        ESTABLISHED     99999',
        '  TCP    127.0.0.1:443          0.0.0.0:0              LISTENING       4',
      ].join('\r\n');
      expect(
        parseListeningPidsFromNetstat(sampleNetstat, [8080, 9099, 5173], 14201).sort((a, b) => a - b)
      ).toEqual([14200, 15900]);

      // Acciones de producción y utilidades siempre disponibles y con etiqueta de restricción visible
      for (const action of CONSOLE_ACTIONS) {
        expect(action.constraintTag.length).toBeGreaterThan(3);
      }
      expect(evaluateConsoleAction('5', stoppedState).ok).toBe(true);
      expect(evaluateConsoleAction('8', runningManagedState).ok).toBe(true);
      expect(evaluateConsoleAction('12', stoppedState).ok).toBe(false);
      expect(evaluateConsoleAction('99', stoppedState).ok).toBe(false);
    });

    it('limpia carpetas residuales firebase-export-* y reemplaza destino existente sin fallar', async () => {
      const { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } = await import(
        'node:fs'
      );
      const os = await import('node:os');
      const path = await import('node:path');

      const tmpRoot = mkdtempSync(path.join(os.tmpdir(), 'turneado-export-clean-'));
      try {
        const exportA = path.join(tmpRoot, 'firebase-export-17958321057085vcypr');
        const exportB = path.join(tmpRoot, 'firebase-export-1795877529846H22nb0');
        const staging = path.join(tmpRoot, '.firebase', 'emulator-data.staging');
        const keepDir = path.join(tmpRoot, 'otra-carpeta');

        mkdirSync(exportA, { recursive: true });
        mkdirSync(exportB, { recursive: true });
        mkdirSync(staging, { recursive: true });
        mkdirSync(keepDir, { recursive: true });
        writeFileSync(path.join(exportA, 'firebase-export-metadata.json'), '{}');

        const removed = cleanupLingeringFirebaseExports(tmpRoot);
        expect(removed.sort()).toEqual([
          'firebase-export-17958321057085vcypr',
          'firebase-export-1795877529846H22nb0',
        ]);
        expect(existsSync(exportA)).toBe(false);
        expect(existsSync(exportB)).toBe(false);
        expect(existsSync(staging)).toBe(false);
        expect(existsSync(keepDir)).toBe(true);

        const srcDir = path.join(tmpRoot, 'staged-snapshot');
        const destDir = path.join(tmpRoot, '.firebase', 'emulator-data');
        mkdirSync(srcDir, { recursive: true });
        mkdirSync(destDir, { recursive: true });
        writeFileSync(path.join(srcDir, 'firebase-export-metadata.json'), '{"fresh":true}');
        writeFileSync(path.join(destDir, 'old.txt'), 'old');

        await replaceDirSafelyWithRetry(srcDir, destDir);
        expect(existsSync(srcDir)).toBe(false);
        expect(existsSync(path.join(destDir, 'old.txt'))).toBe(false);
        expect(readFileSync(path.join(destDir, 'firebase-export-metadata.json'), 'utf8')).toBe(
          '{"fresh":true}'
        );
      } finally {
        rmSync(tmpRoot, { recursive: true, force: true });
      }
    });

    it('detecta SuperAdmin persistido desde /platform_config/settings o Auth claims y devuelve null si no existe', async () => {
      const mockAdminUser = {
        uid: 'uid_super_1',
        email: 'Maxxi@Turneado.App',
        disabled: false,
        customClaims: { platformAdmin: true },
      };

      const makeFakeDb = (settingsData) => ({
        collection: (name) => ({
          doc: (id) => ({
            get: async () =>
              name === 'platform_config' && id === 'settings' && settingsData
                ? { exists: true, data: () => settingsData }
                : { exists: false, data: () => undefined },
          }),
        }),
      });

      const makeFakeAuth = (users) => ({
        getUser: async (uid) => {
          const match = users.find((u) => u.uid === uid);
          if (!match) throw Object.assign(new Error('not-found'), { code: 'auth/user-not-found' });
          return match;
        },
        getUserByEmail: async (email) => {
          const match = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
          if (!match) throw Object.assign(new Error('not-found'), { code: 'auth/user-not-found' });
          return match;
        },
        listUsers: async () => ({ users, pageToken: undefined }),
      });

      const fromConfig = await findExistingSuperAdmin({
        auth: makeFakeAuth([mockAdminUser]),
        db: makeFakeDb({ superadminUid: 'uid_super_1', superadminEmail: 'maxxi@turneado.app' }),
      });
      expect(fromConfig?.email).toBe('maxxi@turneado.app');
      expect(fromConfig?.source).toBe('platform_config');

      const fromClaimsFallback = await findExistingSuperAdmin({
        auth: makeFakeAuth([mockAdminUser]),
        db: makeFakeDb(null),
      });
      expect(fromClaimsFallback?.email).toBe('maxxi@turneado.app');
      expect(fromClaimsFallback?.source).toBe('auth_claims');

      const clean = await findExistingSuperAdmin({
        auth: makeFakeAuth([{ uid: 'u2', email: 'cliente@x.com', disabled: false, customClaims: {} }]),
        db: makeFakeDb(null),
      });
      expect(clean).toBeNull();
    });
  });
});
