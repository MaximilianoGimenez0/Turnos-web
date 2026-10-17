import type * as admin from 'firebase-admin';

/**
 * 1. Procesa los turnos bloqueados temporalmente ('pending_payment') cuyo tiempo de tolerancia (expiresAt) ha vencido.
 * - Si la fecha del turno ya pasó en el tiempo (datetime <= now), se elimina permanentemente.
 * - Si la fecha del turno aún es futura (datetime > now), se libera nuevamente como 'available'.
 */
export const processExpiredSlots = async (
  db: admin.firestore.Firestore
): Promise<{ releasedCount: number; deletedExpiredCount: number }> => {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  console.log(`[processExpiredSlots] Verificando turnos en pago pendientes a las ${nowIso}...`);

  const slotsRef = db.collection('slots');
  // Consulta por campo único para evitar errores de índices compuestos
  const snapshot = await slotsRef.where('status', '==', 'pending_payment').get();

  if (snapshot.empty) {
    console.log('[processExpiredSlots] No hay turnos en estado pending_payment.');
    return { releasedCount: 0, deletedExpiredCount: 0 };
  }

  const batch = db.batch();
  let releasedCount = 0;
  let deletedExpiredCount = 0;

  snapshot.forEach((docSnap) => {
    const slotData = docSnap.data();
    const expiresMs = slotData.expiresAt ? new Date(slotData.expiresAt).getTime() : 0;

    // Si ya expiró el tiempo de reserva (o no tenía expiresAt definido)
    if (expiresMs === 0 || expiresMs <= nowMs) {
      const slotDateMs = slotData.datetime ? new Date(slotData.datetime).getTime() : 0;

      // Si la fecha del turno ya pasó en el tiempo, lo eliminamos
      if (slotDateMs > 0 && slotDateMs <= nowMs) {
        console.log(
          `[processExpiredSlots] Eliminando turno pasado vencido ID: ${docSnap.id} - Fecha: ${slotData.datetime}`
        );
        batch.delete(docSnap.ref);
        deletedExpiredCount++;
      } else {
        // Si el turno es para una fecha futura, lo liberamos a 'available'
        console.log(
          `[processExpiredSlots] Liberando turno ID: ${docSnap.id} a 'available' (expiró en: ${slotData.expiresAt})`
        );
        batch.update(docSnap.ref, {
          status: 'available',
          clientData: null,
          estimatedDurationMinutes: 0,
          estimatedDuration: '',
          expiresAt: null,
          preferenceId: null,
          updatedAt: nowIso,
        });
        releasedCount++;
      }
    }
  });

  if (releasedCount > 0 || deletedExpiredCount > 0) {
    await batch.commit();
  }

  console.log(
    `[processExpiredSlots] Procesamiento completado: ${releasedCount} liberados a disponibles, ${deletedExpiredCount} eliminados por tiempo pasado.`
  );
  return { releasedCount, deletedExpiredCount };
};

/**
 * 2. Busca y elimina permanentemente los turnos no reservados ('available' y 'conflict') cuya fecha/horario ya haya transcurrido.
 */
export const deletePastUnreservedSlots = async (
  db: admin.firestore.Firestore
): Promise<number> => {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  console.log(`[deletePastUnreservedSlots] Buscando turnos disponibles y en conflicto cuya fecha haya pasado...`);

  const slotsRef = db.collection('slots');
  // Consultas acotadas usando el índice compuesto existente status ASC, datetime ASC
  const [availableSnap, conflictSnap] = await Promise.all([
    slotsRef.where('status', '==', 'available').where('datetime', '<=', nowIso).get(),
    slotsRef.where('status', '==', 'conflict').where('datetime', '<=', nowIso).get(),
  ]);

  const docsToDelete = [...availableSnap.docs, ...conflictSnap.docs];

  if (docsToDelete.length === 0) {
    console.log('[deletePastUnreservedSlots] No hay turnos disponibles ni en conflicto pasados para eliminar.');
    return 0;
  }

  const batch = db.batch();
  let deletedCount = 0;

  docsToDelete.forEach((docSnap) => {
    const slotData = docSnap.data();
    console.log(
      `[deletePastUnreservedSlots] Eliminando turno no reservado pasado (${slotData.status}) ID: ${docSnap.id} - Fecha: ${slotData.datetime}`
    );
    batch.delete(docSnap.ref);
    deletedCount++;
  });

  if (deletedCount > 0) {
    await batch.commit();
  }

  console.log(`[deletePastUnreservedSlots] Se eliminaron exitosamente ${deletedCount} turnos no reservados pasados (disponibles/conflictos).`);
  return deletedCount;
};

/**
 * 3. Busca turnos confirmados ('confirmed') cuyo horario ya transcurrió y los actualiza a 'past'.
 * Se considera concluido si el horario final (startMs + durationMinutes) o inicial (si no tiene duración) es <= now.
 */
export const markPastConfirmedSlots = async (
  db: admin.firestore.Firestore
): Promise<number> => {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  console.log(`[markPastConfirmedSlots] Buscando turnos confirmados que hayan concluido...`);

  const slotsRef = db.collection('slots');
  // Consulta acotada usando el índice compuesto status ASC, datetime ASC
  const snapshot = await slotsRef
    .where('status', '==', 'confirmed')
    .where('datetime', '<=', nowIso)
    .get();

  if (snapshot.empty) {
    console.log('[markPastConfirmedSlots] No hay turnos confirmados pasados para verificar.');
    return 0;
  }

  const batch = db.batch();
  let markedCount = 0;

  snapshot.forEach((docSnap) => {
    const slotData = docSnap.data();
    const slotStartMs = slotData.datetime ? new Date(slotData.datetime).getTime() : 0;

    if (slotStartMs > 0) {
      const rawDuration =
        slotData.clientData?.estimatedDurationMinutes ??
        slotData.estimatedDurationMinutes ??
        0;
      const durationMinutes =
        typeof rawDuration === 'number' && !isNaN(rawDuration) && rawDuration > 0
          ? rawDuration
          : 0;
      const slotEndMs = slotStartMs + durationMinutes * 60 * 1000;

      // El turno concluyó si superó su horario final (o inicial si no tenía duración)
      const isPast = slotEndMs > 0 ? slotEndMs <= nowMs : slotStartMs <= nowMs;

      if (isPast) {
        console.log(
          `[markPastConfirmedSlots] Marcando turno confirmado como 'past' ID: ${docSnap.id} - Fecha: ${slotData.datetime}`
        );
        batch.update(docSnap.ref, {
          status: 'past',
          pastOutcome: 'completed',
          updatedAt: nowIso,
        });
        markedCount++;
      }
    }
  });

  if (markedCount > 0) {
    await batch.commit();
  }

  console.log(`[markPastConfirmedSlots] Se actualizaron exitosamente ${markedCount} turnos confirmados a 'past'.`);
  return markedCount;
};

/**
 * 4. Busca turnos cancelados ('cancelled') cuyo horario ya transcurrió y los actualiza a 'past' con pastOutcome: 'cancelled'.
 */
export const markPastCancelledSlots = async (
  db: admin.firestore.Firestore
): Promise<number> => {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  console.log(`[markPastCancelledSlots] Buscando turnos cancelados cuya fecha ya pasó...`);

  const slotsRef = db.collection('slots');
  // Consulta acotada usando el índice compuesto status ASC, datetime ASC
  const snapshot = await slotsRef
    .where('status', '==', 'cancelled')
    .where('datetime', '<=', nowIso)
    .get();

  if (snapshot.empty) {
    console.log('[markPastCancelledSlots] No hay turnos cancelados pasados para verificar.');
    return 0;
  }

  const batch = db.batch();
  let markedCount = 0;

  snapshot.forEach((docSnap) => {
    const slotData = docSnap.data();
    console.log(
      `[markPastCancelledSlots] Marcando turno cancelado como 'past' ID: ${docSnap.id} - Fecha: ${slotData.datetime}`
    );
    batch.update(docSnap.ref, {
      status: 'past',
      pastOutcome: 'cancelled',
      updatedAt: nowIso,
    });
    markedCount++;
  });

  if (markedCount > 0) {
    await batch.commit();
  }

  console.log(`[markPastCancelledSlots] Se actualizaron exitosamente ${markedCount} turnos cancelados a 'past'.`);
  return markedCount;
};

/**
 * 5. Ejecutor unificado para tareas de limpieza, expiración y transición de turnos.
 */
export const cleanupAllExpiredAndPastSlots = async (
  db: admin.firestore.Firestore
): Promise<{
  releasedCount: number;
  deletedExpiredCount: number;
  deletedPastAvailableCount: number;
  markedPastConfirmedCount: number;
  markedPastCancelledCount: number;
}> => {
  const { releasedCount, deletedExpiredCount } = await processExpiredSlots(db);
  const deletedPastAvailableCount = await deletePastUnreservedSlots(db);
  const markedPastConfirmedCount = await markPastConfirmedSlots(db);
  const markedPastCancelledCount = await markPastCancelledSlots(db);

  return {
    releasedCount,
    deletedExpiredCount,
    deletedPastAvailableCount,
    markedPastConfirmedCount,
    markedPastCancelledCount,
  };
};
