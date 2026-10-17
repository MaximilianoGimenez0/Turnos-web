export const PORTFOLIO_MANAGER_TEXTS = {
  header: {
    title: 'Subir Trabajo a la Galería',
    subtitle:
      'Sube fotos de tus mejores tratamientos para mostrarlos en el inicio de la aplicación.',
  },
  dropzone: {
    previewAlt: 'Vista previa',
    promptClick: 'Haz clic para elegir foto',
    promptDrag: 'o arrastra aquí',
    formatHelp: 'JPG, PNG o WebP (Máx. 10 MB)',
  },
  fields: {
    titleLabel: 'Título del Tratamiento',
    titlePlaceholder: 'Ej. Lifting de Pestañas Deluxe',
    titleFieldName: 'El título del trabajo',
    categoryLabel: 'Categoría / Etiqueta',
    categoryPlaceholder: 'Ej. Pestañas, Uñas, Facial...',
    categoryFieldName: 'La categoría o etiqueta',
    descriptionLabel: 'Descripción Breve (opcional)',
    descriptionPlaceholder:
      'Ej. Realce natural con tinte de queratina y nutrición profunda',
    uploadingButton: 'Subiendo imagen a Storage...',
    submitButton: 'Publicar en Galería',
  },
  list: {
    title: (count: number) => `Trabajos Publicados (${count})`,
    empty:
      'Aún no has publicado ningún trabajo en la galería. ¡Sube el primero arriba!',
  },
  alerts: {
    invalidFileTitle: 'Archivo No Válido',
    invalidFileFallback:
      'Por favor selecciona un formato de imagen válido (JPG, PNG, WebP) menor a 10MB.',
    imageRequiredTitle: 'Imagen Requerida',
    imageRequiredFallback: 'Debes seleccionar una imagen para subir.',
    titleRequiredTitle: 'Título Requerido',
    titleRequiredFallback: 'Debes ingresar un título para el trabajo.',
    categoryRequiredTitle: 'Categoría Requerida',
    categoryRequiredFallback: 'Debes ingresar una categoría para el trabajo.',
    uploadSuccess: '¡Trabajo agregado a la galería y guardado en Storage!',
    uploadErrorTitle: 'Error al Subir',
    uploadErrorFallback: 'Error al procesar la subida del trabajo.',
    confirmDelete: '¿Seguro que deseas eliminar este trabajo del portfolio?',
    deleteSuccess: 'Trabajo eliminado correctamente.',
    deleteErrorTitle: 'Error al Eliminar',
    deleteErrorMessage: 'No se pudo eliminar el trabajo de la galería.',
  },
  loader: {
    title: 'Subiendo a la Galería...',
    subtitle: 'Optimizando imagen y guardando registro en Firestore...',
  },
  logs: {
    addError: 'Error al agregar trabajo:',
    deleteError: 'Error al eliminar trabajo:',
  },
} as const;
