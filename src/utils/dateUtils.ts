export const BUSINESS_TIMEZONE = 'America/Argentina/Buenos_Aires';

const toValidDate = (input: Date | string | undefined | null): Date | null => {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
};

const resolveTimeZone = (timeZone?: string): string => {
  const trimmed = typeof timeZone === 'string' ? timeZone.trim() : '';
  return trimmed || BUSINESS_TIMEZONE;
};

/**
 * Formats a Date or ISO string into YYYY-MM-DD in the tenant's business timezone
 * (defaults to America/Argentina/Buenos_Aires).
 */
export const formatBusinessDateKey = (
  input: Date | string | undefined | null,
  timeZone = BUSINESS_TIMEZONE
): string => {
  const d = toValidDate(input);
  if (!d) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : '';
};

/**
 * Returns the hour (0-23) of a Date/ISO in the tenant's business timezone.
 */
export const getBusinessHour = (
  input: Date | string | undefined | null,
  timeZone = BUSINESS_TIMEZONE
): number => {
  const d = toValidDate(input);
  if (!d) return 0;
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveTimeZone(timeZone),
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(d);
  const parsed = Number(hourStr);
  return isNaN(parsed) ? 0 : parsed % 24;
};

/**
 * Formats HH:mm (24h) in the tenant's business timezone.
 */
export const formatBusinessTime = (
  input: Date | string | undefined | null,
  timeZone = BUSINESS_TIMEZONE
): string => {
  const d = toValidDate(input);
  if (!d) return '';
  return d.toLocaleTimeString('es-AR', {
    timeZone: resolveTimeZone(timeZone),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/**
 * Builds an exact UTC ISO string from a local date (YYYY-MM-DD) and time (HH:mm)
 * interpreted in the tenant's business timezone, independent of the user's browser timezone.
 */
export const buildBusinessIsoFromInputs = (
  dateStr: string,
  timeStr: string,
  timeZone = BUSINESS_TIMEZONE
): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (
    isNaN(year) ||
    isNaN(month) ||
    isNaN(day) ||
    isNaN(hours) ||
    isNaN(minutes)
  ) {
    return '';
  }

  // Compute the exact timezone offset for the target timezone at this wall time
  const utcGuessMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcGuessMs));

  const tzYear = Number(parts.find((p) => p.type === 'year')?.value);
  const tzMonth = Number(parts.find((p) => p.type === 'month')?.value);
  const tzDay = Number(parts.find((p) => p.type === 'day')?.value);
  const tzHour = Number(parts.find((p) => p.type === 'hour')?.value) % 24;
  const tzMinute = Number(parts.find((p) => p.type === 'minute')?.value);
  const tzSecond = Number(parts.find((p) => p.type === 'second')?.value);

  const representedAsUtcMs = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond, 0);
  const offsetMs = representedAsUtcMs - utcGuessMs;
  return new Date(utcGuessMs - offsetMs).toISOString();
};

export const getTodayBusinessDateString = (timeZone = BUSINESS_TIMEZONE): string => {
  return formatBusinessDateKey(new Date(), timeZone);
};

export const addDaysBusinessDateString = (
  daysFromToday: number,
  timeZone = BUSINESS_TIMEZONE
): string => {
  const todayKey = getTodayBusinessDateString(timeZone);
  const [y, m, d] = todayKey.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d + daysFromToday, 12, 0, 0));
  return formatBusinessDateKey(target, timeZone);
};

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

export const getLocalDateKeyFromIso = (
  isoString?: string,
  timeZone = BUSINESS_TIMEZONE
): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return formatBusinessDateKey(d, timeZone);
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

export const HALF_HOUR_MINUTES = ['00', '30'] as const;
export type HalfHourMinute = (typeof HALF_HOUR_MINUTES)[number];

export const HOURS_24: readonly string[] = Array.from({ length: 24 }, (_, h) =>
  String(h).padStart(2, '0')
);

export const HALF_HOUR_SLOTS_24H: readonly string[] = HOURS_24.flatMap((h) =>
  HALF_HOUR_MINUTES.map((m) => `${h}:${m}`)
);

export interface CalendarMonthDay {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

export const parseYearMonth = (dateStr: string): { year: number; monthIndex: number } => {
  const parts = (dateStr || '').split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
    return { year, monthIndex: month - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
};

export const formatYearMonthHeading = (year: number, monthIndex: number): string => {
  const ref = new Date(Date.UTC(year, monthIndex, 15, 12, 0, 0));
  const formatted = ref.toLocaleDateString('es-AR', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
  return capitalize(formatted.replace(/\s+de\s+/i, ' '));
};

/**
 * Builds a Monday-first calendar grid (35 or 42 cells) for a given year and 0-indexed month.
 */
export const buildCalendarMonthGrid = (
  year: number,
  monthIndex: number
): CalendarMonthDay[] => {
  const firstOfMonthUtc = new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0));
  const firstWeekdayMonBased = (firstOfMonthUtc.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0)).getUTCDate();
  const totalCells = Math.ceil((firstWeekdayMonBased + daysInMonth) / 7) * 7;

  const cells: CalendarMonthDay[] = [];
  for (let i = 0; i < totalCells; i++) {
    const cellUtc = new Date(Date.UTC(year, monthIndex, 1 - firstWeekdayMonBased + i, 12, 0, 0));
    const cellYear = cellUtc.getUTCFullYear();
    const cellMonth = cellUtc.getUTCMonth();
    const cellDay = cellUtc.getUTCDate();

    cells.push({
      dateStr: `${cellYear}-${pad2(cellMonth + 1)}-${pad2(cellDay)}`,
      dayNumber: cellDay,
      isCurrentMonth: cellYear === year && cellMonth === monthIndex,
    });
  }

  return cells;
};
