import type React from 'react';
import type { OwnerInfo } from '../types';

export const DEFAULT_OWNER_ASSETS = {
  infoUrl: '/default/info/owner.json',
  heroImage: '/default/images/hero-fallback.jpg',
  portraitImage: '/default/images/portrait-fallback.jpg',
  logoImage: '/default/images/logo-fallback.svg',
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
  instagram: '@turnosweb.estetica',
  phone: '+54 9 11 1234-5678',
  email: 'contacto@turnosweb.com',
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
  const textFields: Array<keyof Omit<OwnerInfo, 'updatedAt'>> = [
    'name',
    'businessName',
    'role',
    'description',
    'instagram',
    'phone',
    'email',
    'location',
  ];
  return textFields.some((field) => hasCustomOwnerField(remote, field));
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
