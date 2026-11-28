import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  Mail,
  Phone,
  MessageCircle,
  FileText,
  Calendar,
  Ban,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  History,
  Tag,
  Percent,
} from 'lucide-react';
import type { Slot } from '../../../types';
import { useOptionalTenant } from '../../../context/TenantContext';
import {
  BUSINESS_TIMEZONE,
  formatBusinessDateKey,
  formatDateKeyLong,
  getTodayBusinessDateString,
  type AdminTimeScope,
} from '../../../utils/dateUtils';
import { formatHolidaySummary, getHolidayInfo } from '../../../utils/holidays';
import { resolveSlotBookingChannel, resolveSlotFinancials } from '../../../services/bookingHelper';
import {
  buildAgendaDayTimeline,
  groupTimelineEntriesIntoBlocks,
  type TimelineBlock,
  type TimelineConnector,
  type TimelineEntry,
} from '../../../services/agendaTimeline';
import { resolveBookingSurcharge } from '../../../utils/surcharge';
import Button from '../../common/Button/Button';
import SurchargeBadge from '../../common/SurchargeBadge';
import { CONFIRMED_AGENDA_TEXTS } from '../../../texts';
import styles from './ConfirmedAgenda.module.css';

export interface ConfirmedAgendaProps {
  slots: Slot[];
  searchQuery?: string;
  onCancel?: (slotId: string) => void;
  timeScope?: AdminTimeScope;
  timeZone?: string;
  periodLabel?: string;
  otherPeriodMatches?: number;
  onExpandPeriod?: () => void;
  expandPeriodLabel?: string;
}

interface SlotServicesSummary {
  compactLabel: string;
  serviceNames: string[];
  extrasGroups: Array<{
    key: string;
    label: string;
    detail: string;
  }>;
}

const resolveSlotServicesDisplay = (slot: Slot): SlotServicesSummary => {
  const seen = new Set<string>();
  const serviceNames: string[] = [];

  const pushUnique = (raw?: string | null) => {
    const trimmed = raw?.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    serviceNames.push(trimmed);
  };

  if (slot.clientData?.bookedServices && slot.clientData.bookedServices.length > 0) {
    slot.clientData.bookedServices.forEach((bs) => pushUnique(bs.name));
  } else {
    const rawList =
      slot.clientData?.selectedServices ||
      slot.clientData?.selectedRules ||
      slot.services ||
      slot.rules ||
      [];
    rawList.forEach((item) => pushUnique(typeof item === 'string' ? item : item.name));
  }

  if (serviceNames.length === 0) {
    pushUnique(slot.clientData?.selectedService);
    pushUnique(slot.serviceName);
  }

  let compactLabel = '';
  if (serviceNames.length === 1) {
    compactLabel = serviceNames[0];
  } else if (serviceNames.length > 1) {
    compactLabel = `${serviceNames[0]} ${CONFIRMED_AGENDA_TEXTS.card.moreServices(
      serviceNames.length - 1
    )}`;
  }

  const extrasGroups: SlotServicesSummary['extrasGroups'] = [];
  if (slot.clientData?.bookedServices && slot.clientData.bookedServices.length > 0) {
    slot.clientData.bookedServices.forEach((bs) => {
      const checkedExtras = (bs.extras || []).filter((e) => e.selected);
      if (checkedExtras.length === 0) return;
      extrasGroups.push({
        key: bs.serviceId,
        label: bs.name,
        detail: checkedExtras
          .map((e) => `${e.name} (+$${(e.price || 0).toLocaleString('es-AR')})`)
          .join(', '),
      });
    });
  } else if (slot.clientData?.selectedExtras && slot.clientData.selectedExtras.length > 0) {
    extrasGroups.push({
      key: 'legacy-extras',
      label: 'Extras',
      detail: slot.clientData.selectedExtras
        .map((e) => `${e.name} (+$${(e.price || 0).toLocaleString('es-AR')})`)
        .join(', '),
    });
  }

  return {
    compactLabel,
    serviceNames,
    extrasGroups,
  };
};

export const ConfirmedAgenda: React.FC<ConfirmedAgendaProps> = ({
  slots,
  searchQuery = '',
  onCancel,
  timeScope = 'week',
  timeZone,
  periodLabel,
  otherPeriodMatches = 0,
  onExpandPeriod,
  expandPeriodLabel,
}) => {
  const tenant = useOptionalTenant();
  const effectiveTimeZone = timeZone || tenant?.timezone || BUSINESS_TIMEZONE;
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [toggledDays, setToggledDays] = useState<Record<string, boolean>>({});
  const [expandedSlotIds, setExpandedSlotIds] = useState<Record<string, boolean>>({});
  const [showCompletedByDay, setShowCompletedByDay] = useState<Record<string, boolean>>({});
  const trimmedSearch = searchQuery.trim();
  const hasActiveSearch = trimmedSearch.length > 0;

  const confirmedSlots = useMemo(() => {
    const list = slots.filter((s) => s.status === 'confirmed');

    if (!trimmedSearch) {
      return list.sort((a, b) => (a.datetime > b.datetime ? 1 : -1));
    }

    const query = trimmedSearch.toLowerCase();
    return list
      .filter((s) => {
        const matchesServices = (s.clientData?.selectedServices || s.services || []).some((srv) =>
          (typeof srv === 'string' ? srv : srv.name).toLowerCase().includes(query)
        );
        const matchesBookedServices = (s.clientData?.bookedServices || []).some(
          (bs) =>
            bs.name.toLowerCase().includes(query) ||
            (bs.extras || []).some((ex) => ex.selected && ex.name.toLowerCase().includes(query))
        );
        return (
          (s.clientData?.name && s.clientData.name.toLowerCase().includes(query)) ||
          (s.clientData?.email && s.clientData.email.toLowerCase().includes(query)) ||
          (s.clientData?.selectedService &&
            s.clientData.selectedService.toLowerCase().includes(query)) ||
          (s.clientData?.notes && s.clientData.notes.toLowerCase().includes(query)) ||
          (s.serviceName && s.serviceName.toLowerCase().includes(query)) ||
          (s.clientData?.phone && s.clientData.phone.includes(query)) ||
          matchesServices ||
          matchesBookedServices
        );
      })
      .sort((a, b) => (a.datetime > b.datetime ? 1 : -1));
  }, [slots, trimmedSearch]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();

    confirmedSlots.forEach((slot) => {
      if (!slot.datetime) return;
      const dateKey = formatBusinessDateKey(slot.datetime, effectiveTimeZone);
      if (!dateKey) return;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(slot);
    });

    return Array.from(map.entries());
  }, [confirmedSlots, effectiveTimeZone]);

  const todayStr = getTodayBusinessDateString(effectiveTimeZone, nowMs);
  const hasTodayGroup = useMemo(
    () => groupedByDate.some(([dateKey]) => dateKey === todayStr),
    [groupedByDate, todayStr]
  );

  useEffect(() => {
    if (!hasTodayGroup) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => clearInterval(interval);
  }, [hasTodayGroup]);

  const dayTimelines = useMemo(
    () =>
      groupedByDate.map(([dateKey, daySlots]) =>
        buildAgendaDayTimeline(dateKey, daySlots, {
          nowMs,
          isToday: dateKey === todayStr,
          includeGaps: !hasActiveSearch,
          timeZone: effectiveTimeZone,
        })
      ),
    [groupedByDate, nowMs, todayStr, hasActiveSearch, effectiveTimeZone]
  );

  const defaultExpandedDayKey = useMemo(() => {
    if (dayTimelines.length === 0) return null;
    if (dayTimelines.some((d) => d.dateKey === todayStr)) return todayStr;
    const nextUpcoming = dayTimelines.find((d) => d.dateKey >= todayStr);
    return nextUpcoming ? nextUpcoming.dateKey : dayTimelines[0].dateKey;
  }, [dayTimelines, todayStr]);

  const isDayExpanded = (dateKey: string): boolean => {
    if (hasActiveSearch) return true;
    if (dateKey in toggledDays) return toggledDays[dateKey];
    if (timeScope === 'day' || dayTimelines.length === 1) return true;
    return dateKey === defaultExpandedDayKey;
  };

  const toggleDay = (dateKey: string) => {
    const currentlyOpen = isDayExpanded(dateKey);
    setToggledDays((prev) => ({ ...prev, [dateKey]: !currentlyOpen }));
  };

  const isSlotExpanded = (slotId: string): boolean => {
    if (hasActiveSearch) return true;
    return Boolean(expandedSlotIds[slotId]);
  };

  const toggleSlot = (slotId: string) => {
    setExpandedSlotIds((prev) => ({ ...prev, [slotId]: !prev[slotId] }));
  };

  const toggleCompletedDay = (dateKey: string) => {
    setShowCompletedByDay((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const allDaysExpanded =
    dayTimelines.length > 0 && dayTimelines.every((d) => isDayExpanded(d.dateKey));

  const handleToggleAllDays = () => {
    const nextState = !allDaysExpanded;
    const nextMap: Record<string, boolean> = {};
    dayTimelines.forEach((d) => {
      nextMap[d.dateKey] = nextState;
    });
    setToggledDays(nextMap);
  };

  const formatHeaderDate = (dateIsoStr: string) => {
    const isToday = dateIsoStr === todayStr;
    const formatted = formatDateKeyLong(dateIsoStr);
    return isToday ? `${CONFIRMED_AGENDA_TEXTS.dateHeader.todayPrefix}${formatted}` : formatted;
  };

  const getCleanPhoneForWhatsApp = (phone?: string) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8 ? digits : null;
  };

  const renderFreeGapBand = (
    gap: TimelineConnector,
    nowTimeLabel: string | null,
    key: string
  ) => {
    const isLongGap = gap.minutes >= 90;
    return (
      <div
        key={key}
        className={`${styles.freeGapBand} ${isLongGap ? styles.freeGapBandLong : ''}`}
      >
        <div className={styles.freeGapRail} aria-hidden="true">
          <span className={styles.freeGapLine} />
        </div>

        <div className={styles.freeGapBody}>
          <div className={styles.freeGapChip}>
            <Clock size={12} strokeWidth={1.75} aria-hidden="true" />
            <span className={styles.freeGapText}>
              {CONFIRMED_AGENDA_TEXTS.timeline.freeGapShort(gap.label, gap.fromTime, gap.toTime)}
            </span>
          </div>

          {gap.containsNow && nowTimeLabel && (
            <div className={styles.nowDividerRow} role="status">
              <span className={styles.nowDividerDot} aria-hidden="true" />
              <span className={styles.nowDividerLabel}>
                {CONFIRMED_AGENDA_TEXTS.timeline.nowMarker(nowTimeLabel)}
              </span>
              <span className={styles.nowDividerLine} aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTimelineBlocks = (
    blocks: TimelineBlock[],
    nowTimeLabel: string | null,
    muted = false
  ) =>
    blocks.map((block) => (
      <React.Fragment key={block.id}>
        <div className={`${styles.timelineBlock} ${muted ? styles.timelineBlockMuted : ''}`}>
          {block.entries.map((entry, idx) => {
            const { slot } = entry;
            const prevEntry = idx > 0 ? block.entries[idx - 1] : null;
            const overlapBefore =
              prevEntry?.connectorAfter?.kind === 'overlap' ? prevEntry.connectorAfter : null;

            const isLive = entry.phase === 'in_progress';
            const isCompletedToday = entry.phase === 'completed';
            const expanded = isSlotExpanded(slot.id);
            const detailId = `agenda-slot-detail-${slot.id}`;

            const clientName =
              slot.clientData?.name || CONFIRMED_AGENDA_TEXTS.card.defaultClientName;
            const servicesInfo = resolveSlotServicesDisplay(slot);
            const financials = resolveSlotFinancials(slot);
            const bookingChannel = resolveSlotBookingChannel(slot);
            const surchargeInfo = resolveBookingSurcharge({
              clientData: slot.clientData,
              slotSurcharge: slot.surcharge,
            });
            const waNumber = getCleanPhoneForWhatsApp(slot.clientData?.phone);
            const hasNotes = Boolean(slot.clientData?.notes?.trim());
            const hasSurcharge = Boolean(surchargeInfo.surcharge);
            const SurchargeSignalIcon =
              surchargeInfo.surcharge?.type === 'percentage' ? Percent : Tag;

            return (
              <React.Fragment key={slot.id}>
                {overlapBefore && (
                  <div className={styles.overlapBanner} role="alert">
                    <AlertTriangle size={12} strokeWidth={1.85} aria-hidden="true" />
                    <span>{CONFIRMED_AGENDA_TEXTS.timeline.overlap(overlapBefore.label)}</span>
                  </div>
                )}

                <article
                  className={`${styles.slotItem} ${idx > 0 && !overlapBefore ? styles.slotItemDivider : ''} ${
                    isLive ? styles.slotItemLive : ''
                  } ${isCompletedToday ? styles.slotItemDone : ''} ${
                    expanded ? styles.slotItemExpanded : ''
                  }`}
                >
                  {isLive && entry.progressPercent !== null && (
                    <div className={styles.liveProgressTrack} aria-hidden="true">
                      <div
                        className={styles.liveProgressFill}
                        style={{ transform: `scaleX(${entry.progressPercent / 100})` }}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    className={styles.slotRowTrigger}
                    onClick={() => toggleSlot(slot.id)}
                    aria-expanded={expanded}
                    aria-controls={detailId}
                    aria-label={CONFIRMED_AGENDA_TEXTS.card.expandSlotAria(
                      clientName,
                      entry.startTime,
                      expanded
                    )}
                  >
                    <div
                      className={styles.slotTimeCol}
                      aria-label={CONFIRMED_AGENDA_TEXTS.timeline.rangeAria(
                        entry.startTime,
                        entry.endTime,
                        entry.durationLabel
                      )}
                    >
                      <span className={styles.slotStartTime}>{entry.startTime}</span>
                      {entry.endTime ? (
                        <span className={styles.slotEndTime}>
                          {entry.endTime}
                          {entry.crossesMidnight && (
                            <span className={styles.nextDaySuperscript}>
                              {CONFIRMED_AGENDA_TEXTS.timeline.nextDaySuffix}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className={styles.slotEndTime}>
                          {CONFIRMED_AGENDA_TEXTS.card.timeSuffix}
                        </span>
                      )}
                      {entry.durationLabel && (
                        <span className={styles.slotDurationText}>{entry.durationLabel}</span>
                      )}
                    </div>

                    <div className={styles.slotMainCol}>
                      <div className={styles.slotTitleLine}>
                        <span className={styles.clientName}>{clientName}</span>

                        {isLive && (
                          <span className={styles.liveBadge}>
                            <span className={styles.liveDot} aria-hidden="true" />
                            <span>{CONFIRMED_AGENDA_TEXTS.timeline.inProgress}</span>
                            {entry.remainingMinutes !== null && (
                              <span className={styles.liveRemaining}>
                                · {CONFIRMED_AGENDA_TEXTS.timeline.remaining(entry.remainingMinutes)}
                              </span>
                            )}
                          </span>
                        )}

                        {isCompletedToday && !muted && (
                          <span className={styles.finishedBadge}>
                            {CONFIRMED_AGENDA_TEXTS.timeline.finishedToday}
                          </span>
                        )}
                      </div>

                      {servicesInfo.compactLabel && (
                        <span className={styles.slotServiceSummary}>
                          {servicesInfo.compactLabel}
                        </span>
                      )}
                    </div>

                    <div className={styles.slotRightCol}>
                      <div className={styles.slotStatusCluster}>
                        {financials.state === 'pending_balance' &&
                          financials.pendingBalance !== null && (
                            <span className={styles.compactPending}>
                              {CONFIRMED_AGENDA_TEXTS.card.pendingCompact(
                                financials.pendingBalance.toLocaleString('es-AR')
                              )}
                            </span>
                          )}

                        {financials.state === 'paid_in_full' && (
                          <span className={styles.compactSettled}>
                            {CONFIRMED_AGENDA_TEXTS.card.paidInFullLabel}
                          </span>
                        )}

                        {financials.state === 'deposit_only' && (
                          <span className={styles.compactUndefined}>
                            {CONFIRMED_AGENDA_TEXTS.card.totalUndefinedShort}
                          </span>
                        )}

                        {(hasNotes || hasSurcharge) && (
                          <span className={styles.signalIcons}>
                            {hasNotes && (
                              <span
                                className={styles.signalIcon}
                                title={CONFIRMED_AGENDA_TEXTS.card.hasNotesTitle}
                                aria-label={CONFIRMED_AGENDA_TEXTS.card.hasNotesTitle}
                              >
                                <FileText size={13} strokeWidth={1.8} aria-hidden="true" />
                              </span>
                            )}
                            {hasSurcharge && (
                              <span
                                className={`${styles.signalIcon} ${styles.signalIconWarning}`}
                                title={CONFIRMED_AGENDA_TEXTS.card.hasSurchargeTitle}
                                aria-label={CONFIRMED_AGENDA_TEXTS.card.hasSurchargeTitle}
                              >
                                <SurchargeSignalIcon
                                  size={12}
                                  strokeWidth={1.9}
                                  aria-hidden="true"
                                />
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      <span
                        className={`${styles.slotChevron} ${
                          expanded ? styles.slotChevronOpen : ''
                        }`}
                        aria-hidden="true"
                      >
                        <ChevronDown size={15} strokeWidth={1.8} />
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div id={detailId} className={styles.slotDetailPanel}>
                      <div className={styles.detailGrid}>
                        {(servicesInfo.serviceNames.length > 0 ||
                          servicesInfo.extrasGroups.length > 0 ||
                          surchargeInfo.surcharge) && (
                          <div className={styles.detailSection}>
                            <span className={styles.detailSectionLabel}>
                              {CONFIRMED_AGENDA_TEXTS.card.servicesSectionLabel}
                            </span>

                            {servicesInfo.serviceNames.length > 0 && (
                              <div className={styles.rulesRow}>
                                {servicesInfo.serviceNames.map((srvName) => (
                                  <span key={srvName} className={styles.ruleBadge}>
                                    {srvName}
                                  </span>
                                ))}
                              </div>
                            )}

                            {servicesInfo.extrasGroups.length > 0 && (
                              <div className={styles.extrasList}>
                                {servicesInfo.extrasGroups.map((group) => (
                                  <span key={group.key} className={styles.extrasTag}>
                                    {group.label}: {group.detail}
                                  </span>
                                ))}
                              </div>
                            )}

                            {surchargeInfo.surcharge && (
                              <div className={styles.surchargeWrap}>
                                <SurchargeBadge
                                  surcharge={surchargeInfo.surcharge}
                                  resolvedAmount={surchargeInfo.surchargeAmount}
                                  size="sm"
                                  showReason
                                />
                              </div>
                            )}
                          </div>
                        )}

                        <div className={styles.detailSection}>
                          <span className={styles.detailSectionLabel}>
                            {CONFIRMED_AGENDA_TEXTS.card.paymentSectionLabel}
                          </span>

                          <div className={styles.paymentDetailBody}>
                            {financials.state === 'pending_balance' &&
                              financials.pendingBalance !== null && (
                                <div className={styles.detailBalanceRow}>
                                  <span className={styles.detailBalanceLabel}>
                                    {CONFIRMED_AGENDA_TEXTS.card.pendingBalanceLabel}
                                  </span>
                                  <span className={styles.detailBalancePending}>
                                    ${financials.pendingBalance.toLocaleString('es-AR')}
                                  </span>
                                </div>
                              )}

                            {financials.state === 'paid_in_full' && (
                              <div className={styles.detailBalanceRow}>
                                <span className={styles.detailBalanceLabel}>
                                  {CONFIRMED_AGENDA_TEXTS.card.pendingBalanceLabel}
                                </span>
                                <span className={styles.detailBalanceSettled}>
                                  $0 · {CONFIRMED_AGENDA_TEXTS.card.paidInFullLabel}
                                </span>
                              </div>
                            )}

                            {financials.state === 'deposit_only' && (
                              <div className={styles.detailBalanceRow}>
                                <span className={styles.detailBalanceLabel}>
                                  {CONFIRMED_AGENDA_TEXTS.card.totalUndefinedLabel}
                                </span>
                                <span className={styles.depositPaidSubtext}>
                                  {CONFIRMED_AGENDA_TEXTS.card.depositPaidLine(
                                    financials.paidDeposit.toLocaleString('es-AR')
                                  )}
                                </span>
                              </div>
                            )}

                            {financials.estimatedTotal !== null && (
                              <span className={styles.financialBreakdown}>
                                {financials.surchargeAmount !== undefined &&
                                financials.surchargeAmount > 0
                                  ? CONFIRMED_AGENDA_TEXTS.card.breakdownLineWithSurcharge(
                                      financials.estimatedTotal.toLocaleString('es-AR'),
                                      financials.surchargeAmount.toLocaleString('es-AR'),
                                      financials.paidDeposit.toLocaleString('es-AR')
                                    )
                                  : CONFIRMED_AGENDA_TEXTS.card.breakdownLine(
                                      financials.estimatedTotal.toLocaleString('es-AR'),
                                      financials.paidDeposit.toLocaleString('es-AR')
                                    )}
                              </span>
                            )}

                            {financials.estimatedTotal === null &&
                              financials.surchargeAmount !== undefined &&
                              financials.surchargeAmount > 0 && (
                                <span className={styles.surchargeBreakdownSubtext}>
                                  {CONFIRMED_AGENDA_TEXTS.card.surchargeSubline(
                                    financials.surchargeAmount.toLocaleString('es-AR')
                                  )}
                                </span>
                              )}

                            <span
                              className={
                                bookingChannel === 'online'
                                  ? styles.channelOnlineTag
                                  : styles.channelManualTag
                              }
                            >
                              {bookingChannel === 'online'
                                ? CONFIRMED_AGENDA_TEXTS.card.channelOnlineLabel
                                : CONFIRMED_AGENDA_TEXTS.card.channelManualLabel}
                            </span>

                            {slot.paymentId && (
                              <span className={styles.mpReceipt}>
                                {CONFIRMED_AGENDA_TEXTS.card.mpReceiptPrefix}
                                {slot.paymentId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {hasNotes && (
                        <div className={styles.notesTag}>
                          <FileText size={13} className={styles.notesIcon} aria-hidden="true" />
                          <span>{slot.clientData?.notes}</span>
                        </div>
                      )}

                      <div className={styles.detailFooter}>
                        <div className={styles.contactRow}>
                          {waNumber && (
                            <a
                              href={`https://wa.me/${waNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.whatsAppBtn}
                              title={CONFIRMED_AGENDA_TEXTS.card.openWhatsAppTitle}
                            >
                              <MessageCircle size={13} aria-hidden="true" />
                              <span>{CONFIRMED_AGENDA_TEXTS.card.whatsAppLabel}</span>
                            </a>
                          )}

                          {slot.clientData?.phone && (
                            <span className={styles.contactLink}>
                              <Phone size={13} aria-hidden="true" />
                              <span>{slot.clientData.phone}</span>
                            </span>
                          )}

                          {slot.clientData?.email && (
                            <a
                              href={`mailto:${slot.clientData.email}`}
                              className={styles.contactLink}
                              title={CONFIRMED_AGENDA_TEXTS.card.sendEmailTitle}
                            >
                              <Mail size={13} aria-hidden="true" />
                              <span>{slot.clientData.email}</span>
                            </a>
                          )}
                        </div>

                        {onCancel && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onCancel(slot.id)}
                            leftIcon={<Ban size={12} />}
                            title={CONFIRMED_AGENDA_TEXTS.card.cancelTitle}
                            style={{ color: 'var(--color-danger-text)' }}
                          >
                            {CONFIRMED_AGENDA_TEXTS.card.cancelButton}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              </React.Fragment>
            );
          })}
        </div>

        {block.gapAfter && renderFreeGapBand(block.gapAfter, nowTimeLabel, `gap-${block.id}`)}
      </React.Fragment>
    ));

  if (confirmedSlots.length === 0) {
    return (
      <div className={styles.emptyState}>
        <CalendarCheck2 size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
        <h3>
          {hasActiveSearch
            ? CONFIRMED_AGENDA_TEXTS.emptyState.titleWithSearch
            : periodLabel && timeScope !== 'all'
            ? CONFIRMED_AGENDA_TEXTS.emptyState.titleInPeriod(periodLabel)
            : CONFIRMED_AGENDA_TEXTS.emptyState.titleDefault}
        </h3>
        <p>{CONFIRMED_AGENDA_TEXTS.emptyState.description}</p>
        {otherPeriodMatches > 0 && onExpandPeriod && expandPeriodLabel && (
          <div className={styles.emptyStateAction}>
            <Button variant="outline" size="sm" onClick={onExpandPeriod}>
              {expandPeriodLabel} ({otherPeriodMatches})
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.agendaContainer}>
      <div className={styles.agendaHeader}>
        <div className={styles.agendaTitleGroup}>
          <h2 className={styles.agendaMainTitle}>
            <CalendarCheck2 size={22} color="var(--color-success)" aria-hidden="true" />
            {CONFIRMED_AGENDA_TEXTS.header.mainTitle(confirmedSlots.length)}
          </h2>
          <p className={styles.agendaSubtitle}>{CONFIRMED_AGENDA_TEXTS.header.subtitle}</p>
        </div>

        {dayTimelines.length > 1 && !hasActiveSearch && (
          <button type="button" className={styles.toggleAllBtn} onClick={handleToggleAllDays}>
            {allDaysExpanded ? (
              <>
                <ChevronUp size={14} strokeWidth={1.75} aria-hidden="true" />
                <span>{CONFIRMED_AGENDA_TEXTS.header.collapseAll}</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
                <span>{CONFIRMED_AGENDA_TEXTS.header.expandAll}</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className={styles.agendaGrid}>
        {dayTimelines.map((day) => {
          const expanded = isDayExpanded(day.dateKey);
          const formattedDateTitle = formatHeaderDate(day.dateKey);
          const holiday = getHolidayInfo(day.dateKey);
          const panelId = `agenda-day-panel-${day.dateKey}`;

          const completedEntries: TimelineEntry[] = [];
          const activeEntries: TimelineEntry[] = [];

          if (day.isToday && !hasActiveSearch) {
            day.entries.forEach((entry) => {
              if (entry.phase === 'completed') {
                completedEntries.push(entry);
              } else {
                activeEntries.push(entry);
              }
            });
          }

          const shouldCollapseCompleted =
            day.isToday &&
            !hasActiveSearch &&
            completedEntries.length > 0 &&
            activeEntries.length > 0;
          const isCompletedVisible = Boolean(showCompletedByDay[day.dateKey]);

          const boundaryConnector =
            shouldCollapseCompleted
              ? completedEntries[completedEntries.length - 1]?.connectorAfter ?? null
              : null;

          const completedBlocks = shouldCollapseCompleted
            ? groupTimelineEntriesIntoBlocks(completedEntries)
            : [];
          const activeBlocks = shouldCollapseCompleted
            ? groupTimelineEntriesIntoBlocks(activeEntries)
            : day.blocks;

          return (
            <section
              key={day.dateKey}
              className={`${styles.dateGroup} ${expanded ? styles.dateGroupExpanded : ''} ${
                holiday ? styles.dateGroupHoliday : ''
              }`}
            >
              <button
                type="button"
                className={styles.dateHeaderBlock}
                onClick={() => toggleDay(day.dateKey)}
                aria-expanded={expanded}
                aria-controls={panelId}
                aria-label={`${CONFIRMED_AGENDA_TEXTS.dateHeader.toggleDayAria(
                  formattedDateTitle,
                  expanded
                )}${holiday ? ` — ${formatHolidaySummary(holiday)}` : ''}`}
              >
                <div className={styles.dateHeaderTop}>
                  <div className={styles.dateTitleCluster}>
                    <Calendar size={15} strokeWidth={1.75} aria-hidden="true" />
                    <span className={styles.dateTitleText}>{formattedDateTitle}</span>
                    {holiday && (
                      <span className={styles.holidayPill} title={formatHolidaySummary(holiday)}>
                        Feriado · {holiday.name}
                      </span>
                    )}
                  </div>

                  <div className={styles.dayMetaRight}>
                    <div className={styles.daySummaryLine}>
                      <span>{CONFIRMED_AGENDA_TEXTS.dateHeader.slotCount(day.entries.length)}</span>
                      {day.dayStartTime && day.dayEndTime && (
                        <>
                          <span className={styles.metaSep} aria-hidden="true">
                            ·
                          </span>
                          <span>
                            {CONFIRMED_AGENDA_TEXTS.dateHeader.daySpanCompact(
                              day.dayStartTime,
                              day.dayEndTime,
                              day.dayEndCrossesMidnight
                            )}
                          </span>
                        </>
                      )}
                      {day.totalOccupiedLabel && (
                        <>
                          <span className={styles.metaSep} aria-hidden="true">
                            ·
                          </span>
                          <span>{day.totalOccupiedLabel}</span>
                        </>
                      )}
                      {day.totalPendingBalance > 0 && (
                        <>
                          <span className={styles.metaSep} aria-hidden="true">
                            ·
                          </span>
                          <span className={styles.dayPendingText}>
                            {CONFIRMED_AGENDA_TEXTS.dateHeader.pendingCompact(
                              day.totalPendingBalance.toLocaleString('es-AR')
                            )}
                          </span>
                        </>
                      )}
                    </div>

                    <span className={styles.dayChevron} aria-hidden="true">
                      {expanded ? (
                        <ChevronUp size={15} strokeWidth={1.8} />
                      ) : (
                        <ChevronDown size={15} strokeWidth={1.8} />
                      )}
                    </span>
                  </div>
                </div>

                {day.barSegments.length > 0 && day.dayStartTime && day.dayEndTime && (
                  <div
                    className={styles.occupancyBarRow}
                    aria-label={CONFIRMED_AGENDA_TEXTS.dateHeader.occupancyBarAria}
                  >
                    <span className={styles.occupancyEdgeTime}>{day.dayStartTime}</span>
                    <div className={styles.occupancyTrack}>
                      {day.barSegments.map((segment) => (
                        <span
                          key={segment.slotId}
                          className={`${styles.occupancySegment} ${
                            segment.phase === 'in_progress'
                              ? styles.occupancySegmentLive
                              : segment.phase === 'completed'
                              ? styles.occupancySegmentDone
                              : ''
                          }`}
                          style={{
                            left: `${segment.leftPct}%`,
                            width: `${segment.widthPct}%`,
                          }}
                          title={`${segment.startTime} – ${segment.endTime} hs (${segment.durationLabel})${
                            segment.clientName ? ` · ${segment.clientName}` : ''
                          }`}
                        />
                      ))}
                      {day.nowMarkerPct !== null && day.nowTimeLabel && (
                        <span
                          className={styles.occupancyNowMarker}
                          style={{ left: `${day.nowMarkerPct}%` }}
                          title={CONFIRMED_AGENDA_TEXTS.timeline.nowMarker(day.nowTimeLabel)}
                        />
                      )}
                    </div>
                    <span className={styles.occupancyEdgeTime}>
                      {day.dayEndTime}
                      {day.dayEndCrossesMidnight
                        ? ` ${CONFIRMED_AGENDA_TEXTS.timeline.nextDaySuffix}`
                        : ''}
                    </span>
                  </div>
                )}
              </button>

              <div
                id={panelId}
                className={`${styles.dayPanel} ${expanded ? styles.dayPanelOpen : ''}`}
                aria-hidden={!expanded}
              >
                <div className={styles.dayPanelInner}>
                  <div className={styles.timelineList}>
                    {shouldCollapseCompleted && (
                      <div className={styles.completedSection}>
                        <button
                          type="button"
                          className={styles.completedToggleBtn}
                          onClick={() => toggleCompletedDay(day.dateKey)}
                          aria-expanded={isCompletedVisible}
                        >
                          <span className={styles.completedToggleLeft}>
                            <History size={14} strokeWidth={1.75} aria-hidden="true" />
                            <span>
                              {isCompletedVisible
                                ? CONFIRMED_AGENDA_TEXTS.timeline.hideCompleted(
                                    completedEntries.length
                                  )
                                : CONFIRMED_AGENDA_TEXTS.timeline.showCompleted(
                                    completedEntries.length
                                  )}
                            </span>
                          </span>
                          {isCompletedVisible ? (
                            <ChevronUp size={14} strokeWidth={1.8} aria-hidden="true" />
                          ) : (
                            <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
                          )}
                        </button>

                        {isCompletedVisible && (
                          <div className={styles.completedBlocksWrap}>
                            {renderTimelineBlocks(completedBlocks, day.nowTimeLabel, true)}
                          </div>
                        )}

                        {boundaryConnector?.kind === 'free' &&
                          (isCompletedVisible ? (
                            renderFreeGapBand(
                              boundaryConnector,
                              day.nowTimeLabel,
                              `boundary-gap-${day.dateKey}`
                            )
                          ) : boundaryConnector.containsNow && day.nowTimeLabel ? (
                            <div className={styles.nowDividerRowStandalone} role="status">
                              <span className={styles.nowDividerDot} aria-hidden="true" />
                              <span className={styles.nowDividerLabel}>
                                {CONFIRMED_AGENDA_TEXTS.timeline.nowMarker(day.nowTimeLabel)}
                              </span>
                              <span className={styles.nowDividerLine} aria-hidden="true" />
                            </div>
                          ) : null)}
                      </div>
                    )}

                    {renderTimelineBlocks(activeBlocks, day.nowTimeLabel, false)}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default ConfirmedAgenda;
