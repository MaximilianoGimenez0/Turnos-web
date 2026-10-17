export const CONFIRMED_AGENDA_TEXTS = {
  header: {
    mainTitle: (count: number) => `Agenda de Turnos Confirmados (${count})`,
    subtitle: 'Vista compacta y ordenada para el seguimiento diario de tus clientes',
  },
  dateHeader: {
    todayPrefix: 'Hoy - ',
    slotCount: (count: number) => `(${count} ${count === 1 ? 'turno' : 'turnos'})`,
  },
  emptyState: {
    titleWithSearch: 'No hay turnos confirmados que coincidan con la búsqueda',
    titleDefault: 'No hay turnos confirmados aún',
    description:
      'Los turnos con seña abonada por los clientes aparecerán organizados cronológicamente aquí.',
  },
  card: {
    timeSuffix: 'hs',
    defaultClientName: 'Cliente sin nombre',
    confirmedBadge: 'Confirmado',
    defaultServiceName: 'Consulta / Turno',
    totalEstPrefix: 'Total Est:',
    extrasPrefix: '✨ Extras:',
    estPrefix: '💰 Est: $',
    balancePrefix: 'Saldo:',
    mpReceiptPrefix: 'MP #',
    cancelButton: 'Cancelar',
    cancelTitle: 'Cancelar este turno',
    sendEmailTitle: 'Enviar correo',
    openWhatsAppTitle: 'Abrir chat de WhatsApp',
    whatsAppLabel: 'WhatsApp',
  },
} as const;
