export const PORTFOLIO_MANAGER_TEXTS = {
  header: {
    title: 'Subir Trabajo a la Galería',
    subtitle:
      'Subí fotos de tus mejores trabajos para mostrarlos en tu galería pública.',
  },
  dropzone: {
    previewAlt: 'Vista previa',
    promptClick: 'Hacé clic para elegir una foto',
    promptDrag: 'o arrastrala acá',
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
    uploadingButton: 'Subiendo imagen...',
    submitButton: 'Publicar en Galería',
  },
  list: {
    title: (count: number) => `Trabajos Publicados (${count})`,
    empty:
      'Todavía no publicaste ningún trabajo en la galería. ¡Subí el primero arriba!',
  },
  alerts: {
    invalidFileTitle: 'Archivo No Válido',
    invalidFileFallback:
      'Elegí un formato de imagen válido (JPG, PNG o WebP) de hasta 10 MB.',
    imageRequiredTitle: 'Imagen Requerida',
    imageRequiredFallback: 'Tenés que elegir una imagen para subir.',
    titleRequiredTitle: 'Título Requerido',
    titleRequiredFallback: 'Ingresá un título para el trabajo.',
    categoryRequiredTitle: 'Categoría Requerida',
    categoryRequiredFallback: 'Ingresá una categoría para el trabajo.',
    uploadSuccess: '¡Trabajo agregado a la galería correctamente!',
    uploadErrorTitle: 'Error al Subir',
    uploadErrorFallback: 'Error al procesar la subida del trabajo.',
    confirmDelete: '¿Seguro que querés eliminar este trabajo de tu galería?',
    deleteSuccess: 'Trabajo eliminado correctamente.',
    deleteErrorTitle: 'Error al Eliminar',
    deleteErrorMessage: 'No se pudo eliminar el trabajo de la galería.',
  },
  loader: {
    title: 'Subiendo a la Galería...',
    subtitle: 'Optimizando la imagen y guardándola en tu galería...',
  },
  logs: {
    addError: 'Error al agregar trabajo:',
    deleteError: 'Error al eliminar trabajo:',
  },
} as const;
