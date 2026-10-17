export const ASSIGN_SLOT_MODAL_TEXTS = {
  header: {
    title: 'Tomar / Asignar Turno',
    subtitle: 'Registra los datos del cliente para confirmar este turno manualmente.',
    closeAriaLabel: 'Cerrar modal',
    defaultServiceName: 'Selecciona al menos un servicio',
    defaultSlotTitle: 'Turno / Consulta',
  },
  sections: {
    assignedServices: 'Servicios Asignados',
    requestedExtras: 'Extras Solicitados por Servicio',
    selectedPlural: (count: number, extrasTotalFormatted: string) =>
      `${count} seleccionado${count > 1 ? 's' : ''} (+$${extrasTotalFormatted})`,
    extrasCheckedBadge: (count: number) =>
      count > 0
        ? `${count} extra${count > 1 ? 's' : ''} marcado${count > 1 ? 's' : ''}`
        : 'Sin extras marcados',
  },
  form: {
    clientNameLabel: 'Nombre Completo del Cliente',
    clientNamePlaceholder: 'Ej: Sofía Herrera',
    emailLabel: 'Correo Electrónico (Opcional)',
    emailPlaceholder: 'cliente@ejemplo.com',
    phoneLabel: 'WhatsApp / Teléfono (Opcional)',
    phonePlaceholder: '+54 9 11 1234-5678',
    notesLabel: 'Notas u Observaciones (Opcional)',
    notesPlaceholder: 'Ej: Solicitó turno por llamada, abona seña en efectivo el día previo...',
  },
  pricing: {
    basePriceLabel: 'Precio Base:',
    extrasLabel: (count: number) => `Extras (${count}):`,
    totalEstimatedLabel: 'Total Estimado:',
    depositLabel: 'Seña configurada:',
    balanceDueLabel: 'Saldo restante en salón:',
  },
  footer: {
    cancelButton: 'Cancelar',
    submitButton: 'Confirmar y Asignar Turno',
  },
  loader: {
    title: 'Asignando Turno...',
    subtitle: 'Confirmando datos y actualizando la agenda en tiempo real...',
  },
  alerts: {
    serviceRequiredTitle: 'Servicio Requerido',
    serviceRequiredMessage: 'Para asignar este turno debes seleccionar al menos uno de los servicios.',
    nameRequiredTitle: 'Nombre Requerido',
    nameRequiredMessage: 'Por favor ingresa el nombre del cliente.',
    clientNameField: 'El nombre del cliente',
    emailInvalidTitle: 'Correo Inválido',
    emailInvalidMessage: 'El correo electrónico ingresado no tiene un formato válido.',
    phoneInvalidTitle: 'Teléfono Inválido',
    phoneInvalidMessage: 'El número de teléfono ingresado no es válido.',
    conflictTitle: 'Conflicto de Horario',
    conflictMessage:
      'El horario seleccionado entra en conflicto con otro turno ya confirmado para la duración requerida de los servicios elegidos. Por favor, selecciona otro turno disponible o ajusta los servicios a realizar.',
    conflictDetails: (duration: string) => [
      `Duración calculada: ${duration}`,
      'Verifica la agenda para evitar solapamientos con otros turnos confirmados.',
    ],
    restrictionTitle: 'Restricción de Asignación',
    unexpectedError: 'Ocurrió un error inesperado al procesar la asignación del turno.',
  },
  logs: {
    assignError: 'Error al asignar turno:',
  },
} as const;
