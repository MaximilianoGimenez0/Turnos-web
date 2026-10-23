import type {
  ServiceItem,
  NewServiceData,
  NewSlotData,
  OwnerInfo,
  PortfolioItem,
  ClientData,
} from '../../src/types';

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
