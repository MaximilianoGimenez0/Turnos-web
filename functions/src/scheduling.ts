export interface SlotInterval {
  startMs: number;
  endMs: number;
  durationMinutes: number;
}

export interface SlotDocData {
  id?: string;
  datetime?: string;
  endDatetime?: string;
  status?: string;
  estimatedDurationMinutes?: number;
  previousDurationMinutes?: number;
  previousDuration?: string;
  services?: unknown[];
  clientData?: {
    email?: string;
    estimatedDurationMinutes?: number;
    bookedServices?: Array<{ durationMinutes?: number }>;
    [key: string]: unknown;
  } | null;
  expiresAt?: string | null;
  [key: string]: unknown;
}

export const MAX_SLOT_LOOKBACK_HOURS = 12;

/**
 * Returns the shortest valid service duration (minutes) configured on a slot,
 * representing the minimum bookable block for an unassigned multi-service slot.
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

export const getSlotInterval = (
  slot: SlotDocData,
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

export const computeEndDatetimeIso = (
  datetime: string | undefined,
  durationMinutes: number
): string | null => {
  if (!datetime || !durationMinutes || isNaN(durationMinutes) || durationMinutes <= 0) {
    return null;
  }
  const startMs = new Date(datetime).getTime();
  if (isNaN(startMs)) return null;
  return new Date(startMs + durationMinutes * 60 * 1000).toISOString();
};

export const getConflictSearchWindow = (
  startMs: number,
  durationMinutes: number,
  lookbackHours = MAX_SLOT_LOOKBACK_HOURS
): { windowStartIso: string; windowEndIso: string } => {
  const lookbackMs = lookbackHours * 60 * 60 * 1000;
  const effectiveDurationMs = Math.max(durationMinutes, 1) * 60 * 1000;
  return {
    windowStartIso: new Date(startMs - lookbackMs).toISOString(),
    windowEndIso: new Date(startMs + effectiveDurationMs).toISOString(),
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

/**
 * Any confirmed slot or unexpired pending_payment on a DIFFERENT slotId blocks overlapping availability.
 * Same-slot retry by the same holder is checked explicitly in createPreference.
 */
export const isSlotActiveBlocking = (
  slot: SlotDocData,
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

export const findConflictingActiveSlots = (
  target: SlotDocData,
  allSlots: SlotDocData[],
  nowMs = Date.now()
): SlotDocData[] => {
  const targetInterval = getSlotInterval(target);
  if (!targetInterval) return [];

  return allSlots.filter((existingSlot) => {
    if (existingSlot.id === target.id) return false;
    if (!isSlotActiveBlocking(existingSlot, nowMs, target.id)) return false;

    const existingInterval = getSlotInterval(existingSlot);
    return hasSlotOverlap(targetInterval, existingInterval);
  });
};

export const calculateConflictingAvailableSlots = (
  confirmedSlot: SlotDocData,
  allSlots: SlotDocData[],
  nowMs = Date.now()
): SlotDocData[] => {
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
