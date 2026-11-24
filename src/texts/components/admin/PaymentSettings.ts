export const PAYMENT_SETTINGS_TEXTS = {
  header: {
    title: 'Cobros con Mercado Pago',
    subtitle:
      'Conectá tu cuenta de Mercado Pago para cobrar señas online de forma directa en tu cuenta. Leé las advertencias antes de modificar cualquier credencial.',
    badges: {
      configured: 'Credenciales propias activas',
      demoFallback: 'Modo Demo activo',
      unconfigured: 'Sin configurar',
    },
  },
  caution: {
    title: 'Zona de configuración sensible',
    description:
      'Cualquier error al modificar o borrar estas credenciales impacta de inmediato en los cobros de tu agenda pública. Tocá estos campos solo si estás conectando tu cuenta por primera vez o rotando claves desde Mercado Pago Developers.',
    lockedTitle: 'Edición bloqueada para evitar cambios por error',
    lockedHint:
      'Podés revisar el estado y copiar la URL de Webhook en modo lectura. Desbloqueá la edición solo cuando vayas a cargar, rotar o quitar credenciales.',
    unlockButton: 'Desbloquear edición',
    unlockedTitle: 'Edición habilitada',
    unlockedHint:
      'Verificá cada credencial antes de guardar. Al guardar o salir de esta sección, la protección volverá a activarse automáticamente.',
    lockButton: 'Bloquear y cancelar',
  },
  badges: {
    required: 'Obligatorio',
    optionalRecommended: 'Opcional · Recomendado',
  },
  progress: {
    title: 'Pasos de configuración',
    readyComplete:
      'Integración completa: cobros activos y validación de firma (x-signature) protegida.',
    readyBasic:
      'Cobros activos con tu Access Token. Opcional: podés reforzar la seguridad en los pasos 02 y 03.',
    readyWithUnsavedSecret:
      'Tenés un nuevo Webhook Secret sin guardar — presioná Actualizar credenciales para aplicarlo.',
    pendingMissingTokenCompact: 'Falta cargar el Access Token (paso 01)',
    pendingMissingTokenFooter:
      'Cargá tu Access Token en el paso 01 para habilitar los cobros online.',
    pendingDemoCompact: 'Modo Demo activo — cargá tu propio Access Token (paso 01)',
    pendingDemoFooter:
      'Este negocio usa respaldo demo. Cargá tu Access Token en el paso 01 para cobrar en tu cuenta.',
    pendingUnsavedNewCompact: 'Tenés el Access Token listo para guardar',
    pendingUnsavedNewFooter:
      'Presioná Guardar credenciales abajo para activar los cobros online.',
    pendingUnsavedRotationCompact: 'Nuevo Access Token sin guardar (actual activo)',
    pendingUnsavedRotationFooter:
      'Tus cobros actuales siguen funcionando. Presioná Actualizar credenciales para aplicar el nuevo token.',
    saveActionLabel: 'Ir a guardar',
    step1Label: 'Access Token',
    step1Complete: (masked: string) => `Guardado (${masked})`,
    step1Demo: 'Modo Demo activo (sin credenciales propias)',
    step1Pending: 'Obligatorio para cobrar señas',
    step1UnsavedNew: 'Listo para guardar y activar',
    step1UnsavedRotation: 'Nuevo token sin guardar (actual activo)',
    step1Error: 'Revisá el formato del token',
    step2Label: 'URL de Webhook',
    step2Linked: 'Vinculada con firma activa',
    step2Copied: 'Copiada — pegala en Mercado Pago Developers',
    step2Pending: 'Opcional: copiala en MP Developers',
    step3Label: 'Webhook Secret',
    step3Complete: 'Configurado y activo',
    step3Pending: 'Opcional (recomendado para seguridad)',
    step3UnsavedNew: 'Listo para guardar',
    step3UnsavedRotation: 'Nuevo secreto sin guardar (actual activo)',
    step3Error: 'Revisá el formato del secreto',
  },
  status: {
    heading: 'Estado actual de la integración',
    accessTokenLabel: 'Access Token guardado',
    accessTokenEmpty: 'No cargado',
    accessTokenDemoFallback: 'Respaldo global de demostración',
    webhookSecretLabel: 'Clave Secreta de Webhook (x-signature)',
    webhookSecretConfigured: 'Configurada (oculta por seguridad)',
    webhookSecretMissing: 'No configurada (sin firma HMAC)',
    updatedAtLabel: 'Última actualización',
    demoBanner:
      'Este espacio está marcado como Modo Demo y usa temporalmente credenciales globales de prueba. Podés cargar tus propias credenciales cuando quieras pasar a producción.',
    unconfiguredBanner:
      'Mientras no cargues tu Access Token en el paso 01, tus clientes verán los pagos online deshabilitados y deberán coordinar por contacto.',
    securityNote:
      'Por seguridad, las credenciales se almacenan solo en el servidor privado de Firestore y nunca vuelven a enviarse completas al navegador.',
  },
  step1: {
    sectionNum: '01',
    sectionTitle: 'Access Token de Mercado Pago',
    guideWhat:
      'Es la llave privada de tu aplicación en Mercado Pago que conecta tu cuenta con TurnosWeb.',
    guideWhy:
      'Genera los links de pago de la seña (Checkout Pro) y consulta el estado real de cada cobro. Sin esta clave, la agenda no puede recibir pagos online.',
    guideTip:
      'Usá el token de Producción (comienza con APP_USR-) para cobrar dinero real. Usá el de Prueba (TEST-) solo para simulaciones.',
    inputLabel: 'Access Token (Producción APP_USR- o Prueba TEST-)',
    placeholderNew: 'APP_USR-xxxxxxxxxxxxxxxxxxxx o TEST-xxxxxxxxxxxxxxxxxxxx',
    placeholderSaved: (masked: string) =>
      `Guardado (${masked}) — completá solo si necesitás rotarlo`,
    helper:
      'Obtenelo en Mercado Pago Developers -> Tus integraciones -> tu aplicación -> Credenciales de producción (o prueba).',
    warningNote:
      'Nunca compartas este token con terceros. Si reemplazás un token activo por uno inválido o de otra cuenta, los nuevos pagos fallarán de inmediato.',
  },
  step2: {
    sectionNum: '02',
    sectionTitle: 'URL de Webhook dedicada',
    guideWhat:
      'Es la dirección web exclusiva de tu negocio adonde Mercado Pago envía un aviso automático apenas se acredita un pago.',
    guideWhy:
      'TurnosWeb ya incluye esta dirección en cada cobro, pero registrarla manualmente en Mercado Pago Developers garantiza que el turno se confirme incluso si el cliente cierra la ventana tras pagar, y te habilita la Clave Secreta del paso 03.',
    urlLabel: 'URL del Webhook para este negocio (solo lectura)',
    copyButton: 'Copiar URL',
    copiedButton: 'Copiada',
    stepsTitle: 'Cómo configurarla en Mercado Pago Developers:',
    steps: [
      'Ingresá a Mercado Pago Developers (mercadopago.com.ar/developers) y abrí tu aplicación.',
      'Entrá a Webhooks -> Configurar notificaciones, pegá la URL de arriba en "URL de producción" y tildá el evento Pagos (payment).',
      'Guardá la configuración en Mercado Pago y copiá la Clave secreta que te muestra para pegarla en el paso 03.',
    ],
  },
  step3: {
    sectionNum: '03',
    sectionTitle: 'Clave Secreta de Webhook (x-signature)',
    guideWhat:
      'Es una contraseña privada generada por Mercado Pago al guardar la URL de Webhook del paso 02.',
    guideWhy:
      'Permite comprobar criptográficamente (firma HMAC x-signature) que cada notificación de pago proviene realmente de Mercado Pago. Si no la cargás, los pagos siguen funcionando consultando la API oficial, pero con menor protección contra avisos falsificados.',
    inputLabel: 'Webhook Secret (x-signature)',
    placeholderNew: 'Pegá aquí la clave secreta generada por Mercado Pago',
    placeholderSaved: 'Clave guardada — completá solo si necesitás reemplazarla',
    helper:
      'La encontrás en Mercado Pago Developers -> Webhooks -> Clave secreta (debajo de la URL que pegaste en el paso 02).',
    criticalWarning:
      'Importante: pegá exactamente la clave secreta asociada a la URL del paso 02. Si cargás una clave equivocada o de otra aplicación, el servidor rechazará los avisos automáticos por firma inválida.',
  },
  guideLabels: {
    what: '¿Qué es?',
    why: '¿Para qué sirve y por qué configurarlo?',
    tip: 'Producción vs. Prueba',
  },
  form: {
    showSecretAria: 'Mostrar credencial',
    hideSecretAria: 'Ocultar credencial',
    saveButton: 'Guardar credenciales',
    updateButton: 'Actualizar credenciales',
    noChangesHint: 'Ingresá un nuevo Access Token (paso 01) o Webhook Secret (paso 03) para guardar.',
    lockedFooterHint: 'Desbloqueá la edición arriba para cargar, rotar o quitar credenciales.',
    dangerZoneTitle: 'Zona de peligro',
    dangerZoneDescription:
      'Si quitás tus credenciales propias, los cobros online quedarán deshabilitados de inmediato para tus clientes hasta que vuelvas a cargar un Access Token.',
    clearButton: 'Quitar credenciales propias',
    clearModalTitle: '¿Eliminar las credenciales de Mercado Pago?',
    clearModalMessage:
      'Esta acción eliminará el Access Token y el Webhook Secret guardados para este negocio. Los clientes no podrán pagar señas online hasta que configures nuevas credenciales.',
    clearModalConfirm: 'Sí, eliminar credenciales',
    clearModalCancel: 'Conservar credenciales',
  },
  validation: {
    emptySubmission:
      'Ingresá al menos un nuevo Access Token (paso 01) o un Webhook Secret (paso 03) antes de guardar.',
    invalidAccessToken:
      'El Access Token debe comenzar con APP_USR- o TEST- y no contener espacios.',
    invalidWebhookSecret:
      'El Webhook Secret debe tener entre 8 y 256 caracteres sin espacios.',
  },
  feedback: {
    savedSuccess: 'Credenciales de Mercado Pago guardadas correctamente. La edición volvió a bloquearse por seguridad.',
    clearedSuccess: 'Credenciales propias eliminadas correctamente.',
    loadErrorTitle: 'No se pudo cargar la configuración de cobros',
    loadErrorFallback: 'Ocurrió un error al consultar el estado de Mercado Pago.',
    saveErrorTitle: 'No se pudieron guardar las credenciales',
    saveErrorFallback: 'Verificá los datos ingresados e intentá nuevamente.',
    copyError: 'No se pudo copiar la URL al portapapeles.',
    retryButton: 'Reintentar',
  },
  loader: {
    loadingTitle: 'Cargando configuración de cobros...',
    loadingSubtitle: 'Consultando estado de Mercado Pago en el servidor...',
    savingTitle: 'Guardando credenciales...',
    savingSubtitle: 'Actualizando integración segura de Mercado Pago...',
  },
} as const;
