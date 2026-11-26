import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Calendar,
  Clock,
  Lock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Search,
  X,
  Sun,
  Sunset,
  CalendarDays,
  Zap,
  LayoutGrid,
  Plus,
} from 'lucide-react';
import type { Slot } from '../../types';
import { useSlots } from '../../hooks/useSlots';
import { useOwnerInfo } from '../../context/OwnerInfoContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { useTenant } from '../../context/TenantContext';
import { FIELD_LIMITS } from '../../config/fieldLimits';
import {
  addDaysBusinessDateString,
  formatBusinessDateKey,
  formatBusinessTime,
  formatDateKeyParts,
  formatDateKeyShort,
  getBusinessHour,
  getTodayBusinessDateString,
} from '../../utils/dateUtils';
import {
  formatHolidaySummary,
  getHolidayInfo,
  type HolidayInfo,
} from '../../utils/holidays';
import SlotCard from '../../components/slots/SlotCard/SlotCard';
import BookingModal from '../../components/slots/BookingModal/BookingModal';
import PortfolioGallery from '../../components/portfolio/PortfolioGallery/PortfolioGallery';
import ClientHero from '../../components/client/ClientHero/ClientHero';
import { normalizeTenantAppearance } from '../../services/themeEngine';
import Button from '../../components/common/Button/Button';
import Loader from '../../components/common/Loader/Loader';
import AlertModal from '../../components/common/AlertModal';
import { CLIENT_VIEW_TEXTS } from '../../texts';
import styles from './ClientView.module.css';

export const ClientView: React.FC = () => {
  const { slug, timezone, appearance: bootstrapAppearance } = useTenant();
  const { slots, blockingSlots, loading, error, bookAndCheckout } = useSlots({ mode: 'available' });
  const [selectedSlotSnapshot, setSelectedSlotSnapshot] = useState<Slot | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [dismissedErrorMsg, setDismissedErrorMsg] = useState<string | null>(null);

  const [viewDensity, setViewDensity] = useState<'cards' | 'compact'>('cards');
  const INITIAL_VISIBLE_DAYS = 4;
  const INITIAL_VISIBLE_PORTFOLIO = 6;
  const [visibleDaysCount, setVisibleDaysCount] = useState<number>(INITIAL_VISIBLE_DAYS);
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const calendarStripRef = useRef<HTMLDivElement>(null);
  const [stripScrollState, setStripScrollState] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
    thumbWidthPct: 100,
    thumbShiftPct: 0,
  });

  const bookingSectionRef = useRef<HTMLDivElement>(null);
  const slotsSectionRef = useRef<HTMLDivElement>(null);

  const filterKey = `${searchQuery}|${selectedDateFilter}|${selectedPeriodFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setVisibleDaysCount(INITIAL_VISIBLE_DAYS);
  }

  const updateStripScrollState = useCallback(() => {
    const el = calendarStripRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const hasOverflow = maxScroll > 2;
    const canScrollLeft = hasOverflow && scrollLeft > 6;
    const canScrollRight = hasOverflow && scrollLeft < maxScroll - 6;
    const thumbWidthPct = hasOverflow
      ? Math.min(100, Math.max(20, (clientWidth / scrollWidth) * 100))
      : 100;
    const progress = hasOverflow ? Math.min(1, Math.max(0, scrollLeft / maxScroll)) : 0;
    const thumbShiftPct =
      hasOverflow && thumbWidthPct < 100
        ? progress * ((100 - thumbWidthPct) / thumbWidthPct) * 100
        : 0;

    setStripScrollState((prev) => {
      if (
        prev.hasOverflow === hasOverflow &&
        prev.canScrollLeft === canScrollLeft &&
        prev.canScrollRight === canScrollRight &&
        Math.abs(prev.thumbWidthPct - thumbWidthPct) < 0.25 &&
        Math.abs(prev.thumbShiftPct - thumbShiftPct) < 0.25
      ) {
        return prev;
      }
      return {
        hasOverflow,
        canScrollLeft,
        canScrollRight,
        thumbWidthPct,
        thumbShiftPct,
      };
    });
  }, []);

  useEffect(() => {
    const el = calendarStripRef.current;
    if (!el) return;

    const rafId = window.requestAnimationFrame(updateStripScrollState);
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateStripScrollState)
        : null;
    observer?.observe(el);
    el.addEventListener('scroll', updateStripScrollState, { passive: true });
    window.addEventListener('resize', updateStripScrollState);
    return () => {
      window.cancelAnimationFrame(rafId);
      observer?.disconnect();
      el.removeEventListener('scroll', updateStripScrollState);
      window.removeEventListener('resize', updateStripScrollState);
    };
  }, [updateStripScrollState]);

  const handleScrollStrip = (direction: 'left' | 'right') => {
    const el = calendarStripRef.current;
    if (!el) return;
    const delta = 280;
    el.scrollBy({ left: direction === 'left' ? -delta : delta, behavior: 'smooth' });
  };

  const { items: portfolioItems, loading: portfolioLoading } = usePortfolio();
  const { owner, rawOwner, defaults, isLiveSynced } = useOwnerInfo();

  const resolvedAppearance = useMemo(
    () =>
      normalizeTenantAppearance(
        isLiveSynced ? rawOwner?.appearance : (rawOwner?.appearance ?? bootstrapAppearance)
      ),
    [isLiveSynced, rawOwner?.appearance, bootstrapAppearance]
  );

  const clientAvailableSlots = slots;

  const liveSelectedSlot = useMemo(() => {
    if (!selectedSlotId) return null;
    return clientAvailableSlots.find((s) => s.id === selectedSlotId) ?? null;
  }, [clientAvailableSlots, selectedSlotId]);

  const activeModalSlot = liveSelectedSlot ?? selectedSlotSnapshot;
  const isModalSlotUnavailable = Boolean(isModalOpen && selectedSlotId && !liveSelectedSlot);

  const searchedSlots = useMemo(() => {
    if (!searchQuery.trim()) return clientAvailableSlots;
    const q = searchQuery.toLowerCase().trim();

    return clientAvailableSlots.filter((slot) => {
      const dateKey = formatBusinessDateKey(slot.datetime, timezone);
      if (!dateKey) return false;

      const parts = formatDateKeyParts(dateKey);
      const weekdayLong = parts.weekdayLong.toLowerCase();
      const weekdayShort = parts.weekdayShort.toLowerCase();
      const monthLong = parts.monthLong.toLowerCase();
      const monthShort = parts.monthShort.toLowerCase();
      const dayNum = parts.dayNum;

      const hour24 = getBusinessHour(slot.datetime, timezone);
      const timeStr = formatBusinessTime(slot.datetime, timezone);

      const isMorning = hour24 < 13;
      const periodMatch =
        (q.includes('mañana') && isMorning) ||
        (q.includes('tarde') && !isMorning);

      const serviceName = slot.serviceName?.toLowerCase() ?? '';
      const servicesList =
        slot.services
          ?.map((s) => {
            if (typeof s === 'string') return s.toLowerCase();
            const extrasText = s.extras?.map((e) => e.name.toLowerCase()).join(' ') || '';
            return `${s.name.toLowerCase()} ${extrasText}`;
          })
          .join(' ') ?? '';

      return (
        weekdayLong.includes(q) ||
        weekdayShort.includes(q) ||
        monthLong.includes(q) ||
        monthShort.includes(q) ||
        dayNum === q ||
        timeStr.includes(q) ||
        hour24.toString() === q ||
        periodMatch ||
        serviceName.includes(q) ||
        servicesList.includes(q)
      );
    });
  }, [clientAvailableSlots, searchQuery, timezone]);

  const periodFilteredSlots = useMemo(() => {
    if (selectedPeriodFilter === 'all') return searchedSlots;
    return searchedSlots.filter((slot) => {
      const d = new Date(slot.datetime);
      if (isNaN(d.getTime())) return false;
      const hour = getBusinessHour(d, timezone);
      return selectedPeriodFilter === 'morning' ? hour < 13 : hour >= 13;
    });
  }, [searchedSlots, selectedPeriodFilter, timezone]);

  const availableDates = useMemo(() => {
    const datesMap = new Map<
      string,
      {
        rawDate: string;
        weekdayShort: string;
        dayNum: string;
        monthShort: string;
        label: string;
        count: number;
        isToday: boolean;
        isTomorrow: boolean;
        holiday: HolidayInfo | null;
      }
    >();

    const todayStr = getTodayBusinessDateString(timezone);
    const tomorrowStr = addDaysBusinessDateString(1, timezone);

    periodFilteredSlots.forEach((s) => {
      const dateKey = formatBusinessDateKey(s.datetime, timezone);
      if (!dateKey) return;

      if (!datesMap.has(dateKey)) {
        const parts = formatDateKeyParts(dateKey);
        datesMap.set(dateKey, {
          rawDate: dateKey,
          weekdayShort: parts.weekdayShort,
          dayNum: parts.dayNum,
          monthShort: parts.monthShort,
          label: formatDateKeyShort(dateKey),
          count: 1,
          isToday: dateKey === todayStr,
          isTomorrow: dateKey === tomorrowStr,
          holiday: getHolidayInfo(dateKey),
        });
      } else {
        datesMap.get(dateKey)!.count += 1;
      }
    });

    return Array.from(datesMap.values()).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  }, [periodFilteredSlots, timezone]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(updateStripScrollState);
    return () => window.cancelAnimationFrame(rafId);
  }, [updateStripScrollState, availableDates.length, periodFilteredSlots.length]);

  const filteredSlots = useMemo(() => {
    if (selectedDateFilter === 'all') return periodFilteredSlots;
    return periodFilteredSlots.filter((slot) => {
      const d = new Date(slot.datetime);
      if (isNaN(d.getTime())) return false;
      return formatBusinessDateKey(d, timezone) === selectedDateFilter;
    });
  }, [periodFilteredSlots, selectedDateFilter, timezone]);

  const groupedSlots = useMemo(() => {
    const groupsMap = new Map<
      string,
      {
        dateKey: string;
        dateLabel: string;
        weekday: string;
        fullDate: string;
        isToday: boolean;
        isTomorrow: boolean;
        holiday: HolidayInfo | null;
        morningSlots: Slot[];
        afternoonSlots: Slot[];
        slots: Slot[];
      }
    >();

    const todayStr = getTodayBusinessDateString(timezone);
    const tomorrowStr = addDaysBusinessDateString(1, timezone);

    const sorted = [...filteredSlots].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    sorted.forEach((slot) => {
      const dateKey = formatBusinessDateKey(slot.datetime, timezone);
      if (!dateKey) return;

      if (!groupsMap.has(dateKey)) {
        const parts = formatDateKeyParts(dateKey);
        const dateLabel = `${parts.weekdayLong.charAt(0).toUpperCase() + parts.weekdayLong.slice(1)}, ${parts.fullDate}`;

        groupsMap.set(dateKey, {
          dateKey,
          dateLabel,
          weekday: parts.weekdayLong,
          fullDate: parts.fullDate,
          isToday: dateKey === todayStr,
          isTomorrow: dateKey === tomorrowStr,
          holiday: getHolidayInfo(dateKey),
          morningSlots: [],
          afternoonSlots: [],
          slots: [slot],
        });
      } else {
        groupsMap.get(dateKey)!.slots.push(slot);
      }

      const hour = getBusinessHour(slot.datetime, timezone);
      if (hour < 13) {
        groupsMap.get(dateKey)!.morningSlots.push(slot);
      } else {
        groupsMap.get(dateKey)!.afternoonSlots.push(slot);
      }
    });

    return Array.from(groupsMap.values());
  }, [filteredSlots, timezone]);

  const isDayCollapsed = useCallback(
    (dateKey: string, index: number): boolean => {
      if (selectedDateFilter !== 'all') return false;
      if (collapsedDays[dateKey] !== undefined) return collapsedDays[dateKey];
      return index >= 2;
    },
    [collapsedDays, selectedDateFilter]
  );

  const toggleDayCollapse = (dateKey: string, index: number) => {
    const current = isDayCollapsed(dateKey, index);
    setCollapsedDays((prev) => ({
      ...prev,
      [dateKey]: !current,
    }));
  };

  const handleExpandAllDays = () => {
    const updated: Record<string, boolean> = {};
    groupedSlots.forEach((g) => {
      updated[g.dateKey] = false;
    });
    setCollapsedDays(updated);
  };

  const handleCollapseAllDays = () => {
    const updated: Record<string, boolean> = {};
    groupedSlots.forEach((g) => {
      updated[g.dateKey] = true;
    });
    setCollapsedDays(updated);
  };

  const areAllDaysExpanded = useMemo(() => {
    if (groupedSlots.length <= 1) return true;
    return groupedSlots.every((g, idx) => !isDayCollapsed(g.dateKey, idx));
  }, [groupedSlots, isDayCollapsed]);

  const displayedGroups = useMemo(() => {
    if (selectedDateFilter !== 'all') return groupedSlots;
    return groupedSlots.slice(0, visibleDaysCount);
  }, [groupedSlots, selectedDateFilter, visibleDaysCount]);

  const remainingDaysCount = useMemo(() => {
    if (selectedDateFilter !== 'all') return 0;
    return Math.max(0, groupedSlots.length - visibleDaysCount);
  }, [groupedSlots.length, selectedDateFilter, visibleDaysCount]);

  const SLOTS_LIMIT_CARDS = 6;
  const SLOTS_LIMIT_COMPACT = 12;

  const toggleSectionExpansion = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const renderSlotsGrid = (slotsList: Slot[], sectionKey: string) => {
    const limit = viewDensity === 'cards' ? SLOTS_LIMIT_CARDS : SLOTS_LIMIT_COMPACT;
    const isExpanded = Boolean(expandedSections[sectionKey]);
    const hasExcess = slotsList.length > limit;
    const visibleSlots = hasExcess && !isExpanded ? slotsList.slice(0, limit) : slotsList;

    return (
      <>
        {viewDensity === 'compact' ? (
          <div className={styles.quickSlotsGrid}>
            {visibleSlots.map((slot) => {
              const timeStr = formatBusinessTime(slot.datetime, timezone);
              const singleServiceName =
                slot.services && slot.services.length === 1
                  ? typeof slot.services[0] === 'string'
                    ? slot.services[0]
                    : slot.services[0].name
                  : '';
              const visibleServiceName = slot.serviceName?.trim() || singleServiceName;
              const ariaServiceName = visibleServiceName || 'Turno disponible';

              return (
                <button
                  key={slot.id}
                  type="button"
                  className={styles.quickSlotChip}
                  onClick={() => handleOpenBooking(slot)}
                  aria-label={CLIENT_VIEW_TEXTS.quickSlot.bookAria(timeStr, ariaServiceName)}
                >
                  <div className={styles.quickSlotTimeRow}>
                    <Clock size={14} strokeWidth={1.5} className={styles.quickSlotClock} aria-hidden="true" />
                    <span className={styles.quickSlotTime}>{timeStr} hs</span>
                  </div>
                  {visibleServiceName && (
                    <span className={styles.quickSlotService} title={visibleServiceName}>
                      {visibleServiceName}
                    </span>
                  )}
                  <div className={styles.quickSlotFooter}>
                    <div className={styles.quickSlotDepositWrap}>
                      <span className={styles.quickSlotDepositLabel}>
                        {CLIENT_VIEW_TEXTS.quickSlot.depositPrefix}
                      </span>
                      <span className={styles.quickSlotDepositAmount}>
                        ${slot.depositAmount.toLocaleString('es-AR')}
                      </span>
                    </div>
                    <span className={styles.quickSlotActionBadge}>
                      Reservar <ArrowRight size={12} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className={styles.slotsGrid}>
            {visibleSlots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                onBook={handleOpenBooking}
                isAdmin={false}
                hideDatePill={true}
              />
            ))}
          </div>
        )}

        {hasExcess && (
          <div className={styles.showMoreSlotsWrapper}>
            <button
              type="button"
              className={styles.showMoreSlotsBtn}
              onClick={() => toggleSectionExpansion(sectionKey)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={16} strokeWidth={1.5} aria-hidden="true" />
                  <span>{CLIENT_VIEW_TEXTS.accordion.showLessSlots}</span>
                </>
              ) : (
                <>
                  <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                  <span>
                    {CLIENT_VIEW_TEXTS.accordion.showMoreSlots(slotsList.length - limit)}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </>
    );
  };

  const handleOpenBooking = (slot: Slot) => {
    setSelectedSlotId(slot.id);
    setSelectedSlotSnapshot(slot);
    setIsModalOpen(true);
  };

  const handleCloseBooking = () => {
    setIsModalOpen(false);
    setSelectedSlotId(null);
    setSelectedSlotSnapshot(null);
  };

  const scrollToSlots = () => {
    slotsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedDateFilter !== 'all' || selectedPeriodFilter !== 'all'
  );

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedDateFilter('all');
    setSelectedPeriodFilter('all');
  };

  return (
    <div className="animate-fade-in">
      <ClientHero
        appearance={resolvedAppearance}
        owner={owner}
        defaults={defaults}
        slug={slug}
        onExploreSlots={scrollToSlots}
      />

      <div className="container">
        <div ref={bookingSectionRef}>
          <BookingModal
            isOpen={isModalOpen}
            onClose={handleCloseBooking}
            slot={activeModalSlot}
            isSlotUnavailable={isModalSlotUnavailable}
            onCheckout={bookAndCheckout}
            existingSlots={blockingSlots}
          />
        </div>

        <section ref={slotsSectionRef} className={styles.bookingHubCard}>
          <div className={styles.bookingHubHeader}>
            <div className={styles.bookingHubTitleGroup}>
              <h2 className={styles.bookingHubTitle}>
                <span>{CLIENT_VIEW_TEXTS.slotsSection.title}</span>
                <span className={styles.slotCountBadge}>
                  {loading
                    ? CLIENT_VIEW_TEXTS.slotsSection.loadingCount
                    : CLIENT_VIEW_TEXTS.slotsSection.countBadge(filteredSlots.length)}
                </span>
              </h2>
              <p className={styles.bookingHubSubtitle}>
                {CLIENT_VIEW_TEXTS.slotsSection.subtitle}
              </p>
            </div>
          </div>

          <div className={styles.bookingStepBlock}>
            <div className={styles.stepIndicatorHeader}>
              <span className={styles.stepDot}>1</span>
              <span className={styles.stepLabelText}>{CLIENT_VIEW_TEXTS.slotsSection.step1}</span>
            </div>

            {availableDates.length > 0 && (
              <div className={styles.calendarStripWrapper}>
                <div
                  className={styles.calendarStripContainer}
                  data-scroll-left={stripScrollState.canScrollLeft ? 'true' : 'false'}
                  data-scroll-right={stripScrollState.canScrollRight ? 'true' : 'false'}
                >
                  {stripScrollState.canScrollLeft && (
                    <button
                      type="button"
                      className={`${styles.stripScrollBtn} ${styles.stripScrollLeft}`}
                      onClick={() => handleScrollStrip('left')}
                      aria-label={CLIENT_VIEW_TEXTS.dateStrip.prevAria}
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}

                  <div
                    ref={calendarStripRef}
                    className={`${styles.calendarStrip} ${
                      stripScrollState.hasOverflow ? styles.calendarStripOverflow : ''
                    }`}
                    onScroll={updateStripScrollState}
                  >
                    <button
                      type="button"
                      className={`${styles.calendarCard} ${styles.allDaysCard} ${selectedDateFilter === 'all' ? styles.activeCalendarCard : ''
                        }`}
                      onClick={() => setSelectedDateFilter('all')}
                      aria-pressed={selectedDateFilter === 'all'}
                    >
                      <span className={styles.calendarCardWeekday}>
                        <CalendarDays size={14} />
                      </span>
                      <span className={styles.calendarCardDayNum}>
                        {CLIENT_VIEW_TEXTS.dateStrip.allDays}
                      </span>
                      <span className={styles.calendarCardSlotCount}>
                        {periodFilteredSlots.length}{' '}
                        {periodFilteredSlots.length === 1 ? 'turno' : 'turnos'}
                      </span>
                    </button>

                    {availableDates.map((item) => {
                      const isSelected = selectedDateFilter === item.rawDate;
                      const holidaySummary = item.holiday
                        ? formatHolidaySummary(item.holiday)
                        : undefined;
                      return (
                        <button
                          key={item.rawDate}
                          type="button"
                          className={`${styles.calendarCard} ${
                            item.holiday ? styles.calendarCardHoliday : ''
                          } ${isSelected ? styles.activeCalendarCard : ''}`}
                          onClick={() => setSelectedDateFilter(item.rawDate)}
                          aria-pressed={isSelected}
                          title={holidaySummary}
                          aria-label={`${item.label} (${item.count} ${
                            item.count === 1 ? 'turno' : 'turnos'
                          })${holidaySummary ? ` — Feriado: ${holidaySummary}` : ''}`}
                        >
                          <span className={styles.calendarCardWeekday}>
                            {item.isToday
                              ? CLIENT_VIEW_TEXTS.dateStrip.today
                              : item.isTomorrow
                                ? CLIENT_VIEW_TEXTS.dateStrip.tomorrow
                                : item.weekdayShort}
                          </span>
                          <span className={styles.calendarCardDayNum}>{item.dayNum}</span>
                          <span className={styles.calendarCardMonth}>{item.monthShort}</span>
                          {item.holiday && (
                            <span className={styles.calendarHolidayTag}>Feriado</span>
                          )}
                          <span className={styles.calendarCardSlotCount}>
                            {item.count} {item.count === 1 ? 'turno' : 'turnos'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {stripScrollState.canScrollRight && (
                    <button
                      type="button"
                      className={`${styles.stripScrollBtn} ${styles.stripScrollRight}`}
                      onClick={() => handleScrollStrip('right')}
                      aria-label={CLIENT_VIEW_TEXTS.dateStrip.nextAria}
                    >
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>

                {stripScrollState.hasOverflow && (
                  <div className={styles.stripScrollIndicatorRow} aria-hidden="true">
                    <div className={styles.stripScrollTrack}>
                      <div
                        className={styles.stripScrollThumb}
                        style={{
                          width: `${stripScrollState.thumbWidthPct}%`,
                          transform: `translateX(${stripScrollState.thumbShiftPct}%)`,
                        }}
                      />
                    </div>
                    <span className={styles.stripScrollHint}>
                      {stripScrollState.canScrollLeft && <ChevronLeft size={12} strokeWidth={2} />}
                      <span>{CLIENT_VIEW_TEXTS.dateStrip.scrollHint}</span>
                      {stripScrollState.canScrollRight && <ChevronRight size={12} strokeWidth={2} />}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {!loading && clientAvailableSlots.length > 0 && (
            <div className={styles.bookingStepBlock}>
              <div className={styles.stepIndicatorHeader}>
                <span className={styles.stepDot}>2</span>
                <span className={styles.stepLabelText}>{CLIENT_VIEW_TEXTS.slotsSection.step2}</span>
              </div>

              <div className={styles.bookingToolbar}>
                <div className={styles.searchWrapper}>
                  <Search size={17} className={styles.searchIcon} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder={CLIENT_VIEW_TEXTS.search.placeholder}
                    value={searchQuery}
                    maxLength={FIELD_LIMITS.search.query.max}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label={CLIENT_VIEW_TEXTS.search.ariaLabel}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className={styles.clearSearchBtn}
                      onClick={() => setSearchQuery('')}
                      aria-label={CLIENT_VIEW_TEXTS.search.clearAriaLabel}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className={styles.toolbarControlsGroup}>
                  <div className={styles.periodSegmentedControl} role="group" aria-label="Filtrar por franja horaria">
                    <button
                      type="button"
                      className={`${styles.periodPill} ${selectedPeriodFilter === 'all' ? styles.activePeriodPill : ''}`}
                      onClick={() => setSelectedPeriodFilter('all')}
                    >
                      <Clock size={16} strokeWidth={1.5} aria-hidden="true" />
                      <span>{CLIENT_VIEW_TEXTS.periods.all}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.periodPill} ${selectedPeriodFilter === 'morning' ? styles.activePeriodPill : ''}`}
                      onClick={() => setSelectedPeriodFilter('morning')}
                    >
                      <Sun size={16} strokeWidth={1.5} aria-hidden="true" />
                      <span>{CLIENT_VIEW_TEXTS.periods.morning}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.periodPill} ${selectedPeriodFilter === 'afternoon' ? styles.activePeriodPill : ''}`}
                      onClick={() => setSelectedPeriodFilter('afternoon')}
                    >
                      <Sunset size={16} strokeWidth={1.5} aria-hidden="true" />
                      <span>{CLIENT_VIEW_TEXTS.periods.afternoon}</span>
                    </button>
                  </div>

                  <div className={styles.densitySegmentedControl} role="group" aria-label={CLIENT_VIEW_TEXTS.density.ariaLabel}>
                    <button
                      type="button"
                      className={`${styles.densityPill} ${viewDensity === 'cards' ? styles.activeDensityPill : ''}`}
                      onClick={() => setViewDensity('cards')}
                      title="Ver tarjetas completas con detalles"
                    >
                      <LayoutGrid size={16} strokeWidth={1.5} aria-hidden="true" />
                      <span>{CLIENT_VIEW_TEXTS.density.cards}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.densityPill} ${viewDensity === 'compact' ? styles.activeDensityPill : ''}`}
                      onClick={() => setViewDensity('compact')}
                      title="Ver horarios en formato rápido y compacto"
                    >
                      <Zap size={16} strokeWidth={1.5} aria-hidden="true" />
                      <span>{CLIENT_VIEW_TEXTS.density.compact}</span>
                    </button>
                  </div>
                </div>
              </div>

              {hasActiveFilters && (
                <div className={styles.filterFeedbackBar}>
                  <span className={styles.searchResultCount}>
                    {filteredSlots.length === 1
                      ? CLIENT_VIEW_TEXTS.search.foundSingular
                      : CLIENT_VIEW_TEXTS.search.foundPlural(filteredSlots.length)}
                  </span>
                  <button
                    type="button"
                    className={styles.resetFiltersBtn}
                    onClick={resetAllFilters}
                  >
                    {CLIENT_VIEW_TEXTS.search.resetFilters}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className={styles.bookingStepBlock}>
            <div className={styles.stepHeaderWithActions}>
              <div className={styles.stepIndicatorHeader}>
                <span className={styles.stepDot}>3</span>
                <span className={styles.stepLabelText}>{CLIENT_VIEW_TEXTS.slotsSection.step3}</span>
              </div>

              {!loading && filteredSlots.length > 0 && selectedDateFilter === 'all' && groupedSlots.length > 1 && (
                <button
                  type="button"
                  className={styles.expandCollapseAllBtn}
                  onClick={areAllDaysExpanded ? handleCollapseAllDays : handleExpandAllDays}
                >
                  {areAllDaysExpanded ? (
                    <>
                      <ChevronUp size={13} />
                      <span>{CLIENT_VIEW_TEXTS.accordion.collapseAll}</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={13} />
                      <span>{CLIENT_VIEW_TEXTS.accordion.expandAll}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {loading && (
              <Loader
                size="lg"
                title={CLIENT_VIEW_TEXTS.loaders.slotsTitle}
                subtitle={CLIENT_VIEW_TEXTS.loaders.slotsSubtitle}
                icon="calendar"
              />
            )}

            {!loading && filteredSlots.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  {searchQuery ? <Search size={28} /> : <Calendar size={28} />}
                </div>
                <h3 className={styles.emptyTitle}>
                  {searchQuery
                    ? CLIENT_VIEW_TEXTS.emptyStates.searchTitle
                    : selectedDateFilter !== 'all'
                      ? CLIENT_VIEW_TEXTS.emptyStates.dateFilterTitle
                      : CLIENT_VIEW_TEXTS.emptyStates.generalTitle}
                </h3>
                <p className={styles.emptyText}>
                  {searchQuery
                    ? CLIENT_VIEW_TEXTS.emptyStates.searchText(searchQuery, selectedDateFilter !== 'all')
                    : selectedDateFilter !== 'all'
                      ? CLIENT_VIEW_TEXTS.emptyStates.dateFilterText
                      : CLIENT_VIEW_TEXTS.emptyStates.generalText}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAllFilters}
                    leftIcon={<X size={14} />}
                  >
                    {searchQuery ? CLIENT_VIEW_TEXTS.search.cleanFilters : CLIENT_VIEW_TEXTS.search.viewAllSlots}
                  </Button>
                )}
              </div>
            )}

            {!loading && filteredSlots.length > 0 && (
              <div className={styles.dateGroupsContainer}>
                {displayedGroups.map((group, groupIdx) => {
                  const isCollapsed = isDayCollapsed(group.dateKey, groupIdx);
                  const hasBothPeriods =
                    selectedPeriodFilter === 'all' &&
                    group.morningSlots.length > 0 &&
                    group.afternoonSlots.length > 0;

                  return (
                    <div key={group.dateKey} className={styles.dateGroupBlock}>
                      <div
                        className={`${styles.dateGroupHeader} ${
                          group.holiday ? styles.dateGroupHeaderHoliday : ''
                        } ${selectedDateFilter === 'all' ? styles.dateGroupHeaderClickable : ''}`}
                        onClick={selectedDateFilter === 'all' ? () => toggleDayCollapse(group.dateKey, groupIdx) : undefined}
                        role={selectedDateFilter === 'all' ? 'button' : undefined}
                        aria-expanded={selectedDateFilter === 'all' ? !isCollapsed : undefined}
                        tabIndex={selectedDateFilter === 'all' ? 0 : undefined}
                        onKeyDown={
                          selectedDateFilter === 'all'
                            ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleDayCollapse(group.dateKey, groupIdx);
                              }
                            }
                            : undefined
                        }
                      >
                        <div className={styles.dateGroupTitleWrap}>
                          <div className={styles.dateGroupIcon}>
                            <Calendar size={16} />
                          </div>
                          <div>
                            <h3 className={styles.dateGroupTitle}>
                              {group.dateLabel}
                              {group.isToday && (
                                <span className={styles.todayHighlightBadge}>
                                  {CLIENT_VIEW_TEXTS.dateStrip.today}
                                </span>
                              )}
                              {group.isTomorrow && (
                                <span className={styles.todayHighlightBadge}>
                                  {CLIENT_VIEW_TEXTS.dateStrip.tomorrow}
                                </span>
                              )}
                              {group.holiday && (
                                <span
                                  className={styles.holidayHighlightBadge}
                                  title={formatHolidaySummary(group.holiday)}
                                >
                                  Feriado · {group.holiday.name}
                                </span>
                              )}
                            </h3>
                          </div>
                        </div>

                        <div className={styles.dateGroupRightSide}>
                          <span className={styles.dateGroupCountBadge}>
                            {group.slots.length === 1
                              ? CLIENT_VIEW_TEXTS.groups.countSingular
                              : CLIENT_VIEW_TEXTS.groups.countPlural(group.slots.length)}
                          </span>
                          {selectedDateFilter === 'all' && (
                            <div
                              className={`${styles.dayChevron} ${!isCollapsed ? styles.dayChevronRotated : ''}`}
                              aria-hidden="true"
                            >
                              <ChevronDown size={15} />
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedDateFilter === 'all' && isCollapsed && (
                        <div className={styles.collapsedDayNotice}>
                          <span>{CLIENT_VIEW_TEXTS.accordion.collapsedHint}</span>
                        </div>
                      )}

                      {!isCollapsed && (
                        <>
                          {hasBothPeriods ? (
                            <div className={styles.periodsWrapper}>
                              <div className={styles.periodSubSection}>
                                <div className={styles.periodSubHeader}>
                                  <Sun size={15} className={styles.periodIconMorning} />
                                  <span className={styles.periodSubTitle}>
                                    {CLIENT_VIEW_TEXTS.periods.morning}
                                  </span>
                                  <span className={styles.periodSubDetail}>
                                    ({group.morningSlots.length})
                                  </span>
                                </div>
                                {renderSlotsGrid(group.morningSlots, `${group.dateKey}-morning`)}
                              </div>

                              <div className={styles.periodSubSection}>
                                <div className={styles.periodSubHeader}>
                                  <Sunset size={15} className={styles.periodIconAfternoon} />
                                  <span className={styles.periodSubTitle}>
                                    {CLIENT_VIEW_TEXTS.periods.afternoon}
                                  </span>
                                  <span className={styles.periodSubDetail}>
                                    ({group.afternoonSlots.length})
                                  </span>
                                </div>
                                {renderSlotsGrid(group.afternoonSlots, `${group.dateKey}-afternoon`)}
                              </div>
                            </div>
                          ) : (
                            renderSlotsGrid(group.slots, `${group.dateKey}-all`)
                          )}
                        </>
                      )}
                    </div>
                  );
                })}

                {remainingDaysCount > 0 && (
                  <div className={styles.loadMoreDaysWrapper}>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => setVisibleDaysCount((prev) => prev + INITIAL_VISIBLE_DAYS)}
                      leftIcon={<CalendarDays size={16} />}
                      rightIcon={<ChevronDown size={16} />}
                    >
                      {CLIENT_VIEW_TEXTS.accordion.showMoreDays(remainingDaysCount)}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <PortfolioGallery
          items={portfolioItems}
          layout={resolvedAppearance.portfolioLayout}
          title={CLIENT_VIEW_TEXTS.portfolio.title}
          subtitle={CLIENT_VIEW_TEXTS.portfolio.subtitle}
          headerVariant="bordered"
          loading={portfolioLoading}
          loadingTitle={CLIENT_VIEW_TEXTS.loaders.portfolioTitle}
          loadingSubtitle={CLIENT_VIEW_TEXTS.loaders.portfolioSubtitle}
          emptyTitle={CLIENT_VIEW_TEXTS.emptyStates.portfolioTitle}
          emptyDescription={CLIENT_VIEW_TEXTS.emptyStates.portfolioText}
          initialLimit={INITIAL_VISIBLE_PORTFOLIO}
          expandable
          showMoreLabel={CLIENT_VIEW_TEXTS.portfolio.showMore}
          showLessLabel={CLIENT_VIEW_TEXTS.portfolio.showLess}
        />

        <section className={styles.trustHubSection}>
          <div className={styles.howItWorksBlock}>
            <div className={styles.howHeader}>
              <h2 className={styles.howTitle}>{CLIENT_VIEW_TEXTS.howItWorks.title}</h2>
              <p className={styles.howSubtitle}>
                {CLIENT_VIEW_TEXTS.howItWorks.subtitle}
              </p>
            </div>

            <div className={styles.stepsGrid}>
              {CLIENT_VIEW_TEXTS.howItWorks.steps.map((step) => (
                <div key={step.number} className={styles.stepCard}>
                  <div className={styles.stepNumber}>{step.number}</div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDescription}>{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.faqAndGuaranteeGrid}>
            <div className={styles.faqCol}>
              <div className={styles.faqColHeader}>
                <h3 className={styles.faqColTitle}>{CLIENT_VIEW_TEXTS.faq.title}</h3>
                <p className={styles.faqColSubtitle}>{CLIENT_VIEW_TEXTS.faq.subtitle}</p>
              </div>

              <div className={styles.faqList}>
                {CLIENT_VIEW_TEXTS.faq.items.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`${styles.faqCard} ${isOpen ? styles.faqCardOpen : ''}`}
                      onClick={() => toggleFaq(idx)}
                      aria-expanded={isOpen}
                    >
                      <div className={styles.faqQuestion}>
                        <span>{item.q}</span>
                        <ChevronDown
                          size={16}
                          strokeWidth={1.5}
                          className={`${styles.faqIcon} ${isOpen ? styles.faqIconRotated : ''}`}
                          aria-hidden="true"
                        />
                      </div>
                      {isOpen && <p className={styles.faqAnswer}>{item.a}</p>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.guaranteeSidebar}>
              <div className={styles.guaranteeCard}>
                <div className={styles.guaranteeIcon}>
                  <Lock size={20} strokeWidth={1.5} aria-hidden="true" />
                </div>
                <h4>{CLIENT_VIEW_TEXTS.guarantee.title}</h4>
                <p>{CLIENT_VIEW_TEXTS.guarantee.description}</p>
                <div className={styles.guaranteeBadgesList}>
                  <div className={styles.guaranteeMiniPill}>
                    <ShieldCheck size={16} strokeWidth={1.5} aria-hidden="true" />
                    <span>Mercado Pago protegido</span>
                  </div>
                  <div className={styles.guaranteeMiniPill}>
                    <Zap size={16} strokeWidth={1.5} aria-hidden="true" />
                    <span>Bloqueo temporal de 15 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <AlertModal
        isOpen={Boolean(error && dismissedErrorMsg !== error)}
        onClose={() => setDismissedErrorMsg(error)}
        title={CLIENT_VIEW_TEXTS.errors.connectionTitle}
        message={error || CLIENT_VIEW_TEXTS.errors.connectionFallback}
        type="error"
      />
    </div>
  );
};

export default ClientView;
