export const TENANT_STATUS_TEXTS = {
  loading: {
    title: 'Cargando agenda del estudio...',
    subtitle: 'Preparando disponibilidad, servicios e información del salón.',
  },
  notFound: {
    badge: 'Error 404 · Agenda no encontrada',
    title: 'No encontramos este espacio de reservas',
    description:
      'El enlace que ingresaste no corresponde a ningún estudio activo o pudo haber cambiado de dirección.',
    slugLabel: 'Enlace consultado',
    demoCta: 'Ir a la agenda demo',
    retryCta: 'Reintentar',
    superAdminCta: 'Configurar desde SuperAdmin',
    hint: 'Verificá la dirección compartida por el estudio o explorá nuestra demostración interactiva.',
    demoHint:
      'La agenda de demostración (/demo) todavía no está habilitada. Si administrás la plataforma, podés crearla desde /superadmin.',
  },
  suspended: {
    badge: 'Agenda pausada temporalmente',
    title: 'Esta agenda no recibe reservas en este momento',
    descriptionWithBusiness: (businessName: string) =>
      `${businessName} pausó temporalmente su agenda online. Si ya tenés un turno confirmado o necesitás coordinar una cita, contactá directamente al estudio.`,
    descriptionGeneric:
      'Este estudio pausó temporalmente su agenda online. Si ya tenés un turno confirmado o necesitás coordinar una cita, contactá directamente con el local.',
    notice: 'Los turnos online volverán a habilitarse en cuanto el estudio reactive su agenda.',
    demoCta: 'Ver agenda demo',
  },
  error: {
    badge: 'Problema de conexión',
    title: 'No pudimos cargar la agenda del estudio',
    description:
      'Ocurrió un inconveniente temporal al consultar la información del negocio. Intentá nuevamente en unos segundos.',
    retryButton: 'Reintentar',
    demoCta: 'Ir a la agenda demo',
  },
  unauthorized: {
    badge: 'Acceso restringido',
    title: 'No tenés permisos sobre este negocio',
    description: (businessName: string, slug: string) =>
      `Tu sesión actual no tiene acceso al panel de administración de ${businessName} (/${slug}).`,
    accountLabel: 'Sesión activa',
    otherTenantsTitle: 'Tus espacios disponibles',
    roleLabels: {
      owner: 'Dueño',
      staff: 'Staff',
    },
    switchAccountCta: 'Cerrar sesión e ingresar con otra cuenta',
    backToPublicCta: 'Volver a la agenda pública',
  },
} as const;
