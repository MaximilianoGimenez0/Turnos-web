import type * as admin from 'firebase-admin';

export type BatchOperation =
  | {
      type: 'set';
      ref: admin.firestore.DocumentReference;
      data: admin.firestore.DocumentData;
    }
  | {
      type: 'update';
      ref: admin.firestore.DocumentReference;
      data: admin.firestore.UpdateData<admin.firestore.DocumentData>;
      precondition?: admin.firestore.Precondition;
    }
  | {
      type: 'delete';
      ref: admin.firestore.DocumentReference;
      precondition?: admin.firestore.Precondition;
    };

export const MAX_SAFE_BATCH_SIZE = 400;

export const commitOperationsInChunks = async (
  db: admin.firestore.Firestore,
  operations: BatchOperation[],
  chunkSize = MAX_SAFE_BATCH_SIZE
): Promise<number> => {
  if (operations.length === 0) return 0;

  let committed = 0;
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize);
    const batch = db.batch();

    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data);
      } else if (op.type === 'update') {
        if (op.precondition) {
          batch.update(op.ref, op.data, op.precondition);
        } else {
          batch.update(op.ref, op.data);
        }
      } else {
        if (op.precondition) {
          batch.delete(op.ref, op.precondition);
        } else {
          batch.delete(op.ref);
        }
      }
    }

    await batch.commit();
    committed += chunk.length;
  }

  return committed;
};

/**
 * Applies individual operations guarded by optimistic preconditions (e.g. lastUpdateTime)
 * so a concurrent mutation on one slot only skips that slot without aborting the entire batch.
 */
export const applyPreconditionedOperations = async (
  operations: BatchOperation[],
  concurrency = 10
): Promise<{ succeeded: number; skippedPrecondition: number; failed: number }> => {
  let succeeded = 0;
  let skippedPrecondition = 0;
  let failed = 0;

  for (let i = 0; i < operations.length; i += concurrency) {
    const slice = operations.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      slice.map(async (op) => {
        if (op.type === 'set') {
          await op.ref.set(op.data);
        } else if (op.type === 'update') {
          if (op.precondition) {
            await op.ref.update(op.data, op.precondition);
          } else {
            await op.ref.update(op.data);
          }
        } else if (op.precondition) {
          await op.ref.delete(op.precondition);
        } else {
          await op.ref.delete();
        }
      })
    );

    for (const res of results) {
      if (res.status === 'fulfilled') {
        succeeded++;
      } else {
        const code = (res.reason as { code?: number | string } | undefined)?.code;
        if (code === 9 || code === 'failed-precondition' || code === 5 || code === 'not-found') {
          skippedPrecondition++;
        } else {
          failed++;
        }
      }
    }
  }

  return { succeeded, skippedPrecondition, failed };
};
