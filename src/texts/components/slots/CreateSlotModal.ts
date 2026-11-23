export const CREATE_SLOT_MODAL_TEXTS = {
  header: {
    title: 'Crear Varios Turnos',
    subtitle:
      'Seleccioná múltiples días y horarios, podés agregar servicios y cambiar el precio de la seña.',
    closeAriaLabel: 'Cerrar panel de creación',
  },
  recommendedDays: [
    { label: 'Hoy', days: 0 },
    { label: 'Mañana', days: 1 },
    { label: 'Pasado', days: 2 },
  ],
  section1: {
    stepNum: '01',
    shortTitle: 'Servicios y seña',
    heading: (selectedCount: number) =>
      `1. Servicios Habilitados para el Turno ${selectedCount > 0 ? `(${selectedCount} seleccionados)` : ''}`,
    selectedBadge: (count: number) => `${count} ${count === 1 ? 'elegido' : 'elegidos'}`,
    estimatedMinutes: (minutes: number) => `${minutes} min mín.`,
    durationRangeLabel: (minMinutes: number, maxMinutes: number) =>
      minMinutes === maxMinutes
        ? `${minMinutes} min`
        : `${minMinutes}–${maxMinutes} min`,
    selectAll: 'Todos',
    unselect: 'Desmarcar',
    emptyNotice:
      'No hay servicios configurados. Configurá los servicios en la pestaña "Servicios" del panel de administración.',
    serviceNameLabel: 'Nombre visible del turno (Opcional)',
    serviceNamePlaceholder: 'Ej: Turno Estética / Promo Mirada',
    serviceNameHelper: 'Si lo dejás vacío, se muestran las etiquetas de los servicios habilitados.',
    serviceNameField: 'El nombre del servicio',
    depositLabel: 'Monto de seña ($ ARS)',
    depositPlaceholder: 'Ej: 5000',
    depositHelper: 'Seña fija para confirmar la reserva.',
    depositField: 'El monto de la seña',
  },
  section2: {
    stepNum: '02',
    shortTitle: 'Días',
    heading: (count: number) => `2. Seleccionar Días (${count} seleccionados)`,
    selectedBadge: (count: number) => `${count} ${count === 1 ? 'elegido' : 'elegidos'}`,
    recommendedLabel: 'Acceso rápido',
    customDateLabel: 'Elegir en calendario (tocá para sumar o quitar)',
    addDayButton: 'Agregar',
    emptyNotice:
      'Todavía no agregaste días. Tocá cualquier día del calendario o acceso rápido.',
    removeDayTitle: 'Eliminar día',
  },
  section3: {
    stepNum: '03',
    shortTitle: 'Horarios',
    heading: (count: number) => `3. Seleccionar Horarios (${count} seleccionados)`,
    selectedBadge: (count: number) => `${count} ${count === 1 ? 'elegido' : 'elegidos'}`,
    recommendedLabel: 'Horarios recomendados:',
    morningLabel: 'Mañana',
    afternoonLabel: 'Tarde',
    customTimeLabel: 'Otro horario (cada 30 min)',
    disabledTooltip: 'Horario no disponible para el día de hoy',
    addTimeButton: 'Agregar',
    intervalsWarning: 'Solo se permiten intervalos de 30 minutos (ej: 09:00, 09:30, 10:00, etc.).',
    pastTimeWarning: (time: string) =>
      `El horario ${time} hs ya transcurrió en el día de hoy y no se puede seleccionar.`,
    emptyNotice:
      'Todavía no agregaste horarios. Elegí una franja arriba o ingresá una hora.',
    removeTimeTitle: 'Eliminar horario',
    hourSuffix: 'hs',
  },
  section4: {
    summaryTitle: 'Resumen en vivo',
    summaryEmptyHint:
      'Elegí al menos un día y un horario para previsualizar los turnos a publicar.',
    daysFormula: (count: number) => `${count} ${count === 1 ? 'Día' : 'Días'}`,
    timesFormula: (count: number) => `${count} ${count === 1 ? 'Horario' : 'Horarios'}`,
    totalSlotsFormula: (count: number) => `${count} ${count === 1 ? 'Turno' : 'Turnos'}`,
    depositTag: (amountFormatted: string) => `Seña: $${amountFormatted}`,
    statusAlreadyExists: 'Ya existe',
    statusPastHour: 'Horario pasado',
    statusAvailable: 'Disponible',
  },
  footer: {
    cancelButton: 'Cancelar',
    publishMultiple: (count: number) => `Publicar ${count} Turnos al Mismo Tiempo`,
    publishSingle: 'Publicar Turno',
  },
  progress: {
    title: 'Progreso del turno',
    readyMessage: 'Listo para publicar',
    readyActionLabel: 'Ir a publicar',
    step1Label: 'Servicios y seña',
    step2Label: 'Días',
    step3Label: 'Horarios',
    step1PendingBoth: 'Elegí al menos 1 servicio e ingresá la seña',
    step1MissingService: (depositFormatted: string) =>
      `Falta elegir servicio · Seña $${depositFormatted}`,
    step1MissingDeposit: (serviceCount: number) =>
      `${serviceCount} ${serviceCount === 1 ? 'servicio' : 'servicios'} · Ingresá una seña válida`,
    step1InvalidDeposit: 'La seña debe estar entre $1 y $5.000.000',
    step1InvalidCustomName: 'Nombre visible: mínimo 2 caracteres',
    step1Complete: (serviceCount: number, depositFormatted: string) =>
      `${serviceCount} ${serviceCount === 1 ? 'servicio' : 'servicios'} · Seña $${depositFormatted}`,
    step2Pending: 'Elegí al menos 1 día en el calendario',
    step2Complete: (daysCount: number) =>
      `${daysCount} ${daysCount === 1 ? 'día seleccionado' : 'días seleccionados'}`,
    step3Pending: 'Agregá al menos 1 horario (cada 30 min)',
    step3DuplicatesError: (count: number) =>
      count === 1
        ? '1 horario ya existe en la agenda'
        : `${count} horarios ya existen en la agenda`,
    step3AllPastError: 'Los horarios elegidos ya pasaron hoy',
    step3CompleteWithSlots: (timesCount: number, slotsCount: number) =>
      `${timesCount} ${timesCount === 1 ? 'horario' : 'horarios'} · ${slotsCount} ${slotsCount === 1 ? 'turno listo' : 'turnos listos'}`,
    step3CompleteTimesOnly: (timesCount: number) =>
      `${timesCount} ${timesCount === 1 ? 'horario elegido' : 'horarios elegidos'}`,
  },
  confirmPublish: {
    title: (count: number) => `¿Publicar ${count} turnos nuevos?`,
    description: (count: number) =>
      `Estás por crear ${count} turnos disponibles en la agenda pública con la siguiente configuración:`,
    servicesLabel: 'Servicios:',
    depositLabel: 'Seña por turno:',
    slotsPreviewLabel: (count: number) => `Turnos a publicar (${count}):`,
    confirmButton: (count: number) => `Sí, publicar ${count} turnos`,
    cancelButton: 'Volver y revisar',
  },
  loader: {
    title: 'Publicando Turnos...',
    subtitle: (count: number) => `Creando ${count} turnos en la base de datos...`,
  },
  alerts: {
    attentionTitle: 'Atención',
    serviceRequiredTitle: 'Servicio Requerido',
    serviceRequiredMessage:
      'Tenés que seleccionar al menos un servicio para poder crear los turnos.',
    serviceRequiredDetails: [
      'Seleccioná uno o más servicios en la sección "1. Servicios Habilitados y Seña".',
      'Los servicios determinan los tratamientos disponibles, su duración estimada y precios.',
    ],
    datesRequiredTitle: 'Fechas Requeridas',
    datesRequiredMessage:
      'Por favor agregá al menos un día a la lista para generar los turnos.',
    timesRequiredTitle: 'Horarios Requeridos',
    timesRequiredMessage:
      'Por favor agregá al menos un horario a la lista para generar los turnos.',
    invalidDateTitle: 'Fecha Inválida',
    invalidDateMessage: 'No podés agregar fechas que ya hayan transcurrido.',
    invalidTimeTitle: 'Horario Inválido',
    invalidTimeFormatMessage: 'El formato del horario debe ser HH:MM (ej: 09:30).',
    invalidTimeValidMessage: 'Por favor ingresa un horario válido.',
    not30MinIntervalTitle: 'Intervalo no permitido',
    not30MinIntervalMessage:
      'Solo se permite seleccionar horarios en intervalos de 30 minutos (ej: 09:00, 09:30, 10:00, 10:30, etc.).',
    pastTimeTitle: 'Horario Pasado',
    pastTimeMessage: 'El horario seleccionado ya transcurrió en el día de hoy.',
    invalidDepositTitle: 'Monto Inválido',
    invalidDepositFallback:
      'El monto de la seña debe ser un número entero positivo entre $1 y $5.000.000 ARS.',
    invalidServiceTitle: 'Nombre de Servicio Inválido',
    invalidServiceFallback: 'El nombre del servicio debe tener entre 2 y 120 caracteres.',
    pastSlotsRestrictionTitle: 'Restricción de Horarios',
    pastSlotsRestrictionMessage:
      'Todos los turnos seleccionados corresponden a horarios que ya han transcurrido.',
    duplicateSlotsTitle: 'Horarios Ya Ocupados',
    duplicateSlotsMessage:
      'No se pueden crear los turnos porque ya existen turnos registrados en los siguientes horarios seleccionados:',
    andMoreDuplicates: (count: number) => `...y ${count} turnos más.`,
    conflictTitle: 'Conflicto de Horario',
    restrictionTitle: 'Restricción del Sistema',
    unexpectedError: 'Error inesperado al crear los turnos.',
  },
  logs: {
    createError: 'Error al crear los turnos:',
  },
} as const;
