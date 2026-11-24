import type {
  ServiceItem,
  NewServiceData,
  NewSlotData,
  OwnerInfo,
  PortfolioItem,
  ClientData,
  TenantDoc,
  TenantSlugBootstrapDoc,
  TenantMemberDoc,
  TenantPrivateIntegrationsDoc,
} from '../../src/types';
import {
  DEFAULT_DEMO_SLUG,
  DEFAULT_DEMO_TENANT_ID,
  DEFAULT_TENANT_CURRENCY,
  DEFAULT_TENANT_TIMEZONE,
} from '../../src/config/tenantConstants';

export const createServiceItemFixture = (
  overrides?: Partial<ServiceItem>
): ServiceItem => ({
  id: 'srv-1',
  name: 'Lifting de Pestañas',
  basePrice: 18000,
  durationMinutes: 60,
  extras: [
    {
      id: 'extra-1',
      name: 'Tinte de pestañas',
      price: 3000,
    },
  ],
  description: 'Tratamiento completo con nutrición',
  ...overrides,
});

export const createServiceDataFixture = (
  overrides?: Partial<NewServiceData>
): NewServiceData => ({
  name: 'Lifting de Pestañas',
  description: 'Tratamiento completo con nutrición',
  durationMinutes: 60,
  basePrice: 18000,
  extras: [
    {
      id: 'extra-1',
      name: 'Tinte de pestañas',
      price: 3000,
    },
  ],
  ...overrides,
});

export const createSlotDataFixture = (
  overrides?: Partial<NewSlotData>
): NewSlotData => ({
  datetime: '2026-11-15T14:00:00.000Z',
  depositAmount: 5000,
  serviceName: 'Lifting de Pestañas',
  services: [createServiceItemFixture()],
  estimatedDurationMinutes: 60,
  ...overrides,
});

export const createClientDataFixture = (
  overrides?: Partial<ClientData>
): ClientData => ({
  name: 'Lucía Benítez',
  email: 'lucia.benitez@example.com',
  phone: '+5491123456789',
  notes: 'Primera consulta',
  selectedServices: ['Lifting de Pestañas'],
  selectedService: 'Lifting de Pestañas',
  basePrice: 18000,
  extrasPrice: 3000,
  estimatedPrice: 21000,
  estimatedDurationMinutes: 60,
  estimatedDuration: '1h (60 min)',
  selectedExtras: [
    { id: 'extra-1', name: 'Tinte de pestañas', price: 3000 },
  ],
  ...overrides,
});

export const createOwnerInfoFixture = (
  overrides?: Partial<OwnerInfo>
): OwnerInfo => ({
  name: 'Estudio de Belleza & Estética',
  businessName: 'Estudio de Belleza',
  role: 'Especialista en Belleza y Cuidado Personal',
  description: 'Atención personalizada de primer nivel.',
  pictureUrl: '',
  logoUrl: '',
  instagram: '@turnosweb.estetica',
  phone: '+54 9 11 1234-5678',
  email: 'contacto@turnosweb.com',
  location: 'Buenos Aires, Argentina',
  ...overrides,
});

export const createPortfolioFixture = (
  overrides?: Partial<Omit<PortfolioItem, 'id' | 'createdAt'>>
): Omit<PortfolioItem, 'id' | 'createdAt'> => ({
  title: 'Lifting con Tinte',
  category: 'Pestañas',
  description: 'Resultado antes y después',
  imageUrl: 'https://firebasestorage.googleapis.com/v0/b/turnos-web-eb8b5/o/test.jpg',
  ...overrides,
});

export const createTenantDocFixture = (
  overrides?: Partial<TenantDoc>
): TenantDoc => {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_DEMO_TENANT_ID,
    slug: DEFAULT_DEMO_SLUG,
    name: 'Estudio Demo',
    status: 'active',
    isDemo: true,
    mpConfigured: true,
    timezone: DEFAULT_TENANT_TIMEZONE,
    currency: DEFAULT_TENANT_CURRENCY,
    createdAt: now,
    updatedAt: now,
    createdByUid: 'platform-admin-uid',
    ...overrides,
  };
};

export const createTenantSlugDocFixture = (
  overrides?: Partial<TenantSlugBootstrapDoc>
): TenantSlugBootstrapDoc => {
  const now = new Date().toISOString();
  return {
    tenantId: DEFAULT_DEMO_TENANT_ID,
    slug: DEFAULT_DEMO_SLUG,
    status: 'active',
    redirectToSlug: null,
    timezone: DEFAULT_TENANT_TIMEZONE,
    currency: DEFAULT_TENANT_CURRENCY,
    mpConfigured: true,
    isDemo: true,
    ownerProfile: createOwnerInfoFixture(),
    updatedAt: now,
    ...overrides,
  };
};

export const createTenantMemberFixture = (
  overrides?: Partial<TenantMemberDoc>
): TenantMemberDoc => {
  const now = new Date().toISOString();
  return {
    uid: 'owner-uid',
    email: 'owner@turnosweb.com',
    displayName: 'Dueña del Estudio',
    role: 'owner',
    active: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const createTenantPrivateIntegrationsFixture = (
  overrides?: Partial<TenantPrivateIntegrationsDoc>
): TenantPrivateIntegrationsDoc => ({
  mpAccessToken: 'APP_USR-1234567890-test-token-9876',
  mpWebhookSecret: 'whsec_test_secret_1234',
  mpPublicKey: 'APP_USR-public-key-test',
  maskedAccessToken: 'APP_USR-****-9876',
  updatedAt: new Date().toISOString(),
  updatedByUid: 'owner-uid',
  ...overrides,
});
