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
    heading: (selectedCount: number) =>
      `1. Servicios Habilitados para el Turno ${selectedCount > 0 ? `(${selectedCount} seleccionados)` : ''}`,
    estimatedMinutes: (minutes: number) => `${minutes} min estimados`,
    selectAll: 'Seleccionar todos',
    unselect: 'Desmarcar',
    emptyNotice:
      'No hay servicios configurados. Configurá los servicios en la pestaña "Servicios" del panel de administración.',
    serviceNameLabel: 'Nombre/Título visible del Turno (Opcional)',
    serviceNamePlaceholder: 'Ej: Turno Estética / Lifting / Uñas',
    serviceNameHelper: 'Si lo dejas vacío, tomará el nombre de los servicios seleccionados.',
    serviceNameField: 'El nombre del servicio',
    depositLabel: 'Monto de la Seña a Cobrar ($ ARS)',
    depositPlaceholder: 'Ej: 5000',
    depositHelper: 'Monto de seña fija que abonará el cliente para reservar.',
    depositField: 'El monto de la seña',
  },
  section2: {
    heading: (count: number) => `2. Seleccionar Días (${count} seleccionados)`,
    recommendedLabel: 'Días recomendados:',
    addDayButton: 'Agregar Día',
    emptyNotice:
      'No agregaste días todavía. Seleccioná una fecha arriba o usá los días recomendados.',
    removeDayTitle: 'Eliminar día',
  },
  section3: {
    heading: (count: number) => `3. Seleccionar Horarios (${count} seleccionados)`,
    recommendedLabel: 'Horarios recomendados:',
    disabledTooltip: 'Horario no disponible para el día de hoy',
    addTimeButton: 'Agregar Horario',
    intervalsWarning: 'Solo se permiten intervalos de 30 minutos (ej: 09:00, 09:30, 10:00, etc.).',
    pastTimeWarning: (time: string) =>
      `El horario ${time} hs ya transcurrió en el día de hoy y no se puede seleccionar.`,
    emptyNotice:
      'No agregaste horarios todavía. Seleccioná uno o hacé clic en los horarios recomendados.',
    removeTimeTitle: 'Eliminar horario',
    hourSuffix: 'hs',
  },
  section4: {
    daysFormula: (count: number) => `${count} Días`,
    timesFormula: (count: number) => `${count} Horarios`,
    totalSlotsFormula: (count: number) => `${count} Turnos en Total`,
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
