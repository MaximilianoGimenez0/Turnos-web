export const PRICES_TEXTS = {
  hero: {
    badge: 'Precios Transparentes · Sin Costos Ocultos',
    title: 'Lista de Servicios & Precios',
    subtitle:
      'Conocé en detalle el valor de cada tratamiento y sus adicionales. Elegí lo que necesitás para calcular tu presupuesto en tiempo real y asegurar tu cita.',
  },
  search: {
    placeholder: 'Buscar por tratamiento o adicional (ej. Semipermanente, Gel, Francesitas...)',
    ariaLabel: 'Buscar tratamientos o adicionales',
    clearAriaLabel: 'Borrar búsqueda',
    foundSingular: '1 tratamiento encontrado',
    foundPlural: (count: number) => `${count} tratamientos encontrados`,
    clearSearch: 'Limpiar búsqueda',
  },
  loader: {
    title: 'Cargando catálogo de tratamientos...',
    subtitle: 'Obteniendo servicios y valores actualizados...',
  },
  emptyState: {
    upcomingTitle: 'Próximamente lista de tratamientos',
    upcomingText:
      'Estamos actualizando la carta de servicios y novedades. ¡Volvé a consultar pronto!',
    noResultsTitle: 'No encontramos resultados',
    noResultsText: (query: string) =>
      `No hay tratamientos ni adicionales que coincidan con "${query}".`,
  },
  card: {
    optionalExtras: 'Adicionales opcionales',
    tapToAddHint: '(Tocá para sumar al cálculo)',
    removeExtraTitle: (name: string) => `Quitar ${name}`,
    addExtraTitle: (name: string, priceFormatted: string) => `Sumar ${name} (+${priceFormatted})`,
    inYourEstimate: 'En tu Presupuesto',
    addToEstimate: 'Sumar a Presupuesto',
    removeFromCalcLabel: (name: string) => `Quitar ${name} de la calculadora`,
    addToCalcLabel: (name: string) => `Agregar ${name} a la calculadora`,
    durationUnit: 'min',
  },
  receipt: {
    title: 'Tu Presupuesto',
    subtitle: 'Estimación de tu sesión',
    clearButton: 'Vaciar',
    clearButtonAriaLabel: 'Vaciar todo el presupuesto',
    emptyTitle: 'Calculadora vacía',
    emptyText:
      'Seleccioná cualquier tratamiento o adicional en las tarjetas de la izquierda para calcular el total y tiempo de tu cita.',
    itemRemoveTitle: (name: string) => `Quitar ${name}`,
    itemRemoveAriaLabel: (name: string) => `Eliminar ${name}`,
    extrasTitle: 'Adicionales:',
    baseServicesLabel: 'Tratamientos base:',
    extrasLabel: (count: number) => `Adicionales (${count}):`,
    estimatedTimeLabel: 'Tiempo estimado:',
    totalEstimatedLabel: 'Total Estimado',
    totalFinalSessionSublabel: 'Valor completo',
    depositNotice:
      'El turno se confirma mediante una seña online. El saldo restante se abona en el salón el día de tu cita.',
    bookButton: 'Reservar Turno',
  },
  floatingDock: {
    ariaLabel: 'Resumen',
    serviceSingular: 'tratamiento',
    servicePlural: 'tratamientos',
    viewDetail: 'Ver Detalle',
    viewDetailAriaLabel: 'Ver desglose completo',
    bookButton: 'Reservar',
  },
  drawer: {
    ariaLabel: 'Desglose',
    title: 'Desglose de Presupuesto',
    closeAriaLabel: 'Cerrar desglose',
    clearButton: 'Vaciar',
    bookButton: 'Reservar Turno',
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
