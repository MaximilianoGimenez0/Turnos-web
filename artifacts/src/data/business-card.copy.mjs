export const BUSINESS_CARD_COPY = {
  front: {
    ariaLabel: 'Turneado - Frente de tarjeta',
    header: {
      kicker: 'Turneado · Sistema de Reservas &amp; Agenda Online',
      sub: 'Estética, bienestar &amp; estudios profesionales',
      liveIndicator: 'Sincronización en tiempo real',
    },
    hero: {
      title: 'Turneado',
      subtitle: 'Reservas online con seña garantizada y cero ausentismo.',
      description:
        'Tu propia web con la estética de tu marca, agenda reactiva 24/7, cobro directo a tu Mercado Pago con bloqueo de 15 min y motor anti-solapamiento.',
      features: [
        'Seña con Mercado Pago',
        'Estética 100% de tu marca',
        'Motor Anti-Conflictos',
        'Backoffice, Emails &amp; Métricas',
      ],
    },
    preview: {
      ariaLabel: 'Vista previa de turno confirmado',
      studioLabel: 'Agenda en vivo',
      monthTag: 'Noviembre',
      days: [
        { wd: 'Lun', num: '23', active: false },
        { wd: 'Mar', num: '24', active: true },
        { wd: 'Mié', num: '25', active: false },
      ],
      slotTime: '10:30 hs',
      slotDuration: '1h 15m',
      slotService: 'Lifting de pestañas',
      slotExtras: ['+ Nutrición keratina', '+ Tinte'],
      depositLabel: 'Seña online asegurada',
      depositAmount: '$5.000',
      confirmedTitle: 'Turno confirmado al instante',
      confirmedSub: 'Comprobante con tu marca por email',
    },
    footer: {
      platformLabel: 'Plataforma en vivo',
      whatsappLabel: 'WhatsApp',
      authorLabel: 'Autor',
    },
  },
  back: {
    ariaLabel: 'Turneado - Dorso de tarjeta',
    eyebrow: 'Turneado · Experiencia de reserva',
    title: 'Turno asegurado',
    subtitle: 'en tres simples pasos.',
    steps: [
      {
        num: '1',
        title: 'Elegí horario, servicios y extras',
        desc: 'Disponibilidad real 24/7 con duración y presupuesto estimado.',
      },
      {
        num: '2',
        title: 'Aboná la seña online',
        desc: 'Bloqueo inmediato por 15 min directo en tu Mercado Pago.',
      },
      {
        num: '3',
        title: 'Confirmación automática',
        desc: 'Comprobante con tu marca por email y agenda actualizada al instante.',
      },
    ],
    qr: {
      ariaLabel: 'Código QR de demo en vivo',
      kicker: 'Escanear demo en vivo',
    },
  },
};
