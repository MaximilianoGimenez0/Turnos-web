export const PAYMENT_SUCCESS_TEXTS = {
  title: '¡Pago de Seña Aprobado!',
  description:
    'Tu turno ha sido confirmado con éxito. Hemos registrado el pago en Mercado Pago y enviado un correo de confirmación con todos los detalles de tu reserva.',
  details: {
    receiptLabel: 'N° de Comprobante MP:',
    receiptPrefix: '#',
    statusLabel: 'Estado del Pago:',
    approvedStatus: 'Aprobado / Acreditado',
    preferenceLabel: 'Preferencia ID:',
  },
  notice: {
    verifying: 'Confirmando reserva y enviando comprobante...',
    verified: 'Revisá tu bandeja de entrada o spam para ver el comprobante por correo.',
  },
  actions: {
    backToHome: 'Volver al Inicio / Ver Turnos',
  },
  loader: {
    title: 'Verificando tu Pago...',
    subtitle: 'Confirmando transacción con Mercado Pago y generando tu comprobante...',
  },
  logs: {
    verificationError: 'Error al verificar pago o enviar emails:',
  },
} as const;
