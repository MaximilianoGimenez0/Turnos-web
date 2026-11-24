export const LOGIN_TEXTS = {
  header: {
    title: 'Acceso de Administración',
    subtitle: 'Iniciá sesión con tu cuenta',
    subtitleWithBusiness: (businessName: string) => `Panel de gestión · ${businessName}`,
  },
  form: {
    emailLabel: 'Correo Electrónico',
    emailPlaceholder: 'admin@turnosweb.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: '••••••••',
    submitButton: 'Iniciar Sesión',
  },
  demo: {
    badge: 'Modo Demo',
    description: 'Entorno de demostración interactivo. Ingresá con las credenciales de prueba habilitadas para este espacio.',
  },
  validation: {
    invalidEmailTitle: 'Correo Inválido',
    invalidEmailMessage: 'Por favor ingresá un correo electrónico válido.',
    requiredPasswordTitle: 'Contraseña Requerida',
    requiredPasswordMessage: 'Por favor ingresá tu contraseña de administración.',
    passwordFieldName: 'La contraseña',
  },
  loader: {
    title: 'Iniciando Sesión...',
    subtitle: 'Verificando credenciales...',
  },
  errors: {
    authTitle: 'Error de Autenticación',
    authFallback: 'Credenciales inválidas o error de autenticación.',
    logError: 'Error al iniciar sesión:',
  },
} as const;
