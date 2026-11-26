import type React from 'react';
import type { OwnerInfo } from '../types';
import {
  normalizeInstagramHandle,
  validateEmail,
  validateInstagram,
  validateOptionalText,
  validatePhone,
} from '../utils/validators';
import { FIELD_LIMITS } from '../config/fieldLimits';
import { OWNER_SETTINGS_TEXTS } from '../texts';

export type OwnerTextField =
  | 'businessName'
  | 'name'
  | 'role'
  | 'instagram'
  | 'phone'
  | 'email'
  | 'location'
  | 'description';

export type OwnerImageField = 'logoUrl' | 'pictureUrl' | 'heroImageUrl';

export const OWNER_TEXT_FIELDS: readonly OwnerTextField[] = [
  'businessName',
  'name',
  'role',
  'instagram',
  'phone',
  'email',
  'location',
  'description',
];

export const OWNER_IMAGE_FIELDS: readonly OwnerImageField[] = [
  'logoUrl',
  'pictureUrl',
  'heroImageUrl',
];

export const DEFAULT_OWNER_ASSETS = {
  infoUrl: '/default/info/owner.json',
  heroImage: '/default/images/hero-fallback.jpg',
  portraitImage: '/default/images/portrait-fallback.jpg',
  logoImage: '/default/images/logo-fallback.svg',
} as const;

export const DEMO_PORTFOLIO_STOCK_IMAGES = {
  french: '/default/images/demo-nails-french.jpg',
  kapping: '/default/images/demo-nails-kapping.jpg',
  nailArt: '/default/images/demo-nails-nailart.jpg',
  softGel: '/default/images/demo-nails-softgel.jpg',
} as const;

export const FALLBACK_OWNER_INFO_SYNC: OwnerInfo = {
  name: 'Estudio de Belleza & Estética',
  businessName: 'Estudio de Belleza',
  role: 'Especialista en Belleza y Cuidado Personal',
  description:
    'Brindamos atención personalizada de primer nivel. Nos enfocamos en realzar tu belleza natural con técnicas modernas, productos premium y un ambiente diseñado para tu máximo relax y confort.',
  pictureUrl: DEFAULT_OWNER_ASSETS.portraitImage,
  heroImageUrl: DEFAULT_OWNER_ASSETS.heroImage,
  logoUrl: DEFAULT_OWNER_ASSETS.logoImage,
  instagram: '@turneado.estetica',
  phone: '+54 9 11 1234-5678',
  email: 'contacto@turneado.app',
  location: 'Buenos Aires, Argentina',
};

const pickNonEmptyString = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
};

export const resolveOwnerInfo = (
  remote: Partial<OwnerInfo> | null | undefined,
  defaults: OwnerInfo = FALLBACK_OWNER_INFO_SYNC
): OwnerInfo => {
  if (!remote) {
    return { ...defaults };
  }

  return {
    name: pickNonEmptyString(remote.name, defaults.name),
    businessName: pickNonEmptyString(remote.businessName, defaults.businessName || defaults.name),
    role: pickNonEmptyString(remote.role, defaults.role || ''),
    description: pickNonEmptyString(remote.description, defaults.description),
    pictureUrl: pickNonEmptyString(remote.pictureUrl, defaults.pictureUrl),
    heroImageUrl: pickNonEmptyString(
      remote.heroImageUrl,
      defaults.heroImageUrl || DEFAULT_OWNER_ASSETS.heroImage
    ),
    logoUrl: pickNonEmptyString(
      remote.logoUrl,
      defaults.logoUrl || DEFAULT_OWNER_ASSETS.logoImage
    ),
    instagram: pickNonEmptyString(remote.instagram, defaults.instagram || ''),
    phone: pickNonEmptyString(remote.phone, defaults.phone || ''),
    email: pickNonEmptyString(remote.email, defaults.email || ''),
    location: pickNonEmptyString(remote.location, defaults.location || ''),
    appearance: remote.appearance ?? undefined,
    updatedAt: remote.updatedAt,
  };
};

export const hasCustomOwnerField = (
  remote: Partial<OwnerInfo> | null | undefined,
  field: keyof Omit<OwnerInfo, 'updatedAt'>
): boolean => {
  const value = remote?.[field];
  return typeof value === 'string' && value.trim().length > 0;
};

export const hasAnyCustomOwnerText = (
  remote: Partial<OwnerInfo> | null | undefined
): boolean => {
  if (!remote) return false;
  return OWNER_TEXT_FIELDS.some((field) => hasCustomOwnerField(remote, field));
};

export interface DefaultOwnerFieldsSummary {
  defaultTextFields: OwnerTextField[];
  defaultImageFields: OwnerImageField[];
  defaultTextCount: number;
  defaultImageCount: number;
  totalTextCount: number;
  totalImageCount: number;
  allUsingDefaults: boolean;
  hasAnyDefault: boolean;
}

export const getDefaultOwnerFieldsSummary = (
  remote: Partial<OwnerInfo> | null | undefined
): DefaultOwnerFieldsSummary => {
  const defaultTextFields = OWNER_TEXT_FIELDS.filter(
    (field) => !hasCustomOwnerField(remote, field)
  );
  const defaultImageFields = OWNER_IMAGE_FIELDS.filter(
    (field) => !hasCustomOwnerField(remote, field)
  );

  return {
    defaultTextFields,
    defaultImageFields,
    defaultTextCount: defaultTextFields.length,
    defaultImageCount: defaultImageFields.length,
    totalTextCount: OWNER_TEXT_FIELDS.length,
    totalImageCount: OWNER_IMAGE_FIELDS.length,
    allUsingDefaults:
      defaultTextFields.length === OWNER_TEXT_FIELDS.length &&
      defaultImageFields.length === OWNER_IMAGE_FIELDS.length,
    hasAnyDefault: defaultTextFields.length > 0 || defaultImageFields.length > 0,
  };
};

export const computeOwnerTextPatch = (
  remote: Partial<OwnerInfo> | null | undefined,
  draft: Partial<OwnerInfo>
): Partial<Record<OwnerTextField, string>> => {
  const patch: Partial<Record<OwnerTextField, string>> = {};

  for (const field of OWNER_TEXT_FIELDS) {
    if (!(field in draft)) continue;

    const rawDraftValue = typeof draft[field] === 'string' ? draft[field] : '';
    const trimmedDraft = rawDraftValue.trim();
    const nextValue =
      field === 'instagram' && trimmedDraft
        ? normalizeInstagramHandle(trimmedDraft)
        : trimmedDraft;

    const rawSavedValue = typeof remote?.[field] === 'string' ? remote[field] : '';
    const savedValue = rawSavedValue.trim();

    if (nextValue !== savedValue) {
      patch[field] = nextValue;
    }
  }

  return patch;
};

export const validateOwnerTextPatch = (
  patch: Partial<Record<OwnerTextField, string>>
): Partial<Record<OwnerTextField, string>> => {
  const errors: Partial<Record<OwnerTextField, string>> = {};

  for (const [key, rawValue] of Object.entries(patch) as Array<[OwnerTextField, string | undefined]>) {
    const value = (rawValue ?? '').trim();
    if (!value) continue;

    let result = { isValid: true } as { isValid: boolean; error?: string };

    switch (key) {
      case 'businessName':
        result = validateOptionalText(
          value,
          OWNER_SETTINGS_TEXTS.inputs.businessNameField,
          FIELD_LIMITS.owner.businessName.min,
          FIELD_LIMITS.owner.businessName.max
        );
        break;
      case 'name':
        result = validateOptionalText(
          value,
          OWNER_SETTINGS_TEXTS.inputs.nameField,
          FIELD_LIMITS.owner.name.min,
          FIELD_LIMITS.owner.name.max
        );
        break;
      case 'role':
        result = validateOptionalText(
          value,
          OWNER_SETTINGS_TEXTS.inputs.roleField,
          FIELD_LIMITS.owner.role.min,
          FIELD_LIMITS.owner.role.max
        );
        break;
      case 'instagram':
        result =
          value.length > FIELD_LIMITS.owner.instagram.max
            ? validateOptionalText(
              value,
              OWNER_SETTINGS_TEXTS.inputs.instagramLabel,
              FIELD_LIMITS.owner.instagram.min,
              FIELD_LIMITS.owner.instagram.max
            )
            : validateInstagram(value, false);
        break;
      case 'phone':
        result = validatePhone(value, false, FIELD_LIMITS.owner.phone.max);
        break;
      case 'email':
        result = validateEmail(value, false, FIELD_LIMITS.owner.email.max);
        break;
      case 'location':
        result = validateOptionalText(
          value,
          OWNER_SETTINGS_TEXTS.inputs.locationField,
          FIELD_LIMITS.owner.location.min,
          FIELD_LIMITS.owner.location.max
        );
        break;
      case 'description':
        result = validateOptionalText(
          value,
          OWNER_SETTINGS_TEXTS.inputs.bioField,
          FIELD_LIMITS.owner.description.min,
          FIELD_LIMITS.owner.description.max
        );
        break;
    }

    if (!result.isValid && result.error) {
      errors[key] = result.error;
    }
  }

  return errors;
};

let cachedDefaultsPromise: Promise<OwnerInfo> | null = null;

export const loadDefaultOwnerInfo = async (): Promise<OwnerInfo> => {
  if (!cachedDefaultsPromise) {
    cachedDefaultsPromise = (async () => {
      try {
        if (typeof fetch !== 'function') {
          return FALLBACK_OWNER_INFO_SYNC;
        }
        const response = await fetch(DEFAULT_OWNER_ASSETS.infoUrl, { cache: 'default' });
        if (!response.ok) {
          return FALLBACK_OWNER_INFO_SYNC;
        }
        const json = (await response.json()) as Partial<OwnerInfo>;
        return resolveOwnerInfo(json, FALLBACK_OWNER_INFO_SYNC);
      } catch {
        return FALLBACK_OWNER_INFO_SYNC;
      }
    })();
  }
  return cachedDefaultsPromise;
};

export const resetDefaultOwnerInfoCache = (): void => {
  cachedDefaultsPromise = null;
};

export const applyImageFallback = (
  event: React.SyntheticEvent<HTMLImageElement>,
  fallbackSrc: string
): void => {
  const img = event.currentTarget;
  if (img.dataset.fallbackApplied === 'true') {
    return;
  }
  img.dataset.fallbackApplied = 'true';
  img.src = fallbackSrc;
};
