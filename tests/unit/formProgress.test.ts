import { describe, it, expect } from 'vitest';
import {
  computeFormProgress,
  type FormProgressStep,
} from '../../src/components/common/FormProgressTracker/progressUtils';

describe('computeFormProgress', () => {
  it('calcula 0% cuando todos los pasos obligatorios están pendientes o parciales', () => {
    const steps: FormProgressStep[] = [
      {
        id: 'services',
        stepNumber: '01',
        label: 'Servicios y seña',
        status: 'partial',
        detail: 'Falta elegir servicio · Seña $5.000',
      },
      {
        id: 'days',
        stepNumber: '02',
        label: 'Días',
        status: 'pending',
        detail: 'Elegí al menos 1 día',
      },
      {
        id: 'times',
        stepNumber: '03',
        label: 'Horarios',
        status: 'pending',
        detail: 'Agregá al menos 1 horario',
      },
    ];

    const summary = computeFormProgress(steps);

    expect(summary.completedRequired).toBe(0);
    expect(summary.totalRequired).toBe(3);
    expect(summary.remainingRequired).toBe(3);
    expect(summary.percentage).toBe(0);
    expect(summary.isReady).toBe(false);
    expect(summary.hasErrors).toBe(false);
    expect(summary.nextPendingStep?.id).toBe('services');
    expect(summary.pendingRequiredLabels).toEqual([
      'Servicios y seña',
      'Días',
      'Horarios',
    ]);
  });

  it('alcanza 100% y marca listo aunque los pasos opcionales estén vacíos', () => {
    const steps: FormProgressStep[] = [
      {
        id: 'name',
        stepNumber: '01',
        label: 'Nombre del servicio',
        status: 'complete',
        detail: 'Lifting de pestañas',
      },
      {
        id: 'price',
        stepNumber: '02',
        label: 'Precio base',
        status: 'complete',
        detail: '$18.000 ARS',
      },
      {
        id: 'duration',
        stepNumber: '03',
        label: 'Duración estimada',
        status: 'complete',
        detail: '60 min',
      },
      {
        id: 'extras',
        stepNumber: '04',
        label: 'Adicionales',
        status: 'optional_empty',
        optional: true,
        detail: 'Sin adicionales (opcional)',
      },
    ];

    const summary = computeFormProgress(steps);

    expect(summary.completedRequired).toBe(3);
    expect(summary.totalRequired).toBe(3);
    expect(summary.remainingRequired).toBe(0);
    expect(summary.percentage).toBe(100);
    expect(summary.isReady).toBe(true);
    expect(summary.optionalCompleted).toBe(0);
    expect(summary.optionalTotal).toBe(1);
    expect(summary.nextPendingStep).toBeNull();
  });

  it('contabiliza pasos opcionales completos sin alterar el porcentaje obligatorio', () => {
    const steps: FormProgressStep[] = [
      {
        id: 'name',
        label: 'Nombre',
        status: 'complete',
        detail: 'Kapping gel',
      },
      {
        id: 'price',
        label: 'Precio base',
        status: 'pending',
        detail: 'Falta precio',
      },
      {
        id: 'duration',
        label: 'Duración',
        status: 'complete',
        detail: '60 min',
      },
      {
        id: 'extras',
        label: 'Adicionales',
        status: 'optional_done',
        optional: true,
        detail: '2 adicionales',
      },
    ];

    const summary = computeFormProgress(steps);

    expect(summary.completedRequired).toBe(2);
    expect(summary.totalRequired).toBe(3);
    expect(summary.percentage).toBe(67);
    expect(summary.isReady).toBe(false);
    expect(summary.optionalCompleted).toBe(1);
    expect(summary.optionalTotal).toBe(1);
    expect(summary.nextPendingStep?.id).toBe('price');
  });

  it('prioriza los errores en nextPendingStep y bloquea isReady', () => {
    const steps: FormProgressStep[] = [
      {
        id: 'services',
        label: 'Servicios y seña',
        status: 'complete',
        detail: '2 servicios · Seña $5.000',
      },
      {
        id: 'days',
        label: 'Días',
        status: 'complete',
        detail: '2 días seleccionados',
      },
      {
        id: 'times',
        label: 'Horarios',
        status: 'error',
        detail: '2 horarios ya existen en la agenda',
      },
    ];

    const summary = computeFormProgress(steps);

    expect(summary.completedRequired).toBe(2);
    expect(summary.percentage).toBe(67);
    expect(summary.hasErrors).toBe(true);
    expect(summary.errorCount).toBe(1);
    expect(summary.isReady).toBe(false);
    expect(summary.nextPendingStep?.id).toBe('times');
  });

  it('bloquea isReady si un paso opcional tiene estado error', () => {
    const steps: FormProgressStep[] = [
      {
        id: 'name',
        label: 'Nombre',
        status: 'complete',
        detail: 'OK',
      },
      {
        id: 'extras',
        label: 'Adicionales',
        status: 'error',
        optional: true,
        detail: 'Error en adicional',
      },
    ];

    const summary = computeFormProgress(steps);

    expect(summary.percentage).toBe(100);
    expect(summary.hasErrors).toBe(true);
    expect(summary.isReady).toBe(false);
    expect(summary.nextPendingStep?.id).toBe('extras');
  });
});
