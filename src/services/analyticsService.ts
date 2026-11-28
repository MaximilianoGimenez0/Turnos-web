import type { Slot } from '../types';
import {
  BUSINESS_TIMEZONE,
  addDaysToDateKey,
  buildBusinessIsoFromInputs,
  formatBusinessDateKey,
  formatBusinessTime,
  formatDateKeyParts,
  getBusinessHour,
  getDateRangeForScope,
  getTodayBusinessDateString,
  isIsoInDateRange,
  isValidDateKey,
  shiftAnchorDateKey,
  type DateRange,
} from '../utils/dateUtils';
import { resolveSlotBookingChannel, type SlotBookingChannel } from './bookingHelper';

export type AnalyticsPeriodPreset =
  | '7d'
  | '30d'
  | 'current_month'
  | '3m'
  | 'all'
  | 'custom';

export type AnalyticsChannelFilter = 'all' | 'online' | 'manual';
export type AnalyticsGranularity = 'day' | 'week' | 'month';
export type AnalyticsTimeBandId = 'morning' | 'midday' | 'afternoon' | 'evening';

export interface AnalyticsFilters {
  period: AnalyticsPeriodPreset;
  customFrom: string;
  customTo: string;
  channel: AnalyticsChannelFilter;
  serviceName: string;
}

export interface AnalyticsSlotFinancials {
  channel: SlotBookingChannel;
  onlineDeposit: number;
  estimatedTotal: number;
  pendingBalance: number;
}

export interface AnalyticsKpis {
  estimatedRevenue: number;
  estimatedRevenueDeltaPct: number | null;
  onlineDeposits: number;
  onlineDepositsDeltaPct: number | null;
  pendingBalance: number;
  pendingBalanceDeltaPct: number | null;
  confirmedCount: number;
  confirmedCountDeltaPct: number | null;
  onlineCount: number;
  manualCount: number;
  cancelledCount: number;
  occupancyRatePct: number;
  averageTicket: number;
  averageTicketDeltaPct: number | null;
  uniqueClients: number;
  uniqueClientsDeltaPct: number | null;
  returningClientsCount: number;
  returningRatePct: number;
}

export interface AnalyticsTimeSeriesPoint {
  key: string;
  label: string;
  subLabel: string;
  tooltipTitle: string;
  onlineDeposits: number;
  pendingBalance: number;
  estimatedRevenue: number;
  count: number;
}

export interface AnalyticsWeekdayStat {
  weekdayIndex: number; // 0 = Mon .. 6 = Sun
  shortLabel: string;
  fullLabel: string;
  count: number;
  sharePct: number;
  revenue: number;
  avgRevenue: number;
  isPeak: boolean;
}

export interface AnalyticsTimeBandStat {
  id: AnalyticsTimeBandId;
  count: number;
  sharePct: number;
  revenue: number;
  isPeak: boolean;
}

export interface AnalyticsServiceStat {
  name: string;
  count: number;
  sharePct: number;
  revenue: number;
}

export interface AnalyticsExtraStat {
  name: string;
  count: number;
  revenue: number;
}

export interface AnalyticsAgendaHealth {
  totalPublished: number;
  confirmed: number;
  available: number;
  cancelled: number;
  conflict: number;
  cancellationRatePct: number;
  newClients: number;
  returningClients: number;
  returningRatePct: number;
}

export interface AnalyticsExportRow {
  date: string;
  time: string;
  clientName: string;
  channel: SlotBookingChannel;
  services: string;
  extras: string;
  estimatedTotal: number;
  onlineDeposit: number;
  pendingBalance: number;
  statusLabel: string;
  paymentId: string;
}

export interface AnalyticsDashboardData {
  activeRange: DateRange | null;
  previousRange: DateRange | null;
  granularity: AnalyticsGranularity;
  totalHistoricalConfirmed: number;
  kpis: AnalyticsKpis;
  timeSeries: AnalyticsTimeSeriesPoint[];
  averages: {
    estimatedRevenue: number;
    onlineDeposits: number;
    count: number;
  };
  weekdayStats: AnalyticsWeekdayStat[];
  peakWeekday: AnalyticsWeekdayStat | null;
  timeBandStats: AnalyticsTimeBandStat[];
  peakHour: { hourLabel: string; count: number } | null;
  topServices: AnalyticsServiceStat[];
  topExtras: AnalyticsExtraStat[];
  agendaHealth: AnalyticsAgendaHealth;
  exportRows: AnalyticsExportRow[];
}

const WEEKDAYS_MON_FIRST: ReadonlyArray<{ shortLabel: string; fullLabel: string }> = [
  { shortLabel: 'Lun', fullLabel: 'Lunes' },
  { shortLabel: 'Mar', fullLabel: 'Martes' },
  { shortLabel: 'Mié', fullLabel: 'Miércoles' },
  { shortLabel: 'Jue', fullLabel: 'Jueves' },
  { shortLabel: 'Vie', fullLabel: 'Viernes' },
  { shortLabel: 'Sáb', fullLabel: 'Sábado' },
  { shortLabel: 'Dom', fullLabel: 'Domingo' },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const buildRangeFromDateKeys = (
  startDateKey: string,
  endDateKey: string,
  timeZone: string
): DateRange => {
  const nextDayKey = addDaysToDateKey(endDateKey, 1);
  const startIso = buildBusinessIsoFromInputs(startDateKey, '00:00', timeZone);
  const nextDayStartIso = buildBusinessIsoFromInputs(nextDayKey, '00:00', timeZone);
  return {
    startMs: new Date(startIso).getTime(),
    endMs: new Date(nextDayStartIso).getTime() - 1,
    startDateKey,
    endDateKey,
  };
};

const countDaysInclusive = (startDateKey: string, endDateKey: string): number => {
  const startMs = Date.parse(`${startDateKey}T12:00:00Z`);
  const endMs = Date.parse(`${endDateKey}T12:00:00Z`);
  if (isNaN(startMs) || isNaN(endMs)) return 1;
  return Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY) + 1);
};

export const createDefaultAnalyticsFilters = (
  timeZone = BUSINESS_TIMEZONE,
  nowMs = Date.now()
): AnalyticsFilters => {
  const todayKey = getTodayBusinessDateString(timeZone, nowMs);
  const monthRange = getDateRangeForScope('month', todayKey, timeZone);
  return {
    period: 'current_month',
    customFrom: monthRange?.startDateKey || todayKey,
    customTo: monthRange?.endDateKey || todayKey,
    channel: 'all',
    serviceName: 'all',
  };
};

export const resolveAnalyticsDateRanges = (
  filters: Pick<AnalyticsFilters, 'period' | 'customFrom' | 'customTo'>,
  timeZone = BUSINESS_TIMEZONE,
  nowMs = Date.now()
): { activeRange: DateRange | null; previousRange: DateRange | null } => {
  if (filters.period === 'all') {
    return { activeRange: null, previousRange: null };
  }

  const todayKey = getTodayBusinessDateString(timeZone, nowMs);

  if (filters.period === 'current_month') {
    const activeRange = getDateRangeForScope('month', todayKey, timeZone);
    const prevMonthAnchor = shiftAnchorDateKey('month', todayKey, -1, timeZone);
    const previousRange = getDateRangeForScope('month', prevMonthAnchor, timeZone);
    return { activeRange, previousRange };
  }

  if (filters.period === '7d' || filters.period === '30d' || filters.period === '3m') {
    const spanDays = filters.period === '7d' ? 7 : filters.period === '30d' ? 30 : 90;
    const startKey = addDaysToDateKey(todayKey, -(spanDays - 1));
    const activeRange = buildRangeFromDateKeys(startKey, todayKey, timeZone);
    const prevEndKey = addDaysToDateKey(startKey, -1);
    const prevStartKey = addDaysToDateKey(prevEndKey, -(spanDays - 1));
    const previousRange = buildRangeFromDateKeys(prevStartKey, prevEndKey, timeZone);
    return { activeRange, previousRange };
  }

  const rawFrom = isValidDateKey(filters.customFrom) ? filters.customFrom.trim() : todayKey;
  const rawTo = isValidDateKey(filters.customTo) ? filters.customTo.trim() : todayKey;
  const [startKey, endKey] = rawFrom <= rawTo ? [rawFrom, rawTo] : [rawTo, rawFrom];
  const activeRange = buildRangeFromDateKeys(startKey, endKey, timeZone);
  const spanDays = countDaysInclusive(startKey, endKey);
  const prevEndKey = addDaysToDateKey(startKey, -1);
  const prevStartKey = addDaysToDateKey(prevEndKey, -(spanDays - 1));
  const previousRange = buildRangeFromDateKeys(prevStartKey, prevEndKey, timeZone);
  return { activeRange, previousRange };
};

export const isBillableConfirmedSlot = (slot: Slot): boolean =>
  slot.status === 'confirmed' || (slot.status === 'past' && slot.pastOutcome !== 'cancelled');

export const isCancelledSlot = (slot: Slot): boolean =>
  slot.status === 'cancelled' || (slot.status === 'past' && slot.pastOutcome === 'cancelled');

export const resolveOnlineDepositPaid = (slot: Slot): number => {
  if (resolveSlotBookingChannel(slot) === 'manual') return 0;
  const paid = Number(slot.paidAmount);
  return !isNaN(paid) && paid > 0 ? paid : 0;
};

export const resolveSlotAnalyticsFinancials = (slot: Slot): AnalyticsSlotFinancials => {
  const channel = resolveSlotBookingChannel(slot);
  const onlineDeposit = resolveOnlineDepositPaid(slot);
  const rawEstimated = Number(slot.clientData?.estimatedPrice);
  const validEstimated = !isNaN(rawEstimated) && rawEstimated > 0 ? rawEstimated : 0;
  const estimatedTotal = Math.max(validEstimated, onlineDeposit);
  const pendingBalance = Math.max(0, estimatedTotal - onlineDeposit);
  return {
    channel,
    onlineDeposit,
    estimatedTotal,
    pendingBalance,
  };
};

interface ExtractedServiceItem {
  name: string;
  revenue: number;
}

interface ExtractedExtraItem {
  name: string;
  price: number;
}

const extractSlotServicesAndExtras = (
  slot: Slot,
  estimatedTotal: number
): { services: ExtractedServiceItem[]; extras: ExtractedExtraItem[] } => {
  const extras: ExtractedExtraItem[] = [];
  const booked = slot.clientData?.bookedServices;

  if (Array.isArray(booked) && booked.length > 0) {
    const services: ExtractedServiceItem[] = [];
    let rawSubtotal = 0;

    booked.forEach((bs) => {
      const name = bs.name?.trim();
      if (!name) return;
      const base = !isNaN(Number(bs.basePrice)) && Number(bs.basePrice) > 0 ? Number(bs.basePrice) : 0;
      let extrasSum = 0;
      (bs.extras || []).forEach((ex) => {
        if (!ex.selected || !ex.name?.trim()) return;
        const price = !isNaN(Number(ex.price)) && Number(ex.price) > 0 ? Number(ex.price) : 0;
        extrasSum += price;
        extras.push({ name: ex.name.trim(), price });
      });
      const itemTotal = base + extrasSum;
      rawSubtotal += itemTotal;
      services.push({ name, revenue: itemTotal });
    });

    if (services.length > 0) {
      if (estimatedTotal > 0 && rawSubtotal > 0 && estimatedTotal !== rawSubtotal) {
        const scale = estimatedTotal / rawSubtotal;
        services.forEach((s) => {
          s.revenue = Math.round(s.revenue * scale);
        });
      } else if (estimatedTotal > 0 && rawSubtotal === 0) {
        const split = Math.round(estimatedTotal / services.length);
        services.forEach((s) => {
          s.revenue = split;
        });
      }
      return { services, extras };
    }
  }

  if (Array.isArray(slot.clientData?.selectedExtras)) {
    slot.clientData.selectedExtras.forEach((ex) => {
      if (!ex.name?.trim()) return;
      const price = !isNaN(Number(ex.price)) && Number(ex.price) > 0 ? Number(ex.price) : 0;
      extras.push({ name: ex.name.trim(), price });
    });
  }

  const rawNames: string[] = [];
  const seen = new Set<string>();
  const pushName = (raw?: string | null) => {
    const clean = raw?.trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    rawNames.push(clean);
  };

  const candidates =
    slot.clientData?.selectedServices ||
    slot.clientData?.selectedRules ||
    slot.services ||
    slot.rules ||
    [];
  candidates.forEach((c) => pushName(typeof c === 'string' ? c : c.name));
  if (rawNames.length === 0) {
    pushName(slot.clientData?.selectedService);
    pushName(slot.serviceName);
  }

  const splitRevenue = rawNames.length > 0 ? Math.round(estimatedTotal / rawNames.length) : 0;
  return {
    services: rawNames.map((name) => ({ name, revenue: splitRevenue })),
    extras,
  };
};

export const extractAvailableAnalyticsServices = (slots: Slot[]): string[] => {
  const namesByKey = new Map<string, string>();
  slots.forEach((slot) => {
    if (!isBillableConfirmedSlot(slot)) return;
    const { services } = extractSlotServicesAndExtras(slot, 0);
    services.forEach(({ name }) => {
      const key = name.toLowerCase();
      if (!namesByKey.has(key)) {
        namesByKey.set(key, name);
      }
    });
  });
  return Array.from(namesByKey.values()).sort((a, b) => a.localeCompare(b, 'es'));
};

const resolveClientIdentityKey = (slot: Slot): string | null => {
  const email = slot.clientData?.email?.trim().toLowerCase();
  if (email) return `e:${email}`;
  const phoneDigits = slot.clientData?.phone?.replace(/\D/g, '');
  if (phoneDigits && phoneDigits.length >= 6) return `p:${phoneDigits}`;
  const name = slot.clientData?.name?.trim().toLowerCase();
  return name ? `n:${name}` : null;
};

const computeDeltaPct = (current: number, previous: number, hasPreviousRange: boolean): number | null => {
  if (!hasPreviousRange) return null;
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Math.round(((current - previous) / previous) * 100);
};

const getMonFirstWeekdayIndex = (dateKey: string): number => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const utcDay = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay(); // 0=Sun..6=Sat
  return (utcDay + 6) % 7;
};

const getWeekBucketStartKey = (dateKey: string): string => {
  const monIndex = getMonFirstWeekdayIndex(dateKey);
  return addDaysToDateKey(dateKey, -monIndex);
};

const resolveGranularity = (
  range: DateRange | null,
  confirmedDatesCount: number
): AnalyticsGranularity => {
  if (range) {
    const days = countDaysInclusive(range.startDateKey, range.endDateKey);
    if (days <= 31) return 'day';
    if (days <= 120) return 'week';
    return 'month';
  }
  if (confirmedDatesCount <= 31) return 'day';
  if (confirmedDatesCount <= 90) return 'week';
  return 'month';
};

const resolveTimeBand = (hour: number): AnalyticsTimeBandId => {
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 15) return 'midday';
  if (hour >= 15 && hour < 19) return 'afternoon';
  return 'evening';
};

const slotMatchesServiceFilter = (slot: Slot, targetLower: string): boolean => {
  if (!targetLower || targetLower === 'all') return true;
  const { services } = extractSlotServicesAndExtras(slot, 0);
  return services.some((s) => s.name.toLowerCase() === targetLower);
};

export const computeAnalyticsDashboard = (
  slots: Slot[],
  filters: AnalyticsFilters,
  options: {
    timeZone?: string;
    nowMs?: number;
  } = {}
): AnalyticsDashboardData => {
  const timeZone = options.timeZone || BUSINESS_TIMEZONE;
  const nowMs = options.nowMs ?? Date.now();
  const { activeRange, previousRange } = resolveAnalyticsDateRanges(filters, timeZone, nowMs);
  const targetServiceLower = filters.serviceName.trim().toLowerCase();

  const allConfirmed = slots.filter(isBillableConfirmedSlot);

  const filterConfirmed = (range: DateRange | null): Slot[] =>
    allConfirmed.filter((slot) => {
      if (!isIsoInDateRange(slot.datetime, range)) return false;
      if (filters.channel !== 'all' && resolveSlotBookingChannel(slot) !== filters.channel) {
        return false;
      }
      if (!slotMatchesServiceFilter(slot, targetServiceLower)) return false;
      return true;
    });

  const activeConfirmed = filterConfirmed(activeRange).sort((a, b) =>
    a.datetime > b.datetime ? 1 : -1
  );
  const prevConfirmed = previousRange ? filterConfirmed(previousRange) : [];

  const summarizePeriod = (periodSlots: Slot[]) => {
    let estimatedRevenue = 0;
    let onlineDeposits = 0;
    let pendingBalance = 0;
    let onlineCount = 0;
    let manualCount = 0;
    const clientCounts = new Map<string, number>();

    periodSlots.forEach((slot) => {
      const fin = resolveSlotAnalyticsFinancials(slot);
      estimatedRevenue += fin.estimatedTotal;
      onlineDeposits += fin.onlineDeposit;
      pendingBalance += fin.pendingBalance;
      if (fin.channel === 'online') onlineCount += 1;
      else manualCount += 1;

      const clientKey = resolveClientIdentityKey(slot);
      if (clientKey) {
        clientCounts.set(clientKey, (clientCounts.get(clientKey) || 0) + 1);
      }
    });

    const confirmedCount = periodSlots.length;
    const averageTicket = confirmedCount > 0 ? Math.round(estimatedRevenue / confirmedCount) : 0;
    const uniqueClients = clientCounts.size;
    let returningClientsCount = 0;
    clientCounts.forEach((cnt) => {
      if (cnt > 1) returningClientsCount += 1;
    });
    const returningRatePct =
      uniqueClients > 0 ? Math.round((returningClientsCount / uniqueClients) * 100) : 0;

    return {
      estimatedRevenue,
      onlineDeposits,
      pendingBalance,
      confirmedCount,
      onlineCount,
      manualCount,
      averageTicket,
      uniqueClients,
      returningClientsCount,
      returningRatePct,
    };
  };

  const curr = summarizePeriod(activeConfirmed);
  const prev = summarizePeriod(prevConfirmed);
  const hasPrev = previousRange !== null;

  // Agenda health across all slots in the active date range
  const rangeSlots = slots.filter((slot) => isIsoInDateRange(slot.datetime, activeRange));
  const availableCount = rangeSlots.filter((s) => s.status === 'available').length;
  const cancelledCount = rangeSlots.filter((s) => isCancelledSlot(s)).length;
  const conflictCount = rangeSlots.filter((s) => s.status === 'conflict').length;
  const occupancyDenominator = curr.confirmedCount + availableCount;
  const occupancyRatePct =
    occupancyDenominator > 0 ? Math.round((curr.confirmedCount / occupancyDenominator) * 100) : 0;
  const healthDenominator = curr.confirmedCount + cancelledCount;
  const cancellationRatePct =
    healthDenominator > 0 ? Math.round((cancelledCount / healthDenominator) * 100) : 0;

  // Unique date keys in filtered confirmed slots to pick chart granularity
  const distinctDateKeys = new Set<string>();
  activeConfirmed.forEach((slot) => {
    const dk = formatBusinessDateKey(slot.datetime, timeZone);
    if (dk) distinctDateKeys.add(dk);
  });
  const granularity = resolveGranularity(activeRange, distinctDateKeys.size);

  const seriesMap = new Map<string, AnalyticsTimeSeriesPoint>();
  const weekdayAgg = WEEKDAYS_MON_FIRST.map((w, idx) => ({
    weekdayIndex: idx,
    shortLabel: w.shortLabel,
    fullLabel: w.fullLabel,
    count: 0,
    revenue: 0,
  }));
  const bandAgg: Record<AnalyticsTimeBandId, { count: number; revenue: number }> = {
    morning: { count: 0, revenue: 0 },
    midday: { count: 0, revenue: 0 },
    afternoon: { count: 0, revenue: 0 },
    evening: { count: 0, revenue: 0 },
  };
  const hourCounts = new Map<number, number>();
  const serviceAgg = new Map<string, { name: string; count: number; revenue: number }>();
  const extraAgg = new Map<string, { name: string; count: number; revenue: number }>();
  const exportRows: AnalyticsExportRow[] = [];

  activeConfirmed.forEach((slot) => {
    const fin = resolveSlotAnalyticsFinancials(slot);
    const dateKey = formatBusinessDateKey(slot.datetime, timeZone);
    const timeStr = formatBusinessTime(slot.datetime, timeZone);
    const hour = getBusinessHour(slot.datetime, timeZone);

    if (dateKey) {
      let bucketKey: string;
      let label: string;
      let subLabel: string;
      let tooltipTitle: string;

      if (granularity === 'day') {
        const parts = formatDateKeyParts(dateKey);
        bucketKey = dateKey;
        label = parts.dayMonthShort;
        subLabel = parts.weekdayShort;
        tooltipTitle = `${parts.weekdayLong}, ${parts.fullDate}`;
      } else if (granularity === 'week') {
        const weekStart = getWeekBucketStartKey(dateKey);
        const weekEnd = addDaysToDateKey(weekStart, 6);
        const startParts = formatDateKeyParts(weekStart);
        const endParts = formatDateKeyParts(weekEnd);
        bucketKey = weekStart;
        label = startParts.dayMonthShort;
        subLabel = `→ ${endParts.dayMonthShort}`;
        tooltipTitle = `Semana ${startParts.dayMonthShort} – ${endParts.dayMonthShort}`;
      } else {
        const monthKey = dateKey.slice(0, 7);
        const firstKey = `${monthKey}-01`;
        const parts = formatDateKeyParts(firstKey);
        bucketKey = monthKey;
        label = parts.monthShort;
        subLabel = monthKey.slice(0, 4);
        tooltipTitle = `${parts.monthLong} ${monthKey.slice(0, 4)}`;
      }

      const existing = seriesMap.get(bucketKey);
      if (existing) {
        existing.onlineDeposits += fin.onlineDeposit;
        existing.pendingBalance += fin.pendingBalance;
        existing.estimatedRevenue += fin.estimatedTotal;
        existing.count += 1;
      } else {
        seriesMap.set(bucketKey, {
          key: bucketKey,
          label,
          subLabel,
          tooltipTitle,
          onlineDeposits: fin.onlineDeposit,
          pendingBalance: fin.pendingBalance,
          estimatedRevenue: fin.estimatedTotal,
          count: 1,
        });
      }

      const wdIdx = getMonFirstWeekdayIndex(dateKey);
      weekdayAgg[wdIdx].count += 1;
      weekdayAgg[wdIdx].revenue += fin.estimatedTotal;
    }

    const bandId = resolveTimeBand(hour);
    bandAgg[bandId].count += 1;
    bandAgg[bandId].revenue += fin.estimatedTotal;
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);

    const { services, extras } = extractSlotServicesAndExtras(slot, fin.estimatedTotal);
    services.forEach((srv) => {
      const key = srv.name.toLowerCase();
      const prevSrv = serviceAgg.get(key);
      if (prevSrv) {
        prevSrv.count += 1;
        prevSrv.revenue += srv.revenue;
      } else {
        serviceAgg.set(key, { name: srv.name, count: 1, revenue: srv.revenue });
      }
    });

    extras.forEach((ex) => {
      const key = ex.name.toLowerCase();
      const prevEx = extraAgg.get(key);
      if (prevEx) {
        prevEx.count += 1;
        prevEx.revenue += ex.price;
      } else {
        extraAgg.set(key, { name: ex.name, count: 1, revenue: ex.price });
      }
    });

    exportRows.push({
      date: dateKey || '-',
      time: timeStr || '-',
      clientName: slot.clientData?.name?.trim() || 'Sin nombre',
      channel: fin.channel,
      services: services.map((s) => s.name).join(' + ') || '-',
      extras: extras.map((e) => e.name).join(', ') || '-',
      estimatedTotal: fin.estimatedTotal,
      onlineDeposit: fin.onlineDeposit,
      pendingBalance: fin.pendingBalance,
      statusLabel:
        slot.status === 'past'
          ? 'Concluido'
          : fin.pendingBalance > 0
          ? 'Confirmado (saldo pendiente)'
          : 'Confirmado (saldado)',
      paymentId: slot.paymentId || '-',
    });
  });

  const timeSeries = Array.from(seriesMap.values()).sort((a, b) => (a.key > b.key ? 1 : -1));
  const seriesLen = timeSeries.length;
  const averages = {
    estimatedRevenue: seriesLen > 0 ? Math.round(curr.estimatedRevenue / seriesLen) : 0,
    onlineDeposits: seriesLen > 0 ? Math.round(curr.onlineDeposits / seriesLen) : 0,
    count: seriesLen > 0 ? Number((curr.confirmedCount / seriesLen).toFixed(1)) : 0,
  };

  const maxWeekdayCount = Math.max(0, ...weekdayAgg.map((w) => w.count));
  const weekdayStats: AnalyticsWeekdayStat[] = weekdayAgg.map((w) => ({
    ...w,
    sharePct: curr.confirmedCount > 0 ? Math.round((w.count / curr.confirmedCount) * 100) : 0,
    avgRevenue: w.count > 0 ? Math.round(w.revenue / w.count) : 0,
    isPeak: maxWeekdayCount > 0 && w.count === maxWeekdayCount,
  }));
  const peakWeekday = weekdayStats.find((w) => w.isPeak) ?? null;

  const bandOrder: AnalyticsTimeBandId[] = ['morning', 'midday', 'afternoon', 'evening'];
  const maxBandCount = Math.max(0, ...bandOrder.map((id) => bandAgg[id].count));
  const timeBandStats: AnalyticsTimeBandStat[] = bandOrder.map((id) => ({
    id,
    count: bandAgg[id].count,
    sharePct:
      curr.confirmedCount > 0 ? Math.round((bandAgg[id].count / curr.confirmedCount) * 100) : 0,
    revenue: bandAgg[id].revenue,
    isPeak: maxBandCount > 0 && bandAgg[id].count === maxBandCount,
  }));

  let peakHour: { hourLabel: string; count: number } | null = null;
  hourCounts.forEach((cnt, hr) => {
    if (!peakHour || cnt > peakHour.count) {
      peakHour = { hourLabel: `${String(hr).padStart(2, '0')}:00`, count: cnt };
    }
  });

  const totalServiceSelections = Array.from(serviceAgg.values()).reduce(
    (sum, item) => sum + item.count,
    0
  );
  const topServices: AnalyticsServiceStat[] = Array.from(serviceAgg.values())
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : b.revenue - a.revenue))
    .slice(0, 6)
    .map((item) => ({
      ...item,
      sharePct:
        totalServiceSelections > 0 ? Math.round((item.count / totalServiceSelections) * 100) : 0,
    }));

  const topExtras: AnalyticsExtraStat[] = Array.from(extraAgg.values())
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : b.revenue - a.revenue))
    .slice(0, 5);

  return {
    activeRange,
    previousRange,
    granularity,
    totalHistoricalConfirmed: allConfirmed.length,
    kpis: {
      estimatedRevenue: curr.estimatedRevenue,
      estimatedRevenueDeltaPct: computeDeltaPct(curr.estimatedRevenue, prev.estimatedRevenue, hasPrev),
      onlineDeposits: curr.onlineDeposits,
      onlineDepositsDeltaPct: computeDeltaPct(curr.onlineDeposits, prev.onlineDeposits, hasPrev),
      pendingBalance: curr.pendingBalance,
      pendingBalanceDeltaPct: computeDeltaPct(curr.pendingBalance, prev.pendingBalance, hasPrev),
      confirmedCount: curr.confirmedCount,
      confirmedCountDeltaPct: computeDeltaPct(curr.confirmedCount, prev.confirmedCount, hasPrev),
      onlineCount: curr.onlineCount,
      manualCount: curr.manualCount,
      cancelledCount,
      occupancyRatePct,
      averageTicket: curr.averageTicket,
      averageTicketDeltaPct: computeDeltaPct(curr.averageTicket, prev.averageTicket, hasPrev),
      uniqueClients: curr.uniqueClients,
      uniqueClientsDeltaPct: computeDeltaPct(curr.uniqueClients, prev.uniqueClients, hasPrev),
      returningClientsCount: curr.returningClientsCount,
      returningRatePct: curr.returningRatePct,
    },
    timeSeries,
    averages,
    weekdayStats,
    peakWeekday,
    timeBandStats,
    peakHour,
    topServices,
    topExtras,
    agendaHealth: {
      totalPublished: curr.confirmedCount + availableCount + cancelledCount + conflictCount,
      confirmed: curr.confirmedCount,
      available: availableCount,
      cancelled: cancelledCount,
      conflict: conflictCount,
      cancellationRatePct,
      newClients: Math.max(0, curr.uniqueClients - curr.returningClientsCount),
      returningClients: curr.returningClientsCount,
      returningRatePct: curr.returningRatePct,
    },
    exportRows,
  };
};

const escapeCsvCell = (value: string | number): string => {
  const str = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
};

export const buildAnalyticsCsv = (rows: AnalyticsExportRow[]): string => {
  const headers = [
    'Fecha',
    'Hora',
    'Cliente',
    'Canal',
    'Servicios',
    'Extras',
    'Total estimado',
    'Seña online',
    'Saldo pendiente',
    'Estado',
    'ID pago',
  ];

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) =>
      [
        row.date,
        row.time,
        row.clientName,
        row.channel === 'online' ? 'Mercado Pago' : 'Manual',
        row.services,
        row.extras,
        row.estimatedTotal,
        row.onlineDeposit,
        row.pendingBalance,
        row.statusLabel,
        row.paymentId,
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  return `\uFEFF${lines.join('\r\n')}`;
};
