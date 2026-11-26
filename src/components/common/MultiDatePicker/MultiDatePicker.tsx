import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, CalendarHeart } from 'lucide-react';
import {
  buildCalendarMonthGrid,
  formatDateKeyParts,
  formatYearMonthHeading,
  getTodayBusinessDateString,
  parseYearMonth,
} from '../../../utils/dateUtils';
import {
  formatHolidaySummary,
  getHolidayInfo,
  getHolidaysInMonth,
} from '../../../utils/holidays';
import styles from './MultiDatePicker.module.css';

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

export interface MultiDatePickerProps {
  selectedDates: string[];
  onToggleDate: (dateStr: string) => void;
  minDateStr?: string;
  todayStr?: string;
  timeZone?: string;
  disabled?: boolean;
}

export const MultiDatePicker: React.FC<MultiDatePickerProps> = ({
  selectedDates,
  onToggleDate,
  minDateStr,
  todayStr,
  timeZone,
  disabled = false,
}) => {
  const effectiveTodayStr = todayStr || getTodayBusinessDateString(timeZone);
  const effectiveMinStr = minDateStr || effectiveTodayStr;
  const minYm = useMemo(() => parseYearMonth(effectiveMinStr, timeZone), [effectiveMinStr, timeZone]);

  const [viewMonth, setViewMonth] = useState<{ year: number; monthIndex: number }>(() =>
    parseYearMonth(effectiveMinStr, timeZone)
  );
  const [holidaysOpen, setHolidaysOpen] = useState(false);

  const canGoPrevMonth =
    viewMonth.year > minYm.year ||
    (viewMonth.year === minYm.year && viewMonth.monthIndex > minYm.monthIndex);

  const isViewingMinMonth =
    viewMonth.year === minYm.year && viewMonth.monthIndex === minYm.monthIndex;

  const monthHeading = useMemo(
    () => formatYearMonthHeading(viewMonth.year, viewMonth.monthIndex),
    [viewMonth.year, viewMonth.monthIndex]
  );

  const cells = useMemo(
    () => buildCalendarMonthGrid(viewMonth.year, viewMonth.monthIndex),
    [viewMonth.year, viewMonth.monthIndex]
  );

  const monthHolidays = useMemo(
    () => getHolidaysInMonth(viewMonth.year, viewMonth.monthIndex),
    [viewMonth.year, viewMonth.monthIndex]
  );

  const shiftMonth = (delta: number) => {
    setViewMonth((prev) => {
      const nextDate = new Date(Date.UTC(prev.year, prev.monthIndex + delta, 15, 12, 0, 0));
      const nextYm = {
        year: nextDate.getUTCFullYear(),
        monthIndex: nextDate.getUTCMonth(),
      };
      if (
        nextYm.year < minYm.year ||
        (nextYm.year === minYm.year && nextYm.monthIndex < minYm.monthIndex)
      ) {
        return minYm;
      }
      return nextYm;
    });
  };

  const handleSelectCell = (dateStr: string, isCurrentMonth: boolean) => {
    if (disabled || dateStr < effectiveMinStr) return;
    if (!isCurrentMonth) {
      setViewMonth(parseYearMonth(dateStr));
    }
    onToggleDate(dateStr);
  };

  return (
    <div className={styles.calendarCard} role="group" aria-label="Calendario de fechas disponibles">
      <div className={styles.calendarHeader}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => shiftMonth(-1)}
          disabled={disabled || !canGoPrevMonth}
          aria-label="Mes anterior"
          title="Mes anterior"
        >
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>

        <div className={styles.monthTitleCluster}>
          <span className={styles.monthTitle}>{monthHeading}</span>
          {!isViewingMinMonth && (
            <button
              type="button"
              className={styles.jumpTodayBtn}
              onClick={() => setViewMonth(minYm)}
              disabled={disabled}
            >
              Hoy
            </button>
          )}
        </div>

        <button
          type="button"
          className={styles.navBtn}
          onClick={() => shiftMonth(1)}
          disabled={disabled}
          aria-label="Mes siguiente"
          title="Mes siguiente"
        >
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.weekdaysRow} aria-hidden="true">
        {WEEKDAY_HEADERS.map((label) => (
          <span key={label} className={styles.weekdayCell}>
            {label}
          </span>
        ))}
      </div>

      <div className={styles.daysGrid}>
        {cells.map((cell) => {
          const isPast = cell.dateStr < effectiveMinStr;
          const isToday = cell.dateStr === effectiveTodayStr;
          const isSelected = selectedDates.includes(cell.dateStr);
          const holiday = getHolidayInfo(cell.dateStr);
          const holidaySummary = holiday ? formatHolidaySummary(holiday) : undefined;

          return (
            <button
              key={cell.dateStr}
              type="button"
              className={`${styles.dayBtn} ${
                !cell.isCurrentMonth ? styles.dayOutsideMonth : ''
              } ${isToday ? styles.dayToday : ''} ${
                holiday ? styles.dayHoliday : ''
              } ${isSelected ? styles.daySelected : ''} ${isPast ? styles.dayDisabled : ''}`}
              onClick={() => handleSelectCell(cell.dateStr, cell.isCurrentMonth)}
              disabled={disabled || isPast}
              aria-pressed={isSelected}
              title={holidaySummary}
              aria-label={`${cell.dateStr}${isToday ? ' (hoy)' : ''}${
                holiday ? ` — ${holiday.description}: ${holiday.name}` : ''
              }`}
            >
              <span className={styles.dayNum}>{cell.dayNumber}</span>
              {(isToday || holiday) && (
                <span className={styles.dotsRow} aria-hidden="true">
                  {isToday && <span className={styles.todayDot} />}
                  {holiday && <span className={styles.holidayDot} />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {monthHolidays.length > 0 && (
        <div className={styles.holidaysLegend} aria-label="Feriados del mes visible">
          <button
            type="button"
            className={styles.holidaysLegendToggle}
            onClick={() => setHolidaysOpen((prev) => !prev)}
            aria-expanded={holidaysOpen}
          >
            <span className={styles.holidaysLegendHeader}>
              <CalendarHeart size={13} strokeWidth={1.85} aria-hidden="true" />
              <span>Feriados en este mes</span>
              <span className={styles.holidaysCountBadge}>{monthHolidays.length}</span>
            </span>
            <ChevronDown
              size={14}
              strokeWidth={2}
              className={`${styles.holidaysChevron} ${
                holidaysOpen ? styles.holidaysChevronOpen : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {holidaysOpen && (
            <ul className={styles.holidaysLegendList}>
              {monthHolidays.map((holiday) => {
                const { dayMonthShort } = formatDateKeyParts(holiday.date);
                return (
                  <li
                    key={holiday.date}
                    className={styles.holidayLegendItem}
                    title={holiday.description}
                  >
                    <span className={styles.holidayLegendDate}>{dayMonthShort}</span>
                    <span className={styles.holidayLegendName}>{holiday.name}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiDatePicker;
