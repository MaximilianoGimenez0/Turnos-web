export const BUSINESS_TIMEZONE = 'America/Argentina/Buenos_Aires';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toValidDate = (input: Date | string | number | undefined | null): Date | null => {
  if (input === undefined || input === null || input === '') return null;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
};

const resolveTimeZone = (timeZone?: string): string => {
  const trimmed = typeof timeZone === 'string' ? timeZone.trim() : '';
  return trimmed || BUSINESS_TIMEZONE;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

const capitalize = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const normalizeEsPunctuation = (value: string): string =>
  value.replace(/\s+,/g, ',').replace(/\./g, '').trim();

export const isValidDateKey = (value: unknown): value is string =>
  typeof value === 'string' && DATE_KEY_PATTERN.test(value.trim());

const dateKeyToNoonUtc = (dateKey: string): Date | null => {
  if (!isValidDateKey(dateKey)) return null;
  const [year, month, day] = dateKey.trim().split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    isNaN(d.getTime()) ||
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
};

/**
 * Formats a Date, timestamp or ISO string into YYYY-MM-DD in the tenant's business timezone
 * (defaults to America/Argentina/Buenos_Aires).
 */
export const formatBusinessDateKey = (
  input: Date | string | number | undefined | null,
  timeZone = BUSINESS_TIMEZONE
): string => {
  if (typeof input === 'string' && isValidDateKey(input)) {
    return input.trim();
  }
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
  input: Date | string | number | undefined | null,
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
  input: Date | string | number | undefined | null,
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

export const getTodayBusinessDateString = (
  timeZone = BUSINESS_TIMEZONE,
  nowRef: Date | number = new Date()
): string => {
  return formatBusinessDateKey(nowRef, timeZone);
};

export const addDaysToDateKey = (dateKey: string, deltaDays: number): string => {
  const ref = dateKeyToNoonUtc(dateKey);
  if (!ref) return '';
  const target = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate() + deltaDays, 12, 0, 0)
  );
  return `${target.getUTCFullYear()}-${pad2(target.getUTCMonth() + 1)}-${pad2(target.getUTCDate())}`;
};

export const addDaysBusinessDateString = (
  daysFromToday: number,
  timeZone = BUSINESS_TIMEZONE,
  nowRef: Date | number = new Date()
): string => {
  const todayKey = getTodayBusinessDateString(timeZone, nowRef);
  return addDaysToDateKey(todayKey, daysFromToday);
};

export interface DateKeyParts {
  weekdayShort: string;
  weekdayLong: string;
  dayNum: string;
  monthShort: string;
  monthLong: string;
  dayMonthShort: string;
  fullDate: string;
}

export const formatDateKeyParts = (dateKey: string): DateKeyParts => {
  const ref = dateKeyToNoonUtc(dateKey);
  if (!ref) {
    return {
      weekdayShort: '',
      weekdayLong: '',
      dayNum: '',
      monthShort: '',
      monthLong: '',
      dayMonthShort: dateKey || '',
      fullDate: dateKey || '',
    };
  }

  const weekdayShort = normalizeEsPunctuation(
    ref.toLocaleDateString('es-AR', { timeZone: 'UTC', weekday: 'short' })
  );
  const weekdayLong = ref
    .toLocaleDateString('es-AR', { timeZone: 'UTC', weekday: 'long' })
    .trim();
  const dayNum = String(ref.getUTCDate());
  const monthShort = normalizeEsPunctuation(
    ref.toLocaleDateString('es-AR', { timeZone: 'UTC', month: 'short' })
  );
  const monthLong = ref
    .toLocaleDateString('es-AR', { timeZone: 'UTC', month: 'long' })
    .trim();
  const dayMonthShort = normalizeEsPunctuation(
    ref.toLocaleDateString('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'short' })
  );
  const fullDate = ref
    .toLocaleDateString('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'long' })
    .trim();

  return {
    weekdayShort,
    weekdayLong,
    dayNum,
    monthShort,
    monthLong,
    dayMonthShort,
    fullDate,
  };
};

/**
 * Formats a YYYY-MM-DD key as a short label (e.g. "jue, 26 nov") using UTC-noon calendar arithmetic.
 */
export const formatDateKeyShort = (dateKey: string): string => {
  const ref = dateKeyToNoonUtc(dateKey);
  if (!ref) return dateKey || '';
  return normalizeEsPunctuation(
    ref.toLocaleDateString('es-AR', {
      timeZone: 'UTC',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  );
};

/**
 * Formats a YYYY-MM-DD key as a long label (e.g. "Jueves, 26 de noviembre de 2026").
 */
export const formatDateKeyLong = (dateKey: string, includeYear = true): string => {
  const ref = dateKeyToNoonUtc(dateKey);
  if (!ref) return dateKey || '';
  const raw = ref.toLocaleDateString('es-AR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(includeYear ? { year: 'numeric' } : {}),
  });
  return capitalize(raw.replace(/\s+,/g, ',').trim());
};

export type AdminTimeScope = 'day' | 'week' | 'month' | 'all';

export interface DateRange {
  startMs: number;
  endMs: number;
  startDateKey: string;
  endDateKey: string;
}

const resolveSafeDateKey = (anchorDateKey: string, timeZone: string): string =>
  dateKeyToNoonUtc(anchorDateKey) ? anchorDateKey.trim() : getTodayBusinessDateString(timeZone);

export const getDateRangeForScope = (
  scope: AdminTimeScope,
  anchorDateKey: string,
  timeZone = BUSINESS_TIMEZONE
): DateRange | null => {
  if (scope === 'all') return null;

  const tz = resolveTimeZone(timeZone);
  const safeKey = resolveSafeDateKey(anchorDateKey, tz);
  const ref = dateKeyToNoonUtc(safeKey)!;
  const year = ref.getUTCFullYear();
  const month = ref.getUTCMonth();

  let startDateKey: string;
  let endDateKey: string;

  if (scope === 'day') {
    startDateKey = safeKey;
    endDateKey = safeKey;
  } else if (scope === 'week') {
    const weekDay = ref.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
    const diffToMonday = weekDay === 0 ? -6 : 1 - weekDay;
    startDateKey = addDaysToDateKey(safeKey, diffToMonday);
    endDateKey = addDaysToDateKey(startDateKey, 6);
  } else {
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0, 12, 0, 0)).getUTCDate();
    startDateKey = `${year}-${pad2(month + 1)}-01`;
    endDateKey = `${year}-${pad2(month + 1)}-${pad2(daysInMonth)}`;
  }

  const nextDayKey = addDaysToDateKey(endDateKey, 1);
  const startIso = buildBusinessIsoFromInputs(startDateKey, '00:00', tz);
  const nextDayStartIso = buildBusinessIsoFromInputs(nextDayKey, '00:00', tz);

  return {
    startMs: new Date(startIso).getTime(),
    endMs: new Date(nextDayStartIso).getTime() - 1,
    startDateKey,
    endDateKey,
  };
};

export const shiftAnchorDateKey = (
  scope: Exclude<AdminTimeScope, 'all'>,
  anchorDateKey: string,
  delta: number,
  timeZone = BUSINESS_TIMEZONE
): string => {
  const safeKey = resolveSafeDateKey(anchorDateKey, resolveTimeZone(timeZone));
  if (scope === 'day') {
    return addDaysToDateKey(safeKey, delta);
  }
  if (scope === 'week') {
    return addDaysToDateKey(safeKey, delta * 7);
  }
  const ref = dateKeyToNoonUtc(safeKey)!;
  const shifted = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + delta, 1, 12, 0, 0));
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-01`;
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

export const formatMonthLabel = (
  anchorDateKey: string,
  timeZone = BUSINESS_TIMEZONE
): string => {
  const safeKey = resolveSafeDateKey(anchorDateKey, resolveTimeZone(timeZone));
  const { year, monthIndex } = parseYearMonth(safeKey);
  return formatYearMonthHeading(year, monthIndex);
};

export const formatScopeRangeLabel = (
  scope: AdminTimeScope,
  anchorDateKey: string,
  timeZone = BUSINESS_TIMEZONE,
  todayKeyOverride?: string
): string => {
  if (scope === 'all') return 'Todos los períodos';

  const tz = resolveTimeZone(timeZone);
  const range = getDateRangeForScope(scope, anchorDateKey, tz);
  if (!range) return 'Todos los períodos';

  if (scope === 'day') {
    const todayKey = todayKeyOverride || getTodayBusinessDateString(tz);
    const isSameDay = range.startDateKey === todayKey;
    const label = capitalize(formatDateKeyShort(range.startDateKey));
    return isSameDay ? `Hoy · ${label}` : label;
  }

  if (scope === 'week') {
    const startLabel = formatDateKeyParts(range.startDateKey).dayMonthShort;
    const endLabel = formatDateKeyParts(range.endDateKey).dayMonthShort;
    return `${startLabel} – ${endLabel}`;
  }

  return formatMonthLabel(range.startDateKey, tz);
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

export const parseYearMonth = (
  dateStr: string,
  timeZone = BUSINESS_TIMEZONE
): { year: number; monthIndex: number } => {
  const parts = (dateStr || '').split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
    return { year, monthIndex: month - 1 };
  }
  const todayKey = getTodayBusinessDateString(timeZone);
  const [fallbackYear, fallbackMonth] = todayKey.split('-').map(Number);
  return { year: fallbackYear, monthIndex: fallbackMonth - 1 };
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
