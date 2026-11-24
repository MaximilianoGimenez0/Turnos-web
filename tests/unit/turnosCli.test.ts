import { describe, expect, it } from 'vitest';
import {
  auditEnvConfig,
  extractEmailAddressFromFromHeader,
  formatEnvValueForDisplay,
  maskSecretValue,
} from '../../scripts/cli/core/env.mjs';
import {
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
import { runCli } from '../../scripts/turnos-cli.mjs';

describe('TurnosWeb Operations CLI — Unit Tests', () => {
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
      expect(maskSecretValue('re_super_secret_token_987654321')).toBe('re_sup...4321');
      expect(maskSecretValue('short')).toBe('****');
      expect(maskSecretValue('')).toBe('(vacío)');

      expect(formatEnvValueForDisplay('RESEND_API_KEY', 're_1234567890abcdef')).not.toContain(
        '1234567890'
      );
      expect(formatEnvValueForDisplay('MP_ACCESS_TOKEN', 'APP_USR-999999999999')).not.toContain(
        '999999999'
      );
      expect(formatEnvValueForDisplay('CLIENT_APP_URL', 'https://turneado.app')).toBe(
        'https://turneado.app'
      );
    });

    it('extrae dirección de email desde cabeceras From', () => {
      expect(extractEmailAddressFromFromHeader('TurnosWeb <turnos@turneado.app>')).toBe(
        'turnos@turneado.app'
      );
      expect(extractEmailAddressFromFromHeader('turnos@turneado.app')).toBe('turnos@turneado.app');
    });

    it('detecta RESEND_FROM_EMAIL sin @, MP_WEBHOOK_URL con placeholder y CLIENT_APP_URL local sin filtrar secretos', () => {
      const rawResendSecret = 're_live_SUPER_SECRET_KEY_VALUE_123456';
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
          RESEND_API_KEY: rawResendSecret,
          RESEND_FROM_EMAIL: 'TurnosWeb <sin-arroba.app>',
          MP_ACCESS_TOKEN: rawMpSecret,
        },
      });

      const fromCheck = checks.find((c) => c.scope === 'RESEND_FROM_EMAIL');
      expect(fromCheck?.level).toBe('error');

      const webhookCheck = checks.find((c) => c.scope === 'MP_WEBHOOK_URL');
      expect(webhookCheck?.level).toBe('error');

      const appUrlCheck = checks.find((c) => c.scope === 'CLIENT_APP_URL');
      expect(appUrlCheck?.level).toBe('warn');

      const serialized = JSON.stringify(checks);
      expect(serialized).not.toContain(rawResendSecret);
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

    it('genera estructura completa y consistente en buildDemoSeedData', () => {
      const refNow = new Date('2026-11-24T12:00:00.000Z');
      const seed = buildDemoSeedData({
        ownerUid: 'uid_owner_1',
        ownerEmail: 'admin@turneado.app',
        demoSlug: 'demo',
        demoName: 'Estudio Demo',
        timezone: 'America/Argentina/Buenos_Aires',
        now: refNow,
      });

      expect(seed.tenantId).toBe('tnt_demo');
      expect(seed.tenantDoc.isDemo).toBe(true);
      expect(seed.tenantDoc.mpConfigured).toBe(true);
      expect(seed.slugDoc.tenantId).toBe('tnt_demo');
      expect(seed.slugDoc.slug).toBe('demo');
      expect(seed.services).toHaveLength(3);
      expect(seed.slots).toHaveLength(9);
      expect(Object.keys(seed.availabilityDoc.slots)).toHaveLength(9);

      for (const slot of seed.slots) {
        expect(new Date(slot.data.datetime).getTime()).toBeGreaterThan(refNow.getTime());
        expect(slot.data.status).toBe('available');
        expect(seed.availabilityDoc.slots[slot.id]?.datetime).toBe(slot.data.datetime);
      }
    });
  });
});
