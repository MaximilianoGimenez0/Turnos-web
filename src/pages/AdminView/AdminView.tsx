import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  CalendarPlus,
  Calendar,
  DollarSign,
  CheckCircle2,
  Search,
  Users,
  Activity,
  CalendarCheck2,
  Layers,
  BarChart3,
  Image as ImageIcon,
  UserCheck,
  Palette,
  Tag,
  CreditCard,
  LayoutGrid,
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { useSlots, type SlotsRangeFilter } from '../../hooks/useSlots';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../context/TenantContext';
import { FIELD_LIMITS } from '../../config/fieldLimits';
import { fetchAllSlotsOnce } from '../../services/db';
import type { Slot, NewSlotData, ClientData } from '../../types';
import { findPendingConflictForSlot } from '../../services/schedulingService';
import {
  buildBusinessIsoFromInputs,
  formatMonthLabel,
  formatScopeRangeLabel,
  getDateRangeForScope,
  getTodayBusinessDateString,
  isIsoInDateRange,
  shiftAnchorDateKey,
  type AdminTimeScope,
} from '../../utils/dateUtils';
import { formatHolidaySummary, getHolidayInfo } from '../../utils/holidays';
import Button from '../../components/common/Button/Button';
import SlotCard from '../../components/slots/SlotCard/SlotCard';
import CreateSlotModal from '../../components/slots/CreateSlotModal/CreateSlotModal';
import AssignSlotModal from '../../components/admin/AssignSlotModal/AssignSlotModal';
import ConfirmedAgenda from '../../components/admin/ConfirmedAgenda/ConfirmedAgenda';
import AdminChart from '../../components/admin/AdminChart/AdminChart';
import OwnerSettings from '../../components/admin/OwnerSettings/OwnerSettings';
import AppearanceSettings from '../../components/admin/AppearanceSettings/AppearanceSettings';
import PortfolioManager from '../../components/admin/PortfolioManager/PortfolioManager';
import ServicesManager from '../../components/admin/ServicesManager/ServicesManager';
import PaymentSettingsManager from '../../components/admin/PaymentSettings/PaymentSettingsManager';
import Input from '../../components/common/Input/Input';
import Loader from '../../components/common/Loader/Loader';
import AlertModal from '../../components/common/AlertModal';
import { ADMIN_VIEW_TEXTS } from '../../texts';
import styles from './AdminView.module.css';

const DAY_MS = 24 * 60 * 60 * 1000;
const CREATE_VIEW_LOOKAHEAD_DAYS = 45;

type AdminViewMode =
  | 'agenda'
  | 'slots'
  | 'create'
  | 'services'
  | 'charts'
  | 'portfolio'
  | 'owner'
  | 'appearance'
  | 'payments';

const STAFF_ALLOWED_VIEWS: ReadonlySet<AdminViewMode> = new Set(['agenda', 'slots', 'create']);

const getDensityStorageKey = (tenantId: string) => `admin_slots_view_density:${tenantId}`;
const getTimeScopeStorageKey = (tenantId: string) => `admin_time_scope:${tenantId}`;

export const AdminView: React.FC = () => {
  const { tenantId, timezone } = useTenant();
  const { isPlatformAdmin, getTenantRole } = useAuth();
  const isOwner = isPlatformAdmin || getTenantRole(tenantId) === 'owner';

  const [dismissedErrorMsg, setDismissedErrorMsg] = useState<string | null>(null);
  const [selectedSlotToAssign, setSelectedSlotToAssign] = useState<Slot | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const [viewMode, setViewMode] = useState<AdminViewMode>('agenda');
  const [advancedMenuOpen, setAdvancedMenuOpen] = useState(false);
  const [mobileAdvancedOpen, setMobileAdvancedOpen] = useState(false);
  const [confirmPaymentsModalOpen, setConfirmPaymentsModalOpen] = useState(false);
  const activeViewMode: AdminViewMode =
    !isOwner && !STAFF_ALLOWED_VIEWS.has(viewMode) ? 'agenda' : viewMode;

  const [statusFilter, setStatusFilter] = useState<
    'all' | 'available' | 'pending_payment' | 'confirmed' | 'past' | 'cancelled' | 'conflict'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewDensity, setViewDensity] = useState<'cards' | 'compact'>(() => {
    try {
      const saved = localStorage.getItem(getDensityStorageKey(tenantId));
      return saved === 'compact' ? 'compact' : 'cards';
    } catch {
      return 'cards';
    }
  });
  const [timeScope, setTimeScope] = useState<AdminTimeScope>(() => {
    try {
      const saved = localStorage.getItem(getTimeScopeStorageKey(tenantId));
      if (saved === 'day' || saved === 'week' || saved === 'month' || saved === 'all') {
        return saved;
      }
      return 'week';
    } catch {
      return 'week';
    }
  });
  const [anchorDateKey, setAnchorDateKey] = useState<string>(() =>
    getTodayBusinessDateString(timezone)
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [actionLoadingText, setActionLoadingText] = useState<string | null>(null);
  const [mutationsVersion, setMutationsVersion] = useState(0);
  const [chartsCache, setChartsCache] = useState<{ slots: Slot[]; version: number } | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const mobileTabsRef = useRef<HTMLDivElement | null>(null);
  const mobileTabBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [mobileScrollState, setMobileScrollState] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
    thumbWidthPct: 100,
    thumbShiftPct: 0,
  });

  const updateMobileScrollState = useCallback(() => {
    const el = mobileTabsRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const hasOverflow = maxScroll > 2;
    const canScrollLeft = hasOverflow && scrollLeft > 2;
    const canScrollRight = hasOverflow && scrollLeft < maxScroll - 2;
    const thumbWidthPct = hasOverflow
      ? Math.min(100, Math.max(20, (clientWidth / scrollWidth) * 100))
      : 100;
    const progress = hasOverflow ? Math.min(1, Math.max(0, scrollLeft / maxScroll)) : 0;
    const thumbShiftPct =
      hasOverflow && thumbWidthPct < 100
        ? progress * ((100 - thumbWidthPct) / thumbWidthPct) * 100
        : 0;

    setMobileScrollState((prev) => {
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
    const el = mobileTabsRef.current;
    if (!el) return;

    const rafId = window.requestAnimationFrame(updateMobileScrollState);
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateMobileScrollState)
        : null;
    observer?.observe(el);
    window.addEventListener('resize', updateMobileScrollState);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener('resize', updateMobileScrollState);
    };
  }, [updateMobileScrollState]);

  useEffect(() => {
    const activeBtn = mobileTabBtnRefs.current[activeViewMode];
    activeBtn?.scrollIntoView({
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [activeViewMode, shouldReduceMotion]);

  const todayKey = useMemo(
    () => getTodayBusinessDateString(timezone, nowMs),
    [timezone, nowMs]
  );

  const todayStartMs = useMemo(() => {
    const iso = buildBusinessIsoFromInputs(todayKey, '00:00', timezone);
    return iso ? new Date(iso).getTime() : nowMs;
  }, [todayKey, timezone, nowMs]);

  const activeRange = useMemo(
    () => getDateRangeForScope(timeScope, anchorDateKey, timezone),
    [timeScope, anchorDateKey, timezone]
  );
  const activePeriodLabel = useMemo(
    () => formatScopeRangeLabel(timeScope, anchorDateKey, timezone, todayKey),
    [timeScope, anchorDateKey, timezone, todayKey]
  );
  const activeDayHoliday = useMemo(
    () => (timeScope === 'day' ? getHolidayInfo(anchorDateKey) : null),
    [timeScope, anchorDateKey]
  );

  const monthlyRange = useMemo(
    () => getDateRangeForScope('month', anchorDateKey, timezone),
    [anchorDateKey, timezone]
  );
  const monthlyLabel = useMemo(
    () => formatMonthLabel(anchorDateKey, timezone),
    [anchorDateKey, timezone]
  );

  // Bound the live listener to monthly + active range (±1d margin for midnight/12h conflicts),
  // extending ahead 45 days in 'create' view for duplicate checks, and loading full history only when needed.
  const slotsSubscriptionRange = useMemo<SlotsRangeFilter | null>(() => {
    if (timeScope === 'all') {
      return null;
    }

    let minMs = monthlyRange ? monthlyRange.startMs : todayStartMs;
    let maxMs = monthlyRange ? monthlyRange.endMs : todayStartMs + 30 * DAY_MS;

    if (activeRange) {
      minMs = Math.min(minMs, activeRange.startMs);
      maxMs = Math.max(maxMs, activeRange.endMs);
    }

    if (activeViewMode === 'create') {
      minMs = Math.min(minMs, todayStartMs);
      maxMs = Math.max(maxMs, todayStartMs + CREATE_VIEW_LOOKAHEAD_DAYS * DAY_MS);
    }

    return {
      startIso: new Date(minMs - DAY_MS).toISOString(),
      endIso: new Date(maxMs + DAY_MS).toISOString(),
    };
  }, [timeScope, monthlyRange, activeRange, activeViewMode, todayStartMs]);

  const {
    slots,
    loading,
    error,
    addSlot,
    addMultipleSlots,
    assignSlot,
    cancelExistingSlot,
    releaseExistingSlot,
    deleteExistingSlot,
  } = useSlots({
    mode: 'all',
    range: slotsSubscriptionRange,
  });

  useEffect(() => {
    if (!isOwner || activeViewMode !== 'charts' || timeScope === 'all') return;
    if (chartsCache && chartsCache.version === mutationsVersion) return;

    let active = true;
    fetchAllSlotsOnce(tenantId)
      .then((allSlots) => {
        if (!active) return;
        setChartsCache({ slots: allSlots, version: mutationsVersion });
      })
      .catch((err) => {
        console.error('Error al cargar historial completo para gráficos:', err);
      });

    return () => {
      active = false;
    };
  }, [tenantId, isOwner, activeViewMode, timeScope, chartsCache, mutationsVersion]);

  const chartsLoading =
    isOwner &&
    activeViewMode === 'charts' &&
    timeScope !== 'all' &&
    (!chartsCache || chartsCache.version !== mutationsVersion);

  const chartsSlots = useMemo(() => {
    if (timeScope === 'all') return slots;
    return chartsCache?.slots ?? slots;
  }, [timeScope, slots, chartsCache]);

  const handleCreateSlot = useCallback(
    async (data: NewSlotData) => {
      const id = await addSlot(data);
      setMutationsVersion((v) => v + 1);
      return id;
    },
    [addSlot]
  );

  const handleCreateMultipleSlots = useCallback(
    async (dataArray: NewSlotData[]) => {
      const ids = await addMultipleSlots(dataArray);
      setMutationsVersion((v) => v + 1);
      return ids;
    },
    [addMultipleSlots]
  );

  const handleAssignSlot = useCallback(
    async (slotId: string, clientData: ClientData) => {
      await assignSlot(slotId, clientData);
      setMutationsVersion((v) => v + 1);
    },
    [assignSlot]
  );

  const hasPendingPayments = useMemo(
    () => slots.some((s) => s.status === 'pending_payment'),
    [slots]
  );

  useEffect(() => {
    if (!hasPendingPayments) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => clearInterval(interval);
  }, [hasPendingPayments]);

  const handleTimeScopeChange = (newScope: AdminTimeScope) => {
    setTimeScope(newScope);
    try {
      localStorage.setItem(getTimeScopeStorageKey(tenantId), newScope);
    } catch (err) {
      console.error('Error saving admin time scope to localStorage:', err);
    }
  };

  const handleShiftPeriod = (delta: number) => {
    if (timeScope === 'all') return;
    setAnchorDateKey((prev) => shiftAnchorDateKey(timeScope, prev, delta, timezone));
  };

  const handleGoToToday = () => {
    setAnchorDateKey(getTodayBusinessDateString(timezone));
  };

  const handleDensityChange = (newDensity: 'cards' | 'compact') => {
    setViewDensity(newDensity);
    try {
      localStorage.setItem(getDensityStorageKey(tenantId), newDensity);
    } catch (err) {
      console.error('Error saving admin view density to localStorage:', err);
    }
  };

  const monthlyMetrics = useMemo(() => {
    const monthSlots = slots.filter((s) => isIsoInDateRange(s.datetime, monthlyRange));
    const total = monthSlots.length;
    const available = monthSlots.filter((s) => s.status === 'available').length;
    const confirmed = monthSlots.filter((s) => s.status === 'confirmed').length;
    const revenue = monthSlots
      .filter((s) => s.status === 'confirmed' || (s.status === 'past' && s.pastOutcome !== 'cancelled'))
      .reduce((acc, s) => acc + (s.paidAmount || s.depositAmount || 0), 0);

    return { total, available, confirmed, revenue };
  }, [slots, monthlyRange]);

  const scopedSlots = useMemo(
    () => slots.filter((s) => isIsoInDateRange(s.datetime, activeRange)),
    [slots, activeRange]
  );

  const scopedCounts = useMemo(() => {
    const availableSlots = scopedSlots.filter((s) => s.status === 'available');
    const tempConflicts = availableSlots.filter(
      (s) => findPendingConflictForSlot(s, slots, nowMs) !== null
    ).length;

    return {
      total: scopedSlots.length,
      available: availableSlots.length,
      pending: scopedSlots.filter((s) => s.status === 'pending_payment').length,
      confirmed: scopedSlots.filter((s) => s.status === 'confirmed').length,
      past: scopedSlots.filter((s) => s.status === 'past').length,
      cancelled: scopedSlots.filter((s) => s.status === 'cancelled').length,
      conflict: scopedSlots.filter((s) => s.status === 'conflict').length,
      tempConflicts,
    };
  }, [scopedSlots, slots, nowMs]);

  const matchesSearch = (slot: Slot, q: string) => {
    if (!q) return true;
    const matchesServiceList = (slot.services || []).some((s) =>
      (typeof s === 'string' ? s : s.name).toLowerCase().includes(q)
    );
    return (
      Boolean(slot.serviceName && slot.serviceName.toLowerCase().includes(q)) ||
      Boolean(slot.clientData?.selectedService && slot.clientData.selectedService.toLowerCase().includes(q)) ||
      matchesServiceList ||
      Boolean(slot.clientData?.name && slot.clientData.name.toLowerCase().includes(q)) ||
      Boolean(slot.clientData?.email && slot.clientData.email.toLowerCase().includes(q))
    );
  };

  const filteredSlots = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return scopedSlots.filter((slot) => {
      const matchesStatus = statusFilter === 'all' || slot.status === statusFilter;
      return matchesStatus && matchesSearch(slot, q);
    });
  }, [scopedSlots, statusFilter, searchQuery]);

  const otherPeriodSlotMatches = useMemo(() => {
    if (timeScope === 'all') return 0;
    const q = searchQuery.toLowerCase().trim();
    const allMatches = slots.filter((slot) => {
      const matchesStatus = statusFilter === 'all' || slot.status === statusFilter;
      return matchesStatus && matchesSearch(slot, q);
    }).length;
    return Math.max(0, allMatches - filteredSlots.length);
  }, [slots, filteredSlots.length, statusFilter, searchQuery, timeScope]);

  const otherPeriodConfirmedMatches = useMemo(() => {
    if (timeScope === 'all') return 0;
    const q = searchQuery.toLowerCase().trim();
    const totalConfirmedMatches = slots.filter((s) => {
      if (s.status !== 'confirmed') return false;
      if (!q) return true;
      const matchesServices = (s.clientData?.selectedServices || s.services || []).some((srv) =>
        (typeof srv === 'string' ? srv : srv.name).toLowerCase().includes(q)
      );
      return (
        Boolean(s.clientData?.name && s.clientData.name.toLowerCase().includes(q)) ||
        Boolean(s.clientData?.email && s.clientData.email.toLowerCase().includes(q)) ||
        Boolean(s.clientData?.selectedService && s.clientData.selectedService.toLowerCase().includes(q)) ||
        Boolean(s.clientData?.notes && s.clientData.notes.toLowerCase().includes(q)) ||
        Boolean(s.serviceName && s.serviceName.toLowerCase().includes(q)) ||
        Boolean(s.clientData?.phone && s.clientData.phone.includes(q)) ||
        matchesServices
      );
    }).length;
    const scopedConfirmedMatches = scopedSlots.filter((s) => s.status === 'confirmed').length;
    return Math.max(0, totalConfirmedMatches - scopedConfirmedMatches);
  }, [slots, scopedSlots, searchQuery, timeScope]);

  const handleCancelSlot = async (slotId: string) => {
    if (window.confirm(ADMIN_VIEW_TEXTS.dialogs.confirmCancel)) {
      setActionLoadingText(ADMIN_VIEW_TEXTS.loaders.cancelling);
      try {
        await cancelExistingSlot(slotId);
        setMutationsVersion((v) => v + 1);
      } catch (err) {
        console.error(ADMIN_VIEW_TEXTS.errors.cancel, err);
      } finally {
        setActionLoadingText(null);
      }
    }
  };

  const handleOpenAssignModal = (slot: Slot) => {
    if (slot.status === 'conflict') {
      return;
    }
    const conflict = findPendingConflictForSlot(slot, slots, nowMs);
    if (conflict) {
      alert('Este turno no puede asignarse actualmente porque está bloqueado temporalmente por otro usuario que está realizando el pago.');
      return;
    }
    setSelectedSlotToAssign(slot);
    setIsAssignModalOpen(true);
  };

  const handleReleaseSlot = async (slotId: string) => {
    setActionLoadingText(ADMIN_VIEW_TEXTS.loaders.releasing);
    try {
      await releaseExistingSlot(slotId);
      setMutationsVersion((v) => v + 1);
    } catch (err) {
      console.error(ADMIN_VIEW_TEXTS.errors.release, err);
    } finally {
      setActionLoadingText(null);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (window.confirm(ADMIN_VIEW_TEXTS.dialogs.confirmDelete)) {
      setActionLoadingText(ADMIN_VIEW_TEXTS.loaders.deleting);
      try {
        await deleteExistingSlot(slotId);
        setMutationsVersion((v) => v + 1);
      } catch (err) {
        console.error(ADMIN_VIEW_TEXTS.errors.delete, err);
      } finally {
        setActionLoadingText(null);
      }
    }
  };

  const showOperationalStats = activeViewMode === 'agenda' || activeViewMode === 'slots';

  type NavGroupId = 'operations' | 'brand' | 'advanced';
  type NavItem = {
    id: AdminViewMode;
    icon: typeof CalendarCheck2;
    label: string;
    count?: number;
    ownerOnly?: boolean;
    group: NavGroupId;
  };

  const allOperationsNavItems: NavItem[] = [
    {
      id: 'agenda',
      icon: CalendarCheck2,
      label: 'Agenda',
      count: scopedCounts.confirmed,
      group: 'operations',
    },
    {
      id: 'slots',
      icon: Layers,
      label: 'Turnos',
      count: scopedCounts.total,
      group: 'operations',
    },
    {
      id: 'create',
      icon: CalendarPlus,
      label: ADMIN_VIEW_TEXTS.header.createSlots,
      group: 'operations',
    },
    {
      id: 'services',
      icon: Tag,
      label: ADMIN_VIEW_TEXTS.tabs.services,
      ownerOnly: true,
      group: 'operations',
    },
    {
      id: 'charts',
      icon: BarChart3,
      label: ADMIN_VIEW_TEXTS.tabs.charts,
      ownerOnly: true,
      group: 'operations',
    },
  ];
  const operationsNavItems = allOperationsNavItems.filter((item) => isOwner || !item.ownerOnly);

  const brandNavItems: NavItem[] = isOwner
    ? [
      {
        id: 'owner',
        icon: UserCheck,
        label: ADMIN_VIEW_TEXTS.tabs.owner,
        ownerOnly: true,
        group: 'brand',
      },
      {
        id: 'appearance',
        icon: Palette,
        label: ADMIN_VIEW_TEXTS.tabs.appearance,
        ownerOnly: true,
        group: 'brand',
      },
      {
        id: 'portfolio',
        icon: ImageIcon,
        label: ADMIN_VIEW_TEXTS.tabs.portfolio,
        ownerOnly: true,
        group: 'brand',
      },
    ]
    : [];

  const handleSelectStandardView = (id: AdminViewMode) => {
    setViewMode(id);
    setMobileAdvancedOpen(false);
    if (id !== 'payments') {
      setAdvancedMenuOpen(false);
    }
  };

  const handleRequestPaymentsAccess = () => {
    setMobileAdvancedOpen(false);
    if (activeViewMode === 'payments') {
      return;
    }
    setConfirmPaymentsModalOpen(true);
  };

  const handleConfirmPaymentsAccess = () => {
    setConfirmPaymentsModalOpen(false);
    setAdvancedMenuOpen(true);
    setViewMode('payments');
  };

  useEffect(() => {
    const rafId = window.requestAnimationFrame(updateMobileScrollState);
    return () => window.cancelAnimationFrame(rafId);
  }, [updateMobileScrollState, loading, scopedCounts.confirmed, scopedCounts.total]);

  return (
    <div
      className={`${styles.dashboard} animate-fade-in`}
      data-view-mode={activeViewMode}
    >
      <nav
        className={styles.mobileTabsWrapper}
        data-admin-sticky-top="tabs"
        aria-label="Navegación de módulos del administrador"
      >
        <div
          className={styles.mobileTabsScrollArea}
          data-scroll-left={mobileScrollState.canScrollLeft ? 'true' : 'false'}
          data-scroll-right={mobileScrollState.canScrollRight ? 'true' : 'false'}
        >
          <div
            ref={mobileTabsRef}
            className={`${styles.mobileTabsList} ${mobileScrollState.hasOverflow ? styles.mobileTabsListOverflow : ''
              }`}
            onScroll={updateMobileScrollState}
          >
            {operationsNavItems.map(({ id, icon: Icon, label, count, group }) => {
              const isActive = activeViewMode === id;
              return (
                <button
                  key={id}
                  ref={(node) => {
                    mobileTabBtnRefs.current[id] = node;
                  }}
                  type="button"
                  data-nav-group={group}
                  className={`${styles.mobileTabBtn} ${isActive ? styles.mobileTabBtnActive : ''}`}
                  onClick={() => handleSelectStandardView(id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                  <span>{label}</span>
                  {typeof count === 'number' && (
                    <span className={styles.tabCountBadge}>{count}</span>
                  )}
                </button>
              );
            })}

            {brandNavItems.length > 0 && (
              <>
                <span className={styles.mobileGroupDivider} aria-hidden="true" />
                {brandNavItems.map(({ id, icon: Icon, label, group }) => {
                  const isActive = activeViewMode === id;
                  return (
                    <button
                      key={id}
                      ref={(node) => {
                        mobileTabBtnRefs.current[id] = node;
                      }}
                      type="button"
                      data-nav-group={group}
                      className={`${styles.mobileTabBtn} ${isActive ? styles.mobileTabBtnActive : ''}`}
                      onClick={() => handleSelectStandardView(id)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </>
            )}

            {isOwner && (
              <>
                <span className={styles.mobileGroupDivider} aria-hidden="true" />
                <button
                  ref={(node) => {
                    mobileTabBtnRefs.current['payments'] = node;
                  }}
                  type="button"
                  data-nav-group="advanced"
                  className={`${styles.mobileTabBtn} ${activeViewMode === 'payments' || mobileAdvancedOpen
                    ? styles.mobileTabBtnActive
                    : ''
                    }`}
                  onClick={() => setMobileAdvancedOpen((prev) => !prev)}
                  aria-expanded={mobileAdvancedOpen}
                  aria-controls="mobile-admin-advanced-panel"
                >
                  <Lock size={14} strokeWidth={1.9} aria-hidden="true" />
                  <span>{ADMIN_VIEW_TEXTS.navGroups.advancedShort}</span>
                  <ChevronDown
                    size={13}
                    strokeWidth={2}
                    className={`${styles.advancedChevron} ${mobileAdvancedOpen ? styles.advancedChevronOpen : ''
                      }`}
                    aria-hidden="true"
                  />
                </button>
              </>
            )}
          </div>
        </div>

        {isOwner && mobileAdvancedOpen && (
          <div id="mobile-admin-advanced-panel" className={styles.mobileAdvancedPanel}>
            <div className={styles.mobileAdvancedInfo}>
              <ShieldAlert size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>{ADMIN_VIEW_TEXTS.navGroups.advancedHint}</span>
            </div>
            <button
              type="button"
              data-nav-group="advanced"
              className={`${styles.mobileAdvancedActionBtn} ${activeViewMode === 'payments' ? styles.mobileAdvancedActionBtnActive : ''
                }`}
              onClick={handleRequestPaymentsAccess}
            >
              <CreditCard size={15} strokeWidth={1.75} aria-hidden="true" />
              <span>{ADMIN_VIEW_TEXTS.tabs.payments}</span>
            </button>
          </div>
        )}

        {mobileScrollState.hasOverflow && (
          <div className={styles.mobileScrollIndicatorRow} aria-hidden="true">
            <div className={styles.mobileScrollTrack}>
              <div
                className={styles.mobileScrollThumb}
                style={{
                  width: `${mobileScrollState.thumbWidthPct}%`,
                  transform: `translateX(${mobileScrollState.thumbShiftPct}%)`,
                }}
              />
            </div>
            <span className={styles.mobileScrollHint}>
              {mobileScrollState.canScrollLeft && <ChevronLeft size={12} strokeWidth={2} />}
              <span>Deslizá</span>
              {mobileScrollState.canScrollRight && <ChevronRight size={12} strokeWidth={2} />}
            </span>
          </div>
        )}
      </nav>

      <div className={styles.adminShell}>
        <div className={styles.sidebarColumn}>
          <aside
            className={styles.sidebar}
            data-admin-sidebar="true"
            aria-label="Navegación del panel"
          >
            <nav className={styles.sidebarNav}>
              <div className={styles.sidebarGroup} data-nav-group="operations">
                <span className={styles.sidebarGroupLabel}>
                  <span className={styles.sidebarGroupDot} aria-hidden="true" />
                  <span>{ADMIN_VIEW_TEXTS.navGroups.operations}</span>
                </span>
                {operationsNavItems.map(({ id, icon: Icon, label, count, group }) => {
                  const isActive = activeViewMode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      data-nav-group={group}
                      className={`${styles.sidebarNavBtn} ${isActive ? styles.sidebarNavBtnActive : ''}`}
                      onClick={() => handleSelectStandardView(id)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className={styles.sidebarNavLeft}>
                        <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                        <span>{label}</span>
                      </span>
                      {typeof count === 'number' && (
                        <span className={styles.sidebarCount}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {brandNavItems.length > 0 && (
                <div className={styles.sidebarGroup} data-nav-group="brand">
                  <span className={styles.sidebarGroupLabel}>
                    <span className={styles.sidebarGroupDot} aria-hidden="true" />
                    <span>{ADMIN_VIEW_TEXTS.navGroups.brand}</span>
                  </span>
                  {brandNavItems.map(({ id, icon: Icon, label, group }) => {
                    const isActive = activeViewMode === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        data-nav-group={group}
                        className={`${styles.sidebarNavBtn} ${isActive ? styles.sidebarNavBtnActive : ''}`}
                        onClick={() => handleSelectStandardView(id)}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className={styles.sidebarNavLeft}>
                          <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                          <span>{label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {isOwner && (
                <div className={styles.sidebarAdvancedGroup} data-nav-group="advanced">
                  <button
                    type="button"
                    className={`${styles.advancedToggleBtn} ${activeViewMode === 'payments' ? styles.advancedToggleBtnActive : ''
                      }`}
                    onClick={() => setAdvancedMenuOpen((prev) => !prev)}
                    aria-expanded={advancedMenuOpen || activeViewMode === 'payments'}
                    aria-controls="sidebar-admin-advanced-items"
                  >
                    <span className={styles.sidebarNavLeft}>
                      <Lock size={14} strokeWidth={1.9} aria-hidden="true" />
                      <span>{ADMIN_VIEW_TEXTS.navGroups.advanced}</span>
                    </span>
                    <ChevronDown
                      size={14}
                      strokeWidth={2}
                      className={`${styles.advancedChevron} ${advancedMenuOpen || activeViewMode === 'payments'
                        ? styles.advancedChevronOpen
                        : ''
                        }`}
                      aria-hidden="true"
                    />
                  </button>

                  {(advancedMenuOpen || activeViewMode === 'payments') && (
                    <div id="sidebar-admin-advanced-items" className={styles.advancedItemsBox}>
                      <span className={styles.advancedHintText}>
                        {ADMIN_VIEW_TEXTS.navGroups.advancedHint}
                      </span>
                      <button
                        type="button"
                        data-nav-group="advanced"
                        className={`${styles.sidebarNavBtn} ${activeViewMode === 'payments' ? styles.sidebarNavBtnActive : ''
                          }`}
                        onClick={handleRequestPaymentsAccess}
                        aria-current={activeViewMode === 'payments' ? 'page' : undefined}
                      >
                        <span className={styles.sidebarNavLeft}>
                          <CreditCard size={16} strokeWidth={1.75} aria-hidden="true" />
                          <span>{ADMIN_VIEW_TEXTS.tabs.payments}</span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </nav>
          </aside>
          <div id="admin-sidebar-progress-slot" className={styles.sidebarProgressSlot} />
        </div>

        <div className={styles.workspace}>
          {showOperationalStats && (
            <section className={styles.statsSection} aria-label={ADMIN_VIEW_TEXTS.metrics.monthlyContextLabel(monthlyLabel)}>
              <div className={styles.statsHeaderRow}>
                <span className={styles.monthlyStatsNotice}>
                  <Calendar size={13} strokeWidth={1.75} aria-hidden="true" />
                  <span>{ADMIN_VIEW_TEXTS.metrics.monthlyContextLabel(monthlyLabel)}</span>
                </span>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={`${styles.statIconWrapper} ${styles.statSuccessIcon}`}>
                    <DollarSign size={18} strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>{ADMIN_VIEW_TEXTS.metrics.collectedDeposits}</span>
                    <span className={styles.statValue}>${monthlyMetrics.revenue.toLocaleString('es-AR')}</span>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={`${styles.statIconWrapper} ${styles.statPrimaryIcon}`}>
                    <Users size={18} strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>{ADMIN_VIEW_TEXTS.metrics.confirmedSlots}</span>
                    <span className={styles.statValue}>{monthlyMetrics.confirmed}</span>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={`${styles.statIconWrapper} ${styles.statSuccessIcon}`}>
                    <CheckCircle2 size={18} strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>{ADMIN_VIEW_TEXTS.metrics.availableSlots}</span>
                    <span className={styles.statValue}>{monthlyMetrics.available}</span>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={`${styles.statIconWrapper} ${styles.statPrimaryIcon}`}>
                    <Activity size={18} strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>{ADMIN_VIEW_TEXTS.metrics.totalSlots}</span>
                    <span className={styles.statValue}>{monthlyMetrics.total}</span>
                  </div>
                </div>
              </div>

              <div className={styles.periodBar}>
                <div
                  className={styles.scopeSegmentedControl}
                  role="group"
                  aria-label={ADMIN_VIEW_TEXTS.timeScope.ariaLabel}
                >
                  {(
                    [
                      ['day', ADMIN_VIEW_TEXTS.timeScope.day],
                      ['week', ADMIN_VIEW_TEXTS.timeScope.week],
                      ['month', ADMIN_VIEW_TEXTS.timeScope.month],
                      ['all', ADMIN_VIEW_TEXTS.timeScope.all],
                    ] as const
                  ).map(([scopeKey, label]) => (
                    <button
                      key={scopeKey}
                      type="button"
                      className={`${styles.scopePill} ${timeScope === scopeKey ? styles.activeScopePill : ''}`}
                      onClick={() => handleTimeScopeChange(scopeKey)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {timeScope !== 'all' ? (
                  <div className={styles.periodNavigator}>
                    <button
                      type="button"
                      className={styles.periodNavBtn}
                      onClick={() => handleShiftPeriod(-1)}
                      aria-label={ADMIN_VIEW_TEXTS.timeScope.prevAria}
                      title={ADMIN_VIEW_TEXTS.timeScope.prevAria}
                    >
                      <ChevronLeft size={15} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <span className={styles.periodRangeLabel}>{activePeriodLabel}</span>
                    <button
                      type="button"
                      className={styles.periodNavBtn}
                      onClick={() => handleShiftPeriod(1)}
                      aria-label={ADMIN_VIEW_TEXTS.timeScope.nextAria}
                      title={ADMIN_VIEW_TEXTS.timeScope.nextAria}
                    >
                      <ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles.periodTodayBtn}
                      onClick={handleGoToToday}
                    >
                      {ADMIN_VIEW_TEXTS.timeScope.today}
                    </button>
                  </div>
                ) : (
                  <span className={styles.periodRangeLabel}>{activePeriodLabel}</span>
                )}
              </div>

              {activeDayHoliday && (
                <div className={styles.holidayBanner} role="status">
                  <Calendar size={14} strokeWidth={1.85} aria-hidden="true" />
                  <span>
                    <strong>Feriado:</strong> {formatHolidaySummary(activeDayHoliday)}
                  </span>
                </div>
              )}
            </section>
          )}

          <AssignSlotModal
            isOpen={isAssignModalOpen}
            slot={selectedSlotToAssign}
            onClose={() => {
              setIsAssignModalOpen(false);
              setSelectedSlotToAssign(null);
            }}
            onAssign={handleAssignSlot}
            existingSlots={slots}
          />

          <section className={styles.mainContentPanel}>
            {loading && (
              <Loader
                size="lg"
                title={ADMIN_VIEW_TEXTS.loaders.loadingAdminTitle}
                subtitle={ADMIN_VIEW_TEXTS.loaders.loadingAdminSubtitle}
                icon="calendar"
              />
            )}

            {!loading && (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeViewMode}
                  className={styles.viewTransitionBox}
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.15, ease: [0.22, 1, 0.36, 1] }}
                >
                  {activeViewMode === 'create' && (
                    <CreateSlotModal
                      isOpen={true}
                      onClose={() => setViewMode('slots')}
                      onCreateSlot={handleCreateSlot}
                      onCreateMultipleSlots={handleCreateMultipleSlots}
                      existingSlots={slots}
                    />
                  )}
                  {activeViewMode === 'agenda' && (
                    <>
                      <div className={styles.toolbar}>
                        <div className={styles.searchWrapper}>
                          <Input
                            placeholder={ADMIN_VIEW_TEXTS.search.agendaPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            maxLength={FIELD_LIMITS.search.query.max}
                            leftIcon={<Search size={16} />}
                          />
                        </div>
                      </div>
                      <ConfirmedAgenda
                        slots={scopedSlots}
                        searchQuery={searchQuery}
                        onCancel={handleCancelSlot}
                        timeScope={timeScope}
                        timeZone={timezone}
                        periodLabel={activePeriodLabel}
                        otherPeriodMatches={otherPeriodConfirmedMatches}
                        onExpandPeriod={() =>
                          handleTimeScopeChange(timeScope === 'month' ? 'all' : 'month')
                        }
                        expandPeriodLabel={
                          timeScope === 'month'
                            ? ADMIN_VIEW_TEXTS.timeScope.showAllAction
                            : ADMIN_VIEW_TEXTS.timeScope.showMonthAction
                        }
                      />
                    </>
                  )}

                  {isOwner && activeViewMode === 'services' && <ServicesManager />}

                  {isOwner &&
                    activeViewMode === 'charts' &&
                    (chartsLoading ? (
                      <Loader
                        size="lg"
                        title={ADMIN_VIEW_TEXTS.loaders.loadingAdminTitle}
                        subtitle={ADMIN_VIEW_TEXTS.loaders.loadingAdminSubtitle}
                        icon="calendar"
                      />
                    ) : (
                      <AdminChart slots={chartsSlots} />
                    ))}

                  {isOwner && activeViewMode === 'portfolio' && <PortfolioManager />}

                  {isOwner && activeViewMode === 'owner' && <OwnerSettings />}

                  {isOwner && activeViewMode === 'appearance' && <AppearanceSettings />}

                  {isOwner && activeViewMode === 'payments' && <PaymentSettingsManager />}

                  {activeViewMode === 'slots' && (
                    <>
                      <div className={styles.toolbar}>
                        <div className={styles.filterTabs}>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${statusFilter === 'all' ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter('all')}
                          >
                            {ADMIN_VIEW_TEXTS.filters.all(scopedCounts.total)}
                          </button>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${statusFilter === 'available' ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter('available')}
                          >
                            {ADMIN_VIEW_TEXTS.filters.available(scopedCounts.available)}
                            {scopedCounts.tempConflicts > 0 && (
                              <span
                                className={styles.tempConflictTag}
                                title={`${scopedCounts.tempConflicts} turno(s) en conflicto temporal por pago en curso`}
                              >
                                {scopedCounts.tempConflicts} en pago
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${statusFilter === 'pending_payment' ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter('pending_payment')}
                          >
                            {ADMIN_VIEW_TEXTS.filters.pendingPayment(scopedCounts.pending)}
                          </button>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${statusFilter === 'confirmed' ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter('confirmed')}
                          >
                            {ADMIN_VIEW_TEXTS.filters.confirmed(scopedCounts.confirmed)}
                          </button>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${statusFilter === 'past' ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter('past')}
                          >
                            {ADMIN_VIEW_TEXTS.filters.past(scopedCounts.past)}
                          </button>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${statusFilter === 'cancelled' ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter('cancelled')}
                          >
                            {ADMIN_VIEW_TEXTS.filters.cancelled(scopedCounts.cancelled)}
                          </button>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${statusFilter === 'conflict' ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter('conflict')}
                          >
                            {ADMIN_VIEW_TEXTS.filters.conflict(scopedCounts.conflict)}
                          </button>
                        </div>

                        <div className={styles.toolbarActions}>
                          <div
                            className={styles.densitySegmentedControl}
                            role="group"
                            aria-label={ADMIN_VIEW_TEXTS.density.ariaLabel}
                          >
                            <button
                              type="button"
                              className={`${styles.densityPill} ${viewDensity === 'cards' ? styles.activeDensityPill : ''}`}
                              onClick={() => handleDensityChange('cards')}
                              title={ADMIN_VIEW_TEXTS.density.cardsTitle}
                            >
                              <LayoutGrid size={13} aria-hidden="true" />
                              <span>{ADMIN_VIEW_TEXTS.density.cards}</span>
                            </button>
                            <button
                              type="button"
                              className={`${styles.densityPill} ${viewDensity === 'compact' ? styles.activeDensityPill : ''}`}
                              onClick={() => handleDensityChange('compact')}
                              title={ADMIN_VIEW_TEXTS.density.compactTitle}
                            >
                              <Zap size={13} aria-hidden="true" />
                              <span>{ADMIN_VIEW_TEXTS.density.compact}</span>
                            </button>
                          </div>

                          <div className={styles.searchWrapper}>
                            <Input
                              placeholder={ADMIN_VIEW_TEXTS.search.slotsPlaceholder}
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              maxLength={FIELD_LIMITS.search.query.max}
                              leftIcon={<Search size={16} />}
                            />
                          </div>
                        </div>
                      </div>

                      {filteredSlots.length === 0 && (
                        <div className={styles.emptyStateCard}>
                          <Calendar size={32} color="var(--text-muted)" className={styles.emptyStateIcon} />
                          <h3 className={styles.emptyStateTitle}>{ADMIN_VIEW_TEXTS.emptyState.title}</h3>
                          <p className={styles.emptyStateText}>
                            {otherPeriodSlotMatches > 0
                              ? ADMIN_VIEW_TEXTS.timeScope.otherMatchesHint(otherPeriodSlotMatches)
                              : ADMIN_VIEW_TEXTS.emptyState.text}
                          </p>
                          {otherPeriodSlotMatches > 0 && timeScope !== 'all' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleTimeScopeChange(timeScope === 'month' ? 'all' : 'month')
                              }
                            >
                              {timeScope === 'month'
                                ? ADMIN_VIEW_TEXTS.timeScope.showAllAction
                                : ADMIN_VIEW_TEXTS.timeScope.showMonthAction}
                            </Button>
                          )}
                        </div>
                      )}

                      {filteredSlots.length > 0 && (
                        <div className={viewDensity === 'compact' ? styles.slotsGridCompact : styles.slotsGrid}>
                          {filteredSlots.map((slot) => (
                            <SlotCard
                              key={slot.id}
                              slot={slot}
                              allSlots={slots}
                              isAdmin={true}
                              compact={viewDensity === 'compact'}
                              searchQuery={searchQuery}
                              nowMs={nowMs}
                              onAssign={handleOpenAssignModal}
                              onCancel={handleCancelSlot}
                              onRelease={handleReleaseSlot}
                              onDelete={handleDeleteSlot}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </section>
        </div>
      </div>

      {actionLoadingText && (
        <Loader
          fullScreen
          title={actionLoadingText}
          subtitle={ADMIN_VIEW_TEXTS.loaders.actionSubtitle}
          icon="calendar"
        />
      )}

      <AlertModal
        isOpen={Boolean(error && dismissedErrorMsg !== error)}
        onClose={() => setDismissedErrorMsg(error)}
        title={ADMIN_VIEW_TEXTS.errors.connectionTitle}
        message={error || ADMIN_VIEW_TEXTS.errors.connectionFallback}
        type="error"
      />

      <AlertModal
        isOpen={confirmPaymentsModalOpen}
        onClose={() => setConfirmPaymentsModalOpen(false)}
        type="warning"
        title={ADMIN_VIEW_TEXTS.navGroups.paymentsProtectedTitle}
        message={ADMIN_VIEW_TEXTS.navGroups.paymentsProtectedMessage}
        details={[...ADMIN_VIEW_TEXTS.navGroups.paymentsProtectedDetails]}
        confirmText={ADMIN_VIEW_TEXTS.navGroups.paymentsProtectedConfirm}
        onConfirm={handleConfirmPaymentsAccess}
        secondaryText={ADMIN_VIEW_TEXTS.navGroups.paymentsProtectedCancel}
        onSecondary={() => setConfirmPaymentsModalOpen(false)}
        closeOnBackdropClick
        closeOnEscape
      />
    </div>
  );
};

export default AdminView;
