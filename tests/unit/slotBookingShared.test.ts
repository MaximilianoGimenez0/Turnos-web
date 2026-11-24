import { describe, it, expect } from 'vitest';
import {
  buildInitialExtrasMap,
  buildInitialServiceNames,
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
});
