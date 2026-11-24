import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Plus } from 'lucide-react';
import type { ServiceItem } from '../../../types';
import { formatEstimatedDuration } from '../../../services/bookingHelper';
import styles from './SlotBookingModal.module.css';

interface ServiceSelectionSectionProps {
  relevantServices: ServiceItem[];
  selectedServiceNames: string[];
  totalEstimatedMinutes: number;
  title: string;
  disabled: boolean;
  onToggleService: (serviceName: string) => void;
}

export const ServiceSelectionSection: React.FC<ServiceSelectionSectionProps> = ({
  relevantServices,
  selectedServiceNames,
  totalEstimatedMinutes,
  title,
  disabled,
  onToggleService,
}) => (
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
            {title}
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
                onClick={() => onToggleService(service.name)}
                disabled={disabled}
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
);

interface ExtrasSelectionSectionProps {
  hasConfiguredExtras: boolean;
  hasPrecedingServices: boolean;
  activeServices: ServiceItem[];
  selectedExtrasByService: Record<string, string[]>;
  selectedExtrasCount: number;
  totalExtrasPrice: number;
  title: string;
  selectedSummaryText: (count: number, extrasTotalFormatted: string) => string;
  badgeCountText: (count: number) => string;
  disabled: boolean;
  onToggleExtra: (serviceId: string, extraId: string) => void;
}

export const ExtrasSelectionSection: React.FC<ExtrasSelectionSectionProps> = ({
  hasConfiguredExtras,
  hasPrecedingServices,
  activeServices,
  selectedExtrasByService,
  selectedExtrasCount,
  totalExtrasPrice,
  title,
  selectedSummaryText,
  badgeCountText,
  disabled,
  onToggleExtra,
}) => (
  <AnimatePresence initial={false}>
    {hasConfiguredExtras && (
      <motion.div
        className={`${styles.formSection} ${hasPrecedingServices ? styles.sectionDivided : ''}`}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>{title}</span>
          {selectedExtrasCount > 0 && (
            <span className={styles.extrasSummaryTag}>
              {selectedSummaryText(selectedExtrasCount, totalExtrasPrice.toLocaleString('es-AR'))}
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
                  <span className={styles.serviceExtrasCount}>{badgeCountText(checkedCount)}</span>
                </div>

                <div className={styles.extrasCheckboxList}>
                  {serviceExtras.map((extra) => {
                    const isSelected = (selectedExtrasByService[service.id] || []).includes(
                      extra.id
                    );
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
                            onChange={() => onToggleExtra(service.id, extra.id)}
                            disabled={disabled}
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
);

interface PricingReceiptBoxProps {
  baseServicePrice: number;
  selectedExtrasCount: number;
  totalExtrasPrice: number;
  totalFinalEstimatedPrice: number;
  depositAmount: number;
  balanceDueAtSalon: number;
  labels: {
    basePriceLabel: string;
    extrasLabel: (count: number) => string;
    totalEstimatedLabel: string;
    depositLabel: string;
    balanceDueLabel: string;
  };
}

export const PricingReceiptBox: React.FC<PricingReceiptBoxProps> = ({
  baseServicePrice,
  selectedExtrasCount,
  totalExtrasPrice,
  totalFinalEstimatedPrice,
  depositAmount,
  balanceDueAtSalon,
  labels,
}) => (
  <AnimatePresence initial={false}>
    {(totalFinalEstimatedPrice > 0 || depositAmount > 0) && (
      <motion.div
        className={styles.receiptBox}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
      >
        {baseServicePrice > 0 && (
          <div className={styles.receiptRow}>
            <span className={styles.receiptLabel}>{labels.basePriceLabel}</span>
            <span className={styles.receiptValue}>
              ${baseServicePrice.toLocaleString('es-AR')}
            </span>
          </div>
        )}

        {selectedExtrasCount > 0 && (
          <div className={styles.receiptRow}>
            <span className={styles.receiptLabel}>{labels.extrasLabel(selectedExtrasCount)}</span>
            <span className={styles.receiptValue}>
              +${totalExtrasPrice.toLocaleString('es-AR')}
            </span>
          </div>
        )}

        {totalFinalEstimatedPrice > 0 && (
          <div className={`${styles.receiptRow} ${styles.receiptTotalRow}`}>
            <span className={styles.receiptTotalLabel}>{labels.totalEstimatedLabel}</span>
            <span className={styles.receiptTotalValue}>
              ${totalFinalEstimatedPrice.toLocaleString('es-AR')}
            </span>
          </div>
        )}

        <div className={`${styles.receiptRow} ${styles.receiptDepositRow}`}>
          <span className={styles.receiptDepositLabel}>{labels.depositLabel}</span>
          <span className={styles.receiptDepositValue}>
            ${depositAmount.toLocaleString('es-AR')}
          </span>
        </div>

        {balanceDueAtSalon > 0 && (
          <div className={styles.receiptRow}>
            <span className={styles.receiptLabel}>{labels.balanceDueLabel}</span>
            <span className={styles.receiptBalanceValue}>
              ${balanceDueAtSalon.toLocaleString('es-AR')}
            </span>
          </div>
        )}
      </motion.div>
    )}
  </AnimatePresence>
);
