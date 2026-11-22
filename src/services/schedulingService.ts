import type { Slot } from '../types';

export interface SlotInterval {
  startMs: number;
  endMs: number;
  durationMinutes: number;
}

/**
 * Returns the shortest positive duration (minutes) among structured services on a slot.
 * Mirrors functions/src/scheduling.ts so frontend and backend evaluate unassigned slots identically.
 */
export const getMinServiceDurationMinutes = (services?: unknown[]): number => {
  if (!Array.isArray(services) || services.length === 0) return 0;

  let minDuration = Infinity;
  for (const item of services) {
    if (typeof item === 'object' && item !== null && 'durationMinutes' in item) {
      const dur = Number((item as { durationMinutes?: unknown }).durationMinutes);
      if (!isNaN(dur) && dur > 0 && dur < minDuration) {
        minDuration = dur;
      }
    }
  }

  return Number.isFinite(minDuration) ? Math.round(minDuration) : 0;
};

/**
 * Obtiene el intervalo temporal [startMs, endMs) de un turno.
 * Devuelve null si la fecha es inválida.
 */
export const getSlotInterval = (
  slot: {
    datetime?: string;
    estimatedDurationMinutes?: number;
    services?: unknown[];
    clientData?: {
      estimatedDurationMinutes?: number;
      bookedServices?: Array<{ durationMinutes?: number }>;
    } | null;
  },
  defaultDurationMinutes = 0
): SlotInterval | null => {
  if (!slot || !slot.datetime) return null;

  const startMs = new Date(slot.datetime).getTime();
  if (isNaN(startMs)) return null;

  let rawDuration: number | undefined;

  const clientMinutes = Number(slot.clientData?.estimatedDurationMinutes);
  if (!isNaN(clientMinutes) && clientMinutes > 0) {
    rawDuration = clientMinutes;
  }

  if (
    rawDuration === undefined &&
    Array.isArray(slot.clientData?.bookedServices) &&
    slot.clientData.bookedServices.length > 0
  ) {
    const bookedSum = slot.clientData.bookedServices.reduce((sum, bs) => {
      const m = Number(bs.durationMinutes);
      return sum + (!isNaN(m) && m > 0 ? m : 0);
    }, 0);
    if (bookedSum > 0) {
      rawDuration = bookedSum;
    }
  }

  if (rawDuration === undefined) {
    const slotMinutes = Number(slot.estimatedDurationMinutes);
    if (!isNaN(slotMinutes) && slotMinutes > 0) {
      rawDuration = slotMinutes;
    }
  }

  if (rawDuration === undefined) {
    const minServiceDuration = getMinServiceDurationMinutes(slot.services);
    if (minServiceDuration > 0) {
      rawDuration = minServiceDuration;
    }
  }

  const durationMinutes =
    rawDuration !== undefined
      ? rawDuration
      : defaultDurationMinutes > 0
      ? defaultDurationMinutes
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
 * No se omite bloqueo entre distintos slotId del mismo email para impedir dobles reservas simultáneas.
 */
export const isSlotActiveBlocking = (
  slot: Slot,
  nowMs = Date.now(),
  excludeSlotId?: string
): boolean => {
  if (!slot || slot.id === excludeSlotId) return false;

  if (slot.status === 'confirmed') return true;

  if (slot.status === 'pending_payment') {
    const expiresMs = slot.expiresAt ? new Date(slot.expiresAt).getTime() : 0;
    return expiresMs > nowMs;
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
    services?: unknown[];
    clientData?: { estimatedDurationMinutes?: number; email?: string } | null;
  },
  allSlots: Slot[],
  nowMs = Date.now()
): Slot[] => {
  const targetInterval = getSlotInterval(target);
  if (!targetInterval) return [];

  return allSlots.filter((existingSlot) => {
    if (existingSlot.id === target.id) return false;
    if (!isSlotActiveBlocking(existingSlot, nowMs, target.id)) return false;

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
    services?: unknown[];
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
 * Cuando un turno pasa a 'confirmed', encuentra todos los turnos 'available'
 * (o 'pending_payment' YA expirados) que se superponen con su intervalo y deben pasar a 'conflict'.
 * Nunca corrompe bloqueos 'pending_payment' todavía vigentes.
 */
export const calculateConflictingAvailableSlots = (
  confirmedSlot: {
    id: string;
    datetime: string;
    estimatedDurationMinutes?: number;
    clientData?: { estimatedDurationMinutes?: number } | null;
  },
  allSlots: Slot[],
  nowMs = Date.now()
): Slot[] => {
  const confirmedInterval = getSlotInterval(confirmedSlot);
  if (!confirmedInterval) return [];

  return allSlots.filter((slot) => {
    if (slot.id === confirmedSlot.id) return false;

    if (slot.status === 'available') {
      const slotInterval = getSlotInterval(slot);
      return hasSlotOverlap(confirmedInterval, slotInterval);
    }

    if (slot.status === 'pending_payment') {
      const expiresMs = slot.expiresAt ? new Date(slot.expiresAt).getTime() : 0;
      if (expiresMs > nowMs) {
        return false;
      }
      const slotInterval = getSlotInterval(slot);
      return hasSlotOverlap(confirmedInterval, slotInterval);
    }

    return false;
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
 * Extracts active blocking slots (confirmed — including already-started ongoing ones — and
 * unexpired pending_payment locks) from raw public/admin slot streams.
 */
export const extractActiveBlockingSlots = (rawSlots: Slot[], nowMs = Date.now()): Slot[] => {
  if (!rawSlots || rawSlots.length === 0) return [];
  return rawSlots.filter((slot) => isSlotActiveBlocking(slot, nowMs));
};

/**
 * Filters slots selectable by clients, enforcing anticipation rules, confirmed blocks
 * (including ongoing appointments already in progress), and active pending payment locks.
 */
export const filterClientAvailableSlots = (
  rawSlots: Slot[],
  nowMs = Date.now(),
  minAnticipationMs = 15 * 60 * 1000
): Slot[] => {
  if (!rawSlots || rawSlots.length === 0) return [];

  // Include ALL confirmed slots (even already started ongoing ones) and unexpired pending locks
  const activeBlockingSlots = extractActiveBlockingSlots(rawSlots, nowMs);

  const candidateAvailableSlots = rawSlots
    .filter((slot) => {
      const slotDateMs = slot.datetime ? new Date(slot.datetime).getTime() : 0;
      if (isNaN(slotDateMs) || slotDateMs <= nowMs + minAnticipationMs) return false;

      if (slot.status === 'available') return true;
      if (slot.status === 'pending_payment') {
        const expiresMs = slot.expiresAt ? new Date(slot.expiresAt).getTime() : 0;
        return expiresMs > 0 && expiresMs <= nowMs;
      }
      return false;
    })
    .map((slot) => {
      if (slot.status === 'pending_payment') {
        const restoredMinutes =
          typeof slot.previousDurationMinutes === 'number' && slot.previousDurationMinutes > 0
            ? slot.previousDurationMinutes
            : getMinServiceDurationMinutes(slot.services) || 30;
        return {
          ...slot,
          status: 'available' as const,
          estimatedDurationMinutes: restoredMinutes,
          estimatedDuration: slot.previousDuration || `${restoredMinutes} min`,
          expiresAt: null,
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

/**
 * Calcula los minutos restantes de un bloqueo temporal de pago (`pending_payment`).
 * Devuelve `0` si el plazo ya venció, `>= 1` si sigue activo, o `null` si no hay `expiresAt` válido.
 */
export const getPendingLockRemainingMinutes = (
  expiresAt: string | null | undefined,
  nowMs = Date.now()
): number | null => {
  if (!expiresAt) return null;
  const expiresMs = new Date(expiresAt).getTime();
  if (isNaN(expiresMs)) return null;

  const diffMs = expiresMs - nowMs;
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.ceil(diffMs / 60000));
};
