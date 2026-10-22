import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  CalendarPlus,
  X,
  AlertCircle,
  DollarSign,
  Calendar,
  Plus,
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { NewSlotData, Slot, ServiceItem } from '../../../types';
import { subscribeToServices } from '../../../services/servicesService';
import { validatePositiveInteger, validateRequiredText } from '../../../utils/validators';
import { getTodayLocalDateString, addDaysLocalDateString } from '../../../utils/dateUtils';
import Input from '../../common/Input/Input';
import Button from '../../common/Button/Button';
import Loader from '../../common/Loader/Loader';
import AlertModal, { type AlertModalType } from '../../common/AlertModal';
import { CREATE_SLOT_MODAL_TEXTS } from '../../../texts';
import styles from './CreateSlotModal.module.css';

export interface CreateSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSlot: (slotData: NewSlotData) => Promise<string | void>;
  onCreateMultipleSlots?: (slotsData: NewSlotData[]) => Promise<string[] | void>;
  existingSlots?: Slot[];
}

const TIME_PRESETS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];

const RECOMMENDED_DAYS = CREATE_SLOT_MODAL_TEXTS.recommendedDays;

export const CreateSlotModal: React.FC<CreateSlotModalProps> = ({
  isOpen,
  onClose,
  onCreateSlot,
  onCreateMultipleSlots,
  existingSlots = [],
}) => {
  const [availableServices, setAvailableServices] = useState<ServiceItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customServiceName, setCustomServiceName] = useState('');
  const [depositAmount, setDepositAmount] = useState('5000');

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [tempDate, setTempDate] = useState<string>(() => getTodayLocalDateString());

  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [tempTime, setTempTime] = useState<string>('09:00');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: AlertModalType;
    details?: string[];
  }>({
    isOpen: false,
    message: '',
    type: 'warning',
  });

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  const todayStr = getTodayLocalDateString();

  const isPastTimeToday = (timeStr: string): boolean => {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const timeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    return timeDate <= now;
  };

  const isTimeDisabled = useCallback(
    (timeStr: string): boolean => {
      if (!selectedDates.includes(todayStr)) {
        return false;
      }
      return isPastTimeToday(timeStr);
    },
    [selectedDates, todayStr]
  );

  useEffect(() => {
    const unsubscribe = subscribeToServices((data) => {
      setAvailableServices(data);
    });
    return () => unsubscribe();
  }, []);

  const calculatedDuration = useMemo(() => {
    if (selectedServices.length === 0) return 30;
    const total = availableServices
      .filter((s) => selectedServices.includes(s.name))
      .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    return total > 0 ? total : 30;
  }, [availableServices, selectedServices]);

  const resetForm = () => {
    setSelectedServices([]);
    setCustomServiceName('');
    setDepositAmount('5000');
    setSelectedDates([]);
    setSelectedTimes([]);
    setTempDate(getTodayLocalDateString());
    setTempTime('09:00');
    setIsSubmitting(false);
  };

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  }, [isSubmitting, onClose]);

  const handleToggleService = (name: string) => {
    setSelectedServices((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const handleSelectAllServices = () => {
    setSelectedServices(availableServices.map((s) => s.name));
  };

  const handleClearServices = () => {
    setSelectedServices([]);
  };

  const handleAddDate = (dateToAdd?: string) => {
    const targetDate = dateToAdd || tempDate;
    if (!targetDate) return;

    if (targetDate < todayStr) {
      setAlertState({
        isOpen: true,
        title: CREATE_SLOT_MODAL_TEXTS.alerts.invalidDateTitle,
        message: CREATE_SLOT_MODAL_TEXTS.alerts.invalidDateMessage,
        type: 'warning',
      });
      return;
    }

    if (!selectedDates.includes(targetDate)) {
      setSelectedDates((prev) => [...prev, targetDate].sort());
      setTempDate('');

      if (targetDate === todayStr) {
        setSelectedTimes((prev) => prev.filter((t) => !isPastTimeToday(t)));
      }
    }
  };

  const handleRemoveDate = (dateToRemove: string) => {
    setSelectedDates((prev) => prev.filter((d) => d !== dateToRemove));
  };

  const handleToggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      handleRemoveDate(dateStr);
    } else {
      handleAddDate(dateStr);
    }
  };

  const handleAddTime = (timeToAdd?: string) => {
    const targetTime = (timeToAdd || tempTime).trim();
    if (!targetTime) return;

    const parts = targetTime.split(':');
    if (parts.length !== 2) {
      setAlertState({
        isOpen: true,
        title: CREATE_SLOT_MODAL_TEXTS.alerts.invalidTimeTitle,
        message: CREATE_SLOT_MODAL_TEXTS.alerts.invalidTimeFormatMessage,
        type: 'warning',
      });
      return;
    }

    const [hours, minutes] = parts.map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23) {
      setAlertState({
        isOpen: true,
        title: CREATE_SLOT_MODAL_TEXTS.alerts.invalidTimeTitle,
        message: CREATE_SLOT_MODAL_TEXTS.alerts.invalidTimeValidMessage,
        type: 'warning',
      });
      return;
    }

    if (minutes !== 0 && minutes !== 30) {
      setAlertState({
        isOpen: true,
        title: CREATE_SLOT_MODAL_TEXTS.alerts.not30MinIntervalTitle,
        message: CREATE_SLOT_MODAL_TEXTS.alerts.not30MinIntervalMessage,
        type: 'warning',
      });
      return;
    }

    const normalizedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    if (isTimeDisabled(normalizedTime)) {
      setAlertState({
        isOpen: true,
        title: CREATE_SLOT_MODAL_TEXTS.alerts.pastTimeTitle,
        message: CREATE_SLOT_MODAL_TEXTS.alerts.pastTimeMessage,
        type: 'warning',
      });
      return;
    }

    if (!selectedTimes.includes(normalizedTime)) {
      setSelectedTimes((prev) => [...prev, normalizedTime].sort());
    }
  };

  const handleRemoveTime = (timeToRemove: string) => {
    setSelectedTimes((prev) => prev.filter((t) => t !== timeToRemove));
  };

  const generatedSlots = useMemo(() => {
    const slots: Array<{
      dateStr: string;
      timeStr: string;
      datetimeIso: string;
      dateLabel: string;
      timeLabel: string;
      isPast: boolean;
      isDuplicate: boolean;
    }> = [];

    const now = new Date();

    selectedDates.forEach((dateStr) => {
      selectedTimes.forEach((timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const [year, month, day] = dateStr.split('-').map(Number);

        const slotDate = new Date(year, month - 1, day, hours, minutes);
        const isPast = slotDate <= now;
        const slotTimeMs = slotDate.getTime();

        const isDuplicate =
          existingSlots?.some(
            (s) => s.status !== 'cancelled' && new Date(s.datetime).getTime() === slotTimeMs
          ) ?? false;

        const dateLabel = slotDate.toLocaleDateString('es-AR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });

        slots.push({
          dateStr,
          timeStr,
          datetimeIso: slotDate.toISOString(),
          dateLabel,
          timeLabel: `${timeStr} hs`,
          isPast,
          isDuplicate,
        });
      });
    });

    return slots.sort(
      (a, b) => new Date(a.datetimeIso).getTime() - new Date(b.datetimeIso).getTime()
    );
  }, [selectedDates, selectedTimes, existingSlots]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedServices.length === 0) {
      setAlertState({
        isOpen: true,
        title: CREATE_SLOT_MODAL_TEXTS.alerts.serviceRequiredTitle,
        message: CREATE_SLOT_MODAL_TEXTS.alerts.serviceRequiredMessage,
        type: 'warning',
        details: [...CREATE_SLOT_MODAL_TEXTS.alerts.serviceRequiredDetails],
      });
      return;
    }

    if (selectedDates.length === 0) {
      setAlertState({
        isOpen: true,
        title: CREATE_SLOT_MODAL_TEXTS.alerts.datesRequiredTitle,
        message: CREATE_SLOT_MODAL_TEXTS.alerts.datesRequiredMessage,
        type: 'warning',
      });
      return;
    }

    if (selectedTimes.length === 0) {
      setAlertState({
        isOpen: true,
        title: CREATE_SLOT_MODAL_TEXTS.alerts.timesRequiredTitle,
        message: CREATE_SLOT_MODAL_TEXTS.alerts.timesRequiredMessage,
        type: 'warning',
      });
      return;
    }

    const depositValidation = validatePositiveInteger(
      depositAmount,
      CREATE_SLOT_MODAL_TEXTS.section1.depositField,
      1,
      5000000
    );

    if (!depositValidation.isValid || !depositValidation.parsedValue) {
      setAlertState({
        isOpen: true,
        title: CREATE_SLOT_MODAL_TEXTS.alerts.invalidDepositTitle,
        message:
          depositValidation.error ||
          CREATE_SLOT_MODAL_TEXTS.alerts.invalidDepositFallback,
        type: 'warning',
      });
      return;
    }

    const deposit = depositValidation.parsedValue;

    const finalServiceName = customServiceName.trim() || selectedServices.join(' + ');
    const serviceValidation = validateRequiredText(
      finalServiceName,
      CREATE_SLOT_MODAL_TEXTS.section1.serviceNameField,
      2,
      120
    );
    if (!serviceValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: CREATE_SLOT_MODAL_TEXTS.alerts.invalidServiceTitle,
        message: serviceValidation.error || CREATE_SLOT_MODAL_TEXTS.alerts.invalidServiceFallback,
        type: 'warning',
      });
      return;
    }

    const validFutureSlots = generatedSlots.filter((s) => !s.isPast);

    if (validFutureSlots.length === 0) {
      setAlertState({
        isOpen: true,
        title: CREATE_SLOT_MODAL_TEXTS.alerts.pastSlotsRestrictionTitle,
        message: CREATE_SLOT_MODAL_TEXTS.alerts.pastSlotsRestrictionMessage,
        type: 'restriction',
      });
      return;
    }

    const duplicateSlots = validFutureSlots.filter((s) => s.isDuplicate);
    if (duplicateSlots.length > 0) {
      const duplicateDescriptions = duplicateSlots
        .slice(0, 5)
        .map((d) => `${d.dateLabel} - ${d.timeLabel}`);
      if (duplicateSlots.length > 5) {
        duplicateDescriptions.push(CREATE_SLOT_MODAL_TEXTS.alerts.andMoreDuplicates(duplicateSlots.length - 5));
      }

      setAlertState({
        isOpen: true,
        title: CREATE_SLOT_MODAL_TEXTS.alerts.duplicateSlotsTitle,
        message:
          CREATE_SLOT_MODAL_TEXTS.alerts.duplicateSlotsMessage,
        type: 'restriction',
        details: duplicateDescriptions,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedServiceObjects: ServiceItem[] = availableServices.filter((s) =>
        selectedServices.includes(s.name)
      );

      const slotsToCreate: NewSlotData[] = validFutureSlots.map((item) => ({
        datetime: item.datetimeIso,
        depositAmount: deposit,
        serviceName: finalServiceName,
        services: selectedServiceObjects,
        estimatedDurationMinutes: calculatedDuration,
        estimatedDuration: `${calculatedDuration} min`,
      }));

      if (onCreateMultipleSlots) {
        await onCreateMultipleSlots(slotsToCreate);
      } else {
        for (const s of slotsToCreate) {
          await onCreateSlot(s);
        }
      }

      handleClose();
    } catch (err: unknown) {
      console.error(CREATE_SLOT_MODAL_TEXTS.logs.createError, err);
      const msg = err instanceof Error ? err.message : CREATE_SLOT_MODAL_TEXTS.alerts.unexpectedError;
      const isConflict =
        msg.toLowerCase().includes('conflicto') ||
        msg.toLowerCase().includes('reservado') ||
        msg.toLowerCase().includes('existe');
      setAlertState({
        isOpen: true,
        title: isConflict ? CREATE_SLOT_MODAL_TEXTS.alerts.conflictTitle : CREATE_SLOT_MODAL_TEXTS.alerts.restrictionTitle,
        message: msg,
        type: isConflict ? 'restriction' : 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.creationPanel} aria-labelledby="create-slot-title">
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title={alertState.title || CREATE_SLOT_MODAL_TEXTS.alerts.attentionTitle}
        message={alertState.message}
        type={alertState.type || 'restriction'}
      />
      <div className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <div className={styles.iconWrapper}>
            <Layers size={22} />
          </div>
          <div>
            <h3 id="create-slot-title" className={styles.title}>
              {CREATE_SLOT_MODAL_TEXTS.header.title}
            </h3>
            <p className={styles.subtitle}>
              {CREATE_SLOT_MODAL_TEXTS.header.subtitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          onClick={handleClose}
          aria-label={CREATE_SLOT_MODAL_TEXTS.header.closeAriaLabel}
          disabled={isSubmitting}
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeaderRow}>
            <h4 className={styles.sectionHeading}>
              <Sparkles size={16} color="var(--color-primary)" />
              {CREATE_SLOT_MODAL_TEXTS.section1.heading(selectedServices.length)}
            </h4>
            <div className={styles.headerRightActions}>
              <span className={styles.totalDurationCounter}>
                <Clock size={12} /> {CREATE_SLOT_MODAL_TEXTS.section1.estimatedMinutes(calculatedDuration)}
              </span>
              {availableServices.length > 0 && (
                <>
                  <button
                    type="button"
                    className={styles.clearServicesBtn}
                    onClick={handleSelectAllServices}
                    disabled={isSubmitting}
                  >
                    {CREATE_SLOT_MODAL_TEXTS.section1.selectAll}
                  </button>
                  {selectedServices.length > 0 && (
                    <button
                      type="button"
                      className={styles.clearServicesBtn}
                      onClick={handleClearServices}
                      disabled={isSubmitting}
                    >
                      {CREATE_SLOT_MODAL_TEXTS.section1.unselect}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className={styles.quickActionRow}>
            {availableServices.length === 0 ? (
              <span className={styles.emptyChipsNotice}>
                {CREATE_SLOT_MODAL_TEXTS.section1.emptyNotice}
              </span>
            ) : (
              availableServices.map((service) => {
                const isSelected = selectedServices.includes(service.name);
                return (
                  <button
                    key={service.id}
                    type="button"
                    className={`${styles.quickBtn} ${isSelected ? styles.quickBtnActive : ''}`}
                    onClick={() => handleToggleService(service.name)}
                    disabled={isSubmitting}
                  >
                    {isSelected ? `✓ ${service.name}` : `+ ${service.name}`}
                    <span className={styles.badgeDuration}>
                      ({service.durationMinutes ? `${service.durationMinutes}m` : '30m'}
                      {service.basePrice ? ` • $${service.basePrice.toLocaleString('es-AR')}` : ''}
                      {service.extras && service.extras.length > 0 ? ` • ${service.extras.length} extras` : ''})
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className={styles.formGrid}>
            <div>
              <Input
                label={CREATE_SLOT_MODAL_TEXTS.section1.serviceNameLabel}
                placeholder={
                  selectedServices.length > 0
                    ? selectedServices.join(' + ')
                    : CREATE_SLOT_MODAL_TEXTS.section1.serviceNamePlaceholder
                }
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                disabled={isSubmitting}
                helperText={CREATE_SLOT_MODAL_TEXTS.section1.serviceNameHelper}
              />
            </div>

            <div>
              <Input
                label={CREATE_SLOT_MODAL_TEXTS.section1.depositLabel}
                type="text"
                inputMode="numeric"
                numericOnly
                maxDigits={8}
                placeholder={CREATE_SLOT_MODAL_TEXTS.section1.depositPlaceholder}
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                disabled={isSubmitting}
                leftIcon={<DollarSign size={16} />}
                helperText={CREATE_SLOT_MODAL_TEXTS.section1.depositHelper}
              />
            </div>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <h4 className={styles.sectionHeading}>
            <Calendar size={16} color="var(--color-primary)" />
            {CREATE_SLOT_MODAL_TEXTS.section2.heading(selectedDates.length)}
          </h4>

          <div className={styles.quickActionRow}>
            <span className={styles.quickLabel}>{CREATE_SLOT_MODAL_TEXTS.section2.recommendedLabel}</span>
            {RECOMMENDED_DAYS.map((item) => {
              const dateStr = addDaysLocalDateString(item.days);
              const isSelected = selectedDates.includes(dateStr);
              return (
                <button
                  key={item.days}
                  type="button"
                  className={`${styles.quickBtn} ${isSelected ? styles.quickBtnActive : ''}`}
                  onClick={() => handleToggleDate(dateStr)}
                  disabled={isSubmitting}
                >
                  {isSelected ? `✓ ${item.label}` : `+ ${item.label}`}
                </button>
              );
            })}
          </div>

          <div className={styles.inputAddRow}>
            <input
              type="date"
              className={styles.customDateInput}
              value={tempDate}
              min={todayStr}
              onChange={(e) => setTempDate(e.target.value)}
              disabled={isSubmitting}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleAddDate()}
              disabled={!tempDate || isSubmitting}
              leftIcon={<Plus size={15} />}
            >
              {CREATE_SLOT_MODAL_TEXTS.section2.addDayButton}
            </Button>
          </div>

          <div className={styles.chipsContainer}>
            {selectedDates.length === 0 ? (
              <span className={styles.emptyChipsNotice}>
                {CREATE_SLOT_MODAL_TEXTS.section2.emptyNotice}
              </span>
            ) : (
              selectedDates.map((dateStr) => {
                const [y, m, d] = dateStr.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const formatted = dateObj.toLocaleDateString('es-AR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });
                return (
                  <div key={dateStr} className={styles.chip}>
                    <Calendar size={13} />
                    <span className={styles.chipText}>{formatted}</span>
                    <button
                      type="button"
                      className={styles.chipRemove}
                      onClick={() => handleRemoveDate(dateStr)}
                      title={CREATE_SLOT_MODAL_TEXTS.section2.removeDayTitle}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={styles.sectionCard}>
          <h4 className={styles.sectionHeading}>
            <Clock size={16} color="var(--color-primary)" />
            {CREATE_SLOT_MODAL_TEXTS.section3.heading(selectedTimes.length)}
          </h4>

          <div className={styles.quickActionRow}>
            <span className={styles.quickLabel}>{CREATE_SLOT_MODAL_TEXTS.section3.recommendedLabel}</span>
            {TIME_PRESETS.map((t) => {
              const disabled = isTimeDisabled(t);
              const isSelected = selectedTimes.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  className={`${styles.quickBtn} ${isSelected ? styles.quickBtnActive : ''} ${disabled ? styles.quickBtnDisabled : ''
                    }`}
                  onClick={() => (isSelected ? handleRemoveTime(t) : handleAddTime(t))}
                  disabled={disabled || isSubmitting}
                  title={disabled ? CREATE_SLOT_MODAL_TEXTS.section3.disabledTooltip : undefined}
                >
                  {isSelected ? `✓ ${t}` : `+ ${t}`}
                </button>
              );
            })}
          </div>

          <div className={styles.inputAddRow}>
            <input
              type="time"
              step="1800"
              list="slot-30min-times"
              className={styles.customDateInput}
              value={tempTime}
              onChange={(e) => setTempTime(e.target.value)}
              disabled={isSubmitting}
            />
            <datalist id="slot-30min-times">
              {Array.from({ length: 30 }, (_, i) => {
                const totalMinutes = 8 * 60 + i * 30;
                const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
                const m = (totalMinutes % 60).toString().padStart(2, '0');
                return `${h}:${m}`;
              }).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleAddTime()}
              disabled={!tempTime || isTimeDisabled(tempTime) || isSubmitting}
              leftIcon={<Plus size={15} />}
            >
              {CREATE_SLOT_MODAL_TEXTS.section3.addTimeButton}
            </Button>
          </div>

          {tempTime && !['00', '30'].includes(tempTime.split(':')[1]) && (
            <span className={styles.timeWarningNotice}>
              {CREATE_SLOT_MODAL_TEXTS.section3.intervalsWarning}
            </span>
          )}

          {isTimeDisabled(tempTime) && selectedDates.includes(todayStr) && (
            <span className={styles.timeWarningNotice}>
              {CREATE_SLOT_MODAL_TEXTS.section3.pastTimeWarning(tempTime)}
            </span>
          )}

          <div className={styles.chipsContainer}>
            {selectedTimes.length === 0 ? (
              <span className={styles.emptyChipsNotice}>
                {CREATE_SLOT_MODAL_TEXTS.section3.emptyNotice}
              </span>
            ) : (
              selectedTimes.map((timeStr) => (
                <div key={timeStr} className={styles.chip}>
                  <Clock size={13} />
                  <span className={styles.chipText}>{timeStr} {CREATE_SLOT_MODAL_TEXTS.section3.hourSuffix}</span>
                  <button
                    type="button"
                    className={styles.chipRemove}
                    onClick={() => handleRemoveTime(timeStr)}
                    title={CREATE_SLOT_MODAL_TEXTS.section3.removeTimeTitle}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.previewSection}>
          <div className={styles.previewSummaryBar}>
            <div className={styles.previewFormula}>
              <span className={styles.formulaItem}>{CREATE_SLOT_MODAL_TEXTS.section4.daysFormula(selectedDates.length)}</span>
              <span className={styles.formulaOp}>×</span>
              <span className={styles.formulaItem}>{CREATE_SLOT_MODAL_TEXTS.section4.timesFormula(selectedTimes.length)}</span>
              <span className={styles.formulaOp}>=</span>
              <span className={styles.formulaResult}>{CREATE_SLOT_MODAL_TEXTS.section4.totalSlotsFormula(generatedSlots.length)}</span>
            </div>
            {depositAmount && (
              <span className={styles.previewDepositTag}>
                {CREATE_SLOT_MODAL_TEXTS.section4.depositTag(Number(depositAmount).toLocaleString('es-AR'))}
              </span>
            )}
          </div>

          {generatedSlots.length > 0 && (
            <div className={styles.slotsPreviewList}>
              {generatedSlots.map((item, idx) => (
                <div
                  key={idx}
                  className={`${styles.previewItem} ${item.isPast ? styles.previewItemPast : ''} ${item.isDuplicate ? styles.previewItemDuplicate : ''}`}
                >
                  <div className={styles.previewItemLeft}>
                    {item.isDuplicate ? (
                      <AlertCircle size={15} color="var(--color-danger, #ef4444)" />
                    ) : item.isPast ? (
                      <Clock size={15} color="var(--text-tertiary)" />
                    ) : (
                      <CheckCircle2 size={15} color="var(--color-success)" />
                    )}
                    <span className={styles.previewItemDate}>{item.dateLabel}</span>
                    <span className={styles.previewItemTime}>{item.timeLabel}</span>
                  </div>
                  {item.isDuplicate ? (
                    <span className={styles.duplicateWarning}>{CREATE_SLOT_MODAL_TEXTS.section4.statusAlreadyExists}</span>
                  ) : item.isPast ? (
                    <span className={styles.pastWarning}>{CREATE_SLOT_MODAL_TEXTS.section4.statusPastHour}</span>
                  ) : (
                    <span className={styles.availableTag}>{CREATE_SLOT_MODAL_TEXTS.section4.statusAvailable}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {CREATE_SLOT_MODAL_TEXTS.footer.cancelButton}
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            disabled={generatedSlots.length === 0 || !depositAmount || selectedServices.length === 0}
            leftIcon={<CalendarPlus size={16} />}
          >
            {generatedSlots.length > 1
              ? CREATE_SLOT_MODAL_TEXTS.footer.publishMultiple(generatedSlots.length)
              : CREATE_SLOT_MODAL_TEXTS.footer.publishSingle}
          </Button>
        </div>
      </form>

      {isSubmitting && (
        <Loader
          fullScreen
          title={CREATE_SLOT_MODAL_TEXTS.loader.title}
          subtitle={CREATE_SLOT_MODAL_TEXTS.loader.subtitle(generatedSlots.length)}
          icon="calendar"
        />
      )}
    </section>
  );
};

export default CreateSlotModal;
