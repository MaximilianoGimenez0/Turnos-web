import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  AlertTriangle,
  CreditCard,
  Trash2,
  Ban,
  RotateCcw,
  User,
  UserCheck,
  History,
  CalendarDays,
  Mail,
  Phone,
  Wallet,
  Sparkles,
  Coins,
  ArrowRight,
  Layers,
  UserCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  Clock,
} from 'lucide-react';
import type { Slot, ServiceItem } from '../../../types';
import Button from '../../common/Button/Button';
import { findPendingConflictForSlot } from '../../../services/schedulingService';
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
}

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
}) => {
  const [isExtrasOpen, setIsExtrasOpen] = useState(false);
  const [isDossierExpanded, setIsDossierExpanded] = useState(false);

  const hasSearchMatchInDetails = useMemo(() => {
    if (!searchQuery || !compact) return false;
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
  }, [searchQuery, compact, slot.clientData, slot.paymentId]);

  const effectiveDossierExpanded = isDossierExpanded || hasSearchMatchInDetails;

  const { formattedWeekday, formattedDateFull, formattedTime } = useMemo(() => {
    const slotDate = new Date(slot.datetime);
    const isValid = !isNaN(slotDate.getTime());

    return {
      formattedWeekday: isValid
        ? slotDate.toLocaleDateString('es-AR', { weekday: 'short' })
        : '',
      formattedDateFull: isValid
        ? slotDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
        : slot.datetime,
      formattedTime: isValid
        ? slotDate.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
        : '',
    };
  }, [slot.datetime]);

  const pendingConflictSlot = useMemo(() => {
    if (!isAdmin || slot.status !== 'available' || !allSlots || allSlots.length === 0) {
      return null;
    }
    return findPendingConflictForSlot(slot, allSlots);
  }, [isAdmin, slot, allSlots]);

  const pendingConflictMinutesLeft = useMemo(() => {
    if (!pendingConflictSlot || !pendingConflictSlot.expiresAt) return null;
    const expiresMs = new Date(pendingConflictSlot.expiresAt).getTime();
    const diffMs = expiresMs - Date.now();
    return Math.max(1, Math.ceil(diffMs / 60000));
  }, [pendingConflictSlot]);

  const status = useMemo(() => {
    if (pendingConflictSlot) {
      return {
        label: SLOT_CARD_TEXTS.statuses.pendingConflict,
        icon: <Clock size={13} aria-hidden="true" />,
        className: styles.statusPending,
        cardModifier: styles.cardPending,
      };
    }

    switch (slot.status) {
      case 'available':
        return {
          label: SLOT_CARD_TEXTS.statuses.available,
          icon: <CheckCircle2 size={13} aria-hidden="true" />,
          className: styles.statusAvailable,
          cardModifier: styles.cardAvailable,
        };
      case 'pending_payment':
        return {
          label: SLOT_CARD_TEXTS.statuses.pendingPayment,
          icon: <AlertCircle size={13} aria-hidden="true" />,
          className: styles.statusPending,
          cardModifier: styles.cardPending,
        };
      case 'confirmed':
        return {
          label: SLOT_CARD_TEXTS.statuses.confirmed,
          icon: <CheckCircle2 size={13} aria-hidden="true" />,
          className: styles.statusConfirmed,
          cardModifier: styles.cardConfirmed,
        };
      case 'cancelled':
        return {
          label: SLOT_CARD_TEXTS.statuses.cancelled,
          icon: <XCircle size={13} aria-hidden="true" />,
          className: styles.statusCancelled,
          cardModifier: styles.cardCancelled,
        };
      case 'conflict':
        return {
          label: SLOT_CARD_TEXTS.statuses.conflict,
          icon: <AlertTriangle size={13} aria-hidden="true" />,
          className: styles.statusConflict,
          cardModifier: styles.cardConflict,
        };
      case 'past':
        if (slot.pastOutcome === 'cancelled') {
          return {
            label: SLOT_CARD_TEXTS.statuses.pastCancelled,
            icon: <XCircle size={13} aria-hidden="true" />,
            className: styles.statusCancelled,
            cardModifier: styles.cardCancelled,
          };
        }
        return {
          label: SLOT_CARD_TEXTS.statuses.pastConcluded,
          icon: <History size={13} aria-hidden="true" />,
          className: styles.statusPast,
          cardModifier: styles.cardPast,
        };
      default:
        return {
          label: SLOT_CARD_TEXTS.statuses.unknown,
          icon: <AlertCircle size={13} aria-hidden="true" />,
          className: '',
          cardModifier: '',
        };
    }
  }, [slot.status, slot.pastOutcome]);

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

    if (!hasBooked && slot.services && slot.services.length > 0) {
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
  }, [slot.clientData, slot.services, slot.rules, slot.serviceName]);

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

  const estimatedPrice = slot.clientData?.estimatedPrice;
  const hasEstimatedPrice = Boolean(estimatedPrice && estimatedPrice > 0);
  const salonBalance =
    hasEstimatedPrice && estimatedPrice! > slot.depositAmount
      ? estimatedPrice! - slot.depositAmount
      : null;

  return (
    <article
      className={`${styles.slotCard} ${status.cardModifier} ${!isAdmin ? styles.cardClient : ''} ${compact ? styles.cardCompact : ''}`}
      aria-label={`${slot.serviceName || SLOT_CARD_TEXTS.defaultServiceName} - ${formattedWeekday} ${formattedDateFull} ${formattedTime}`}
    >
      {isAdmin && (
        <div className={`${styles.statusBar} ${status.className}`}>
          <div className={styles.statusIndicator}>
            <span className={styles.statusPulse} aria-hidden="true" />
            {status.icon}
            <span className={styles.statusLabel}>{status.label}</span>
          </div>
        </div>
      )}

      <div className={`${styles.heroTimeBox} ${!isAdmin ? styles.heroTimeBoxClient : ''}`}>
        <div className={styles.timeCluster}>
          <span className={styles.heroTime}>{formattedTime}</span>
          <span className={styles.timeSuffix}>{SLOT_CARD_TEXTS.timeSuffix}</span>
        </div>

        {!hideDatePill && (
          <div className={styles.datePill}>
            <CalendarDays size={14} className={styles.calendarIcon} aria-hidden="true" />
            <div className={styles.dateMeta}>
              <span className={styles.weekdayText}>{formattedWeekday}</span>
              <span className={styles.fullDateText}>{formattedDateFull}</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.contentBody}>
        <h4 className={styles.serviceTitle}>
          {slot.serviceName || SLOT_CARD_TEXTS.defaultServiceName}
        </h4>

        {isAdmin && pendingConflictSlot && (
          <div className={styles.conflictNoticeBanner}>
            <AlertCircle size={14} className={styles.conflictNoticeIcon} aria-hidden="true" />
            <span>
              {SLOT_CARD_TEXTS.notices.pendingConflictNotice(pendingConflictMinutesLeft ?? 15)}
            </span>
          </div>
        )}

        {hasServices && (
          <div className={styles.sectionBlock}>
            <span className={styles.sectionLabel}>
              <Layers size={11} className={styles.sectionLabelIcon} aria-hidden="true" />
              {SLOT_CARD_TEXTS.sections.services}
            </span>
            <div className={styles.badgeList}>
              {compact && servicesList.length > 2 ? (
                <>
                  {servicesList.slice(0, 2).map((name, idx) => (
                    <span key={idx} className={styles.serviceBadge}>
                      {name}
                    </span>
                  ))}
                  <span
                    className={styles.moreServicesBadge}
                    title={servicesList.slice(2).join(', ')}
                  >
                    {SLOT_CARD_TEXTS.adminDossier.moreServices(servicesList.length - 2)}
                  </span>
                </>
              ) : (
                servicesList.map((name, idx) => (
                  <span key={idx} className={styles.serviceBadge}>
                    {name}
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {hasExtras && (
          <div className={styles.sectionBlock}>
            <button
              type="button"
              className={styles.extrasDropdownTrigger}
              onClick={() => setIsExtrasOpen((prev) => !prev)}
              aria-expanded={isExtrasOpen}
              aria-label={`${hasBookedExtras
                ? SLOT_CARD_TEXTS.sections.extras
                : SLOT_CARD_TEXTS.sections.availableExtras
                } (${totalExtrasCount})`}
            >
              <span className={styles.extrasTriggerLabel}>
                <Sparkles size={11} className={styles.sectionLabelIcon} aria-hidden="true" />
                <span className={styles.sectionLabel}>
                  {hasBookedExtras
                    ? SLOT_CARD_TEXTS.sections.extras
                    : SLOT_CARD_TEXTS.sections.availableExtras}
                </span>
                <span className={styles.extrasCountBadge}>({totalExtrasCount})</span>
              </span>
              <span className={styles.dropdownChevron} aria-hidden="true">
                {isExtrasOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>

            {isExtrasOpen && (
              <div className={styles.extrasCollapsibleContent}>
                {groupedExtras.map((group) => (
                  <div key={group.serviceName} className={styles.serviceExtraGroup}>
                    <div className={styles.serviceExtraGroupHeader}>
                      <span className={styles.serviceExtraGroupName}>{group.serviceName}</span>
                      <span className={styles.serviceExtraGroupCount}>
                        {group.extras.length} {group.extras.length === 1 ? 'adicional' : 'adicionales'}
                      </span>
                    </div>
                    <div className={styles.badgeList}>
                      {group.extras.map((extra) => (
                        <span
                          key={extra.id}
                          className={hasBookedExtras ? styles.extraBadge : styles.availableExtraBadge}
                        >
                          <Sparkles
                            size={10}
                            className={
                              hasBookedExtras
                                ? styles.extraBadgeIcon
                                : styles.availableExtraBadgeIcon
                            }
                            aria-hidden="true"
                          />
                          {extra.name}
                          {extra.price && extra.price > 0 ? ` (+$${extra.price.toLocaleString('es-AR')})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {hasEstimatedPrice && (
          <div className={styles.priceEstimateSection}>
            <span className={styles.sectionLabel}>
              <Coins size={11} className={styles.sectionLabelIcon} aria-hidden="true" />
              {SLOT_CARD_TEXTS.sections.priceEstimate}
            </span>
            <span className={styles.priceEstimateValue}>
              ${estimatedPrice!.toLocaleString('es-AR')}
            </span>
          </div>
        )}

        {isAdmin && slot.clientData && (
          compact ? (
            <div className={styles.adminDossierCompact}>
              <div className={styles.compactClientHeaderRow}>
                <div className={styles.compactClientInfoWrap}>
                  <div className={styles.compactAvatarBadge} aria-hidden="true">
                    {clientInitials}
                  </div>
                  <div className={styles.compactClientTextWrap}>
                    <span className={styles.compactClientName} title={slot.clientData.name}>
                      {slot.clientData.name}
                    </span>
                    {slot.clientData.phone && (
                      <span className={styles.compactClientPhone}>
                        <Phone size={10} aria-hidden="true" />
                        {slot.clientData.phone}
                      </span>
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
                    <ChevronUp size={12} aria-hidden="true" />
                  ) : (
                    <ChevronDown size={12} aria-hidden="true" />
                  )}
                </button>
              </div>

              {salonBalance !== null && !effectiveDossierExpanded && (
                <div className={styles.compactBalanceChip}>
                  <Wallet size={11} aria-hidden="true" />
                  <span>
                    {SLOT_CARD_TEXTS.adminDossier.salonBalanceLabel} ${salonBalance.toLocaleString('es-AR')}
                  </span>
                </div>
              )}

              {effectiveDossierExpanded && (
                <div className={styles.dossierExpandedContent}>
                  {slot.clientData.email && (
                    <div className={styles.contactItem}>
                      <Mail size={12} className={styles.contactIcon} aria-hidden="true" />
                      <span className={styles.contactText}>{slot.clientData.email}</span>
                    </div>
                  )}

                  {slot.clientData.bookedServices && slot.clientData.bookedServices.length > 0 ? (
                    <div className={styles.bookedDetailsList}>
                      <span className={styles.bookedDetailHeader}>
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
                      <span className={styles.bookedDetailHeader}>
                        {SLOT_CARD_TEXTS.sections.bookedDetail}
                      </span>
                      <div className={styles.bookedDetailRow}>
                        <Sparkles size={11} aria-hidden="true" />
                        <span className={styles.bookedExtras}>
                          {SLOT_CARD_TEXTS.tags.extrasPrefix}{' '}
                          {slot.clientData.selectedExtras
                            .map((e) => `${e.name} (+$${(e.price || 0).toLocaleString('es-AR')})`)
                            .join(', ')}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {salonBalance !== null && (
                    <div className={styles.salonBalanceBox}>
                      <Wallet size={13} className={styles.balanceIcon} aria-hidden="true" />
                      <span>
                        {SLOT_CARD_TEXTS.adminDossier.salonBalanceLabel}{' '}
                        <strong>${salonBalance.toLocaleString('es-AR')}</strong>
                      </span>
                    </div>
                  )}

                  {slot.paymentId && (
                    <div className={styles.mpPaymentBadge}>
                      <span className={styles.mpLabel}>{SLOT_CARD_TEXTS.adminDossier.mpLabel}</span>
                      <span className={styles.mpId}>#{slot.paymentId}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.adminDossier}>
              <div className={styles.dossierHeader}>
                <UserCircle size={13} className={styles.dossierHeaderIcon} aria-hidden="true" />
                <span className={styles.dossierHeaderLabel}>
                  {SLOT_CARD_TEXTS.sections.clientInfo}
                </span>
              </div>

              <div className={styles.clientProfileHeader}>
                <div className={styles.clientAvatarBadge} aria-hidden="true">
                  {clientInitials}
                </div>
                <div className={styles.clientProfileInfo}>
                  <span className={styles.clientName}>{slot.clientData.name}</span>
                  <span className={styles.clientDossierSubtitle}>
                    <User size={10} className={styles.contactIcon} aria-hidden="true" />{' '}
                    {SLOT_CARD_TEXTS.adminDossier.assignedClient}
                  </span>
                </div>
              </div>

              <div className={styles.clientContactGrid}>
                {slot.clientData.email && (
                  <div className={styles.contactItem}>
                    <Mail size={12} className={styles.contactIcon} aria-hidden="true" />
                    <span className={styles.contactText}>{slot.clientData.email}</span>
                  </div>
                )}
                {slot.clientData.phone && (
                  <div className={styles.contactItem}>
                    <Phone size={12} className={styles.contactIcon} aria-hidden="true" />
                    <span className={styles.contactText}>{slot.clientData.phone}</span>
                  </div>
                )}
              </div>

              {slot.clientData.bookedServices && slot.clientData.bookedServices.length > 0 ? (
                <div className={styles.bookedDetailsList}>
                  <span className={styles.bookedDetailHeader}>
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
                  <span className={styles.bookedDetailHeader}>
                    {SLOT_CARD_TEXTS.sections.bookedDetail}
                  </span>
                  <div className={styles.bookedDetailRow}>
                    <Sparkles size={11} aria-hidden="true" />
                    <span className={styles.bookedExtras}>
                      {SLOT_CARD_TEXTS.tags.extrasPrefix}{' '}
                      {slot.clientData.selectedExtras
                        .map((e) => `${e.name} (+$${(e.price || 0).toLocaleString('es-AR')})`)
                        .join(', ')}
                    </span>
                  </div>
                </div>
              ) : null}

              {salonBalance !== null && (
                <div className={styles.salonBalanceBox}>
                  <Wallet size={13} className={styles.balanceIcon} aria-hidden="true" />
                  <span>
                    {SLOT_CARD_TEXTS.adminDossier.salonBalanceLabel}{' '}
                    <strong>${salonBalance.toLocaleString('es-AR')}</strong>
                  </span>
                </div>
              )}

              {slot.paymentId && (
                <div className={styles.mpPaymentBadge}>
                  <span className={styles.mpLabel}>{SLOT_CARD_TEXTS.adminDossier.mpLabel}</span>
                  <span className={styles.mpId}>#{slot.paymentId}</span>
                </div>
              )}
            </div>
          )
        )}
      </div>

      <hr className={styles.cardDivider} aria-hidden="true" />

      <div className={styles.footerSection}>
        <div className={styles.priceContainer}>
          <span className={styles.depositLabel}>{SLOT_CARD_TEXTS.depositLabel}</span>
          <div className={styles.depositPriceWrap}>
            <span className={styles.currencySymbol}>$</span>
            <span className={styles.depositAmount}>
              {slot.depositAmount.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        <div className={styles.actionToolbar}>
          {!isAdmin && (
            <Button
              variant={slot.status === 'available' ? 'primary' : 'secondary'}
              fullWidth
              size="md"
              disabled={slot.status !== 'available'}
              onClick={() => onBook && onBook(slot)}
              leftIcon={<CreditCard size={15} aria-hidden="true" />}
              rightIcon={slot.status === 'available' ? <ArrowRight size={15} aria-hidden="true" /> : undefined}
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

          {isAdmin && (
            <div className={styles.adminButtonsGroup}>
              {slot.status === 'confirmed' && (
                <Button
                  variant="danger"
                  size="sm"
                  fullWidth
                  onClick={() => onCancel && onCancel(slot.id)}
                  leftIcon={<Ban size={14} aria-hidden="true" />}
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
                      leftIcon={<Lock size={14} aria-hidden="true" />}
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
                      leftIcon={<UserCheck size={14} aria-hidden="true" />}
                      title={SLOT_CARD_TEXTS.adminButtons.takeSlotTitle}
                    >
                      {SLOT_CARD_TEXTS.adminButtons.takeSlot}
                    </Button>
                  )}

                  <Button
                    variant="danger"
                    size="sm"
                    className={styles.deleteIconButton}
                    onClick={() => onDelete && onDelete(slot.id)}
                    title={SLOT_CARD_TEXTS.adminButtons.deleteUnassignedTitle}
                    aria-label={SLOT_CARD_TEXTS.adminButtons.deleteSlotAriaLabel}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </Button>
                </>
              )}

              {slot.status === 'pending_payment' && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => onRelease && onRelease(slot.id)}
                    leftIcon={<RotateCcw size={14} aria-hidden="true" />}
                    title={SLOT_CARD_TEXTS.adminButtons.releasePendingTitle}
                  >
                    {SLOT_CARD_TEXTS.adminButtons.releaseSlot}
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    className={styles.deleteIconButton}
                    onClick={() => onDelete && onDelete(slot.id)}
                    title={SLOT_CARD_TEXTS.adminButtons.deletePendingTitle}
                    aria-label={SLOT_CARD_TEXTS.adminButtons.deleteSlotAriaLabel}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </Button>
                </>
              )}

              {(slot.status === 'cancelled' || slot.status === 'conflict') && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={() => onAssign && onAssign(slot)}
                    leftIcon={<UserCheck size={14} aria-hidden="true" />}
                    title={SLOT_CARD_TEXTS.adminButtons.reassignSlotTitle}
                  >
                    {SLOT_CARD_TEXTS.adminButtons.reassignSlot}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => onRelease && onRelease(slot.id)}
                    leftIcon={<RotateCcw size={14} aria-hidden="true" />}
                    title={SLOT_CARD_TEXTS.adminButtons.releaseConflictTitle}
                  >
                    {SLOT_CARD_TEXTS.adminButtons.releaseSlot}
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    className={styles.deleteIconButton}
                    onClick={() => onDelete && onDelete(slot.id)}
                    title={
                      slot.status === 'conflict'
                        ? SLOT_CARD_TEXTS.adminButtons.deleteConflictTitle
                        : SLOT_CARD_TEXTS.adminButtons.deleteCancelledTitle
                    }
                    aria-label={
                      slot.status === 'conflict'
                        ? SLOT_CARD_TEXTS.adminButtons.deleteConflictAriaLabel
                        : SLOT_CARD_TEXTS.adminButtons.deleteCancelledAriaLabel
                    }
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </Button>
                </>
              )}

              {slot.status === 'past' && (
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => onDelete && onDelete(slot.id)}
                  leftIcon={<Trash2 size={14} aria-hidden="true" />}
                  title={SLOT_CARD_TEXTS.adminButtons.deleteHistoryTitle}
                >
                  {SLOT_CARD_TEXTS.adminButtons.deleteHistory}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
});

SlotCard.displayName = 'SlotCard';

export default SlotCard;
