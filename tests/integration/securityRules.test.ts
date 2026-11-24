import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  deleteObject,
  getBytes,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { db } from '../../src/services/firebaseConfig';
import { getStorageInstance } from '../../src/services/storageService';
import { initTestEmulators } from '../setup/emulatorConfig';
import {
  createTestUser,
  createTestUserWithClaims,
  resetTestEnvironment,
  seedFirestoreDocument,
  seedStorageObject,
  seedTestTenant,
  signInTestUser,
  signInTestUserWithClaims,
  signOutTestUser,
} from '../setup/testEnvironment';
import {
  createTenantMemberFixture,
  createTenantPrivateIntegrationsFixture,
} from '../setup/fixtures';

describe('Integración - Security Rules Multi-Tenant (firestore.rules y storage.rules)', () => {
  const password = 'Password123!';
  const ownerAEmail = 'owner-a@turnosweb.com';
  const staffAEmail = 'staff-a@turnosweb.com';
  const ownerBEmail = 'owner-b@turnosweb.com';
  const platformAdminEmail = 'superadmin@turnosweb.com';

  const tenantAId = 'tnt_a';
  const tenantBId = 'tnt_b';
  const demoTenantId = 'tnt_demo';

  let ownerAUid = '';
  let staffAUid = '';
  let ownerBUid = '';

  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await resetTestEnvironment();

    const ownerA = await createTestUserWithClaims(ownerAEmail, password, {
      tenants: { [tenantAId]: 'owner' },
    });
    ownerAUid = ownerA.uid;

    const staffA = await createTestUserWithClaims(staffAEmail, password, {
      tenants: { [tenantAId]: 'staff' },
    });
    staffAUid = staffA.uid;

    const ownerB = await createTestUserWithClaims(ownerBEmail, password, {
      tenants: { [tenantBId]: 'owner' },
    });
    ownerBUid = ownerB.uid;

    await createTestUserWithClaims(platformAdminEmail, password, {
      platformAdmin: true,
    });

    await signOutTestUser();

    await seedTestTenant({
      tenantId: demoTenantId,
      slug: 'demo',
      name: 'Estudio Demo',
      isDemo: true,
      mpConfigured: true,
    });

    await seedTestTenant({
      tenantId: tenantAId,
      slug: 'estudio-a',
      name: 'Estudio A',
      isDemo: false,
      mpConfigured: true,
      members: [
        createTenantMemberFixture({ uid: ownerAUid, email: ownerAEmail, role: 'owner' }),
        createTenantMemberFixture({ uid: staffAUid, email: staffAEmail, role: 'staff' }),
      ],
      privateIntegrations: createTenantPrivateIntegrationsFixture({
        updatedByUid: ownerAUid,
      }),
    });

    await seedTestTenant({
      tenantId: tenantBId,
      slug: 'estudio-b',
      name: 'Estudio B',
      isDemo: false,
      mpConfigured: true,
      members: [
        createTenantMemberFixture({ uid: ownerBUid, email: ownerBEmail, role: 'owner' }),
      ],
      privateIntegrations: createTenantPrivateIntegrationsFixture({
        mpAccessToken: 'APP_USR-9999999999-tenant-b-secret',
        updatedByUid: ownerBUid,
      }),
    });

    await Promise.all([
      seedFirestoreDocument(`tenants/${tenantAId}/slots/slot1`, {
        tenantId: tenantAId,
        datetime: '2027-01-15T14:00:00.000Z',
        depositAmount: 5000,
        status: 'confirmed',
        clientData: { name: 'Cliente A', phone: '+5491100001111' },
      }),
      seedFirestoreDocument(`tenants/${tenantAId}/payment_attempts/att1`, {
        tenantId: tenantAId,
        tenantSlug: 'estudio-a',
        slotId: 'slot1',
        lockToken: 'secret-lock-token',
      }),
      seedFirestoreDocument(`tenants/${tenantAId}/payment_incidents/inc1`, {
        tenantId: tenantAId,
        tenantSlug: 'estudio-a',
        paymentId: 'pay_1',
        reason: 'amount_mismatch',
      }),
      seedFirestoreDocument(`tenants/${tenantAId}/services/srv1`, {
        name: 'Servicio A',
        basePrice: 12000,
        durationMinutes: 45,
      }),
      seedFirestoreDocument(`tenants/${tenantBId}/slots/slot1`, {
        tenantId: tenantBId,
        datetime: '2027-01-15T14:00:00.000Z',
        depositAmount: 6000,
        status: 'confirmed',
        clientData: { name: 'Cliente B Privado', phone: '+5491199998888' },
      }),
      seedFirestoreDocument(`tenants/${tenantBId}/payment_incidents/inc1`, {
        tenantId: tenantBId,
        tenantSlug: 'estudio-b',
        paymentId: 'pay_b',
        reason: 'slot_already_booked',
      }),
    ]);
  });

  describe('Firestore - Bootstrap público y anti-enumeración', () => {
    it('permite lectura puntual de /tenant_slugs/demo sin autenticación', async () => {
      const snap = await getDoc(doc(db, 'tenant_slugs', 'demo'));
      expect(snap.exists()).toBe(true);
      expect(snap.data()?.tenantId).toBe(demoTenantId);
    });

    it('bloquea listado (getDocs) de /tenant_slugs y /tenants a anónimos y a owners de tenant', async () => {
      await expect(getDocs(collection(db, 'tenant_slugs'))).rejects.toThrow();
      await expect(getDocs(collection(db, 'tenants'))).rejects.toThrow();

      await signInTestUserWithClaims(ownerAEmail, password);
      await expect(getDocs(collection(db, 'tenant_slugs'))).rejects.toThrow();
      await expect(getDocs(collection(db, 'tenants'))).rejects.toThrow();
    });

    it('permite a platformAdmin listar /tenants pero bloquea escrituras directas en /tenants y /tenant_slugs', async () => {
      await signInTestUserWithClaims(platformAdminEmail, password);

      const tenantsSnap = await getDocs(collection(db, 'tenants'));
      expect(tenantsSnap.size).toBeGreaterThanOrEqual(3);

      await expect(
        setDoc(doc(db, 'tenants', 'tnt_hack'), { slug: 'hack', status: 'active' })
      ).rejects.toThrow();
      await expect(
        setDoc(doc(db, 'tenant_slugs', 'hack'), { tenantId: 'tnt_hack', slug: 'hack' })
      ).rejects.toThrow();
    });

    it('permite lectura pública de recursos públicos del tenant pero bloquea PII y listados indebidos', async () => {
      const availSnap = await getDoc(doc(db, `tenants/${tenantAId}/public_meta/availability`));
      expect(availSnap.exists()).toBe(true);

      const profileSnap = await getDoc(doc(db, `tenants/${tenantAId}/ownerinfo/profile`));
      expect(profileSnap.exists()).toBe(true);

      const servicesSnap = await getDocs(collection(db, `tenants/${tenantAId}/services`));
      expect(servicesSnap.empty).toBe(false);

      await expect(getDocs(collection(db, `tenants/${tenantAId}/public_meta`))).rejects.toThrow();
      await expect(getDocs(collection(db, `tenants/${tenantAId}/ownerinfo`))).rejects.toThrow();
      await expect(getDocs(collection(db, `tenants/${tenantAId}/slots`))).rejects.toThrow();
    });

    it('restringe getDoc de /tenants/{tenantId} suspendido a miembros del tenant', async () => {
      await seedTestTenant({
        tenantId: 'tnt_paused',
        slug: 'pausado',
        status: 'suspended',
      });

      await expect(getDoc(doc(db, 'tenants', 'tnt_paused'))).rejects.toThrow();

      await signInTestUserWithClaims(platformAdminEmail, password);
      const snap = await getDoc(doc(db, 'tenants', 'tnt_paused'));
      expect(snap.exists()).toBe(true);
    });
  });

  describe('Firestore - Permisos del propio tenant (owner, staff, fallback y secretos)', () => {
    it('permite a ownerA leer slots e incidentes y editar services, portfolio y ownerinfo/profile', async () => {
      await signInTestUserWithClaims(ownerAEmail, password);

      const slotsSnap = await getDocs(collection(db, `tenants/${tenantAId}/slots`));
      expect(slotsSnap.size).toBe(1);

      const incidentsSnap = await getDocs(collection(db, `tenants/${tenantAId}/payment_incidents`));
      expect(incidentsSnap.size).toBe(1);

      await setDoc(doc(db, `tenants/${tenantAId}/services/s1`), {
        name: 'Nuevo Servicio A',
        basePrice: 15000,
        durationMinutes: 60,
      });

      await setDoc(doc(db, `tenants/${tenantAId}/portfolio/p1`), {
        title: 'Trabajo 1',
        category: 'Pestañas',
        imageUrl: 'https://example.com/p1.webp',
      });

      await updateDoc(doc(db, `tenants/${tenantAId}/ownerinfo/profile`), {
        businessName: 'Estudio A Renovado',
      });

      const updatedService = await getDoc(doc(db, `tenants/${tenantAId}/services/s1`));
      expect(updatedService.exists()).toBe(true);
    });

    it('bloquea escritura directa en slots, private_config y payment_attempts incluso para ownerA y platformAdmin', async () => {
      await signInTestUserWithClaims(ownerAEmail, password);

      await expect(
        setDoc(doc(db, `tenants/${tenantAId}/slots/slot1`), { status: 'available' })
      ).rejects.toThrow();
      await expect(
        updateDoc(doc(db, `tenants/${tenantAId}/slots/slot1`), { status: 'cancelled' })
      ).rejects.toThrow();
      await expect(
        deleteDoc(doc(db, `tenants/${tenantAId}/slots/slot1`))
      ).rejects.toThrow();

      await expect(
        getDoc(doc(db, `tenants/${tenantAId}/private_config/integrations`))
      ).rejects.toThrow();
      await expect(
        setDoc(doc(db, `tenants/${tenantAId}/private_config/integrations`), { mpAccessToken: 'x' })
      ).rejects.toThrow();

      await expect(
        getDoc(doc(db, `tenants/${tenantAId}/payment_attempts/att1`))
      ).rejects.toThrow();

      await signOutTestUser();
      await signInTestUserWithClaims(platformAdminEmail, password);
      await expect(
        getDoc(doc(db, `tenants/${tenantAId}/private_config/integrations`))
      ).rejects.toThrow();
      await expect(
        getDoc(doc(db, `tenants/${tenantAId}/payment_attempts/att1`))
      ).rejects.toThrow();
      await expect(
        setDoc(doc(db, `tenants/${tenantAId}/slots/slot2`), { status: 'available' })
      ).rejects.toThrow();
    });

    it('limita a staffA a lectura de slots y su propia membresía sin escritura de configuración', async () => {
      await signInTestUserWithClaims(staffAEmail, password);

      const slotsSnap = await getDocs(collection(db, `tenants/${tenantAId}/slots`));
      expect(slotsSnap.size).toBe(1);

      const ownMemberSnap = await getDoc(doc(db, `tenants/${tenantAId}/members/${staffAUid}`));
      expect(ownMemberSnap.exists()).toBe(true);

      await expect(
        setDoc(doc(db, `tenants/${tenantAId}/services/s-staff`), { name: 'No autorizado' })
      ).rejects.toThrow();
      await expect(
        updateDoc(doc(db, `tenants/${tenantAId}/ownerinfo/profile`), { businessName: 'Hack' })
      ).rejects.toThrow();
      await expect(
        getDocs(collection(db, `tenants/${tenantAId}/payment_incidents`))
      ).rejects.toThrow();
      await expect(
        getDocs(collection(db, `tenants/${tenantAId}/members`))
      ).rejects.toThrow();
    });

    it('respalda autorización mediante documento activo en members/{uid} si el JWT aún no trae claims', async () => {
      const pendingClaimEmail = 'fresh-owner@turnosweb.com';
      const cred = await createTestUser(pendingClaimEmail, password);
      await seedFirestoreDocument(
        `tenants/${tenantAId}/members/${cred.user.uid}`,
        createTenantMemberFixture({
          uid: cred.user.uid,
          email: pendingClaimEmail,
          role: 'owner',
          active: true,
        }) as unknown as Record<string, unknown>
      );

      await signInTestUser(pendingClaimEmail, password);
      const slotsSnap = await getDocs(collection(db, `tenants/${tenantAId}/slots`));
      expect(slotsSnap.size).toBe(1);

      // Al marcar active: false se revoca el acceso de inmediato
      await seedFirestoreDocument(
        `tenants/${tenantAId}/members/${cred.user.uid}`,
        createTenantMemberFixture({
          uid: cred.user.uid,
          email: pendingClaimEmail,
          role: 'owner',
          active: false,
        }) as unknown as Record<string, unknown>
      );

      await expect(getDocs(collection(db, `tenants/${tenantAId}/slots`))).rejects.toThrow();
    });
  });

  describe('Firestore - Aislamiento Cross-Tenant y bloqueo de colecciones legacy raíz', () => {
    it('bloquea a ownerA leer slots/incidentes o escribir catálogo/perfil de tenantB', async () => {
      await signInTestUserWithClaims(ownerAEmail, password);

      await expect(getDocs(collection(db, `tenants/${tenantBId}/slots`))).rejects.toThrow();
      await expect(
        getDocs(collection(db, `tenants/${tenantBId}/payment_incidents`))
      ).rejects.toThrow();
      await expect(
        setDoc(doc(db, `tenants/${tenantBId}/services/s1`), {
          name: 'Inyección Cross-Tenant',
          basePrice: 1,
        })
      ).rejects.toThrow();
      await expect(
        setDoc(doc(db, `tenants/${tenantBId}/portfolio/p1`), {
          title: 'Hack',
          category: 'Hack',
          imageUrl: 'https://example.com/hack.webp',
        })
      ).rejects.toThrow();
      await expect(
        setDoc(doc(db, `tenants/${tenantBId}/ownerinfo/profile`), {
          name: 'Hack',
        })
      ).rejects.toThrow();
    });

    it('bloquea cualquier lectura o escritura en colecciones raíz legacy', async () => {
      await Promise.all([
        seedFirestoreDocument('slots/legacy1', { status: 'available' }),
        seedFirestoreDocument('services/legacy1', { name: 'Legacy' }),
        seedFirestoreDocument('ownerinfo/profile', { name: 'Legacy Owner' }),
        seedFirestoreDocument('prices/legacy1', { name: 'Legacy Price' }),
        seedFirestoreDocument('public_slots/legacy1', { status: 'available' }),
      ]);

      // Anónimo
      await expect(getDocs(collection(db, 'slots'))).rejects.toThrow();
      await expect(getDocs(collection(db, 'services'))).rejects.toThrow();
      await expect(getDoc(doc(db, 'ownerinfo/profile'))).rejects.toThrow();
      await expect(getDocs(collection(db, 'prices'))).rejects.toThrow();
      await expect(getDocs(collection(db, 'public_slots'))).rejects.toThrow();

      // ownerA
      await signInTestUserWithClaims(ownerAEmail, password);
      await expect(getDocs(collection(db, 'slots'))).rejects.toThrow();
      await expect(
        setDoc(doc(db, 'services/hack'), { name: 'Legacy Write' })
      ).rejects.toThrow();

      // platformAdmin
      await signOutTestUser();
      await signInTestUserWithClaims(platformAdminEmail, password);
      await expect(getDocs(collection(db, 'slots'))).rejects.toThrow();
      await expect(getDocs(collection(db, 'services'))).rejects.toThrow();
      await expect(getDoc(doc(db, 'ownerinfo/profile'))).rejects.toThrow();
      await expect(
        setDoc(doc(db, 'ownerinfo/profile'), { name: 'Legacy Write' })
      ).rejects.toThrow();
    });
  });

  describe('Cloud Storage - Aislamiento por tenant, roles y restricciones de archivo', () => {
    const sampleBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);
    const svgBytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    it('permite a ownerA subir, leer públicamente y borrar imágenes bajo tenants/tnt_a/*', async () => {
      const storage = getStorageInstance();
      await signInTestUserWithClaims(ownerAEmail, password);

      const logoWebpRef = ref(storage, `tenants/${tenantAId}/logo/ok.webp`);
      await uploadBytes(logoWebpRef, sampleBytes, { contentType: 'image/webp' });

      const logoSvgRef = ref(storage, `tenants/${tenantAId}/logo/brand.svg`);
      await uploadBytes(logoSvgRef, svgBytes, { contentType: 'image/svg+xml' });

      // Lectura pública anónima permitida
      await signOutTestUser();
      const downloaded = await getBytes(logoWebpRef);
      expect(downloaded.byteLength).toBe(sampleBytes.byteLength);

      // Borrado permitido para ownerA
      await signInTestUserWithClaims(ownerAEmail, password);
      await deleteObject(logoWebpRef);
      await deleteObject(logoSvgRef);
    });

    it('rechaza SVG fuera de logo y archivos mayores a 5 MB', async () => {
      const storage = getStorageInstance();
      await signInTestUserWithClaims(ownerAEmail, password);

      const portfolioSvgRef = ref(storage, `tenants/${tenantAId}/portfolio/bad.svg`);
      await expect(
        uploadBytes(portfolioSvgRef, svgBytes, { contentType: 'image/svg+xml' })
      ).rejects.toThrow();

      const oversizedBytes = new Uint8Array(5 * 1024 * 1024 + 10);
      const hugeHeroRef = ref(storage, `tenants/${tenantAId}/hero/huge.webp`);
      await expect(
        uploadBytes(hugeHeroRef, oversizedBytes, { contentType: 'image/webp' })
      ).rejects.toThrow();
    });

    it('bloquea a ownerA subir o borrar en tenants/tnt_b/* y en rutas legacy raíz', async () => {
      const storage = getStorageInstance();
      await seedStorageObject(`tenants/${tenantBId}/logo/existing.webp`, sampleBytes, 'image/webp');
      await seedStorageObject('logo/legacy.webp', sampleBytes, 'image/webp');

      await signInTestUserWithClaims(ownerAEmail, password);

      // Subida cross-tenant denegada
      const crossUploadRef = ref(storage, `tenants/${tenantBId}/logo/x.webp`);
      await expect(
        uploadBytes(crossUploadRef, sampleBytes, { contentType: 'image/webp' })
      ).rejects.toThrow();

      // Borrado cross-tenant denegado
      const crossDeleteRef = ref(storage, `tenants/${tenantBId}/logo/existing.webp`);
      await expect(deleteObject(crossDeleteRef)).rejects.toThrow();

      // Subida y borrado en ruta legacy raíz denegados
      const legacyUploadRef = ref(storage, 'logo/x.webp');
      await expect(
        uploadBytes(legacyUploadRef, sampleBytes, { contentType: 'image/webp' })
      ).rejects.toThrow();

      const legacyDeleteRef = ref(storage, 'logo/legacy.webp');
      await expect(deleteObject(legacyDeleteRef)).rejects.toThrow();
    });

    it('bloquea subidas de staffA en Storage', async () => {
      const storage = getStorageInstance();
      await signInTestUserWithClaims(staffAEmail, password);

      const staffRef = ref(storage, `tenants/${tenantAId}/logo/staff.webp`);
      await expect(
        uploadBytes(staffRef, sampleBytes, { contentType: 'image/webp' })
      ).rejects.toThrow();
    });
  });
});
