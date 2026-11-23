export const FORM_PROGRESS_TRACKER_TEXTS = {
  optionalBadge: 'Opcional',
  desktopNavigationHint: 'Clickeá un paso para ir y editar',
  mobileNavigationHint: 'Tocá un paso para ir y editar',
  minimizeAria: 'Minimizar panel de progreso',
  expandAria: 'Expandir panel de progreso',
  toggleDetailsAria: (expanded: boolean) =>
    expanded ? 'Ocultar detalle de progreso' : 'Ver detalle de progreso',
  progressAriaLabel: (title: string, completed: number, total: number) =>
    `${title}: ${completed} de ${total} pasos obligatorios completos`,
  missingSingle: (label: string) => `Falta: ${label}`,
  missingMultiple: (count: number) => `Faltan ${count} pasos`,
  remainingFooterSingle: (label: string) => `Falta completar: ${label}`,
  remainingFooterMultiple: (count: number) => `Faltan ${count} pasos obligatorios`,
  reviewErrorSingle: (label: string) => `Revisá: ${label}`,
  reviewErrorFooter: (count: number) =>
    count === 1 ? 'Hay 1 punto para revisar' : `Hay ${count} puntos para revisar`,
  returnToFormButton: 'Volver al formulario',
  goToSectionAria: (label: string, statusLabel: string, detail: string) =>
    `${label} — ${statusLabel}. ${detail}. Ir a esta sección`,
  statusLabels: {
    complete: 'Completo',
    partial: 'Incompleto',
    pending: 'Pendiente',
    error: 'Requiere revisión',
    optional_empty: 'Opcional',
    optional_done: 'Opcional agregado',
  },
} as const;
