export const SERVICES_MANAGER_TEXTS = {
  header: {
    editTitle: 'Modificar servicio',
    createTitle: 'Crear nuevo servicio',
    subtitle:
      'Definí el precio base, la duración estimada y los adicionales opcionales de cada tratamiento',
  },
  form: {
    nameLabel: 'Nombre del servicio',
    namePlaceholder: 'Ej: Lifting de pestañas, Kapping gel, Perfilado',
    nameField: 'El nombre del servicio',
    basePriceLabel: 'Precio base ($)',
    basePricePlaceholder: 'Ej: 18000',
    basePriceField: 'El precio base',
    basePriceHelper: 'Entre $0 y $5.000.000',
    durationLabel: 'Duración estimada (minutos)',
    durationPlaceholder: 'Ej: 60',
    durationField: 'El tiempo estimado',
    durationHelper: 'Ej: 30, 45, 60, 90 o 120 min',
    descriptionLabel: 'Detalle breve (opcional)',
    descriptionPlaceholder:
      'Ej: Incluye diagnóstico previo, retiro básico y serum hidratante',
    cancelEditButton: 'Cancelar edición',
    saveChangesButton: 'Guardar cambios',
    createServiceButton: 'Crear servicio',
  },
  extrasBuilder: {
    title: (count: number) => `Adicionales opcionales (${count})`,
    subtitle: 'Opcionales que la clienta puede sumar al reservar',
    nameLabel: 'Nombre del adicional',
    namePlaceholder: 'Ej: Tinte, Nail art, Spa de manos',
    priceLabel: 'Precio ($)',
    pricePlaceholder: 'Ej: 3000',
    priceField: 'El precio del adicional',
    addButton: 'Agregar',
    removeExtraTitle: (name: string) => `Eliminar adicional "${name}"`,
    removeExtraAriaLabel: (name: string) => `Eliminar adicional "${name}"`,
  },
  catalog: {
    title: 'Catálogo de servicios',
    subtitle:
      'Tratamientos activos con su precio base, duración y adicionales',
    statsTotal: (count: number) =>
      `${count} ${count === 1 ? 'servicio' : 'servicios'}`,
    emptyTitle: 'No hay servicios configurados',
    emptyText:
      'Usá el formulario superior para cargar tus servicios, precios base, duración y adicionales',
    basePriceLabel: 'Precio base',
    durationUnit: 'min',
    availableExtras: (count: number) => `Adicionales (${count})`,
    noExtras: 'Sin adicionales configurados',
    editingTag: 'En edición',
    editButton: 'Editar',
    editTitle: (name: string) => `Modificar servicio "${name}"`,
    deleteTitle: (name: string) => `Eliminar servicio "${name}"`,
    deleteConfirm: (name: string) =>
      `¿Estás seguro de que deseas eliminar el servicio "${name}" del catálogo?`,
  },
  loaders: {
    saving: 'Guardando cambios',
    creating: 'Creando servicio',
    deleting: 'Eliminando servicio',
    loadingCatalogTitle: 'Cargando catálogo de servicios',
    loadingCatalogSubtitle: 'Sincronizando servicios desde Firestore',
    syncSubtitle: 'Sincronizando cambios en Firestore',
  },
  alerts: {
    connectionErrorTitle: 'Error de conexión',
    connectionErrorMessage:
      'Error al conectar con la base de datos de servicios en Firestore.',
    extraNameRequiredTitle: 'Nombre requerido',
    extraNameRequiredMessage:
      'Ingresá un nombre para el adicional.',
    extraPriceInvalidTitle: 'Precio inválido',
    extraPriceInvalidMessage:
      'El precio del adicional debe ser un número entero entre 0 y 5.000.000.',
    nameRequiredTitle: 'Nombre requerido',
    nameRequiredMessage: 'Ingresá el nombre del servicio.',
    basePriceInvalidTitle: 'Precio base inválido',
    basePriceInvalidMessage:
      'El precio base debe ser un número entero entre 0 y 5.000.000.',
    durationInvalidTitle: 'Duración inválida',
    durationInvalidMessage:
      'El tiempo estimado debe ser un número entero entre 5 y 480 minutos.',
    saveErrorTitle: 'Error al guardar',
    saveErrorFallback: 'Ocurrió un error al guardar el servicio.',
    deleteErrorTitle: 'Error al eliminar',
    deleteErrorMessage:
      'No se pudo eliminar el servicio seleccionado de la base de datos.',
  },
  logs: {
    loadServicesError: 'Error al cargar servicios:',
    saveServiceError: 'Error al guardar servicio:',
    deleteServiceError: 'Error al eliminar servicio:',
  },
} as const;
