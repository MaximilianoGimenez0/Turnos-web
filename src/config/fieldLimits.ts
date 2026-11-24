export interface TextFieldLimit {
  min?: number;
  max: number;
}

export const FIELD_LIMITS = {
  owner: {
    businessName: { min: 2, max: 60 },
    name: { min: 2, max: 60 },
    role: { min: 2, max: 80 },
    instagram: { min: 2, max: 60 },
    phone: { min: 6, max: 25 },
    email: { max: 120 },
    location: { min: 3, max: 120 },
    description: { min: 10, max: 1500 },
  },
  service: {
    name: { min: 2, max: 80 },
    description: { min: 0, max: 240 },
    extraName: { min: 2, max: 60 },
  },
  portfolio: {
    title: { min: 2, max: 80 },
    category: { min: 2, max: 40 },
    description: { min: 0, max: 240 },
  },
  slot: {
    customServiceName: { min: 2, max: 100 },
  },
  booking: {
    name: { min: 2, max: 80 },
    email: { max: 120 },
    phone: { min: 6, max: 25 },
    notes: { min: 0, max: 300 },
  },
  auth: {
    email: { max: 120 },
    password: { min: 6, max: 100 },
  },
  search: {
    query: { max: 100 },
  },
  hero: {
    titlePrefix: { min: 0, max: 45 },
    titleHighlight: { min: 0, max: 35 },
    subtitle: { min: 0, max: 150 },
  },
} as const;
