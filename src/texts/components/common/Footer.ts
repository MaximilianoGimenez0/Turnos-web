export const FOOTER_TEXTS = {
  brandAriaLabel: 'Ir a inicio',
  badges: {
    mpProtected: 'Pagos protegidos por Mercado Pago',
    sslEncrypted: 'Conexión cifrada SSL',
  },
  developer: {
    prefix: 'Desarrollado por',
    socialAriaLabel: 'Redes del desarrollador',
    githubTitle: (name: string) => `GitHub de ${name}`,
    githubAriaLabel: (name: string) => `Perfil de GitHub de ${name}`,
    githubLabel: 'GitHub',
    linkedinTitle: (name: string) => `LinkedIn de ${name}`,
    linkedinAriaLabel: (name: string) => `Perfil de LinkedIn de ${name}`,
    linkedinLabel: 'LinkedIn',
  },
  copyright: (year: number, appName: string) =>
    `© ${year} ${appName}. Todos los derechos reservados.`,
} as const;
