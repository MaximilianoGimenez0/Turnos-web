import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  FileText,
  History,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { BookedServiceItem, ServiceItem, SlotSurcharge } from '../../../types';
import { FIELD_LIMITS } from '../../../config/fieldLimits';
import { formatEstimatedDuration } from '../../../services/bookingHelper';
import { normalizeSlotSurcharge } from '../../../utils/surcharge';
import { BOOKING_MODAL_TEXTS } from '../../../texts';
import Input from '../../common/Input/Input';
import Textarea from '../../common/Textarea/Textarea';
import SurchargeBadge from '../../common/SurchargeBadge';
import { PricingReceiptBox, slotBookingStyles as sharedStyles } from '../SlotBookingShared';
import type {
  BookingClientFields,
  BookingFieldErrors,
  BookingWizardStepId,
} from './bookingWizard';
import styles from './BookingModal.module.css';

const SMOOTH_EASE = [0.22, 1, 0.36, 1] as const;

export interface ServiceStepProps {
  relevantServices: ServiceItem[];
  selectedServiceNames: string[];
  disabled: boolean;
  errorMessage?: string | null;
  onToggleService: (serviceName: string) => void;
}

export const ServiceStep: React.FC<ServiceStepProps> = ({
  relevantServices,
  selectedServiceNames,
  disabled,
  errorMessage,
  onToggleService,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const isSingleService = relevantServices.length === 1;

  const checkTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: SMOOTH_EASE };

  const collapseTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: SMOOTH_EASE };

  return (
    <div className={styles.stepSection}>
      <div className={styles.stepHeader}>
        <h4 className={styles.stepTitle}>
          {isSingleService
            ? BOOKING_MODAL_TEXTS.wizard.serviceStep.titleSingle
            : BOOKING_MODAL_TEXTS.wizard.serviceStep.titleMultiple}
        </h4>
        <p className={styles.stepSubtitle}>
          {isSingleService
            ? BOOKING_MODAL_TEXTS.wizard.serviceStep.subtitleSingle
            : BOOKING_MODAL_TEXTS.wizard.serviceStep.subtitleMultiple}
        </p>
      </div>

      <div className={styles.serviceCardsList}>
        {relevantServices.map((service) => {
          const isSelected = isSingleService || selectedServiceNames.includes(service.name);
          const extrasCount = service.extras?.length ?? 0;
          const durationText = formatEstimatedDuration(service.durationMinutes || 30);
          const priceText =
            service.basePrice > 0
              ? `$${service.basePrice.toLocaleString('es-AR')}`
              : BOOKING_MODAL_TEXTS.wizard.serviceStep.priceToConfirm;

          const cardContent = (
            <>
              <div className={styles.serviceCardLeft}>
                <span
                  className={`${styles.serviceCheckCircle} ${
                    isSelected ? styles.serviceCheckCircleActive : ''
                  }`}
                  aria-hidden="true"
                >
                  <AnimatePresence initial={false}>
                    {isSelected && (
                      <motion.span
                        key="service-check"
                        className={styles.serviceCheckIcon}
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.45 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.45 }}
                        transition={checkTransition}
                      >
                        <Check size={12} strokeWidth={2.5} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>

                <div className={styles.serviceCardInfo}>
                  <div className={styles.serviceCardTitleRow}>
                    <span className={styles.serviceCardName}>{service.name}</span>
                    {isSingleService && (
                      <span className={styles.includedBadge}>
                        {BOOKING_MODAL_TEXTS.wizard.serviceStep.includedBadge}
                      </span>
                    )}
                  </div>

                  <div className={styles.serviceCardMeta}>
                    <span className={styles.serviceMetaItem}>
                      <Clock size={12} strokeWidth={1.75} aria-hidden="true" />
                      <span>{durationText}</span>
                    </span>
                    {extrasCount > 0 && (
                      <span className={styles.serviceExtrasHint}>
                        {BOOKING_MODAL_TEXTS.wizard.serviceStep.extrasAvailableHint(extrasCount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span className={styles.serviceCardPrice}>{priceText}</span>
            </>
          );

          if (isSingleService) {
            return (
              <div
                key={service.id}
                className={`${styles.serviceCard} ${styles.serviceCardActive} ${styles.serviceCardFixed}`}
              >
                {cardContent}
              </div>
            );
          }

          return (
            <motion.button
              key={service.id}
              type="button"
              className={`${styles.serviceCard} ${isSelected ? styles.serviceCardActive : ''}`}
              onClick={() => onToggleService(service.name)}
              disabled={disabled}
              aria-pressed={isSelected}
              whileTap={prefersReducedMotion || disabled ? undefined : { scale: 0.99 }}
              transition={checkTransition}
            >
              {cardContent}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {errorMessage && (
          <motion.div
            key="service-step-error"
            className={styles.collapsibleBlock}
            initial={prefersReducedMotion ? false : { opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -4 }}
            transition={collapseTransition}
          >
            <div className={styles.stepInlineError} role="alert">
              <AlertCircle size={15} strokeWidth={1.85} aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export interface ExtrasStepProps {
  activeServices: ServiceItem[];
  selectedExtrasByService: Record<string, string[]>;
  selectedExtrasCount: number;
  totalExtrasPrice: number;
  disabled: boolean;
  onToggleExtra: (serviceId: string, extraId: string) => void;
}

export const ExtrasStep: React.FC<ExtrasStepProps> = ({
  activeServices,
  selectedExtrasByService,
  selectedExtrasCount,
  totalExtrasPrice,
  disabled,
  onToggleExtra,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const pillTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: SMOOTH_EASE };

  return (
    <div className={styles.stepSection}>
      <div className={styles.stepHeaderRow}>
        <div className={styles.stepHeader}>
          <h4 className={styles.stepTitle}>{BOOKING_MODAL_TEXTS.wizard.extrasStep.title}</h4>
          <p className={styles.stepSubtitle}>{BOOKING_MODAL_TEXTS.wizard.extrasStep.subtitle}</p>
        </div>

        <AnimatePresence initial={false}>
          {selectedExtrasCount > 0 && (
            <motion.span
              key="extras-summary-pill"
              className={styles.extrasSummaryPill}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9, y: -2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: -2 }}
              transition={pillTransition}
            >
              {BOOKING_MODAL_TEXTS.extras.selectedPlural(
                selectedExtrasCount,
                totalExtrasPrice.toLocaleString('es-AR')
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className={sharedStyles.serviceExtrasList}>
        {activeServices.map((service) => {
          const serviceExtras = service.extras || [];
          if (serviceExtras.length === 0) return null;

          const checkedCount = serviceExtras.filter((extra) =>
            (selectedExtrasByService[service.id] || []).includes(extra.id)
          ).length;

          return (
            <motion.div
              key={service.id}
              layout={!prefersReducedMotion}
              className={sharedStyles.serviceExtrasGroup}
              transition={pillTransition}
            >
              <div className={sharedStyles.serviceExtrasGroupHeader}>
                <span className={sharedStyles.serviceExtrasGroupTitle}>{service.name}</span>
                <span className={sharedStyles.serviceExtrasCount}>
                  {BOOKING_MODAL_TEXTS.extras.badgeCount(checkedCount)}
                </span>
              </div>

              <div className={sharedStyles.extrasCheckboxList}>
                {serviceExtras.map((extra) => {
                  const isSelected = (selectedExtrasByService[service.id] || []).includes(extra.id);
                  return (
                    <motion.label
                      key={extra.id}
                      whileTap={prefersReducedMotion || disabled ? undefined : { scale: 0.992 }}
                      transition={pillTransition}
                      className={`${sharedStyles.extraCheckboxItem} ${
                        isSelected ? sharedStyles.extraCheckboxItemActive : ''
                      }`}
                    >
                      <div className={sharedStyles.extraCheckboxLeft}>
                        <input
                          type="checkbox"
                          className={sharedStyles.extraCheckboxInput}
                          checked={isSelected}
                          onChange={() => onToggleExtra(service.id, extra.id)}
                          disabled={disabled}
                        />
                        <span className={sharedStyles.extraCheckboxName}>{extra.name}</span>
                      </div>
                      <span className={sharedStyles.extraPriceValue}>
                        +${(extra.price || 0).toLocaleString('es-AR')}
                      </span>
                    </motion.label>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export interface ClientDetailsStepProps {
  fields: BookingClientFields;
  fieldErrors: BookingFieldErrors;
  hasPrefilledContact: boolean;
  disabled: boolean;
  onFieldChange: (field: keyof BookingClientFields, value: string) => void;
  onClearPrefilled: () => void;
}

export const ClientDetailsStep: React.FC<ClientDetailsStepProps> = ({
  fields,
  fieldErrors,
  hasPrefilledContact,
  disabled,
  onFieldChange,
  onClearPrefilled,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const collapseTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: SMOOTH_EASE };

  return (
    <div className={styles.stepSection}>
      <div className={styles.stepHeader}>
        <h4 className={styles.stepTitle}>{BOOKING_MODAL_TEXTS.wizard.detailsStep.title}</h4>
        <p className={styles.stepSubtitle}>{BOOKING_MODAL_TEXTS.wizard.detailsStep.subtitle}</p>
      </div>

      <AnimatePresence initial={false}>
        {hasPrefilledContact && (
          <motion.div
            key="prefilled-banner"
            className={styles.collapsibleBlock}
            initial={prefersReducedMotion ? false : { opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -4 }}
            transition={collapseTransition}
          >
            <div className={styles.prefilledBanner}>
              <div className={styles.prefilledTextGroup}>
                <History
                  size={14}
                  strokeWidth={1.85}
                  className={styles.prefilledIcon}
                  aria-hidden="true"
                />
                <span>{BOOKING_MODAL_TEXTS.wizard.detailsStep.prefilledNotice}</span>
              </div>
              <button
                type="button"
                className={styles.prefilledClearBtn}
                onClick={onClearPrefilled}
                disabled={disabled}
              >
                {BOOKING_MODAL_TEXTS.wizard.detailsStep.clearPrefilledAction}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={sharedStyles.formFieldsGrid}>
        <Input
          label={BOOKING_MODAL_TEXTS.form.nameLabel}
          placeholder={BOOKING_MODAL_TEXTS.form.namePlaceholder}
          required
          autoComplete="name"
          value={fields.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          error={fieldErrors.name}
          maxLength={FIELD_LIMITS.booking.name.max}
          showCharCount
          leftIcon={<User size={15} strokeWidth={1.75} />}
          disabled={disabled}
        />

        <Input
          label={BOOKING_MODAL_TEXTS.form.emailLabel}
          type="email"
          placeholder={BOOKING_MODAL_TEXTS.form.emailPlaceholder}
          required
          autoComplete="email"
          value={fields.email}
          onChange={(e) => onFieldChange('email', e.target.value)}
          error={fieldErrors.email}
          maxLength={FIELD_LIMITS.booking.email.max}
          showCharCount
          leftIcon={<Mail size={15} strokeWidth={1.75} />}
          disabled={disabled}
        />

        <Input
          label={BOOKING_MODAL_TEXTS.form.phoneLabel}
          type="tel"
          phoneOnly
          placeholder={BOOKING_MODAL_TEXTS.form.phonePlaceholder}
          autoComplete="tel"
          value={fields.phone}
          onChange={(e) => onFieldChange('phone', e.target.value)}
          error={fieldErrors.phone}
          maxLength={FIELD_LIMITS.booking.phone.max}
          showCharCount
          leftIcon={<Phone size={15} strokeWidth={1.75} />}
          className={sharedStyles.fullWidthField}
          required
          disabled={disabled}
        />

        <Textarea
          label={BOOKING_MODAL_TEXTS.form.notesLabel}
          labelIcon={<FileText size={14} strokeWidth={1.75} />}
          placeholder={BOOKING_MODAL_TEXTS.form.notesPlaceholder}
          value={fields.notes}
          onChange={(e) => onFieldChange('notes', e.target.value)}
          error={fieldErrors.notes}
          maxLength={FIELD_LIMITS.booking.notes.max}
          showCharCount
          rows={3}
          className={sharedStyles.fullWidthField}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export interface SummaryPaymentStepProps {
  formattedDate: string;
  formattedTime: string;
  hourSuffix: string;
  totalEstimatedMinutes: number;
  bookedServices: BookedServiceItem[];
  hasConfiguredExtras: boolean;
  fields: BookingClientFields;
  baseServicePrice: number;
  selectedExtrasCount: number;
  totalExtrasPrice: number;
  slotSurcharge: SlotSurcharge | null;
  surchargeAmount: number;
  totalFinalEstimatedPrice: number;
  depositAmount: number;
  balanceDueAtSalon: number;
  disabled: boolean;
  onEditStep: (step: BookingWizardStepId) => void;
}

export const SummaryPaymentStep: React.FC<SummaryPaymentStepProps> = ({
  formattedDate,
  formattedTime,
  hourSuffix,
  totalEstimatedMinutes,
  bookedServices,
  hasConfiguredExtras,
  fields,
  baseServicePrice,
  selectedExtrasCount,
  totalExtrasPrice,
  slotSurcharge,
  surchargeAmount,
  totalFinalEstimatedPrice,
  depositAmount,
  balanceDueAtSalon,
  disabled,
  onEditStep,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const normalizedSurcharge = normalizeSlotSurcharge(slotSurcharge);
  const trimmedNotes = fields.notes.trim();

  return (
    <div className={styles.stepSection}>
      <div className={styles.stepHeader}>
        <h4 className={styles.stepTitle}>{BOOKING_MODAL_TEXTS.wizard.summaryStep.title}</h4>
        <p className={styles.stepSubtitle}>{BOOKING_MODAL_TEXTS.wizard.summaryStep.subtitle}</p>
      </div>

      <motion.div
        className={styles.summaryCard}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: SMOOTH_EASE }}
      >
        <div className={styles.summaryBlock}>
          <div className={styles.summaryBlockHeader}>
            <span className={styles.summaryBlockTitle}>
              {BOOKING_MODAL_TEXTS.wizard.summaryStep.turnSectionTitle}
            </span>
          </div>

          <div className={styles.summaryTurnRow}>
            <span className={styles.summaryMetaItem}>
              <Calendar size={14} strokeWidth={1.75} aria-hidden="true" />
              <span className={styles.summaryDateText}>{formattedDate}</span>
            </span>
            <span className={styles.summaryMetaItem}>
              <Clock size={14} strokeWidth={1.75} aria-hidden="true" />
              <span className={styles.tabular}>
                {formattedTime} {hourSuffix}
                {totalEstimatedMinutes > 0
                  ? ` · ${formatEstimatedDuration(totalEstimatedMinutes)}`
                  : ''}
              </span>
            </span>
          </div>

          {normalizedSurcharge && (
            <div className={styles.summarySurchargeWrap}>
              <SurchargeBadge
                surcharge={normalizedSurcharge}
                resolvedAmount={surchargeAmount}
                size="sm"
                showReason
              />
            </div>
          )}
        </div>

        <div className={styles.summaryBlock}>
          <div className={styles.summaryBlockHeader}>
            <span className={styles.summaryBlockTitle}>
              {BOOKING_MODAL_TEXTS.wizard.summaryStep.servicesSectionTitle}
            </span>
            <div className={styles.summaryEditActions}>
              <button
                type="button"
                className={styles.summaryEditBtn}
                onClick={() => onEditStep('service')}
                disabled={disabled}
              >
                <Pencil size={12} strokeWidth={1.85} aria-hidden="true" />
                <span>
                  {hasConfiguredExtras
                    ? BOOKING_MODAL_TEXTS.wizard.summaryStep.editServicesAction
                    : BOOKING_MODAL_TEXTS.wizard.summaryStep.editAction}
                </span>
              </button>
              {hasConfiguredExtras && (
                <button
                  type="button"
                  className={styles.summaryEditBtn}
                  onClick={() => onEditStep('extras')}
                  disabled={disabled}
                >
                  <span>{BOOKING_MODAL_TEXTS.wizard.summaryStep.editExtrasAction}</span>
                </button>
              )}
            </div>
          </div>

          <ul className={styles.summaryServicesList}>
            {bookedServices.map((service) => {
              const chosenExtras = service.extras.filter((ex) => ex.selected);
              const basePriceText =
                service.basePrice > 0
                  ? `$${service.basePrice.toLocaleString('es-AR')}`
                  : BOOKING_MODAL_TEXTS.wizard.serviceStep.priceToConfirm;

              return (
                <li key={service.serviceId} className={styles.summaryServiceItem}>
                  <div className={styles.summaryServiceMain}>
                    <span className={styles.summaryServiceName}>{service.name}</span>
                    <span className={styles.summaryPriceValue}>{basePriceText}</span>
                  </div>

                  {chosenExtras.length > 0 && (
                    <ul className={styles.summaryExtrasSublist}>
                      {chosenExtras.map((extra) => (
                        <li key={extra.id} className={styles.summaryExtraRow}>
                          <span>+ {extra.name}</span>
                          <span className={styles.tabular}>
                            +${(extra.price || 0).toLocaleString('es-AR')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {hasConfiguredExtras && selectedExtrasCount === 0 && (
            <p className={styles.summaryMutedHint}>
              {BOOKING_MODAL_TEXTS.wizard.summaryStep.noExtrasSelected}
            </p>
          )}
        </div>

        <div className={styles.summaryBlock}>
          <div className={styles.summaryBlockHeader}>
            <span className={styles.summaryBlockTitle}>
              {BOOKING_MODAL_TEXTS.wizard.summaryStep.clientSectionTitle}
            </span>
            <button
              type="button"
              className={styles.summaryEditBtn}
              onClick={() => onEditStep('details')}
              disabled={disabled}
            >
              <Pencil size={12} strokeWidth={1.85} aria-hidden="true" />
              <span>{BOOKING_MODAL_TEXTS.wizard.summaryStep.editAction}</span>
            </button>
          </div>

          <div className={styles.summaryClientGrid}>
            <span className={styles.summaryClientPrimary}>{fields.name.trim()}</span>
            <div className={styles.summaryClientMetaRow}>
              <span className={styles.summaryMetaItem}>
                <Mail size={13} strokeWidth={1.75} aria-hidden="true" />
                <span>{fields.email.trim()}</span>
              </span>
              <span className={styles.summaryMetaItem}>
                <Phone size={13} strokeWidth={1.75} aria-hidden="true" />
                <span className={styles.tabular}>{fields.phone.trim()}</span>
              </span>
            </div>
            {trimmedNotes && (
              <p className={styles.summaryClientNotes}>
                <strong>{BOOKING_MODAL_TEXTS.wizard.summaryStep.notesPrefix}</strong>{' '}
                {trimmedNotes}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      <PricingReceiptBox
        baseServicePrice={baseServicePrice}
        selectedExtrasCount={selectedExtrasCount}
        totalExtrasPrice={totalExtrasPrice}
        surcharge={slotSurcharge}
        surchargeAmount={surchargeAmount}
        totalFinalEstimatedPrice={totalFinalEstimatedPrice}
        depositAmount={depositAmount}
        balanceDueAtSalon={balanceDueAtSalon}
        labels={BOOKING_MODAL_TEXTS.pricing}
      />

      <motion.p
        className={sharedStyles.disclaimer}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          prefersReducedMotion ? { duration: 0 } : { duration: 0.2, delay: 0.05, ease: SMOOTH_EASE }
        }
      >
        <ShieldCheck
          size={15}
          strokeWidth={1.75}
          className={sharedStyles.disclaimerIcon}
          aria-hidden="true"
        />
        <span>
          <strong>{BOOKING_MODAL_TEXTS.disclaimer.boldText}</strong>{' '}
          {BOOKING_MODAL_TEXTS.disclaimer.text}
        </span>
      </motion.p>
    </div>
  );
};
