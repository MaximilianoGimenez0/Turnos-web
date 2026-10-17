export const SERVICES_MANAGER_TEXTS = {
  header: {
    editTitle: 'Modificar Servicio',
    createTitle: 'Crear Nuevo Servicio',
    subtitle:
      'Configurá el servicio con su precio base, duración estimada de atención y los extras u opciones adicionales disponibles.',
  },
  form: {
    nameLabel: 'Nombre del Servicio',
    namePlaceholder: 'Ej: Lifting de Pestañas, Kapping Gel, Perfilado...',
    nameField: 'El nombre del servicio',
    basePriceLabel: 'Precio Base ($)',
    basePricePlaceholder: 'Ej: 18000',
    basePriceField: 'El precio base',
    basePriceHelper: 'Permitido entre $0 y $5.000.000',
    durationLabel: 'Tiempo Estimado (minutos)',
    durationPlaceholder: 'Ej: 60',
    durationField: 'El tiempo estimado',
    durationHelper: 'Ej: 30, 45, 60, 90, 120 min',
    descriptionLabel: 'Descripción o detalle breve (opcional)',
    descriptionPlaceholder:
      'Ej: Incluye diagnóstico previo, retiro básico y finalización con serum hidratante...',
    cancelEditButton: 'Cancelar Edición',
    saveChangesButton: 'Guardar Cambios',
    createServiceButton: 'Crear Servicio',
  },
  extrasBuilder: {
    title: (count: number) => `Extras y Adicionales (${count})`,
    subtitle: 'Opciones adicionales que el cliente puede sumar al servicio base',
    nameLabel: 'Nombre del Extra',
    namePlaceholder: 'Ej: Tinte, Nail Art, Spa de manos...',
    priceLabel: 'Precio del Extra ($)',
    pricePlaceholder: 'Ej: 3000',
    priceField: 'El precio del extra',
    addButton: 'Agregar Extra',
    removeExtraTitle: (name: string) => `Eliminar extra "${name}"`,
    removeExtraAriaLabel: (name: string) => `Eliminar extra "${name}"`,
  },
  catalog: {
    title: 'Catálogo de Servicios',
    subtitle:
      'Servicios activos con su precio base, duración estimada y extras disponibles.',
    statsTotal: (count: number) =>
      `${count} ${count === 1 ? 'servicio' : 'servicios en total'}`,
    emptyTitle: 'No hay servicios configurados aún',
    emptyText:
      'Utilizá el formulario superior para definir los servicios, precios base, duración y extras opcionales.',
    basePriceLabel: 'Precio base',
    durationUnit: 'min',
    availableExtras: (count: number) => `Extras disponibles (${count})`,
    noExtras: 'Sin adicionales configurados',
    extrasCount: (count: number) =>
      `${count} ${count === 1 ? 'extra' : 'extras'}`,
    editButton: 'Editar',
    editTitle: (name: string) => `Modificar servicio "${name}"`,
    deleteTitle: (name: string) => `Eliminar servicio "${name}"`,
    deleteConfirm: (name: string) =>
      `¿Estás seguro de que deseas eliminar el servicio "${name}" del catálogo?`,
  },
  loaders: {
    saving: 'Guardando cambios...',
    creating: 'Creando servicio...',
    deleting: 'Eliminando servicio...',
    loadingCatalogTitle: 'Cargando catálogo de servicios...',
    loadingCatalogSubtitle: 'Sincronizando servicios desde Firestore...',
    syncSubtitle: 'Sincronizando cambios en Firestore...',
  },
  alerts: {
    connectionErrorTitle: 'Error de Conexión',
    connectionErrorMessage:
      'Error al conectar con la base de datos de servicios en Firestore.',
    extraNameRequiredTitle: 'Nombre de Extra Requerido',
    extraNameRequiredMessage:
      'Debes ingresar un nombre para el extra o adicional.',
    extraPriceInvalidTitle: 'Precio de Extra Inválido',
    extraPriceInvalidMessage:
      'El precio del extra debe ser un número entero entre 0 y 5.000.000.',
    nameRequiredTitle: 'Nombre Requerido',
    nameRequiredMessage: 'Ingresa el nombre del servicio.',
    basePriceInvalidTitle: 'Precio Base Inválido',
    basePriceInvalidMessage:
      'El precio base debe ser un número entero entre 0 y 5.000.000.',
    durationInvalidTitle: 'Duración Inválida',
    durationInvalidMessage:
      'El tiempo estimado debe ser un número entero entre 5 y 480 minutos.',
    saveErrorTitle: 'Error al Guardar',
    saveErrorFallback: 'Ocurrió un error al guardar el servicio.',
    deleteErrorTitle: 'Error al Eliminar',
    deleteErrorMessage:
      'No se pudo eliminar el servicio seleccionado de la base de datos.',
  },
  logs: {
    loadServicesError: 'Error al cargar servicios:',
    saveServiceError: 'Error al guardar servicio:',
    deleteServiceError: 'Error al eliminar servicio:',
  },
} as const;
