export const PAYMENT_SUCCESS_TEXTS = {
  title: 'Turno confirmado',
  description:
    'Registramos tu seña en Mercado Pago y reservamos tu horario. Te enviamos el comprobante por correo.',
  pending: {
    title: 'Pago pendiente de acreditación',
    description:
      'Tu pago está siendo procesado por Mercado Pago. Apenas se acredite confirmaremos el turno automáticamente y recibirás el comprobante por correo.',
    statusLabel: 'Pendiente de acreditación',
    notice: 'Si abonaste en efectivo o transferencia, la acreditación puede demorar algunos minutos.',
  },
  conflict: {
    title: 'Pago recibido con conflicto de horario',
    description:
      'Tu pago fue aprobado en Mercado Pago, pero el horario seleccionado ya había sido ocupado por otra reserva. No se generó una doble reserva; escribinos con tu número de comprobante para coordinar otro horario o reembolso.',
    statusLabel: 'Requiere coordinación',
    notice: 'Guardá tu número de comprobante de Mercado Pago y contactanos por WhatsApp para resolverlo rápido.',
    whatsappButton: 'Coordinar por WhatsApp',
  },
  rejected: {
    title: 'No se pudo confirmar el pago',
    description:
      'Mercado Pago informó que el pago no fue aprobado o fue cancelado. El turno no quedó reservado; podés volver al calendario e intentar nuevamente.',
    statusLabel: 'No aprobado',
    notice: 'Si ves algún débito en tu cuenta, revisá el estado en tu app de Mercado Pago.',
  },
  error: {
    title: 'No pudimos verificar tu pago ahora',
    description:
      'Ocurrió un inconveniente temporal al consultar el estado de tu reserva. Si tu pago fue aprobado, el sistema lo confirmará automáticamente en unos instantes.',
    statusLabel: 'Verificación pendiente',
    notice: 'Podés reintentar la verificación o revisar tu casilla de correo en unos minutos.',
    retryButton: 'Reintentar verificación',
  },
  details: {
    receiptLabel: 'Comprobante MP',
    receiptPrefix: '#',
    statusLabel: 'Estado',
    approvedStatus: 'Confirmado',
    preferenceLabel: 'Código de operación',
    dateLabel: 'Fecha',
    timeLabel: 'Horario',
    serviceLabel: 'Servicio',
    servicesSubtotalLabel: 'Servicios y extras',
    surchargeLabel: (reason?: string) => (reason ? `Recargo (${reason})` : 'Recargo'),
    estimatedTotalLabel: 'Total estimado',
    depositLabel: 'Seña abonada',
    salonBalanceLabel: 'Saldo pendiente',
    paidInFullValue: '$0 · Saldado',
  },
  notice: {
    verifying: 'Confirmando reserva con Mercado Pago...',
    verified: 'Te enviamos el comprobante por correo.',
    verifiedWithEmail: (maskedEmail: string) =>
      `Enviamos el comprobante a ${maskedEmail}.`,
    spamEmphasis: 'Si no lo ves en unos minutos, revisá tu carpeta de spam o correo no deseado.',
  },
  actions: {
    backToHome: 'Volver al inicio',
  },
  loader: {
    title: 'Verificando tu pago...',
    subtitle: 'Confirmando la transacción con Mercado Pago y validando tu turno...',
  },
  logs: {
    verificationError: 'Error al verificar pago:',
  },
} as const;
