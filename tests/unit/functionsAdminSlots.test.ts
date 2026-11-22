import { describe, it, expect } from 'vitest';
import { buildPublicSlotProjection } from '../../functions/src/publicSlots';
import { resolveBaseSlotDuration } from '../../functions/src/adminSlots';
import { resolveSlotServicesWithLiveCatalog } from '../../src/services/bookingHelper';
import type { ServiceItem } from '../../src/types';

describe('Proyección pública sin PII (public_slots) y helpers admin/catálogo', () => {
  it('buildPublicSlotProjection elimina toda PII en confirmed y pending_payment, y devuelve null en estados no públicos', () => {
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
      services: [{ id: 's1', name: 'Lifting', basePrice: 15000, durationMinutes: 45 }],
    };
    const pubPending = buildPublicSlotProjection(pendingDoc);
    expect(pubPending).not.toBeNull();
    expect(pubPending?.status).toBe('pending_payment');
    expect(pubPending?.expiresAt).toBe('2026-11-22T12:15:00.000Z');
    expect(pubPending?.previousDurationMinutes).toBe(45);
    expect(pubPending).not.toHaveProperty('clientData');
    expect(pubPending).not.toHaveProperty('lockToken');

    // Estados internos no deben existir en public_slots
    expect(buildPublicSlotProjection({ ...confirmedDoc, status: 'past' })).toBeNull();
    expect(buildPublicSlotProjection({ ...confirmedDoc, status: 'cancelled' })).toBeNull();
    expect(buildPublicSlotProjection({ ...confirmedDoc, status: 'conflict' })).toBeNull();
    expect(buildPublicSlotProjection(null)).toBeNull();
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
