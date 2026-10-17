import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  UserCheck,
  X,
  User,
  Mail,
  Phone,
  FileText,
  Calendar,
  Clock,
  Sparkles,
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
import { validateEmail, validatePhone, validateRequiredText } from '../../../utils/validators';
import Input from '../../common/Input/Input';
import Button from '../../common/Button/Button';
import Loader from '../../common/Loader/Loader';
import AlertModal, { type AlertModalType } from '../../common/AlertModal';
import { ASSIGN_SLOT_MODAL_TEXTS } from '../../../texts';
import styles from './AssignSlotModal.module.css';

export interface AssignSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: Slot | null;
  onAssign: (slotId: string, clientData: ClientData) => Promise<void>;
}

interface AssignSlotModalContentProps {
  isOpen: boolean;
  onClose: () => void;
  slot: Slot;
  onAssign: (slotId: string, clientData: ClientData) => Promise<void>;
}

const AssignSlotModalContent: React.FC<AssignSlotModalContentProps> = ({
  isOpen,
  onClose,
  slot,
  onAssign,
}) => {
  const [formData, setFormData] = useState<ClientData>({
    name: slot.clientData?.name || '',
    email: slot.clientData?.email || '',
    phone: slot.clientData?.phone || '',
    notes: slot.clientData?.notes || '',
  });

  const [allServices, setAllServices] = useState<ServiceItem[]>([]);
  const [selectedServiceNames, setSelectedServiceNames] = useState<string[]>(
    slot.clientData?.selectedServices ||
      (slot.clientData?.selectedService ? [slot.clientData.selectedService] : [])
  );
  const [selectedExtrasByService, setSelectedExtrasByService] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    if (slot.clientData?.bookedServices && slot.clientData.bookedServices.length > 0) {
      slot.clientData.bookedServices.forEach((bs) => {
        initial[bs.serviceId] = (bs.extras || []).filter((e) => e.selected).map((e) => e.id);
      });
    }
    return initial;
  });

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

  useEffect(() => {
    const unsub = subscribeToServices((data) => {
      setAllServices(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

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
      }
      return [...prev, serviceName];
    });
  };

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
        title: ASSIGN_SLOT_MODAL_TEXTS.alerts.serviceRequiredTitle,
        message: ASSIGN_SLOT_MODAL_TEXTS.alerts.serviceRequiredMessage,
        type: 'restriction',
      });
      return;
    }

    const nameValidation = validateRequiredText(
      formData.name,
      ASSIGN_SLOT_MODAL_TEXTS.alerts.clientNameField,
      2,
      80
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

    if (formData.email?.trim()) {
      const emailValidation = validateEmail(formData.email, false);
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

    if (formData.phone?.trim()) {
      const phoneValidation = validatePhone(formData.phone, false);
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

    setIsSubmitting(true);

    try {
      const serviceTitle =
        activeServices.map((s) => s.name).join(' + ') ||
        slot.serviceName ||
        ASSIGN_SLOT_MODAL_TEXTS.header.defaultSlotTitle;

      await onAssign(slot.id, {
        name: formData.name.trim(),
        email: formData.email ? formData.email.trim().toLowerCase() : '',
        phone: formData.phone ? formData.phone.trim() : '',
        notes: formData.notes ? formData.notes.trim() : '',
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
      });

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

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.modalOverlay}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <motion.div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.stickyHeader}>
                <div className={styles.header}>
                  <div className={styles.headerTitleGroup}>
                    <div className={styles.iconWrapper}>
                      <UserCheck size={22} />
                    </div>
                    <div>
                      <h3 className={styles.title}>{ASSIGN_SLOT_MODAL_TEXTS.header.title}</h3>
                      <p className={styles.subtitle}>{ASSIGN_SLOT_MODAL_TEXTS.header.subtitle}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label={ASSIGN_SLOT_MODAL_TEXTS.header.closeAriaLabel}
                    disabled={isSubmitting}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className={styles.slotSummaryCard}>
                  <div className={styles.slotServiceTitle}>
                    <Sparkles size={15} color="var(--color-primary)" />
                    <span>
                      {activeServices.length > 0
                        ? activeServices.map((s) => s.name).join(' + ')
                        : slot.serviceName || ASSIGN_SLOT_MODAL_TEXTS.header.defaultServiceName}
                    </span>
                    {baseServicePrice > 0 && (
                      <span className={styles.basePriceTag}>
                        ${baseServicePrice.toLocaleString('es-AR')}
                      </span>
                    )}
                  </div>

                  <div className={styles.slotDetailsRow}>
                    <div className={styles.slotDetailItem}>
                      <Calendar size={14} />
                      <span>{formattedDate}</span>
                    </div>
                    <div className={styles.slotDetailItem}>
                      <Clock size={14} />
                      <span>{formattedTime} hs</span>
                    </div>
                    {totalEstimatedMinutes > 0 && (
                      <div className={styles.slotDetailItem}>
                        <Clock size={14} color="var(--color-primary)" />
                        <span>{formatEstimatedDuration(totalEstimatedMinutes)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <AnimatePresence initial={false}>
                  {relevantServices.length > 1 && (
                    <motion.div
                      className={styles.rulesSection}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <div className={styles.rulesHeader}>
                        <span className={styles.rulesLabel}>
                          <Sparkles size={13} color="var(--color-primary)" />
                          {ASSIGN_SLOT_MODAL_TEXTS.sections.assignedServices}
                          <span className={styles.required}> *</span>
                        </span>
                        {totalEstimatedMinutes > 0 && (
                          <span className={styles.estimatedTimeBadge}>
                            <Clock size={11} />
                            {formatEstimatedDuration(totalEstimatedMinutes)}
                          </span>
                        )}
                      </div>

                      <div className={styles.rulesBadgesRow}>
                        {relevantServices.map((service) => {
                          const isSelected = selectedServiceNames.includes(service.name);
                          return (
                            <button
                              key={service.id}
                              type="button"
                              className={`${styles.ruleQuickBtn} ${
                                isSelected ? styles.ruleQuickBtnActive : ''
                              }`}
                              onClick={() => handleToggleService(service.name)}
                              disabled={isSubmitting}
                            >
                              {isSelected ? `✓ ${service.name}` : `+ ${service.name}`}
                              <span className={styles.badgeDuration}>
                                ({service.durationMinutes || 30}m • $
                                {(service.basePrice || 0).toLocaleString('es-AR')})
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
                      className={styles.extrasSection}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <div className={styles.extrasHeader}>
                        <span className={styles.extrasLabel}>
                          <Sparkles size={13} color="var(--color-primary)" />
                          {ASSIGN_SLOT_MODAL_TEXTS.sections.requestedExtras}
                        </span>
                        {selectedExtras.length > 0 && (
                          <span className={styles.extrasSelectedCount}>
                            {ASSIGN_SLOT_MODAL_TEXTS.sections.selectedPlural(
                              selectedExtras.length,
                              totalExtrasPrice.toLocaleString('es-AR')
                            )}
                          </span>
                        )}
                      </div>

                      <div className={styles.serviceExtrasContainer}>
                        <AnimatePresence initial={false}>
                          {activeServices.map((service) => {
                            const serviceExtras = service.extras || [];
                            if (serviceExtras.length === 0) {
                              return null;
                            }
                            const checkedCount = serviceExtras.filter((e) =>
                              (selectedExtrasByService[service.id] || []).includes(e.id)
                            ).length;

                            return (
                              <motion.div
                                key={service.id}
                                layout
                                className={styles.serviceExtrasCard}
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                              >
                                <div className={styles.serviceExtrasCardHeader}>
                                  <span className={styles.serviceExtrasTitle}>
                                    <Sparkles size={12} color="var(--color-primary)" />
                                    {service.name}
                                  </span>
                                  <span className={styles.serviceExtrasBadge}>
                                    {ASSIGN_SLOT_MODAL_TEXTS.sections.extrasCheckedBadge(
                                      checkedCount
                                    )}
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
                                            disabled={isSubmitting}
                                          />
                                          <span>{extra.name}</span>
                                        </div>
                                        <span className={styles.extraPriceHighlight}>
                                          +${(extra.price || 0).toLocaleString('es-AR')}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Input
                  label={ASSIGN_SLOT_MODAL_TEXTS.form.clientNameLabel}
                  placeholder={ASSIGN_SLOT_MODAL_TEXTS.form.clientNamePlaceholder}
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  leftIcon={<User size={15} />}
                  disabled={isSubmitting}
                />

                <Input
                  label={ASSIGN_SLOT_MODAL_TEXTS.form.emailLabel}
                  type="email"
                  placeholder={ASSIGN_SLOT_MODAL_TEXTS.form.emailPlaceholder}
                  value={formData.email || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  disabled={isSubmitting}
                  leftIcon={<Mail size={16} />}
                />

                <Input
                  label={ASSIGN_SLOT_MODAL_TEXTS.form.phoneLabel}
                  type="tel"
                  phoneOnly
                  placeholder={ASSIGN_SLOT_MODAL_TEXTS.form.phonePlaceholder}
                  value={formData.phone || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value,
                    })
                  }
                  disabled={isSubmitting}
                  leftIcon={<Phone size={16} />}
                />

                <div className={styles.textareaWrapper}>
                  <label className={styles.textareaLabel}>
                    <FileText size={14} style={{ display: 'inline', marginRight: 4 }} />
                    {ASSIGN_SLOT_MODAL_TEXTS.form.notesLabel}
                  </label>
                  <textarea
                    className={styles.textarea}
                    placeholder={ASSIGN_SLOT_MODAL_TEXTS.form.notesPlaceholder}
                    value={formData.notes || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notes: e.target.value,
                      })
                    }
                    disabled={isSubmitting}
                    rows={3}
                  />
                </div>

                <AnimatePresence initial={false}>
                  {(totalFinalEstimatedPrice > 0 || slot.depositAmount > 0) && (
                    <motion.div
                      className={styles.pricingSummaryBox}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      {baseServicePrice > 0 && (
                        <div className={styles.pricingRow}>
                          <span>{ASSIGN_SLOT_MODAL_TEXTS.pricing.basePriceLabel}</span>
                          <span className={styles.pricingValue}>
                            ${baseServicePrice.toLocaleString('es-AR')}
                          </span>
                        </div>
                      )}

                      {selectedExtras.length > 0 && (
                        <div className={styles.pricingRow}>
                          <span>{ASSIGN_SLOT_MODAL_TEXTS.pricing.extrasLabel(selectedExtras.length)}</span>
                          <span className={styles.pricingValue}>
                            +${totalExtrasPrice.toLocaleString('es-AR')}
                          </span>
                        </div>
                      )}

                      {totalFinalEstimatedPrice > 0 && (
                        <div className={styles.pricingRow}>
                          <span className={styles.pricingTotalLabel}>
                            {ASSIGN_SLOT_MODAL_TEXTS.pricing.totalEstimatedLabel}
                          </span>
                          <span className={styles.pricingTotalValue}>
                            ${totalFinalEstimatedPrice.toLocaleString('es-AR')}
                          </span>
                        </div>
                      )}

                      <div className={styles.pricingRow}>
                        <span>{ASSIGN_SLOT_MODAL_TEXTS.pricing.depositLabel}</span>
                        <span className={styles.pricingDepositValue}>
                          ${slot.depositAmount.toLocaleString('es-AR')}
                        </span>
                      </div>

                      {balanceDueAtSalon > 0 && (
                        <div className={styles.pricingBalanceRow}>
                          <span>{ASSIGN_SLOT_MODAL_TEXTS.pricing.balanceDueLabel}</span>
                          <span className={styles.pricingBalanceAmount}>
                            ${balanceDueAtSalon.toLocaleString('es-AR')}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={styles.footer}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    {ASSIGN_SLOT_MODAL_TEXTS.footer.cancelButton}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    leftIcon={<UserCheck size={16} />}
                  >
                    {ASSIGN_SLOT_MODAL_TEXTS.footer.submitButton}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </>,
    document.body
  );
};

export const AssignSlotModal: React.FC<AssignSlotModalProps> = ({
  isOpen,
  onClose,
  slot,
  onAssign,
}) => {
  if (!slot) return null;
  return (
    <AssignSlotModalContent
      key={slot.id}
      isOpen={isOpen}
      slot={slot}
      onClose={onClose}
      onAssign={onAssign}
    />
  );
};

export default AssignSlotModal;