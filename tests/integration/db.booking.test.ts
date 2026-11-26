import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  createSlot,
  assignSlotManually,
  subscribeToAvailableSlots,
  subscribeToAllSlots,
  type AvailableSlotsSnapshot,
} from '../../src/services/db';
import { initTestEmulators } from '../setup/emulatorConfig';
import {
  createTestUserWithClaims,
  resetTestEnvironment,
  seedFirestoreDocument,
  seedTestTenant,
  signInTestUserWithClaims,
  signOutTestUser,
} from '../setup/testEnvironment';
import {
  createSlotDataFixture,
  createClientDataFixture,
  createTenantMemberFixture,
} from '../setup/fixtures';
import type { Slot } from '../../src/types';

const futureIso = (daysFromNow: number, hourUtc = 14): string => {
  const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d.toISOString();
};

describe('Integración - db.ts (Suscripciones reactivas multi-tenant de turnos)', () => {
  const password = 'Password123!';
  const tenantAId = 'tnt_booka';
  const tenantBId = 'tnt_bookb';
  const ownerAEmail = 'owner-book-a@turneado.app';
  const ownerBEmail = 'owner-book-b@turneado.app';

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
      slug: 'estudio-book-a',
      name: 'Estudio Book A',
      members: [createTenantMemberFixture({ uid: ownerA.uid, email: ownerAEmail, role: 'owner' })],
    });

    await seedTestTenant({
      tenantId: tenantBId,
      slug: 'estudio-book-b',
      name: 'Estudio Book B',
      members: [createTenantMemberFixture({ uid: ownerB.uid, email: ownerBEmail, role: 'owner' })],
    });
  });

  it('subscribeToAvailableSlots filtra turnos pasados o confirmados, emite futuros disponibles y nunca mezcla tenants', async () => {
    const futureA = futureIso(10, 14);
    const futureB = futureIso(10, 16);
    const pastIso = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    await signInTestUserWithClaims(ownerAEmail, password);
    const futureSlotAId = await createSlot(
      tenantAId,
      createSlotDataFixture({ datetime: futureA })
    );

    // Seed a past slot directly in tenantA availability alongside future slot to verify client filtering
    await seedFirestoreDocument(`tenants/${tenantAId}/public_meta/availability`, {
      slots: {
        [futureSlotAId]: {
          datetime: futureA,
          depositAmount: 5000,
          serviceName: 'Lifting de Pestañas',
          status: 'available',
          estimatedDurationMinutes: 60,
        },
        'past-slot-a': {
          datetime: pastIso,
          depositAmount: 5000,
          serviceName: 'Turno Pasado',
          status: 'available',
          estimatedDurationMinutes: 60,
        },
      },
      updatedAt: new Date().toISOString(),
    });

    await signInTestUserWithClaims(ownerBEmail, password);
    const futureSlotBId = await createSlot(
      tenantBId,
      createSlotDataFixture({ datetime: futureB })
    );

    await seedFirestoreDocument(`tenants/${tenantBId}/public_meta/availability`, {
      slots: {
        [futureSlotBId]: {
          datetime: futureB,
          depositAmount: 7000,
          serviceName: 'Servicio Exclusivo B',
          status: 'available',
          estimatedDurationMinutes: 60,
        },
      },
      updatedAt: new Date().toISOString(),
    });

    // Public anonymous visitor listening on tenantA
    await signOutTestUser();

    const snapshotA: AvailableSlotsSnapshot = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout esperando availability de tenantA')), 8000);
      const unsub = subscribeToAvailableSlots(
        tenantAId,
        (payload) => {
          if (payload.availableSlots.length > 0) {
            clearTimeout(timeout);
            unsub();
            resolve(payload);
          }
        },
        (err) => {
          clearTimeout(timeout);
          unsub();
          reject(err);
        }
      );
    });

    expect(snapshotA.availableSlots).toHaveLength(1);
    expect(snapshotA.availableSlots[0].id).toBe(futureSlotAId);
    expect(snapshotA.availableSlots.some((s) => s.id === futureSlotBId)).toBe(false);
    expect(snapshotA.availableSlots.some((s) => s.id === 'past-slot-a')).toBe(false);
  });

  it('subscribeToAllSlots entrega la lista completa de turnos del tenant autenticado sin datos de otro tenant', async () => {
    await signInTestUserWithClaims(ownerBEmail, password);
    const slotBId = await createSlot(
      tenantBId,
      createSlotDataFixture({ datetime: futureIso(5, 12) })
    );

    await signInTestUserWithClaims(ownerAEmail, password);
    const id1 = await createSlot(
      tenantAId,
      createSlotDataFixture({ datetime: futureIso(5, 14) })
    );
    const id2 = await createSlot(
      tenantAId,
      createSlotDataFixture({ datetime: futureIso(6, 15) })
    );

    await assignSlotManually(tenantAId, id1, createClientDataFixture());

    const allSlotsA: Slot[] = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout esperando subscribeToAllSlots')), 8000);
      const unsub = subscribeToAllSlots(
        tenantAId,
        (slots) => {
          if (slots.length >= 2) {
            clearTimeout(timeout);
            unsub();
            resolve(slots);
          }
        },
        (err) => {
          clearTimeout(timeout);
          unsub();
          reject(err);
        }
      );
    });

    expect(allSlotsA).toHaveLength(2);
    expect(allSlotsA.some((s) => s.id === slotBId)).toBe(false);
    expect(allSlotsA.find((s) => s.id === id1)?.status).toBe('confirmed');
    expect(allSlotsA.find((s) => s.id === id2)?.status).toBe('available');
  });
});
