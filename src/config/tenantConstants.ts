export const DEFAULT_DEMO_SLUG = 'demo';
export const DEFAULT_DEMO_TENANT_ID = 'tnt_demo';
export const DEFAULT_TENANT_TIMEZONE = 'America/Argentina/Buenos_Aires';
export const DEFAULT_TENANT_CURRENCY = 'ARS' as const;

export const TENANT_SLUG_MIN_LENGTH = 3;
export const TENANT_SLUG_MAX_LENGTH = 40;

export const TENANT_ID_REGEX = /^tnt_[a-z0-9]{4,32}$/;
export const TENANT_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const RESERVED_TENANT_SLUGS: ReadonlySet<string> = new Set([
  'admin',
  'superadmin',
  'login',
  'logout',
  'api',
  'payment',
  'about',
  'prices',
  'ayuda',
  'help',
  'assets',
  'default',
  'artifacts',
  'auth',
  'static',
  'app',
  'www',
  'root',
  'system',
  'null',
  'undefined',
]);
