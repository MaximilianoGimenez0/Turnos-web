import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  CreditCard,
  X,
  Calendar,
  Clock,
  Check,
  Plus,
} from 'lucide-react';

import type {
  Slot,
  ClientData,
  ServiceItem,
  PriceExtra,
  BookedServiceItem,
  BookedServiceExtra,
} from '../../../types';
import { subscribeToServices } from '../../../services/servicesService';
import { formatEstimatedDuration } from '../../../services/bookingHelper';
import { validateSlotNoConflict } from '../../../services/schedulingService';
import { validateEmail, validatePhone, validateRequiredText } from '../../../utils/validators';
import Input from '../../common/Input/Input';
import Button from '../../common/Button/Button';
import Loader from '../../common/Loader/Loader';
import AlertModal, { type AlertModalType } from '../../common/AlertModal';
import { BOOKING_MODAL_TEXTS } from '../../../texts';
import styles from './BookingModal.module.css';

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: Slot | null;
  onCheckout: (slotId: string, clientData: ClientData) => Promise<string>;
  existingSlots?: Slot[];
}

interface BookingModalContentProps {
  onClose: () => void;
  slot: Slot;
  onCheckout: (slotId: string, clientData: ClientData) => Promise<string>;
  existingSlots?: Slot[];
}

const BookingModalContent: React.FC<BookingModalContentProps> = ({
  onClose,
  slot,
  onCheckout,
  existingSlots,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [allServices, setAllServices] = useState<ServiceItem[]>([]);
  const [selectedServiceNames, setSelectedServiceNames] = useState<string[]>([]);
  const [selectedExtrasByService, setSelectedExtrasByService] = useState<Record<string, string[]>>({});

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

  useEffect(() => {
    const unsub = subscribeToServices((data) => {
      setAllServices(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading && !alertState.isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isLoading, alertState.isOpen]);

  const relevantServices = useMemo(() => {
    if (allServices.length === 0) return [];

    if (slot.services && slot.services.length > 0) {
      const matched = allServices.filter((s) =>
        slot.services!.some(
          (slotSrv) =>
            (typeof slotSrv === 'string' ? slotSrv : slotSrv.name).trim().toLowerCase() ===
            s.name.trim().toLowerCase()
        )
      );
      if (matched.length > 0) return matched;
    }

    if (slot.serviceName) {
      const trimmedTarget = slot.serviceName.trim().toLowerCase();
      const matched = allServices.filter(
        (s) =>
          s.name.trim().toLowerCase() === trimmedTarget ||
          trimmedTarget.includes(s.name.trim().toLowerCase())
      );
      if (matched.length > 0) return matched;
    }

    // Fallback por campo legacy rules
    if (slot.rules && slot.rules.length > 0) {
      const matched = allServices.filter((s) => slot.rules!.includes(s.name));
      if (matched.length > 0) return matched;
    }

    return allServices;
  }, [slot, allServices]);

  const activeServices = useMemo(() => {
    if (relevantServices.length === 1) {
      return relevantServices;
    }
    return relevantServices.filter((s) => selectedServiceNames.includes(s.name));
  }, [relevantServices, selectedServiceNames]);

  const handleToggleServiceExtra = (serviceId: string, extraId: string) => {
    setSelectedExtrasByService((prev) => {
      const current = prev[serviceId] || [];
      const updated = current.includes(extraId)
        ? current.filter((id) => id !== extraId)
        : [...current, extraId];
      return {
        ...prev,
        [serviceId]: updated,
      };
    });
  };

  const bookedServices: BookedServiceItem[] = useMemo(() => {
    return activeServices.map((service) => {
      const checkedIds = selectedExtrasByService[service.id] || [];
      const extras: BookedServiceExtra[] = (service.extras || []).map((ex) => ({
        id: ex.id,
        name: ex.name,
        price: ex.price,
        selected: checkedIds.includes(ex.id),
      }));
      return {
        serviceId: service.id,
        name: service.name,
        basePrice: service.basePrice,
        durationMinutes: service.durationMinutes,
        extras,
      };
    });
  }, [activeServices, selectedExtrasByService]);

  const selectedExtras: PriceExtra[] = useMemo(() => {
    const result: PriceExtra[] = [];
    bookedServices.forEach((s) => {
      s.extras.forEach((ex) => {
        if (ex.selected) {
          result.push({
            id: ex.id,
            name: ex.name,
            price: ex.price,
          });
        }
      });
    });
    return result;
  }, [bookedServices]);

  const hasConfiguredExtras = useMemo(() => {
    return activeServices.some((s) => (s.extras || []).length > 0);
  }, [activeServices]);

  const totalEstimatedMinutes = useMemo(() => {
    const total = bookedServices.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    return total > 0 ? total : 0;
  }, [bookedServices]);

  const baseServicePrice = useMemo(() => {
    return bookedServices.reduce((sum, s) => sum + (s.basePrice || 0), 0);
  }, [bookedServices]);

  const totalExtrasPrice = useMemo(() => {
    return selectedExtras.reduce((acc, curr) => acc + (curr.price || 0), 0);
  }, [selectedExtras]);

  const totalFinalEstimatedPrice = useMemo(() => {
    return (baseServicePrice || 0) + totalExtrasPrice;
  }, [baseServicePrice, totalExtrasPrice]);

  const balanceDueAtSalon = useMemo(() => {
    const balance = totalFinalEstimatedPrice - (slot.depositAmount || 0);
    return balance > 0 ? balance : 0;
  }, [totalFinalEstimatedPrice, slot.depositAmount]);

  const handleToggleService = (serviceName: string) => {
    const service = relevantServices.find((s) => s.name === serviceName);
    setSelectedServiceNames((prev) => {
      if (prev.includes(serviceName)) {
        if (service) {
          setSelectedExtrasByService((extrasPrev) => {
            const next = { ...extrasPrev };
            delete next[service.id];
            return next;
          });
        }
        return prev.filter((s) => s !== serviceName);
      } else {
        return [...prev, serviceName];
      }
    });
  };

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const slotDate = new Date(slot.datetime);
  const formattedDate = !isNaN(slotDate.getTime())
    ? slotDate.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : slot.datetime;

  const formattedTime = !isNaN(slotDate.getTime())
    ? slotDate.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeServices.length === 0) {
      setAlertState({
        isOpen: true,
        title: BOOKING_MODAL_TEXTS.alerts.serviceRequiredTitle,
        message: BOOKING_MODAL_TEXTS.alerts.serviceRequiredMessage,
        type: 'restriction',
      });
      return;
    }

    const nameValidation = validateRequiredText(name, BOOKING_MODAL_TEXTS.form.nameField, 2, 80);
    if (!nameValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: BOOKING_MODAL_TEXTS.alerts.nameRequiredTitle,
        message: nameValidation.error || BOOKING_MODAL_TEXTS.alerts.nameRequiredMessage,
        type: 'warning',
      });
      return;
    }

    const emailValidation = validateEmail(email, true);
    if (!emailValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: BOOKING_MODAL_TEXTS.alerts.emailInvalidTitle,
        message: emailValidation.error || BOOKING_MODAL_TEXTS.alerts.emailInvalidMessage,
        type: 'warning',
      });
      return;
    }

    const phoneValidation = validatePhone(phone, true);
    if (!phoneValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: BOOKING_MODAL_TEXTS.alerts.phoneInvalidTitle,
        message:
          phoneValidation.error || BOOKING_MODAL_TEXTS.alerts.phoneInvalidMessage,
        type: 'warning',
      });
      return;
    }

    setIsLoading(true);

    try {
      const serviceTitle =
        activeServices.map((s) => s.name).join(' + ') ||
        slot.serviceName ||
        BOOKING_MODAL_TEXTS.header.defaultServiceTitle;

      const clientData: ClientData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        notes: notes.trim() || '',
        bookedServices,
        selectedService: serviceTitle,
        selectedServices: activeServices.map((s) => s.name),
        selectedRules: activeServices.map((s) => s.name),
        basePrice: baseServicePrice,
        selectedExtras,
        extrasPrice: totalExtrasPrice,
        estimatedDurationMinutes: totalEstimatedMinutes,
        estimatedDuration:
          totalEstimatedMinutes > 0 ? formatEstimatedDuration(totalEstimatedMinutes) : '30 min',
        estimatedPrice: totalFinalEstimatedPrice,
      };

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
        err instanceof Error
          ? err.message
          : BOOKING_MODAL_TEXTS.alerts.unexpectedError;

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

  return createPortal(
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-modal-title"
        >
          <div className={styles.modalHeader}>
            <div className={styles.headerTop}>
              <div className={styles.headerTitles}>
                <h3 id="booking-modal-title" className={styles.title}>
                  {BOOKING_MODAL_TEXTS.header.title}
                </h3>
                <p className={styles.subtitle}>
                  {BOOKING_MODAL_TEXTS.header.subtitle}
                </p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                aria-label={BOOKING_MODAL_TEXTS.header.closeAriaLabel}
                disabled={isLoading}
              >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <div className={styles.contextStrip}>
              <div className={styles.contextPrimaryRow}>
                <span className={styles.contextServiceName}>
                  {activeServices.length > 0
                    ? activeServices.map((s) => s.name).join(' + ')
                    : slot.serviceName || BOOKING_MODAL_TEXTS.header.defaultServiceName}
                </span>
                <span className={styles.contextDeposit}>
                  {BOOKING_MODAL_TEXTS.header.depositPrefix}
                  {slot.depositAmount.toLocaleString('es-AR')}
                </span>
              </div>

              <div className={styles.contextMetaRow}>
                <span className={styles.contextMetaItem}>
                  <Calendar size={13} strokeWidth={1.75} aria-hidden="true" />
                  <span className={styles.contextDateText}>{formattedDate}</span>
                </span>
                <span className={styles.contextMetaItem}>
                  <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
                  <span className={styles.tabular}>
                    {formattedTime} {BOOKING_MODAL_TEXTS.header.hourSuffix}
                  </span>
                </span>
                {totalEstimatedMinutes > 0 && (
                  <span className={styles.contextDuration}>
                    · {formatEstimatedDuration(totalEstimatedMinutes)}
                  </span>
                )}
                {baseServicePrice > 0 && (
                  <span className={styles.contextBasePrice}>
                    {BOOKING_MODAL_TEXTS.header.basePricePrefix}
                    {baseServicePrice.toLocaleString('es-AR')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formBody}>
              <AnimatePresence initial={false}>
                {relevantServices.length > 1 && (
                  <motion.div
                    className={styles.formSection}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                  >
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionLabel}>
                        {BOOKING_MODAL_TEXTS.services.availableTitle}
                        <span className={styles.required}>*</span>
                      </span>
                      {totalEstimatedMinutes > 0 && (
                        <span className={styles.sectionMeta}>
                          {formatEstimatedDuration(totalEstimatedMinutes)}
                        </span>
                      )}
                    </div>

                    <div className={styles.serviceOptionsRow}>
                      {relevantServices.map((service) => {
                        const isSelected = selectedServiceNames.includes(service.name);
                        return (
                          <button
                            key={service.id}
                            type="button"
                            className={`${styles.serviceOptionBtn} ${
                              isSelected ? styles.serviceOptionBtnActive : ''
                            }`}
                            onClick={() => handleToggleService(service.name)}
                            disabled={isLoading}
                            aria-pressed={isSelected}
                          >
                            <span className={styles.optionIcon} aria-hidden="true">
                              {isSelected ? (
                                <Check size={13} strokeWidth={2.2} />
                              ) : (
                                <Plus size={13} strokeWidth={1.75} />
                              )}
                            </span>
                            <span className={styles.optionName}>{service.name}</span>
                            <span className={styles.optionMeta}>
                              {service.durationMinutes || 30}m · $
                              {(service.basePrice || 0).toLocaleString('es-AR')}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {hasConfiguredExtras && (
                  <motion.div
                    className={`${styles.formSection} ${
                      relevantServices.length > 1 ? styles.sectionDivided : ''
                    }`}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionLabel}>
                        {BOOKING_MODAL_TEXTS.extras.sectionTitle}
                      </span>
                      {selectedExtras.length > 0 && (
                        <span className={styles.extrasSummaryTag}>
                          {BOOKING_MODAL_TEXTS.extras.selectedPlural(
                            selectedExtras.length,
                            totalExtrasPrice.toLocaleString('es-AR')
                          )}
                        </span>
                      )}
                    </div>

                    <div className={styles.serviceExtrasList}>
                      {activeServices.map((service) => {
                        const serviceExtras = service.extras || [];
                        if (serviceExtras.length === 0) return null;

                        const checkedCount = serviceExtras.filter((e) =>
                          (selectedExtrasByService[service.id] || []).includes(e.id)
                        ).length;

                        return (
                          <motion.div
                            key={service.id}
                            layout
                            className={styles.serviceExtrasGroup}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                          >
                            <div className={styles.serviceExtrasGroupHeader}>
                              <span className={styles.serviceExtrasGroupTitle}>{service.name}</span>
                              <span className={styles.serviceExtrasCount}>
                                {BOOKING_MODAL_TEXTS.extras.badgeCount(checkedCount)}
                              </span>
                            </div>

                            <div className={styles.extrasCheckboxList}>
                              {serviceExtras.map((extra) => {
                                const isSelected = (
                                  selectedExtrasByService[service.id] || []
                                ).includes(extra.id);
                                return (
                                  <label
                                    key={extra.id}
                                    className={`${styles.extraCheckboxItem} ${
                                      isSelected ? styles.extraCheckboxItemActive : ''
                                    }`}
                                  >
                                    <div className={styles.extraCheckboxLeft}>
                                      <input
                                        type="checkbox"
                                        className={styles.extraCheckboxInput}
                                        checked={isSelected}
                                        onChange={() =>
                                          handleToggleServiceExtra(service.id, extra.id)
                                        }
                                        disabled={isLoading}
                                      />
                                      <span className={styles.extraCheckboxName}>{extra.name}</span>
                                    </div>
                                    <span className={styles.extraPriceValue}>
                                      +${(extra.price || 0).toLocaleString('es-AR')}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                className={`${styles.formSection} ${
                  hasPrecedingSelection ? styles.sectionDivided : ''
                }`}
              >
                <div className={styles.formFieldsGrid}>
                  <Input
                    label={BOOKING_MODAL_TEXTS.form.nameLabel}
                    placeholder={BOOKING_MODAL_TEXTS.form.namePlaceholder}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    leftIcon={<Phone size={15} strokeWidth={1.75} />}
                    required
                    disabled={isLoading}
                  />

                  <Input
                    label={BOOKING_MODAL_TEXTS.form.notesLabel}
                    placeholder={BOOKING_MODAL_TEXTS.form.notesPlaceholder}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <AnimatePresence initial={false}>
                {(totalFinalEstimatedPrice > 0 || slot.depositAmount > 0) && (
                  <motion.div
                    className={styles.receiptBox}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                  >
                    {baseServicePrice > 0 && (
                      <div className={styles.receiptRow}>
                        <span className={styles.receiptLabel}>
                          {BOOKING_MODAL_TEXTS.pricing.basePriceLabel}
                        </span>
                        <span className={styles.receiptValue}>
                          ${baseServicePrice.toLocaleString('es-AR')}
                        </span>
                      </div>
                    )}

                    {selectedExtras.length > 0 && (
                      <div className={styles.receiptRow}>
                        <span className={styles.receiptLabel}>
                          {BOOKING_MODAL_TEXTS.pricing.extrasLabel(selectedExtras.length)}
                        </span>
                        <span className={styles.receiptValue}>
                          +${totalExtrasPrice.toLocaleString('es-AR')}
                        </span>
                      </div>
                    )}

                    {totalFinalEstimatedPrice > 0 && (
                      <div className={`${styles.receiptRow} ${styles.receiptTotalRow}`}>
                        <span className={styles.receiptTotalLabel}>
                          {BOOKING_MODAL_TEXTS.pricing.totalEstimatedLabel}
                        </span>
                        <span className={styles.receiptTotalValue}>
                          ${totalFinalEstimatedPrice.toLocaleString('es-AR')}
                        </span>
                      </div>
                    )}

                    <div className={`${styles.receiptRow} ${styles.receiptDepositRow}`}>
                      <span className={styles.receiptDepositLabel}>
                        {BOOKING_MODAL_TEXTS.pricing.depositLabel}
                      </span>
                      <span className={styles.receiptDepositValue}>
                        ${slot.depositAmount.toLocaleString('es-AR')}
                      </span>
                    </div>

                    {balanceDueAtSalon > 0 && (
                      <div className={styles.receiptRow}>
                        <span className={styles.receiptLabel}>
                          {BOOKING_MODAL_TEXTS.pricing.balanceDueLabel}
                        </span>
                        <span className={styles.receiptBalanceValue}>
                          ${balanceDueAtSalon.toLocaleString('es-AR')}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <p className={styles.disclaimer}>
                <ShieldCheck size={15} strokeWidth={1.75} className={styles.disclaimerIcon} aria-hidden="true" />
                <span>
                  <strong>{BOOKING_MODAL_TEXTS.disclaimer.boldText}</strong>{' '}
                  {BOOKING_MODAL_TEXTS.disclaimer.text}
                </span>
              </p>
            </div>

            <div className={styles.footerActions}>
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
                leftIcon={<CreditCard size={15} strokeWidth={1.75} aria-hidden="true" />}
              >
                {isLoading
                  ? BOOKING_MODAL_TEXTS.footer.generatingPayment
                  : BOOKING_MODAL_TEXTS.footer.payDepositButton(
                      slot.depositAmount.toLocaleString('es-AR')
                    )}
              </Button>
            </div>
          </form>
        </div>
      </div>

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
    </>,
    document.body
  );
};

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  slot,
  onCheckout,
  existingSlots,
}) => {
  if (!isOpen || !slot) return null;

  return (
    <BookingModalContent
      key={slot.id}
      slot={slot}
      onClose={onClose}
      onCheckout={onCheckout}
      existingSlots={existingSlots}
    />
  );
};

export default BookingModal;
