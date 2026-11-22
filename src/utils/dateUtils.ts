// Evita el desfase de zona horaria provocado por toISOString() en husos con offset negativo
export const formatLocalDate = (date: Date): string => {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayLocalDateString = (): string => {
  return formatLocalDate(new Date());
};

export const addDaysLocalDateString = (daysFromToday: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return formatLocalDate(d);
};

export const getLocalDateKeyFromIso = (isoString?: string): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return formatLocalDate(d);
};

export type AdminTimeScope = 'day' | 'week' | 'month' | 'all';

export interface DateRange {
  startMs: number;
  endMs: number;
  startDate: Date;
  endDate: Date;
}

export const getDateRangeForScope = (
  scope: AdminTimeScope,
  anchorDate: Date
): DateRange | null => {
  if (scope === 'all') return null;

  const base = isNaN(anchorDate.getTime()) ? new Date() : anchorDate;
  const year = base.getFullYear();
  const month = base.getMonth();
  const day = base.getDate();

  if (scope === 'day') {
    const startDate = new Date(year, month, day, 0, 0, 0, 0);
    const endDate = new Date(year, month, day, 23, 59, 59, 999);
    return {
      startMs: startDate.getTime(),
      endMs: endDate.getTime(),
      startDate,
      endDate,
    };
  }

  if (scope === 'week') {
    const weekDay = base.getDay(); // 0 = Sunday, 1 = Monday, ...
    const diffToMonday = weekDay === 0 ? -6 : 1 - weekDay;
    const startDate = new Date(year, month, day + diffToMonday, 0, 0, 0, 0);
    const endDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + 6,
      23,
      59,
      59,
      999
    );
    return {
      startMs: startDate.getTime(),
      endMs: endDate.getTime(),
      startDate,
      endDate,
    };
  }

  const startDate = new Date(year, month, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return {
    startMs: startDate.getTime(),
    endMs: endDate.getTime(),
    startDate,
    endDate,
  };
};

export const shiftAnchorDate = (
  scope: Exclude<AdminTimeScope, 'all'>,
  anchorDate: Date,
  delta: number
): Date => {
  const base = isNaN(anchorDate.getTime()) ? new Date() : anchorDate;
  if (scope === 'day') {
    return new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta, 12, 0, 0);
  }
  if (scope === 'week') {
    return new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta * 7, 12, 0, 0);
  }
  return new Date(base.getFullYear(), base.getMonth() + delta, 1, 12, 0, 0);
};

export const isIsoInDateRange = (
  isoString: string | undefined,
  range: DateRange | null
): boolean => {
  if (!range) return true;
  if (!isoString) return false;
  const ms = new Date(isoString).getTime();
  if (isNaN(ms)) return false;
  return ms >= range.startMs && ms <= range.endMs;
};

const capitalize = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

export const formatMonthLabel = (date: Date): string => {
  const safe = isNaN(date.getTime()) ? new Date() : date;
  const formatted = safe.toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
  return capitalize(formatted.replace(/\s+de\s+/i, ' '));
};

export const formatScopeRangeLabel = (
  scope: AdminTimeScope,
  anchorDate: Date,
  todayRef = new Date()
): string => {
  if (scope === 'all') return 'Todos los períodos';

  const range = getDateRangeForScope(scope, anchorDate);
  if (!range) return 'Todos los períodos';

  if (scope === 'day') {
    const isSameDay = formatLocalDate(range.startDate) === formatLocalDate(todayRef);
    const label = range.startDate
      .toLocaleDateString('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
      .replace(/\./g, '');
    return isSameDay ? `Hoy · ${capitalize(label)}` : capitalize(label);
  }

  if (scope === 'week') {
    const startLabel = range.startDate
      .toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
      .replace(/\./g, '');
    const endLabel = range.endDate
      .toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
      .replace(/\./g, '');
    return `${startLabel} – ${endLabel}`;
  }

  return formatMonthLabel(range.startDate);
};
