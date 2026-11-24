import { describe, it, expect } from 'vitest';
import {
  buildServiceProgressSteps,
  computeServicePriceSummary,
  evaluateEditableExtraRows,
  mapExtrasToEditableRows,
  SERVICE_STEP_IDS,
  type EditableExtraRow,
} from '../../src/components/admin/ServicesManager/serviceFormUtils';
import { computeFormProgress } from '../../src/components/common/FormProgressTracker/progressUtils';

describe('serviceFormUtils (filas inline de extras y progreso 1:1)', () => {
  it('ignora filas completamente vacías, valida filas completas y marca errores en filas incompletas', () => {
    const rows: EditableExtraRow[] = [
      { rowKey: 'r1', id: 'ex-1', name: 'Diseño personalizado', price: '3500' },
      { rowKey: 'r2', id: 'ex-2', name: '   ', price: '' }, // blank -> ignored
      { rowKey: 'r3', id: 'ex-3', name: 'Baño de nutrición', price: '' }, // missing price
      { rowKey: 'r4', id: 'ex-4', name: '', price: '2000' }, // missing name
    ];

    const result = evaluateEditableExtraRows(rows);

    expect(result.validExtras).toEqual([
      { id: 'ex-1', name: 'Diseño personalizado', price: 3500 },
    ]);
    expect(result.incompleteCount).toBe(2);
    expect(result.rowErrors['r1']).toBeUndefined();
    expect(result.rowErrors['r2']).toBeUndefined();
    expect(result.rowErrors['r3']?.price).toBeTruthy();
    expect(result.rowErrors['r4']?.name).toBeTruthy();
  });

  it('calcula correctamente precio base, suma de extras y máximo estimado', () => {
    const summary = computeServicePriceSummary('18000', [
      { id: 'ex-1', name: 'Extra A', price: 3000 },
      { id: 'ex-2', name: 'Extra B', price: 4500 },
    ]);

    expect(summary).toEqual({
      parsedBasePrice: 18000,
      extrasTotal: 7500,
      maxTotalWithExtras: 25500,
    });

    const emptyBase = computeServicePriceSummary('', [
      { id: 'ex-1', name: 'Extra A', price: 3000 },
    ]);
    expect(emptyBase).toEqual({
      parsedBasePrice: null,
      extrasTotal: 3000,
      maxTotalWithExtras: null,
    });
  });

  it('construye 3 pasos sincronizados 1:1 con el formulario y refleja estados correctamente', () => {
    const emptyExtras = evaluateEditableExtraRows([]);
    const initialSteps = buildServiceProgressSteps({
      name: '',
      description: '',
      basePrice: '',
      durationMinutes: '60',
      extrasEval: emptyExtras,
    });

    expect(initialSteps.map((s) => [s.stepNumber, Boolean(s.optional), s.targetId])).toEqual([
      ['01', false, SERVICE_STEP_IDS.identity],
      ['02', false, SERVICE_STEP_IDS.pricing],
      ['03', true, SERVICE_STEP_IDS.extras],
    ]);
    expect(initialSteps[0].status).toBe('pending');
    expect(initialSteps[1].status).toBe('partial'); // duration set, price missing
    expect(initialSteps[2].status).toBe('optional_empty');
    expect(computeFormProgress(initialSteps).isReady).toBe(false);

    const completeExtras = evaluateEditableExtraRows([
      { rowKey: 'r1', id: 'ex-1', name: 'Extra 1', price: '2500' },
    ]);
    const readySteps = buildServiceProgressSteps({
      name: 'Sesión completa',
      description: 'Incluye diagnóstico inicial',
      basePrice: '20000',
      durationMinutes: '90',
      extrasEval: completeExtras,
    });

    expect(readySteps[0].status).toBe('complete');
    expect(readySteps[1].status).toBe('complete');
    expect(readySteps[1].detail).toContain('1h 30m');
    expect(readySteps[2].status).toBe('optional_done');
    expect(computeFormProgress(readySteps).isReady).toBe(true);
  });

  it('mapea extras guardados a filas editables conservando id, nombre y precio', () => {
    const mapped = mapExtrasToEditableRows([
      { id: 'e-10', name: 'Retiro', price: 4000 },
    ]);
    expect(mapped).toEqual([
      { rowKey: 'e-10', id: 'e-10', name: 'Retiro', price: '4000' },
    ]);
  });
});
