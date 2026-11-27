export const BUSINESS_CARD_GENERATOR_TEXTS = {
  header: {
    title: 'Tarjeta de presentación y QR',
    subtitle:
      'Generá y descargá la tarjeta digital de tu negocio con código QR directo a tu agenda pública.',
  },
  controls: {
    styleLabel: 'Estilo de tarjeta',
    styleLight: 'Claro editorial',
    styleDark: 'Oscuro / Marca',
    publicUrlLabel: 'Enlace de tu agenda pública',
    copyUrl: 'Copiar enlace',
    copiedUrl: '¡Enlace copiado!',
  },
  actions: {
    downloadFront: 'Descargar Frente (PNG)',
    downloadBack: 'Descargar Dorso con QR (PNG)',
    downloadQrOnly: 'Descargar solo QR (PNG)',
  },
  preview: {
    frontLabel: 'Frente',
    backLabel: 'Dorso con QR',
    scanCta: 'Escaneá para reservar tu turno online',
    features: ['Agenda 24/7', 'Seña con Mercado Pago', 'Confirmación automática'],
  },
} as const;
