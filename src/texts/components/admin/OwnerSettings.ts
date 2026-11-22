export const OWNER_SETTINGS_TEXTS = {
  header: {
    title: 'Identidad de la Estética & Perfil Profesional',
    subtitle:
      'Podés actualizar y guardar solo los campos o imágenes que quieras. Los campos sin guardar seguirán mostrando los datos de ejemplo.',
    usingAllDefaultsNotice:
      'Actualmente toda la web usa datos e imágenes de ejemplo porque todavía no guardaste ningún campo. Podés editar y guardar solo lo que necesites.',
    usingPartialDefaultsNotice: (
      defaultTextCount: number,
      totalTextCount: number,
      defaultImageCount: number,
      totalImageCount: number
    ) => {
      const parts: string[] = [];
      if (defaultTextCount > 0) {
        parts.push(
          `${defaultTextCount} de ${totalTextCount} ${defaultTextCount === 1 ? 'campo de texto' : 'campos de texto'}`
        );
      }
      if (defaultImageCount > 0) {
        parts.push(
          `${defaultImageCount} de ${totalImageCount} ${defaultImageCount === 1 ? 'imagen' : 'imágenes'}`
        );
      }
      return `Todavía hay ${parts.join(' y ')} en modo ejemplo (sin guardar en la base de datos). Podés actualizar solo los campos que quieras.`;
    },
    defaultImageBadge: 'Usando imagen de ejemplo · No guardada',
    defaultFieldBadge: 'Usando ejemplo · No guardado',
    unsavedFieldBadge: 'Sin guardar',
    willRestoreDefaultHint: 'Al guardar, este campo volverá a mostrar el valor de ejemplo.',
    restoreDefaultImage: 'Usar imagen de ejemplo',
    restoreFieldAction: 'Usar ejemplo',
    restoredImageSuccess: 'Se restauró la imagen de ejemplo correctamente.',
  },
  logo: {
    cardTitle: 'Logo del Estudio',
    alt: 'Logo estética',
    uploadingText: 'Subiendo Logo a Storage...',
    buttonText: 'Subir / Cambiar Logo',
    helpText:
      'Se muestra en la barra superior. PNG, JPG, WebP o SVG (Máx. 5 MB).',
    successMsg: '¡Logo de la estética actualizado exitosamente en Storage y Navbar!',
  },
  profilePicture: {
    cardTitle: 'Foto de Perfil',
    uploadingText: 'Subiendo a Storage...',
    buttonText: 'Subir Foto de Perfil',
    helpText: 'Retrato para la sección "Sobre Mí". PNG, JPG o WebP (Máx. 5 MB).',
    successMsg: '¡Foto de perfil actualizada exitosamente en Storage!',
  },
  heroPicture: {
    cardTitle: 'Portada de Inicio',
    alt: 'Imagen principal del estudio',
    uploadingText: 'Subiendo portada...',
    buttonText: 'Subir / Cambiar Portada',
    helpText: 'Imagen principal de bienvenida en Inicio. PNG, JPG o WebP (Máx. 5 MB).',
    successMsg: 'Foto de portada actualizada en Storage.',
  },
  inputs: {
    businessNameLabel: 'Nombre de la Estética / Negocio (Navbar)',
    businessNamePlaceholder: 'Ej. Glow Beauty Studio',
    businessNameField: 'El nombre del negocio / estética',
    nameLabel: 'Nombre del Profesional / Autora',
    namePlaceholder: 'Ej. Dra. Florencia Gómez',
    nameField: 'El nombre del profesional / autora',
    roleLabel: 'Rol / Especialidad',
    rolePlaceholder: 'Ej. Especialista en Estética & Belleza',
    roleField: 'El rol / especialidad',
    instagramLabel: 'Instagram',
    instagramPlaceholder: '@tu_estetica',
    instagramField: 'Instagram',
    phoneLabel: 'WhatsApp / Teléfono',
    phonePlaceholder: '+54 9 11 1234-5678',
    emailLabel: 'Email de Contacto',
    emailPlaceholder: 'contacto@estetica.com',
    locationLabel: 'Ubicación / Dirección',
    locationPlaceholder: 'Ej. Av. Santa Fe 1234, Palermo, CABA',
    locationField: 'La ubicación / dirección',
    bioLabel: 'Descripción / Biografía Profesional',
    bioPlaceholder:
      'Cuenta la historia del centro de estética, tus tratamientos destacados y trayectoria...',
    bioField: 'La descripción / biografía profesional',
    savingButton: 'Guardando...',
    saveButton: 'Guardar Cambios',
    saveChangesCount: (count: number) =>
      count === 1 ? 'Guardar 1 cambio' : `Guardar ${count} cambios`,
    discardButton: 'Descartar cambios',
    noChangesHint: 'Sin cambios pendientes por guardar',
    charCount: (current: number, max: number) => `${current} / ${max}`,
  },
  alerts: {
    invalidLogoTitle: 'Logo Inválido',
    invalidLogoFallback:
      'Por favor selecciona un formato de imagen válido (JPG, PNG, WebP o SVG) menor a 10 MB.',
    invalidProfileTitle: 'Foto de Perfil Inválida',
    invalidProfileFallback:
      'Por favor selecciona un formato de imagen válido (JPG, PNG o WebP) menor a 10 MB.',
    invalidHeroTitle: 'Imagen de portada inválida',
    invalidHeroFallback:
      'Por favor selecciona un formato de imagen válido (JPG, PNG o WebP) menor a 10 MB.',
    saveSuccess: '¡Cambios guardados con éxito!',
    saveErrorTitle: 'Error al Guardar',
    saveErrorFallback: 'Error al guardar la información en la base de datos.',
    uploadLogoErrorTitle: 'Error al Subir Logo',
    uploadLogoErrorFallback: 'Error al subir el archivo de logo a Firebase Storage.',
    uploadProfileErrorTitle: 'Error al Subir Foto',
    uploadProfileErrorFallback: 'Error al subir la imagen de perfil a Firebase Storage.',
    uploadHeroErrorTitle: 'Error al subir portada',
    uploadHeroErrorFallback: 'Error al subir la imagen de portada a Firebase Storage.',
  },
  loaders: {
    uploadingProfile: 'Subiendo Foto de Perfil...',
    uploadingHero: 'Subiendo Foto de Portada...',
    uploadingLogo: 'Subiendo Logo de la Marca...',
    savingSettings: 'Guardando Configuración...',
    subtitle: 'Procesando y sincronizando con la base de datos...',
  },
  logs: {
    uploadLogoError: 'Error al subir logo:',
    uploadProfileError: 'Error al subir foto de perfil:',
    uploadHeroError: 'Error al subir foto de portada:',
    saveError: 'Error al guardar datos:',
  },
} as const;
