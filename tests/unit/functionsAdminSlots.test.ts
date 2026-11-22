import { describe, it, expect, vi } from 'vitest';
import type * as admin from 'firebase-admin';
import {
  arePublicProjectionsEqual,
  buildPublicSlotProjection,
  syncPublicSlotDocument,
  PUBLIC_META_COLLECTION,
  PUBLIC_AVAILABILITY_DOC,
} from '../../functions/src/publicSlots';
import { resolveBaseSlotDuration } from '../../functions/src/adminSlots';
import { resolveSlotServicesWithLiveCatalog } from '../../src/services/bookingHelper';
import type { ServiceItem } from '../../src/types';

describe('Proyección pública sin PII (public_meta/availability) y helpers admin/catálogo', () => {
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
    // Cero PII ni secretos
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

    // Estados internos no deben existir en la proyección pública
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

  it('syncPublicSlotDocument omite writes/deletes no-op y actualiza public_meta/availability con mergeFields', async () => {
    const setMock = vi.fn().mockResolvedValue(undefined);
    const docMock = vi.fn().mockReturnValue({ set: setMock });
    const collectionMock = vi.fn().mockReturnValue({ doc: docMock });
    const fakeDb = { collection: collectionMock } as unknown as admin.firestore.Firestore;
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

    // 1) Cambio solo de emailStatus -> skipped, 0 writes
    const res1 = await syncPublicSlotDocument(fakeDb, 'slot-1', confirmedBefore, confirmedAfterEmail, helpers);
    expect(res1).toBe('skipped');
    expect(setMock).not.toHaveBeenCalled();

    // 2) Transición interna cancelled -> past -> skipped, 0 deletes
    const res2 = await syncPublicSlotDocument(
      fakeDb,
      'slot-2',
      { datetime: '2026-11-22T15:00:00.000Z', status: 'cancelled' },
      { datetime: '2026-11-22T15:00:00.000Z', status: 'past' },
      helpers
    );
    expect(res2).toBe('skipped');
    expect(setMock).not.toHaveBeenCalled();

    // 3) Alta de turno available -> upserted en public_meta/availability
    const res3 = await syncPublicSlotDocument(
      fakeDb,
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
    expect(collectionMock).toHaveBeenCalledWith(PUBLIC_META_COLLECTION);
    expect(docMock).toHaveBeenCalledWith(PUBLIC_AVAILABILITY_DOC);
    expect(setMock).toHaveBeenCalledTimes(1);
    expect(setMock.mock.calls[0][1]).toEqual({ mergeFields: ['slots.slot-3', 'updatedAt'] });

    // 4) Transición confirmed -> past -> deleted con sentinel en mergeFields
    const res4 = await syncPublicSlotDocument(
      fakeDb,
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
    // No se filtran servicios no habilitados en el turno
    expect(resolved.some((s) => s.id === 'srv-other')).toBe(false);
  });
});
