export const PAYMENT_FAILURE_TEXTS = {
  title: 'No se pudo completar el pago',
  description:
    'El pago no fue procesado o fue cancelado en Mercado Pago. Por motivos de seguridad, el turno temporalmente bloqueado ha sido liberado para otros usuarios.',
  details: {
    statusLabel: 'Estado',
    rejectedStatus: 'Pago rechazado',
    cancelledByUserStatus: 'Cancelado por el usuario',
    commonReasonLabel: 'Motivo habitual',
    commonReasonText: 'Fondos insuficientes o límite de tarjeta',
  },
  notice: 'Podés volver a elegir el horario e intentar con otro medio de pago.',
  actions: {
    retry: 'Intentar nuevamente',
  },
} as const;
