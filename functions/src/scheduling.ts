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
 * Determines whether two half-open intervals [start, end) overlap in time.
 * Adjacent slots at the exact boundary are non-conflicting.
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
 * Calculates which conflicting slots should be reactivated to available when a slot is released.
 * Manually cancelled slots are permanently excluded from automatic reactivation.
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
