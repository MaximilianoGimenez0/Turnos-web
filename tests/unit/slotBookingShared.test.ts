import { describe, it, expect } from 'vitest';
import {
  buildInitialExtrasMap,
  buildInitialServiceNames,
  computeSlotBookingPricing,
} from '../../src/components/slots/SlotBookingShared/useSlotBookingForm';
import type { ClientData } from '../../src/types';

describe('SlotBookingShared initializers', () => {
  it('returns empty arrays/maps when clientData is undefined', () => {
    expect(buildInitialServiceNames(undefined)).toEqual([]);
    expect(buildInitialExtrasMap(undefined)).toEqual({});
  });

  it('extracts selectedServices when present and falls back to selectedService', () => {
    const multi: ClientData = {
      name: 'Ana',
      selectedServices: ['Kapping', 'Nail Art'],
      selectedService: 'Kapping + Nail Art',
    };
    expect(buildInitialServiceNames(multi)).toEqual(['Kapping', 'Nail Art']);

    const single: ClientData = {
      name: 'Ana',
      selectedService: 'Semipermanente',
    };
    expect(buildInitialServiceNames(single)).toEqual(['Semipermanente']);
  });

  it('maps only selected extras per serviceId', () => {
    const data: ClientData = {
      name: 'Sofía',
      bookedServices: [
        {
          serviceId: 'svc-1',
          name: 'Kapping',
          basePrice: 12000,
          durationMinutes: 60,
          extras: [
            { id: 'ex-1', name: 'Francesita', price: 2000, selected: true },
            { id: 'ex-2', name: 'Strass', price: 1500, selected: false },
          ],
        },
        {
          serviceId: 'svc-2',
          name: 'Retiro',
          basePrice: 3000,
          durationMinutes: 30,
          extras: [],
        },
      ],
    };

    expect(buildInitialExtrasMap(data)).toEqual({
      'svc-1': ['ex-1'],
      'svc-2': [],
    });
  });

  it('calcula recargo fijo, porcentual, saldo $0 saldado y caso basePrice 0', () => {
    const fixed = computeSlotBookingPricing({
      baseServicePrice: 20000,
      totalExtrasPrice: 3000,
      depositAmount: 5000,
      surcharge: { type: 'fixed', value: 3000, reason: 'Feriado' },
    });
    expect(fixed.surchargeAmount).toBe(3000);
    expect(fixed.totalFinalEstimatedPrice).toBe(26000);
    expect(fixed.balanceDueAtSalon).toBe(21000);

    const pct = computeSlotBookingPricing({
      baseServicePrice: 20000,
      totalExtrasPrice: 3000,
      depositAmount: 5000,
      surcharge: { type: 'percentage', value: 20, reason: 'Horario nocturno' },
    });
    expect(pct.surchargeAmount).toBe(4600);
    expect(pct.totalFinalEstimatedPrice).toBe(27600);
    expect(pct.balanceDueAtSalon).toBe(22600);

    const settled = computeSlotBookingPricing({
      baseServicePrice: 12000,
      totalExtrasPrice: 0,
      depositAmount: 15000,
      surcharge: { type: 'fixed', value: 3000 },
    });
    expect(settled.totalFinalEstimatedPrice).toBe(15000);
    expect(settled.balanceDueAtSalon).toBe(0);

    const zeroBase = computeSlotBookingPricing({
      baseServicePrice: 0,
      totalExtrasPrice: 0,
      depositAmount: 5000,
      surcharge: { type: 'fixed', value: 3000 },
    });
    expect(zeroBase.surchargeAmount).toBe(3000);
    expect(zeroBase.totalFinalEstimatedPrice).toBe(0);
    expect(zeroBase.balanceDueAtSalon).toBe(0);
  });
});
