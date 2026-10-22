import { describe, it, expect } from 'vitest';
import {
  getSlotInterval,
  hasSlotOverlap,
  validateSlotNoConflict,
  calculateConflictingAvailableSlots,
  calculateSlotsToReactivate,
  filterClientAvailableSlots,
  findPendingConflictForSlot,
} from './schedulingService';
import type { Slot } from '../types';

describe('Sistema de Scheduling y Detección de Conflictos Temporales', () => {
  const baseDateStr = '2026-09-10T';

  const makeSlot = (
    id: string,
    timeStr: string,
    durationMinutes: number,
    status: Slot['status'] = 'available',
    clientEmail?: string
  ): Slot => ({
    id,
    datetime: `${baseDateStr}${timeStr}:00.000Z`,
    depositAmount: 5000,
    serviceName: 'Consulta',
    services: ['Servicio'],
    estimatedDurationMinutes: durationMinutes,
    estimatedDuration: durationMinutes > 0 ? `${durationMinutes} min` : '',
    status,
    clientData: clientEmail
      ? {
          name: 'Cliente Test',
          email: clientEmail,
          phone: '+5491112345678',
          notes: '',
          selectedServices: ['Servicio'],
          estimatedDurationMinutes: durationMinutes,
          estimatedDuration: `${durationMinutes} min`,
        }
      : null,
    expiresAt:
      status === 'pending_payment'
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
        : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('1. Dos turnos sin overlap (10:00-11:00 y 11:30-12:30)', () => {
    const slotA = getSlotInterval({ datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: 60 });
    const slotB = getSlotInterval({ datetime: `${baseDateStr}11:30:00.000Z`, estimatedDurationMinutes: 60 });

    expect(hasSlotOverlap(slotA, slotB)).toBe(false);
  });

  it('2. Dos turnos con overlap parcial (10:00-11:30 y 11:00-12:00)', () => {
    const slotA = getSlotInterval({ datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: 90 });
    const slotB = getSlotInterval({ datetime: `${baseDateStr}11:00:00.000Z`, estimatedDurationMinutes: 60 });

    expect(hasSlotOverlap(slotA, slotB)).toBe(true);
  });

  it('3. Un turno contenido completamente dentro de otro (10:00-13:00 y 11:00-12:00)', () => {
    const slotWide = getSlotInterval({ datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: 180 });
    const slotInside = getSlotInterval({ datetime: `${baseDateStr}11:00:00.000Z`, estimatedDurationMinutes: 60 });

    expect(hasSlotOverlap(slotWide, slotInside)).toBe(true);
  });

  it('4. Un turno que contiene completamente a otro (11:00-12:00 y 10:00-13:00)', () => {
    const slotInside = getSlotInterval({ datetime: `${baseDateStr}11:00:00.000Z`, estimatedDurationMinutes: 60 });
    const slotWide = getSlotInterval({ datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: 180 });

    expect(hasSlotOverlap(slotInside, slotWide)).toBe(true);
  });

  it('5. Turnos adyacentes que terminan exactamente cuando empieza otro (10:00-12:00 y 12:00-13:00)', () => {
    const slotA = getSlotInterval({ datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: 120 });
    const slotB = getSlotInterval({ datetime: `${baseDateStr}12:00:00.000Z`, estimatedDurationMinutes: 60 });

    expect(hasSlotOverlap(slotA, slotB)).toBe(false);
  });

  it('6. Crear turno con conflicto (falla si cae dentro de un turno confirmado)', () => {
    const existingConfirmed = makeSlot('c1', '10:00', 120, 'confirmed');
    const newSlotToCreate = {
      datetime: `${baseDateStr}11:00:00.000Z`,
      estimatedDurationMinutes: 0,
    };

    const validation = validateSlotNoConflict(newSlotToCreate, [existingConfirmed]);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('conflicto');
  });

  it('7. Tomar turno sin conflicto (permite reserva si no solapa)', () => {
    const existingConfirmed = makeSlot('c1', '10:00', 60, 'confirmed');
    const targetToBook = {
      id: 'a1',
      datetime: `${baseDateStr}11:00:00.000Z`,
      estimatedDurationMinutes: 60,
    };

    const validation = validateSlotNoConflict(targetToBook, [existingConfirmed]);
    expect(validation.isValid).toBe(true);
    expect(validation.conflictingSlots).toHaveLength(0);
  });

  it('8. Tomar turno con conflicto (rechaza con mensaje adecuado si solapa con confirmado)', () => {
    const existingConfirmed = makeSlot('c1', '10:00', 120, 'confirmed');
    const targetToBook = {
      id: 'a2',
      datetime: `${baseDateStr}11:30:00.000Z`,
      estimatedDurationMinutes: 60,
    };

    const validation = validateSlotNoConflict(targetToBook, [existingConfirmed]);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toBe(
      'Este turno ya no está disponible porque entra en conflicto con otro turno reservado.'
    );
  });

  it('9. Tomar turno (10:00-13:00) y cancelar correctamente los turnos disponibles superpuestos', () => {
    const confirmedSlot = makeSlot('c_new', '10:00', 180, 'confirmed');

    const slotA = makeSlot('sA', '09:00', 60, 'available');
    const slotB = makeSlot('sB', '10:30', 60, 'available');
    const slotC = makeSlot('sC', '12:00', 120, 'available');
    const slotD = makeSlot('sD', '13:00', 60, 'available');

    const conflicting = calculateConflictingAvailableSlots(confirmedSlot, [
      confirmedSlot,
      slotA,
      slotB,
      slotC,
      slotD,
    ]);

    const conflictingIds = conflicting.map((s) => s.id);
    expect(conflictingIds).toContain('sB');
    expect(conflictingIds).toContain('sC');
    expect(conflictingIds).not.toContain('sA');
    expect(conflictingIds).not.toContain('sD');
  });

  it('10. Cancelar turno confirmado y liberar los turnos en conflicto que ya no tienen ningún conflicto', () => {
    const slotToCancel = makeSlot('cA', '10:00', 180, 'confirmed');
    const slotB = makeSlot('sB', '11:00', 60, 'conflict');

    const allSlots = [slotToCancel, slotB];
    const toReactivate = calculateSlotsToReactivate(slotToCancel, allSlots, 0);

    expect(toReactivate.map((s) => s.id)).toContain('sB');
  });

  it('11. Cancelar turno cA pero mantener en conflicto sC porque sigue bloqueado por cD', () => {
    const slotA = makeSlot('cA', '10:00', 180, 'confirmed');
    const slotB = makeSlot('sB', '11:00', 60, 'conflict');
    const slotC = makeSlot('sC', '12:00', 120, 'conflict');
    const slotD = makeSlot('cD', '13:00', 180, 'confirmed');

    const allSlots = [slotA, slotB, slotC, slotD];
    const toReactivate = calculateSlotsToReactivate(slotA, allSlots, 0);

    expect(toReactivate.map((s) => s.id)).toContain('sB');
    expect(toReactivate.map((s) => s.id)).not.toContain('sC');
  });

  it('12. Múltiples turnos superpuestos en cadena son detectados correctamente', () => {
    const conf1 = makeSlot('c1', '09:00', 90, 'confirmed');
    const conf2 = makeSlot('c2', '14:00', 120, 'confirmed');

    const targetOverlap1 = { datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: 60 };
    const targetOverlap2 = { datetime: `${baseDateStr}15:00:00.000Z`, estimatedDurationMinutes: 30 };
    const targetFree = { datetime: `${baseDateStr}11:00:00.000Z`, estimatedDurationMinutes: 120 };

    expect(validateSlotNoConflict(targetOverlap1, [conf1, conf2]).isValid).toBe(false);
    expect(validateSlotNoConflict(targetOverlap2, [conf1, conf2]).isValid).toBe(false);
    expect(validateSlotNoConflict(targetFree, [conf1, conf2]).isValid).toBe(true);
  });

  it('13. Duración estimada modificada (al expandir duración de 30m a 120m genera conflicto)', () => {
    const confirmedSlot = makeSlot('c1', '10:00', 60, 'confirmed');

    const shortSlot = { datetime: `${baseDateStr}09:00:00.000Z`, estimatedDurationMinutes: 30 };
    expect(validateSlotNoConflict(shortSlot, [confirmedSlot]).isValid).toBe(true);

    const expandedSlot = { datetime: `${baseDateStr}09:00:00.000Z`, estimatedDurationMinutes: 120 };
    expect(validateSlotNoConflict(expandedSlot, [confirmedSlot]).isValid).toBe(false);
  });

  it('14. Bloqueo temporal activo (pending_payment no expirado) previene que otro usuario tome el turno', () => {
    const pendingSlot = makeSlot('p1', '10:00', 60, 'pending_payment', 'usuarioA@gmail.com');

    const userBAttempt = {
      id: 'p2',
      datetime: `${baseDateStr}10:30:00.000Z`,
      estimatedDurationMinutes: 60,
      clientData: { email: 'usuarioB@gmail.com', estimatedDurationMinutes: 60 },
    };

    const validation = validateSlotNoConflict(userBAttempt, [pendingSlot]);
    expect(validation.isValid).toBe(false);
  });

  it('15. Manejo seguro ante datetime inválido o faltante', () => {
    const invalidSlot = { datetime: 'fecha-invalida' };
    const interval = getSlotInterval(invalidSlot);
    expect(interval).toBeNull();

    const validation = validateSlotNoConflict(invalidSlot, []);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('inválida');
  });

  it('16. estimatedDurationMinutes inválido, cero o negativo se normaliza a 0m de forma segura', () => {
    const intervalZero = getSlotInterval({ datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: 0 });
    expect(intervalZero?.durationMinutes).toBe(0);
    expect(intervalZero?.endMs).toBe(intervalZero?.startMs);

    const intervalNeg = getSlotInterval({ datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: -45 });
    expect(intervalNeg?.durationMinutes).toBe(0);

    const intervalNaN = getSlotInterval({ datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: NaN });
    expect(intervalNaN?.durationMinutes).toBe(0);
  });

  describe('filterClientAvailableSlots - Filtrado de turnos para clientes', () => {
    const mockNow = new Date('2026-09-10T08:00:00.000Z').getTime();

    it('17. Turno en pending_payment activo y turnos en conflicto NO se muestran', () => {
      const pendingSlot = makeSlot('p1', '10:00', 60, 'pending_payment', 'clienteA@gmail.com');
      pendingSlot.expiresAt = new Date(mockNow + 15 * 60 * 1000).toISOString();

      const conflictSlot1 = makeSlot('c1', '10:30', 30, 'available');
      const conflictSlot2 = makeSlot('c2', '09:45', 30, 'available');
      const freeSlot1 = makeSlot('ok1', '11:00', 60, 'available');
      const freeSlot2 = makeSlot('ok2', '09:00', 30, 'available');

      const all = [pendingSlot, conflictSlot1, conflictSlot2, freeSlot1, freeSlot2];
      const result = filterClientAvailableSlots(all, mockNow);

      const resultIds = result.map((s) => s.id);

      expect(resultIds).not.toContain('p1');
      expect(resultIds).not.toContain('c1');
      expect(resultIds).not.toContain('c2');

      expect(resultIds).toContain('ok1');
      expect(resultIds).toContain('ok2');
      expect(result.length).toBe(2);
    });

    it('18. Turno en pending_payment expirado se recupera a available y libera los turnos que colisionaban', () => {
      const expiredPending = makeSlot('p1', '10:00', 60, 'pending_payment', 'clienteA@gmail.com');
      expiredPending.expiresAt = new Date(mockNow - 5 * 60 * 1000).toISOString();

      const previouslyConflicting = makeSlot('c1', '10:30', 30, 'available');

      const result = filterClientAvailableSlots([expiredPending, previouslyConflicting], mockNow);

      expect(result.length).toBe(2);
      const recoveredP = result.find((s) => s.id === 'p1');
      expect(recoveredP).toBeDefined();
      expect(recoveredP?.status).toBe('available');

      const recoveredC1 = result.find((s) => s.id === 'c1');
      expect(recoveredC1).toBeDefined();
      expect(recoveredC1?.status).toBe('available');
    });

    it('19. Turno pasado o con menos de 15 minutos de anticipación es descartado', () => {
      const tooSoonSlot = makeSlot('too-soon', '08:10', 30, 'available');
      const validSlot = makeSlot('valid', '08:30', 30, 'available');

      const result = filterClientAvailableSlots([tooSoonSlot, validSlot], mockNow);

      expect(result.map((s) => s.id)).toEqual(['valid']);
    });

    it('20. Soporte para excludeClientEmail: no bloquea contra el turno propio del usuario', () => {
      const myPending = makeSlot('p-my', '10:00', 60, 'pending_payment', 'lucia@gmail.com');
      myPending.expiresAt = new Date(mockNow + 15 * 60 * 1000).toISOString();

      const myConflict = makeSlot('c-my', '10:30', 30, 'available');

      const anonResult = filterClientAvailableSlots([myPending, myConflict], mockNow);
      expect(anonResult.length).toBe(0);

      const userResult = filterClientAvailableSlots(
        [myPending, myConflict],
        mockNow,
        15 * 60 * 1000,
        'lucia@gmail.com'
      );
      expect(userResult.map((s) => s.id)).toContain('c-my');
    });
  });

  describe('findPendingConflictForSlot - Detección de conflicto temporal para AdminView', () => {
    const mockNow = new Date('2026-09-10T08:00:00.000Z').getTime();

    it('21. Devuelve el turno pendiente cuando existe solapamiento temporal', () => {
      const pendingSlot = makeSlot('p1', '10:00', 60, 'pending_payment', 'cliente@gmail.com');
      pendingSlot.expiresAt = new Date(mockNow + 15 * 60 * 1000).toISOString();

      const availableSlotInConflict = makeSlot('a1', '10:30', 30, 'available');
      const freeAvailableSlot = makeSlot('a2', '11:00', 30, 'available');

      const all = [pendingSlot, availableSlotInConflict, freeAvailableSlot];

      const conflictP1 = findPendingConflictForSlot(availableSlotInConflict, all, mockNow);
      expect(conflictP1).not.toBeNull();
      expect(conflictP1?.id).toBe('p1');

      const conflictP2 = findPendingConflictForSlot(freeAvailableSlot, all, mockNow);
      expect(conflictP2).toBeNull();
    });

    it('22. Devuelve null si el turno pendiente ya expiró', () => {
      const expiredPending = makeSlot('p-exp', '10:00', 60, 'pending_payment', 'cliente@gmail.com');
      expiredPending.expiresAt = new Date(mockNow - 2 * 60 * 1000).toISOString();

      const candidateSlot = makeSlot('a1', '10:30', 30, 'available');
      const result = findPendingConflictForSlot(candidateSlot, [expiredPending, candidateSlot], mockNow);

      expect(result).toBeNull();
    });

    it('23. Devuelve null si el turno a evaluar no tiene status available', () => {
      const pendingSlot = makeSlot('p1', '10:00', 60, 'pending_payment');
      pendingSlot.expiresAt = new Date(mockNow + 15 * 60 * 1000).toISOString();

      const confirmedSlot = makeSlot('c1', '10:30', 30, 'confirmed');
      const result = findPendingConflictForSlot(confirmedSlot, [pendingSlot, confirmedSlot], mockNow);

      expect(result).toBeNull();
    });
  });
});

