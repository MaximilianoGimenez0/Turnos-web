import { describe, it, expect } from 'vitest';
import {
  buildAnalyticsCsv,
  computeAnalyticsDashboard,
  createDefaultAnalyticsFilters,
  extractAvailableAnalyticsServices,
  resolveAnalyticsDateRanges,
  resolveOnlineDepositPaid,
  resolveSlotAnalyticsFinancials,
} from '../../src/services/analyticsService';
import type { Slot } from '../../src/types';

const makeSlot = (overrides: Partial<Slot>): Slot => ({
  id: 'slot-1',
  datetime: '2026-11-10T14:00:00-03:00',
  depositAmount: 5000,
  status: 'confirmed',
  ...overrides,
});

describe('analyticsService', () => {
  const tz = 'America/Argentina/Buenos_Aires';
  const nowRefMs = new Date('2026-11-27T15:00:00-03:00').getTime();

  it('distingue estrictamente turnos online (Mercado Pago) de turnos manuales (manual_admin)', () => {
    const onlineSlot = makeSlot({
      id: 'mp-1',
      paymentStatus: 'approved',
      paymentId: '123456',
      paidAmount: 5000,
      clientData: { name: 'Ana', phone: '1122334455', estimatedPrice: 20000 },
    });

    const manualSlot = makeSlot({
      id: 'man-1',
      paymentStatus: 'manual_admin',
      depositAmount: 5000,
      paidAmount: null,
      paymentId: null,
      clientData: { name: 'Luis', phone: '1199887766', estimatedPrice: 18000 },
    });

    expect(resolveOnlineDepositPaid(onlineSlot)).toBe(5000);
    expect(resolveOnlineDepositPaid(manualSlot)).toBe(0);

    expect(resolveSlotAnalyticsFinancials(onlineSlot)).toEqual({
      channel: 'online',
      onlineDeposit: 5000,
      estimatedTotal: 20000,
      pendingBalance: 15000,
    });

    expect(resolveSlotAnalyticsFinancials(manualSlot)).toEqual({
      channel: 'manual',
      onlineDeposit: 0,
      estimatedTotal: 18000,
      pendingBalance: 18000,
    });
  });

  it('resuelve correctamente los rangos de mes actual y período anterior', () => {
    const defaults = createDefaultAnalyticsFilters(tz, nowRefMs);
    expect(defaults.period).toBe('current_month');

    const { activeRange, previousRange } = resolveAnalyticsDateRanges(defaults, tz, nowRefMs);
    expect(activeRange?.startDateKey).toBe('2026-11-01');
    expect(activeRange?.endDateKey).toBe('2026-11-30');
    expect(previousRange?.startDateKey).toBe('2026-10-01');
    expect(previousRange?.endDateKey).toBe('2026-10-31');

    const custom = resolveAnalyticsDateRanges(
      { period: 'custom', customFrom: '2026-11-15', customTo: '2026-11-10' },
      tz,
      nowRefMs
    );
    expect(custom.activeRange?.startDateKey).toBe('2026-11-10');
    expect(custom.activeRange?.endDateKey).toBe('2026-11-15');
    expect(custom.previousRange?.startDateKey).toBe('2026-11-04');
    expect(custom.previousRange?.endDateKey).toBe('2026-11-09');
  });

  it('calcula KPIs, deltas, días pico, franjas horarias, servicios/extras y salud de agenda', () => {
    const slots: Slot[] = [
      // Mes actual (noviembre 2026) - Online MP
      makeSlot({
        id: 'nov-1',
        datetime: '2026-11-07T10:00:00-03:00', // Sábado mañana
        paymentStatus: 'approved',
        paymentId: 'mp-1',
        paidAmount: 5000,
        clientData: {
          name: 'Camila',
          email: 'camila@test.com',
          phone: '11111111',
          estimatedPrice: 25000,
          bookedServices: [
            {
              serviceId: 's1',
              name: 'Lifting',
              basePrice: 20000,
              durationMinutes: 60,
              extras: [{ id: 'e1', name: 'Tinte', price: 5000, selected: true }],
            },
          ],
        },
      }),
      // Mes actual - Manual (recurrente Camila)
      makeSlot({
        id: 'nov-2',
        datetime: '2026-11-14T16:30:00-03:00', // Sábado tarde
        paymentStatus: 'manual_admin',
        depositAmount: 5000,
        clientData: {
          name: 'Camila',
          email: 'camila@test.com',
          phone: '11111111',
          estimatedPrice: 15000,
          bookedServices: [
            {
              serviceId: 's2',
              name: 'Perfilado',
              basePrice: 15000,
              durationMinutes: 30,
              extras: [],
            },
          ],
        },
      }),
      // Mes actual - Online MP cliente nuevo
      makeSlot({
        id: 'nov-3',
        datetime: '2026-11-18T16:00:00-03:00', // Miércoles tarde
        status: 'past',
        pastOutcome: 'completed',
        paymentStatus: 'approved',
        paymentId: 'mp-2',
        paidAmount: 10000,
        clientData: {
          name: 'Sofía',
          email: 'sofia@test.com',
          phone: '22222222',
          estimatedPrice: 20000,
          bookedServices: [
            {
              serviceId: 's1',
              name: 'Lifting',
              basePrice: 20000,
              durationMinutes: 60,
              extras: [],
            },
          ],
        },
      }),
      // Turno disponible en noviembre
      makeSlot({
        id: 'nov-avail',
        datetime: '2026-11-28T11:00:00-03:00',
        status: 'available',
      }),
      // Turno cancelado en noviembre
      makeSlot({
        id: 'nov-canc',
        datetime: '2026-11-12T12:00:00-03:00',
        status: 'cancelled',
      }),
      // Mes anterior (octubre 2026) para comparar deltas
      makeSlot({
        id: 'oct-1',
        datetime: '2026-10-10T10:00:00-03:00',
        status: 'past',
        pastOutcome: 'completed',
        paymentStatus: 'approved',
        paymentId: 'mp-oct',
        paidAmount: 5000,
        clientData: {
          name: 'Lucía',
          email: 'lucia@test.com',
          phone: '33333333',
          estimatedPrice: 20000,
          bookedServices: [
            {
              serviceId: 's1',
              name: 'Lifting',
              basePrice: 20000,
              durationMinutes: 60,
              extras: [],
            },
          ],
        },
      }),
    ];

    expect(extractAvailableAnalyticsServices(slots)).toEqual(['Lifting', 'Perfilado']);

    const filters = createDefaultAnalyticsFilters(tz, nowRefMs);
    const dashboard = computeAnalyticsDashboard(slots, filters, {
      timeZone: tz,
      nowMs: nowRefMs,
    });

    expect(dashboard.granularity).toBe('day');
    expect(dashboard.kpis.estimatedRevenue).toBe(60000);
    expect(dashboard.kpis.onlineDeposits).toBe(15000);
    expect(dashboard.kpis.pendingBalance).toBe(45000);
    expect(dashboard.kpis.confirmedCount).toBe(3);
    expect(dashboard.kpis.onlineCount).toBe(2);
    expect(dashboard.kpis.manualCount).toBe(1);
    expect(dashboard.kpis.cancelledCount).toBe(1);
    expect(dashboard.kpis.occupancyRatePct).toBe(75); // 3 / (3 + 1)
    expect(dashboard.kpis.averageTicket).toBe(20000);
    expect(dashboard.kpis.uniqueClients).toBe(2);
    expect(dashboard.kpis.returningClientsCount).toBe(1);
    expect(dashboard.kpis.returningRatePct).toBe(50);

    // Deltas vs octubre (20.000 facturación, 5.000 seña, 1 turno)
    expect(dashboard.kpis.estimatedRevenueDeltaPct).toBe(200);
    expect(dashboard.kpis.onlineDepositsDeltaPct).toBe(200);
    expect(dashboard.kpis.confirmedCountDeltaPct).toBe(200);

    expect(dashboard.peakWeekday?.fullLabel).toBe('Sábado');
    expect(dashboard.peakWeekday?.count).toBe(2);
    expect(dashboard.topServices[0].name).toBe('Lifting');
    expect(dashboard.topServices[0].count).toBe(2);
    expect(dashboard.topExtras[0]).toEqual({ name: 'Tinte', count: 1, revenue: 5000 });

    const afternoonBand = dashboard.timeBandStats.find((b) => b.id === 'afternoon');
    expect(afternoonBand?.isPeak).toBe(true);
    expect(afternoonBand?.count).toBe(2);

    expect(dashboard.agendaHealth).toEqual({
      totalPublished: 5,
      confirmed: 3,
      available: 1,
      cancelled: 1,
      conflict: 0,
      cancellationRatePct: 25,
      newClients: 1,
      returningClients: 1,
      returningRatePct: 50,
    });

    // Filtro por canal manual
    const manualOnly = computeAnalyticsDashboard(
      slots,
      { ...filters, channel: 'manual' },
      { timeZone: tz, nowMs: nowRefMs }
    );
    expect(manualOnly.kpis.confirmedCount).toBe(1);
    expect(manualOnly.kpis.onlineDeposits).toBe(0);
    expect(manualOnly.kpis.pendingBalance).toBe(15000);
  });

  it('usa agrupación semanal/mensual en rangos largos y respeta la zona horaria del negocio', () => {
    const slotUtcLate = makeSlot({
      id: 'tz-1',
      datetime: '2026-11-11T01:30:00Z', // 22:30 del 10/11 en Argentina (-03:00)
      paymentStatus: 'approved',
      paymentId: 'mp-tz',
      paidAmount: 4000,
      clientData: { name: 'Martín', phone: '44444444', estimatedPrice: 12000 },
    });

    const dash = computeAnalyticsDashboard(
      [slotUtcLate],
      {
        period: 'custom',
        customFrom: '2026-11-01',
        customTo: '2026-11-30',
        channel: 'all',
        serviceName: 'all',
      },
      { timeZone: tz, nowMs: nowRefMs }
    );
    expect(dash.timeSeries[0].key).toBe('2026-11-10');
    expect(dash.exportRows[0].time).toBe('22:30');

    const longDash = computeAnalyticsDashboard(
      [slotUtcLate],
      {
        period: '3m',
        customFrom: '2026-09-01',
        customTo: '2026-11-30',
        channel: 'all',
        serviceName: 'all',
      },
      { timeZone: tz, nowMs: nowRefMs }
    );
    expect(longDash.granularity).toBe('week');
  });

  it('genera CSV con BOM UTF-8 y escape seguro de celdas', () => {
    const csv = buildAnalyticsCsv([
      {
        date: '2026-11-10',
        time: '14:00',
        clientName: 'Ana, "La Pro"',
        channel: 'online',
        services: 'Lifting + Perfilado',
        extras: '=FORMULA_MALICIOSA',
        estimatedTotal: 25000,
        onlineDeposit: 5000,
        pendingBalance: 20000,
        statusLabel: 'Confirmado (saldo pendiente)',
        paymentId: 'mp-999',
      },
    ]);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Ana, ""La Pro"""');
    expect(csv).toContain("'=FORMULA_MALICIOSA");
    expect(csv).toContain('Mercado Pago');
  });
});
