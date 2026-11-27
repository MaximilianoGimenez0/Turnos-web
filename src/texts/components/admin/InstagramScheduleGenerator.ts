export const INSTAGRAM_SCHEDULE_GENERATOR_TEXTS = {
  header: {
    title: 'Placa de turnos para Instagram',
    subtitle:
      'Creá una imagen en formato calendario con tus turnos disponibles usando los colores y tipografía de tu marca.',
  },
  controls: {
    periodLabel: 'Período a mostrar',
    periods: {
      day: 'Día',
      week: 'Semana',
      month: 'Mes',
    },
    monthViewLabel: 'Vista mensual',
    monthViews: {
      calendar: 'Calendario',
      list: 'Lista paginada',
    },
    formatLabel: 'Formato',
    formats: {
      story: 'Story (9:16)',
      feed: 'Post (4:5)',
    },
    themeLabel: 'Modo de color',
    themes: {
      light: 'Claro',
      dark: 'Oscuro',
    },
    optionsLabel: 'Detalles en la placa',
    showBrandHeader: 'Mostrar nombre y logo arriba',
    showInstagramHandle: 'Mostrar @Instagram al pie',
    prevPeriodAria: 'Período anterior',
    nextPeriodAria: 'Período siguiente',
    prevPageAria: 'Lámina anterior',
    nextPageAria: 'Lámina siguiente',
  },
  status: {
    availableCount: (count: number) =>
      count === 1 ? '1 turno disponible' : `${count} turnos disponibles`,
    pageIndicator: (current: number, total: number) => `Lámina ${current} de ${total}`,
    noSlotsHint: 'No hay turnos futuros disponibles en este período. Probá avanzar al siguiente o creá nuevos turnos.',
    loadingFullRange: 'Sincronizando turnos del período...',
  },
  actions: {
    downloadPng: 'Descargar PNG',
    sharePng: 'Compartir',
    shareTitle: 'Turnos disponibles',
  },
} as const;
