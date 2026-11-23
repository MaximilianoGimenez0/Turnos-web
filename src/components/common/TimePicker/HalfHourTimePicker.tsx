import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Clock, Plus } from 'lucide-react';
import { HALF_HOUR_MINUTES, HOURS_24, type HalfHourMinute } from '../../../utils/dateUtils';
import Button from '../Button/Button';
import styles from './HalfHourTimePicker.module.css';

export interface HalfHourTimePickerProps {
  value: string;
  onChange: (nextTime: string) => void;
  onAdd: (timeToAdd: string) => void;
  isTimeDisabled?: (timeStr: string) => boolean;
  isAlreadySelected?: boolean;
  disabled?: boolean;
  addButtonLabel?: string;
}

const parseHourMinute = (val: string): { hour: string; minute: HalfHourMinute } => {
  const [rawH, rawM] = (val || '09:00').split(':');
  const hNum = Number(rawH);
  const hour = Number.isFinite(hNum) && hNum >= 0 && hNum <= 23
    ? String(hNum).padStart(2, '0')
    : '09';
  const minute: HalfHourMinute = rawM === '30' ? '30' : '00';
  return { hour, minute };
};

export const HalfHourTimePicker: React.FC<HalfHourTimePickerProps> = ({
  value,
  onChange,
  onAdd,
  isTimeDisabled,
  isAlreadySelected = false,
  disabled = false,
  addButtonLabel = 'Agregar',
}) => {
  const [hourMenuOpen, setHourMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { hour, minute } = parseHourMinute(value);
  const currentTime = `${hour}:${minute}`;
  const isCurrentDisabled = isTimeDisabled ? isTimeDisabled(currentTime) : false;

  useEffect(() => {
    if (!hourMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setHourMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHourMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [hourMenuOpen]);

  const handleSelectHour = (nextHour: string) => {
    const candidateSameMin = `${nextHour}:${minute}`;
    const otherMin: HalfHourMinute = minute === '00' ? '30' : '00';
    const candidateOtherMin = `${nextHour}:${otherMin}`;

    if (
      isTimeDisabled &&
      isTimeDisabled(candidateSameMin) &&
      !isTimeDisabled(candidateOtherMin)
    ) {
      onChange(candidateOtherMin);
    } else {
      onChange(candidateSameMin);
    }
    setHourMenuOpen(false);
  };

  const handleSelectMinute = (nextMin: HalfHourMinute) => {
    onChange(`${hour}:${nextMin}`);
  };

  return (
    <div ref={containerRef} className={styles.wrapper}>
      <div className={styles.pickerRow}>
        <div className={styles.controlsCluster}>
          <div className={styles.hourDropdownWrap}>
            <button
              type="button"
              className={`${styles.hourTriggerBtn} ${hourMenuOpen ? styles.hourTriggerOpen : ''}`}
              onClick={() => setHourMenuOpen((prev) => !prev)}
              disabled={disabled}
              aria-expanded={hourMenuOpen}
              aria-haspopup="listbox"
              aria-label={`Seleccionar hora, actual ${hour} horas`}
            >
              <Clock size={14} strokeWidth={1.75} className={styles.clockIcon} aria-hidden="true" />
              <span className={styles.hourValue}>{hour}</span>
              <span className={styles.hourSuffix}>hs</span>
              <ChevronDown
                size={14}
                strokeWidth={1.75}
                className={`${styles.chevronIcon} ${hourMenuOpen ? styles.chevronRotated : ''}`}
                aria-hidden="true"
              />
            </button>

            {hourMenuOpen && (
              <div
                className={styles.hourPopover}
                role="listbox"
                aria-label="Horas disponibles en formato 24 horas"
              >
                <div className={styles.hourGrid}>
                  {HOURS_24.map((h) => {
                    const isActive = h === hour;
                    const bothDisabled = isTimeDisabled
                      ? isTimeDisabled(`${h}:00`) && isTimeDisabled(`${h}:30`)
                      : false;

                    return (
                      <button
                        key={h}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        className={`${styles.hourOptionBtn} ${
                          isActive ? styles.hourOptionActive : ''
                        } ${bothDisabled ? styles.hourOptionDisabled : ''}`}
                        onClick={() => handleSelectHour(h)}
                        disabled={disabled || bothDisabled}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div
            className={styles.minuteSegmented}
            role="group"
            aria-label="Elegir intervalo de media hora"
          >
            {HALF_HOUR_MINUTES.map((min) => {
              const candidate = `${hour}:${min}`;
              const isMinSelected = minute === min;
              const isMinDisabled = isTimeDisabled ? isTimeDisabled(candidate) : false;

              return (
                <button
                  key={min}
                  type="button"
                  className={`${styles.minuteBtn} ${
                    isMinSelected ? styles.minuteBtnActive : ''
                  } ${isMinDisabled ? styles.minuteBtnDisabled : ''}`}
                  onClick={() => handleSelectMinute(min)}
                  disabled={disabled || isMinDisabled}
                  aria-pressed={isMinSelected}
                >
                  :{min}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="md"
          className={styles.addBtn}
          onClick={() => onAdd(currentTime)}
          disabled={disabled || isCurrentDisabled || isAlreadySelected}
          leftIcon={<Plus size={15} strokeWidth={1.75} aria-hidden="true" />}
        >
          {addButtonLabel}
        </Button>
      </div>

      {isAlreadySelected && !isCurrentDisabled && (
        <span className={styles.statusHint}>
          El horario {currentTime} hs ya está agregado arriba.
        </span>
      )}
    </div>
  );
};

export default HalfHourTimePicker;
