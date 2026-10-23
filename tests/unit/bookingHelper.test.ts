import { describe, it, expect } from 'vitest';
import {
  formatEstimatedDuration,
  calculateDurationFromServices,
  calculatePriceFromServices,
  sanitizeClientData,
} from '../../src/services/bookingHelper';
import type { ClientData, ServiceItem } from '../../src/types';

describe('bookingHelper - Servicios de cálculo y sanitización', () => {
  const mockServices: ServiceItem[] = [
    { id: '1', name: 'Lifting de Pestañas', durationMinutes: 60, basePrice: 15000 },
    { id: '2', name: 'Perfilado de Cejas', durationMinutes: 30, basePrice: 8000 },
    { id: '3', name: 'Nutrición Capilar', durationMinutes: 45, basePrice: 12000 },
    { id: '4', name: 'Consulta Gratuita', durationMinutes: 15, basePrice: 0 },
  ];

  describe('calculatePriceFromServices', () => {
    it('debe devolver 0 si no se seleccionaron servicios', () => {
      expect(calculatePriceFromServices([], mockServices)).toBe(0);
      expect(calculatePriceFromServices(undefined as unknown as string[], mockServices)).toBe(0);
    });

    it('debe sumar correctamente los precios base de los servicios seleccionados', () => {
      const selected = ['Lifting de Pestañas', 'Perfilado de Cejas'];
      expect(calculatePriceFromServices(selected, mockServices)).toBe(23000);
    });

    it('debe ignorar servicios que no existan en availableServices', () => {
      const selected = ['Lifting de Pestañas', 'Servicio Fantasma'];
      expect(calculatePriceFromServices(selected, mockServices)).toBe(15000);
    });

    it('debe manejar servicios con basePrice en 0 o no numéricas sin fallar', () => {
      const selected = ['Consulta Gratuita'];
      expect(calculatePriceFromServices(selected, mockServices)).toBe(0);

      const corruptedServices: ServiceItem[] = [
        { id: '5', name: 'Corrupto', durationMinutes: 10, basePrice: NaN },
      ];
      expect(calculatePriceFromServices(['Corrupto'], corruptedServices)).toBe(0);
    });
  });

  describe('calculateDurationFromServices', () => {
    it('debe sumar los minutos de los servicios seleccionados', () => {
      const selected = ['Lifting de Pestañas', 'Nutrición Capilar'];
      expect(calculateDurationFromServices(selected, mockServices)).toBe(105);
    });
  });

  describe('formatEstimatedDuration', () => {
    it('debe formatear minutos correctamente', () => {
      expect(formatEstimatedDuration(45)).toBe('45 min');
      expect(formatEstimatedDuration(60)).toBe('1h (60 min)');
      expect(formatEstimatedDuration(90)).toBe('1h 30m (90 min)');
      expect(formatEstimatedDuration(0)).toBe('');
    });
  });

  describe('sanitizeClientData', () => {
    it('debe normalizar y preservar estimatedPrice', () => {
      const rawClient: Partial<ClientData> = {
        name: '  Lucía Benítez  ',
        email: '  LUCIA@GMAIL.COM  ',
        phone: '  +54 9 11 1234-5678  ',
        selectedRules: ['Lifting de Pestañas'],
        estimatedDurationMinutes: 60,
        estimatedPrice: 15000,
      };

      const result = sanitizeClientData(rawClient);
      expect(result.name).toBe('Lucía Benítez');
      expect(result.email).toBe('lucia@gmail.com');
      expect(result.estimatedPrice).toBe(15000);
      expect(result.estimatedDuration).toBe('1h (60 min)');
    });

    it('debe asignar 0 a estimatedPrice si es negativo, NaN o undefined', () => {
      const resultA = sanitizeClientData({ name: 'Test', estimatedPrice: -500 });
      expect(resultA.estimatedPrice).toBe(0);

      const resultB = sanitizeClientData({ name: 'Test', estimatedPrice: undefined });
      expect(resultB.estimatedPrice).toBe(0);
    });

    it('debe sanitizar selectedService, basePrice y selectedExtras correctamente', () => {
      const clientWithExtras: Partial<ClientData> = {
        name: 'Ana Pérez',
        selectedService: 'Lifting de Pestañas',
        basePrice: 16000,
        selectedExtras: [
          { id: 'ex-1', name: 'Tinte', price: 3000 },
          { id: 'ex-2', name: 'Nutrición', price: 2000 },
        ],
      };

      const result = sanitizeClientData(clientWithExtras);
      expect(result.selectedService).toBe('Lifting de Pestañas');
      expect(result.basePrice).toBe(16000);
      expect(result.selectedExtras).toHaveLength(2);
      expect(result.extrasPrice).toBe(5000);
      expect(result.estimatedPrice).toBe(21000);
    });

    it('debe estructurar bookedServices con extras y flags selected correctamente', () => {
      const clientWithBookedServices: Partial<ClientData> = {
        name: 'Camila Rodriguez',
        email: 'camila@gmail.com',
        phone: '1123456789',
        bookedServices: [
          {
            serviceId: 's1',
            name: 'Lifting de Pestañas',
            basePrice: 18000,
            durationMinutes: 60,
            extras: [
              { id: 'e1', name: 'Tinte de pestañas', price: 3000, selected: true },
              { id: 'e2', name: 'Nutrición keratina', price: 2000, selected: false },
            ],
          },
          {
            serviceId: 's2',
            name: 'Perfilado de Cejas',
            basePrice: 6000,
            durationMinutes: 30,
            extras: [
              { id: 'e3', name: 'Coloración Henna', price: 2500, selected: true },
            ],
          },
        ],
      };

      const result = sanitizeClientData(clientWithBookedServices);
      expect(result.bookedServices).toHaveLength(2);
      expect(result.bookedServices![0].extras).toHaveLength(2);
      expect(result.bookedServices![0].extras[0].selected).toBe(true);
      expect(result.bookedServices![0].extras[1].selected).toBe(false);

      expect(result.basePrice).toBe(24000);
      expect(result.extrasPrice).toBe(5500);
      expect(result.estimatedPrice).toBe(29500);
      expect(result.estimatedDurationMinutes).toBe(90);
      expect(result.selectedServices).toEqual(['Lifting de Pestañas', 'Perfilado de Cejas']);
      expect(result.selectedService).toBe('Lifting de Pestañas + Perfilado de Cejas');
      expect(result.selectedExtras).toHaveLength(2);
      expect(result.selectedExtras!.map((e) => e.name)).toEqual(['Tinte de pestañas', 'Coloración Henna']);
    });
  });

  describe('calculatePriceFromServices y calculateDurationFromServices', () => {
    const mockServices: ServiceItem[] = [
      { id: 's1', name: 'Lifting de Pestañas', basePrice: 18000, durationMinutes: 60 },
      { id: 's2', name: 'Perfilado de Cejas', basePrice: 6000, durationMinutes: 30 },
      { id: 's3', name: 'Kapping Gel', basePrice: 14000, durationMinutes: 90 },
    ];

    it('debe sumar los precios base de los servicios seleccionados', () => {
      const selected = ['Lifting de Pestañas', 'Perfilado de Cejas'];
      expect(calculatePriceFromServices(selected, mockServices)).toBe(24000);
    });

    it('debe sumar la duración estimada en minutos de los servicios seleccionados', () => {
      const selected = ['Lifting de Pestañas', 'Kapping Gel'];
      expect(calculateDurationFromServices(selected, mockServices)).toBe(150);
    });

    it('debe devolver 0 si no hay servicios seleccionados', () => {
      expect(calculatePriceFromServices([], mockServices)).toBe(0);
      expect(calculateDurationFromServices([], mockServices)).toBe(0);
    });
  });
});
