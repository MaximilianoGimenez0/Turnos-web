export const CONFIRMED_AGENDA_TEXTS = {
  header: {
    mainTitle: (count: number) => `Agenda de Turnos Confirmados (${count})`,
    subtitle: 'Línea de tiempo diaria con inicio, duración, finalización y espacios libres',
    expandAll: 'Expandir todos',
    collapseAll: 'Colapsar todos',
  },
  dateHeader: {
    todayPrefix: 'Hoy - ',
    slotCount: (count: number) => `${count} ${count === 1 ? 'turno' : 'turnos'}`,
    occupiedLabel: (duration: string) => `${duration} ocupados`,
    pendingTotalLabel: (amount: string) => `Saldo pendiente: $${amount}`,
    daySpan: (start: string, end: string, nextDay: boolean) =>
      `${start} – ${end}${nextDay ? ' (+1d)' : ''} hs`,
    occupancyBarAria: 'Distribución horaria ocupada del día',
    toggleDayAria: (dateLabel: string, expanded: boolean) =>
      expanded ? `Colapsar agenda de ${dateLabel}` : `Expandir agenda de ${dateLabel}`,
  },
  timeline: {
    freeGap: (duration: string, from: string, to: string) =>
      `Libre · ${duration} (${from} – ${to} hs)`,
    backToBack: 'Turno seguido',
    overlap: (duration: string) => `Superposición · ${duration}`,
    inProgress: 'En curso',
    remaining: (minutes: number) => `restan ${minutes} min`,
    finishedToday: 'Finalizado',
    nowMarker: (time: string) => `Ahora · ${time} hs`,
    nextDaySuffix: '+1d',
    rangeAria: (start: string, end: string | null, duration: string | null) =>
      end && duration
        ? `Turno de ${start} a ${end} hs, duración ${duration}`
        : `Turno a las ${start} hs`,
  },
  emptyState: {
    titleWithSearch: 'No hay turnos confirmados que coincidan con la búsqueda',
    titleInPeriod: (periodLabel: string) => `No hay turnos confirmados en ${periodLabel}`,
    titleDefault: 'No hay turnos confirmados aún',
    description:
      'Los turnos con seña abonada por los clientes aparecerán organizados en la línea de tiempo diaria aquí.',
  },
  card: {
    timeSuffix: 'hs',
    defaultClientName: 'Cliente sin nombre',
    defaultServiceName: 'Consulta / Turno',
    pendingBalanceLabel: 'Saldo pendiente',
    paidInFullLabel: 'Saldado',
    totalUndefinedLabel: 'Total a definir',
    breakdownLine: (total: string, deposit: string) => `Total $${total} · Seña $${deposit}`,
    breakdownLineWithSurcharge: (total: string, surcharge: string, deposit: string) =>
      `Total $${total} (incl. recargo +$${surcharge}) · Seña $${deposit}`,
    surchargeSubline: (surcharge: string) => `Recargo aplicado: +$${surcharge}`,
    depositPaidLine: (deposit: string) => `Seña abonada: $${deposit}`,
    mpReceiptPrefix: 'MP #',
    cancelButton: 'Cancelar',
    cancelTitle: 'Cancelar este turno',
    sendEmailTitle: 'Enviar correo',
    openWhatsAppTitle: 'Abrir chat de WhatsApp',
    whatsAppLabel: 'WhatsApp',
  },
} as const;
