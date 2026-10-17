export const CLIENT_VIEW_TEXTS = {
  hero: {
    badge: 'Estudio de Estética & Belleza',
    titlePrefix: 'Tu momento de cuidado y',
    titleHighlight: 'belleza personalizada',
    subtitle:
      'Elegí el servicio que buscás, seleccioná el horario que mejor te quede y asegurá tu lugar con seña 100% protegida por Mercado Pago.',
    exploreButton: 'Ver Días y Horarios Disponibles',
  },
  studioCard: {
    liveBadge: 'Agenda Abierta Online',
    title: 'Atención Profesional Exclusiva',
    subtitle: 'Seguimiento personalizado, productos importados y espacio climatizado.',
    perk1: 'Disponibilidad sincronizada en tiempo real',
    perk2: 'Seña protegida con Mercado Pago',
    perk3: 'Comprobante y recordatorio automático',
    cta: 'Explorar Horarios Disponibles',
    aboutLink: 'Ver información sobre mí',
  },
  trustPills: {
    mpGuarantee: 'Pagás con Mercado Pago',
    paymentMethods: 'Débito, Crédito y Dinero en Cuenta',
    instantReceipt: 'Comprobante Instantáneo',
  },
  slotsSection: {
    badge: 'Módulo de Reserva',
    title: 'Agenda de Citas',
    loadingCount: 'Cargando...',
    countBadge: (count: number) =>
      count === 1 ? '1 horario disponible' : `${count} horarios disponibles`,
    subtitle: 'Elegí el día y horario que mejor se adapte a vos para asegurar tu cita',
    step1: '1. Elegí la fecha',
    step2: '2. Filtrá por momento del día o servicio',
    step3: '3. Seleccioná tu horario',
  },
  search: {
    placeholder: 'Buscar por día, horario o servicio (ej. Viernes, 16:00, Semipermanente)...',
    ariaLabel: 'Buscar turnos por día, horario o servicio',
    clearAriaLabel: 'Borrar búsqueda',
    foundSingular: '1 horario disponible encontrado',
    foundPlural: (count: number) => `${count} horarios disponibles encontrados`,
    resetFilters: 'Restablecer filtros',
    cleanFilters: 'Limpiar filtros',
    viewAllSlots: 'Ver Todos los Turnos',
  },
  periods: {
    all: 'Todo el día',
    morning: 'Mañana',
    morningSub: 'Hasta 13:00 hs',
    afternoon: 'Tarde',
    afternoonSub: 'Desde 13:00 hs',
  },
  dateStrip: {
    all: (count: number) => `Todos (${count})`,
    allDays: 'Todos los días',
    today: 'Hoy',
    tomorrow: 'Mañana',
    prevAria: 'Ver fechas anteriores',
    nextAria: 'Ver fechas siguientes',
  },
  density: {
    cards: 'Fichas',
    compact: 'Rápido',
    ariaLabel: 'Cambiar densidad de visualización',
  },
  accordion: {
    expandAll: 'Expandir todos',
    collapseAll: 'Colapsar todos',
    showMoreDays: (remaining: number) =>
      `Ver ${remaining} ${remaining === 1 ? 'fecha más disponible' : 'fechas más disponibles'}`,
    showMoreSlots: (remaining: number) =>
      `Ver ${remaining} ${remaining === 1 ? 'horario más' : 'horarios más'}`,
    showLessSlots: 'Ver menos',
    collapsedHint: 'Tocar para ver horarios',
  },
  quickSlot: {
    depositPrefix: 'Seña:',
    bookAria: (time: string, service: string) =>
      `Reservar turno a las ${time} para ${service}`,
  },
  loaders: {
    slotsTitle: 'Cargando Turnos Disponibles...',
    slotsSubtitle: 'Sincronizando la agenda en tiempo real...',
    portfolioTitle: 'Cargando Galería de Trabajos...',
    portfolioSubtitle: 'Obteniendo fotos de tratamientos destacados...',
  },
  emptyStates: {
    searchTitle: 'No encontramos turnos para tu búsqueda',
    dateFilterTitle: 'No hay turnos disponibles para esta fecha',
    generalTitle: 'No hay turnos disponibles por el momento',
    searchText: (query: string, hasDateFilter: boolean) =>
      `No hay horarios que coincidan con "${query}"${hasDateFilter ? ' en la fecha seleccionada' : ''}. Probá con otro horario o día.`,
    dateFilterText: 'Podés probar seleccionando "Todos" para ver todas las fechas disponibles.',
    generalText: 'Volvé a consultar más tarde para nuevas fechas de atención.',
    portfolioTitle: 'Galería en Actualización',
    portfolioText: 'Pronto compartiremos fotos de nuestros trabajos y técnicas más recientes.',
  },
  groups: {
    countSingular: '1 horario',
    countPlural: (count: number) => `${count} horarios`,
  },
  portfolio: {
    badge: 'Experiencia',
    title: 'Galería de Trabajos',
    subtitle: 'Estos son los resultados de algunos de mis trabajos',
  },
  howItWorks: {
    badge: 'Proceso Simple',
    title: '¿Cómo funciona el proceso de reserva?',
    subtitle: 'Turno asegurado en 3 pasos',
    steps: [
      {
        number: 1,
        title: 'Elegí tu Turno',
        description: 'Explorá el catálogo de turnos y elegí el día y horario que mejor se adapte a vos.',
      },
      {
        number: 2,
        title: 'Pagá la Seña',
        description: 'Completá tus datos de contacto y aboná la seña protegida con Mercado Pago.',
      },
      {
        number: 3,
        title: '¡Listo! Confirmación',
        description:
          'Tu lugar queda 100% asegurado y vas a recibir el comprobante con todos los detalles en tu email.',
      },
    ],
  },
  faq: {
    badge: 'Dudas Comunes',
    title: 'Preguntas Frecuentes',
    subtitle: 'Todo lo que necesitás saber antes de reservar',
    items: [
      {
        q: '¿Cómo funciona el pago de la seña?',
        a: 'La seña se abona de manera 100% online y segura mediante Mercado Pago (tarjetas de crédito, débito o dinero en cuenta). El saldo restante del servicio se abona el día de tu cita.',
      },
      {
        q: '¿Qué pasa si necesito reprogramar o cancelar mi turno?',
        a: 'Podés solicitar la reprogramación con al menos 24 horas de anticipación comunicándote por WhatsApp o Mail.',
      },
      {
        q: '¿Cuánto tiempo se bloquea el turno mientras realizo el pago?',
        a: 'Al hacer clic en reservar, el turno queda reservado temporalmente por 15 minutos para vos mientras completás el pago en Mercado Pago.',
      },
      {
        q: '¿Voy a recibir un comprobante de mi reserva?',
        a: 'Sí, vas a recibir un correo electrónico automático con todos los detalles de tu turno (fecha, hora, servicio, montos y comprobante de pago).',
      },
      {
        q: '¿El resto del pago se paga presencial?',
        a: 'Sí, el resto del pago se realiza presencialmente al finalizar tu turno.',
      }
    ],
  },
  guarantee: {
    title: 'Reserva Protegida y Segura',
    description:
      'Tus transacciones se procesan bajo los estándares de seguridad de Mercado Pago con cifrado de grado bancario. El resto del valor se paga el día de la cita.',
  },
  errors: {
    connectionTitle: 'Error de Conexión',
    connectionFallback: 'No se pudieron cargar los turnos en tiempo real.',
    loadPortfolio: 'Error al cargar portfolio:',
  },
} as const;
