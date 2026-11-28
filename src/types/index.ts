export type SlotStatus = 'available' | 'pending_payment' | 'confirmed' | 'cancelled' | 'conflict' | 'past';

export type TenantStatus = 'active' | 'suspended';
export type TenantRole = 'owner' | 'staff';
export type TenantCurrency = 'ARS';

export type PalettePresetId =
  | 'rose-editorial'
  | 'blush-peony'
  | 'burgundy-noir'
  | 'plum-velvet'
  | 'terracotta-warm'
  | 'champagne-bronze'
  | 'cocoa-mocha'
  | 'amber-honey'
  | 'sage-botanical'
  | 'eucalyptus-mist'
  | 'olive-grove'
  | 'ocean-slate'
  | 'noir-minimal'
  | 'midnight-indigo'
  | 'lavender-silk'
  | 'crimson-studio'
  | 'coral-sunset'
  | 'electric-cobalt'
  | 'emerald-jewel'
  | 'orchid-vivid'
  | 'clinical-teal'
  | 'nordic-blue'
  | 'pilates-sand'
  | 'titanium-slate';

export type SurfaceTemperature = 'warm' | 'neutral' | 'cool' | 'paper' | 'blush' | 'sage';
export type FontPairingId =
  | 'editorial'
  | 'classic'
  | 'modern'
  | 'minimal'
  | 'atelier'
  | 'clinical'
  | 'expressive'
  | 'friendly';
export type ShapePresetId = 'sharp' | 'soft' | 'rounded' | 'pill';
export type SurfaceStyleId = 'bordered' | 'elevated' | 'flat' | 'glass';
export type ButtonStyleId = 'solid' | 'soft' | 'outline';
export type BackgroundStyleId =
  | 'solid'
  | 'soft-gradient'
  | 'mesh-glow'
  | 'dots'
  | 'grid'
  | 'diagonal';
export type BackgroundIntensity = 'subtle' | 'balanced' | 'vivid';
export type DensityScaleId = 'compact' | 'comfortable' | 'spacious';
export type TextScaleId = 'sm' | 'md' | 'lg';
export type DefaultThemeMode = 'light' | 'dark' | 'system';

export type HeroLayoutId =
  | 'split-right'
  | 'split-left'
  | 'centered'
  | 'overlay-banner'
  | 'minimal-compact';

export type HeroImageShapeId =
  | 'portrait'
  | 'arch'
  | 'circle'
  | 'square'
  | 'landscape'
  | 'organic';

export type HeroImageFrameId =
  | 'editorial-mat'
  | 'minimal-border'
  | 'double-line'
  | 'offset-accent'
  | 'polaroid'
  | 'floating-caption';

export type HeroCopyPresetId =
  | 'editorial-beauty'
  | 'modern-studio'
  | 'wellness-calm'
  | 'barber-craft'
  | 'clinical-trust'
  | 'boutique-luxury'
  | 'direct-action'
  | 'warm-welcome';

export type NavbarStyleId = 'floating' | 'solid' | 'centered';
export type LogoShapeId = 'rounded' | 'square' | 'circle' | 'frameless';
export type PortfolioLayoutId = 'grid' | 'bento' | 'carousel';
export type MotionPresetId = 'fluid' | 'subtle' | 'none';
export type HeroHighlightStyleId = 'accent' | 'italic' | 'underline';
export type SlotCardStyleId = 'classic' | 'accent-bar' | 'compact';

export interface TenantAppearanceConfig {
  palettePreset: PalettePresetId;
  customPrimaryHex?: string | null;
  customAccentHex?: string | null;
  surfaceTemperature?: SurfaceTemperature | null;
  customBackgroundHex?: string | null;
  backgroundStyle: BackgroundStyleId;
  backgroundIntensity: BackgroundIntensity;
  defaultMode: DefaultThemeMode;
  allowVisitorModeToggle: boolean;
  fontPairing: FontPairingId;
  shapePreset: ShapePresetId;
  surfaceStyle: SurfaceStyleId;
  buttonStyle: ButtonStyleId;
  density: DensityScaleId;
  textScale: TextScaleId;
  heroLayout: HeroLayoutId;
  heroImageShape: HeroImageShapeId;
  heroImageFrame: HeroImageFrameId;
  heroCopyPreset: HeroCopyPresetId;
  heroCustomTitlePrefix?: string | null;
  heroCustomTitleHighlight?: string | null;
  heroCustomSubtitle?: string | null;
  heroShowCaption: boolean;
  navbarStyle: NavbarStyleId;
  logoShape: LogoShapeId;
  portfolioLayout: PortfolioLayoutId;
  heroShowTrustPills: boolean;
  showFloatingWhatsApp: boolean;
  motionPreset: MotionPresetId;
  heroHighlightStyle: HeroHighlightStyleId;
  slotCardStyle: SlotCardStyleId;
}

export interface TurnosCustomClaims {
  platformAdmin?: boolean;
  tenants?: Record<string, TenantRole>;
}

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

export type SurchargeType = 'fixed' | 'percentage';

export interface SlotSurcharge {
  type: SurchargeType;
  /** Monto entero en ARS (1..5_000_000) si type === 'fixed'; porcentaje entero (1..200) si type === 'percentage'. */
  value: number;
  /** Etiqueta breve visible para el cliente (ej. "Feriado", "Horario nocturno"). Máx. 60 caracteres. */
  reason?: string;
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
  surchargeType?: SurchargeType;
  surchargeValue?: number;
  surchargeAmount?: number;
  surchargeReason?: string;
}

export interface Slot {
  id: string;
  tenantId?: string;
  datetime: string;
  endDatetime?: string | null;
  serviceName?: string;
  services?: (ServiceItem | string)[];
  totalPrice?: number;
  depositAmount: number;
  surcharge?: SlotSurcharge | null;
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
  previousDurationMinutes?: number;
  previousDuration?: string;
}

export interface NewSlotData {
  datetime: string;
  depositAmount: number;
  serviceName?: string;
  services?: ServiceItem[];
  totalPrice?: number;
  estimatedDurationMinutes?: number;
  estimatedDuration?: string;
  surcharge?: SlotSurcharge | null;
}

export interface CreatePreferencePayload {
  tenantId?: string;
  slotId: string;
  clientData: ClientData;
}

export interface CreatePreferenceResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
}

export interface VerifyPaymentPayload {
  tenantId?: string;
  paymentId?: string;
  slotId?: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string;
  platformAdmin: boolean;
  tenants: Record<string, TenantRole>;
}

export interface OwnerInfo {
  name: string;
  businessName?: string;
  role?: string;
  description: string;
  pictureUrl: string;
  heroImageUrl?: string;
  logoUrl?: string;
  instagram?: string;
  phone?: string;
  email?: string;
  location?: string;
  appearance?: Partial<TenantAppearanceConfig> | null;
  updatedAt?: string;
}

export interface TenantDoc {
  id: string;
  slug: string;
  previousSlugs?: string[];
  name: string;
  status: TenantStatus;
  isDemo: boolean;
  mpConfigured: boolean;
  timezone: string;
  currency: TenantCurrency;
  createdAt: string;
  updatedAt: string;
  createdByUid: string;
}

export type Tenant = TenantDoc;

export interface TenantSlugBootstrapDoc {
  tenantId: string;
  slug: string;
  status: TenantStatus;
  redirectToSlug?: string | null;
  timezone: string;
  currency: TenantCurrency;
  mpConfigured: boolean;
  isDemo?: boolean;
  ownerProfile: Partial<OwnerInfo>;
  appearance?: Partial<TenantAppearanceConfig> | null;
  updatedAt: string;
}

export type TenantSlugDoc = TenantSlugBootstrapDoc;

export interface TenantMemberDoc {
  uid: string;
  email: string;
  displayName?: string;
  role: TenantRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TenantMember = TenantMemberDoc;

export interface TenantPrivateIntegrationsDoc {
  mpAccessToken?: string | null;
  mpWebhookSecret?: string | null;
  mpPublicKey?: string | null;
  maskedAccessToken?: string | null;
  updatedAt: string;
  updatedByUid: string;
}

export interface TenantPaymentSettingsSummary {
  configured: boolean;
  maskedAccessToken: string | null;
  hasWebhookSecret: boolean;
  isDemoFallbackActive: boolean;
  webhookUrl: string;
  updatedAt?: string | null;
}

export interface PublicSlotProjection {
  datetime: string;
  endDatetime?: string | null;
  serviceName?: string;
  services?: (ServiceItem | string)[];
  totalPrice?: number;
  depositAmount: number;
  surcharge?: SlotSurcharge;
  status: SlotStatus;
  expiresAt?: string | null;
  estimatedDurationMinutes?: number;
  estimatedDuration?: string;
  rules?: string[];
}

export interface PublicAvailabilityDoc {
  slots: Record<string, PublicSlotProjection>;
  updatedAt: string;
}

export interface PaymentAttemptDoc {
  id?: string;
  tenantId: string;
  tenantSlug: string;
  slotId: string;
  lockToken: string;
  preferenceId?: string;
  clientData?: ClientData;
  createdAt: string;
  expireAt?: unknown;
}

export interface PaymentIncidentDoc {
  id?: string;
  tenantId: string;
  tenantSlug: string;
  paymentId: string;
  slotId?: string;
  reason: string;
  status?: string;
  amount?: number;
  createdAt: string;
}

export interface AdminCreateSlotsPayload {
  tenantId: string;
  slots: NewSlotData[];
}

export interface AdminSlotActionPayload {
  tenantId: string;
  slotId: string;
}

export interface AdminAssignSlotPayload {
  tenantId: string;
  slotId: string;
  clientData: ClientData;
}

export interface AdminGetPaymentSettingsPayload {
  tenantId: string;
}

export interface AdminSavePaymentSettingsPayload {
  tenantId: string;
  mpAccessToken?: string;
  mpWebhookSecret?: string;
  mpPublicKey?: string;
  clearCredentials?: boolean;
}

export interface SuperAdminCreateTenantPayload {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPassword?: string;
  timezone?: string;
  isDemo?: boolean;
}

export interface SuperAdminCreateTenantResponse {
  tenantId: string;
  slug: string;
  ownerUid: string;
}

export interface SuperAdminUpdateTenantPayload {
  tenantId: string;
  status?: TenantStatus;
  name?: string;
  timezone?: string;
  isDemo?: boolean;
}

export interface SuperAdminUpdateTenantResponse {
  success: boolean;
  tenantId: string;
}

export interface SuperAdminChangeTenantSlugPayload {
  tenantId: string;
  newSlug: string;
}

export interface SuperAdminChangeTenantSlugResponse {
  success: boolean;
  tenantId: string;
  previousSlug: string;
  newSlug: string;
}

export interface SuperAdminUpsertTenantMemberPayload {
  tenantId: string;
  email: string;
  role: TenantRole;
  active: boolean;
}

export interface SuperAdminUpsertTenantMemberResponse {
  success: boolean;
  uid: string;
  role: TenantRole;
  active: boolean;
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

export interface PublicVerifiedBookingSummary {
  slotId: string;
  paymentId: string;
  serviceName: string;
  datetime?: string;
  formattedDate?: string;
  formattedTime?: string;
  depositAmount: number;
  basePrice?: number;
  extrasPrice?: number;
  surchargeType?: SurchargeType;
  surchargeValue?: number;
  surchargeAmount?: number;
  surchargeReason?: string;
  estimatedPrice?: number;
  estimatedDurationMinutes?: number;
  estimatedDuration?: string;
  businessName?: string;
  clientName?: string;
  maskedClientEmail?: string;
}

export interface BookingEmailPayload {
  tenantId?: string;
  tenantSlug?: string;
  timezone?: string;
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
  surchargeType?: SurchargeType;
  surchargeValue?: number;
  surchargeAmount?: number;
  surchargeReason?: string;
  estimatedDurationMinutes?: number;
  estimatedDuration?: string;
  estimatedPrice?: number;
  ownerEmail?: string;
}

export type OnboardingRequestStatus = 'pending' | 'contacted' | 'cancelled' | 'approved';

export type OnboardingRequestEmailStatus = 'sent' | 'partial' | 'failed' | 'skipped';

export interface OnboardingRequestDoc {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  status: OnboardingRequestStatus;
  source: 'landing';
  emailStatus: OnboardingRequestEmailStatus;
  clientEmailSent: boolean;
  adminEmailSent: boolean;
  createdAt: string;
  updatedAt: string;
  statusUpdatedAt: string | null;
  statusUpdatedByUid: string | null;
  statusUpdatedByEmail: string | null;
}

export interface SubmitOnboardingRequestPayload {
  name: string;
  email: string;
  phone: string;
  notes?: string;
  website?: string;
}

export interface SubmitOnboardingRequestResponse {
  requestId: string;
  status: OnboardingRequestStatus;
  createdAt: string;
  clientEmailSent: boolean;
}

export interface SuperAdminUpdateOnboardingRequestStatusPayload {
  requestId: string;
  status: OnboardingRequestStatus;
}

export interface SuperAdminUpdateOnboardingRequestStatusResponse {
  success: boolean;
  requestId: string;
  status: OnboardingRequestStatus;
  updatedAt: string;
}
