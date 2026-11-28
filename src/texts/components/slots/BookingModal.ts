export const BOOKING_MODAL_TEXTS = {
  header: {
    title: 'Reservar Turno',
    subtitle: 'Completá tus datos y seleccioná los servicios y extras deseados.',
    closeAriaLabel: 'Cerrar modal',
    defaultServiceName: 'Seleccioná al menos un servicio',
    defaultServiceTitle: 'Turno disponible',
    hourSuffix: 'hs',
    basePricePrefix: 'Base: $',
    depositPrefix: 'Seña: $',
    surchargeContextNote: 'Se suma al total estimado del servicio',
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
    namePlaceholder: 'Ej: Alex Gómez',
    nameField: 'El nombre y apellido',
    emailLabel: 'Correo Electrónico',
    emailPlaceholder: 'nombre@ejemplo.com',
    phoneLabel: 'WhatsApp / Teléfono',
    phonePlaceholder: 'Ej: +54 9 11 1234-5678',
    notesLabel: 'Notas (Opcional)',
    notesPlaceholder: 'Ej: Primera consulta, aclaraciones o preferencias...',
  },
  pricing: {
    basePriceLabel: 'Precio Base del Servicio:',
    extrasLabel: (count: number) => `Extras seleccionados (${count}):`,
    surchargeLabel: (reason?: string) => (reason ? `Recargo (${reason})` : 'Recargo por tarifa especial'),
    surchargeZeroSubtotalHint: 'a sumar al valor del servicio',
    surchargePercentUnselectedHint: 'sobre servicios',
    totalEstimatedLabel: 'Total Estimado:',
    depositLabel: 'Seña a pagar online (Mercado Pago):',
    balanceDueLabel: 'Saldo pendiente (a abonar luego del servicio):',
  },
  disclaimer: {
    boldText: 'Reserva segura:',
    text: 'Al hacer clic en pagar, el turno queda reservado 15 minutos hasta que realices el pago.',
  },
  footer: {
    cancelButton: 'Cancelar',
    generatingPayment: 'Generando pago...',
    payDepositButton: (amountFormatted: string) => `Pagar seña de $${amountFormatted}`,
    onlinePaymentUnavailable: 'Pagos online no habilitados',
  },
  mpNotConfigured: {
    title: 'Pagos online temporalmente no disponibles',
    description:
      'Este negocio todavía no tiene habilitado el cobro online de señas por Mercado Pago. Podés comunicarte directamente para coordinar tu turno.',
    whatsappCta: 'Contactar por WhatsApp',
    instagramCta: 'Escribir por Instagram',
  },
  loader: {
    title: 'Generando tu Reserva Segura...',
    subtitle: 'Preparando el pago seguro en Mercado Pago. No cierres esta ventana...',
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
    mpUrlError: 'No pudimos abrir el link de pago de Mercado Pago. Intentá nuevamente en unos segundos.',
  },
  logs: {
    bookingError: 'Error al procesar la reserva:',
  },
  wizard: {
    stepperAriaLabel: 'Pasos de la reserva',
    steps: {
      service: 'Servicio',
      extras: 'Extras',
      details: 'Tus datos',
      summary: 'Resumen',
    },
    stepLockedSuffix: 'bloqueado: pagos online no habilitados',
    progress: {
      stepCounter: (current: number, total: number) => `Paso ${current} de ${total}`,
      ariaValueText: (current: number, total: number, stepLabel: string, percentage: number) =>
        `Paso ${current} de ${total}: ${stepLabel} (${percentage}%)`,
      statuses: {
        slot_unavailable: 'Horario no disponible',
        duration_conflict: 'Conflicto de horario',
        exploration_mode: 'Modo consulta',
        select_service: 'Elegí un servicio',
        service_ready: 'Servicio listo',
        extras_optional: 'Opcionales',
        details_errors: (count: number) =>
          count === 1 ? 'Revisá 1 campo' : `Revisá ${count} campos`,
        details_remaining: (remaining: number) =>
          remaining === 1 ? 'Falta 1 dato' : `Faltan ${remaining} datos`,
        details_ready: 'Datos completos',
        summary_ready: 'Listo para confirmar',
      },
    },
    serviceStep: {
      titleMultiple: 'Elegí tu servicio',
      subtitleMultiple: 'Podés combinar más de un servicio si el horario lo permite.',
      titleSingle: 'Servicio incluido en este turno',
      subtitleSingle: 'Confirmá el servicio, la duración y el valor base antes de continuar.',
      includedBadge: 'Incluido',
      extrasAvailableHint: (count: number) =>
        `+${count} extra${count === 1 ? '' : 's'} opcional${count === 1 ? '' : 'es'}`,
      priceToConfirm: 'A confirmar',
      selectAtLeastOneError: 'Seleccioná al menos un servicio para continuar.',
    },
    extrasStep: {
      title: 'Sumá extras opcionales',
      subtitle: 'Personalizá tu turno o continuá directamente si no necesitás adicionales.',
    },
    detailsStep: {
      title: 'Completá tus datos',
      subtitle: 'Los usamos para enviarte el comprobante y recordarte tu turno.',
      prefilledNotice: 'Completamos tus datos de tu última reserva',
      clearPrefilledAction: 'Limpiar',
    },
    summaryStep: {
      title: 'Revisá y confirmá tu reserva',
      subtitle: 'Verificá los detalles antes de pasar al pago seguro con Mercado Pago.',
      turnSectionTitle: 'Turno',
      servicesSectionTitle: 'Servicios y extras',
      extrasSectionTitle: 'Extras',
      clientSectionTitle: 'Tus datos',
      editAction: 'Editar',
      editServicesAction: 'Editar servicios',
      editExtrasAction: 'Editar extras',
      noExtrasSelected: 'Sin extras adicionales',
      notesPrefix: 'Notas:',
    },
    navigation: {
      backButton: 'Volver',
      continueButton: 'Continuar',
      liveTotalPrefix: 'Total est.',
      liveDepositPrefix: 'Seña',
      contextEstimatedPrefix: 'Total est.: $',
    },
    banners: {
      slotUnavailable:
        'Este horario dejó de estar disponible hace instantes. Elegí otro horario para continuar.',
      slotUnavailableAlert:
        'Este horario acaba de ser reservado o bloqueado por otra persona. Cerrá esta ventana y elegí otro turno disponible.',
      liveDurationConflict: (durationFormatted: string) =>
        `La duración combinada (${durationFormatted}) se superpone con otro turno ya reservado. Quitá un servicio o elegí otro horario.`,
    },
  },
} as const;
