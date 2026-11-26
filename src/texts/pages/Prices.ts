export const PRICES_TEXTS = {
  hero: {
    badge: 'Precios transparentes · Sin costos ocultos',
    title: 'Lista de servicios y precios',
    subtitle:
      'Conocé en detalle el valor de cada servicio y sus adicionales. Elegí lo que necesitás para calcular tu presupuesto en tiempo real y asegurar tu turno.',
  },
  search: {
    placeholder: 'Buscar por servicio o adicional',
    ariaLabel: 'Buscar servicios o adicionales',
    clearAriaLabel: 'Borrar búsqueda',
    foundSingular: '1 servicio encontrado',
    foundPlural: (count: number) => `${count} servicios encontrados`,
    clearSearch: 'Limpiar búsqueda',
  },
  loader: {
    title: 'Cargando catálogo de servicios',
    subtitle: 'Obteniendo servicios y valores actualizados',
  },
  emptyState: {
    upcomingTitle: 'Próximamente lista de servicios',
    upcomingText:
      'Estamos actualizando la carta de servicios y novedades. Volvé a consultar pronto.',
    noResultsTitle: 'No encontramos resultados',
    noResultsText: (query: string) =>
      `No hay servicios ni adicionales que coincidan con "${query}".`,
  },
  card: {
    optionalExtras: 'Adicionales opcionales',
    tapToAddHint: 'Tocá para sumar al cálculo',
    removeExtraTitle: (name: string) => `Quitar ${name}`,
    addExtraTitle: (name: string, priceFormatted: string) => `Sumar ${name} (+${priceFormatted})`,
    inYourEstimate: 'En tu presupuesto',
    addToEstimate: 'Sumar a presupuesto',
    removeFromCalcLabel: (name: string) => `Quitar ${name} de la calculadora`,
    addToCalcLabel: (name: string) => `Agregar ${name} a la calculadora`,
    durationUnit: 'min',
  },
  receipt: {
    title: 'Tu presupuesto',
    subtitle: 'Estimación de tu reserva',
    clearButton: 'Vaciar',
    clearButtonAriaLabel: 'Vaciar todo el presupuesto',
    emptyTitle: 'Calculadora vacía',
    emptyText:
      'Seleccioná cualquier servicio o adicional en las tarjetas para calcular el total y tiempo de tu turno.',
    itemRemoveTitle: (name: string) => `Quitar ${name}`,
    itemRemoveAriaLabel: (name: string) => `Eliminar ${name}`,
    extrasTitle: 'Adicionales',
    baseServicesLabel: 'Servicios base',
    extrasLabel: (count: number) => `Adicionales (${count})`,
    estimatedTimeLabel: 'Tiempo estimado',
    totalEstimatedLabel: 'Total estimado',
    totalFinalSessionSublabel: 'Valor completo',
    depositNotice:
      'El turno se confirma mediante una seña online. El saldo restante se abona presencialmente el día de tu turno.',
    bookButton: 'Reservar turno',
  },
  floatingDock: {
    ariaLabel: 'Resumen',
    serviceSingular: 'servicio',
    servicePlural: 'servicios',
    viewDetail: 'Ver detalle',
    viewDetailAriaLabel: 'Ver desglose completo',
    bookButton: 'Reservar',
  },
  drawer: {
    ariaLabel: 'Desglose',
    title: 'Desglose de presupuesto',
    closeAriaLabel: 'Cerrar desglose',
    clearButton: 'Vaciar',
    bookButton: 'Reservar turno',
  },
  duration: {
    zeroMin: '0 min',
    hoursAndMin: (hours: number, min: number) => `${hours}h ${min}m`,
    hoursOnly: (hours: number) => `${hours}h`,
    minOnly: (min: number) => `${min} min`,
  },
  errors: {
    loadServices: 'Error al cargar catálogo de servicios:',
  },
} as const;
