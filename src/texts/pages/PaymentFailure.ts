export const PAYMENT_FAILURE_TEXTS = {
  title: 'No se pudo completar el pago',
  description:
    'El pago no fue procesado o fue cancelado en Mercado Pago. Por motivos de seguridad, el turno temporalmente bloqueado ha sido liberado para otros usuarios.',
  details: {
    statusLabel: 'Estado:',
    rejectedStatus: 'Pago Rechazado',
    cancelledByUserStatus: 'Cancelado por el usuario',
    commonReasonLabel: 'Motivo común:',
    commonReasonText: 'Fondos insuficientes o límite de tarjeta',
  },
  notice: 'Podés seleccionar nuevamente el turno e intentar con otro medio de pago.',
  actions: {
    retry: 'Intentar Nuevamente / Ver Turnos',
  },
} as const;
