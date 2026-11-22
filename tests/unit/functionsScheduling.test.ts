import { describe, it, expect } from 'vitest';
import {
  getMinServiceDurationMinutes,
  getSlotInterval,
  computeEndDatetimeIso,
  getConflictSearchWindow,
  findConflictingActiveSlots,
  calculateConflictingAvailableSlots,
  type SlotDocData,
} from '../../functions/src/scheduling';

describe('functions/scheduling - Motor de colisiones backend', () => {
  it('resuelve duración usando bookedServices y services[0] como fallback consistente con el frontend', () => {
    const baseIso = '2026-11-22T14:00:00.000Z';

    const fromBooked = getSlotInterval({
      datetime: baseIso,
      clientData: {
        bookedServices: [{ durationMinutes: 45 }, { durationMinutes: 30 }],
      },
    });
    expect(fromBooked?.durationMinutes).toBe(75);

    const fromSlotService = getSlotInterval({
      datetime: baseIso,
      services: [{ name: 'Lifting', durationMinutes: 60 }],
    });
    expect(fromSlotService?.durationMinutes).toBe(60);
  });

  it('calcula endDatetime ISO UTC y ventana de búsqueda retroactiva para detectar turnos ya iniciados (F-04)', () => {
    const ongoingStart = '2026-11-22T13:00:00.000Z'; // 10:00 AR, dura 2h -> termina 15:00Z
    const candidateStart = '2026-11-22T14:00:00.000Z'; // 11:00 AR
    const nowDuringOngoing = new Date('2026-11-22T13:15:00.000Z').getTime();

    expect(computeEndDatetimeIso(ongoingStart, 120)).toBe('2026-11-22T15:00:00.000Z');
    expect(computeEndDatetimeIso(ongoingStart, 0)).toBeNull();

    const { windowStartIso, windowEndIso } = getConflictSearchWindow(
      new Date(candidateStart).getTime(),
      60
    );
    // La ventana incluye el turno de las 13:00Z aunque sea anterior a now (13:15Z)
    expect(ongoingStart >= windowStartIso && ongoingStart < windowEndIso).toBe(true);

    const ongoingConfirmed: SlotDocData = {
      id: 'confirmed-ongoing',
      datetime: ongoingStart,
      status: 'confirmed',
      estimatedDurationMinutes: 120,
    };
    const conflicts = findConflictingActiveSlots(
      { id: 'candidate', datetime: candidateStart, estimatedDurationMinutes: 60 },
      [ongoingConfirmed],
      nowDuringOngoing
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].id).toBe('confirmed-ongoing');
  });

  it('no corrompe bloqueos pending_payment vigentes al marcar conflictos de un turno confirmado', () => {
    const nowMs = new Date('2026-11-22T12:00:00.000Z').getTime();
    const confirmed: SlotDocData = {
      id: 'c1',
      datetime: '2026-11-22T14:00:00.000Z',
      status: 'confirmed',
      estimatedDurationMinutes: 60,
    };
    const availableOverlap: SlotDocData = {
      id: 'a1',
      datetime: '2026-11-22T14:30:00.000Z',
      status: 'available',
      estimatedDurationMinutes: 30,
    };
    const activePendingOverlap: SlotDocData = {
      id: 'p-active',
      datetime: '2026-11-22T14:30:00.000Z',
      status: 'pending_payment',
      estimatedDurationMinutes: 30,
      expiresAt: new Date(nowMs + 10 * 60 * 1000).toISOString(),
    };
    const expiredPendingOverlap: SlotDocData = {
      id: 'p-expired',
      datetime: '2026-11-22T14:30:00.000Z',
      status: 'pending_payment',
      estimatedDurationMinutes: 30,
      expiresAt: new Date(nowMs - 5 * 60 * 1000).toISOString(),
    };

    const toConflict = calculateConflictingAvailableSlots(
      confirmed,
      [availableOverlap, activePendingOverlap, expiredPendingOverlap],
      nowMs
    );
    expect(toConflict.map((s) => s.id)).toEqual(['a1', 'p-expired']);
  });

  it('usa la duración mínima entre servicios ofrecidos en un slot disponible y bloquea doble lock del mismo email (DB-04/DB-05)', () => {
    expect(
      getMinServiceDurationMinutes([
        { name: 'Extensión', durationMinutes: 120 },
        { name: 'Perfilado', durationMinutes: 30 },
        { name: 'Lifting', durationMinutes: 60 },
      ])
    ).toBe(30);

    const nowMs = new Date('2026-11-22T12:00:00.000Z').getTime();
    const pendingSameEmail: SlotDocData = {
      id: 'slot-1000',
      datetime: '2026-11-22T13:00:00.000Z',
      status: 'pending_payment',
      estimatedDurationMinutes: 60,
      expiresAt: new Date(nowMs + 10 * 60 * 1000).toISOString(),
      clientData: { email: 'ana@mail.com', estimatedDurationMinutes: 60 },
    };

    const conflicts = findConflictingActiveSlots(
      {
        id: 'slot-1030',
        datetime: '2026-11-22T13:30:00.000Z',
        estimatedDurationMinutes: 60,
        clientData: { email: 'ana@mail.com', estimatedDurationMinutes: 60 },
      },
      [pendingSameEmail],
      nowMs
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].id).toBe('slot-1000');
  });
});
