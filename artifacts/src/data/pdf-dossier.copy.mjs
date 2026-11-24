export const PDF_DOSSIER_COPY = {
  shared: {
    brandSub: 'Estética, bienestar &amp; estudios profesionales',
    qrKicker: 'Escanear demo en vivo',
    qrTitle: 'Probá la plataforma',
  },
  page1: {
    ariaLabel: 'TurnosWeb - Quick View y Experiencia de Reserva',
    header: {
      kicker: 'TurnosWeb · Sistema de Reservas &amp; Agenda Online',
      pill: 'Sincronización en tiempo real',
    },
    hero: {
      title: 'TurnosWeb',
      tagline: 'Tu agenda online abierta 24/7, con seña garantizada y la estética de tu marca.',
      copy: 'Una web moderna personalizada al estilo de tu negocio para que tus clientes elijan servicio, día y horario, y aseguren su lugar abonando la seña directo en tu Mercado Pago — sin idas y vueltas por WhatsApp.',
      pills: [
        { icon: 'creditCard', label: 'Seña directo a tu MP' },
        { icon: 'palette', label: 'Web y emails con tu marca' },
        { icon: 'smartphone', label: 'Sin descargar apps' },
      ],
    },
    phone: {
      studioName: 'Estudio de Belleza',
      liveBadge: 'Agenda en vivo',
      dates: [
        { day: 'Hoy', num: '22 Nov', active: true },
        { day: 'Mañana', num: '23 Nov', active: false },
        { day: 'Mar', num: '24 Nov', active: false },
      ],
      slotTime: '10:30 hs',
      slotDur: '1h 15m',
      slotService: 'Lifting de pestañas',
      slotTags: ['+ Nutrición keratina', '+ Tinte'],
      depositLabel: 'Seña online',
      depositVal: '$5.000',
      cta: 'Reservar →',
      confirmTitle: 'Turno confirmado al instante',
      confirmSub: 'Comprobante con tu marca enviado al email',
    },
    steps: {
      headingHtml: 'Turno asegurado <em>en tres simples pasos</em>',
      eyebrow: 'Experiencia sin fricción',
      items: [
        {
          num: '1',
          title: 'Elegí horario y servicios',
          desc: 'Disponibilidad real por fecha, franja horaria, tratamientos y adicionales con presupuesto estimado.',
        },
        {
          num: '2',
          title: 'Aboná la seña online',
          desc: 'Bloqueo atómico por 15 minutos mientras paga directo en tu Mercado Pago (débito, crédito o saldo).',
        },
        {
          num: '3',
          title: 'Confirmación automática',
          desc: 'Comprobante con los colores y logo de tu negocio por email para el cliente y para vos al instante.',
        },
      ],
    },
    clientPanel: {
      kicker: 'Sitio público con tu marca',
      title: 'Para tus clientes',
      badgeIcon: 'sparkles',
      items: [
        {
          icon: 'calendar',
          strong: 'Agenda reactiva 24/7:',
          text: 'buscador inteligente, tira de fechas deslizable, filtros mañana/tarde y vista rápida o en fichas.',
        },
        {
          icon: 'calculator',
          strong: 'Catálogo y calculadora interactiva:',
          text: 'combinan servicios y adicionales para ver duración y presupuesto estimado antes de reservar.',
        },
        {
          icon: 'image',
          strong: 'Perfil profesional y Portfolio:',
          text: 'mostrá tus mejores trabajos, biografía, ubicación, Instagram y acceso directo a tu WhatsApp.',
        },
        {
          icon: 'lock',
          strong: 'Reserva segura sin crear cuentas:',
          text: 'bloqueo temporal de 15 min que evita dobles pagos y cobro protegido vía Mercado Pago.',
        },
        {
          icon: 'mail',
          strong: 'Comprobantes claros con tu identidad:',
          text: 'email automático con fecha, horario, servicios, seña abonada y saldo restante presencial.',
        },
      ],
    },
    adminPanel: {
      kicker: 'Panel privado de gestión',
      title: 'Para tu estudio',
      badgeIcon: 'calendarCheck',
      items: [
        {
          icon: 'clock',
          strong: 'Agenda en línea de tiempo diaria:',
          text: 'vista por día, semana o mes con ocupación, huecos libres, turno en curso, saldo y botón a WhatsApp.',
        },
        {
          icon: 'layers',
          strong: 'Carga masiva de turnos y servicios:',
          text: 'generá múltiples fechas y horarios en segundos, y editá tarifas con adicionales inline y vista previa.',
        },
        {
          icon: 'shield',
          strong: 'Motor inteligente anti-solapamiento:',
          text: 'calcula duraciones combinadas, bloquea horarios en conflicto y los reactiva solos ante cancelaciones.',
        },
        {
          icon: 'palette',
          strong: 'Estudio de Apariencia en vivo:',
          text: '24 paletas o tus colores propios, 8 tipografías, 5 portadas y modo claro/oscuro sincronizado con tus emails.',
        },
        {
          icon: 'chart',
          strong: 'Control manual, Mercado Pago y métricas:',
          text: 'asigná turnos de WhatsApp, conectá tu propio Mercado Pago y medí señas cobradas y ticket promedio.',
        },
      ],
    },
    highlights: [
      { icon: 'palette', label: '24 paletas y marca propia' },
      { icon: 'moon', label: 'Modo claro y oscuro' },
      { icon: 'smartphone', label: '100% móvil y escritorio' },
      { icon: 'zap', label: 'Cobro directo a tu MP' },
    ],
    footerCtaHtml: 'Probá la experiencia real <em>y consultame por WhatsApp</em>',
  },
  page2: {
    ariaLabel: 'TurnosWeb - Propuesta Comercial, Personalización, Plan y Capacidad',
    header: {
      kicker: 'TurnosWeb · Propuesta Comercial &amp; Detalle del Sistema',
      pill: 'Plan integral · Todo incluido',
    },
    hero: {
      titleHtml:
        'Ordená tu agenda y cuidá tu tiempo: <em>un sistema que se paga solo evitando ausencias.</em>',
      subtitle:
        'Todo lo que tu estudio o consultorio necesita para automatizar reservas, personalizar su estética al detalle y cobrar señas directo en tu Mercado Pago — en un plan simple, claro y llave en mano.',
    },
    problems: {
      eyebrow: 'Problemas reales que elimina desde el día 1',
      items: [
        {
          icon: 'shield',
          pain: 'Ausencias y cancelaciones a último momento',
          solution:
            'La seña previa por Mercado Pago asegura el compromiso de cada cliente y protege el valor de tu horario.',
        },
        {
          icon: 'clock',
          pain: 'Horas perdidas respondiendo "¿tenés turno?"',
          solution:
            'Un único enlace en tu Instagram o WhatsApp muestra tus horarios libres actualizados al segundo, las 24 h.',
        },
        {
          icon: 'calendarCheck',
          pain: 'Superposición de horarios y errores manuales',
          solution:
            'El motor de duraciones bloquea automáticamente horarios en conflicto e impide dobles reservas simultáneas.',
        },
        {
          icon: 'dollar',
          pain: 'Confusión con precios, extras y saldo pendiente',
          solution:
            'Cada cliente calcula su presupuesto al reservar y recibe por email cuánto señó y cuánto abona en el local.',
        },
        {
          icon: 'trendingUp',
          pain: 'Falta de control sobre señas e ingresos del mes',
          solution:
            'Consultá señas recaudadas, ticket promedio, comprobantes de Mercado Pago y evolución por fecha en un clic.',
        },
        {
          icon: 'sparkles',
          pain: 'Depender de apps genéricas que opacan tu marca',
          solution:
            'Tu propia web con tu URL, paleta, tipografías, portada, portfolio y correos diseñados con tu identidad.',
        },
      ],
    },
    pillars: {
      eyebrow: 'Personalización, cobros y respaldo técnico',
      items: [
        {
          icon: 'palette',
          tone: 'primary',
          title: 'Estudio de Apariencia en 6 pasos',
          desc: '24 paletas curadas o tus colores propios con contraste WCAG AA, 8 tipografías, 5 diseños de portada, modo claro/oscuro y emails sincronizados.',
        },
        {
          icon: 'lock',
          tone: 'success',
          title: 'Cobro directo en tu Mercado Pago',
          desc: 'Conectás tu propia cuenta con credenciales privadas en servidor y firma criptográfica HMAC. 0% comisión extra de TurnosWeb por reserva.',
        },
        {
          icon: 'zap',
          tone: 'accent',
          title: 'Operación desatendida 24/7',
          desc: 'Liberación automática de bloqueos vencidos cada 10 min, reintento inteligente de correos, protección de incidentes y URL dedicada.',
        },
      ],
    },
    pricing: {
      monthly: {
        badge: 'Abono mensual · Todo incluido',
        items: [
          'Web propia activa 24/7 con URL dedicada, hosting, base de datos y almacenamiento en la nube.',
          'Integración directa a tu cuenta de Mercado Pago (tarjetas, débito y saldo) sin comisiones extra.',
          'Envío automático de comprobantes con tu marca por email para tus clientes y tu negocio.',
          'Mantenimiento automático de agenda, actualizaciones del sistema y soporte técnico incluidos.',
        ],
      },
      setup: {
        badge: 'Alta del servicio · Una sola vez',
        items: [
          'Puesta en marcha completa llave en mano lista para recibir reservas online en pocos días.',
          'Personalización visual completa: logo, portada, paleta, tipografías, biografía, ubicación y redes.',
          'Vinculación guiada de tu Mercado Pago y carga inicial de tus servicios, tarifas y adicionales.',
          'Acompañamiento inicial para que domines tu panel administrador y tu agenda en minutos.',
        ],
      },
      roiHtml:
        'Con evitar apenas <strong>1 o 2 ausencias al mes</strong>, el abono mensual ya se paga solo y recuperás horas libres todas las semanas.',
    },
    capacity: {
      eyebrow: 'Capacidad estimada incluida en el plan',
      noteInline: 'Margen holgado para profesionales independientes y estudios de alta demanda',
      items: [
        {
          prefix: 'Hasta',
          num: '1.200',
          icon: 'calendarCheck',
          label: 'Turnos confirmados / mes',
          desc: 'Hasta ~40 turnos por día con cobro de seña, control anti-conflictos y doble comprobante por email.',
        },
        {
          prefix: '',
          num: '+30.000',
          icon: 'users',
          label: 'Visitas mensuales a tu web',
          desc: 'Clientes entrando desde Instagram, WhatsApp y Google a ver tu agenda, precios y portfolio sin cortes.',
        },
        {
          prefix: '',
          num: '24/7',
          icon: 'zap',
          label: 'Reservas en simultáneo',
          desc: 'Múltiples reservas a la vez con bloqueo atómico de 15 min y sincronización reactiva en tiempo real.',
        },
      ],
    },
    footerCtaHtml: '¿Querés tu agenda online <em>funcionando esta semana?</em>',
  },
};
