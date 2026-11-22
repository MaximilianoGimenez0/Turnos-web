import { describe, it, expect, vi } from 'vitest';
import type * as admin from 'firebase-admin';
import {
  cleanupPastSlotsMaintenance,
  retryPendingBookingEmails,
} from '../../functions/src/cronJobs';

interface FakeDoc {
  id: string;
  data: Record<string, unknown>;
}

const createQueryMockDb = (docs: FakeDoc[]) => {
  const whereCalls: Array<[string, string, unknown]> = [];
  const batchDeletes: string[] = [];
  const batchUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];
  let getCallCount = 0;

  const queryObj = {
    where: vi.fn((field: string, op: string, value: unknown) => {
      whereCalls.push([field, op, value]);
      return queryObj;
    }),
    get: vi.fn(async () => {
      getCallCount++;
      return {
        empty: docs.length === 0,
        docs: docs.map((d) => ({
          id: d.id,
          ref: { id: d.id },
          data: () => d.data,
        })),
      };
    }),
  };

  const batchObj = {
    delete: vi.fn((ref: { id: string }) => {
      batchDeletes.push(ref.id);
    }),
    update: vi.fn((ref: { id: string }, data: Record<string, unknown>) => {
      batchUpdates.push({ id: ref.id, data });
    }),
    set: vi.fn(),
    commit: vi.fn(async () => {}),
  };

  const fakeDb = {
    collection: vi.fn(() => queryObj),
    batch: vi.fn(() => batchObj),
  } as unknown as admin.firestore.Firestore;

  return {
    fakeDb,
    whereCalls,
    batchDeletes,
    batchUpdates,
    getQueryCallCount: () => getCallCount,
    batchCommitMock: batchObj.commit,
  };
};

describe('Cron jobs unificados con operador in (OPT-04)', () => {
  it('cleanupPastSlotsMaintenance ejecuta 1 sola query in y clasifica correctamente cada estado', async () => {
    const nowMs = new Date('2026-11-22T16:00:00.000Z').getTime();
    const mock = createQueryMockDb([
      {
        id: 'avail-past',
        data: { status: 'available', datetime: '2026-11-22T14:00:00.000Z' },
      },
      {
        id: 'conflict-past',
        data: { status: 'conflict', datetime: '2026-11-22T14:30:00.000Z' },
      },
      {
        id: 'confirmed-ended',
        data: {
          status: 'confirmed',
          datetime: '2026-11-22T13:00:00.000Z',
          endDatetime: '2026-11-22T14:30:00.000Z',
        },
      },
      {
        id: 'confirmed-ongoing',
        data: {
          status: 'confirmed',
          datetime: '2026-11-22T15:30:00.000Z',
          endDatetime: '2026-11-22T17:00:00.000Z',
        },
      },
      {
        id: 'cancelled-past',
        data: { status: 'cancelled', datetime: '2026-11-22T12:00:00.000Z' },
      },
    ]);

    const result = await cleanupPastSlotsMaintenance(mock.fakeDb, nowMs);

    expect(mock.getQueryCallCount()).toBe(1);
    expect(mock.whereCalls[0]).toEqual([
      'status',
      'in',
      ['available', 'conflict', 'confirmed', 'cancelled'],
    ]);
    expect(mock.whereCalls[1]).toEqual(['datetime', '<=', '2026-11-22T16:00:00.000Z']);

    expect(result).toEqual({
      deletedPastAvailableCount: 2,
      markedPastConfirmedCount: 1,
      markedPastCancelledCount: 1,
    });
    expect(mock.batchDeletes).toEqual(['avail-past', 'conflict-past']);
    expect(mock.batchUpdates).toEqual([
      {
        id: 'confirmed-ended',
        data: expect.objectContaining({ status: 'past', pastOutcome: 'completed' }),
      },
      {
        id: 'cancelled-past',
        data: expect.objectContaining({ status: 'past', pastOutcome: 'cancelled' }),
      },
    ]);
    expect(mock.batchCommitMock).toHaveBeenCalledTimes(1);
  });

  it('retryPendingBookingEmails ejecuta 1 sola query in cuando está en reposo o sin candidatos válidos', async () => {
    const nowMs = new Date('2026-11-22T16:00:00.000Z').getTime();
    const mock = createQueryMockDb([
      // Aún en processing reciente (< 2 min): debe omitirse
      {
        id: 'slot-recent-processing',
        data: {
          status: 'confirmed',
          emailStatus: 'processing',
          emailAttempts: 1,
          emailProcessingAt: '2026-11-22T15:59:30.000Z',
          updatedAt: '2026-11-22T15:59:30.000Z',
        },
      },
      // Ya alcanzó el máximo de 3 intentos: debe omitirse
      {
        id: 'slot-max-attempts',
        data: {
          status: 'confirmed',
          emailStatus: 'failed',
          emailAttempts: 3,
          updatedAt: '2026-11-22T15:00:00.000Z',
        },
      },
    ]);

    const result = await retryPendingBookingEmails(mock.fakeDb, nowMs);

    expect(mock.getQueryCallCount()).toBe(1);
    expect(mock.whereCalls[0]).toEqual([
      'emailStatus',
      'in',
      ['failed', 'partial', 'processing'],
    ]);
    expect(result).toEqual({ retriedCount: 0, sentCount: 0, failedCount: 0 });
  });
});
