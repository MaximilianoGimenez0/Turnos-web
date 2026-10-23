import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  getOwnerInfo,
  subscribeToOwnerInfo,
  updateOwnerInfo,
  addPortfolioItem,
  deletePortfolioItem,
  subscribeToPortfolio,
  DEFAULT_OWNER_INFO,
} from '../../src/services/ownerService';
import { initTestEmulators } from '../setup/emulatorConfig';
import { setupAuthenticatedAdmin } from '../setup/testEnvironment';
import { createPortfolioFixture } from '../setup/fixtures';

describe('Integración - ownerService con Firestore Emulator', () => {
  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await setupAuthenticatedAdmin();
  });

  describe('ownerinfo - Perfil de la dueña/negocio', () => {
    it('getOwnerInfo devuelve DEFAULT_OWNER_INFO si la colección está vacía', async () => {
      const info = await getOwnerInfo();
      expect(info).toEqual(DEFAULT_OWNER_INFO);
    });

    it('updateOwnerInfo persiste información y fusiona cambios', async () => {
      await updateOwnerInfo({
        businessName: 'Lash & Brow Studio Buenos Aires',
        instagram: '@lashbrow.ba',
        phone: '+5491199887766',
      });

      const updated = await getOwnerInfo();
      expect(updated.businessName).toBe('Lash & Brow Studio Buenos Aires');
      expect(updated.instagram).toBe('@lashbrow.ba');
      expect(updated.phone).toBe('+5491199887766');
      // Los campos no pasados deben conservar el default
      expect(updated.name).toBe(DEFAULT_OWNER_INFO.name);
      expect(updated.role).toBe(DEFAULT_OWNER_INFO.role);
    });

    it('subscribeToOwnerInfo emite en tiempo real cuando se actualiza el perfil', async () => {
      let currentInfo: any = null;
      const unsubscribe = subscribeToOwnerInfo((data) => {
        currentInfo = data;
      });

      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(currentInfo.businessName).toBe(DEFAULT_OWNER_INFO.businessName);

      await updateOwnerInfo({ businessName: 'Nuevo Nombre de Prueba' });
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(currentInfo.businessName).toBe('Nuevo Nombre de Prueba');
      unsubscribe();
    });
  });

  describe('portfolio - Trabajos realizados', () => {
    it('addPortfolioItem agrega un trabajo con timestamp y retorna id', async () => {
      const itemFixture = createPortfolioFixture({
        title: 'Lifting de Pestañas con Tinte Azul Profundo',
        category: 'Pestañas',
      });

      const id = await addPortfolioItem(itemFixture);
      expect(id).toBeTruthy();

      const items: any[] = await new Promise((resolve) => {
        const unsub = subscribeToPortfolio((data) => {
          if (data.length > 0) {
            unsub();
            resolve(data);
          }
        });
      });

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(id);
      expect(items[0].title).toBe('Lifting de Pestañas con Tinte Azul Profundo');
      expect(items[0].createdAt).toBeDefined();
    });

    it('deletePortfolioItem elimina el elemento de Firestore', async () => {
      const id1 = await addPortfolioItem(createPortfolioFixture({ title: 'Item 1' }));
      const id2 = await addPortfolioItem(createPortfolioFixture({ title: 'Item 2' }));

      await deletePortfolioItem(id1);

      const items: any[] = await new Promise((resolve) => {
        const unsub = subscribeToPortfolio((data) => {
          if (data.length === 1) {
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
