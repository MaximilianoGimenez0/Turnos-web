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

  // 1. Dos turnos sin overlap
  it('1. Dos turnos sin overlap (10:00-11:00 y 11:30-12:30)', () => {
    const slotA = getSlotInterval({ datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: 60 });
    const slotB = getSlotInterval({ datetime: `${baseDateStr}11:30:00.000Z`, estimatedDurationMinutes: 60 });

    expect(hasSlotOverlap(slotA, slotB)).toBe(false);
  });

  // 2. Dos turnos con overlap parcial
  it('2. Dos turnos con overlap parcial (10:00-11:30 y 11:00-12:00)', () => {
    const slotA = getSlotInterval({ datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: 90 });
    const slotB = getSlotInterval({ datetime: `${baseDateStr}11:00:00.000Z`, estimatedDurationMinutes: 60 });

    expect(hasSlotOverlap(slotA, slotB)).toBe(true);
  });

  // 3. Un turno contenido completamente dentro de otro
  it('3. Un turno contenido completamente dentro de otro (10:00-13:00 y 11:00-12:00)', () => {
    const slotWide = getSlotInterval({ datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: 180 });
    const slotInside = getSlotInterval({ datetime: `${baseDateStr}11:00:00.000Z`, estimatedDurationMinutes: 60 });

    expect(hasSlotOverlap(slotWide, slotInside)).toBe(true);
  });

  // 4. Un turno que contiene completamente a otro
  it('4. Un turno que contiene completamente a otro (11:00-12:00 y 10:00-13:00)', () => {
    const slotInside = getSlotInterval({ datetime: `${baseDateStr}11:00:00.000Z`, estimatedDurationMinutes: 60 });
    const slotWide = getSlotInterval({ datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: 180 });

    expect(hasSlotOverlap(slotInside, slotWide)).toBe(true);
  });

  // 5. Turnos que terminan exactamente cuando empieza otro (frontera sin conflicto)
  it('5. Turnos adyacentes que terminan exactamente cuando empieza otro (10:00-12:00 y 12:00-13:00)', () => {
    const slotA = getSlotInterval({ datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: 120 });
    const slotB = getSlotInterval({ datetime: `${baseDateStr}12:00:00.000Z`, estimatedDurationMinutes: 60 });

    expect(hasSlotOverlap(slotA, slotB)).toBe(false);
  });

  // 6. Crear turno con conflicto
  it('6. Crear turno con conflicto (falla si cae dentro de un turno confirmado)', () => {
    const existingConfirmed = makeSlot('c1', '10:00', 120, 'confirmed'); // 10:00 a 12:00
    const newSlotToCreate = {
      datetime: `${baseDateStr}11:00:00.000Z`,
      estimatedDurationMinutes: 0,
    };

    const validation = validateSlotNoConflict(newSlotToCreate, [existingConfirmed]);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('conflicto');
  });

  // 7. Tomar turno sin conflicto
  it('7. Tomar turno sin conflicto (permite reserva si no solapa)', () => {
    const existingConfirmed = makeSlot('c1', '10:00', 60, 'confirmed'); // 10:00 a 11:00
    const targetToBook = {
      id: 'a1',
      datetime: `${baseDateStr}11:00:00.000Z`, // 11:00 a 12:00
      estimatedDurationMinutes: 60,
    };

    const validation = validateSlotNoConflict(targetToBook, [existingConfirmed]);
    expect(validation.isValid).toBe(true);
    expect(validation.conflictingSlots).toHaveLength(0);
  });

  // 8. Tomar turno con conflicto
  it('8. Tomar turno con conflicto (rechaza con mensaje adecuado si solapa con confirmado)', () => {
    const existingConfirmed = makeSlot('c1', '10:00', 120, 'confirmed'); // 10:00 a 12:00
    const targetToBook = {
      id: 'a2',
      datetime: `${baseDateStr}11:30:00.000Z`, // 11:30 a 12:30
      estimatedDurationMinutes: 60,
    };

    const validation = validateSlotNoConflict(targetToBook, [existingConfirmed]);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toBe(
      'Este turno ya no está disponible porque entra en conflicto con otro turno reservado.'
    );
  });

  // 9. Tomar turno y cancelar correctamente los disponibles superpuestos
  it('9. Tomar turno (10:00-13:00) y cancelar correctamente los turnos disponibles superpuestos', () => {
    const confirmedSlot = makeSlot('c_new', '10:00', 180, 'confirmed'); // 10:00 a 13:00

    const slotA = makeSlot('sA', '09:00', 60, 'available'); // 09:00 - 10:00 (no solapa)
    const slotB = makeSlot('sB', '10:30', 60, 'available'); // 10:30 - 11:30 (solapa)
    const slotC = makeSlot('sC', '12:00', 120, 'available'); // 12:00 - 14:00 (solapa)
    const slotD = makeSlot('sD', '13:00', 60, 'available'); // 13:00 - 14:00 (no solapa)

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

  // 10. Cancelar turno y liberar correctamente los turnos en conflicto
  it('10. Cancelar turno confirmado y liberar los turnos en conflicto que ya no tienen ningún conflicto', () => {
    const slotToCancel = makeSlot('cA', '10:00', 180, 'confirmed'); // 10:00 a 13:00
    const slotB = makeSlot('sB', '11:00', 60, 'conflict'); // 11:00 a 12:00 (estaba en conflicto por cA)

    const allSlots = [slotToCancel, slotB];
    const toReactivate = calculateSlotsToReactivate(slotToCancel, allSlots, 0);

    expect(toReactivate.map((s) => s.id)).toContain('sB');
  });

  // 11. Cancelar turno pero mantener en conflicto un turno que sigue bloqueado por otro confirmado
  it('11. Cancelar turno cA pero mantener en conflicto sC porque sigue bloqueado por cD', () => {
    // Ejemplo exacto del prompt:
    // A: 10:00 → 13:00 CONFIRMED
    // B: 11:00 → 12:00 CONFLICT
    // C: 12:00 → 14:00 CONFLICT
    // D: 13:00 → 16:00 CONFIRMED
    const slotA = makeSlot('cA', '10:00', 180, 'confirmed');
    const slotB = makeSlot('sB', '11:00', 60, 'conflict');
    const slotC = makeSlot('sC', '12:00', 120, 'conflict');
    const slotD = makeSlot('cD', '13:00', 180, 'confirmed');

    const allSlots = [slotA, slotB, slotC, slotD];

    // Se cancela A
    const toReactivate = calculateSlotsToReactivate(slotA, allSlots, 0);

    // B debe reactivarse a AVAILABLE
    expect(toReactivate.map((s) => s.id)).toContain('sB');

    // C debe permanecer en CONFLICT porque D (13:00-16:00) se superpone con C (12:00-14:00)
    expect(toReactivate.map((s) => s.id)).not.toContain('sC');
  });

  // 12. Múltiples turnos superpuestos concurrentes
  it('12. Múltiples turnos superpuestos en cadena son detectados correctamente', () => {
    const conf1 = makeSlot('c1', '09:00', 90, 'confirmed'); // 09:00 - 10:30
    const conf2 = makeSlot('c2', '14:00', 120, 'confirmed'); // 14:00 - 16:00

    const targetOverlap1 = { datetime: `${baseDateStr}10:00:00.000Z`, estimatedDurationMinutes: 60 }; // 10:00 - 11:00 (choca con c1)
    const targetOverlap2 = { datetime: `${baseDateStr}15:00:00.000Z`, estimatedDurationMinutes: 30 }; // 15:00 - 15:30 (choca con c2)
    const targetFree = { datetime: `${baseDateStr}11:00:00.000Z`, estimatedDurationMinutes: 120 }; // 11:00 - 13:00 (libre)

    expect(validateSlotNoConflict(targetOverlap1, [conf1, conf2]).isValid).toBe(false);
    expect(validateSlotNoConflict(targetOverlap2, [conf1, conf2]).isValid).toBe(false);
    expect(validateSlotNoConflict(targetFree, [conf1, conf2]).isValid).toBe(true);
  });

  // 13. Duración estimada modificada
  it('13. Duración estimada modificada (al expandir duración de 30m a 120m genera conflicto)', () => {
    const confirmedSlot = makeSlot('c1', '10:00', 60, 'confirmed'); // 10:00 - 11:00

    // Caso A: Slot a las 09:00 con 30m (termina 09:30, no choca)
    const shortSlot = { datetime: `${baseDateStr}09:00:00.000Z`, estimatedDurationMinutes: 30 };
    expect(validateSlotNoConflict(shortSlot, [confirmedSlot]).isValid).toBe(true);

    // Caso B: Si el cliente selecciona más reglas y dura 120m (09:00 a 11:00, choca con 10:00-11:00)
    const expandedSlot = { datetime: `${baseDateStr}09:00:00.000Z`, estimatedDurationMinutes: 120 };
    expect(validateSlotNoConflict(expandedSlot, [confirmedSlot]).isValid).toBe(false);
  });

  // 14. Dos usuarios intentando tomar turnos incompatibles
  it('14. Bloqueo temporal activo (pending_payment no expirado) previene que otro usuario tome el turno', () => {
    const pendingSlot = makeSlot('p1', '10:00', 60, 'pending_payment', 'usuarioA@gmail.com');

    // Usuario B intenta tomar un turno que solapa con el de Usuario A
    const userBAttempt = {
      id: 'p2',
      datetime: `${baseDateStr}10:30:00.000Z`,
      estimatedDurationMinutes: 60,
      clientData: { email: 'usuarioB@gmail.com', estimatedDurationMinutes: 60 },
    };

    const validation = validateSlotNoConflict(userBAttempt, [pendingSlot]);
    expect(validation.isValid).toBe(false);
  });

  // 15. Datos faltantes o inválidos en datetime
  it('15. Manejo seguro ante datetime inválido o faltante', () => {
    const invalidSlot = { datetime: 'fecha-invalida' };
    const interval = getSlotInterval(invalidSlot);
    expect(interval).toBeNull();

    const validation = validateSlotNoConflict(invalidSlot, []);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('inválida');
  });

  // 16. estimatedDurationMinutes inválido, cero, negativo o inexistente
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
    // Definimos un tiempo base futuro para simular nowMs
    const mockNow = new Date('2026-09-10T08:00:00.000Z').getTime();

    it('17. Turno en pending_payment activo y turnos en conflicto NO se muestran', () => {
      // Turno P en pago: 10:00 a 11:00 (duración 60m), expira a las 08:15 (después de mockNow)
      const pendingSlot = makeSlot('p1', '10:00', 60, 'pending_payment', 'clienteA@gmail.com');
      pendingSlot.expiresAt = new Date(mockNow + 15 * 60 * 1000).toISOString();

      // Turno C1 en conflicto: 10:30 a 11:00 (dentro del rango de P)
      const conflictSlot1 = makeSlot('c1', '10:30', 30, 'available');

      // Turno C2 en conflicto: 09:45 a 10:15 (solapamiento parcial)
      const conflictSlot2 = makeSlot('c2', '09:45', 30, 'available');

      // Turno OK1 contiguo libre: 11:00 a 12:00 (justo después, adyacente)
      const freeSlot1 = makeSlot('ok1', '11:00', 60, 'available');

      // Turno OK2 previo libre: 09:00 a 09:30
      const freeSlot2 = makeSlot('ok2', '09:00', 30, 'available');

      const all = [pendingSlot, conflictSlot1, conflictSlot2, freeSlot1, freeSlot2];
      const result = filterClientAvailableSlots(all, mockNow);

      const resultIds = result.map((s) => s.id);

      // Ni el pendiente ni los en conflicto deben aparecer
      expect(resultIds).not.toContain('p1');
      expect(resultIds).not.toContain('c1');
      expect(resultIds).not.toContain('c2');

      // Los turnos libres sí deben aparecer
      expect(resultIds).toContain('ok1');
      expect(resultIds).toContain('ok2');
      expect(result.length).toBe(2);
    });

    it('18. Turno en pending_payment expirado se recupera a available y libera los turnos que colisionaban', () => {
      // Turno P expiró hace 5 minutos
      const expiredPending = makeSlot('p1', '10:00', 60, 'pending_payment', 'clienteA@gmail.com');
      expiredPending.expiresAt = new Date(mockNow - 5 * 60 * 1000).toISOString();

      // Turno que colisionaba con P
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
      // Turno a las 08:10 (mockNow es 08:00, solo 10 minutos de anticipación)
      const tooSoonSlot = makeSlot('too-soon', '08:10', 30, 'available');

      // Turno a las 08:30 (20 minutos de margen)
      const validSlot = makeSlot('valid', '08:30', 30, 'available');

      const result = filterClientAvailableSlots([tooSoonSlot, validSlot], mockNow);

      expect(result.map((s) => s.id)).toEqual(['valid']);
    });

    it('20. Soporte para excludeClientEmail: no bloquea contra el turno propio del usuario', () => {
      const myPending = makeSlot('p-my', '10:00', 60, 'pending_payment', 'lucia@gmail.com');
      myPending.expiresAt = new Date(mockNow + 15 * 60 * 1000).toISOString();

      const myConflict = makeSlot('c-my', '10:30', 30, 'available');

      // Si no se excluye el email, 'p-my' bloquea 'c-my'
      const anonResult = filterClientAvailableSlots([myPending, myConflict], mockNow);
      expect(anonResult.length).toBe(0);

      // Si se pasa el email de Lucía, no se considera bloqueante para ella
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

