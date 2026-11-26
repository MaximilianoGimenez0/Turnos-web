import rawHolidaysData from '../data/holidays.json';
import { BUSINESS_TIMEZONE, formatBusinessDateKey, isValidDateKey } from './dateUtils';

export type HolidayType =
  | 'inamovible'
  | 'trasladable'
  | 'no_laborable'
  | 'turistico'
  | 'otro';

export interface HolidayInfo {
  date: string;
  name: string;
  description: string;
  type: HolidayType;
}

export interface HolidaysDataset {
  source: string;
  country: string;
  timezone: string;
  year: number;
  holidays: HolidayInfo[];
}

export const HOLIDAYS_DATASET: HolidaysDataset = rawHolidaysData as HolidaysDataset;

const HOLIDAY_BY_DATE: ReadonlyMap<string, HolidayInfo> = new Map(
  HOLIDAYS_DATASET.holidays.map((item) => [item.date, item])
);

const resolveHolidayDateKey = (
  input: Date | string | number | undefined | null,
  timeZone = BUSINESS_TIMEZONE
): string => {
  if (input === undefined || input === null || input === '') return '';
  if (typeof input === 'string' && isValidDateKey(input)) {
    return input.trim();
  }
  return formatBusinessDateKey(input, timeZone);
};

export const getHolidayInfo = (
  input: Date | string | number | undefined | null,
  timeZone = BUSINESS_TIMEZONE
): HolidayInfo | null => {
  const dateKey = resolveHolidayDateKey(input, timeZone);
  if (!dateKey) return null;
  return HOLIDAY_BY_DATE.get(dateKey) ?? null;
};

export const isHoliday = (
  input: Date | string | number | undefined | null,
  timeZone = BUSINESS_TIMEZONE
): boolean => {
  return getHolidayInfo(input, timeZone) !== null;
};

export const getHolidaysInMonth = (year: number, monthIndex: number): HolidayInfo[] => {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
  return HOLIDAYS_DATASET.holidays.filter((item) => item.date.startsWith(prefix));
};

export const formatHolidaySummary = (holiday: HolidayInfo): string =>
  holiday.description ? `${holiday.name} (${holiday.description})` : holiday.name;
