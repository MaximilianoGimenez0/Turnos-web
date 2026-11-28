import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  computeOnboardingRequestMetrics,
  filterOnboardingRequests,
  validateOnboardingRequestInput,
} from '../../src/services/onboardingRequestService';
import {
  RATE_LIMIT_WINDOW_MS,
  submitOnboardingRequestCore,
  superadminUpdateOnboardingRequestStatusCore,
  validateOnboardingRequestPayload,
} from '../../functions/src/onboardingRequests';
import {
  getPlatformSuperAdminEmail,
  PLATFORM_CONFIG_CACHE_TTL_MS,
  resetPlatformConfigCache,
} from '../../functions/src/platformConfig';
import {
  resetSesClientForTesting,
  setSesSenderForTesting,
} from '../../functions/src/sesMailer';
import type { OnboardingRequestDoc } from '../../src/types';

function createInMemoryOnboardingDb(initialDocs: Record<string, Record<string, unknown>> = {}) {
  const store = new Map<string, Record<string, unknown>>(
    Object.entries(initialDocs).map(([k, v]) => [k, { ...v }])
  );

  const makeQuery = (
    colName: string,
    filters: Array<{ field: string; op: string; value: unknown }> = []
  ) => ({
    where: (field: string, op: string, value: unknown) =>
      makeQuery(colName, [...filters, { field, op, value }]),
    limit: () => ({
      get: async () => {
        const docs: Array<{ id: string; data: () => Record<string, unknown> }> = [];
        for (const [path, data] of store.entries()) {
          if (!path.startsWith(`${colName}/`)) continue;
          const matches = filters.every((f) => {
            const val = data[f.field];
            if (f.op === '==') return val === f.value;
            if (f.op === '>=') return String(val ?? '') >= String(f.value ?? '');
            return false;
          });
          if (matches) {
            const id = path.slice(colName.length + 1);
            docs.push({ id, data: () => ({ ...data }) });
          }
        }
        return {
          empty: docs.length === 0,
          docs,
        };
      },
    }),
  });

  const db = {
    _store: store,
    collection: (colName: string) => ({
      doc: (docId: string) => {
        const path = `${colName}/${docId}`;
        return {
          get: async () => {
            const d = store.get(path);
            return {
              exists: Boolean(d),
              id: docId,
              data: () => (d ? { ...d } : undefined),
            };
          },
          set: async (data: Record<string, unknown>) => {
            store.set(path, { ...data });
          },
          update: async (updates: Record<string, unknown>) => {
            const current = store.get(path);
            if (!current) {
              throw new Error(`Document not found: ${path}`);
            }
            store.set(path, { ...current, ...updates });
          },
        };
      },
      where: (field: string, op: string, value: unknown) =>
        makeQuery(colName, [{ field, op, value }]),
    }),
  };

  return db as unknown as Parameters<typeof getPlatformSuperAdminEmail>[0] & {
    _store: Map<string, Record<string, unknown>>;
  };
}

describe('Spec 16 — Onboarding Requests & Platform Config (Unit)', () => {
  const originalEnv = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    SES_FROM_EMAIL: process.env.SES_FROM_EMAIL,
  };

  beforeEach(() => {
    resetPlatformConfigCache();
    resetSesClientForTesting();
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLEKEY';
    process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
    process.env.SES_FROM_EMAIL = 'Turneado <noreply@turneado.app>';
  });

  afterEach(() => {
    resetPlatformConfigCache();
    resetSesClientForTesting();
    process.env.AWS_REGION = originalEnv.AWS_REGION;
    process.env.AWS_ACCESS_KEY_ID = originalEnv.AWS_ACCESS_KEY_ID;
    process.env.AWS_SECRET_ACCESS_KEY = originalEnv.AWS_SECRET_ACCESS_KEY;
    process.env.SES_FROM_EMAIL = originalEnv.SES_FROM_EMAIL;
  });

  describe('validación frontend y backend de campos', () => {
    it('acepta payload válido y normaliza caracteres de control en backend y frontend', () => {
      const feValid = validateOnboardingRequestInput({
        name: '  Estudio Bruma  ',
        email: '  CONTACTO@Bruma.com ',
        phone: '+54 9 11 4455-6677',
        notes: 'Rubro estética\r\n3 profesionales',
      });
      expect(feValid.isValid).toBe(true);

      const beValid = validateOnboardingRequestPayload({
        name: '  Estudio\r\nBruma  ',
        email: 'CONTACTO@Bruma.com',
        phone: '+54 9 11 4455-6677',
        notes: 'Rubro\x00 estética\r\n3 profesionales',
      });
      expect(beValid.valid).toBe(true);
      if (beValid.valid && !beValid.honeypotTriggered) {
        expect(beValid.data).toEqual({
          name: 'Estudio Bruma',
          email: 'contacto@bruma.com',
          phone: '+54 9 11 4455-6677',
          notes: 'Rubro  estética\n3 profesionales',
        });
      }
    });

    it('rechaza campos inválidos o fuera de límite tanto en frontend como en backend', () => {
      const feInvalid = validateOnboardingRequestInput({
        name: 'A',
        email: 'no-es-email',
        phone: '123',
        notes: 'x'.repeat(501),
      });
      expect(feInvalid.isValid).toBe(false);
      expect(feInvalid.errors.name).toBeTruthy();
      expect(feInvalid.errors.email).toBeTruthy();
      expect(feInvalid.errors.phone).toBeTruthy();
      expect(feInvalid.errors.notes).toBeTruthy();

      expect(
        validateOnboardingRequestPayload({
          name: 'A',
          email: 'ok@test.com',
          phone: '+54 9 11 4455-6677',
        }).valid
      ).toBe(false);

      expect(
        validateOnboardingRequestPayload({
          name: 'Estudio Test',
          email: 'malformed',
          phone: '+54 9 11 4455-6677',
        }).valid
      ).toBe(false);

      expect(
        validateOnboardingRequestPayload({
          name: 'Estudio Test',
          email: 'ok@test.com',
          phone: '12345',
        }).valid
      ).toBe(false);

      expect(
        validateOnboardingRequestPayload({
          name: 'Estudio Test',
          email: 'ok@test.com',
          phone: '+54 9 11 4455-6677',
          notes: 'x'.repeat(501),
        }).valid
      ).toBe(false);
    });

    it('detecta honeypot y simula éxito sin escribir en Firestore ni enviar correos', async () => {
      const db = createInMemoryOnboardingDb({
        'platform_config/settings': { superadminEmail: 'boss@turneado.app' },
      });
      let sesCalls = 0;
      setSesSenderForTesting(async () => {
        sesCalls += 1;
        return { $metadata: { httpStatusCode: 200 }, MessageId: 'unexpected' };
      });

      const res = await submitOnboardingRequestCore(db, undefined, {
        name: 'Bot Spammer',
        email: 'bot@spam.test',
        phone: '+54 9 11 1111-2222',
        website: 'https://spam.example.com',
      });

      expect(res.requestId).toBe('req_ignored');
      expect(res.status).toBe('pending');
      expect(res.clientEmailSent).toBe(false);
      expect(sesCalls).toBe(0);
      expect(db._store.has('onboarding_requests/req_ignored')).toBe(false);
    });
  });

  describe('getPlatformSuperAdminEmail (SSOT + caché 5 min + fallback único)', () => {
    it('lee /platform_config/settings, normaliza lowercase y cachea por 5 minutos', async () => {
      let reads = 0;
      const db = {
        collection: () => ({
          doc: () => ({
            get: async () => {
              reads += 1;
              return {
                exists: true,
                data: () => ({ superadminEmail: '  SuperAdmin@Turneado.App ' }),
              };
            },
          }),
        }),
      } as unknown as Parameters<typeof getPlatformSuperAdminEmail>[0];

      const t0 = 1_000_000;
      expect(await getPlatformSuperAdminEmail(db, undefined, t0)).toBe('superadmin@turneado.app');
      expect(await getPlatformSuperAdminEmail(db, undefined, t0 + 60_000)).toBe(
        'superadmin@turneado.app'
      );
      expect(reads).toBe(1);

      // Tras expirar TTL de 5 minutos vuelve a consultar Firestore
      expect(
        await getPlatformSuperAdminEmail(db, undefined, t0 + PLATFORM_CONFIG_CACHE_TTL_MS + 1)
      ).toBe('superadmin@turneado.app');
      expect(reads).toBe(2);
    });

    it('hace fallback al primer platformAdmin en Auth solo si el doc aún no existe y nunca duplica', async () => {
      const db = createInMemoryOnboardingDb();
      let listCalls = 0;
      const authClient = {
        listUsers: async () => {
          listCalls += 1;
          return {
            users: [
              { uid: 'u1', email: 'regular@test.com', customClaims: { tenants: { t1: 'owner' } } },
              {
                uid: 'u2',
                email: 'Admin1@Turneado.App',
                customClaims: { platformAdmin: true },
              },
              {
                uid: 'u3',
                email: 'admin2@turneado.app',
                customClaims: { platformAdmin: true },
              },
            ],
          };
        },
      };

      const email = await getPlatformSuperAdminEmail(db, authClient, 5000);
      expect(email).toBe('admin1@turneado.app');
      expect(listCalls).toBe(1);

      // Si el documento existe pero está vacío/inválido, NO usa Auth fallback
      resetPlatformConfigCache();
      db._store.set('platform_config/settings', { superadminEmail: '' });
      const noFallback = await getPlatformSuperAdminEmail(db, authClient, 6000);
      expect(noFallback).toBe('');
      expect(listCalls).toBe(1);
    });
  });

  describe('submitOnboardingRequestCore y superadminUpdateOnboardingRequestStatusCore', () => {
    it('crea solicitud, envía exactamente 1 email al cliente y 1 al SuperAdmin, y aplica rate-limit 3 min', async () => {
      const db = createInMemoryOnboardingDb({
        'platform_config/settings': { superadminEmail: 'boss@turneado.app' },
      });
      const sentTo: string[] = [];
      setSesSenderForTesting(async (cmd) => {
        sentTo.push(...(cmd.input.Destination?.ToAddresses || []));
        return { $metadata: { httpStatusCode: 200 }, MessageId: `msg_${sentTo.length}` };
      });

      const now = Date.UTC(2026, 10, 28, 15, 0, 0);
      const created = await submitOnboardingRequestCore(
        db,
        undefined,
        {
          name: 'Ana Gómez',
          email: 'ana@estudio.com',
          phone: '+54 9 11 4455-6677',
          notes: 'Quiero empezar esta semana',
        },
        now
      );

      expect(created.requestId).toMatch(/^req_[a-f0-9]{12}$/);
      expect(created.status).toBe('pending');
      expect(created.clientEmailSent).toBe(true);
      expect(sentTo.sort()).toEqual(['ana@estudio.com', 'boss@turneado.app']);

      const saved = db._store.get(`onboarding_requests/${created.requestId}`);
      expect(saved?.emailStatus).toBe('sent');
      expect(saved?.clientEmailSent).toBe(true);
      expect(saved?.adminEmailSent).toBe(true);

      // Dentro de la ventana de 3 min debe rechazar por resource-exhausted
      await expect(
        submitOnboardingRequestCore(
          db,
          undefined,
          {
            name: 'Ana Gómez',
            email: 'ANA@estudio.com',
            phone: '+54 9 11 4455-6677',
          },
          now + RATE_LIMIT_WINDOW_MS - 1000
        )
      ).rejects.toThrow(/reciente/i);
    });

    it('actualiza estado de solicitud en los 4 estados y rechaza IDs inexistentes o estados inválidos', async () => {
      const db = createInMemoryOnboardingDb({
        'onboarding_requests/req_abc123def456': {
          id: 'req_abc123def456',
          name: 'Cliente Demo',
          email: 'cliente@demo.com',
          phone: '+54 9 11 5555-0000',
          notes: '',
          status: 'pending',
        },
      });

      for (const nextStatus of ['contacted', 'approved', 'cancelled', 'pending'] as const) {
        const res = await superadminUpdateOnboardingRequestStatusCore(
          db,
          { uid: 'sa_1', email: 'boss@turneado.app' },
          { requestId: 'req_abc123def456', status: nextStatus },
          10_000
        );
        expect(res.success).toBe(true);
        expect(res.status).toBe(nextStatus);
        expect(db._store.get('onboarding_requests/req_abc123def456')?.status).toBe(nextStatus);
      }

      await expect(
        superadminUpdateOnboardingRequestStatusCore(
          db,
          { uid: 'sa_1' },
          { requestId: 'req_noexiste123', status: 'contacted' }
        )
      ).rejects.toThrow(/no existe/i);

      await expect(
        superadminUpdateOnboardingRequestStatusCore(
          db,
          { uid: 'sa_1' },
          { requestId: 'req_abc123def456', status: 'invalid' as never }
        )
      ).rejects.toThrow(/inválido/i);
    });
  });

  describe('métricas y filtrado en frontend (computeOnboardingRequestMetrics y filterOnboardingRequests)', () => {
    const sampleRequests: OnboardingRequestDoc[] = [
      {
        id: 'req_111111111111',
        name: 'Estudio Luz',
        email: 'luz@salon.com',
        phone: '+54 9 11 1111-1111',
        notes: 'Peluquería en Palermo',
        status: 'pending',
        source: 'landing',
        emailStatus: 'sent',
        clientEmailSent: true,
        adminEmailSent: true,
        createdAt: '2026-11-28T12:00:00.000Z',
        updatedAt: '2026-11-28T12:00:00.000Z',
        statusUpdatedAt: null,
        statusUpdatedByUid: null,
        statusUpdatedByEmail: null,
      },
      {
        id: 'req_222222222222',
        name: 'Barbería Norte',
        email: 'hola@barbernorte.com',
        phone: '+54 9 11 2222-2222',
        notes: '3 sillones',
        status: 'contacted',
        source: 'landing',
        emailStatus: 'sent',
        clientEmailSent: true,
        adminEmailSent: true,
        createdAt: '2026-11-28T11:00:00.000Z',
        updatedAt: '2026-11-28T11:30:00.000Z',
        statusUpdatedAt: '2026-11-28T11:30:00.000Z',
        statusUpdatedByUid: 'sa1',
        statusUpdatedByEmail: 'boss@turneado.app',
      },
      {
        id: 'req_333333333333',
        name: 'Clínica Sur',
        email: 'turnos@clinicasur.com',
        phone: '+54 9 11 3333-3333',
        notes: '',
        status: 'approved',
        source: 'landing',
        emailStatus: 'partial',
        clientEmailSent: true,
        adminEmailSent: false,
        createdAt: '2026-11-28T10:00:00.000Z',
        updatedAt: '2026-11-28T10:30:00.000Z',
        statusUpdatedAt: '2026-11-28T10:30:00.000Z',
        statusUpdatedByUid: 'sa1',
        statusUpdatedByEmail: 'boss@turneado.app',
      },
      {
        id: 'req_444444444444',
        name: 'Spa Descartado',
        email: 'spa@test.com',
        phone: '+54 9 11 4444-4444',
        notes: 'Solo consulta de precio',
        status: 'cancelled',
        source: 'landing',
        emailStatus: 'skipped',
        clientEmailSent: false,
        adminEmailSent: false,
        createdAt: '2026-11-28T09:00:00.000Z',
        updatedAt: '2026-11-28T09:30:00.000Z',
        statusUpdatedAt: '2026-11-28T09:30:00.000Z',
        statusUpdatedByUid: 'sa1',
        statusUpdatedByEmail: 'boss@turneado.app',
      },
    ];

    it('calcula métricas y filtra por los 4 estados y texto libre', () => {
      expect(computeOnboardingRequestMetrics(sampleRequests)).toEqual({
        total: 4,
        pending: 1,
        contacted: 1,
        approved: 1,
        cancelled: 1,
      });

      expect(filterOnboardingRequests(sampleRequests, '', 'pending').map((r) => r.id)).toEqual([
        'req_111111111111',
      ]);
      expect(filterOnboardingRequests(sampleRequests, '', 'contacted').map((r) => r.id)).toEqual([
        'req_222222222222',
      ]);
      expect(filterOnboardingRequests(sampleRequests, '', 'approved').map((r) => r.id)).toEqual([
        'req_333333333333',
      ]);
      expect(filterOnboardingRequests(sampleRequests, '', 'cancelled').map((r) => r.id)).toEqual([
        'req_444444444444',
      ]);

      expect(filterOnboardingRequests(sampleRequests, 'palermo', 'all')).toHaveLength(1);
      expect(filterOnboardingRequests(sampleRequests, 'barbernorte', 'all')).toHaveLength(1);
      expect(filterOnboardingRequests(sampleRequests, 'req_3333', 'all')).toHaveLength(1);
      expect(filterOnboardingRequests(sampleRequests, '3333-3333', 'all')).toHaveLength(1);
    });
  });
});
