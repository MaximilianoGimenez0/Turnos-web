export const BOOKING_MODAL_TEXTS = {
  header: {
    title: 'Reservar Turno',
    subtitle: 'Completá tus datos y seleccioná los servicios y extras deseados.',
    closeAriaLabel: 'Cerrar modal',
    defaultServiceName: 'Seleccioná al menos un servicio',
    defaultServiceTitle: 'Turno de Estética',
    hourSuffix: 'hs',
    basePricePrefix: 'Base: $',
    depositPrefix: 'Seña: $',
  },
  services: {
    availableTitle: 'Servicios Disponibles en este Turno',
  },
  extras: {
    sectionTitle: 'Extras y Adicionales por Servicio',
    selectedPlural: (count: number, extrasTotalFormatted: string) =>
      `${count} seleccionado${count > 1 ? 's' : ''} (+$${extrasTotalFormatted})`,
    badgeCount: (count: number) =>
      count > 0
        ? `${count} extra${count > 1 ? 's' : ''} elegido${count > 1 ? 's' : ''}`
        : 'Sin extras seleccionados',
  },
  form: {
    nameLabel: 'Nombre y Apellido',
    namePlaceholder: 'Ej: Lucía Benítez',
    nameField: 'El nombre y apellido',
    emailLabel: 'Correo Electrónico',
    emailPlaceholder: 'lucia.benitez@ejemplo.com',
    phoneLabel: 'WhatsApp / Teléfono',
    phonePlaceholder: 'Ej: +54 9 11 1234-5678',
    notesLabel: 'Notas (Opcional)',
    notesPlaceholder: 'Ej: Preferencia de diseño, primera vez...',
  },
  pricing: {
    basePriceLabel: 'Precio Base del Servicio:',
    extrasLabel: (count: number) => `Extras seleccionados (${count}):`,
    totalEstimatedLabel: 'Total Estimado:',
    depositLabel: 'Seña a pagar online (Mercado Pago):',
    balanceDueLabel: 'Saldo restante a pagar presencialmente:',
  },
  disclaimer: {
    boldText: 'Reserva segura:',
    text: 'Al hacer clic en pagar, el turno queda reservado 15 minutos hasta que realices el pago.',
  },
  footer: {
    cancelButton: 'Cancelar',
    generatingPayment: 'Generando pago...',
    payDepositButton: (amountFormatted: string) => `Pagar seña de $${amountFormatted}`,
  },
  loader: {
    title: 'Generando tu Reserva Segura...',
    subtitle: 'Conectando con Mercado Pago Checkout Pro. No cierres esta ventana...',
  },
  alerts: {
    serviceRequiredTitle: 'Servicio Requerido',
    serviceRequiredMessage:
      'Tenés que seleccionar al menos un servicio para poder reservar este turno.',
    nameRequiredTitle: 'Nombre Requerido',
    nameRequiredMessage: 'Por favor ingresá tu nombre y apellido completo.',
    emailInvalidTitle: 'Correo Inválido',
    emailInvalidMessage: 'Por favor ingresá un correo electrónico válido.',
    phoneInvalidTitle: 'Teléfono Inválido',
    phoneInvalidMessage:
      'Por favor ingresá un número de WhatsApp / teléfono válido.',
    conflictTitle: 'Conflicto de Horario',
    conflictMessage:
      'El horario seleccionado entra en conflicto con otro turno ya confirmado para la duración requerida de los servicios elegidos. Por favor, seleccioná otro turno disponible o ajustá los servicios a realizar.',
    conflictDetails: (durationFormatted: string) => [
      `Duración calculada: ${durationFormatted}`,
      'Elegí otro horario u otra fecha disponible en la agenda.',
    ],
    pendingPaymentTitle: 'Turno en Proceso de Pago',
    pendingPaymentMessage:
      'Este turno o un turno superpuesto se encuentra actualmente en proceso de pago por otro usuario. Si la operación no se completa en 15 minutos, volverá a quedar disponible.',
    pendingPaymentDetails: [
      'El turno está bloqueado temporalmente por seguridad mientras se procesa el pago.',
      'Podés elegir otro horario disponible o intentar nuevamente en unos minutos.',
    ],
    restrictionTitle: 'Restricción de Reserva',
    unexpectedError: 'Ocurrió un error inesperado al procesar tu solicitud.',
    mpUrlError: 'No se recibió la URL de pago de Mercado Pago.',
  },
  logs: {
    bookingError: 'Error al procesar la reserva:',
  },
} as const;
