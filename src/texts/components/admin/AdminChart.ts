export const ADMIN_CHART_TEXTS = {
  header: {
    mainTitle: 'Métricas y Estadísticas de Turnos',
    mainSubtitle: 'Ingresos reales por cobro de señas de Mercado Pago',
    chartTitle: 'Ingresos Exactos por Fecha de Turno',
    chartSubtitle: 'Valores totales reales de seña por cada jornada confirmada',
  },
  emptyState:
    'Aún no hay turnos confirmados con pagos efectivos para generar el gráfico de ingresos.',
  kpis: {
    totalConfirmed: 'Total Confirmados',
    collectedDeposits: 'Señas Cobradas',
    averageTicket: 'Ticket Promedio',
    uniqueClients: 'Clientes Únicos',
  },
  badges: {
    recordedDates: (count: number) =>
      `${count} ${count === 1 ? 'fecha' : 'fechas'} registradas`,
    slotCount: (count: number) =>
      `${count} ${count === 1 ? 'turno' : 'turnos'}`,
  },
  barTooltip: (label: string, revenueFormatted: string, count: number) =>
    `${label}: $${revenueFormatted} (${count} ${count === 1 ? 'turno' : 'turnos'})`,
} as const;
