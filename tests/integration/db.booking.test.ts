import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  createSlot,
  assignSlotManually,
  subscribeToAvailableSlots,
  subscribeToAllSlots,
} from '../../src/services/db';
import { initTestEmulators } from '../setup/emulatorConfig';
import { setupAuthenticatedAdmin } from '../setup/testEnvironment';
import { createSlotDataFixture, createClientDataFixture } from '../setup/fixtures';

describe('Integración - db.ts (Suscripciones reactivas de turnos)', () => {
  beforeAll(() => {
    initTestEmulators();
  });

  beforeEach(async () => {
    await setupAuthenticatedAdmin();
  });

  it('subscribeToAvailableSlots filtra turnos pasados o confirmados y sólo emite turnos disponibles a futuro', async () => {
    // Turno a futuro (dentro de 10 días)
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const futureSlotId = await createSlot(
      createSlotDataFixture({ datetime: futureDate })
    );

    // Turno pasado (hace 2 días)
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    await createSlot(
      createSlotDataFixture({ datetime: pastDate })
    );

    const availableSlots: any[] = await new Promise((resolve) => {
      const unsub = subscribeToAvailableSlots((slots) => {
        if (slots.length > 0) {
          unsub();
          resolve(slots);
        }
      });
    });

    // El turno pasado no debe mostrarse a los clientes
    expect(availableSlots).toHaveLength(1);
    expect(availableSlots[0].id).toBe(futureSlotId);
  });

  it('subscribeToAllSlots entrega la lista completa de turnos para el panel de administración', async () => {
    const d1 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const d2 = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

    const id1 = await createSlot(createSlotDataFixture({ datetime: d1 }));
    const id2 = await createSlot(createSlotDataFixture({ datetime: d2 }));

    // Confirmamos uno
    await assignSlotManually(id1, createClientDataFixture());

    const allSlots: any[] = await new Promise((resolve) => {
      const unsub = subscribeToAllSlots((slots) => {
        if (slots.length >= 2) {
          unsub();
          resolve(slots);
        }
      });
    });

    expect(allSlots).toHaveLength(2);
    const confirmedSlot = allSlots.find((s) => s.id === id1);
    const availableSlot = allSlots.find((s) => s.id === id2);

    expect(confirmedSlot?.status).toBe('confirmed');
    expect(availableSlot?.status).toBe('available');
  });
});
