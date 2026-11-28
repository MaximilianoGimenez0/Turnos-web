import type { AnalyticsGranularity, AnalyticsTimeBandId } from '../../../services/analyticsService';

export const ADMIN_CHART_TEXTS = {
  header: {
    mainTitle: 'Métricas del negocio',
    mainSubtitle: 'Rendimiento comercial, señas cobradas online, saldo pendiente y demanda',
    exportCsv: 'Exportar CSV',
    clearFilters: 'Limpiar filtros',
  },
  filters: {
    periodAria: 'Filtrar métricas por período',
    periods: {
      '7d': '7 días',
      '30d': '30 días',
      current_month: 'Mes actual',
      '3m': '3 meses',
      all: 'Todo',
      custom: 'Personalizado',
    },
    fromLabel: 'Desde',
    toLabel: 'Hasta',
    channelAria: 'Filtrar por origen de reserva',
    channels: {
      all: 'Todos',
      online: 'Mercado Pago',
      manual: 'Manual',
    },
    serviceAria: 'Filtrar por servicio',
    allServices: 'Todos los servicios',
    activeRangeBadge: (from: string, to: string) => `${from} – ${to}`,
    allTimeBadge: 'Todo el historial',
  },
  kpis: {
    estimatedRevenue: 'Facturación estimada',
    estimatedBreakdown: (online: string, pending: string) =>
      `Señas $${online} · Pend. $${pending}`,
    collectedDeposits: 'Señas cobradas online',
    channelCounts: (onlineCount: number, manualCount: number) =>
      `${onlineCount} Mercado Pago · ${manualCount} manuales`,
    pendingBalance: 'Saldo pendiente',
    pendingSubtitle: 'A abonar luego del servicio',
    confirmedSlots: 'Turnos confirmados',
    occupancySubtitle: (pct: number) => `${pct}% de ocupación`,
    cancelledBadge: (count: number) => `${count} cancel.`,
    averageTicket: 'Ticket promedio real',
    averageTicketSubtitle: 'Valor estimado por turno',
    uniqueClients: 'Clientes únicos',
    returningSubtitle: (pct: number, count: number) => `${pct}% recurrentes (${count})`,
    vsPrevious: (delta: number) => `${delta > 0 ? `+${delta}` : delta}% vs. anterior`,
    sameAsPrevious: '0% vs. anterior',
  },
  chart: {
    title: 'Evolución de ingresos y turnos',
    subtitleByGranularity: (granularity: AnalyticsGranularity) =>
      granularity === 'day'
        ? 'Detalle diario del período seleccionado'
        : granularity === 'week'
        ? 'Agrupado por semana para mayor claridad'
        : 'Agrupado por mes',
    granularityBadge: (granularity: AnalyticsGranularity) =>
      granularity === 'day' ? 'Por día' : granularity === 'week' ? 'Por semana' : 'Por mes',
    metrics: {
      total: 'Facturación total',
      deposits: 'Señas online',
      count: 'Turnos',
    },
    legendOnline: 'Seña online',
    legendPending: 'Saldo pendiente',
    legendDeposits: 'Señas cobradas',
    legendCount: 'Turnos confirmados',
    legendAverage: (formatted: string) => `Prom. ${formatted}`,
    tooltipAppointments: (count: number) => `${count} ${count === 1 ? 'turno' : 'turnos'}`,
    tooltipTotal: 'Total estimado',
    tooltipOnline: 'Señas online',
    tooltipPending: 'Saldo pendiente',
    mobileTapHint: 'Tocá una barra para ver el detalle',
  },
  weekdays: {
    title: 'Días más concurridos',
    subtitle: 'Distribución de lunes a domingo',
    peakInsight: (dayName: string, sharePct: number) =>
      `${dayName} concentra el ${sharePct}% de tus turnos`,
    empty: 'Sin datos suficientes en este período',
    slotCount: (count: number) => `${count} ${count === 1 ? 'turno' : 'turnos'}`,
  },
  services: {
    title: 'Servicios y extras más pedidos',
    subtitle: 'Participación sobre las reservas del período',
    extrasTitle: 'Adicionales destacados',
    empty: 'No se registraron servicios en este período',
    bookingsCount: (count: number) => `${count} ${count === 1 ? 'reserva' : 'reservas'}`,
  },
  timeBands: {
    title: 'Franjas horarias pico',
    subtitle: 'Demanda por momento del día',
    peakHourBadge: (hourLabel: string) => `Hora pico: ${hourLabel} hs`,
    labels: {
      morning: { title: 'Mañana', range: '08:00 – 12:00' },
      midday: { title: 'Mediodía', range: '12:00 – 15:00' },
      afternoon: { title: 'Tarde', range: '15:00 – 19:00' },
      evening: { title: 'Noche / Otro', range: '19:00+' },
    } satisfies Record<AnalyticsTimeBandId, { title: string; range: string }>,
  },
  health: {
    title: 'Salud de agenda y clientes',
    subtitle: 'Estado de los turnos publicados y fidelización',
    confirmed: 'Confirmados',
    available: 'Disponibles',
    cancelled: 'Cancelados',
    conflict: 'En conflicto',
    cancellationRate: (pct: number) => `Tasa de cancelación: ${pct}%`,
    clientsTitle: 'Composición de clientes',
    newClients: 'Nuevos',
    returningClients: 'Recurrentes',
    noClientsYet: 'Sin clientes registrados en el período',
  },
  emptyState: {
    noHistoryTitle: 'Todavía no hay turnos confirmados',
    noHistoryDescription:
      'Cuando empieces a confirmar reservas (online por Mercado Pago o manuales desde tu panel), acá vas a ver facturación, días pico, horarios más buscados y servicios destacados.',
    filteredTitle: 'No hay resultados para los filtros elegidos',
    filteredDescription:
      'Probá ampliar el período, cambiar el origen o limpiar el filtro de servicio',
    resetAction: 'Ver mes actual sin filtros',
  },
} as const;
