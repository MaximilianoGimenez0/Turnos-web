import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  createSlot,
  createMultipleSlots,
  assignSlotManually,
  cancelSlot,
  releaseSlot,
  deleteSlot,
  getAllSlotsAsync,
} from '../../src/services/db';
import { initTestEmulators } from '../setup/emulatorConfig';
import { setupAuthenticatedAdmin } from '../setup/testEnvironment';
import { createSlotDataFixture, createClientDataFixture } from '../setup/fixtures';

describe('Integración - db.ts (Gestión de Slots y Conflictos en Firestore)', () => {
  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await setupAuthenticatedAdmin();
  });

  describe('createSlot', () => {
    it('crea un turno con status available en Firestore', async () => {
      const slotData = createSlotDataFixture({
        datetime: '2026-11-20T10:00:00.000Z',
        depositAmount: 5000,
      });

      const slotId = await createSlot(slotData);
      expect(slotId).toBeTruthy();

      const slots = await getAllSlotsAsync();
      expect(slots).toHaveLength(1);
      expect(slots[0].id).toBe(slotId);
      expect(slots[0].status).toBe('available');
      expect(slots[0].depositAmount).toBe(5000);
      expect(slots[0].clientData).toBeNull();
    });

    it('falla al crear un turno con horario exactamente duplicado', async () => {
      const slotData = createSlotDataFixture({
        datetime: '2026-11-20T10:00:00.000Z',
      });
      await createSlot(slotData);

      await expect(createSlot(slotData)).rejects.toThrow(
        'Ya existe un turno creado en el horario seleccionado.'
      );
    });

    it('falla si no se le asigna ningún servicio al turno', async () => {
      const slotWithoutServices = createSlotDataFixture({
        services: [],
      });

      await expect(createSlot(slotWithoutServices)).rejects.toThrow(
        'No se puede crear el turno sin asignar al menos un servicio.'
      );
    });
  });

  describe('createMultipleSlots (Creación masiva en lote)', () => {
    it('crea múltiples turnos atómicamente vía batch', async () => {
      const list = [
        createSlotDataFixture({ datetime: '2026-11-21T09:00:00.000Z' }),
        createSlotDataFixture({ datetime: '2026-11-21T10:30:00.000Z' }),
        createSlotDataFixture({ datetime: '2026-11-21T12:00:00.000Z' }),
      ];

      const ids = await createMultipleSlots(list);
      expect(ids).toHaveLength(3);

      const all = await getAllSlotsAsync();
      expect(all).toHaveLength(3);
    });

    it('rechaza si la lista contiene horarios duplicados internamente', async () => {
      const listWithDups = [
        createSlotDataFixture({ datetime: '2026-11-21T09:00:00.000Z' }),
        createSlotDataFixture({ datetime: '2026-11-21T09:00:00.000Z' }),
      ];

      await expect(createMultipleSlots(listWithDups)).rejects.toThrow(
        'La lista contiene horarios duplicados.'
      );
    });
  });

  describe('assignSlotManually y cascada de conflictos', () => {
    it('asigna un turno manualmente y marca en status conflict a los turnos superpuestos', async () => {
      // Creamos un turno a las 10:00 con duración 90 min (10:00 - 11:30)
      const slot10Id = await createSlot(
        createSlotDataFixture({
          datetime: '2026-11-22T10:00:00.000Z',
          estimatedDurationMinutes: 90,
        })
      );
      // Creamos un turno disponible que solapa a las 10:45 (10:45 - 11:45)
      const overlappingSlotId = await createSlot(
        createSlotDataFixture({
          datetime: '2026-11-22T10:45:00.000Z',
          estimatedDurationMinutes: 60,
        })
      );
      // Creamos un turno libre a las 12:00 (no solapa)
      const freeSlotId = await createSlot(
        createSlotDataFixture({
          datetime: '2026-11-22T12:00:00.000Z',
          estimatedDurationMinutes: 60,
        })
      );

      const client = createClientDataFixture({
        name: 'Mariana Gomez',
        estimatedDurationMinutes: 90,
        selectedServices: ['Lifting de Pestañas'],
      });

      await assignSlotManually(slot10Id, client);

      const allSlots = await getAllSlotsAsync();
      const confirmed = allSlots.find((s) => s.id === slot10Id);
      const conflicted = allSlots.find((s) => s.id === overlappingSlotId);
      const free = allSlots.find((s) => s.id === freeSlotId);

      expect(confirmed?.status).toBe('confirmed');
      expect(confirmed?.clientData?.name).toBe('Mariana Gomez');
      expect(confirmed?.paymentStatus).toBe('manual_admin');

      expect(conflicted?.status).toBe('conflict');
      expect(free?.status).toBe('available');
    });

    it('rechaza asignar un turno si el cliente no tiene nombre o servicio', async () => {
      const slotId = await createSlot(
        createSlotDataFixture({ datetime: '2026-11-22T15:00:00.000Z' })
      );

      const invalidClient = createClientDataFixture({ name: '   ' });
      await expect(assignSlotManually(slotId, invalidClient)).rejects.toThrow(
        'El nombre del cliente es obligatorio para asignar el turno.'
      );
    });
  });

  describe('cancelSlot y reactivación de turnos', () => {
    it('cancela un turno confirmado y reactiva automáticamente los turnos que estaban en conflicto', async () => {
      const confirmedId = await createSlot(
        createSlotDataFixture({
          datetime: '2026-11-23T10:00:00.000Z',
          estimatedDurationMinutes: 120,
        })
      );
      const conflictId = await createSlot(
        createSlotDataFixture({
          datetime: '2026-11-23T10:30:00.000Z',
          estimatedDurationMinutes: 45,
        })
      );

      await assignSlotManually(
        confirmedId,
        createClientDataFixture({ estimatedDurationMinutes: 120 })
      );

      let slots = await getAllSlotsAsync();
      expect(slots.find((s) => s.id === conflictId)?.status).toBe('conflict');

      // Ahora cancelamos el turno confirmado
      await cancelSlot(confirmedId);

      slots = await getAllSlotsAsync();
      expect(slots.find((s) => s.id === confirmedId)?.status).toBe('cancelled');
      // El turno que estaba bloqueado vuelve a available
      expect(slots.find((s) => s.id === conflictId)?.status).toBe('available');
    });
  });

  describe('releaseSlot y deleteSlot', () => {
    it('releaseSlot libera el turno a available y limpia los datos de reserva', async () => {
      const slotId = await createSlot(
        createSlotDataFixture({ datetime: '2026-11-24T16:00:00.000Z' })
      );

      await assignSlotManually(slotId, createClientDataFixture());
      await releaseSlot(slotId);

      const slots = await getAllSlotsAsync();
      const target = slots.find((s) => s.id === slotId);
      expect(target?.status).toBe('available');
      expect(target?.clientData).toBeNull();
    });

    it('deleteSlot elimina físicamente el documento de Firestore', async () => {
      const slotId = await createSlot(
        createSlotDataFixture({ datetime: '2026-11-24T17:00:00.000Z' })
      );

      let slots = await getAllSlotsAsync();
      expect(slots).toHaveLength(1);

      await deleteSlot(slotId);

      slots = await getAllSlotsAsync();
      expect(slots).toHaveLength(0);
    });
  });
});
