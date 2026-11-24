import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../src/services/firebaseConfig';
import {
  getOwnerInfo,
  getRawOwnerInfo,
  subscribeToOwnerInfo,
  updateOwnerInfo,
  updateTenantAppearance,
  resetTenantAppearance,
  addPortfolioItem,
  deletePortfolioItem,
  getPortfolioItems,
  subscribeToPortfolio,
  DEFAULT_OWNER_INFO,
} from '../../src/services/ownerService';
import { clearPublicCache } from '../../src/services/publicCache';
import { initTestEmulators } from '../setup/emulatorConfig';
import {
  createTestUserWithClaims,
  resetTestEnvironment,
  seedTestTenant,
  signInTestUserWithClaims,
  signOutTestUser,
} from '../setup/testEnvironment';
import { createPortfolioFixture, createTenantMemberFixture } from '../setup/fixtures';
import type { OwnerInfo, PortfolioItem } from '../../src/types';

describe('Integración - ownerService Multi-Tenant con Firestore Emulator', () => {
  const password = 'Password123!';
  const tenantAId = 'tnt_ownera';
  const tenantBId = 'tnt_ownerb';
  const ownerAEmail = 'owner-profile-a@turnosweb.com';
  const ownerBEmail = 'owner-profile-b@turnosweb.com';

  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await resetTestEnvironment();
    clearPublicCache();

    const ownerA = await createTestUserWithClaims(ownerAEmail, password, {
      tenants: { [tenantAId]: 'owner' },
    });
    const ownerB = await createTestUserWithClaims(ownerBEmail, password, {
      tenants: { [tenantBId]: 'owner' },
    });

    await signOutTestUser();

    await seedTestTenant({
      tenantId: tenantAId,
      slug: 'estudio-owner-a',
      name: 'Estudio Owner A',
      members: [createTenantMemberFixture({ uid: ownerA.uid, email: ownerAEmail, role: 'owner' })],
    });

    await seedTestTenant({
      tenantId: tenantBId,
      slug: 'estudio-owner-b',
      name: 'Estudio Owner B',
      members: [createTenantMemberFixture({ uid: ownerB.uid, email: ownerBEmail, role: 'owner' })],
    });

    await signInTestUserWithClaims(ownerAEmail, password);
    await deleteDoc(doc(db, 'tenants', tenantAId, 'ownerinfo', 'profile')).catch(() => {});
  });

  describe('ownerinfo - Perfil de la dueña/negocio', () => {
    it('getOwnerInfo devuelve DEFAULT_OWNER_INFO si el documento profile no existe', async () => {
      const info = await getOwnerInfo(tenantAId);
      expect(info).toEqual(DEFAULT_OWNER_INFO);
    });

    it('updateOwnerInfo persiste información en el tenant correcto sin alterar otro tenant', async () => {
      await updateOwnerInfo(
        tenantAId,
        {
          businessName: 'Lash & Brow Studio Buenos Aires',
          instagram: '@lashbrow.ba',
          phone: '+5491199887766',
        },
        'estudio-owner-a'
      );

      const updatedA = await getOwnerInfo(tenantAId);
      expect(updatedA.businessName).toBe('Lash & Brow Studio Buenos Aires');
      expect(updatedA.instagram).toBe('@lashbrow.ba');
      expect(updatedA.phone).toBe('+5491199887766');
      expect(updatedA.name).toBe(DEFAULT_OWNER_INFO.name);
      expect(updatedA.role).toBe(DEFAULT_OWNER_INFO.role);

      const infoB = await getOwnerInfo(tenantBId);
      expect(infoB.businessName).toBe('Estudio Owner B');
    });

    it('subscribeToOwnerInfo emite en tiempo real cuando se actualiza el perfil del tenant', async () => {
      let resolveInitial!: (info: OwnerInfo) => void;
      let resolveUpdate!: (info: OwnerInfo) => void;

      const initialPromise = new Promise<OwnerInfo>((resolve) => {
        resolveInitial = resolve;
      });
      const updatedPromise = new Promise<OwnerInfo>((resolve) => {
        resolveUpdate = resolve;
      });

      const unsubscribe = subscribeToOwnerInfo(tenantAId, (data) => {
        if (data.businessName === 'Nuevo Nombre de Prueba') {
          resolveUpdate(data);
        } else {
          resolveInitial(data);
        }
      });

      const initial = await initialPromise;
      expect(initial.businessName).toBe(DEFAULT_OWNER_INFO.businessName);

      await updateOwnerInfo(tenantAId, { businessName: 'Nuevo Nombre de Prueba' });
      const updated = await updatedPromise;
      expect(updated.businessName).toBe('Nuevo Nombre de Prueba');

      unsubscribe();
    });

    it('updateTenantAppearance y resetTenantAppearance persisten y aíslan apariencia entre tenants', async () => {
      await updateOwnerInfo(
        tenantAId,
        { businessName: 'Estudio Botánico A' },
        'estudio-owner-a'
      );

      const saved = await updateTenantAppearance(
        tenantAId,
        {
          palettePreset: 'sage-botanical',
          customPrimaryHex: '#436852',
          defaultMode: 'dark',
          allowVisitorModeToggle: false,
          fontPairing: 'classic',
          shapePreset: 'rounded',
          surfaceStyle: 'elevated',
          density: 'spacious',
          textScale: 'lg',
        },
        'estudio-owner-a'
      );

      expect(saved.palettePreset).toBe('sage-botanical');
      expect(saved.allowVisitorModeToggle).toBe(false);

      const rawA = await getRawOwnerInfo(tenantAId);
      expect(rawA?.businessName).toBe('Estudio Botánico A');
      expect(rawA?.appearance?.palettePreset).toBe('sage-botanical');
      expect(rawA?.appearance?.fontPairing).toBe('classic');

      // Tenant B must remain untouched and ownerA cannot write to tenantB
      const rawB = await getRawOwnerInfo(tenantBId);
      expect(rawB?.appearance).toBeUndefined();

      await expect(
        updateTenantAppearance(tenantBId, { palettePreset: 'noir-minimal' }, 'estudio-owner-b')
      ).rejects.toThrow();

      // Reset removes appearance while preserving owner text fields
      await resetTenantAppearance(tenantAId, 'estudio-owner-a');
      const afterReset = await getRawOwnerInfo(tenantAId);
      expect(afterReset?.appearance).toBeUndefined();
      expect(afterReset?.businessName).toBe('Estudio Botánico A');
    });
  });

  describe('portfolio - Trabajos realizados con aislamiento entre tenants', () => {
    it('addPortfolioItem agrega un trabajo en tenantA y no aparece en tenantB', async () => {
      const itemFixture = createPortfolioFixture({
        title: 'Lifting de Pestañas con Tinte Azul Profundo',
        category: 'Pestañas',
      });

      const id = await addPortfolioItem(tenantAId, itemFixture);
      expect(id).toBeTruthy();

      const itemsA: PortfolioItem[] = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout esperando portfolio')), 6000);
        const unsub = subscribeToPortfolio(tenantAId, (data) => {
          if (data.length > 0) {
            clearTimeout(timeout);
            unsub();
            resolve(data);
          }
        });
      });

      expect(itemsA).toHaveLength(1);
      expect(itemsA[0].id).toBe(id);
      expect(itemsA[0].title).toBe('Lifting de Pestañas con Tinte Azul Profundo');
      expect(itemsA[0].createdAt).toBeDefined();

      const itemsB = await getPortfolioItems(tenantBId);
      expect(itemsB).toHaveLength(0);
    });

    it('deletePortfolioItem elimina el elemento del tenant indicado', async () => {
      const id1 = await addPortfolioItem(tenantAId, createPortfolioFixture({ title: 'Item 1' }));
      const id2 = await addPortfolioItem(tenantAId, createPortfolioFixture({ title: 'Item 2' }));

      await deletePortfolioItem(tenantAId, id1);

      const items: PortfolioItem[] = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout esperando delete portfolio')), 6000);
        const unsub = subscribeToPortfolio(tenantAId, (data) => {
          if (data.length === 1) {
            clearTimeout(timeout);
            unsub();
            resolve(data);
          }
        });
      });

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(id2);
    });
  });
});
