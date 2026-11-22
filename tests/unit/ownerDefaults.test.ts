import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_OWNER_ASSETS,
  FALLBACK_OWNER_INFO_SYNC,
  hasAnyCustomOwnerText,
  hasCustomOwnerField,
  loadDefaultOwnerInfo,
  resetDefaultOwnerInfoCache,
  resolveOwnerInfo,
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
});
