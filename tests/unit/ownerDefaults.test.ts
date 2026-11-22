import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeOwnerTextPatch,
  DEFAULT_OWNER_ASSETS,
  FALLBACK_OWNER_INFO_SYNC,
  getDefaultOwnerFieldsSummary,
  hasAnyCustomOwnerText,
  hasCustomOwnerField,
  loadDefaultOwnerInfo,
  resetDefaultOwnerInfoCache,
  resolveOwnerInfo,
  validateOwnerTextPatch,
} from '../../src/services/ownerDefaults';

describe('ownerDefaults', () => {
  beforeEach(() => {
    resetDefaultOwnerInfoCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveOwnerInfo', () => {
    it('returns defaults when remote data is null or undefined', () => {
      expect(resolveOwnerInfo(null)).toEqual(FALLBACK_OWNER_INFO_SYNC);
      expect(resolveOwnerInfo(undefined)).toEqual(FALLBACK_OWNER_INFO_SYNC);
    });

    it('falls back to defaults when remote fields are empty strings or whitespace', () => {
      const resolved = resolveOwnerInfo({
        name: '   ',
        businessName: '',
        role: '',
        description: '  ',
        pictureUrl: '',
        heroImageUrl: ' ',
        logoUrl: '',
        instagram: '',
        phone: '',
        email: '  ',
        location: '',
      });

      expect(resolved).toEqual(FALLBACK_OWNER_INFO_SYNC);
      expect(resolved.heroImageUrl).toBe(DEFAULT_OWNER_ASSETS.heroImage);
      expect(resolved.pictureUrl).toBe(DEFAULT_OWNER_ASSETS.portraitImage);
      expect(resolved.logoUrl).toBe(DEFAULT_OWNER_ASSETS.logoImage);
    });

    it('merges partial custom data while preserving defaults for missing fields', () => {
      const resolved = resolveOwnerInfo({
        businessName: '  Luna Studio  ',
        logoUrl: 'https://storage.example.com/logo.png',
        instagram: '@lunastudio',
      });

      expect(resolved.businessName).toBe('Luna Studio');
      expect(resolved.logoUrl).toBe('https://storage.example.com/logo.png');
      expect(resolved.instagram).toBe('@lunastudio');
      expect(resolved.name).toBe(FALLBACK_OWNER_INFO_SYNC.name);
      expect(resolved.heroImageUrl).toBe(DEFAULT_OWNER_ASSETS.heroImage);
      expect(resolved.pictureUrl).toBe(DEFAULT_OWNER_ASSETS.portraitImage);
    });
  });

  describe('hasCustomOwnerField / hasAnyCustomOwnerText', () => {
    it('detects configured vs unconfigured fields accurately', () => {
      expect(hasCustomOwnerField(null, 'name')).toBe(false);
      expect(hasCustomOwnerField({ name: '   ' }, 'name')).toBe(false);
      expect(hasCustomOwnerField({ name: 'Sofía' }, 'name')).toBe(true);

      expect(hasAnyCustomOwnerText(null)).toBe(false);
      expect(hasAnyCustomOwnerText({ logoUrl: 'https://x/a.png' })).toBe(false);
      expect(hasAnyCustomOwnerText({ businessName: 'Mi Estudio' })).toBe(true);
    });
  });

  describe('loadDefaultOwnerInfo', () => {
    it('loads and resolves defaults from /default/info/owner.json', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          businessName: 'Estudio Stock JSON',
          location: 'Córdoba, Argentina',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const loaded = await loadDefaultOwnerInfo();
      expect(mockFetch).toHaveBeenCalledWith(DEFAULT_OWNER_ASSETS.infoUrl, { cache: 'default' });
      expect(loaded.businessName).toBe('Estudio Stock JSON');
      expect(loaded.location).toBe('Córdoba, Argentina');
      expect(loaded.logoUrl).toBe(DEFAULT_OWNER_ASSETS.logoImage);
    });

    it('falls back to synchronous defaults when fetch fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const loaded = await loadDefaultOwnerInfo();
      expect(loaded).toEqual(FALLBACK_OWNER_INFO_SYNC);
    });
  });

  describe('getDefaultOwnerFieldsSummary', () => {
    it('counts default text and image fields accurately for empty and partial profiles', () => {
      const emptySummary = getDefaultOwnerFieldsSummary(null);
      expect(emptySummary.allUsingDefaults).toBe(true);
      expect(emptySummary.hasAnyDefault).toBe(true);
      expect(emptySummary.defaultTextCount).toBe(8);
      expect(emptySummary.defaultImageCount).toBe(3);

      const partialSummary = getDefaultOwnerFieldsSummary({
        businessName: 'Aura Estética',
        logoUrl: 'https://storage.example.com/logo.svg',
      });
      expect(partialSummary.allUsingDefaults).toBe(false);
      expect(partialSummary.hasAnyDefault).toBe(true);
      expect(partialSummary.defaultTextCount).toBe(7);
      expect(partialSummary.defaultImageCount).toBe(2);
    });
  });

  describe('computeOwnerTextPatch & validateOwnerTextPatch', () => {
    it('computes a diff-only patch, normalizing instagram and ignoring unchanged fields', () => {
      const remote = {
        businessName: 'Aura Estética',
        instagram: '@aura.ba',
      };
      const patch = computeOwnerTextPatch(remote, {
        businessName: '  Aura Estética  ',
        instagram: 'https://instagram.com/nuevo_estudio/',
        role: '  Cosmetóloga  ',
      });

      expect(patch).toEqual({
        instagram: '@nuevo_estudio',
        role: 'Cosmetóloga',
      });
    });

    it('includes empty string in patch when clearing a previously saved field', () => {
      const patch = computeOwnerTextPatch(
        { businessName: 'Aura Estética' },
        { businessName: '   ' }
      );
      expect(patch).toEqual({ businessName: '' });
    });

    it('validates partial patches allowing single-field updates and empty restorations', () => {
      expect(validateOwnerTextPatch({ businessName: 'Aura Spa' })).toEqual({});
      expect(validateOwnerTextPatch({ businessName: '' })).toEqual({});

      const errors = validateOwnerTextPatch({
        businessName: 'A',
        email: 'correo-invalido',
        instagram: '@con espacios',
        description: 'corta',
      });
      expect(errors.businessName).toBeDefined();
      expect(errors.email).toBeDefined();
      expect(errors.instagram).toBeDefined();
      expect(errors.description).toBeDefined();
      expect(errors.name).toBeUndefined();
    });
  });
});
