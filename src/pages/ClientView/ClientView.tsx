import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  MailCheck,
  Calendar,
  Image as ImageIcon,
  Clock,
  CheckCircle2,
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
  Award,
  Zap,
  LayoutGrid,
  Plus,
} from 'lucide-react';
import type { Slot, PortfolioItem } from '../../types';
import { useSlots } from '../../hooks/useSlots';
import { subscribeToPortfolio } from '../../services/ownerService';
import { filterClientAvailableSlots } from '../../services/schedulingService';
import { formatLocalDate } from '../../utils/dateUtils';
import SlotCard from '../../components/slots/SlotCard/SlotCard';
import BookingModal from '../../components/slots/BookingModal/BookingModal';
import PortfolioCard from '../../components/portfolio/PortfolioCard/PortfolioCard';
import Button from '../../components/common/Button/Button';
import Loader from '../../components/common/Loader/Loader';
import AlertModal from '../../components/common/AlertModal';
import { CLIENT_VIEW_TEXTS } from '../../texts';
import styles from './ClientView.module.css';

export const ClientView: React.FC = () => {
  const { slots, loading, error, bookAndCheckout } = useSlots({ mode: 'available' });
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [dismissedError, setDismissedError] = useState(false);

  const [viewDensity, setViewDensity] = useState<'cards' | 'compact'>('cards');
  const INITIAL_VISIBLE_DAYS = 4;
  const [visibleDaysCount, setVisibleDaysCount] = useState<number>(INITIAL_VISIBLE_DAYS);
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const calendarStripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const bookingSectionRef = useRef<HTMLDivElement>(null);
  const slotsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleDaysCount(INITIAL_VISIBLE_DAYS);
  }, [searchQuery, selectedDateFilter, selectedPeriodFilter]);

  const updateStripScrollState = useCallback(() => {
    const el = calendarStripRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    setCanScrollLeft(hasOverflow && el.scrollLeft > 10);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    updateStripScrollState();
    const el = calendarStripRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateStripScrollState, { passive: true });
    window.addEventListener('resize', updateStripScrollState);
    return () => {
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

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToPortfolio(
      (items) => {
        setPortfolioItems(items);
        setPortfolioLoading(false);
      },
      (err) => {
        console.error(CLIENT_VIEW_TEXTS.errors.loadPortfolio, err);
        setPortfolioLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const clientAvailableSlots = useMemo(() => {
    return filterClientAvailableSlots(slots, currentTimestamp);
  }, [slots, currentTimestamp]);

  const searchedSlots = useMemo(() => {
    if (!searchQuery.trim()) return clientAvailableSlots;
    const q = searchQuery.toLowerCase().trim();

    return clientAvailableSlots.filter((slot) => {
      const d = new Date(slot.datetime);
      if (isNaN(d.getTime())) return false;

      const weekdayLong = d.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
      const weekdayShort = d.toLocaleDateString('es-AR', { weekday: 'short' }).toLowerCase();

      const monthLong = d.toLocaleDateString('es-AR', { month: 'long' }).toLowerCase();
      const monthShort = d.toLocaleDateString('es-AR', { month: 'short' }).toLowerCase();

      const dayNum = d.getDate().toString();

      const hour24 = d.getHours();
      const timeStr = d.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

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
  }, [clientAvailableSlots, searchQuery]);

  const periodFilteredSlots = useMemo(() => {
    if (selectedPeriodFilter === 'all') return searchedSlots;
    return searchedSlots.filter((slot) => {
      const d = new Date(slot.datetime);
      if (isNaN(d.getTime())) return false;
      const hour = d.getHours();
      return selectedPeriodFilter === 'morning' ? hour < 13 : hour >= 13;
    });
  }, [searchedSlots, selectedPeriodFilter]);

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
      }
    >();

    const todayStr = formatLocalDate(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatLocalDate(tomorrow);

    periodFilteredSlots.forEach((s) => {
      const d = new Date(s.datetime);
      if (!isNaN(d.getTime())) {
        const dateKey = formatLocalDate(d);
        const weekdayShort = d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '');
        const dayNum = d.getDate().toString();
        const monthShort = d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
        const label = d.toLocaleDateString('es-AR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });

        if (!datesMap.has(dateKey)) {
          datesMap.set(dateKey, {
            rawDate: dateKey,
            weekdayShort,
            dayNum,
            monthShort,
            label,
            count: 1,
            isToday: dateKey === todayStr,
            isTomorrow: dateKey === tomorrowStr,
          });
        } else {
          datesMap.get(dateKey)!.count += 1;
        }
      }
    });

    return Array.from(datesMap.values()).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  }, [periodFilteredSlots]);

  const filteredSlots = useMemo(() => {
    if (selectedDateFilter === 'all') return periodFilteredSlots;
    return periodFilteredSlots.filter((slot) => {
      const d = new Date(slot.datetime);
      if (isNaN(d.getTime())) return false;
      return formatLocalDate(d) === selectedDateFilter;
    });
  }, [periodFilteredSlots, selectedDateFilter]);

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
        morningSlots: Slot[];
        afternoonSlots: Slot[];
        slots: Slot[];
      }
    >();

    const todayStr = formatLocalDate(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatLocalDate(tomorrow);

    const sorted = [...filteredSlots].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    sorted.forEach((slot) => {
      const d = new Date(slot.datetime);
      if (isNaN(d.getTime())) return;
      const dateKey = formatLocalDate(d);

      if (!groupsMap.has(dateKey)) {
        const weekday = d.toLocaleDateString('es-AR', { weekday: 'long' });
        const fullDate = d.toLocaleDateString('es-AR', {
          day: 'numeric',
          month: 'long',
        });
        const dateLabel = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${fullDate}`;

        groupsMap.set(dateKey, {
          dateKey,
          dateLabel,
          weekday,
          fullDate,
          isToday: dateKey === todayStr,
          isTomorrow: dateKey === tomorrowStr,
          morningSlots: [],
          afternoonSlots: [],
          slots: [slot],
        });
      } else {
        groupsMap.get(dateKey)!.slots.push(slot);
      }

      const hour = d.getHours();
      if (hour < 13) {
        groupsMap.get(dateKey)!.morningSlots.push(slot);
      } else {
        groupsMap.get(dateKey)!.afternoonSlots.push(slot);
      }
    });

    return Array.from(groupsMap.values());
  }, [filteredSlots]);

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
              const d = new Date(slot.datetime);
              const timeStr = !isNaN(d.getTime())
                ? d.toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })
                : '';
              const serviceName = slot.serviceName || 'Turno disponible';

              return (
                <button
                  key={slot.id}
                  type="button"
                  className={styles.quickSlotChip}
                  onClick={() => handleOpenBooking(slot)}
                  aria-label={CLIENT_VIEW_TEXTS.quickSlot.bookAria(timeStr, serviceName)}
                >
                  <div className={styles.quickSlotTimeRow}>
                    <Clock size={13} className={styles.quickSlotClock} aria-hidden="true" />
                    <span className={styles.quickSlotTime}>{timeStr} hs</span>
                  </div>
                  <span className={styles.quickSlotService} title={serviceName}>
                    {serviceName}
                  </span>
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
                      Reservar <ArrowRight size={10} aria-hidden="true" />
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
                  <ChevronUp size={14} aria-hidden="true" />
                  <span>{CLIENT_VIEW_TEXTS.accordion.showLessSlots}</span>
                </>
              ) : (
                <>
                  <Plus size={14} aria-hidden="true" />
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
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };

  const handleCloseBooking = () => {
    setIsModalOpen(false);
    setSelectedSlot(null);
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
      <section className={styles.heroSection}>
        <div className={`container ${styles.heroContainer}`}>
          <div className={styles.heroLeft}>


            <h1 className={styles.heroTitle}>
              {CLIENT_VIEW_TEXTS.hero.titlePrefix}{' '}
              <span className={styles.heroHighlight}>{CLIENT_VIEW_TEXTS.hero.titleHighlight}</span>
            </h1>

            <p className={styles.heroSubtitle}>
              {CLIENT_VIEW_TEXTS.hero.subtitle}
            </p>

            <div className={styles.heroActions}>
              <Button
                variant="primary"
                size="lg"
                onClick={scrollToSlots}
                rightIcon={<ArrowRight size={18} />}
              >
                {CLIENT_VIEW_TEXTS.hero.exploreButton}
              </Button>

              <Link to="/about">
                <Button variant="outline" size="lg">
                  {CLIENT_VIEW_TEXTS.studioCard.aboutLink}
                </Button>
              </Link>
            </div>

            <div className={styles.trustPills}>
              <div className={styles.trustPill}>
                <ShieldCheck size={15} className={styles.trustIcon} />
                <span>{CLIENT_VIEW_TEXTS.trustPills.mpGuarantee}</span>
              </div>
              <div className={styles.trustPill}>
                <CreditCard size={15} className={styles.trustIcon} />
                <span>{CLIENT_VIEW_TEXTS.trustPills.paymentMethods}</span>
              </div>
              <div className={styles.trustPill}>
                <MailCheck size={15} className={styles.trustIcon} />
                <span>{CLIENT_VIEW_TEXTS.trustPills.instantReceipt}</span>
              </div>
            </div>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.studioIdentityCard}>
              <div className={styles.studioCardHeader}>
                <div className={styles.studioIconBadge}>
                  <Award size={21} />
                </div>
                <div>
                  <h3 className={styles.studioCardTitle}>{CLIENT_VIEW_TEXTS.studioCard.title}</h3>
                  <p className={styles.studioCardSubtitle}>{CLIENT_VIEW_TEXTS.studioCard.subtitle}</p>
                </div>
              </div>

              <div className={styles.studioPerksList}>
                <div className={styles.studioPerkItem}>
                  <div className={styles.studioPerkCheck}>
                    <CheckCircle2 size={15} />
                  </div>
                  <span>{CLIENT_VIEW_TEXTS.studioCard.perk1}</span>
                </div>
                <div className={styles.studioPerkItem}>
                  <div className={styles.studioPerkCheck}>
                    <CheckCircle2 size={15} />
                  </div>
                  <span>{CLIENT_VIEW_TEXTS.studioCard.perk2}</span>
                </div>
                <div className={styles.studioPerkItem}>
                  <div className={styles.studioPerkCheck}>
                    <CheckCircle2 size={15} />
                  </div>
                  <span>{CLIENT_VIEW_TEXTS.studioCard.perk3}</span>
                </div>
              </div>

              <div className={styles.studioCardFooter}>
                <Button
                  variant="primary"
                  fullWidth
                  size="md"
                  onClick={scrollToSlots}
                  rightIcon={<ArrowRight size={16} />}
                >
                  {CLIENT_VIEW_TEXTS.studioCard.cta}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div ref={bookingSectionRef}>
          <BookingModal
            isOpen={isModalOpen}
            onClose={handleCloseBooking}
            slot={selectedSlot}
            onCheckout={bookAndCheckout}
            existingSlots={slots}
          />
        </div>

        <section ref={slotsSectionRef} className={styles.bookingHubCard}>
          <div className={styles.bookingHubHeader}>
            <div className={styles.bookingHubTitleGroup}>
              <div className={styles.bookingHubBadge}>
                <Calendar size={13} />
                <span>{CLIENT_VIEW_TEXTS.slotsSection.badge}</span>
              </div>
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
              <div className={styles.calendarStripContainer}>
                {canScrollLeft && (
                  <button
                    type="button"
                    className={`${styles.stripScrollBtn} ${styles.stripScrollLeft}`}
                    onClick={() => handleScrollStrip('left')}
                    aria-label={CLIENT_VIEW_TEXTS.dateStrip.prevAria}
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}

                <div ref={calendarStripRef} className={styles.calendarStrip}>
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
                    return (
                      <button
                        key={item.rawDate}
                        type="button"
                        className={`${styles.calendarCard} ${isSelected ? styles.activeCalendarCard : ''}`}
                        onClick={() => setSelectedDateFilter(item.rawDate)}
                        aria-pressed={isSelected}
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
                        <span className={styles.calendarCardSlotCount}>
                          {item.count} {item.count === 1 ? 'turno' : 'turnos'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {canScrollRight && (
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
                      <Clock size={13} />
                      <span>{CLIENT_VIEW_TEXTS.periods.all}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.periodPill} ${selectedPeriodFilter === 'morning' ? styles.activePeriodPill : ''}`}
                      onClick={() => setSelectedPeriodFilter('morning')}
                    >
                      <Sun size={13} />
                      <span>{CLIENT_VIEW_TEXTS.periods.morning}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.periodPill} ${selectedPeriodFilter === 'afternoon' ? styles.activePeriodPill : ''}`}
                      onClick={() => setSelectedPeriodFilter('afternoon')}
                    >
                      <Sunset size={13} />
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
                      <LayoutGrid size={13} />
                      <span>{CLIENT_VIEW_TEXTS.density.cards}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.densityPill} ${viewDensity === 'compact' ? styles.activeDensityPill : ''}`}
                      onClick={() => setViewDensity('compact')}
                      title="Ver horarios en formato rápido y compacto"
                    >
                      <Zap size={13} />
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
                        className={`${styles.dateGroupHeader} ${selectedDateFilter === 'all' ? styles.dateGroupHeaderClickable : ''}`}
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

        <section className={styles.portfolioSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <h2 className={styles.sectionTitle}>
                {CLIENT_VIEW_TEXTS.portfolio.title}
              </h2>
              <p className={styles.sectionSubtitle}>
                {CLIENT_VIEW_TEXTS.portfolio.subtitle}
              </p>
            </div>
          </div>

          {portfolioLoading && (
            <Loader
              size="md"
              title={CLIENT_VIEW_TEXTS.loaders.portfolioTitle}
              subtitle={CLIENT_VIEW_TEXTS.loaders.portfolioSubtitle}
              icon="heart"
            />
          )}

          {!portfolioLoading && portfolioItems.length === 0 && (
            <div className={styles.emptyPortfolioCard}>
              <div className={styles.emptyPortfolioIcon}>
                <ImageIcon size={28} />
              </div>
              <h3>{CLIENT_VIEW_TEXTS.emptyStates.portfolioTitle}</h3>
              <p>{CLIENT_VIEW_TEXTS.emptyStates.portfolioText}</p>
            </div>
          )}

          {!portfolioLoading && portfolioItems.length > 0 && (
            <div className={styles.bentoGrid}>
              {portfolioItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`${styles.bentoItem} ${idx === 0 ? styles.bentoItemLarge : ''}`}
                >
                  <PortfolioCard item={item} />
                </div>
              ))}
            </div>
          )}
        </section>

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
                    <div
                      key={idx}
                      className={`${styles.faqCard} ${isOpen ? styles.faqCardOpen : ''}`}
                      onClick={() => toggleFaq(idx)}
                    >
                      <div className={styles.faqQuestion}>
                        <span>{item.q}</span>
                        <ChevronDown
                          size={18}
                          className={`${styles.faqIcon} ${isOpen ? styles.faqIconRotated : ''}`}
                        />
                      </div>
                      {isOpen && <p className={styles.faqAnswer}>{item.a}</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.guaranteeSidebar}>
              <div className={styles.guaranteeCard}>
                <div className={styles.guaranteeIcon}>
                  <Lock size={26} />
                </div>
                <h4>{CLIENT_VIEW_TEXTS.guarantee.title}</h4>
                <p>{CLIENT_VIEW_TEXTS.guarantee.description}</p>
                <div className={styles.guaranteeBadgesList}>
                  <div className={styles.guaranteeMiniPill}>
                    <ShieldCheck size={14} />
                    <span>Mercado Pago Protegido</span>
                  </div>
                  <div className={styles.guaranteeMiniPill}>
                    <Zap size={14} />
                    <span>Bloqueo temporal de 15 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <AlertModal
        isOpen={Boolean(error && !dismissedError)}
        onClose={() => setDismissedError(true)}
        title={CLIENT_VIEW_TEXTS.errors.connectionTitle}
        message={error || CLIENT_VIEW_TEXTS.errors.connectionFallback}
        type="error"
      />
    </div>
  );
};

export default ClientView;
