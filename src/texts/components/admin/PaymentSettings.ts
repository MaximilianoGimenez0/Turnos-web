export const PAYMENT_SETTINGS_TEXTS = {
  header: {
    title: 'Cobros con Mercado Pago',
    subtitle:
      'Conectá tu cuenta de Mercado Pago para cobrar señas online de forma directa y segura en este negocio.',
    badges: {
      configured: 'Credenciales propias activas',
      demoFallback: 'Modo Demo activo',
      unconfigured: 'Sin configurar',
    },
  },
  progress: {
    title: 'Configuración de cobros',
    readyMessage: 'Tu integración de Mercado Pago está lista para cobrar señas.',
    pendingCompact: 'Faltan credenciales para habilitar el cobro online',
    pendingFooter: 'Completá el Access Token y el secreto de webhook para recibir confirmaciones.',
    saveActionLabel: 'Ir a guardar',
    step1Label: 'Access Token',
    step1Complete: (masked: string) => `Guardado (${masked})`,
    step1Demo: 'Usando respaldo demo',
    step1Pending: 'Pendiente de carga',
    step1Unsaved: 'Listo para guardar',
    step1Error: 'Revisá el formato',
    step2Label: 'Webhook Secret',
    step2Complete: 'Configurado',
    step2Pending: 'Recomendado para validar firmas',
    step2Unsaved: 'Listo para guardar',
    step2Error: 'Revisá el formato',
    step3Label: 'URL de Webhook',
    step3Detail: 'Copiá y pegá esta URL en Mercado Pago Developers',
  },
  status: {
    sectionNum: '01',
    sectionTitle: 'Estado de la integración',
    accessTokenLabel: 'Access Token guardado',
    accessTokenEmpty: 'No cargado',
    accessTokenDemoFallback: 'Respaldo global de demostración',
    webhookSecretLabel: 'Secreto de Webhook (x-signature)',
    webhookSecretConfigured: 'Configurado (oculto por seguridad)',
    webhookSecretMissing: 'No configurado',
    updatedAtLabel: 'Última actualización',
    demoBanner:
      'Este espacio está marcado como Modo Demo y usa temporalmente credenciales globales de respaldo. Podés cargar tus propias credenciales en cualquier momento.',
    unconfiguredBanner:
      'Mientras no cargues tu Access Token de Mercado Pago, tus clientes no podrán iniciar pagos online desde la agenda.',
    securityNote:
      'Por seguridad, tus credenciales se guardan exclusivamente en el servidor y nunca vuelven a enviarse al navegador.',
  },
  webhook: {
    sectionNum: '02',
    sectionTitle: 'URL de Webhook dedicada',
    description:
      'Copiá esta dirección única de tu negocio y configurala en Mercado Pago Developers -> Tus integraciones -> Webhooks (evento: Pagos / payment).',
    urlLabel: 'URL del Webhook para este negocio',
    copyButton: 'Copiar URL',
    copiedButton: 'Copiada',
    steps: [
      'Ingresá a Mercado Pago Developers y seleccioná tu aplicación.',
      'Abrí la sección Webhooks, pegá la URL de arriba y activá el evento de Pagos (payment).',
      'Copiá la clave secreta (x-signature) que genera Mercado Pago y guardala en el formulario de abajo.',
    ],
  },
  form: {
    sectionNum: '03',
    sectionTitle: 'Cargar o rotar credenciales',
    accessTokenLabel: 'Access Token de Producción / Prueba',
    accessTokenPlaceholderNew: 'APP_USR-xxxxxxxxxxxxxxxxxxxx o TEST-xxxxxxxxxxxxxxxxxxxx',
    accessTokenPlaceholderSaved: (masked: string) =>
      `Guardado (${masked}) — ingresá uno nuevo solo para rotarlo`,
    accessTokenHelper:
      'Obtenelo en Mercado Pago Developers -> Credenciales de producción (o prueba). Debe comenzar con APP_USR- o TEST-.',
    webhookSecretLabel: 'Webhook Secret (x-signature)',
    webhookSecretPlaceholderNew: 'Pegá tu clave secreta de webhook',
    webhookSecretPlaceholderSaved: 'Secreto guardado — ingresá uno nuevo solo para reemplazarlo',
    webhookSecretHelper:
      'Clave secreta usada para validar que cada notificación de pago provenga realmente de Mercado Pago.',
    showSecretAria: 'Mostrar credencial',
    hideSecretAria: 'Ocultar credencial',
    saveButton: 'Guardar credenciales',
    updateButton: 'Actualizar credenciales',
    clearButton: 'Quitar credenciales propias',
    clearConfirm:
      '¿Querés eliminar las credenciales propias de Mercado Pago guardadas para este negocio? Los cobros online quedarán deshabilitados hasta que cargues nuevas credenciales.',
    noChangesHint: 'Ingresá un nuevo Access Token o Webhook Secret para actualizar.',
  },
  validation: {
    emptySubmission: 'Ingresá al menos el Access Token o el Webhook Secret antes de guardar.',
    invalidAccessToken:
      'El Access Token debe comenzar con APP_USR- o TEST- y no contener espacios.',
    invalidWebhookSecret:
      'El Webhook Secret debe tener entre 8 y 256 caracteres sin espacios.',
  },
  feedback: {
    savedSuccess: 'Credenciales de Mercado Pago guardadas correctamente.',
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
