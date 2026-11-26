import { describe, it, expect, vi } from 'vitest';
import type * as admin from 'firebase-admin';
import {
  cleanupPastSlotsMaintenance,
  processExpiredSlots,
  retryPendingBookingEmails,
} from '../../functions/src/cronJobs';

interface FakeTenantSlotDoc {
  tenantId: string;
  id: string;
  data: Record<string, unknown>;
}

const createTenantSlotRef = (
  tenantId: string,
  id: string,
  onUpdate?: (tenantId: string, id: string, data: Record<string, unknown>) => void,
  onDelete?: (tenantId: string, id: string) => void
) => ({
  id,
  path: `tenants/${tenantId}/slots/${id}`,
  parent: {
    id: 'slots',
    parent: {
      id: tenantId,
      parent: { id: 'tenants' },
    },
  },
  update: vi.fn(async (data: Record<string, unknown>) => {
    onUpdate?.(tenantId, id, data);
  }),
  delete: vi.fn(async () => {
    onDelete?.(tenantId, id);
  }),
  set: vi.fn(async () => {}),
});

const createCollectionGroupMockDb = (
  groupDocs: FakeTenantSlotDoc[],
  confirmedByTenant: Record<string, FakeTenantSlotDoc[]> = {}
) => {
  const whereCalls: Array<[string, string, unknown]> = [];
  const limitCalls: number[] = [];
  const batchDeletes: string[] = [];
  const batchUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];
  const directUpdates: Array<{ tenantId: string; id: string; data: Record<string, unknown> }> = [];
  const directDeletes: Array<{ tenantId: string; id: string }> = [];
  let groupQueryCount = 0;

  const groupQueryObj = {
    where: vi.fn((field: string, op: string, value: unknown) => {
      whereCalls.push([field, op, value]);
      return groupQueryObj;
    }),
    limit: vi.fn((n: number) => {
      limitCalls.push(n);
      return groupQueryObj;
    }),
    get: vi.fn(async () => {
      groupQueryCount++;
      return {
        empty: groupDocs.length === 0,
        docs: groupDocs.map((d) => ({
          id: d.id,
          updateTime: { seconds: 100, nanoseconds: 0 },
          ref: createTenantSlotRef(
            d.tenantId,
            d.id,
            (tId, docId, data) => directUpdates.push({ tenantId: tId, id: docId, data }),
            (tId, docId) => directDeletes.push({ tenantId: tId, id: docId })
          ),
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
    collectionGroup: vi.fn(() => groupQueryObj),
    collection: vi.fn((rootName: string) => ({
      doc: (tenantId: string) => ({
        collection: (subName: string) => {
          const tenantSlots =
            rootName === 'tenants' && subName === 'slots'
              ? confirmedByTenant[tenantId] || []
              : [];
          const subQuery = {
            where: vi.fn(() => subQuery),
            get: vi.fn(async () => ({
              empty: tenantSlots.length === 0,
              docs: tenantSlots.map((d) => ({
                id: d.id,
                data: () => d.data,
              })),
            })),
          };
          return subQuery;
        },
      }),
    })),
    batch: vi.fn(() => batchObj),
  } as unknown as admin.firestore.Firestore;

  return {
    fakeDb,
    whereCalls,
    limitCalls,
    batchDeletes,
    batchUpdates,
    directUpdates,
    directDeletes,
    getGroupQueryCount: () => groupQueryCount,
    batchCommitMock: batchObj.commit,
  };
};

describe('Cron jobs multi-tenant con collectionGroup("slots")', () => {
  it('processExpiredSlots agrupa por tenantId y evita que un turno confirmado en tnt_alpha bloquee a tnt_beta', async () => {
    const nowMs = new Date('2026-11-22T12:00:00.000Z').getTime();
    const mock = createCollectionGroupMockDb(
      [
        {
          tenantId: 'tnt_alpha',
          id: 'exp-a',
          data: {
            status: 'pending_payment',
            datetime: '2026-11-22T13:00:00.000Z', // 10:00 AR
            expiresAt: '2026-11-22T11:50:00.000Z',
            previousDurationMinutes: 60,
            previousDuration: '1h',
          },
        },
        {
          tenantId: 'tnt_beta',
          id: 'exp-b',
          data: {
            status: 'pending_payment',
            datetime: '2026-11-22T13:00:00.000Z', // 10:00 AR (mismo horario, otro tenant)
            expiresAt: '2026-11-22T11:50:00.000Z',
            previousDurationMinutes: 60,
            previousDuration: '1h',
          },
        },
      ],
      {
        tnt_alpha: [
          {
            tenantId: 'tnt_alpha',
            id: 'conf-a',
            data: {
              status: 'confirmed',
              datetime: '2026-11-22T13:00:00.000Z',
              estimatedDurationMinutes: 60,
            },
          },
        ],
        tnt_beta: [],
      }
    );

    const result = await processExpiredSlots(mock.fakeDb, nowMs);

    expect(mock.getGroupQueryCount()).toBe(1);
    expect(mock.limitCalls).toEqual([500]);
    expect(result).toEqual({
      releasedCount: 1,
      conflictedCount: 1,
      deletedExpiredCount: 0,
      skippedConcurrent: 0,
    });

    const updateAlpha = mock.directUpdates.find((u) => u.tenantId === 'tnt_alpha');
    const updateBeta = mock.directUpdates.find((u) => u.tenantId === 'tnt_beta');
    expect(updateAlpha?.data.status).toBe('conflict');
    expect(updateBeta?.data.status).toBe('available');
    expect(updateBeta?.data).not.toHaveProperty('surcharge');
  });

  it('cleanupPastSlotsMaintenance ejecuta 1 sola query collectionGroup in y clasifica correctamente cada estado', async () => {
    const nowMs = new Date('2026-11-22T16:00:00.000Z').getTime();
    const mock = createCollectionGroupMockDb([
      {
        tenantId: 'tnt_alpha',
        id: 'avail-past',
        data: { status: 'available', datetime: '2026-11-22T14:00:00.000Z' },
      },
      {
        tenantId: 'tnt_beta',
        id: 'conflict-past',
        data: { status: 'conflict', datetime: '2026-11-22T14:30:00.000Z' },
      },
      {
        tenantId: 'tnt_alpha',
        id: 'confirmed-ended',
        data: {
          status: 'confirmed',
          datetime: '2026-11-22T13:00:00.000Z',
          endDatetime: '2026-11-22T14:30:00.000Z',
        },
      },
      {
        tenantId: 'tnt_beta',
        id: 'confirmed-ongoing',
        data: {
          status: 'confirmed',
          datetime: '2026-11-22T15:30:00.000Z',
          endDatetime: '2026-11-22T17:00:00.000Z',
        },
      },
      {
        tenantId: 'tnt_alpha',
        id: 'cancelled-past',
        data: { status: 'cancelled', datetime: '2026-11-22T12:00:00.000Z' },
      },
    ]);

    const result = await cleanupPastSlotsMaintenance(mock.fakeDb, nowMs);

    expect(mock.getGroupQueryCount()).toBe(1);
    expect(mock.limitCalls).toEqual([1000]);
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

  it('retryPendingBookingEmails ejecuta 1 sola query collectionGroup in cuando está en reposo o sin candidatos válidos', async () => {
    const nowMs = new Date('2026-11-22T16:00:00.000Z').getTime();
    const mock = createCollectionGroupMockDb([
      {
        tenantId: 'tnt_alpha',
        id: 'slot-recent-processing',
        data: {
          status: 'confirmed',
          emailStatus: 'processing',
          emailAttempts: 1,
          emailProcessingAt: '2026-11-22T15:59:30.000Z',
          updatedAt: '2026-11-22T15:59:30.000Z',
        },
      },
      {
        tenantId: 'tnt_beta',
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

    expect(mock.getGroupQueryCount()).toBe(1);
    expect(mock.limitCalls).toEqual([200]);
    expect(mock.whereCalls[0]).toEqual([
      'emailStatus',
      'in',
      ['failed', 'partial', 'processing'],
    ]);
    expect(result).toEqual({ retriedCount: 0, sentCount: 0, failedCount: 0 });
  });
});
