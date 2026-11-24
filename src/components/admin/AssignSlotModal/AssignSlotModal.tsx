import React, { useState } from 'react';
import {
  UserCheck,
  User,
  Mail,
  Phone,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import type { Slot, ClientData } from '../../../types';
import { formatEstimatedDuration } from '../../../services/bookingHelper';
import { validateSlotNoConflict } from '../../../services/schedulingService';
import {
  validateEmail,
  validateOptionalText,
  validatePhone,
  validateRequiredText,
} from '../../../utils/validators';
import { FIELD_LIMITS } from '../../../config/fieldLimits';
import Input from '../../common/Input/Input';
import Textarea from '../../common/Textarea/Textarea';
import Button from '../../common/Button/Button';
import Loader from '../../common/Loader/Loader';
import AlertModal, { type AlertModalType } from '../../common/AlertModal';
import { ASSIGN_SLOT_MODAL_TEXTS } from '../../../texts';
import {
  SlotBookingModalFrame,
  ServiceSelectionSection,
  ExtrasSelectionSection,
  PricingReceiptBox,
  useSlotBookingForm,
  slotBookingStyles as styles,
} from '../../slots/SlotBookingShared';

export interface AssignSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: Slot | null;
  onAssign: (slotId: string, clientData: ClientData) => Promise<void>;
  existingSlots?: Slot[];
}

interface AssignSlotModalContentProps {
  onClose: () => void;
  slot: Slot;
  onAssign: (slotId: string, clientData: ClientData) => Promise<void>;
  existingSlots?: Slot[];
}

const AssignSlotModalContent: React.FC<AssignSlotModalContentProps> = ({
  onClose,
  slot,
  onAssign,
  existingSlots,
}) => {
  const [name, setName] = useState(slot.clientData?.name || '');
  const [email, setEmail] = useState(slot.clientData?.email || '');
  const [phone, setPhone] = useState(slot.clientData?.phone || '');
  const [notes, setNotes] = useState(slot.clientData?.notes || '');

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
    type: 'restriction',
  });

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  const {
    relevantServices,
    activeServices,
    selectedServiceNames,
    selectedExtrasByService,
    selectedExtras,
    hasConfiguredExtras,
    totalEstimatedMinutes,
    baseServicePrice,
    totalExtrasPrice,
    totalFinalEstimatedPrice,
    balanceDueAtSalon,
    hasLiveDurationConflict,
    formattedDate,
    formattedTime,
    handleToggleService,
    handleToggleServiceExtra,
    buildClientDataPayload,
  } = useSlotBookingForm({
    slot,
    existingSlots,
    initialClientData: slot.clientData,
    onClose,
    disableEscapeClose: isSubmitting || alertState.isOpen,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeServices.length === 0) {
      setAlertState({
        isOpen: true,
        title: ASSIGN_SLOT_MODAL_TEXTS.alerts.serviceRequiredTitle,
        message: ASSIGN_SLOT_MODAL_TEXTS.alerts.serviceRequiredMessage,
        type: 'restriction',
      });
      return;
    }

    const nameValidation = validateRequiredText(
      name,
      ASSIGN_SLOT_MODAL_TEXTS.alerts.clientNameField,
      FIELD_LIMITS.booking.name.min,
      FIELD_LIMITS.booking.name.max
    );
    if (!nameValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: ASSIGN_SLOT_MODAL_TEXTS.alerts.nameRequiredTitle,
        message: nameValidation.error || ASSIGN_SLOT_MODAL_TEXTS.alerts.nameRequiredMessage,
        type: 'warning',
      });
      return;
    }

    if (email.trim()) {
      const emailValidation = validateEmail(email, false, FIELD_LIMITS.booking.email.max);
      if (!emailValidation.isValid) {
        setAlertState({
          isOpen: true,
          title: ASSIGN_SLOT_MODAL_TEXTS.alerts.emailInvalidTitle,
          message: emailValidation.error || ASSIGN_SLOT_MODAL_TEXTS.alerts.emailInvalidMessage,
          type: 'warning',
        });
        return;
      }
    }

    if (phone.trim()) {
      const phoneValidation = validatePhone(phone, false, FIELD_LIMITS.booking.phone.max);
      if (!phoneValidation.isValid) {
        setAlertState({
          isOpen: true,
          title: ASSIGN_SLOT_MODAL_TEXTS.alerts.phoneInvalidTitle,
          message: phoneValidation.error || ASSIGN_SLOT_MODAL_TEXTS.alerts.phoneInvalidMessage,
          type: 'warning',
        });
        return;
      }
    }

    const notesValidation = validateOptionalText(
      notes,
      ASSIGN_SLOT_MODAL_TEXTS.form.notesLabel,
      FIELD_LIMITS.booking.notes.min,
      FIELD_LIMITS.booking.notes.max
    );
    if (!notesValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: ASSIGN_SLOT_MODAL_TEXTS.form.notesLabel,
        message: notesValidation.error || ASSIGN_SLOT_MODAL_TEXTS.alerts.unexpectedError,
        type: 'warning',
      });
      return;
    }

    const clientData = buildClientDataPayload(
      { name, email, phone, notes },
      ASSIGN_SLOT_MODAL_TEXTS.header.defaultSlotTitle
    );

    if (existingSlots && existingSlots.length > 0) {
      const conflictValidation = validateSlotNoConflict(
        {
          id: slot.id,
          datetime: slot.datetime,
          estimatedDurationMinutes: totalEstimatedMinutes,
          clientData,
        },
        existingSlots
      );

      if (!conflictValidation.isValid) {
        const durationFormatted =
          totalEstimatedMinutes > 0 ? formatEstimatedDuration(totalEstimatedMinutes) : '30 min';
        setAlertState({
          isOpen: true,
          title: ASSIGN_SLOT_MODAL_TEXTS.alerts.conflictTitle,
          message: ASSIGN_SLOT_MODAL_TEXTS.alerts.conflictMessage,
          type: 'restriction',
          details: [...ASSIGN_SLOT_MODAL_TEXTS.alerts.conflictDetails(durationFormatted)],
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await onAssign(slot.id, clientData);
      onClose();
    } catch (err: unknown) {
      console.error(ASSIGN_SLOT_MODAL_TEXTS.logs.assignError, err);
      const msg =
        err instanceof Error ? err.message : ASSIGN_SLOT_MODAL_TEXTS.alerts.unexpectedError;
      const isConflict =
        msg.toLowerCase().includes('conflicto') ||
        msg.toLowerCase().includes('no está disponible') ||
        msg.toLowerCase().includes('reservado') ||
        msg.toLowerCase().includes('confirmado') ||
        msg.toLowerCase().includes('ya existe');

      setAlertState({
        isOpen: true,
        title: isConflict
          ? ASSIGN_SLOT_MODAL_TEXTS.alerts.conflictTitle
          : ASSIGN_SLOT_MODAL_TEXTS.alerts.restrictionTitle,
        message: isConflict ? ASSIGN_SLOT_MODAL_TEXTS.alerts.conflictMessage : msg,
        type: isConflict ? 'restriction' : 'error',
        details: isConflict
          ? ASSIGN_SLOT_MODAL_TEXTS.alerts.conflictDetails(
              totalEstimatedMinutes > 0 ? formatEstimatedDuration(totalEstimatedMinutes) : '30 min'
            )
          : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasPrecedingSelection = relevantServices.length > 1 || hasConfiguredExtras;
  const serviceDisplayName =
    activeServices.length > 0
      ? activeServices.map((s) => s.name).join(' + ')
      : slot.serviceName || ASSIGN_SLOT_MODAL_TEXTS.header.defaultServiceName;

  return (
    <SlotBookingModalFrame
      titleId="assign-slot-modal-title"
      title={ASSIGN_SLOT_MODAL_TEXTS.header.title}
      subtitle={ASSIGN_SLOT_MODAL_TEXTS.header.subtitle}
      closeAriaLabel={ASSIGN_SLOT_MODAL_TEXTS.header.closeAriaLabel}
      isBusy={isSubmitting}
      onClose={onClose}
      onSubmit={handleSubmit}
      serviceDisplayName={serviceDisplayName}
      depositText={`${ASSIGN_SLOT_MODAL_TEXTS.header.depositPrefix}${slot.depositAmount.toLocaleString('es-AR')}`}
      formattedDate={formattedDate}
      formattedTime={formattedTime}
      hourSuffix={ASSIGN_SLOT_MODAL_TEXTS.header.hourSuffix}
      totalEstimatedMinutes={totalEstimatedMinutes}
      baseServicePrice={baseServicePrice}
      basePricePrefix={ASSIGN_SLOT_MODAL_TEXTS.header.basePricePrefix}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {ASSIGN_SLOT_MODAL_TEXTS.footer.cancelButton}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className={styles.submitBtn}
            isLoading={isSubmitting}
            disabled={isSubmitting || hasLiveDurationConflict}
            leftIcon={<UserCheck size={15} strokeWidth={1.75} aria-hidden="true" />}
          >
            {ASSIGN_SLOT_MODAL_TEXTS.footer.submitButton}
          </Button>
        </>
      }
      overlays={
        <>
          {isSubmitting && (
            <Loader
              fullScreen
              title={ASSIGN_SLOT_MODAL_TEXTS.loader.title}
              subtitle={ASSIGN_SLOT_MODAL_TEXTS.loader.subtitle}
              icon="calendar"
            />
          )}

          <AlertModal
            isOpen={alertState.isOpen}
            onClose={closeAlert}
            title={alertState.title}
            message={alertState.message}
            type={alertState.type}
            details={alertState.details}
          />
        </>
      }
    >
      {hasLiveDurationConflict && (
        <div className={styles.liveConflictBanner} role="alert">
          <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>
            La duración combinada ({formatEstimatedDuration(totalEstimatedMinutes)}) se superpone
            con otro turno ya confirmado. Quitá un servicio o elegí otro horario.
          </span>
        </div>
      )}

      <ServiceSelectionSection
        relevantServices={relevantServices}
        selectedServiceNames={selectedServiceNames}
        totalEstimatedMinutes={totalEstimatedMinutes}
        title={ASSIGN_SLOT_MODAL_TEXTS.sections.assignedServices}
        disabled={isSubmitting}
        onToggleService={handleToggleService}
      />

      <ExtrasSelectionSection
        hasConfiguredExtras={hasConfiguredExtras}
        hasPrecedingServices={relevantServices.length > 1}
        activeServices={activeServices}
        selectedExtrasByService={selectedExtrasByService}
        selectedExtrasCount={selectedExtras.length}
        totalExtrasPrice={totalExtrasPrice}
        title={ASSIGN_SLOT_MODAL_TEXTS.sections.requestedExtras}
        selectedSummaryText={ASSIGN_SLOT_MODAL_TEXTS.sections.selectedPlural}
        badgeCountText={ASSIGN_SLOT_MODAL_TEXTS.sections.extrasCheckedBadge}
        disabled={isSubmitting}
        onToggleExtra={handleToggleServiceExtra}
      />

      <div
        className={`${styles.formSection} ${hasPrecedingSelection ? styles.sectionDivided : ''}`}
      >
        <div className={styles.formFieldsGrid}>
          <Input
            label={ASSIGN_SLOT_MODAL_TEXTS.form.clientNameLabel}
            placeholder={ASSIGN_SLOT_MODAL_TEXTS.form.clientNamePlaceholder}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={FIELD_LIMITS.booking.name.max}
            showCharCount
            leftIcon={<User size={15} strokeWidth={1.75} />}
            disabled={isSubmitting}
          />

          <Input
            label={ASSIGN_SLOT_MODAL_TEXTS.form.emailLabel}
            type="email"
            placeholder={ASSIGN_SLOT_MODAL_TEXTS.form.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={FIELD_LIMITS.booking.email.max}
            showCharCount
            leftIcon={<Mail size={15} strokeWidth={1.75} />}
            disabled={isSubmitting}
          />

          <Input
            label={ASSIGN_SLOT_MODAL_TEXTS.form.phoneLabel}
            type="tel"
            phoneOnly
            placeholder={ASSIGN_SLOT_MODAL_TEXTS.form.phonePlaceholder}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={FIELD_LIMITS.booking.phone.max}
            showCharCount
            leftIcon={<Phone size={15} strokeWidth={1.75} />}
            className={styles.fullWidthField}
            disabled={isSubmitting}
          />

          <Textarea
            label={ASSIGN_SLOT_MODAL_TEXTS.form.notesLabel}
            labelIcon={<FileText size={14} strokeWidth={1.75} />}
            placeholder={ASSIGN_SLOT_MODAL_TEXTS.form.notesPlaceholder}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={FIELD_LIMITS.booking.notes.max}
            showCharCount
            rows={3}
            className={styles.fullWidthField}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <PricingReceiptBox
        baseServicePrice={baseServicePrice}
        selectedExtrasCount={selectedExtras.length}
        totalExtrasPrice={totalExtrasPrice}
        totalFinalEstimatedPrice={totalFinalEstimatedPrice}
        depositAmount={slot.depositAmount}
        balanceDueAtSalon={balanceDueAtSalon}
        labels={ASSIGN_SLOT_MODAL_TEXTS.pricing}
      />
    </SlotBookingModalFrame>
  );
};

export const AssignSlotModal: React.FC<AssignSlotModalProps> = ({
  isOpen,
  onClose,
  slot,
  onAssign,
  existingSlots,
}) => {
  if (!isOpen || !slot) return null;

  return (
    <AssignSlotModalContent
      key={slot.id}
      slot={slot}
      onClose={onClose}
      onAssign={onAssign}
      existingSlots={existingSlots}
    />
  );
};

export default AssignSlotModal;
