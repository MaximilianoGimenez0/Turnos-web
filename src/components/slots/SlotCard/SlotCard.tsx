import React, { useMemo, useState } from 'react';
import {
  Trash2,
  Ban,
  RotateCcw,
  UserCheck,
  Mail,
  Phone,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Lock,
  Clock,
} from 'lucide-react';
import type { Slot, ServiceItem } from '../../../types';
import Button from '../../common/Button/Button';
import {
  findPendingConflictForSlot,
  getPendingLockRemainingMinutes,
} from '../../../services/schedulingService';
import {
  formatSlotEndTime,
  resolveSlotDuration,
  resolveSlotFinancials,
} from '../../../services/bookingHelper';
import {
  BUSINESS_TIMEZONE,
  formatBusinessDateKey,
  formatBusinessTime,
  formatDateKeyParts,
} from '../../../utils/dateUtils';
import { useOptionalTenant } from '../../../context/TenantContext';
import {
  calculateSurchargeAmount,
  formatSurchargeDetail,
  formatSurchargeValue,
  resolveBookingSurcharge,
} from '../../../utils/surcharge';
import SurchargeBadge from '../../common/SurchargeBadge';
import { SLOT_CARD_TEXTS } from '../../../texts';
import styles from './SlotCard.module.css';

export interface SlotCardProps {
  slot: Slot;
  allSlots?: Slot[];
  onBook?: (slot: Slot) => void;
  isAdmin?: boolean;
  onCancel?: (slotId: string) => void;
  onRelease?: (slotId: string) => void;
  onDelete?: (slotId: string) => void;
  onAssign?: (slot: Slot) => void;
  hideDatePill?: boolean;
  compact?: boolean;
  searchQuery?: string;
  nowMs?: number;
}

const MAX_VISIBLE_SERVICE_BADGES = 3;

export const SlotCard: React.FC<SlotCardProps> = React.memo(({
  slot,
  allSlots,
  onBook,
  isAdmin = false,
  onCancel,
  onRelease,
  onDelete,
  onAssign,
  hideDatePill = false,
  compact = false,
  searchQuery,
  nowMs,
}) => {
  const tenant = useOptionalTenant();
  const timezone = tenant?.timezone || BUSINESS_TIMEZONE;
  const [isExtrasOpen, setIsExtrasOpen] = useState(false);
  const [isDossierExpanded, setIsDossierExpanded] = useState(false);
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);
  const [fallbackNowMs] = useState<number>(() => Date.now());
  const effectiveNowMs = nowMs ?? fallbackNowMs;

  const hasSearchMatchInDetails = useMemo(() => {
    if (!searchQuery) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return false;
    const emailMatch = slot.clientData?.email?.toLowerCase().includes(q);
    const mpMatch = slot.paymentId?.toLowerCase().includes(q);
    const extrasMatch =
      (slot.clientData?.bookedServices || []).some((bs) =>
        bs.extras?.some((e) => e.name.toLowerCase().includes(q))
      ) ||
      (slot.clientData?.selectedExtras || []).some((e) =>
        e.name.toLowerCase().includes(q)
      );
    return Boolean(emailMatch || mpMatch || extrasMatch);
  }, [searchQuery, slot.clientData, slot.paymentId]);

  const effectiveDossierExpanded = isDossierExpanded || hasSearchMatchInDetails;

  const { formattedWeekday, formattedDateFull, formattedTime } = useMemo(() => {
    const dateKey = formatBusinessDateKey(slot.datetime, timezone);
    if (!dateKey) {
      return {
        formattedWeekday: '',
        formattedDateFull: slot.datetime,
        formattedTime: '',
      };
    }

    const parts = formatDateKeyParts(dateKey);
    return {
      formattedWeekday: parts.weekdayShort,
      formattedDateFull: parts.dayMonthShort,
      formattedTime: formatBusinessTime(slot.datetime, timezone),
    };
  }, [slot.datetime, timezone]);

  const pendingConflictSlot = useMemo(() => {
    if (!isAdmin || slot.status !== 'available' || !allSlots || allSlots.length === 0) {
      return null;
    }
    return findPendingConflictForSlot(slot, allSlots, effectiveNowMs);
  }, [isAdmin, slot, allSlots, effectiveNowMs]);

  const paymentLockNotice = useMemo(() => {
    if (!isAdmin) return null;

    if (slot.status === 'pending_payment') {
      const remaining = getPendingLockRemainingMinutes(slot.expiresAt, effectiveNowMs);
      if (remaining === 0) {
        return {
          fullText: SLOT_CARD_TEXTS.notices.pendingPaymentExpired,
          compactText: SLOT_CARD_TEXTS.notices.compactExpired,
        };
      }
      const mins = remaining ?? 15;
      return {
        fullText: SLOT_CARD_TEXTS.notices.pendingPaymentActive(mins),
        compactText: SLOT_CARD_TEXTS.notices.compactPendingCancel(mins),
      };
    }

    if (pendingConflictSlot) {
      const remaining = getPendingLockRemainingMinutes(
        pendingConflictSlot.expiresAt,
        effectiveNowMs
      );
      if (remaining === 0) {
        return {
          fullText: SLOT_CARD_TEXTS.notices.pendingConflictExpired,
          compactText: SLOT_CARD_TEXTS.notices.compactExpired,
        };
      }
      const mins = remaining ?? 15;
      return {
        fullText: SLOT_CARD_TEXTS.notices.pendingConflictActive(mins),
        compactText: SLOT_CARD_TEXTS.notices.compactConflictRelease(mins),
      };
    }

    return null;
  }, [isAdmin, slot.status, slot.expiresAt, pendingConflictSlot, effectiveNowMs]);

  const status = useMemo(() => {
    if (pendingConflictSlot) {
      return {
        label: SLOT_CARD_TEXTS.statuses.pendingConflict,
        pillClass: styles.statusWarning,
        isUrgent: true,
      };
    }

    switch (slot.status) {
      case 'available':
        return {
          label: SLOT_CARD_TEXTS.statuses.available,
          pillClass: styles.statusAvailable,
          isUrgent: false,
        };
      case 'pending_payment':
        return {
          label: SLOT_CARD_TEXTS.statuses.pendingPayment,
          pillClass: styles.statusWarning,
          isUrgent: true,
        };
      case 'confirmed':
        return {
          label: SLOT_CARD_TEXTS.statuses.confirmed,
          pillClass: styles.statusConfirmed,
          isUrgent: false,
        };
      case 'cancelled':
        return {
          label: SLOT_CARD_TEXTS.statuses.cancelled,
          pillClass: styles.statusCancelled,
          isUrgent: false,
        };
      case 'conflict':
        return {
          label: SLOT_CARD_TEXTS.statuses.conflict,
          pillClass: styles.statusWarning,
          isUrgent: false,
        };
      case 'past':
        if (slot.pastOutcome === 'cancelled') {
          return {
            label: SLOT_CARD_TEXTS.statuses.pastCancelled,
            pillClass: styles.statusCancelled,
            isUrgent: false,
          };
        }
        return {
          label: SLOT_CARD_TEXTS.statuses.pastConcluded,
          pillClass: styles.statusPast,
          isUrgent: false,
        };
      default:
        return {
          label: SLOT_CARD_TEXTS.statuses.unknown,
          pillClass: styles.statusPast,
          isUrgent: false,
        };
    }
  }, [slot.status, slot.pastOutcome, pendingConflictSlot]);

  const {
    servicesList,
    groupedExtras,
    totalExtrasCount,
    hasServices,
    hasExtras,
    hasBookedExtras,
  } = useMemo(() => {
    const rawServices: (ServiceItem | string)[] =
      (slot.clientData?.selectedServices && slot.clientData.selectedServices.length > 0
        ? slot.clientData.selectedServices
        : null) ||
      (slot.clientData?.selectedRules && slot.clientData.selectedRules.length > 0
        ? slot.clientData.selectedRules
        : null) ||
      (slot.services && slot.services.length > 0 ? slot.services : null) ||
      (slot.rules && slot.rules.length > 0 ? slot.rules : null) ||
      [];

    const servicesNames: string[] = rawServices.map((item) =>
      typeof item === 'string' ? item : item.name
    );

    const bookedWithExtras: Array<{
      serviceName: string;
      extras: Array<{
        id: string;
        name: string;
        price?: number;
      }>;
    }> = (slot.clientData?.bookedServices || [])
      .map((bs) => ({
        serviceName: bs.name,
        extras: (bs.extras || [])
          .filter((e) => e.selected)
          .map((e) => ({
            id: e.id,
            name: e.name,
            price: e.price,
          })),
      }))
      .filter((g) => g.extras.length > 0);

    const flatSelectedExtras = (slot.clientData?.selectedExtras || []).map((e) => ({
      id: e.id,
      name: e.name,
      price: e.price,
    }));

    const hasBooked = bookedWithExtras.length > 0 || flatSelectedExtras.length > 0;

    const availableGroups: Array<{
      serviceName: string;
      extras: Array<{
        id: string;
        name: string;
        price?: number;
      }>;
    }> = [];

    if (!hasBooked && slot.status === 'available' && slot.services && slot.services.length > 0) {
      slot.services.forEach((s) => {
        if (typeof s !== 'string' && Array.isArray(s.extras) && s.extras.length > 0) {
          availableGroups.push({
            serviceName: s.name,
            extras: s.extras.map((ex) => ({
              id: ex.id,
              name: ex.name,
              price: ex.price,
            })),
          });
        }
      });
    }

    let finalGroups: Array<{
      serviceName: string;
      extras: Array<{
        id: string;
        name: string;
        price?: number;
      }>;
    }> = [];

    if (hasBooked) {
      if (bookedWithExtras.length > 0) {
        finalGroups = bookedWithExtras;
      } else if (flatSelectedExtras.length > 0) {
        finalGroups = [
          {
            serviceName: slot.serviceName || SLOT_CARD_TEXTS.defaultServiceName,
            extras: flatSelectedExtras,
          },
        ];
      }
    } else {
      finalGroups = availableGroups;
    }

    const totalCount = finalGroups.reduce((acc, g) => acc + g.extras.length, 0);

    return {
      servicesList: servicesNames,
      groupedExtras: finalGroups,
      totalExtrasCount: totalCount,
      hasServices: servicesNames.length > 0,
      hasExtras: totalCount > 0,
      hasBookedExtras: hasBooked,
    };
  }, [slot.clientData, slot.services, slot.rules, slot.serviceName, slot.status]);

  const hasSearchMatchInHiddenServices = useMemo(() => {
    if (!searchQuery || servicesList.length <= MAX_VISIBLE_SERVICE_BADGES) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return false;
    return servicesList
      .slice(MAX_VISIBLE_SERVICE_BADGES)
      .some((name) => name.toLowerCase().includes(q));
  }, [searchQuery, servicesList]);

  const effectiveServicesExpanded = isServicesExpanded || hasSearchMatchInHiddenServices;
  const hiddenServicesCount = Math.max(0, servicesList.length - MAX_VISIBLE_SERVICE_BADGES);
  const visibleServices = effectiveServicesExpanded
    ? servicesList
    : servicesList.slice(0, MAX_VISIBLE_SERVICE_BADGES);

  const clientInitials = useMemo(() => {
    if (!slot.clientData?.name) return SLOT_CARD_TEXTS.fallbackClientInitials;
    return (
      slot.clientData.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('') || SLOT_CARD_TEXTS.fallbackClientInitials
    );
  }, [slot.clientData?.name]);

  const customTitle = slot.serviceName?.trim() || '';
  const serviceTitle =
    customTitle || (servicesList.length === 1 ? servicesList[0] : '');
  const ariaTitle =
    serviceTitle ||
    (servicesList.length > 1 ? servicesList.join(', ') : SLOT_CARD_TEXTS.defaultServiceName);
  const showServiceBadges =
    hasServices &&
    !(
      servicesList.length === 1 &&
      servicesList[0].trim().toLowerCase() === serviceTitle.trim().toLowerCase()
    );

  const financials = useMemo(() => resolveSlotFinancials(slot), [slot]);
  const surchargeInfo = useMemo(
    () =>
      resolveBookingSurcharge({
        clientData: slot.clientData,
        slotSurcharge: slot.surcharge,
      }),
    [slot.clientData, slot.surcharge]
  );
  const singleServiceBasePrice = useMemo(() => {
    if (!Array.isArray(slot.services) || slot.services.length !== 1) return 0;
    const only = slot.services[0];
    if (typeof only === 'object' && only !== null && typeof only.basePrice === 'number') {
      return only.basePrice > 0 ? only.basePrice : 0;
    }
    return 0;
  }, [slot.services]);
  const clientPercentagePreviewAmount = useMemo(() => {
    if (
      !surchargeInfo.surcharge ||
      surchargeInfo.surcharge.type !== 'percentage' ||
      singleServiceBasePrice <= 0
    ) {
      return 0;
    }
    return calculateSurchargeAmount(singleServiceBasePrice, surchargeInfo.surcharge);
  }, [surchargeInfo.surcharge, singleServiceBasePrice]);
  const estimatedPrice = financials.estimatedTotal;
  const hasEstimatedPrice = estimatedPrice !== null;
  const salonBalance = financials.pendingBalance;
  const isAdminConfirmed = isAdmin && slot.status === 'confirmed';

  const dateDisplay = `${formattedWeekday} ${formattedDateFull}`.trim();

  const { durationLabel, endTime } = useMemo(() => {
    if (!isAdmin || slot.status !== 'confirmed') {
      return { durationLabel: null as string | null, endTime: null as string | null };
    }
    const resolved = resolveSlotDuration(slot);
    return {
      durationLabel: resolved.label,
      endTime: formatSlotEndTime(slot.datetime, resolved.minutes, timezone),
    };
  }, [isAdmin, slot, timezone]);

  const durationRangeTooltip =
    endTime && formattedTime ? SLOT_CARD_TEXTS.duration.range(formattedTime, endTime) : undefined;

  const renderBookedAndPaymentDetails = () => {
    if (!slot.clientData) return null;
    return (
      <>
        {slot.clientData.bookedServices && slot.clientData.bookedServices.length > 0 ? (
          <div className={styles.bookedDetailsList}>
            <span className={styles.dossierSubLabel}>
              {SLOT_CARD_TEXTS.sections.bookedDetail}
            </span>
            {slot.clientData.bookedServices.map((bs) => {
              const checkedExtras = (bs.extras || []).filter((e) => e.selected);
              return (
                <div key={bs.serviceId} className={styles.bookedDetailRow}>
                  <span className={styles.bookedServiceName}>{bs.name}:</span>{' '}
                  {checkedExtras.length > 0 ? (
                    <span className={styles.bookedExtras}>
                      {checkedExtras
                        .map((e) => `${e.name} (+$${(e.price || 0).toLocaleString('es-AR')})`)
                        .join(', ')}
                    </span>
                  ) : (
                    <span className={styles.bookedNoExtras}>
                      {SLOT_CARD_TEXTS.tags.bookedNoExtras}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : slot.clientData.selectedExtras && slot.clientData.selectedExtras.length > 0 ? (
          <div className={styles.bookedDetailsList}>
            <span className={styles.dossierSubLabel}>
              {SLOT_CARD_TEXTS.sections.bookedDetail}
            </span>
            <div className={styles.bookedDetailRow}>
              <span className={styles.bookedExtras}>
                {SLOT_CARD_TEXTS.tags.extrasPrefix}{' '}
                {slot.clientData.selectedExtras
                  .map((e) => `${e.name} (+$${(e.price || 0).toLocaleString('es-AR')})`)
                  .join(', ')}
              </span>
            </div>
          </div>
        ) : null}

        {isAdmin && slot.status === 'confirmed' && durationLabel && (
          <div className={styles.dossierMetaRow}>
            <span className={styles.dossierMetaKey}>
              {SLOT_CARD_TEXTS.adminDossier.durationLabel}
            </span>
            <span className={styles.dossierDurationValue}>
              {durationRangeTooltip ? `${durationLabel} (${durationRangeTooltip})` : durationLabel}
            </span>
          </div>
        )}

        {!isAdminConfirmed && salonBalance !== null && salonBalance > 0 && (
          <div className={styles.dossierMetaRow}>
            <span className={styles.dossierMetaKey}>
              {SLOT_CARD_TEXTS.adminDossier.salonBalanceLabel}
            </span>
            <span className={styles.dossierBalanceValue}>
              ${salonBalance.toLocaleString('es-AR')}
            </span>
          </div>
        )}

        {surchargeInfo.surcharge && (
          <div className={styles.dossierMetaRow}>
            <span className={styles.dossierMetaKey}>
              {SLOT_CARD_TEXTS.surcharge.adminDossierLabel}
            </span>
            <span className={styles.dossierSurchargeValue}>
              {formatSurchargeValue(surchargeInfo.surcharge)}
              {surchargeInfo.surcharge.type === 'percentage' && surchargeInfo.surchargeAmount > 0
                ? ` (+$${surchargeInfo.surchargeAmount.toLocaleString('es-AR')})`
                : ''}
              {surchargeInfo.surcharge.reason ? ` · ${surchargeInfo.surcharge.reason}` : ''}
            </span>
          </div>
        )}

        {slot.paymentId && (
          <div className={styles.dossierMetaRow}>
            <span className={styles.dossierMetaKey}>
              {SLOT_CARD_TEXTS.adminDossier.mpLabel}
            </span>
            <span className={styles.mpId}>#{slot.paymentId}</span>
          </div>
        )}
      </>
    );
  };

  const renderDeleteButton = (title: string, ariaLabel: string) => (
    <button
      type="button"
      className={styles.deleteIconBtn}
      onClick={() => onDelete && onDelete(slot.id)}
      title={title}
      aria-label={ariaLabel}
    >
      <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );

  const renderAdminButtons = () => (
    <div className={styles.adminButtonsGroup}>
      {slot.status === 'confirmed' && (
        <Button
          variant="danger"
          size="sm"
          fullWidth
          onClick={() => onCancel && onCancel(slot.id)}
          leftIcon={<Ban size={14} strokeWidth={1.75} aria-hidden="true" />}
          title={SLOT_CARD_TEXTS.adminButtons.cancelSlotTitle}
        >
          {SLOT_CARD_TEXTS.adminButtons.cancelSlot}
        </Button>
      )}

      {slot.status === 'available' && (
        <>
          {pendingConflictSlot ? (
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              disabled
              leftIcon={<Lock size={14} strokeWidth={1.75} aria-hidden="true" />}
              title={SLOT_CARD_TEXTS.adminButtons.blockedByPendingTitle}
            >
              {SLOT_CARD_TEXTS.adminButtons.takeSlotBlocked}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => onAssign && onAssign(slot)}
              leftIcon={<UserCheck size={14} strokeWidth={1.75} aria-hidden="true" />}
              title={SLOT_CARD_TEXTS.adminButtons.takeSlotTitle}
            >
              {SLOT_CARD_TEXTS.adminButtons.takeSlot}
            </Button>
          )}

          {renderDeleteButton(
            SLOT_CARD_TEXTS.adminButtons.deleteUnassignedTitle,
            SLOT_CARD_TEXTS.adminButtons.deleteSlotAriaLabel
          )}
        </>
      )}

      {slot.status === 'pending_payment' && (
        <>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => onRelease && onRelease(slot.id)}
            leftIcon={<RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />}
            title={SLOT_CARD_TEXTS.adminButtons.releasePendingTitle}
          >
            {SLOT_CARD_TEXTS.adminButtons.releaseSlot}
          </Button>

          {renderDeleteButton(
            SLOT_CARD_TEXTS.adminButtons.deletePendingTitle,
            SLOT_CARD_TEXTS.adminButtons.deleteSlotAriaLabel
          )}
        </>
      )}

      {slot.status === 'cancelled' && (
        <>
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={() => onAssign && onAssign(slot)}
            leftIcon={<UserCheck size={14} strokeWidth={1.75} aria-hidden="true" />}
            title={SLOT_CARD_TEXTS.adminButtons.reassignSlotTitle}
          >
            {SLOT_CARD_TEXTS.adminButtons.reassignSlot}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => onRelease && onRelease(slot.id)}
            leftIcon={<RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />}
            title={SLOT_CARD_TEXTS.adminButtons.releaseConflictTitle}
          >
            {SLOT_CARD_TEXTS.adminButtons.releaseSlot}
          </Button>

          {renderDeleteButton(
            SLOT_CARD_TEXTS.adminButtons.deleteCancelledTitle,
            SLOT_CARD_TEXTS.adminButtons.deleteCancelledAriaLabel
          )}
        </>
      )}

      {slot.status === 'conflict' && (
        <Button
          variant="danger"
          size="sm"
          fullWidth
          onClick={() => onDelete && onDelete(slot.id)}
          leftIcon={<Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />}
          title={SLOT_CARD_TEXTS.adminButtons.deleteConflictTitle}
        >
          {SLOT_CARD_TEXTS.adminButtons.deleteConflict}
        </Button>
      )}

      {slot.status === 'past' && (
        <Button
          variant="outline"
          size="sm"
          fullWidth
          onClick={() => onDelete && onDelete(slot.id)}
          leftIcon={<Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />}
          title={SLOT_CARD_TEXTS.adminButtons.deleteHistoryTitle}
        >
          {SLOT_CARD_TEXTS.adminButtons.deleteHistory}
        </Button>
      )}
    </div>
  );

  if (isAdmin && compact) {
    const displayPrice = hasEstimatedPrice ? estimatedPrice! : slot.depositAmount;
    const entityLabel =
      slot.clientData?.name ||
      slot.clientData?.selectedService ||
      serviceTitle ||
      (servicesList.length > 0 ? servicesList.join(' · ') : SLOT_CARD_TEXTS.defaultServiceName);
    const showCompactMetaRow = Boolean(durationLabel) || Boolean(surchargeInfo.surcharge);
    const surchargeAriaSuffix = surchargeInfo.surcharge
      ? SLOT_CARD_TEXTS.surcharge.ariaFragment(
        formatSurchargeValue(surchargeInfo.surcharge),
        surchargeInfo.surcharge.reason
      )
      : '';
    const compactAriaLabel = durationLabel
      ? `${entityLabel} - ${dateDisplay} ${formattedTime} (${durationLabel})${surchargeAriaSuffix}`
      : `${entityLabel} - ${dateDisplay} ${formattedTime}${surchargeAriaSuffix}`;

    return (
      <article
        className={`${styles.slotCard} ${styles.cardCompact} ${status.isUrgent ? styles.cardUrgent : ''}`}
        aria-label={compactAriaLabel}
      >
        <div className={styles.compactHeader}>
          <div className={styles.compactTimeMeta}>
            <span className={styles.compactTime}>
              {formattedTime}
              <span className={styles.compactTimeSuffix}> {SLOT_CARD_TEXTS.timeSuffix}</span>
            </span>
            {!showCompactMetaRow && !hideDatePill && dateDisplay && (
              <span className={styles.compactDate}>{dateDisplay}</span>
            )}
          </div>

          <span className={`${styles.statusPill} ${status.pillClass}`}>
            <span className={styles.statusDot} aria-hidden="true" />
            <span className={styles.statusLabel}>{status.label}</span>
          </span>
        </div>

        {showCompactMetaRow && (
          <div className={styles.compactMetaRow}>
            {!hideDatePill && dateDisplay && (
              <span className={styles.compactDate}>{dateDisplay}</span>
            )}
            {durationLabel && (
              <span
                className={styles.compactDurationBadge}
                title={durationRangeTooltip}
              >
                <Clock size={11} strokeWidth={1.75} aria-hidden="true" />
                <span>{durationLabel}</span>
              </span>
            )}
            {surchargeInfo.surcharge && (
              <SurchargeBadge
                surcharge={surchargeInfo.surcharge}
                resolvedAmount={surchargeInfo.surchargeAmount}
                size="xs"
              />
            )}
          </div>
        )}

        {paymentLockNotice && (
          <div className={styles.compactLockNotice} title={paymentLockNotice.fullText}>
            <Clock size={11} strokeWidth={1.75} aria-hidden="true" />
            <span>{paymentLockNotice.compactText}</span>
          </div>
        )}

        <div className={styles.compactEntityRow}>
          <span
            className={slot.clientData ? styles.compactEntityName : styles.compactEntityService}
            title={entityLabel}
          >
            {entityLabel}
          </span>
          {isAdminConfirmed && financials.state === 'pending_balance' && financials.pendingBalance !== null && financials.estimatedTotal !== null ? (
            <span
              className={styles.compactPendingBadge}
              title={SLOT_CARD_TEXTS.compactFinancials.pendingTooltip(
                financials.pendingBalance.toLocaleString('es-AR'),
                financials.estimatedTotal.toLocaleString('es-AR'),
                financials.paidDeposit.toLocaleString('es-AR')
              )}
            >
              <span className={styles.compactPendingPrefix}>
                {SLOT_CARD_TEXTS.compactFinancials.pendingPrefix}
              </span>
              <span>${financials.pendingBalance.toLocaleString('es-AR')}</span>
            </span>
          ) : isAdminConfirmed && financials.state === 'paid_in_full' && financials.estimatedTotal !== null ? (
            <span
              className={styles.compactSettledBadge}
              title={SLOT_CARD_TEXTS.compactFinancials.settledTooltip(
                financials.estimatedTotal.toLocaleString('es-AR'),
                financials.paidDeposit.toLocaleString('es-AR')
              )}
            >
              {SLOT_CARD_TEXTS.paidInFullLabel}
            </span>
          ) : (
            <span
              className={styles.compactPrice}
              title={
                isAdminConfirmed
                  ? SLOT_CARD_TEXTS.compactFinancials.depositOnlyTooltip(
                    financials.paidDeposit.toLocaleString('es-AR')
                  )
                  : undefined
              }
            >
              ${displayPrice.toLocaleString('es-AR')}
            </span>
          )}
        </div>

        <div className={styles.compactFooter}>
          {renderAdminButtons()}
        </div>
      </article>
    );
  }

  const surchargeAriaSuffix = surchargeInfo.surcharge
    ? SLOT_CARD_TEXTS.surcharge.ariaFragment(
      formatSurchargeValue(surchargeInfo.surcharge),
      surchargeInfo.surcharge.reason
    )
    : '';
  const fullAriaLabel = durationLabel
    ? `${ariaTitle} - ${dateDisplay} ${formattedTime} (${durationLabel})${surchargeAriaSuffix}`
    : `${ariaTitle} - ${dateDisplay} ${formattedTime}${surchargeAriaSuffix}`;

  return (
    <article
      className={`${styles.slotCard} ${!isAdmin ? styles.cardClient : ''} ${isAdmin && status.isUrgent ? styles.cardUrgent : ''}`}
      aria-label={fullAriaLabel}
    >
      <div className={styles.cardHeader}>
        <div className={styles.timeMetaGroup}>
          <div className={styles.timeCluster}>
            <span className={styles.heroTime}>{formattedTime}</span>
            <span className={styles.timeSuffix}>{SLOT_CARD_TEXTS.timeSuffix}</span>
          </div>
          {!hideDatePill && dateDisplay && (
            <span className={styles.inlineDate}>{dateDisplay}</span>
          )}
          {durationLabel && (
            <div className={styles.durationMetaRow}>
              <span className={styles.durationBadge}>
                <Clock size={12} strokeWidth={1.75} aria-hidden="true" />
                <span>{durationLabel}</span>
              </span>
              {endTime && (
                <span className={styles.durationEndTime}>
                  · {SLOT_CARD_TEXTS.duration.until(endTime)}
                </span>
              )}
            </div>
          )}
          {isAdmin && surchargeInfo.surcharge && (
            <div className={styles.surchargeMetaRow}>
              <SurchargeBadge
                surcharge={surchargeInfo.surcharge}
                resolvedAmount={surchargeInfo.surchargeAmount}
                size="sm"
              />
            </div>
          )}
        </div>

        {!isAdmin && surchargeInfo.surcharge && (
          <SurchargeBadge surcharge={surchargeInfo.surcharge} size="sm" />
        )}

        {isAdmin && (
          <span className={`${styles.statusPill} ${status.pillClass}`}>
            <span className={styles.statusDot} aria-hidden="true" />
            <span className={styles.statusLabel}>{status.label}</span>
          </span>
        )}
      </div>

      <div className={styles.contentBody}>
        {serviceTitle && <h4 className={styles.serviceTitle}>{serviceTitle}</h4>}

        {!isAdmin && surchargeInfo.surcharge && (
          <span className={styles.surchargeReasonNote}>
            {SLOT_CARD_TEXTS.surcharge.clientReasonLabel(surchargeInfo.surcharge.reason)}
          </span>
        )}

        {paymentLockNotice && (
          <div className={styles.conflictNoticeBanner} role="status">
            <Clock size={15} strokeWidth={1.75} className={styles.conflictNoticeIcon} aria-hidden="true" />
            <span>{paymentLockNotice.fullText}</span>
          </div>
        )}

        {showServiceBadges && (
          <div className={styles.badgeList} aria-label={SLOT_CARD_TEXTS.sections.services}>
            {visibleServices.map((name, idx) => (
              <span key={idx} className={styles.serviceBadge}>
                {name}
              </span>
            ))}
            {hiddenServicesCount > 0 && (
              <button
                type="button"
                className={styles.serviceToggleBtn}
                onClick={() => setIsServicesExpanded((prev) => !prev)}
                aria-expanded={effectiveServicesExpanded}
              >
                {effectiveServicesExpanded
                  ? SLOT_CARD_TEXTS.tags.lessServices
                  : SLOT_CARD_TEXTS.tags.moreServices(hiddenServicesCount)}
              </button>
            )}
          </div>
        )}

        {hasExtras && (
          <div className={styles.extrasBlock}>
            <button
              type="button"
              className={styles.extrasTrigger}
              onClick={() => setIsExtrasOpen((prev) => !prev)}
              aria-expanded={isExtrasOpen}
              aria-label={`${hasBookedExtras
                ? SLOT_CARD_TEXTS.sections.extras
                : SLOT_CARD_TEXTS.sections.availableExtras
                } (${totalExtrasCount})`}
            >
              <span className={styles.extrasTriggerText}>
                <span>
                  {hasBookedExtras
                    ? SLOT_CARD_TEXTS.sections.extras
                    : SLOT_CARD_TEXTS.sections.availableExtras}
                </span>
                <span className={styles.extrasCount}>· {totalExtrasCount}</span>
              </span>
              <span className={styles.disclosureChevron} aria-hidden="true">
                {isExtrasOpen ? <ChevronUp size={15} strokeWidth={1.75} /> : <ChevronDown size={15} strokeWidth={1.75} />}
              </span>
            </button>

            {isExtrasOpen && (
              <div className={styles.extrasList}>
                {groupedExtras.map((group) => {
                  const showGroupTitle =
                    groupedExtras.length > 1 ||
                    group.serviceName.trim().toLowerCase() !== serviceTitle.trim().toLowerCase();
                  return (
                    <div key={group.serviceName} className={styles.extraGroup}>
                      {showGroupTitle && (
                        <span className={styles.extraGroupTitle}>{group.serviceName}</span>
                      )}
                      <ul className={styles.extraItemsList}>
                        {group.extras.map((extra) => (
                          <li key={extra.id} className={styles.extraItemRow}>
                            <span className={styles.extraItemName}>{extra.name}</span>
                            {extra.price && extra.price > 0 ? (
                              <span
                                className={
                                  hasBookedExtras ? styles.extraItemPriceSelected : styles.extraItemPrice
                                }
                              >
                                +${extra.price.toLocaleString('es-AR')}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isAdmin && slot.clientData && (
          <div className={styles.adminDossier}>
            <div className={styles.dossierTopRow}>
              <div className={styles.clientIdentityWrap}>
                <span className={styles.clientMonogram} aria-hidden="true">
                  {clientInitials}
                </span>
                <div className={styles.clientIdentityText}>
                  <span className={styles.clientName} title={slot.clientData.name}>
                    {slot.clientData.name}
                  </span>
                  {slot.clientData.phone && !effectiveDossierExpanded && (
                    <span className={styles.clientSubMeta}>{slot.clientData.phone}</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                className={styles.dossierToggleBtn}
                onClick={() => setIsDossierExpanded((prev) => !prev)}
                aria-expanded={effectiveDossierExpanded}
              >
                <span>
                  {effectiveDossierExpanded
                    ? SLOT_CARD_TEXTS.adminDossier.hideDetails
                    : SLOT_CARD_TEXTS.adminDossier.showDetails}
                </span>
                {effectiveDossierExpanded ? (
                  <ChevronUp size={14} strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
                )}
              </button>
            </div>

            {effectiveDossierExpanded && (
              <div className={styles.dossierDetails}>
                {(slot.clientData.email || slot.clientData.phone) && (
                  <div className={styles.clientContactList}>
                    {slot.clientData.email && (
                      <div className={styles.contactItem}>
                        <Mail size={13} strokeWidth={1.75} className={styles.contactIcon} aria-hidden="true" />
                        <span className={styles.contactText}>{slot.clientData.email}</span>
                      </div>
                    )}
                    {slot.clientData.phone && (
                      <div className={styles.contactItem}>
                        <Phone size={13} strokeWidth={1.75} className={styles.contactIcon} aria-hidden="true" />
                        <span className={styles.contactText}>{slot.clientData.phone}</span>
                      </div>
                    )}
                  </div>
                )}

                {renderBookedAndPaymentDetails()}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.footerSection}>
        <div className={styles.financialBlock}>
          {isAdminConfirmed ? (
            <>
              {financials.surchargeAmount !== undefined && financials.surchargeAmount > 0 && (
                <div
                  className={styles.surchargeFinanceRow}
                  title={
                    surchargeInfo.surcharge
                      ? formatSurchargeDetail(surchargeInfo.surcharge, financials.surchargeAmount)
                      : undefined
                  }
                >
                  <span className={styles.surchargeFinanceLabel}>
                    {SLOT_CARD_TEXTS.surcharge.adminAppliedLabel}
                  </span>
                  <span className={styles.surchargeFinanceValue}>
                    +${financials.surchargeAmount.toLocaleString('es-AR')}
                  </span>
                </div>
              )}

              {financials.estimatedTotal !== null && (
                <div className={styles.estimateRow}>
                  <span className={styles.estimateLabel}>{SLOT_CARD_TEXTS.sections.priceEstimate}</span>
                  <span className={styles.estimateValue}>
                    ${financials.estimatedTotal.toLocaleString('es-AR')}
                  </span>
                </div>
              )}

              <div className={styles.estimateRow}>
                <span className={styles.estimateLabel}>{SLOT_CARD_TEXTS.depositPaidLabel}</span>
                <span className={styles.depositPaidValue}>
                  {financials.estimatedTotal !== null ? '-' : ''}$
                  {financials.paidDeposit.toLocaleString('es-AR')}
                </span>
              </div>

              {financials.state === 'pending_balance' && financials.pendingBalance !== null && (
                <div className={styles.pendingBalanceRow}>
                  <span className={styles.pendingBalanceLabel}>
                    {SLOT_CARD_TEXTS.pendingBalanceLabel}
                  </span>
                  <span className={styles.pendingBalanceAmount}>
                    ${financials.pendingBalance.toLocaleString('es-AR')}
                  </span>
                </div>
              )}

              {financials.state === 'paid_in_full' && (
                <div className={styles.settledBalanceRow}>
                  <span className={styles.settledBalanceLabel}>
                    {SLOT_CARD_TEXTS.pendingBalanceLabel}
                  </span>
                  <span className={styles.settledBalanceAmount}>
                    $0 · {SLOT_CARD_TEXTS.paidInFullLabel}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              {hasEstimatedPrice && (
                <div className={styles.estimateRow}>
                  <span className={styles.estimateLabel}>{SLOT_CARD_TEXTS.sections.priceEstimate}</span>
                  <span className={styles.estimateValue}>
                    ${estimatedPrice.toLocaleString('es-AR')}
                  </span>
                </div>
              )}

              {!isAdmin && surchargeInfo.surcharge && (
                <div
                  className={styles.surchargeFinanceRow}
                  title={SLOT_CARD_TEXTS.surcharge.clientRowTooltip}
                >
                  <span className={styles.surchargeFinanceLabel}>
                    {SLOT_CARD_TEXTS.surcharge.clientRowLabel}
                  </span>
                  <span className={styles.surchargeFinanceValue}>
                    {formatSurchargeValue(surchargeInfo.surcharge)}
                    {clientPercentagePreviewAmount > 0
                      ? ` (+$${clientPercentagePreviewAmount.toLocaleString('es-AR')})`
                      : ''}
                  </span>
                </div>
              )}

              <div className={styles.depositRow}>
                <span className={styles.depositLabel}>{SLOT_CARD_TEXTS.depositLabel}</span>
                <span className={styles.depositAmount}>
                  ${slot.depositAmount.toLocaleString('es-AR')}
                </span>
              </div>
            </>
          )}
        </div>

        <div className={styles.actionToolbar}>
          {!isAdmin && (
            <Button
              variant={slot.status === 'available' ? 'primary' : 'secondary'}
              fullWidth
              size="md"
              disabled={slot.status !== 'available'}
              onClick={() => onBook && onBook(slot)}
              rightIcon={
                slot.status === 'available' ? (
                  <ArrowRight size={15} strokeWidth={1.75} aria-hidden="true" />
                ) : undefined
              }
            >
              {slot.status === 'available'
                ? SLOT_CARD_TEXTS.clientButtons.available
                : slot.status === 'pending_payment'
                  ? SLOT_CARD_TEXTS.clientButtons.pendingPayment
                  : slot.status === 'confirmed'
                    ? SLOT_CARD_TEXTS.clientButtons.confirmed
                    : slot.status === 'past'
                      ? slot.pastOutcome === 'cancelled'
                        ? SLOT_CARD_TEXTS.clientButtons.pastCancelled
                        : SLOT_CARD_TEXTS.clientButtons.pastConcluded
                      : slot.status === 'conflict'
                        ? SLOT_CARD_TEXTS.clientButtons.conflict
                        : SLOT_CARD_TEXTS.clientButtons.notAvailable}
            </Button>
          )}

          {isAdmin && renderAdminButtons()}
        </div>
      </div>
    </article>
  );
});

SlotCard.displayName = 'SlotCard';

export default SlotCard;
