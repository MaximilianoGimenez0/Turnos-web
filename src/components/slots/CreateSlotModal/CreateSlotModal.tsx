import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  CalendarPlus,
  X,
  AlertCircle,
  DollarSign,
  Calendar,
  Plus,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
} from 'lucide-react';
import type { NewSlotData, Slot, ServiceItem } from '../../../types';
import { useServices } from '../../../context/ServicesContext';
import { validatePositiveInteger, validateRequiredText } from '../../../utils/validators';
import { FIELD_LIMITS } from '../../../config/fieldLimits';
import {
  BUSINESS_TIMEZONE,
  getTodayBusinessDateString,
  addDaysBusinessDateString,
  buildBusinessIsoFromInputs,
} from '../../../utils/dateUtils';
import Input from '../../common/Input/Input';
import Button from '../../common/Button/Button';
import MultiDatePicker from '../../common/MultiDatePicker/MultiDatePicker';
import HalfHourTimePicker from '../../common/TimePicker/HalfHourTimePicker';
import Loader from '../../common/Loader/Loader';
import AlertModal, { type AlertModalType } from '../../common/AlertModal';
import FormProgressTracker, { type FormProgressStep } from '../../common/FormProgressTracker';
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

const MORNING_TIME_PRESETS = TIME_PRESETS.filter((t) => Number(t.split(':')[0]) < 13);
const AFTERNOON_TIME_PRESETS = TIME_PRESETS.filter((t) => Number(t.split(':')[0]) >= 13);

const RECOMMENDED_DAYS = CREATE_SLOT_MODAL_TEXTS.recommendedDays;

export const CreateSlotModal: React.FC<CreateSlotModalProps> = ({
  isOpen,
  onClose,
  onCreateSlot,
  onCreateMultipleSlots,
  existingSlots = [],
}) => {
  const { services: availableServices } = useServices();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customServiceName, setCustomServiceName] = useState('');
  const [depositAmount, setDepositAmount] = useState('5000');

  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [tempTime, setTempTime] = useState<string>('18:00');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPublish, setPendingPublish] = useState<{
    slotsToCreate: NewSlotData[];
    previewItems: Array<{ dateLabel: string; timeLabel: string }>;
    deposit: number;
    customTitle: string;
    serviceNames: string[];
    daysCount: number;
    timesCount: number;
  } | null>(null);
  const [confirmExpandedSection, setConfirmExpandedSection] = useState<
    'none' | 'services' | 'slots'
  >('none');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

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

  const todayStr = getTodayBusinessDateString();

  const isPastTimeToday = useCallback(
    (timeStr: string): boolean => {
      const iso = buildBusinessIsoFromInputs(todayStr, timeStr);
      if (!iso) return false;
      return new Date(iso).getTime() <= Date.now();
    },
    [todayStr]
  );

  const isTimeDisabled = useCallback(
    (timeStr: string): boolean => {
      if (!selectedDates.includes(todayStr)) {
        return false;
      }
      return isPastTimeToday(timeStr);
    },
    [selectedDates, todayStr, isPastTimeToday]
  );

  // For an unassigned multi-service slot, minimum bookable duration is the shortest enabled service
  const { minDurationMinutes, maxDurationMinutes } = useMemo(() => {
    if (selectedServices.length === 0) {
      return { minDurationMinutes: 30, maxDurationMinutes: 30 };
    }
    const durations = availableServices
      .filter((s) => selectedServices.includes(s.name))
      .map((s) => (s.durationMinutes > 0 ? s.durationMinutes : 30));
    if (durations.length === 0) {
      return { minDurationMinutes: 30, maxDurationMinutes: 30 };
    }
    return {
      minDurationMinutes: Math.min(...durations),
      maxDurationMinutes: Math.max(...durations),
    };
  }, [availableServices, selectedServices]);

  const resetForm = () => {
    setSelectedServices([]);
    setCustomServiceName('');
    setDepositAmount('5000');
    setSelectedDates([]);
    setSelectedTimes([]);
    setTempTime('18:00');
    setPendingPublish(null);
    setConfirmExpandedSection('none');
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

  const handleAddDate = (dateToAdd: string) => {
    if (!dateToAdd) return;

    if (dateToAdd < todayStr) {
      setAlertState({
        isOpen: true,
        title: CREATE_SLOT_MODAL_TEXTS.alerts.invalidDateTitle,
        message: CREATE_SLOT_MODAL_TEXTS.alerts.invalidDateMessage,
        type: 'warning',
      });
      return;
    }

    if (!selectedDates.includes(dateToAdd)) {
      setSelectedDates((prev) => [...prev, dateToAdd].sort());

      if (dateToAdd === todayStr) {
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

    selectedDates.forEach((dateStr) => {
      selectedTimes.forEach((timeStr) => {
        const datetimeIso = buildBusinessIsoFromInputs(dateStr, timeStr);
        if (!datetimeIso) return;
        const slotDate = new Date(datetimeIso);
        const slotTimeMs = slotDate.getTime();
        const isPast = slotTimeMs <= nowMs;

        const isDuplicate =
          existingSlots?.some(
            (s) => s.status !== 'cancelled' && new Date(s.datetime).getTime() === slotTimeMs
          ) ?? false;

        const dateLabel = slotDate.toLocaleDateString('es-AR', {
          timeZone: BUSINESS_TIMEZONE,
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });

        slots.push({
          dateStr,
          timeStr,
          datetimeIso,
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
  }, [selectedDates, selectedTimes, existingSlots, nowMs]);

  const progressSteps = useMemo<FormProgressStep[]>(() => {
    const progressTexts = CREATE_SLOT_MODAL_TEXTS.progress;

    const depositValidation = validatePositiveInteger(
      depositAmount,
      CREATE_SLOT_MODAL_TEXTS.section1.depositField,
      1,
      5000000
    );
    const trimmedCustomName = customServiceName.trim();
    const customNameValid =
      trimmedCustomName.length === 0 ||
      validateRequiredText(
        trimmedCustomName,
        CREATE_SLOT_MODAL_TEXTS.section1.serviceNameField,
        FIELD_LIMITS.slot.customServiceName.min,
        FIELD_LIMITS.slot.customServiceName.max
      ).isValid;

    const hasServices = selectedServices.length > 0;
    const hasDepositInput = depositAmount.trim().length > 0;
    const formattedDeposit =
      depositValidation.isValid && depositValidation.parsedValue
        ? depositValidation.parsedValue.toLocaleString('es-AR')
        : '';

    let step1Status: FormProgressStep['status'];
    let step1Detail: string;

    if (!customNameValid) {
      step1Status = 'error';
      step1Detail = progressTexts.step1InvalidCustomName;
    } else if (hasDepositInput && !depositValidation.isValid) {
      step1Status = 'error';
      step1Detail = progressTexts.step1InvalidDeposit;
    } else if (hasServices && depositValidation.isValid) {
      step1Status = 'complete';
      step1Detail = progressTexts.step1Complete(selectedServices.length, formattedDeposit);
    } else if (!hasServices && depositValidation.isValid) {
      step1Status = 'partial';
      step1Detail = progressTexts.step1MissingService(formattedDeposit);
    } else if (hasServices && !depositValidation.isValid) {
      step1Status = 'partial';
      step1Detail = progressTexts.step1MissingDeposit(selectedServices.length);
    } else {
      step1Status = 'pending';
      step1Detail = progressTexts.step1PendingBoth;
    }

    const step2Status: FormProgressStep['status'] =
      selectedDates.length > 0 ? 'complete' : 'pending';
    const step2Detail =
      selectedDates.length > 0
        ? progressTexts.step2Complete(selectedDates.length)
        : progressTexts.step2Pending;

    const validFutureSlots = generatedSlots.filter((s) => !s.isPast);
    const duplicateCount = validFutureSlots.filter((s) => s.isDuplicate).length;

    let step3Status: FormProgressStep['status'];
    let step3Detail: string;

    if (selectedTimes.length === 0) {
      step3Status = 'pending';
      step3Detail = progressTexts.step3Pending;
    } else if (selectedDates.length > 0 && validFutureSlots.length === 0) {
      step3Status = 'error';
      step3Detail = progressTexts.step3AllPastError;
    } else if (duplicateCount > 0) {
      step3Status = 'error';
      step3Detail = progressTexts.step3DuplicatesError(duplicateCount);
    } else if (selectedDates.length > 0) {
      step3Status = 'complete';
      step3Detail = progressTexts.step3CompleteWithSlots(
        selectedTimes.length,
        validFutureSlots.length
      );
    } else {
      step3Status = 'complete';
      step3Detail = progressTexts.step3CompleteTimesOnly(selectedTimes.length);
    }

    return [
      {
        id: 'slot-services',
        stepNumber: CREATE_SLOT_MODAL_TEXTS.section1.stepNum,
        label: progressTexts.step1Label,
        status: step1Status,
        detail: step1Detail,
        targetId: 'slot-step-services',
      },
      {
        id: 'slot-days',
        stepNumber: CREATE_SLOT_MODAL_TEXTS.section2.stepNum,
        label: progressTexts.step2Label,
        status: step2Status,
        detail: step2Detail,
        targetId: 'slot-step-days',
      },
      {
        id: 'slot-times',
        stepNumber: CREATE_SLOT_MODAL_TEXTS.section3.stepNum,
        label: progressTexts.step3Label,
        status: step3Status,
        detail: step3Detail,
        targetId: 'slot-step-times',
      },
    ];
  }, [
    selectedServices.length,
    depositAmount,
    customServiceName,
    selectedDates.length,
    selectedTimes.length,
    generatedSlots,
  ]);

  if (!isOpen) return null;

  const executeCreateSlots = async (slotsToCreate: NewSlotData[]) => {
    setIsSubmitting(true);

    try {
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
      const msg =
        err instanceof Error ? err.message : CREATE_SLOT_MODAL_TEXTS.alerts.unexpectedError;
      const isConflict =
        msg.toLowerCase().includes('conflicto') ||
        msg.toLowerCase().includes('reservado') ||
        msg.toLowerCase().includes('existe');
      setAlertState({
        isOpen: true,
        title: isConflict
          ? CREATE_SLOT_MODAL_TEXTS.alerts.conflictTitle
          : CREATE_SLOT_MODAL_TEXTS.alerts.restrictionTitle,
        message: msg,
        type: isConflict ? 'restriction' : 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmMultiplePublish = async () => {
    if (!pendingPublish) return;
    const { slotsToCreate } = pendingPublish;
    setPendingPublish(null);
    setConfirmExpandedSection('none');
    await executeCreateSlots(slotsToCreate);
  };

  const closePendingPublish = () => {
    setPendingPublish(null);
    setConfirmExpandedSection('none');
  };

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

    const finalServiceName = customServiceName.trim();
    if (finalServiceName.length > 0) {
      const serviceValidation = validateRequiredText(
        finalServiceName,
        CREATE_SLOT_MODAL_TEXTS.section1.serviceNameField,
        FIELD_LIMITS.slot.customServiceName.min,
        FIELD_LIMITS.slot.customServiceName.max
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
        duplicateDescriptions.push(
          CREATE_SLOT_MODAL_TEXTS.alerts.andMoreDuplicates(duplicateSlots.length - 5)
        );
      }

      setAlertState({
        isOpen: true,
        title: CREATE_SLOT_MODAL_TEXTS.alerts.duplicateSlotsTitle,
        message: CREATE_SLOT_MODAL_TEXTS.alerts.duplicateSlotsMessage,
        type: 'restriction',
        details: duplicateDescriptions,
      });
      return;
    }

    const selectedServiceObjects: ServiceItem[] = availableServices.filter((s) =>
      selectedServices.includes(s.name)
    );

    const slotsToCreate: NewSlotData[] = validFutureSlots.map((item) => ({
      datetime: item.datetimeIso,
      depositAmount: deposit,
      serviceName: finalServiceName,
      services: selectedServiceObjects,
      estimatedDurationMinutes: minDurationMinutes,
      estimatedDuration: `${minDurationMinutes} min`,
    }));

    if (slotsToCreate.length > 1) {
      const uniqueDays = new Set(validFutureSlots.map((item) => item.dateStr)).size;
      const uniqueTimes = new Set(validFutureSlots.map((item) => item.timeStr)).size;
      setConfirmExpandedSection('none');
      setPendingPublish({
        slotsToCreate,
        previewItems: validFutureSlots.map((item) => ({
          dateLabel: item.dateLabel,
          timeLabel: item.timeLabel,
        })),
        deposit,
        customTitle: finalServiceName,
        serviceNames: selectedServiceObjects.map((s) => s.name),
        daysCount: uniqueDays,
        timesCount: uniqueTimes,
      });
      return;
    }

    await executeCreateSlots(slotsToCreate);
  };

  return (
    <section className={styles.creationPanel} aria-labelledby="create-slot-title">
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title={alertState.title || CREATE_SLOT_MODAL_TEXTS.alerts.attentionTitle}
        message={alertState.message}
        type={alertState.type || 'restriction'}
        details={alertState.details}
      />

      <AlertModal
        isOpen={!!pendingPublish}
        onClose={closePendingPublish}
        onSecondary={closePendingPublish}
        onConfirm={handleConfirmMultiplePublish}
        type="info"
        title={
          pendingPublish
            ? CREATE_SLOT_MODAL_TEXTS.confirmPublish.title(pendingPublish.slotsToCreate.length)
            : undefined
        }
        confirmText={
          pendingPublish
            ? CREATE_SLOT_MODAL_TEXTS.confirmPublish.confirmButton(
                pendingPublish.slotsToCreate.length
              )
            : undefined
        }
        secondaryText={CREATE_SLOT_MODAL_TEXTS.confirmPublish.cancelButton}
        closeOnBackdropClick
        closeOnEscape
        message={
          pendingPublish ? (
            <div className={styles.confirmModalContent}>
              <p className={styles.confirmModalIntro}>
                {CREATE_SLOT_MODAL_TEXTS.confirmPublish.description(
                  pendingPublish.slotsToCreate.length
                )}
              </p>

              <div className={styles.confirmMetaBox}>
                {pendingPublish.customTitle && (
                  <div className={styles.confirmMetaRow}>
                    <span className={styles.confirmMetaLabel}>
                      {CREATE_SLOT_MODAL_TEXTS.confirmPublish.customTitleLabel}
                    </span>
                    <span className={styles.confirmMetaValue}>{pendingPublish.customTitle}</span>
                  </div>
                )}
                <div className={styles.confirmMetaRow}>
                  <span className={styles.confirmMetaLabel}>
                    {CREATE_SLOT_MODAL_TEXTS.confirmPublish.depositLabel}
                  </span>
                  <span className={styles.confirmMetaValue}>
                    ${pendingPublish.deposit.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              <div className={styles.confirmAccordionsStack}>
                <div className={styles.confirmAccordion}>
                  <button
                    type="button"
                    className={styles.confirmAccordionTrigger}
                    onClick={() =>
                      setConfirmExpandedSection((prev) =>
                        prev === 'services' ? 'none' : 'services'
                      )
                    }
                    aria-expanded={confirmExpandedSection === 'services'}
                  >
                    <div className={styles.confirmAccordionLeft}>
                      <div className={styles.confirmAccordionHeadingRow}>
                        <span className={styles.confirmAccordionTitle}>
                          {CREATE_SLOT_MODAL_TEXTS.confirmPublish.servicesLabel}
                        </span>
                        <span className={styles.confirmCountBadge}>
                          {pendingPublish.serviceNames.length}
                        </span>
                      </div>
                      {confirmExpandedSection !== 'services' &&
                        pendingPublish.serviceNames.length > 0 && (
                          <span className={styles.confirmAccordionPreview}>
                            {pendingPublish.serviceNames.length === 1
                              ? pendingPublish.serviceNames[0]
                              : CREATE_SLOT_MODAL_TEXTS.confirmPublish.servicesPreviewMore(
                                  pendingPublish.serviceNames[0],
                                  pendingPublish.serviceNames.length - 1
                                )}
                          </span>
                        )}
                    </div>

                    <span className={styles.confirmAccordionAction}>
                      <span>
                        {confirmExpandedSection === 'services'
                          ? CREATE_SLOT_MODAL_TEXTS.confirmPublish.collapseAction
                          : CREATE_SLOT_MODAL_TEXTS.confirmPublish.expandAction}
                      </span>
                      <ChevronDown
                        size={14}
                        strokeWidth={2}
                        className={`${styles.confirmAccordionChevron} ${
                          confirmExpandedSection === 'services'
                            ? styles.confirmAccordionChevronOpen
                            : ''
                        }`}
                        aria-hidden="true"
                      />
                    </span>
                  </button>

                  {confirmExpandedSection === 'services' && (
                    <div className={styles.confirmAccordionBody}>
                      <ul className={styles.confirmServicesList}>
                        {pendingPublish.serviceNames.map((srvName) => (
                          <li key={srvName} className={styles.confirmServiceChip}>
                            <Check size={12} strokeWidth={2.2} aria-hidden="true" />
                            <span>{srvName}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className={styles.confirmAccordion}>
                  <button
                    type="button"
                    className={styles.confirmAccordionTrigger}
                    onClick={() =>
                      setConfirmExpandedSection((prev) => (prev === 'slots' ? 'none' : 'slots'))
                    }
                    aria-expanded={confirmExpandedSection === 'slots'}
                  >
                    <div className={styles.confirmAccordionLeft}>
                      <div className={styles.confirmAccordionHeadingRow}>
                        <span className={styles.confirmAccordionTitle}>
                          {CREATE_SLOT_MODAL_TEXTS.confirmPublish.slotsPreviewLabel}
                        </span>
                        <span className={styles.confirmCountBadge}>
                          {pendingPublish.previewItems.length}
                        </span>
                      </div>
                      {confirmExpandedSection !== 'slots' && (
                        <span className={styles.confirmAccordionPreview}>
                          {CREATE_SLOT_MODAL_TEXTS.confirmPublish.slotsRangeSummary(
                            pendingPublish.daysCount,
                            pendingPublish.timesCount
                          )}
                        </span>
                      )}
                    </div>

                    <span className={styles.confirmAccordionAction}>
                      <span>
                        {confirmExpandedSection === 'slots'
                          ? CREATE_SLOT_MODAL_TEXTS.confirmPublish.collapseAction
                          : CREATE_SLOT_MODAL_TEXTS.confirmPublish.expandAction}
                      </span>
                      <ChevronDown
                        size={14}
                        strokeWidth={2}
                        className={`${styles.confirmAccordionChevron} ${
                          confirmExpandedSection === 'slots'
                            ? styles.confirmAccordionChevronOpen
                            : ''
                        }`}
                        aria-hidden="true"
                      />
                    </span>
                  </button>

                  {confirmExpandedSection === 'slots' && (
                    <div className={styles.confirmAccordionBody}>
                      <ul className={styles.confirmSlotsList}>
                        {pendingPublish.previewItems.map((slotItem, idx) => (
                          <li key={idx} className={styles.confirmSlotItem}>
                            <span className={styles.confirmSlotDate}>{slotItem.dateLabel}</span>
                            <span className={styles.confirmSlotTime}>{slotItem.timeLabel}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : undefined
        }
      />

      <FormProgressTracker
        title={CREATE_SLOT_MODAL_TEXTS.progress.title}
        steps={progressSteps}
        readyMessage={CREATE_SLOT_MODAL_TEXTS.progress.readyMessage}
        readyActionLabel={CREATE_SLOT_MODAL_TEXTS.progress.readyActionLabel}
        readyActionTargetId="slot-summary-actions"
        storageKey="admin_create_slot_progress_minimized"
      />

      <div className={styles.header}>
        <div className={styles.headerTitles}>
          <h3 id="create-slot-title" className={styles.title}>
            {CREATE_SLOT_MODAL_TEXTS.header.title}
          </h3>
          <p className={styles.subtitle}>
            {CREATE_SLOT_MODAL_TEXTS.header.subtitle}
          </p>
        </div>

        <button
          type="button"
          className={styles.closeButton}
          onClick={handleClose}
          aria-label={CREATE_SLOT_MODAL_TEXTS.header.closeAriaLabel}
          disabled={isSubmitting}
        >
          <X size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.workbenchForm}>
        <div className={styles.builderColumn}>
          <section
            id="slot-step-services"
            className={styles.stepSection}
            aria-labelledby="step-services-heading"
          >
            <div className={styles.stepHeader}>
              <div className={styles.stepTitleGroup}>
                <span className={styles.stepPill}>{CREATE_SLOT_MODAL_TEXTS.section1.stepNum}</span>
                <h4 id="step-services-heading" className={styles.stepHeading}>
                  {CREATE_SLOT_MODAL_TEXTS.section1.shortTitle}
                </h4>
              </div>

              <div className={styles.headerRightActions}>
                <span className={styles.durationMeta}>
                  <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
                  <span>
                    {CREATE_SLOT_MODAL_TEXTS.section1.durationRangeLabel(
                      minDurationMinutes,
                      maxDurationMinutes
                    )}
                  </span>
                </span>
                {availableServices.length > 0 && (
                  <>
                    <button
                      type="button"
                      className={styles.inlineActionLink}
                      onClick={handleSelectAllServices}
                      disabled={isSubmitting}
                    >
                      {CREATE_SLOT_MODAL_TEXTS.section1.selectAll}
                    </button>
                    {selectedServices.length > 0 && (
                      <button
                        type="button"
                        className={`${styles.inlineActionLink} ${styles.inlineActionDanger}`}
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

            {availableServices.length === 0 ? (
              <div className={styles.emptyNoticeBox}>
                {CREATE_SLOT_MODAL_TEXTS.section1.emptyNotice}
              </div>
            ) : (
              <div className={styles.servicesGrid}>
                {availableServices.map((service) => {
                  const isSelected = selectedServices.includes(service.name);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      className={`${styles.serviceCardBtn} ${
                        isSelected ? styles.serviceCardBtnActive : ''
                      }`}
                      onClick={() => handleToggleService(service.name)}
                      disabled={isSubmitting}
                      aria-pressed={isSelected}
                    >
                      <div className={styles.serviceCardTop}>
                        <span className={styles.serviceCheckBox} aria-hidden="true">
                          {isSelected ? (
                            <Check size={12} strokeWidth={2.4} />
                          ) : (
                            <Plus size={12} strokeWidth={1.9} />
                          )}
                        </span>
                        <span className={styles.serviceCardName}>{service.name}</span>
                      </div>
                      <span className={styles.serviceCardMeta}>
                        {service.durationMinutes ? `${service.durationMinutes} min` : '30 min'}
                        {service.basePrice ? ` · $${service.basePrice.toLocaleString('es-AR')}` : ''}
                        {service.extras && service.extras.length > 0
                          ? ` · ${service.extras.length} extras`
                          : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className={styles.formGrid}>
              <Input
                label={CREATE_SLOT_MODAL_TEXTS.section1.serviceNameLabel}
                placeholder={CREATE_SLOT_MODAL_TEXTS.section1.serviceNamePlaceholder}
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                maxLength={FIELD_LIMITS.slot.customServiceName.max}
                showCharCount
                disabled={isSubmitting}
                helperText={CREATE_SLOT_MODAL_TEXTS.section1.serviceNameHelper}
              />

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
                leftIcon={<DollarSign size={15} strokeWidth={1.75} />}
                helperText={CREATE_SLOT_MODAL_TEXTS.section1.depositHelper}
              />
            </div>
          </section>

          <section
            id="slot-step-days"
            className={styles.stepSection}
            aria-labelledby="step-days-heading"
          >
            <div className={styles.stepHeader}>
              <div className={styles.stepTitleGroup}>
                <span className={styles.stepPill}>{CREATE_SLOT_MODAL_TEXTS.section2.stepNum}</span>
                <h4 id="step-days-heading" className={styles.stepHeading}>
                  {CREATE_SLOT_MODAL_TEXTS.section2.shortTitle}
                </h4>
              </div>
              <span
                className={`${styles.countPill} ${
                  selectedDates.length > 0 ? styles.countPillActive : ''
                }`}
              >
                {CREATE_SLOT_MODAL_TEXTS.section2.selectedBadge(selectedDates.length)}
              </span>
            </div>

            <div className={styles.controlGroup}>
              <span className={styles.groupLabel}>
                {CREATE_SLOT_MODAL_TEXTS.section2.recommendedLabel}
              </span>
              <div className={styles.quickDaysGrid}>
                {RECOMMENDED_DAYS.map((item) => {
                  const dateStr = addDaysBusinessDateString(item.days);
                  const isSelected = selectedDates.includes(dateStr);
                  return (
                    <button
                      key={item.days}
                      type="button"
                      className={`${styles.quickDayBtn} ${
                        isSelected ? styles.quickDayBtnActive : ''
                      }`}
                      onClick={() => handleToggleDate(dateStr)}
                      disabled={isSubmitting}
                      aria-pressed={isSelected}
                    >
                      <span className={styles.toggleIcon} aria-hidden="true">
                        {isSelected ? (
                          <Check size={13} strokeWidth={2.2} />
                        ) : (
                          <Plus size={13} strokeWidth={1.75} />
                        )}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.controlGroup}>
              <span className={styles.groupLabel}>
                {CREATE_SLOT_MODAL_TEXTS.section2.customDateLabel}
              </span>
              <MultiDatePicker
                selectedDates={selectedDates}
                onToggleDate={handleToggleDate}
                minDateStr={todayStr}
                todayStr={todayStr}
                disabled={isSubmitting}
              />
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
                    <div key={dateStr} className={styles.selectedChip}>
                      <Calendar size={13} strokeWidth={1.75} aria-hidden="true" />
                      <span className={styles.chipText}>{formatted}</span>
                      <button
                        type="button"
                        className={styles.chipRemove}
                        onClick={() => handleRemoveDate(dateStr)}
                        title={CREATE_SLOT_MODAL_TEXTS.section2.removeDayTitle}
                        aria-label={`${CREATE_SLOT_MODAL_TEXTS.section2.removeDayTitle} ${formatted}`}
                      >
                        <X size={13} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section
            id="slot-step-times"
            className={styles.stepSection}
            aria-labelledby="step-times-heading"
          >
            <div className={styles.stepHeader}>
              <div className={styles.stepTitleGroup}>
                <span className={styles.stepPill}>{CREATE_SLOT_MODAL_TEXTS.section3.stepNum}</span>
                <h4 id="step-times-heading" className={styles.stepHeading}>
                  {CREATE_SLOT_MODAL_TEXTS.section3.shortTitle}
                </h4>
              </div>
              <span
                className={`${styles.countPill} ${
                  selectedTimes.length > 0 ? styles.countPillActive : ''
                }`}
              >
                {CREATE_SLOT_MODAL_TEXTS.section3.selectedBadge(selectedTimes.length)}
              </span>
            </div>

            <div className={styles.presetsBandStack}>
              <div className={styles.controlGroup}>
                <span className={styles.groupLabel}>
                  {CREATE_SLOT_MODAL_TEXTS.section3.morningLabel}
                </span>
                <div className={styles.morningPresetsGrid}>
                  {MORNING_TIME_PRESETS.map((t) => {
                    const disabled = isTimeDisabled(t);
                    const isSelected = selectedTimes.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`${styles.timePresetBtn} ${
                          isSelected ? styles.timePresetBtnActive : ''
                        } ${disabled ? styles.timePresetBtnDisabled : ''}`}
                        onClick={() => (isSelected ? handleRemoveTime(t) : handleAddTime(t))}
                        disabled={disabled || isSubmitting}
                        title={disabled ? CREATE_SLOT_MODAL_TEXTS.section3.disabledTooltip : undefined}
                        aria-pressed={isSelected}
                      >
                        {isSelected && <Check size={12} strokeWidth={2.2} aria-hidden="true" />}
                        <span>{t}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.controlGroup}>
                <span className={styles.groupLabel}>
                  {CREATE_SLOT_MODAL_TEXTS.section3.afternoonLabel}
                </span>
                <div className={styles.afternoonPresetsGrid}>
                  {AFTERNOON_TIME_PRESETS.map((t) => {
                    const disabled = isTimeDisabled(t);
                    const isSelected = selectedTimes.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`${styles.timePresetBtn} ${
                          isSelected ? styles.timePresetBtnActive : ''
                        } ${disabled ? styles.timePresetBtnDisabled : ''}`}
                        onClick={() => (isSelected ? handleRemoveTime(t) : handleAddTime(t))}
                        disabled={disabled || isSubmitting}
                        title={disabled ? CREATE_SLOT_MODAL_TEXTS.section3.disabledTooltip : undefined}
                        aria-pressed={isSelected}
                      >
                        {isSelected && <Check size={12} strokeWidth={2.2} aria-hidden="true" />}
                        <span>{t}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.controlGroup}>
              <span className={styles.groupLabel}>
                {CREATE_SLOT_MODAL_TEXTS.section3.customTimeLabel}
              </span>
              <HalfHourTimePicker
                value={tempTime}
                onChange={setTempTime}
                onAdd={handleAddTime}
                isTimeDisabled={isTimeDisabled}
                isAlreadySelected={selectedTimes.includes(tempTime)}
                disabled={isSubmitting}
                addButtonLabel={CREATE_SLOT_MODAL_TEXTS.section3.addTimeButton}
              />
            </div>

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
                  <div key={timeStr} className={styles.selectedChip}>
                    <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
                    <span className={styles.chipText}>
                      {timeStr} {CREATE_SLOT_MODAL_TEXTS.section3.hourSuffix}
                    </span>
                    <button
                      type="button"
                      className={styles.chipRemove}
                      onClick={() => handleRemoveTime(timeStr)}
                      title={CREATE_SLOT_MODAL_TEXTS.section3.removeTimeTitle}
                      aria-label={`${CREATE_SLOT_MODAL_TEXTS.section3.removeTimeTitle} ${timeStr}`}
                    >
                      <X size={13} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className={styles.summaryColumn} aria-label={CREATE_SLOT_MODAL_TEXTS.section4.summaryTitle}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <h4 className={styles.summaryTitle}>
                {CREATE_SLOT_MODAL_TEXTS.section4.summaryTitle}
              </h4>
              {depositAmount && (
                <span className={styles.previewDepositMeta}>
                  {CREATE_SLOT_MODAL_TEXTS.section4.depositTag(
                    Number(depositAmount).toLocaleString('es-AR')
                  )}
                </span>
              )}
            </div>

            <div className={styles.formulaBanner}>
              <div className={styles.formulaPart}>
                <span className={styles.formulaVal}>{selectedDates.length}</span>
                <span className={styles.formulaLbl}>
                  {CREATE_SLOT_MODAL_TEXTS.section4.daysFormula(selectedDates.length).replace(/^\d+\s*/, '')}
                </span>
              </div>
              <span className={styles.formulaOp} aria-hidden="true">×</span>
              <div className={styles.formulaPart}>
                <span className={styles.formulaVal}>{selectedTimes.length}</span>
                <span className={styles.formulaLbl}>
                  {CREATE_SLOT_MODAL_TEXTS.section4.timesFormula(selectedTimes.length).replace(/^\d+\s*/, '')}
                </span>
              </div>
              <span className={styles.formulaOp} aria-hidden="true">=</span>
              <div className={`${styles.formulaPart} ${styles.formulaPartTotal}`}>
                <span className={styles.formulaResultVal}>{generatedSlots.length}</span>
                <span className={styles.formulaResultLbl}>
                  {CREATE_SLOT_MODAL_TEXTS.section4.totalSlotsFormula(generatedSlots.length).replace(/^\d+\s*/, '')}
                </span>
              </div>
            </div>

            {generatedSlots.length === 0 ? (
              <p className={styles.summaryEmptyText}>
                {CREATE_SLOT_MODAL_TEXTS.section4.summaryEmptyHint}
              </p>
            ) : (
              <div className={styles.slotsPreviewList}>
                {generatedSlots.map((item, idx) => (
                  <div
                    key={idx}
                    className={`${styles.previewItem} ${
                      item.isPast ? styles.previewItemPast : ''
                    } ${item.isDuplicate ? styles.previewItemDuplicate : ''}`}
                  >
                    <div className={styles.previewItemLeft}>
                      {item.isDuplicate ? (
                        <AlertCircle
                          size={14}
                          strokeWidth={1.75}
                          className={styles.previewIconDanger}
                          aria-hidden="true"
                        />
                      ) : item.isPast ? (
                        <Clock
                          size={14}
                          strokeWidth={1.75}
                          className={styles.previewIconMuted}
                          aria-hidden="true"
                        />
                      ) : (
                        <CheckCircle2
                          size={14}
                          strokeWidth={1.75}
                          className={styles.previewIconSuccess}
                          aria-hidden="true"
                        />
                      )}
                      <span className={styles.previewItemDate}>{item.dateLabel}</span>
                      <span className={styles.previewItemTime}>{item.timeLabel}</span>
                    </div>
                    {item.isDuplicate ? (
                      <span className={styles.statusTagDanger}>
                        {CREATE_SLOT_MODAL_TEXTS.section4.statusAlreadyExists}
                      </span>
                    ) : item.isPast ? (
                      <span className={styles.statusTagMuted}>
                        {CREATE_SLOT_MODAL_TEXTS.section4.statusPastHour}
                      </span>
                    ) : (
                      <span className={styles.statusTagSuccess}>
                        {CREATE_SLOT_MODAL_TEXTS.section4.statusAvailable}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div id="slot-summary-actions" className={styles.summaryActions}>
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                isLoading={isSubmitting}
                disabled={
                  generatedSlots.length === 0 || !depositAmount || selectedServices.length === 0
                }
                leftIcon={<CalendarPlus size={15} strokeWidth={1.75} aria-hidden="true" />}
              >
                {generatedSlots.length > 1
                  ? CREATE_SLOT_MODAL_TEXTS.footer.publishMultiple(generatedSlots.length)
                  : CREATE_SLOT_MODAL_TEXTS.footer.publishSingle}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                onClick={handleClose}
                disabled={isSubmitting}
              >
                {CREATE_SLOT_MODAL_TEXTS.footer.cancelButton}
              </Button>
            </div>
          </div>
        </aside>
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
