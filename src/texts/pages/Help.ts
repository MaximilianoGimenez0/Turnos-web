export type HelpAudienceId = 'business' | 'client';

export interface HelpFaqItem {
  id: string;
  question: string;
  answer: string;
  tags: readonly string[];
}

export interface HelpCategory {
  id: string;
  title: string;
  description: string;
  items: readonly HelpFaqItem[];
}

export const HELP_TEXTS = {
  topBar: {
    backToLanding: 'Volver a Turneado',
    backToOrigin: 'Volver atrás',
    demoCta: 'Probar Demo',
  },
  hero: {
    badge: 'Centro de Ayuda · Turneado',
    title: '¿En qué podemos ayudarte?',
    subtitle:
      'Guías claras para configurar tu negocio en minutos o reservar un turno con seña protegida.',
  },
  search: {
    placeholder: 'Buscar por tema: Mercado Pago, seña, recargos, QR, cancelar...',
    ariaLabel: 'Buscar artículos en el centro de ayuda',
    clearAriaLabel: 'Limpiar búsqueda',
    resultsCount: (count: number) =>
      count === 1 ? '1 resultado encontrado' : `${count} resultados encontrados`,
    emptyTitle: 'No encontramos artículos para tu búsqueda',
    emptyDescription:
      'Probá con palabras más simples (por ejemplo: seña, webhook, horarios, tarjeta) o escribinos directamente.',
    emptyReset: 'Limpiar búsqueda',
  },
  audiences: {
    ariaLabel: 'Seleccionar guía según perfil',
    business: {
      id: 'business' as const,
      label: 'Para Negocios y Profesionales',
      shortLabel: 'Negocios',
    },
    client: {
      id: 'client' as const,
      label: 'Para Clientes',
      shortLabel: 'Clientes',
    },
  },
  categories: {
    business: [
      {
        id: 'getting-started',
        title: 'Primeros pasos y configuración',
        description: 'Cómo dejar tu espacio listo para recibir reservas en pocos minutos.',
        items: [
          {
            id: 'biz-login',
            question: '¿Cómo ingreso al panel de administración de mi negocio?',
            answer:
              'Entrá a turneado.app/tu-negocio/login (reemplazando "tu-negocio" por tu enlace asignado) e iniciá sesión con el email y contraseña configurados al darte de alta. Si administrás más de un espacio, podés acceder a cada uno con la misma cuenta.',
            tags: ['login', 'admin', 'acceso', 'panel', 'ingresar'],
          },
          {
            id: 'biz-profile',
            question: '¿Cómo cargo mi logo, ubicación, WhatsApp y descripción?',
            answer:
              'Dentro del panel, abrí "Mi Perfil". Allí podés subir tu logo, foto de perfil y portada, además de definir el nombre comercial, especialidad, dirección física, Instagram, WhatsApp y biografía. Todo se refleja al instante en tu agenda pública y en los comprobantes por email.',
            tags: ['perfil', 'logo', 'ubicacion', 'whatsapp', 'instagram', 'portada'],
          },
          {
            id: 'biz-share',
            question: '¿Cómo comparto mi agenda con mis clientes?',
            answer:
              'Tu enlace público es turneado.app/tu-negocio. Desde la sección "Difusión y QR" del panel podés copiar tu link, descargar tu tarjeta de presentación con código QR y generar placas PNG listas para subir a Instagram Stories con tus turnos disponibles.',
            tags: ['compartir', 'link', 'qr', 'instagram', 'tarjeta', 'difusion'],
          },
        ],
      },
      {
        id: 'services-slots',
        title: 'Servicios, turnos y recargos',
        description: 'Armado de catálogo, publicación de horarios y tarifas especiales.',
        items: [
          {
            id: 'biz-services',
            question: '¿Cómo creo servicios, duraciones y adicionales opcionales?',
            answer:
              'En la pestaña "Servicios", hacé clic en "Nuevo servicio". Definí el nombre, precio base en ARS, duración en minutos (de 5 a 480 min) y opcionalmente adicionales con costo extra. Cuando un cliente reserva o simula presupuesto en /prices, Turneado calcula automáticamente el total y la duración combinada.',
            tags: ['servicios', 'precios', 'extras', 'adicionales', 'duracion'],
          },
          {
            id: 'biz-slots',
            question: '¿Cómo publico varios turnos a la vez y qué pasa si se superponen?',
            answer:
              'Desde "Crear Turnos" podés elegir los servicios habilitados, la seña fija online, múltiples días del calendario (con detección automática de feriados) y múltiples horarios en bloques de 30 minutos. Cuando se confirma una reserva cuya duración abarca el bloque siguiente, el sistema marca automáticamente los horarios solapados como "En conflicto" para evitar reservas dobles.',
            tags: ['turnos', 'horarios', 'publicar', 'lote', 'conflicto', 'solapamiento'],
          },
          {
            id: 'biz-surcharges',
            question: '¿Cómo configuro un recargo para feriados, fines de semana o turnos nocturnos?',
            answer:
              'En el Paso 1 de "Crear Turnos", activá "Aplicar recargo por tarifa especial". Podés elegir un monto fijo ($) o un porcentaje (%) sobre los servicios, escribir un motivo visible (ej. "Feriado", "Horario extendido") y decidir si aplica a todo el lote o solo a feriados/fines de semana. El recargo se suma al total estimado y al saldo presencial sin alterar la seña fija.',
            tags: ['recargo', 'feriado', 'fin de semana', 'nocturno', 'tarifa especial'],
          },
          {
            id: 'biz-manual',
            question: '¿Puedo asignar o cancelar un turno manualmente (por WhatsApp o teléfono)?',
            answer:
              'Sí. En la pestaña "Turnos", cualquier horario disponible tiene el botón "Asignar" para cargar los datos del cliente manualmente sin cobrar seña online. Desde "Agenda" o "Turnos" también podés cancelar un turno confirmado o liberar un turno en conflicto cuando corresponda.',
            tags: ['manual', 'asignar', 'cancelar', 'liberar', 'whatsapp'],
          },
        ],
      },
      {
        id: 'mercadopago',
        title: 'Mercado Pago y cobro de señas',
        description: 'Conexión segura directa a tu cuenta sin comisiones extra de Turneado.',
        items: [
          {
            id: 'biz-mp-connect',
            question: '¿Cómo conecto mi cuenta de Mercado Pago para recibir las señas?',
            answer:
              'Ingresá a "Mercado Pago" en la configuración avanzada del panel (requiere rol Dueño). Pegá tu Access Token de producción obtenido desde Mercado Pago Developers y guardá los cambios. Turneado no cobra comisiones adicionales por reserva: el dinero ingresa directo a tu cuenta.',
            tags: ['mercado pago', 'access token', 'seña', 'cobros', 'comision'],
          },
          {
            id: 'biz-mp-webhook',
            question: '¿Por qué es importante registrar el Webhook y la Clave Secreta (HMAC)?',
            answer:
              'La URL de Webhook permite que Mercado Pago avise automáticamente a Turneado apenas se acredita un pago, incluso si el cliente cierra el navegador antes de volver al sitio. La Clave Secreta valida criptográficamente (firma HMAC) que cada notificación provenga realmente de Mercado Pago.',
            tags: ['webhook', 'hmac', 'clave secreta', 'confirmacion', 'ipn'],
          },
          {
            id: 'biz-mp-not-configured',
            question: '¿Qué ven mis clientes si todavía no conecté Mercado Pago?',
            answer:
              'Pueden explorar tu agenda, horarios disponibles, catálogo de precios y galería con normalidad. Al intentar reservar un turno, el sistema les informará que los pagos online aún no están habilitados y les mostrará botones directos a tu WhatsApp e Instagram para coordinar.',
            tags: ['sin mercado pago', 'whatsapp', 'reservar'],
          },
        ],
      },
      {
        id: 'appearance-diffusion',
        title: 'Apariencia y difusión en redes',
        description: 'Personalización de marca, placas para Instagram y tarjetas QR.',
        items: [
          {
            id: 'biz-appearance',
            question: '¿Cómo personalizo los colores, tipografías y portada de mi web?',
            answer:
              'Abrí "Apariencia" en el panel. Podés aplicar un Estilo Curado en 1 clic o ajustar paleta de colores, modo claro/oscuro, tipografía, bordes, diseño de portada y vista de galería con vista previa en vivo en desktop y celular. Los cambios recién se ven en tu sitio público cuando presionás "Publicar".',
            tags: ['apariencia', 'colores', 'tipografia', 'portada', 'tema', 'oscuro'],
          },
          {
            id: 'biz-instagram-plate',
            question: '¿Cómo creo la placa de turnos disponibles para subir a Instagram?',
            answer:
              'Ingresá a "Difusión y QR" (o hacé clic en "Placa Instagram" desde la barra de Turnos). Elegí el período (Día, Semana o Mes), formato (Story 9:16 o Post 4:5) y descargá el PNG listo para publicar. La imagen toma automáticamente los colores, tipografías y estilo de tu marca.',
            tags: ['instagram', 'story', 'placa', 'png', 'calendario', 'turnos disponibles'],
          },
        ],
      },
    ] satisfies readonly HelpCategory[],
    client: [
      {
        id: 'client-booking',
        title: 'Cómo reservar un turno',
        description: 'Pasos para elegir fecha, horario, servicios y asegurar tu lugar.',
        items: [
          {
            id: 'cli-how-to-book',
            question: '¿Cómo reservo un turno online?',
            answer:
              'Ingresá a la agenda del negocio, elegí el día en la barra de fechas (o filtrá por Mañana/Tarde o servicio) y tocá el horario disponible que prefieras. En el modal seleccioná los servicios y adicionales deseados, completá tu nombre, email y teléfono, y confirmá el pago de la seña en Mercado Pago.',
            tags: ['reservar', 'turno', 'pasos', 'servicios', 'horarios'],
          },
          {
            id: 'cli-lock',
            question: '¿Cuánto tiempo queda reservado mi horario mientras pago?',
            answer:
              'Al hacer clic en "Pagar seña", el sistema bloquea ese turno temporalmente durante 15 minutos exclusivamente para vos mientras completás el pago en Mercado Pago. Si el pago no se finaliza dentro de ese plazo, el horario vuelve a liberarse automáticamente.',
            tags: ['bloqueo', '15 minutos', 'tiempo', 'pago', 'expira'],
          },
          {
            id: 'cli-prices',
            question: '¿Cómo calculo el valor y duración antes de elegir horario?',
            answer:
              'Entrá a la pestaña "Precios" de la agenda del negocio. Allí podés sumar servicios y adicionales en la calculadora en vivo para ver el presupuesto estimado, la duración total y pasar directo a reservar.',
            tags: ['precios', 'presupuesto', 'calculadora', 'duracion', 'adicionales'],
          },
        ],
      },
      {
        id: 'client-payments',
        title: 'Pagos, señas y saldo restante',
        description: 'Medios de pago aceptados, recargos especiales y saldo presencial.',
        items: [
          {
            id: 'cli-payment-methods',
            question: '¿Qué medios de pago puedo usar para abonar la seña?',
            answer:
              'La seña se abona a través de Mercado Pago Checkout Pro, por lo que podés pagar con dinero en cuenta de Mercado Pago, tarjetas de débito, crédito o efectivo en puntos habilitados según disponibilidad.',
            tags: ['mercado pago', 'tarjeta', 'debito', 'credito', 'transferencia'],
          },
          {
            id: 'cli-balance',
            question: '¿Cómo y cuándo se abona el resto del servicio?',
            answer:
              'La seña abonada online se descuenta del total estimado del servicio. El saldo restante se paga presencialmente el día de tu turno directamente al negocio, usando los medios de cobro que ofrezca en su local.',
            tags: ['saldo', 'restante', 'presencial', 'seña', 'efectivo'],
          },
          {
            id: 'cli-surcharge',
            question: '¿Qué significa el recargo que aparece en algunos horarios?',
            answer:
              'Algunos negocios aplican un recargo por tarifa especial en determinados días u horarios (por ejemplo feriados, fines de semana o franjas nocturnas). El motivo y el monto exacto se muestran de forma transparente antes de confirmar tu reserva y se suman al total estimado.',
            tags: ['recargo', 'feriado', 'tarifa especial', 'monto'],
          },
        ],
      },
      {
        id: 'client-changes',
        title: 'Comprobantes, reprogramación y cancelaciones',
        description: 'Qué sucede después de pagar y cómo coordinar cambios.',
        items: [
          {
            id: 'cli-receipt',
            question: '¿Dónde recibo el comprobante de mi turno confirmado?',
            answer:
              'Apenas se acredita el pago, ves la pantalla de confirmación con el número de operación de Mercado Pago y además recibís un correo electrónico automático con fecha, horario, servicios, desglose de montos y datos del negocio. Si no lo ves en tu bandeja principal, revisá la carpeta de Spam o Promociones.',
            tags: ['comprobante', 'email', 'correo', 'spam', 'confirmado'],
          },
          {
            id: 'cli-pending',
            question: 'Mi pago quedó "Pendiente de acreditación", ¿qué hago?',
            answer:
              'Algunos medios como pagos en efectivo o ciertas validaciones bancarias demoran unos minutos en acreditarse. Apenas Mercado Pago confirme el pago, Turneado confirmará tu turno automáticamente (si el horario sigue disponible) y te enviará el comprobante por correo.',
            tags: ['pendiente', 'acreditacion', 'demora', 'pago'],
          },
          {
            id: 'cli-reschedule',
            question: '¿Cómo reprogramo o cancelo un turno ya confirmado?',
            answer:
              'Comunicate directamente con el negocio por WhatsApp o por correo electrónico (los datos de contacto figuran en su web y en tu comprobante) con al menos 24 horas de anticipación para coordinar la reprogramación según su política de señas.',
            tags: ['reprogramar', 'cancelar', '24 horas', 'whatsapp', 'seña'],
          },
        ],
      },
    ] satisfies readonly HelpCategory[],
  },
  support: {
    badge: 'Soporte directo',
    title: '¿Seguís con dudas o necesitás ayuda con tu espacio?',
    description:
      'Nuestro equipo responde consultas técnicas, altas de nuevos negocios y asistencia de configuración.',
    whatsappCta: 'Escribir por WhatsApp',
    emailCta: 'Enviar correo a soporte',
    whatsappHref:
      'https://wa.me/5491140675852?text=' +
      encodeURIComponent('Hola! Necesito ayuda con Turneado.'),
    emailHref: 'mailto:contacto@turneado.app?subject=Consulta%20Centro%20de%20Ayuda%20Turneado',
    demoCta: 'Explorar agenda demo',
  },
} as const;
