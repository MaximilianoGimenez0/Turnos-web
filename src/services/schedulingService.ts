import type { Slot } from '../types';

export interface SlotInterval {
  startMs: number;
  endMs: number;
  durationMinutes: number;
}

/**
 * Obtiene el intervalo temporal [startMs, endMs) de un turno.
 * Devuelve null si la fecha es inválida.
 */
export const getSlotInterval = (
  slot: {
    datetime?: string;
    estimatedDurationMinutes?: number;
    services?: unknown[];
    clientData?: { estimatedDurationMinutes?: number } | null;
  },
  defaultDurationMinutes = 0
): SlotInterval | null => {
  if (!slot || !slot.datetime) return null;

  const startMs = new Date(slot.datetime).getTime();
  if (isNaN(startMs)) return null;

  let rawDuration =
    slot.clientData?.estimatedDurationMinutes ??
    slot.estimatedDurationMinutes;

  if (
    (rawDuration === undefined || rawDuration === null) &&
    Array.isArray(slot.services) &&
    slot.services.length > 0
  ) {
    const firstService = slot.services[0];
    if (typeof firstService === 'object' && firstService !== null && 'durationMinutes' in firstService) {
      const srvDuration = Number((firstService as { durationMinutes?: number }).durationMinutes);
      if (!isNaN(srvDuration) && srvDuration > 0) {
        rawDuration = srvDuration;
      }
    }
  }

  if (rawDuration === undefined || rawDuration === null) {
    rawDuration = defaultDurationMinutes;
  }

  const durationMinutes =
    typeof rawDuration === 'number' && !isNaN(rawDuration) && rawDuration > 0
      ? rawDuration
      : 0;

  const endMs = startMs + durationMinutes * 60 * 1000;

  return {
    startMs,
    endMs,
    durationMinutes,
  };
};

/**
 * Determina si dos intervalos temporales se superponen en el tiempo.
 * Regla de negocio: [startA, endA) y [startB, endB) se superponen si startA < endB && endA > startB.
 * Los turnos adyacentes (endA === startB o endB === startA) NO se consideran en conflicto.
 */
export const hasSlotOverlap = (
  intervalA: SlotInterval | null,
  intervalB: SlotInterval | null
): boolean => {
  if (!intervalA || !intervalB) return false;

  if (intervalA.durationMinutes === 0 && intervalB.durationMinutes === 0) {
    return intervalA.startMs === intervalB.startMs;
  }

  if (intervalA.durationMinutes === 0) {
    return intervalA.startMs >= intervalB.startMs && intervalA.startMs < intervalB.endMs;
  }

  if (intervalB.durationMinutes === 0) {
    return intervalB.startMs >= intervalA.startMs && intervalB.startMs < intervalA.endMs;
  }

  return intervalA.startMs < intervalB.endMs && intervalA.endMs > intervalB.startMs;
};

/**
 * Determina si un turno está actualmente bloqueando disponibilidad
 * (estado 'confirmed', o 'pending_payment' cuyo bloqueo de 15 min aún esté vigente).
 */
export const isSlotActiveBlocking = (
  slot: Slot,
  nowMs = Date.now(),
  excludeSlotId?: string,
  excludeClientEmail?: string
): boolean => {
  if (!slot || slot.id === excludeSlotId) return false;

  if (slot.status === 'confirmed') return true;

  if (slot.status === 'pending_payment') {
    const expiresMs = slot.expiresAt ? new Date(slot.expiresAt).getTime() : 0;
    if (expiresMs > nowMs) {
      if (
        excludeClientEmail &&
        slot.clientData?.email &&
        slot.clientData.email.toLowerCase() === excludeClientEmail.toLowerCase()
      ) {
        return false;
      }
      return true;
    }
  }

  return false;
};

/**
 * Busca todos los turnos activos confirmados o en pago que entran en conflicto con un turno/intervalo objetivo.
 */
export const findConflictingActiveSlots = (
  target: {
    id?: string;
    datetime: string;
    estimatedDurationMinutes?: number;
    clientData?: { estimatedDurationMinutes?: number; email?: string } | null;
  },
  allSlots: Slot[],
  nowMs = Date.now()
): Slot[] => {
  const targetInterval = getSlotInterval(target);
  if (!targetInterval) return [];

  const targetEmail = target.clientData?.email;

  return allSlots.filter((existingSlot) => {
    if (existingSlot.id === target.id) return false;
    if (!isSlotActiveBlocking(existingSlot, nowMs, target.id, targetEmail)) return false;

    const existingInterval = getSlotInterval(existingSlot);
    return hasSlotOverlap(targetInterval, existingInterval);
  });
};

/**
 * Valida si un turno propuesto se puede crear o tomar sin entrar en conflicto.
 */
export const validateSlotNoConflict = (
  target: {
    id?: string;
    datetime: string;
    estimatedDurationMinutes?: number;
    clientData?: { estimatedDurationMinutes?: number; email?: string } | null;
  },
  allSlots: Slot[],
  nowMs = Date.now()
): { isValid: boolean; conflictingSlots: Slot[]; errorMessage?: string } => {
  const targetInterval = getSlotInterval(target);
  if (!targetInterval) {
    return {
      isValid: false,
      conflictingSlots: [],
      errorMessage: 'La fecha u hora del turno es inválida.',
    };
  }

  const conflictingSlots = findConflictingActiveSlots(target, allSlots, nowMs);

  if (conflictingSlots.length > 0) {
    return {
      isValid: false,
      conflictingSlots,
      errorMessage:
        'Este turno ya no está disponible porque entra en conflicto con otro turno reservado.',
    };
  }

  return {
    isValid: true,
    conflictingSlots: [],
  };
};

/**
 * CASO 3: Cuando un turno pasa a 'confirmed', encuentra todos los turnos 'available'
 * (o 'pending_payment' expirados) que se superponen con su intervalo y deben pasar a 'conflict'.
 */
export const calculateConflictingAvailableSlots = (
  confirmedSlot: {
    id: string;
    datetime: string;
    estimatedDurationMinutes?: number;
    clientData?: { estimatedDurationMinutes?: number } | null;
  },
  allSlots: Slot[]
): Slot[] => {
  const confirmedInterval = getSlotInterval(confirmedSlot);
  if (!confirmedInterval) return [];

  return allSlots.filter((slot) => {
    if (slot.id === confirmedSlot.id) return false;

    if (slot.status !== 'available' && slot.status !== 'pending_payment') {
      return false;
    }

    const slotInterval = getSlotInterval(slot);
    return hasSlotOverlap(confirmedInterval, slotInterval);
  });
};

/**
 * Calculates which conflicting slots should be reactivated to available when a slot is released.
 * Manually cancelled slots are permanently excluded from automatic reactivation.
 */
export const calculateSlotsToReactivate = (
  cancelledOrReleasedSlot: {
    id: string;
    datetime: string;
    estimatedDurationMinutes?: number;
    clientData?: { estimatedDurationMinutes?: number } | null;
  },
  allSlots: Slot[],
  nowMs = Date.now()
): Slot[] => {
  const releasedInterval = getSlotInterval(cancelledOrReleasedSlot);
  if (!releasedInterval) return [];

  const remainingConfirmedSlots = allSlots.filter((slot) => {
    if (slot.id === cancelledOrReleasedSlot.id) return false;
    return isSlotActiveBlocking(slot, nowMs, cancelledOrReleasedSlot.id);
  });

  const conflictCandidates = allSlots.filter((slot) => {
    if (slot.id === cancelledOrReleasedSlot.id) return false;
    if (slot.status !== 'conflict') return false;

    const slotStartMs = slot.datetime ? new Date(slot.datetime).getTime() : 0;
    if (slotStartMs <= nowMs) return false;

    const slotInterval = getSlotInterval(slot);
    return hasSlotOverlap(releasedInterval, slotInterval);
  });

  const slotsToReactivate: Slot[] = [];

  for (const candidate of conflictCandidates) {
    const candidateInterval = getSlotInterval(candidate);
    if (!candidateInterval) continue;

    const hasOtherConflict = remainingConfirmedSlots.some((confirmed) => {
      const confirmedInterval = getSlotInterval(confirmed);
      return hasSlotOverlap(candidateInterval, confirmedInterval);
    });

    if (!hasOtherConflict) {
      slotsToReactivate.push(candidate);
    }
  }

  return slotsToReactivate;
};

/**
 * Filters slots selectable by clients, enforcing anticipation rules and pending payment locks.
 * The excludeClientEmail parameter prevents a client's own pending reservation from hiding the slot during checkout.
 */
export const filterClientAvailableSlots = (
  rawSlots: Slot[],
  nowMs = Date.now(),
  minAnticipationMs = 15 * 60 * 1000,
  excludeClientEmail?: string
): Slot[] => {
  if (!rawSlots || rawSlots.length === 0) return [];

  const validFutureSlots = rawSlots.filter((slot) => {
    const slotDateMs = slot.datetime ? new Date(slot.datetime).getTime() : 0;
    return slotDateMs > nowMs + minAnticipationMs;
  });

  const activeBlockingSlots = validFutureSlots.filter((slot) => {
    if (slot.status === 'confirmed') return true;
    if (slot.status === 'pending_payment') {
      const expiresMs = slot.expiresAt ? new Date(slot.expiresAt).getTime() : 0;
      if (expiresMs > nowMs) {
        if (
          excludeClientEmail &&
          slot.clientData?.email &&
          slot.clientData.email.toLowerCase() === excludeClientEmail.toLowerCase()
        ) {
          return false;
        }
        return true;
      }
    }
    return false;
  });

  const candidateAvailableSlots = validFutureSlots
    .filter((slot) => {
      if (slot.status === 'available') return true;
      if (slot.status === 'pending_payment') {
        const expiresMs = slot.expiresAt ? new Date(slot.expiresAt).getTime() : 0;
        return expiresMs > 0 && expiresMs <= nowMs;
      }
      return false;
    })
    .map((slot) => {
      if (slot.status === 'pending_payment') {
        return {
          ...slot,
          status: 'available' as const,
        };
      }
      return slot;
    });

  if (activeBlockingSlots.length === 0) {
    return candidateAvailableSlots;
  }

  const blockingIntervals = activeBlockingSlots
    .map((slot) => getSlotInterval(slot, 30))
    .filter((interval): interval is SlotInterval => interval !== null);

  return candidateAvailableSlots.filter((candidate) => {
    const candidateInterval = getSlotInterval(candidate, 30);
    if (!candidateInterval) return false;

    const hasConflict = blockingIntervals.some((bInterval) =>
      hasSlotOverlap(candidateInterval, bInterval)
    );

    return !hasConflict;
  });
};

/**
 * Determina si un turno disponible tiene un conflicto temporal transitorio con algún turno en 'pending_payment' activo.
 * Si existe conflicto, devuelve el turno pendiente que lo bloquea; de lo contrario, devuelve null.
 */
export const findPendingConflictForSlot = (
  slot: Slot,
  allSlots: Slot[],
  nowMs = Date.now()
): Slot | null => {
  if (!slot || slot.status !== 'available') return null;

  const targetInterval = getSlotInterval(slot, 30);
  if (!targetInterval) return null;

  const activePendingSlots = allSlots.filter((s) => {
    if (s.id === slot.id || s.status !== 'pending_payment') return false;
    const expiresMs = s.expiresAt ? new Date(s.expiresAt).getTime() : 0;
    return expiresMs > nowMs;
  });

  for (const pendingSlot of activePendingSlots) {
    const pendingInterval = getSlotInterval(pendingSlot, 30);
    if (pendingInterval && hasSlotOverlap(targetInterval, pendingInterval)) {
      return pendingSlot;
    }
  }

  return null;
};
