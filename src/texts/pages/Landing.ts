export const LANDING_TEXTS = {
  brand: {
    name: 'Turneado',
    tagline: 'Agenda online y señas con Mercado Pago',
  },
  nav: {
    help: 'Ayuda',
    demoCta: 'Probar Demo',
  },
  hero: {
    titleLine1: 'Turnos online con',
    titleLine2: 'seña automática,',
    titleHighlight: 'sin idas y vueltas por mensaje',
    subtitle:
      'Gestioná reservas, cobrá señas directo en tu Mercado Pago y mostrá una agenda con la identidad de tu negocio.',
    primaryCta: 'Probar Demo en vivo',
    secondaryCta: 'Hablar por WhatsApp',
    whatsappHref:
      'https://wa.me/5491140675852?text=' +
      encodeURIComponent('Hola! Quiero sumar mi negocio a Turneado.'),
    trustItems: [
      '0% comisión extra de Turneado',
      'Activación guiada en menos de 24 hs',
      'Apto para estudios, consultorios, barberías y servicios',
    ],
    preview: {
      urlLabel: 'turneado.app/tu-negocio',
      businessName: 'Espacio Norte',
      businessSub: 'Agenda pública personalizada',
      days: [
        { wd: 'Lun', num: '02', active: false },
        { wd: 'Mar', num: '03', active: true },
        { wd: 'Mié', num: '04', active: false },
        { wd: 'Jue', num: '05', active: false },
      ],
      slotTime: '14:00 hs',
      slotDuration: '60 min',
      slotService: 'Sesión Estándar',
      slotExtras: '+ Atención prioritaria',
      depositLabel: 'Seña garantizada MP',
      depositAmount: '$5.000',
      adminBadge: 'Panel privado',
      adminTitle: 'Confirmación instantánea',
      adminSubtitle: 'Email automático · Reserva temporal de 15 min · Sin turnos dobles',
      chips: {
        lock: { title: 'Horario protegido', meta: '15:00 min mientras paga' },
        payment: { title: 'Seña acreditada', meta: 'Mercado Pago · $5.000' },
        email: { title: 'Comprobante enviado', meta: 'Email con tu marca' },
      },
    },
  },
  industries: {
    label: 'Diseñado para negocios que trabajan con agenda y seña',
    items: [
      'Estudios y consultorios',
      'Barberías y peluquerías',
      'Estética y bienestar',
      'Tattoo y arte corporal',
      'Clases y entrenamiento',
      'Asesorías 1 a 1',
      'Kinesiología y salud',
      'Estudios de fotografía',
    ],
  },
  howItWorks: {
    title: 'Del primer clic al turno confirmado, sin intervención manual',
    subtitle: 'Recorré paso a paso cómo se mueve tu agenda en tiempo real',
    scrollHint: 'Deslizá para ver el paso a paso',
    steps: [
      {
        number: '01',
        title: 'Activamos tu espacio y conectás Mercado Pago',
        description:
          'Preparamos tu enlace turneado.app/tu-negocio, cargás tus servicios, duraciones y extras, y conectás tu cuenta de Mercado Pago de forma segura.',
        sceneHeader: 'Panel de configuración',
        sceneStatus: 'Mercado Pago activo',
        sceneUrl: 'turneado.app/tu-negocio',
        services: [
          { name: 'Sesión Estándar', duration: '60 min', deposit: '$5.000' },
          { name: 'Sesión Extendida', duration: '90 min', deposit: '$7.500' },
          { name: 'Consulta Inicial', duration: '45 min', deposit: '$3.500' },
        ],
        mpNodeTitle: 'Cobro directo con Mercado Pago',
        mpNodeMeta: 'Conexión verificada · 0% comisión extra',
      },
      {
        number: '02',
        title: 'Compartís tu agenda, tarjeta QR y placa IG',
        description:
          'Publicás tu enlace en tu bio o WhatsApp, descargás tu tarjeta con QR para el local y bajás imágenes con tus turnos disponibles listas para subir a Instagram Stories.',
        sceneHeader: 'Herramientas para difundir',
        sceneStatus: 'Listo para Instagram Stories',
        igMonth: 'Noviembre',
        igTitle: 'TURNOS DISPONIBLES',
        igFooter: 'RESERVÁ AHORA',
        igRows: [
          { day: '02', wd: 'LUN', times: '11:30 | 15:00 | 17:00' },
          { day: '03', wd: 'MAR', times: '10:00 | 14:00 | 16:30' },
          { day: '05', wd: 'JUE', times: '09:30 | 12:00 | 18:00' },
        ],
        qrCardTitle: 'Espacio Norte',
        qrCardSubtitle: 'Escaneá y reservá 24/7',
        qrCardUrl: 'turneado.app/demo',
      },
      {
        number: '03',
        title: 'Tus clientes reservan, señan y reciben comprobante',
        description:
          'El horario queda reservado por 15 minutos mientras paga, el sistema evita que se pisen otros turnos y ambos reciben el comprobante por email.',
        sceneHeader: 'Agenda en tiempo real',
        sceneStatus: 'Sin superposiciones',
        primarySlot: {
          time: '14:00 hs',
          service: 'Sesión Estándar · 60 min',
          lockingLabel: 'Bloqueo 15:00 min',
          confirmedLabel: 'Confirmado · Seña $5.000',
        },
        conflictSlot: {
          time: '14:30 hs',
          service: 'Solapa con 14:00–15:00',
          badge: 'Evita superposición',
        },
        emailCard: {
          title: 'Comprobante enviado por email',
          meta: 'Cliente + Negocio · Fecha, seña y saldo restante',
        },
      },
    ],
  },
  benefits: {
    title: 'Cuatro pilares construidos para proteger tu tiempo y tus ingresos',
    subtitle:
      'Todo está pensado para ahorrarte tiempo y evitar ausencias, cuidando la identidad de tu marca.',
    items: [
      {
        id: 'mp-direct',
        number: '01',
        title: 'Señas directo a tu Mercado Pago',
        description:
          'Conectás tu cuenta de Mercado Pago desde el panel. El dinero entra directo a tu cuenta de forma segura y sin comisiones extra por reserva.',
        visual: {
          fromLabel: 'Cliente paga seña',
          midLabel: 'Pago seguro · MP',
          toLabel: 'Tu cuenta MP',
          metricValue: '0%',
          metricLabel: 'comisión extra Turneado',
        },
      },
      {
        id: 'smart-agenda',
        number: '02',
        title: 'Agenda 24/7 sin superposiciones',
        description:
          'Reserva temporal de 15 minutos mientras el cliente paga y control automático para que ningún turno se pise según la duración de cada servicio.',
        visual: {
          rows: [
            { time: '14:00', label: 'Sesión 60m', state: 'confirmed', tag: 'Confirmado' },
            { time: '14:30', label: 'Intervalo cubierto', state: 'conflict', tag: 'Protegido' },
            { time: '15:30', label: 'Próximo lugar', state: 'available', tag: 'Disponible' },
          ],
        },
      },
      {
        id: 'branding',
        number: '03',
        title: 'Tu web con tu propia estética',
        description:
          'Editor en vivo con paletas, tipografías, bordes, modos claro/oscuro, portada, galería de trabajos y vista previa en celular y escritorio.',
        visual: {
          previewName: 'Tu Marca',
          previewSub: 'Paleta, fuentes y portada editables en vivo',
          palettes: [
            { name: 'Editorial', primary: '#9e4f5e', bg: '#faf5ec' },
            { name: 'Botánico', primary: '#4f6d5a', bg: '#f2f6f3' },
            { name: 'Océano', primary: '#3d5a73', bg: '#f1f5f8' },
            { name: 'Noir', primary: '#c8a97e', bg: '#1e1b18' },
          ],
        },
      },
      {
        id: 'automation',
        number: '04',
        title: 'Emails automáticos y difusión rápida',
        description:
          'Comprobantes automáticos por email con tu marca, estadísticas claras, tarjeta QR descargable e imágenes de turnos para Instagram.',
        visual: {
          items: [
            { title: 'Email automático', detail: 'Confirmación instantánea con tu logo' },
            { title: 'Placa calendario Instagram', detail: 'Día, semana o mes en Story 9:16 y Post 4:5' },
            { title: 'Tarjeta digital + QR', detail: 'Imagen en alta calidad lista para imprimir o compartir' },
          ],
        },
      },
    ],
  },
  pricing: {
    title: 'Un único plan completo, sin sorpresas ni comisiones por turno',
    subtitle:
      'Todo incluido para operar tu negocio con reservas online y cobro automatizado de señas.',
    planName: 'Plan Profesional Completo',
    planTag: 'Multirrubro · Todo incluido',
    monthlyLabel: 'Suscripción mensual',
    monthlyCurrency: '$',
    monthlyAmount: '18.000',
    monthlyAmountNumber: 18000,
    monthlyPeriod: '/ mes',
    setupLabel: 'Puesta en marcha única:',
    setupAmount: '$25.000',
    setupNote: 'Incluye alta inicial, configuración guiada de Mercado Pago y diseño base.',
    includedTitle: 'Qué incluye tu suscripción',
    features: [
      'Turnos, servicios y adicionales ilimitados',
      '0% comisión extra de Turneado sobre tus señas',
      'Cobro directo en tu cuenta de Mercado Pago',
      'Tu propio enlace turneado.app/tu-negocio con secciones de Precios y Sobre nosotros',
      'Editor de apariencia en vivo (colores, tipografías, portada y tema claro/oscuro)',
      'Emails automáticos de confirmación para vos y tu cliente',
      'Control automático para evitar turnos superpuestos, recargos por fecha/horario y agenda confirmada',
      'Material para difundir: Tarjeta con QR + Imágenes de turnos para Instagram',
    ],
    primaryCta: 'Solicitar alta por WhatsApp',
    secondaryCta: 'Probar Demo primero',
  },
  faq: {
    title: 'Preguntas clave antes de empezar',
    items: [
      {
        q: '¿Turneado retiene el dinero o cobra comisión por cada seña?',
        a: 'No. Cada negocio conecta su propia cuenta de Mercado Pago desde su panel. La seña ingresa directamente a tu cuenta con las comisiones estándar de Mercado Pago y 0% adicional de Turneado.',
      },
      {
        q: '¿Puedo personalizar los colores y el estilo para mi rubro?',
        a: 'Sí. Desde la pestaña Apariencia podés elegir estilos prediseñados (Estética, Barbería, Bienestar, Consultorios, Tattoo, Pilates) o definir tu propia paleta, tipografía, bordes y portada en tiempo real.',
      },
      {
        q: '¿Qué pasa si tomo un turno por WhatsApp o en persona?',
        a: 'Desde el panel podés asignar cualquier horario manualmente en segundos sin cobrar seña online, manteniendo la disponibilidad pública sincronizada al instante.',
      },
      {
        q: '¿Cuánto demora activar mi negocio?',
        a: 'En menos de 24 horas dejamos tu espacio operativo para que cargues tus servicios y empieces a compartir el enlace.',
      },
    ],
    moreHelpCta: 'Ver todas las preguntas en el Centro de Ayuda',
  },
  finalCta: {
    title: '¿Querés ver cómo quedaría tu agenda en vivo?',
    subtitle:
      'Probá la experiencia completa del cliente y del panel administrador en nuestro espacio de demostración.',
    primaryCta: 'Explorar Demo interactiva',
    secondaryCta: 'Consultar por WhatsApp',
  },
} as const;
