export const SLOT_CARD_TEXTS = {
  statuses: {
    available: 'Disponible',
    pendingPayment: 'En Proceso de Pago',
    pendingConflict: 'Bloqueo Temporal (En Pago)',
    confirmed: 'Turno Confirmado',
    cancelled: 'Cancelado',
    conflict: 'En Conflicto',
    pastCancelled: 'Cancelado (Historial)',
    pastConcluded: 'Concluido',
    unknown: 'Desconocido',
  },
  timeSuffix: 'hs',
  duration: {
    until: (endTime: string) => `hasta ${endTime} hs`,
    range: (startTime: string, endTime: string) => `${startTime} – ${endTime} hs`,
  },
  defaultServiceName: 'Turno / Consulta',
  fallbackClientInitials: 'CL',
  tags: {
    extrasPrefix: 'Extras:',
    totalEstPrefix: 'Total Est: $',
    bookedNoExtras: 'Sin adicionales',
    moreServices: (count: number) => `+${count} más`,
    lessServices: 'Ver menos',
  },
  sections: {
    services: 'Servicios',
    extras: 'Adicionales',
    availableExtras: 'Adicionales disponibles',
    priceEstimate: 'Total estimado',
    clientInfo: 'Información del cliente',
    bookedDetail: 'Detalle de servicios',
  },
  surcharge: {
    clientReasonLabel: (reason?: string) => {
      const trimmed = reason?.trim();
      if (!trimmed || trimmed.toLowerCase() === 'tarifa especial') {
        return 'Tarifa especial';
      }
      return `Tarifa especial: ${trimmed}`;
    },
    clientRowLabel: 'Recargo especial',
    clientRowTooltip: 'Se suma al total del servicio.',
    adminAppliedLabel: 'Recargo aplicado',
    adminDossierLabel: 'Recargo especial:',
    ariaFragment: (valueLabel: string, reason?: string) =>
      reason ? `, con recargo de ${valueLabel} por ${reason}` : `, con recargo de ${valueLabel}`,
  },
  adminDossier: {
    assignedClient: 'Cliente Asignado',
    durationLabel: 'Duración:',
    salonBalanceLabel: 'Saldo pendiente:',
    mpLabel: 'Mercado Pago',
    channelLabel: 'Origen:',
    channelOnline: 'Mercado Pago',
    channelManual: 'Asignado manual',
    showDetails: 'Ver detalle',
    hideDetails: 'Menos detalle',
    moreServices: (count: number) => `+${count} más`,
  },
  depositLabel: 'Seña para reservar',
  depositPaidLabel: 'Seña abonada',
  pendingBalanceLabel: 'Saldo pendiente',
  paidInFullLabel: 'Saldado',
  compactFinancials: {
    pendingPrefix: 'Saldo',
    pendingTooltip: (pending: string, total: string, deposit: string) =>
      `Saldo pendiente: $${pending} · Total $${total} · Seña abonada $${deposit}`,
    settledTooltip: (total: string, deposit: string) =>
      `Saldado · Total $${total} · Seña abonada $${deposit}`,
    depositOnlyTooltip: (deposit: string) => `Seña abonada: $${deposit}`,
  },
  clientButtons: {
    available: 'Reservar Lugar',
    pendingPayment: 'En proceso de pago',
    confirmed: 'Turno Reservado',
    pastCancelled: 'Turno Cancelado',
    pastConcluded: 'Turno Concluido',
    conflict: 'En Conflicto',
    notAvailable: 'No disponible',
  },
  adminButtons: {
    cancelSlot: 'Cancelar Turno',
    cancelSlotTitle: 'Cancelar turno confirmado',
    takeSlot: 'Tomar Turno',
    takeSlotTitle: 'Tomar y asignar este turno a un cliente',
    takeSlotBlocked: 'Bloqueado por Pago',
    blockedByPendingTitle: 'Bloqueado temporalmente: otro cliente está pagando un turno en este mismo horario. Esperá a que finalice el pago o expire (15 min).',
    deleteUnassignedTitle: 'Eliminar turno no asignado',
    deleteSlotAriaLabel: 'Eliminar turno',
    releaseSlot: 'Liberar',
    releasePendingTitle: 'Desbloquear y dejar disponible nuevamente',
    deletePendingTitle: 'Eliminar turno',
    reassignSlot: 'Reasignar',
    reassignSlotTitle: 'Reasignar este turno y devolverlo a estado Confirmado',
    releaseConflictTitle: 'Evaluar y liberar a disponible si no hay conflicto',
    deleteConflict: 'Eliminar Turno',
    deleteConflictTitle: 'Eliminar turno en conflicto',
    deleteCancelledTitle: 'Eliminar turno cancelado',
    deleteConflictAriaLabel: 'Eliminar turno en conflicto',
    deleteCancelledAriaLabel: 'Eliminar turno cancelado',
    deleteHistory: 'Eliminar Historial',
    deleteHistoryTitle: 'Eliminar este turno del historial',
  },
  notices: {
    pendingPaymentActive: (minutesLeft: number) =>
      `Pago en confirmación — se cancela automáticamente en ${minutesLeft} min si no se completa.`,
    pendingPaymentExpired:
      'Tiempo de pago vencido — se cancelará y liberará automáticamente en breve.',
    pendingConflictActive: (minutesLeft: number) =>
      `En conflicto por pago en confirmación — se libera automáticamente en ${minutesLeft} min si no se concreta.`,
    pendingConflictExpired:
      'Tiempo de pago vencido — este horario volverá a quedar disponible en breve.',
    compactPendingCancel: (minutesLeft: number) => `Cancela en ${minutesLeft} min`,
    compactConflictRelease: (minutesLeft: number) => `Libera en ${minutesLeft} min`,
    compactExpired: 'Tiempo vencido',
  },
} as const;
