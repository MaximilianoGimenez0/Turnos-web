export type SlotStatus = 'available' | 'pending_payment' | 'confirmed' | 'cancelled' | 'conflict' | 'past';

export interface PriceExtra {
  id: string;
  name: string;
  price: number;
}

export interface BookedServiceExtra {
  id: string;
  name: string;
  price: number;
  selected: boolean;
}

export interface BookedServiceItem {
  serviceId: string;
  name: string;
  basePrice: number;
  durationMinutes: number;
  extras: BookedServiceExtra[];
}

export interface ClientData {
  name: string;
  email?: string;
  phone: string;
  notes?: string;
  bookedServices?: BookedServiceItem[];
  selectedRules?: string[];
  selectedService?: string;
  selectedServices?: string[];
  basePrice?: number;
  selectedExtras?: PriceExtra[];
  extrasPrice?: number;
  estimatedDurationMinutes?: number;
  estimatedDuration?: string;
  estimatedPrice?: number;
}

export interface Slot {
  id: string;
  datetime: string;
  serviceName?: string;
  services?: (ServiceItem | string)[];
  totalPrice?: number;
  depositAmount: number;
  status: SlotStatus;
  pastOutcome?: 'completed' | 'cancelled';
  clientData?: ClientData | null;
  expiresAt?: string | null;
  preferenceId?: string | null;
  paymentId?: string | null;
  paidAmount?: number | null;
  paymentStatus?: string | null;
  confirmedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  rules?: string[];
  estimatedDurationMinutes?: number;
  estimatedDuration?: string;
}

export interface NewSlotData {
  datetime: string;
  depositAmount: number;
  serviceName?: string;
  services?: ServiceItem[];
  totalPrice?: number;
  estimatedDurationMinutes?: number;
  estimatedDuration?: string;
}

export interface CreatePreferencePayload {
  slotId: string;
  clientData: ClientData;
}

export interface CreatePreferenceResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string;
}

export interface OwnerInfo {
  name: string;
  businessName?: string;
  role?: string;
  description: string;
  pictureUrl: string;
  logoUrl?: string;
  instagram?: string;
  phone?: string;
  email?: string;
  location?: string;
  updatedAt?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  description?: string;
  imageUrl: string;
  createdAt?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  basePrice: number;
  durationMinutes: number;
  extras?: PriceExtra[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type NewServiceData = Omit<ServiceItem, 'id' | 'createdAt' | 'updatedAt'>;

export interface BookingEmailPayload {
  slotId: string;
  paymentId: string;
  serviceName: string;
  datetime?: string;
  formattedDate?: string;
  formattedTime?: string;
  depositAmount: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientNotes?: string;
  bookedServices?: BookedServiceItem[];
  selectedServices?: string[];
  selectedRules?: string[];
  selectedExtras?: PriceExtra[];
  basePrice?: number;
  extrasPrice?: number;
  estimatedDurationMinutes?: number;
  estimatedDuration?: string;
  estimatedPrice?: number;
  ownerEmail?: string;
}

