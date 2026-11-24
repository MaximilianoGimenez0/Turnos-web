import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  FileText,
} from 'lucide-react';

import type { Slot, ClientData } from '../../../types';
import { useTenant } from '../../../context/TenantContext';
import { useOwnerInfo } from '../../../context/OwnerInfoContext';
import { formatEstimatedDuration } from '../../../services/bookingHelper';
import { validateSlotNoConflict } from '../../../services/schedulingService';
import {
  formatInstagramUrl,
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
import { BOOKING_MODAL_TEXTS } from '../../../texts';
import {
  SlotBookingModalFrame,
  ServiceSelectionSection,
  ExtrasSelectionSection,
  PricingReceiptBox,
  useSlotBookingForm,
  slotBookingStyles as styles,
} from '../SlotBookingShared';

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: Slot | null;
  isSlotUnavailable?: boolean;
  onCheckout: (slotId: string, clientData: ClientData) => Promise<string>;
  existingSlots?: Slot[];
}

interface BookingModalContentProps {
  onClose: () => void;
  slot: Slot;
  isSlotUnavailable?: boolean;
  onCheckout: (slotId: string, clientData: ClientData) => Promise<string>;
  existingSlots?: Slot[];
}

const BookingModalContent: React.FC<BookingModalContentProps> = ({
  onClose,
  slot,
  isSlotUnavailable = false,
  onCheckout,
  existingSlots,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const { mpConfigured } = useTenant();
  const { owner } = useOwnerInfo();
  const isOnlinePaymentDisabled = !mpConfigured;

  const cleanWaDigits = (owner.phone || '').replace(/\D/g, '');
  const whatsappContactUrl =
    cleanWaDigits.length >= 8 ? `https://wa.me/${cleanWaDigits}` : null;
  const instagramContactUrl = formatInstagramUrl(owner.instagram);

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
    onClose,
    disableEscapeClose: isLoading || alertState.isOpen,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isOnlinePaymentDisabled) {
      setAlertState({
        isOpen: true,
        title: BOOKING_MODAL_TEXTS.mpNotConfigured.title,
        message: BOOKING_MODAL_TEXTS.mpNotConfigured.description,
        type: 'restriction',
      });
      return;
    }

    if (isSlotUnavailable) {
      setAlertState({
        isOpen: true,
        title: BOOKING_MODAL_TEXTS.alerts.conflictTitle,
        message:
          'Este horario acaba de ser reservado o bloqueado por otra persona. Cerrá esta ventana y elegí otro turno disponible.',
        type: 'restriction',
      });
      return;
    }

    if (activeServices.length === 0) {
      setAlertState({
        isOpen: true,
        title: BOOKING_MODAL_TEXTS.alerts.serviceRequiredTitle,
        message: BOOKING_MODAL_TEXTS.alerts.serviceRequiredMessage,
        type: 'restriction',
      });
      return;
    }

    const nameValidation = validateRequiredText(
      name,
      BOOKING_MODAL_TEXTS.form.nameField,
      FIELD_LIMITS.booking.name.min,
      FIELD_LIMITS.booking.name.max
    );
    if (!nameValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: BOOKING_MODAL_TEXTS.alerts.nameRequiredTitle,
        message: nameValidation.error || BOOKING_MODAL_TEXTS.alerts.nameRequiredMessage,
        type: 'warning',
      });
      return;
    }

    const emailValidation = validateEmail(email, true, FIELD_LIMITS.booking.email.max);
    if (!emailValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: BOOKING_MODAL_TEXTS.alerts.emailInvalidTitle,
        message: emailValidation.error || BOOKING_MODAL_TEXTS.alerts.emailInvalidMessage,
        type: 'warning',
      });
      return;
    }

    const phoneValidation = validatePhone(phone, true, FIELD_LIMITS.booking.phone.max);
    if (!phoneValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: BOOKING_MODAL_TEXTS.alerts.phoneInvalidTitle,
        message: phoneValidation.error || BOOKING_MODAL_TEXTS.alerts.phoneInvalidMessage,
        type: 'warning',
      });
      return;
    }

    const notesValidation = validateOptionalText(
      notes,
      BOOKING_MODAL_TEXTS.form.notesLabel,
      FIELD_LIMITS.booking.notes.min,
      FIELD_LIMITS.booking.notes.max
    );
    if (!notesValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: BOOKING_MODAL_TEXTS.form.notesLabel,
        message: notesValidation.error || BOOKING_MODAL_TEXTS.alerts.unexpectedError,
        type: 'warning',
      });
      return;
    }

    setIsLoading(true);

    try {
      const clientData = buildClientDataPayload(
        { name, email, phone, notes },
        BOOKING_MODAL_TEXTS.header.defaultServiceTitle
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
            title: BOOKING_MODAL_TEXTS.alerts.conflictTitle,
            message: BOOKING_MODAL_TEXTS.alerts.conflictMessage,
            type: 'restriction',
            details: [...BOOKING_MODAL_TEXTS.alerts.conflictDetails(durationFormatted)],
          });
          setIsLoading(false);
          return;
        }
      }

      const redirectUrl = await onCheckout(slot.id, clientData);

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error(BOOKING_MODAL_TEXTS.alerts.mpUrlError);
      }
    } catch (err: unknown) {
      console.error(BOOKING_MODAL_TEXTS.logs.bookingError, err);
      const msg =
        err instanceof Error ? err.message : BOOKING_MODAL_TEXTS.alerts.unexpectedError;

      const isPaymentInProgress =
        msg.toLowerCase().includes('proceso de pago') ||
        msg.toLowerCase().includes('resource-exhausted');

      const isConflict =
        isPaymentInProgress ||
        msg.toLowerCase().includes('conflicto') ||
        msg.toLowerCase().includes('no está disponible') ||
        msg.toLowerCase().includes('reservado');

      const durationFormatted =
        totalEstimatedMinutes > 0 ? formatEstimatedDuration(totalEstimatedMinutes) : '30 min';

      setAlertState({
        isOpen: true,
        title: isPaymentInProgress
          ? BOOKING_MODAL_TEXTS.alerts.pendingPaymentTitle
          : isConflict
            ? BOOKING_MODAL_TEXTS.alerts.conflictTitle
            : BOOKING_MODAL_TEXTS.alerts.restrictionTitle,
        message: isPaymentInProgress
          ? BOOKING_MODAL_TEXTS.alerts.pendingPaymentMessage
          : isConflict
            ? BOOKING_MODAL_TEXTS.alerts.conflictMessage
            : msg,
        type: isConflict ? 'restriction' : 'error',
        details: isConflict
          ? isPaymentInProgress
            ? [...BOOKING_MODAL_TEXTS.alerts.pendingPaymentDetails]
            : [...BOOKING_MODAL_TEXTS.alerts.conflictDetails(durationFormatted)]
          : undefined,
      });
      setIsLoading(false);
    }
  };

  const hasPrecedingSelection = relevantServices.length > 1 || hasConfiguredExtras;
  const serviceDisplayName =
    activeServices.length > 0
      ? activeServices.map((s) => s.name).join(' + ')
      : slot.serviceName || BOOKING_MODAL_TEXTS.header.defaultServiceName;

  return (
    <SlotBookingModalFrame
      titleId="booking-modal-title"
      title={BOOKING_MODAL_TEXTS.header.title}
      subtitle={BOOKING_MODAL_TEXTS.header.subtitle}
      closeAriaLabel={BOOKING_MODAL_TEXTS.header.closeAriaLabel}
      isBusy={isLoading}
      onClose={onClose}
      onSubmit={handleSubmit}
      serviceDisplayName={serviceDisplayName}
      depositText={`${BOOKING_MODAL_TEXTS.header.depositPrefix}${slot.depositAmount.toLocaleString('es-AR')}`}
      formattedDate={formattedDate}
      formattedTime={formattedTime}
      hourSuffix={BOOKING_MODAL_TEXTS.header.hourSuffix}
      totalEstimatedMinutes={totalEstimatedMinutes}
      baseServicePrice={baseServicePrice}
      basePricePrefix={BOOKING_MODAL_TEXTS.header.basePricePrefix}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            {BOOKING_MODAL_TEXTS.footer.cancelButton}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className={styles.submitBtn}
            isLoading={isLoading}
            disabled={
              isLoading ||
              isSlotUnavailable ||
              hasLiveDurationConflict ||
              isOnlinePaymentDisabled
            }
            leftIcon={<CreditCard size={15} strokeWidth={1.75} aria-hidden="true" />}
          >
            {isOnlinePaymentDisabled
              ? BOOKING_MODAL_TEXTS.footer.onlinePaymentUnavailable
              : isLoading
                ? BOOKING_MODAL_TEXTS.footer.generatingPayment
                : BOOKING_MODAL_TEXTS.footer.payDepositButton(
                    slot.depositAmount.toLocaleString('es-AR')
                  )}
          </Button>
        </>
      }
      overlays={
        <>
          {isLoading && (
            <Loader
              fullScreen
              title={BOOKING_MODAL_TEXTS.loader.title}
              subtitle={BOOKING_MODAL_TEXTS.loader.subtitle}
              icon="shield"
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
      {isOnlinePaymentDisabled && (
        <div className={styles.mpUnavailableBanner} role="alert">
          <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
          <div className={styles.mpUnavailableContent}>
            <strong>{BOOKING_MODAL_TEXTS.mpNotConfigured.title}</strong>
            <p>{BOOKING_MODAL_TEXTS.mpNotConfigured.description}</p>
            {(whatsappContactUrl || instagramContactUrl) && (
              <div className={styles.mpUnavailableLinks}>
                {whatsappContactUrl && (
                  <a
                    href={whatsappContactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.mpUnavailableLink}
                  >
                    {BOOKING_MODAL_TEXTS.mpNotConfigured.whatsappCta}
                  </a>
                )}
                {instagramContactUrl && (
                  <a
                    href={instagramContactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.mpUnavailableLink}
                  >
                    {BOOKING_MODAL_TEXTS.mpNotConfigured.instagramCta}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isSlotUnavailable && (
        <div className={styles.liveConflictBanner} role="alert">
          <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>
            Este horario dejó de estar disponible hace instantes. Elegí otro horario para continuar.
          </span>
        </div>
      )}

      {!isSlotUnavailable && hasLiveDurationConflict && (
        <div className={styles.liveConflictBanner} role="alert">
          <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>
            La duración combinada ({formatEstimatedDuration(totalEstimatedMinutes)}) se superpone
            con otro turno ya reservado. Quitá un servicio o elegí otro horario.
          </span>
        </div>
      )}

      <ServiceSelectionSection
        relevantServices={relevantServices}
        selectedServiceNames={selectedServiceNames}
        totalEstimatedMinutes={totalEstimatedMinutes}
        title={BOOKING_MODAL_TEXTS.services.availableTitle}
        disabled={isLoading}
        onToggleService={handleToggleService}
      />

      <ExtrasSelectionSection
        hasConfiguredExtras={hasConfiguredExtras}
        hasPrecedingServices={relevantServices.length > 1}
        activeServices={activeServices}
        selectedExtrasByService={selectedExtrasByService}
        selectedExtrasCount={selectedExtras.length}
        totalExtrasPrice={totalExtrasPrice}
        title={BOOKING_MODAL_TEXTS.extras.sectionTitle}
        selectedSummaryText={BOOKING_MODAL_TEXTS.extras.selectedPlural}
        badgeCountText={BOOKING_MODAL_TEXTS.extras.badgeCount}
        disabled={isLoading}
        onToggleExtra={handleToggleServiceExtra}
      />

      <div
        className={`${styles.formSection} ${hasPrecedingSelection ? styles.sectionDivided : ''}`}
      >
        <div className={styles.formFieldsGrid}>
          <Input
            label={BOOKING_MODAL_TEXTS.form.nameLabel}
            placeholder={BOOKING_MODAL_TEXTS.form.namePlaceholder}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={FIELD_LIMITS.booking.name.max}
            showCharCount
            leftIcon={<User size={15} strokeWidth={1.75} />}
            disabled={isLoading}
          />

          <Input
            label={BOOKING_MODAL_TEXTS.form.emailLabel}
            type="email"
            placeholder={BOOKING_MODAL_TEXTS.form.emailPlaceholder}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={FIELD_LIMITS.booking.email.max}
            showCharCount
            leftIcon={<Mail size={15} strokeWidth={1.75} />}
            disabled={isLoading}
          />

          <Input
            label={BOOKING_MODAL_TEXTS.form.phoneLabel}
            type="tel"
            phoneOnly
            placeholder={BOOKING_MODAL_TEXTS.form.phonePlaceholder}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={FIELD_LIMITS.booking.phone.max}
            showCharCount
            leftIcon={<Phone size={15} strokeWidth={1.75} />}
            className={styles.fullWidthField}
            required
            disabled={isLoading}
          />

          <Textarea
            label={BOOKING_MODAL_TEXTS.form.notesLabel}
            labelIcon={<FileText size={14} strokeWidth={1.75} />}
            placeholder={BOOKING_MODAL_TEXTS.form.notesPlaceholder}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={FIELD_LIMITS.booking.notes.max}
            showCharCount
            rows={3}
            className={styles.fullWidthField}
            disabled={isLoading}
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
        labels={BOOKING_MODAL_TEXTS.pricing}
      />

      <p className={styles.disclaimer}>
        <ShieldCheck
          size={15}
          strokeWidth={1.75}
          className={styles.disclaimerIcon}
          aria-hidden="true"
        />
        <span>
          <strong>{BOOKING_MODAL_TEXTS.disclaimer.boldText}</strong>{' '}
          {BOOKING_MODAL_TEXTS.disclaimer.text}
        </span>
      </p>
    </SlotBookingModalFrame>
  );
};

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  slot,
  isSlotUnavailable = false,
  onCheckout,
  existingSlots,
}) => {
  if (!isOpen || !slot) return null;

  return (
    <BookingModalContent
      key={slot.id}
      slot={slot}
      isSlotUnavailable={isSlotUnavailable}
      onClose={onClose}
      onCheckout={onCheckout}
      existingSlots={existingSlots}
    />
  );
};

export default BookingModal;
