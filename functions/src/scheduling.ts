export interface SlotInterval {
  startMs: number;
  endMs: number;
  durationMinutes: number;
}

export interface SlotDocData {
  id?: string;
  datetime?: string;
  status?: string;
  estimatedDurationMinutes?: number;
  clientData?: {
    email?: string;
    estimatedDurationMinutes?: number;
    [key: string]: unknown;
  } | null;
  expiresAt?: string | null;
  [key: string]: unknown;
}

/**
 * Obtiene el intervalo temporal [startMs, endMs) de un turno en Cloud Functions.
 */
export const getSlotInterval = (
  slot: SlotDocData,
  defaultDurationMinutes = 0
): SlotInterval | null => {
  if (!slot || !slot.datetime) return null;

  const startMs = new Date(slot.datetime).getTime();
  if (isNaN(startMs)) return null;

  const rawDuration =
    slot.clientData?.estimatedDurationMinutes ??
    slot.estimatedDurationMinutes ??
    defaultDurationMinutes;

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
 */
export const hasSlotOverlap = (
  intervalA: SlotInterval | null,
  intervalB: SlotInterval | null
): boolean => {
  if (!intervalA || !intervalB) return false;

  // Si ambos son puntuales (duración 0m)
  if (intervalA.durationMinutes === 0 && intervalB.durationMinutes === 0) {
    return intervalA.startMs === intervalB.startMs;
  }

  // Si A es puntual (0m) y B tiene duración > 0m
  if (intervalA.durationMinutes === 0) {
    return intervalA.startMs >= intervalB.startMs && intervalA.startMs < intervalB.endMs;
  }

  // Si B es puntual (0m) y A tiene duración > 0m
  if (intervalB.durationMinutes === 0) {
    return intervalB.startMs >= intervalA.startMs && intervalB.startMs < intervalA.endMs;
  }

  // Ambos tienen duración > 0m
  return intervalA.startMs < intervalB.endMs && intervalA.endMs > intervalB.startMs;
};

/**
 * Determina si un turno está actualmente bloqueando disponibilidad
 */
export const isSlotActiveBlocking = (
  slot: SlotDocData,
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
 * Busca los turnos confirmados o en pago que entran en conflicto
 */
export const findConflictingActiveSlots = (
  target: SlotDocData,
  allSlots: SlotDocData[],
  nowMs = Date.now()
): SlotDocData[] => {
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
 * Encuentra turnos disponibles o en pago expirados que se superponen con un turno confirmado
 * para marcarlos en estado 'conflict'.
 */
export const calculateConflictingAvailableSlots = (
  confirmedSlot: SlotDocData,
  allSlots: SlotDocData[]
): SlotDocData[] => {
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
 * Calcula qué turnos en estado 'conflict' deben reactivarse a 'available' al cancelar/liberar un turno confirmado.
 * NOTA: Los turnos en estado 'cancelled' nunca se reactivan.
 */
export const calculateSlotsToReactivate = (
  cancelledOrReleasedSlot: SlotDocData,
  allSlots: SlotDocData[],
  nowMs = Date.now()
): SlotDocData[] => {
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

  const slotsToReactivate: SlotDocData[] = [];

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
