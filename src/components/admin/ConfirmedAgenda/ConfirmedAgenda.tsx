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
import { resolveSlotFinancials } from '../../../services/bookingHelper';
import { buildAgendaDayTimeline } from '../../../services/agendaTimeline';
import Button from '../../common/Button/Button';
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
        return (
          (s.clientData?.name && s.clientData.name.toLowerCase().includes(query)) ||
          (s.clientData?.email && s.clientData.email.toLowerCase().includes(query)) ||
          (s.clientData?.selectedService && s.clientData.selectedService.toLowerCase().includes(query)) ||
          (s.clientData?.notes && s.clientData.notes.toLowerCase().includes(query)) ||
          (s.serviceName && s.serviceName.toLowerCase().includes(query)) ||
          (s.clientData?.phone && s.clientData.phone.includes(query)) ||
          matchesServices
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
          <button
            type="button"
            className={styles.toggleAllBtn}
            onClick={handleToggleAllDays}
          >
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
                    <span
                      className={styles.holidayPill}
                      title={formatHolidaySummary(holiday)}
                    >
                      Feriado · {holiday.name}
                    </span>
                  )}
                  <span className={styles.dayCountPill}>
                    {CONFIRMED_AGENDA_TEXTS.dateHeader.slotCount(day.entries.length)}
                  </span>
                </div>

                <div className={styles.dayMetaRight}>
                  <div className={styles.dayMetaCluster}>
                    {day.dayStartTime && day.dayEndTime && (
                      <span className={styles.daySpanText}>
                        <Clock size={12} strokeWidth={1.75} aria-hidden="true" />
                        {CONFIRMED_AGENDA_TEXTS.dateHeader.daySpan(
                          day.dayStartTime,
                          day.dayEndTime,
                          day.dayEndCrossesMidnight
                        )}
                      </span>
                    )}
                    {day.totalOccupiedLabel && (
                      <span className={styles.dayOccupiedPill}>
                        {CONFIRMED_AGENDA_TEXTS.dateHeader.occupiedLabel(day.totalOccupiedLabel)}
                      </span>
                    )}
                    {day.totalPendingBalance > 0 && (
                      <span className={styles.dayPendingPill}>
                        {CONFIRMED_AGENDA_TEXTS.dateHeader.pendingTotalLabel(
                          day.totalPendingBalance.toLocaleString('es-AR')
                        )}
                      </span>
                    )}
                  </div>

                  <span className={styles.dayChevron} aria-hidden="true">
                    {expanded ? (
                      <ChevronUp size={16} strokeWidth={1.75} />
                    ) : (
                      <ChevronDown size={16} strokeWidth={1.75} />
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
                    {day.dayEndCrossesMidnight ? ` ${CONFIRMED_AGENDA_TEXTS.timeline.nextDaySuffix}` : ''}
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
              {day.entries.map((entry) => {
                const { slot } = entry;
                const waNumber = getCleanPhoneForWhatsApp(slot.clientData?.phone);
                const financials = resolveSlotFinancials(slot);
                const isLive = entry.phase === 'in_progress';
                const isCompletedToday = entry.phase === 'completed';

                return (
                  <React.Fragment key={slot.id}>
                    <div
                      className={`${styles.timelineItem} ${
                        isLive ? styles.timelineItemLive : ''
                      } ${isCompletedToday ? styles.timelineItemDone : ''}`}
                    >
                      <div
                        className={styles.timelineRail}
                        aria-label={CONFIRMED_AGENDA_TEXTS.timeline.rangeAria(
                          entry.startTime,
                          entry.endTime,
                          entry.durationLabel
                        )}
                      >
                        <div className={styles.railEndpoint}>
                          <span className={styles.railStartTime}>{entry.startTime}</span>
                          <span className={styles.railNodeStart} aria-hidden="true" />
                        </div>

                        <div className={styles.railSpanSegment}>
                          {entry.durationLabel && (
                            <span className={styles.railDurationTag}>{entry.durationLabel}</span>
                          )}
                          <span className={styles.railSpanLine} aria-hidden="true" />
                        </div>

                        {entry.endTime ? (
                          <div className={styles.railEndpoint}>
                            <span className={styles.railEndTime}>
                              {entry.endTime}
                              {entry.crossesMidnight && (
                                <span className={styles.nextDaySuperscript}>
                                  {CONFIRMED_AGENDA_TEXTS.timeline.nextDaySuffix}
                                </span>
                              )}
                            </span>
                            <span className={styles.railNodeEnd} aria-hidden="true" />
                          </div>
                        ) : (
                          <div className={styles.railEndpoint}>
                            <span className={styles.railEndFallback}>
                              {CONFIRMED_AGENDA_TEXTS.card.timeSuffix}
                            </span>
                            <span className={styles.railNodeEnd} aria-hidden="true" />
                          </div>
                        )}
                      </div>

                      <article
                        className={`${styles.agendaCard} ${
                          isLive ? styles.agendaCardLive : ''
                        } ${isCompletedToday ? styles.agendaCardDone : ''}`}
                      >
                        {isLive && entry.progressPercent !== null && (
                          <div className={styles.liveProgressTrack} aria-hidden="true">
                            <div
                              className={styles.liveProgressFill}
                              style={{ transform: `scaleX(${entry.progressPercent / 100})` }}
                            />
                          </div>
                        )}

                        <div className={styles.mobileIntervalBar}>
                          <span className={styles.mobileIntervalStart}>
                            <span className={styles.mobileDotStart} aria-hidden="true" />
                            {entry.startTime}
                          </span>
                          <span className={styles.mobileIntervalLine} aria-hidden="true" />
                          {entry.durationLabel && (
                            <span className={styles.mobileDurationPill}>
                              <Clock size={11} strokeWidth={1.75} aria-hidden="true" />
                              {entry.durationLabel}
                            </span>
                          )}
                          <span className={styles.mobileIntervalLine} aria-hidden="true" />
                          {entry.endTime ? (
                            <span className={styles.mobileIntervalEnd}>
                              {entry.endTime}
                              {entry.crossesMidnight
                                ? ` ${CONFIRMED_AGENDA_TEXTS.timeline.nextDaySuffix}`
                                : ''}
                              <span className={styles.mobileDotEnd} aria-hidden="true" />
                            </span>
                          ) : (
                            <span className={styles.mobileIntervalEnd}>
                              {CONFIRMED_AGENDA_TEXTS.card.timeSuffix}
                            </span>
                          )}
                        </div>

                        <div className={styles.agendaCardBody}>
                          <div className={styles.clientCol}>
                            <div className={styles.clientNameRow}>
                              <span className={styles.clientName}>
                                {slot.clientData?.name || CONFIRMED_AGENDA_TEXTS.card.defaultClientName}
                              </span>

                              {isLive && (
                                <span className={styles.liveBadge}>
                                  <span className={styles.liveDot} aria-hidden="true" />
                                  {CONFIRMED_AGENDA_TEXTS.timeline.inProgress}
                                  {entry.remainingMinutes !== null && (
                                    <span>
                                      {' '}
                                      · {CONFIRMED_AGENDA_TEXTS.timeline.remaining(entry.remainingMinutes)}
                                    </span>
                                  )}
                                </span>
                              )}

                              {isCompletedToday && (
                                <span className={styles.finishedBadge}>
                                  {CONFIRMED_AGENDA_TEXTS.timeline.finishedToday}
                                </span>
                              )}
                            </div>

                            {(slot.clientData?.selectedService?.trim() || slot.serviceName?.trim()) && (
                              <span className={styles.serviceText}>
                                {slot.clientData?.selectedService?.trim() || slot.serviceName?.trim()}
                              </span>
                            )}

                            {((slot.clientData?.selectedServices && slot.clientData.selectedServices.length > 0) ||
                              (slot.clientData?.selectedRules && slot.clientData.selectedRules.length > 0) ||
                              (slot.services && slot.services.length > 0) ||
                              (slot.rules && slot.rules.length > 0) ||
                              (slot.clientData?.bookedServices && slot.clientData.bookedServices.length > 0) ||
                              (slot.clientData?.selectedExtras && slot.clientData.selectedExtras.length > 0)) && (
                              <div className={styles.rulesRow}>
                                {(
                                  slot.clientData?.selectedServices ||
                                  slot.clientData?.selectedRules ||
                                  slot.services ||
                                  slot.rules ||
                                  []
                                ).map((r, idx) => (
                                  <span key={idx} className={styles.ruleBadge}>
                                    {typeof r === 'string' ? r : r.name}
                                  </span>
                                ))}
                                {slot.clientData?.bookedServices && slot.clientData.bookedServices.length > 0 ? (
                                  slot.clientData.bookedServices.map((bs) => {
                                    const checkedExtras = (bs.extras || []).filter((e) => e.selected);
                                    if (checkedExtras.length === 0) return null;
                                    return (
                                      <span key={bs.serviceId} className={styles.extrasTag}>
                                        {bs.name}:{' '}
                                        {checkedExtras
                                          .map((e) => `${e.name} (+$${(e.price || 0).toLocaleString('es-AR')})`)
                                          .join(', ')}
                                      </span>
                                    );
                                  })
                                ) : slot.clientData?.selectedExtras && slot.clientData.selectedExtras.length > 0 ? (
                                  <span className={styles.extrasTag}>
                                    Extras:{' '}
                                    {slot.clientData.selectedExtras
                                      .map((e) => `${e.name} (+$${(e.price || 0).toLocaleString('es-AR')})`)
                                      .join(', ')}
                                  </span>
                                ) : null}
                              </div>
                            )}

                            <div className={styles.contactRow}>
                              {slot.clientData?.email && (
                                <a
                                  href={`mailto:${slot.clientData.email}`}
                                  className={styles.contactLink}
                                  title={CONFIRMED_AGENDA_TEXTS.card.sendEmailTitle}
                                >
                                  <Mail size={13} aria-hidden="true" />
                                  {slot.clientData.email}
                                </a>
                              )}

                              {slot.clientData?.phone && (
                                <span className={styles.contactLink}>
                                  <Phone size={13} aria-hidden="true" />
                                  {slot.clientData.phone}
                                </span>
                              )}

                              {waNumber && (
                                <a
                                  href={`https://wa.me/${waNumber}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`${styles.contactLink} ${styles.whatsAppLink}`}
                                  title={CONFIRMED_AGENDA_TEXTS.card.openWhatsAppTitle}
                                >
                                  <MessageCircle size={14} aria-hidden="true" />
                                  {CONFIRMED_AGENDA_TEXTS.card.whatsAppLabel}
                                </a>
                              )}
                            </div>

                            {slot.clientData?.notes && (
                              <div className={styles.notesTag}>
                                <FileText size={13} className={styles.notesIcon} aria-hidden="true" />
                                <span>{slot.clientData.notes}</span>
                              </div>
                            )}
                          </div>

                          <div className={styles.paymentCol}>
                            {financials.state === 'pending_balance' &&
                              financials.pendingBalance !== null &&
                              financials.estimatedTotal !== null && (
                                <div className={styles.pendingBalanceBox}>
                                  <span className={styles.pendingBalanceLabel}>
                                    {CONFIRMED_AGENDA_TEXTS.card.pendingBalanceLabel}
                                  </span>
                                  <span className={styles.pendingBalanceAmount}>
                                    ${financials.pendingBalance.toLocaleString('es-AR')}
                                  </span>
                                </div>
                              )}

                            {financials.state === 'paid_in_full' && (
                              <div className={styles.settledBalanceBox}>
                                <span className={styles.settledBalanceLabel}>
                                  {CONFIRMED_AGENDA_TEXTS.card.pendingBalanceLabel}
                                </span>
                                <span className={styles.settledBalanceAmount}>
                                  $0 · {CONFIRMED_AGENDA_TEXTS.card.paidInFullLabel}
                                </span>
                              </div>
                            )}

                            {financials.state === 'deposit_only' && (
                              <div className={styles.undefinedTotalBox}>
                                <span className={styles.undefinedTotalLabel}>
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
                                {CONFIRMED_AGENDA_TEXTS.card.breakdownLine(
                                  financials.estimatedTotal.toLocaleString('es-AR'),
                                  financials.paidDeposit.toLocaleString('es-AR')
                                )}
                              </span>
                            )}

                            {slot.paymentId && (
                              <span className={styles.mpReceipt}>
                                {CONFIRMED_AGENDA_TEXTS.card.mpReceiptPrefix}
                                {slot.paymentId}
                              </span>
                            )}

                            {onCancel && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onCancel(slot.id)}
                                leftIcon={<Ban size={12} />}
                                title={CONFIRMED_AGENDA_TEXTS.card.cancelTitle}
                                style={{ marginTop: 'var(--space-1)', color: 'var(--color-danger-text)' }}
                              >
                                {CONFIRMED_AGENDA_TEXTS.card.cancelButton}
                              </Button>
                            )}
                          </div>
                        </div>
                      </article>
                    </div>

                    {entry.connectorAfter && (
                      <div
                        className={`${styles.timelineConnector} ${
                          entry.connectorAfter.kind === 'back_to_back'
                            ? styles.connectorBackToBack
                            : entry.connectorAfter.kind === 'overlap'
                            ? styles.connectorOverlap
                            : styles.connectorFree
                        }`}
                      >
                        <div className={styles.connectorRailCol} aria-hidden="true">
                          <span className={styles.connectorLine} />
                        </div>

                        <div className={styles.connectorContent}>
                          {entry.connectorAfter.kind === 'free' && (
                            <span className={styles.freeGapPill}>
                              <Clock size={11} strokeWidth={1.75} aria-hidden="true" />
                              {CONFIRMED_AGENDA_TEXTS.timeline.freeGap(
                                entry.connectorAfter.label,
                                entry.connectorAfter.fromTime,
                                entry.connectorAfter.toTime
                              )}
                            </span>
                          )}

                          {entry.connectorAfter.kind === 'back_to_back' && (
                            <span className={styles.backToBackPill}>
                              {CONFIRMED_AGENDA_TEXTS.timeline.backToBack}
                            </span>
                          )}

                          {entry.connectorAfter.kind === 'overlap' && (
                            <span className={styles.overlapPill}>
                              <AlertTriangle size={12} strokeWidth={1.75} aria-hidden="true" />
                              {CONFIRMED_AGENDA_TEXTS.timeline.overlap(entry.connectorAfter.label)}
                            </span>
                          )}

                          {entry.connectorAfter.containsNow && day.nowTimeLabel && (
                            <div className={styles.nowDividerRow} role="status">
                              <span className={styles.nowDividerDot} aria-hidden="true" />
                              <span className={styles.nowDividerLabel}>
                                {CONFIRMED_AGENDA_TEXTS.timeline.nowMarker(day.nowTimeLabel)}
                              </span>
                              <span className={styles.nowDividerLine} aria-hidden="true" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
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
