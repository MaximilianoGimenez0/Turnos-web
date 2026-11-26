import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  createSlot,
  createMultipleSlots,
  assignSlotManually,
  cancelSlot,
  releaseSlot,
  deleteSlot,
  fetchAllSlotsOnce,
} from '../../src/services/db';
import { initTestEmulators } from '../setup/emulatorConfig';
import {
  createTestUserWithClaims,
  resetTestEnvironment,
  seedTestTenant,
  signInTestUserWithClaims,
  signOutTestUser,
} from '../setup/testEnvironment';
import {
  createSlotDataFixture,
  createClientDataFixture,
  createTenantMemberFixture,
} from '../setup/fixtures';

const futureIso = (daysFromNow: number, hourUtc = 14, minuteUtc = 0): string => {
  const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  d.setUTCHours(hourUtc, minuteUtc, 0, 0);
  return d.toISOString();
};

describe('Integración - db.ts (Gestión Multi-Tenant de Slots y Conflictos en Firestore)', () => {
  const password = 'Password123!';
  const tenantAId = 'tnt_slotsa';
  const tenantBId = 'tnt_slotsb';
  const ownerAEmail = 'owner-slots-a@turnosweb.com';
  const ownerBEmail = 'owner-slots-b@turnosweb.com';

  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await resetTestEnvironment();

    const ownerA = await createTestUserWithClaims(ownerAEmail, password, {
      tenants: { [tenantAId]: 'owner' },
    });
    const ownerB = await createTestUserWithClaims(ownerBEmail, password, {
      tenants: { [tenantBId]: 'owner' },
    });

    await signOutTestUser();

    await seedTestTenant({
      tenantId: tenantAId,
      slug: 'estudio-slots-a',
      name: 'Estudio Slots A',
      members: [createTenantMemberFixture({ uid: ownerA.uid, email: ownerAEmail, role: 'owner' })],
    });

    await seedTestTenant({
      tenantId: tenantBId,
      slug: 'estudio-slots-b',
      name: 'Estudio Slots B',
      members: [createTenantMemberFixture({ uid: ownerB.uid, email: ownerBEmail, role: 'owner' })],
    });

    await signInTestUserWithClaims(ownerAEmail, password);
  });

  describe('createSlot', () => {
    it('crea un turno con status available bajo /tenants/{tenantId}/slots', async () => {
      const slotData = createSlotDataFixture({
        datetime: futureIso(10, 13, 0),
        depositAmount: 5000,
      });

      const slotId = await createSlot(tenantAId, slotData);
      expect(slotId).toBeTruthy();

      const slots = await fetchAllSlotsOnce(tenantAId);
      expect(slots).toHaveLength(1);
      expect(slots[0].id).toBe(slotId);
      expect(slots[0].tenantId).toBe(tenantAId);
      expect(slots[0].status).toBe('available');
      expect(slots[0].depositAmount).toBe(5000);
      expect(slots[0].clientData).toBeNull();
    });

    it('falla al crear un turno con horario exactamente duplicado dentro del mismo tenant', async () => {
      const slotData = createSlotDataFixture({
        datetime: futureIso(11, 14, 0),
      });
      await createSlot(tenantAId, slotData);

      await expect(createSlot(tenantAId, slotData)).rejects.toThrow(
        'Ya existe un turno creado en uno de los horarios seleccionados.'
      );
    });

    it('falla si no se le asigna ningún servicio al turno', async () => {
      const slotWithoutServices = createSlotDataFixture({
        datetime: futureIso(12, 14, 0),
        services: [],
      });

      await expect(createSlot(tenantAId, slotWithoutServices)).rejects.toThrow(
        'No se puede crear turnos sin asignar al menos un servicio.'
      );
    });
  });

  describe('createMultipleSlots (Creación masiva en lote)', () => {
    it('crea múltiples turnos atómicamente vía Cloud Function', async () => {
      const list = [
        createSlotDataFixture({ datetime: futureIso(13, 12, 0) }),
        createSlotDataFixture({ datetime: futureIso(13, 13, 30) }),
        createSlotDataFixture({ datetime: futureIso(13, 15, 0) }),
      ];

      const ids = await createMultipleSlots(tenantAId, list);
      expect(ids).toHaveLength(3);

      const all = await fetchAllSlotsOnce(tenantAId);
      expect(all).toHaveLength(3);
    });

    it('rechaza si la lista contiene horarios duplicados internamente', async () => {
      const dupDatetime = futureIso(14, 12, 0);
      const listWithDups = [
        createSlotDataFixture({ datetime: dupDatetime }),
        createSlotDataFixture({ datetime: dupDatetime }),
      ];

      await expect(createMultipleSlots(tenantAId, listWithDups)).rejects.toThrow(
        'La lista contiene horarios duplicados.'
      );
    });
  });

  describe('assignSlotManually y cascada de conflictos', () => {
    it('asigna un turno manualmente y marca en status conflict a los turnos superpuestos', async () => {
      const slot10Id = await createSlot(
        tenantAId,
        createSlotDataFixture({
          datetime: futureIso(15, 13, 0),
          estimatedDurationMinutes: 90,
        })
      );
      const overlappingSlotId = await createSlot(
        tenantAId,
        createSlotDataFixture({
          datetime: futureIso(15, 13, 45),
          estimatedDurationMinutes: 60,
        })
      );
      const freeSlotId = await createSlot(
        tenantAId,
        createSlotDataFixture({
          datetime: futureIso(15, 15, 0),
          estimatedDurationMinutes: 60,
        })
      );

      const client = createClientDataFixture({
        name: 'Mariana Gomez',
        estimatedDurationMinutes: 90,
        selectedServices: ['Lifting de Pestañas'],
      });

      await assignSlotManually(tenantAId, slot10Id, client);

      const allSlots = await fetchAllSlotsOnce(tenantAId);
      const confirmed = allSlots.find((s) => s.id === slot10Id);
      const conflicted = allSlots.find((s) => s.id === overlappingSlotId);
      const free = allSlots.find((s) => s.id === freeSlotId);

      expect(confirmed?.status).toBe('confirmed');
      expect(confirmed?.clientData?.name).toBe('Mariana Gomez');
      expect(confirmed?.paymentStatus).toBe('manual_admin');

      expect(conflicted?.status).toBe('conflict');
      expect(free?.status).toBe('available');
    });

    it('rechaza asignar un turno si el cliente no tiene nombre', async () => {
      const slotId = await createSlot(
        tenantAId,
        createSlotDataFixture({ datetime: futureIso(16, 15, 0) })
      );

      const invalidClient = createClientDataFixture({ name: '   ' });
      await expect(assignSlotManually(tenantAId, slotId, invalidClient)).rejects.toThrow(
        'El nombre del cliente es obligatorio para asignar el turno.'
      );
    });
  });

  describe('cancelSlot y reactivación de turnos', () => {
    it('cancela un turno confirmado y reactiva automáticamente los turnos que estaban en conflicto', async () => {
      const confirmedId = await createSlot(
        tenantAId,
        createSlotDataFixture({
          datetime: futureIso(17, 13, 0),
          estimatedDurationMinutes: 120,
        })
      );
      const conflictId = await createSlot(
        tenantAId,
        createSlotDataFixture({
          datetime: futureIso(17, 13, 30),
          estimatedDurationMinutes: 45,
        })
      );

      await assignSlotManually(
        tenantAId,
        confirmedId,
        createClientDataFixture({ estimatedDurationMinutes: 120 })
      );

      let slots = await fetchAllSlotsOnce(tenantAId);
      expect(slots.find((s) => s.id === conflictId)?.status).toBe('conflict');

      await cancelSlot(tenantAId, confirmedId);

      slots = await fetchAllSlotsOnce(tenantAId);
      expect(slots.find((s) => s.id === confirmedId)?.status).toBe('cancelled');
      expect(slots.find((s) => s.id === conflictId)?.status).toBe('available');
    });
  });

  describe('releaseSlot, deleteSlot y aislamiento cross-tenant', () => {
    it('releaseSlot libera el turno a available y limpia los datos de reserva', async () => {
      const slotId = await createSlot(
        tenantAId,
        createSlotDataFixture({ datetime: futureIso(18, 16, 0) })
      );

      await assignSlotManually(tenantAId, slotId, createClientDataFixture());
      await releaseSlot(tenantAId, slotId);

      const slots = await fetchAllSlotsOnce(tenantAId);
      const target = slots.find((s) => s.id === slotId);
      expect(target?.status).toBe('available');
      expect(target?.clientData).toBeNull();
    });

    it('deleteSlot elimina físicamente el documento de Firestore', async () => {
      const slotId = await createSlot(
        tenantAId,
        createSlotDataFixture({ datetime: futureIso(19, 17, 0) })
      );

      let slots = await fetchAllSlotsOnce(tenantAId);
      expect(slots).toHaveLength(1);

      await deleteSlot(tenantAId, slotId);

      slots = await fetchAllSlotsOnce(tenantAId);
      expect(slots).toHaveLength(0);
    });

    it('aísla los turnos entre tenantA y tenantB permitiendo incluso horarios idénticos', async () => {
      const sameDatetime = futureIso(20, 15, 0);
      const slotAId = await createSlot(tenantAId, createSlotDataFixture({ datetime: sameDatetime }));

      await signInTestUserWithClaims(ownerBEmail, password);
      const slotBId = await createSlot(tenantBId, createSlotDataFixture({ datetime: sameDatetime }));

      const slotsB = await fetchAllSlotsOnce(tenantBId);
      expect(slotsB.map((s) => s.id)).toEqual([slotBId]);
      expect(slotsB.some((s) => s.id === slotAId)).toBe(false);

      await signInTestUserWithClaims(ownerAEmail, password);
      const slotsA = await fetchAllSlotsOnce(tenantAId);
      expect(slotsA.map((s) => s.id)).toEqual([slotAId]);
      expect(slotsA.some((s) => s.id === slotBId)).toBe(false);
    });

    it('crea slot con recargo, calcula recargo autoritativo al asignar y preserva surcharge al liberar', async () => {
      const slotId = await createSlot(
        tenantAId,
        createSlotDataFixture({
          datetime: futureIso(21, 16, 0),
          depositAmount: 5000,
          services: [
            {
              id: 'srv-1',
              name: 'Lifting de Pestañas',
              basePrice: 20000,
              durationMinutes: 60,
              extras: [{ id: 'ex-1', name: 'Tinte', price: 3000 }],
            },
          ],
          surcharge: { type: 'percentage', value: 20, reason: 'Feriado' },
        })
      );

      let slots = await fetchAllSlotsOnce(tenantAId);
      const created = slots.find((s) => s.id === slotId);
      expect(created?.surcharge).toEqual({ type: 'percentage', value: 20, reason: 'Feriado' });

      await assignSlotManually(
        tenantAId,
        slotId,
        createClientDataFixture({
          name: 'Carla Díaz',
          bookedServices: [
            {
              serviceId: 'srv-1',
              name: 'Lifting de Pestañas',
              basePrice: 1,
              durationMinutes: 60,
              extras: [{ id: 'ex-1', name: 'Tinte', price: 1, selected: true }],
            },
          ],
        })
      );

      slots = await fetchAllSlotsOnce(tenantAId);
      const assigned = slots.find((s) => s.id === slotId);
      expect(assigned?.status).toBe('confirmed');
      expect(assigned?.clientData?.surchargeAmount).toBe(4600);
      expect(assigned?.clientData?.estimatedPrice).toBe(27600);

      await releaseSlot(tenantAId, slotId);
      slots = await fetchAllSlotsOnce(tenantAId);
      const released = slots.find((s) => s.id === slotId);
      expect(released?.status).toBe('available');
      expect(released?.clientData).toBeNull();
      expect(released?.surcharge).toEqual({ type: 'percentage', value: 20, reason: 'Feriado' });
    });
  });
});
