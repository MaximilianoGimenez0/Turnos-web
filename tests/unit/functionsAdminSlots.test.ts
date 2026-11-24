import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as admin from 'firebase-admin';
import {
  arePublicProjectionsEqual,
  buildPublicSlotProjection,
  syncPublicSlotDocument,
  PUBLIC_META_COLLECTION,
  PUBLIC_AVAILABILITY_DOC,
} from '../../functions/src/publicSlots';
import {
  adminAssignSlotCore,
  resolveBaseSlotDuration,
} from '../../functions/src/adminSlots';
import { resetServicesCatalogCache } from '../../functions/src/servicesCatalog';
import { resolveSlotServicesWithLiveCatalog } from '../../src/services/bookingHelper';
import type { ServiceItem } from '../../src/types';

function createMultiTenantSlotsDb(initialDocs: Record<string, Record<string, unknown>>) {
  const store = new Map<string, Record<string, unknown>>();
  for (const [path, data] of Object.entries(initialDocs)) {
    store.set(path, structuredClone(data));
  }

  const matchesFilter = (
    docData: Record<string, unknown>,
    [field, op, value]: [string, string, unknown]
  ): boolean => {
    const val = docData[field];
    if (op === '==') return val === value;
    if (op === 'in') return Array.isArray(value) && value.includes(val);
    if (op === '>=') return typeof val === 'string' && typeof value === 'string' && val >= value;
    if (op === '<') return typeof val === 'string' && typeof value === 'string' && val < value;
    if (op === '>') return typeof val === 'string' && typeof value === 'string' && val > value;
    if (op === '<=') return typeof val === 'string' && typeof value === 'string' && val <= value;
    return false;
  };

  const makeDocRef = (path: string) => ({
    id: path.split('/').pop() || '',
    path,
    get: async () => {
      const data = store.get(path);
      return {
        id: path.split('/').pop() || '',
        exists: data !== undefined,
        data: () => (data ? structuredClone(data) : undefined),
      };
    },
    collection: (sub: string) => makeCollectionRef(`${path}/${sub}`),
  });

  const makeQuery = (colPath: string, filters: Array<[string, string, unknown]> = []) => ({
    where: (field: string, op: string, value: unknown) =>
      makeQuery(colPath, [...filters, [field, op, value]]),
    get: async () => {
      const prefix = `${colPath}/`;
      const docs: Array<{ id: string; ref: ReturnType<typeof makeDocRef>; data: () => Record<string, unknown> }> = [];
      for (const [p, val] of store.entries()) {
        if (!p.startsWith(prefix)) continue;
        const remainder = p.slice(prefix.length);
        if (remainder.includes('/')) continue;
        if (filters.every((f) => matchesFilter(val, f))) {
          docs.push({ id: remainder, ref: makeDocRef(p), data: () => structuredClone(val) });
        }
      }
      return { empty: docs.length === 0, docs };
    },
  });

  const makeCollectionRef = (colPath: string) => ({
    doc: (id: string) => makeDocRef(`${colPath}/${id}`),
    where: (field: string, op: string, value: unknown) => makeQuery(colPath, [[field, op, value]]),
    get: async () => makeQuery(colPath).get(),
  });

  const db = {
    collection: (name: string) => makeCollectionRef(name),
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      const tx = {
        get: async (target: { get: () => Promise<unknown> }) => target.get(),
        update: (ref: { path: string }, data: Record<string, unknown>) => {
          const current = store.get(ref.path) || {};
          store.set(ref.path, { ...current, ...structuredClone(data) });
        },
      };
      return fn(tx);
    },
    batch: () => {
      const queued: Array<() => void> = [];
      return {
        set: (ref: { path: string }, data: Record<string, unknown>) => {
          queued.push(() => store.set(ref.path, structuredClone(data)));
        },
        update: (ref: { path: string }, data: Record<string, unknown>) => {
          queued.push(() => {
            const current = store.get(ref.path) || {};
            store.set(ref.path, { ...current, ...structuredClone(data) });
          });
        },
        delete: (ref: { path: string }) => {
          queued.push(() => store.delete(ref.path));
        },
        commit: async () => {
          queued.forEach((op) => op());
        },
      };
    },
  } as unknown as admin.firestore.Firestore;

  return { db, store };
}

describe('Proyección pública sin PII (public_meta/availability) y helpers admin/catálogo', () => {
  beforeEach(() => {
    resetServicesCatalogCache();
  });

  it('buildPublicSlotProjection elimina toda PII y compacta services sin description', () => {
    const confirmedDoc = {
      datetime: '2026-11-22T13:00:00.000Z',
      status: 'confirmed',
      depositAmount: 5000,
      estimatedDurationMinutes: 90,
      paymentId: 'mp-999',
      lockToken: 'secret-token',
      preferenceId: 'pref-123',
      paidAmount: 5000,
      clientData: {
        name: 'Ana Pérez',
        email: 'ana@mail.com',
        phone: '+5491112345678',
        notes: 'Alergia al látex',
        estimatedDurationMinutes: 90,
      },
      updatedAt: '2026-11-22T12:00:00.000Z',
    };

    const pubConfirmed = buildPublicSlotProjection(confirmedDoc);
    expect(pubConfirmed).not.toBeNull();
    expect(pubConfirmed?.status).toBe('confirmed');
    expect(pubConfirmed?.endDatetime).toBe('2026-11-22T14:30:00.000Z');
    expect(pubConfirmed?.estimatedDurationMinutes).toBe(90);
    expect(pubConfirmed).not.toHaveProperty('clientData');
    expect(pubConfirmed).not.toHaveProperty('paymentId');
    expect(pubConfirmed).not.toHaveProperty('lockToken');
    expect(pubConfirmed).not.toHaveProperty('preferenceId');
    expect(pubConfirmed).not.toHaveProperty('paidAmount');

    const pendingDoc = {
      ...confirmedDoc,
      status: 'pending_payment',
      expiresAt: '2026-11-22T12:15:00.000Z',
      previousDurationMinutes: 45,
      previousDuration: '45 min',
      services: [
        {
          id: 's1',
          name: 'Lifting',
          basePrice: 15000,
          durationMinutes: 45,
          description: 'Descripción larga innecesaria en la proyección pública',
          extras: [{ id: 'e1', name: 'Nutrición', price: 3000 }],
        },
      ],
    };
    const pubPending = buildPublicSlotProjection(pendingDoc);
    expect(pubPending).not.toBeNull();
    expect(pubPending?.status).toBe('pending_payment');
    expect(pubPending?.expiresAt).toBe('2026-11-22T12:15:00.000Z');
    expect(pubPending?.previousDurationMinutes).toBe(45);
    expect(pubPending).not.toHaveProperty('clientData');
    expect(pubPending).not.toHaveProperty('lockToken');
    const projectedServices = pubPending?.services as Array<Record<string, unknown>>;
    expect(projectedServices).toHaveLength(1);
    expect(projectedServices[0]).not.toHaveProperty('description');
    expect(projectedServices[0].extras).toEqual([{ id: 'e1', name: 'Nutrición', price: 3000 }]);

    expect(buildPublicSlotProjection({ ...confirmedDoc, status: 'past' })).toBeNull();
    expect(buildPublicSlotProjection({ ...confirmedDoc, status: 'cancelled' })).toBeNull();
    expect(buildPublicSlotProjection({ ...confirmedDoc, status: 'conflict' })).toBeNull();
    expect(buildPublicSlotProjection(null)).toBeNull();
  });

  it('arePublicProjectionsEqual ignora updatedAt y detecta cambios reales en la proyección', () => {
    const basePending = {
      datetime: '2026-11-22T15:00:00.000Z',
      status: 'pending_payment',
      depositAmount: 5000,
      estimatedDurationMinutes: 60,
      estimatedDuration: '60 min',
      previousDurationMinutes: 45,
      previousDuration: '45 min',
      expiresAt: '2026-11-22T12:15:00.000Z',
      services: [{ id: 's1', name: 'Lifting', basePrice: 15000, durationMinutes: 45 }],
      updatedAt: '2026-11-22T12:00:00.000Z',
    };

    const withPreferenceId = {
      ...basePending,
      preferenceId: 'mp-pref-abc',
      updatedAt: '2026-11-22T12:00:02.000Z',
    };

    expect(
      arePublicProjectionsEqual(
        buildPublicSlotProjection(basePending),
        buildPublicSlotProjection(withPreferenceId)
      )
    ).toBe(true);

    expect(arePublicProjectionsEqual(null, null)).toBe(true);

    const confirmedAfter = {
      ...withPreferenceId,
      status: 'confirmed',
      emailStatus: 'processing',
    };
    expect(
      arePublicProjectionsEqual(
        buildPublicSlotProjection(withPreferenceId),
        buildPublicSlotProjection(confirmedAfter)
      )
    ).toBe(false);

    const emailSentAfter = {
      ...confirmedAfter,
      emailStatus: 'sent',
      emailSent: true,
      updatedAt: '2026-11-22T12:00:05.000Z',
    };
    expect(
      arePublicProjectionsEqual(
        buildPublicSlotProjection(confirmedAfter),
        buildPublicSlotProjection(emailSentAfter)
      )
    ).toBe(true);
  });

  it('syncPublicSlotDocument omite writes/deletes no-op y actualiza /tenants/{tenantId}/public_meta/availability', async () => {
    const setMock = vi.fn().mockResolvedValue(undefined);
    const availDocMock = vi.fn().mockReturnValue({ set: setMock });
    const subColMock = vi.fn().mockReturnValue({ doc: availDocMock });
    const tenantDocMock = vi.fn().mockReturnValue({ collection: subColMock });
    const rootCollectionMock = vi.fn().mockReturnValue({ doc: tenantDocMock });
    const fakeDb = { collection: rootCollectionMock } as unknown as admin.firestore.Firestore;
    const DELETE_SENTINEL = Symbol('DELETE_FIELD');
    const helpers = {
      createSlotFieldPath: (id: string) => `slots.${id}`,
      deleteFieldValue: () => DELETE_SENTINEL,
    };

    const confirmedBefore = {
      datetime: '2026-11-22T15:00:00.000Z',
      status: 'confirmed',
      estimatedDurationMinutes: 60,
      emailStatus: 'processing',
      updatedAt: '2026-11-22T12:00:00.000Z',
    };
    const confirmedAfterEmail = {
      ...confirmedBefore,
      emailStatus: 'sent',
      updatedAt: '2026-11-22T12:00:03.000Z',
    };

    const res1 = await syncPublicSlotDocument(
      fakeDb,
      'tnt_alpha',
      'slot-1',
      confirmedBefore,
      confirmedAfterEmail,
      helpers
    );
    expect(res1).toBe('skipped');
    expect(setMock).not.toHaveBeenCalled();

    const res2 = await syncPublicSlotDocument(
      fakeDb,
      'tnt_alpha',
      'slot-2',
      { datetime: '2026-11-22T15:00:00.000Z', status: 'cancelled' },
      { datetime: '2026-11-22T15:00:00.000Z', status: 'past' },
      helpers
    );
    expect(res2).toBe('skipped');
    expect(setMock).not.toHaveBeenCalled();

    const res3 = await syncPublicSlotDocument(
      fakeDb,
      'tnt_alpha',
      'slot-3',
      null,
      {
        datetime: '2026-11-25T14:00:00.000Z',
        status: 'available',
        depositAmount: 5000,
        services: [{ id: 's1', name: 'Lifting', basePrice: 15000, durationMinutes: 60, description: 'omitir' }],
      },
      helpers
    );
    expect(res3).toBe('upserted');
    expect(rootCollectionMock).toHaveBeenCalledWith('tenants');
    expect(tenantDocMock).toHaveBeenCalledWith('tnt_alpha');
    expect(subColMock).toHaveBeenCalledWith(PUBLIC_META_COLLECTION);
    expect(availDocMock).toHaveBeenCalledWith(PUBLIC_AVAILABILITY_DOC);
    expect(setMock).toHaveBeenCalledTimes(1);
    expect(setMock.mock.calls[0][1]).toEqual({ mergeFields: ['slots.slot-3', 'updatedAt'] });

    const res4 = await syncPublicSlotDocument(
      fakeDb,
      'tnt_alpha',
      'slot-1',
      confirmedAfterEmail,
      { ...confirmedAfterEmail, status: 'past' },
      helpers
    );
    expect(res4).toBe('deleted');
    expect(setMock).toHaveBeenCalledTimes(2);
    expect(setMock.mock.calls[1][0].slots['slot-1']).toBe(DELETE_SENTINEL);
    expect(setMock.mock.calls[1][1]).toEqual({ mergeFields: ['slots.slot-1', 'updatedAt'] });
  });

  it('aislamiento multi-tenant en adminAssignSlotCore: confirmar a las 10:00 en tnt_alpha no altera el turno de las 10:00 en tnt_beta', async () => {
    const nowMs = new Date('2026-11-22T10:00:00.000Z').getTime();
    const slotServices = [
      { id: 'srv-1', name: 'Lifting', basePrice: 18000, durationMinutes: 60, extras: [] },
    ];
    const { db, store } = createMultiTenantSlotsDb({
      'tenants/tnt_alpha/slots/slot-a-1000': {
        datetime: '2026-11-22T13:00:00.000Z', // 10:00 AR
        status: 'available',
        depositAmount: 5000,
        estimatedDurationMinutes: 60,
        services: slotServices,
      },
      'tenants/tnt_alpha/slots/slot-a-1030': {
        datetime: '2026-11-22T13:30:00.000Z', // 10:30 AR (solapa en tnt_alpha)
        status: 'available',
        depositAmount: 5000,
        estimatedDurationMinutes: 60,
        services: slotServices,
      },
      'tenants/tnt_beta/slots/slot-b-1000': {
        datetime: '2026-11-22T13:00:00.000Z', // 10:00 AR en tnt_beta
        status: 'available',
        depositAmount: 5000,
        estimatedDurationMinutes: 60,
        services: slotServices,
      },
    });

    await adminAssignSlotCore(
      db,
      'tnt_alpha',
      'slot-a-1000',
      {
        name: 'Cliente Alpha',
        phone: '+5491112345678',
        selectedServices: ['Lifting'],
      },
      nowMs
    );

    expect(store.get('tenants/tnt_alpha/slots/slot-a-1000')?.status).toBe('confirmed');
    expect(store.get('tenants/tnt_alpha/slots/slot-a-1030')?.status).toBe('conflict');
    // Tenant B remains completely untouched
    expect(store.get('tenants/tnt_beta/slots/slot-b-1000')?.status).toBe('available');
  });

  it('resolveBaseSlotDuration nunca degrada a 0 cuando hay previousDurationMinutes o services', () => {
    expect(
      resolveBaseSlotDuration({
        previousDurationMinutes: 45,
        previousDuration: '45 min',
        services: [{ name: 'Lifting', durationMinutes: 60 }],
      })
    ).toEqual({ minutes: 45, label: '45 min' });

    expect(
      resolveBaseSlotDuration({
        previousDurationMinutes: 0,
        services: [
          { name: 'Extensión', durationMinutes: 120 },
          { name: 'Perfilado', durationMinutes: 30 },
        ],
      })
    ).toEqual({ minutes: 30, label: '30 min' });

    expect(resolveBaseSlotDuration({})).toEqual({ minutes: 30, label: '30 min' });
  });

  it('resolveSlotServicesWithLiveCatalog prioriza precios vivos por ID y conserva snapshot si el servicio fue borrado', () => {
    const liveServices: ServiceItem[] = [
      {
        id: 'srv-1',
        name: 'Lifting Renovado',
        basePrice: 25000,
        durationMinutes: 75,
        extras: [{ id: 'ex-1', name: 'Nutrición', price: 4500 }],
      },
      {
        id: 'srv-other',
        name: 'Otro Servicio',
        basePrice: 12000,
        durationMinutes: 40,
        extras: [],
      },
    ];

    const slot = {
      services: [
        {
          id: 'srv-1',
          name: 'Lifting Viejo',
          basePrice: 18000,
          durationMinutes: 60,
          extras: [],
        },
        {
          id: 'srv-deleted',
          name: 'Servicio Eliminado del Catálogo',
          basePrice: 9000,
          durationMinutes: 30,
          extras: [],
        },
      ],
    };

    const resolved = resolveSlotServicesWithLiveCatalog(slot, liveServices);
    expect(resolved).toHaveLength(2);
    expect(resolved[0].name).toBe('Lifting Renovado');
    expect(resolved[0].basePrice).toBe(25000);
    expect(resolved[0].durationMinutes).toBe(75);
    expect(resolved[0].extras).toHaveLength(1);
    expect(resolved[1].name).toBe('Servicio Eliminado del Catálogo');
    expect(resolved[1].basePrice).toBe(9000);
    expect(resolved.some((s) => s.id === 'srv-other')).toBe(false);
  });
});
