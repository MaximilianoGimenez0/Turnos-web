import React, { useState, useMemo } from 'react';
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
  Sparkles,
  LayoutGrid,
  Zap,
} from 'lucide-react';
import { useSlots } from '../../hooks/useSlots';
import type { Slot } from '../../types';
import { findPendingConflictForSlot } from '../../services/schedulingService';
import SlotCard from '../../components/slots/SlotCard/SlotCard';
import CreateSlotModal from '../../components/slots/CreateSlotModal/CreateSlotModal';
import AssignSlotModal from '../../components/admin/AssignSlotModal/AssignSlotModal';
import ConfirmedAgenda from '../../components/admin/ConfirmedAgenda/ConfirmedAgenda';
import AdminChart from '../../components/admin/AdminChart/AdminChart';
import OwnerSettings from '../../components/admin/OwnerSettings/OwnerSettings';
import PortfolioManager from '../../components/admin/PortfolioManager/PortfolioManager';
import ServicesManager from '../../components/admin/ServicesManager/ServicesManager';
import Input from '../../components/common/Input/Input';
import Loader from '../../components/common/Loader/Loader';
import AlertModal from '../../components/common/AlertModal';
import { ADMIN_VIEW_TEXTS } from '../../texts';
import styles from './AdminView.module.css';

export const AdminView: React.FC = () => {
  const [dismissedError, setDismissedError] = useState(false);

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
  });

  const [selectedSlotToAssign, setSelectedSlotToAssign] = useState<Slot | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const [viewMode, setViewMode] = useState<
    'agenda' | 'slots' | 'create' | 'portfolio' | 'owner' | 'charts' | 'services'
  >('agenda');

  const [statusFilter, setStatusFilter] = useState<
    'all' | 'available' | 'pending_payment' | 'confirmed' | 'past' | 'cancelled' | 'conflict'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewDensity, setViewDensity] = useState<'cards' | 'compact'>(() => {
    try {
      const saved = localStorage.getItem('admin_slots_view_density');
      return saved === 'compact' ? 'compact' : 'cards';
    } catch {
      return 'cards';
    }
  });
  const [actionLoadingText, setActionLoadingText] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const handleDensityChange = (newDensity: 'cards' | 'compact') => {
    setViewDensity(newDensity);
    try {
      localStorage.setItem('admin_slots_view_density', newDensity);
    } catch (err) {
      console.error('Error saving admin view density to localStorage:', err);
    }
  };

  const metrics = useMemo(() => {
    const total = slots.length;
    const availableSlots = slots.filter((s) => s.status === 'available');
    const available = availableSlots.length;
    const pending = slots.filter((s) => s.status === 'pending_payment').length;
    const confirmed = slots.filter((s) => s.status === 'confirmed').length;
    const past = slots.filter((s) => s.status === 'past').length;
    const cancelled = slots.filter((s) => s.status === 'cancelled').length;
    const conflict = slots.filter((s) => s.status === 'conflict').length;
    const revenue = slots
      .filter((s) => s.status === 'confirmed' || (s.status === 'past' && s.pastOutcome !== 'cancelled'))
      .reduce((acc, s) => acc + (s.paidAmount || s.depositAmount || 0), 0);

    const tempConflicts = availableSlots.filter(
      (s) => findPendingConflictForSlot(s, slots) !== null
    ).length;

    return { total, available, pending, confirmed, past, cancelled, conflict, revenue, tempConflicts };
  }, [slots]);

  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      const matchesStatus = statusFilter === 'all' || slot.status === statusFilter;
      const matchesQuery =
        !searchQuery ||
        (slot.serviceName &&
          slot.serviceName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (slot.clientData?.name &&
          slot.clientData.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (slot.clientData?.email &&
          slot.clientData.email.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesStatus && matchesQuery;
    });
  }, [slots, statusFilter, searchQuery]);

  const handleCancelSlot = async (slotId: string) => {
    if (window.confirm(ADMIN_VIEW_TEXTS.dialogs.confirmCancel)) {
      setActionLoadingText(ADMIN_VIEW_TEXTS.loaders.cancelling);
      try {
        await cancelExistingSlot(slotId);
      } catch (err) {
        console.error(ADMIN_VIEW_TEXTS.errors.cancel, err);
      } finally {
        setActionLoadingText(null);
      }
    }
  };

  const handleOpenAssignModal = (slot: Slot) => {
    const conflict = findPendingConflictForSlot(slot, slots);
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
      } catch (err) {
        console.error(ADMIN_VIEW_TEXTS.errors.delete, err);
      } finally {
        setActionLoadingText(null);
      }
    }
  };

  const showOperationalStats = viewMode === 'agenda' || viewMode === 'slots';

  const navItems = [
    {
      id: 'agenda' as const,
      icon: CalendarCheck2,
      label: 'Agenda',
      count: metrics.confirmed,
    },
    {
      id: 'slots' as const,
      icon: Layers,
      label: 'Turnos',
      count: slots.length,
    },
    {
      id: 'create' as const,
      icon: CalendarPlus,
      label: ADMIN_VIEW_TEXTS.header.createSlots,
    },
    {
      id: 'services' as const,
      icon: Sparkles,
      label: ADMIN_VIEW_TEXTS.tabs.services,
    },
    {
      id: 'charts' as const,
      icon: BarChart3,
      label: ADMIN_VIEW_TEXTS.tabs.charts,
    },
    {
      id: 'portfolio' as const,
      icon: ImageIcon,
      label: ADMIN_VIEW_TEXTS.tabs.portfolio,
    },
    {
      id: 'owner' as const,
      icon: UserCheck,
      label: ADMIN_VIEW_TEXTS.tabs.owner,
    },
  ];

  return (
    <div className={`${styles.dashboard} animate-fade-in`}>
      <nav className={styles.mobileTabsWrapper} aria-label="Navegación de módulos del administrador">
        <div className={styles.mobileTabsList}>
          {navItems.map(({ id, icon: Icon, label, count }) => {
            const isActive = viewMode === id;
            return (
              <button
                key={id}
                type="button"
                className={`${styles.mobileTabBtn} ${isActive ? styles.mobileTabBtnActive : ''}`}
                onClick={() => setViewMode(id)}
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
        </div>
      </nav>

      <div className={styles.adminShell}>
        <aside className={styles.sidebar} aria-label="Navegación del panel">
          <nav className={styles.sidebarNav}>
            {navItems.map(({ id, icon: Icon, label, count }) => {
              const isActive = viewMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  className={`${styles.sidebarNavBtn} ${isActive ? styles.sidebarNavBtnActive : ''}`}
                  onClick={() => setViewMode(id)}
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
          </nav>
        </aside>

        <div className={styles.workspace}>
          {showOperationalStats && (
            <section className={styles.statsGrid} aria-label="Resumen operativo del estudio">
              <div className={styles.statCard}>
                <div className={`${styles.statIconWrapper} ${styles.statSuccessIcon}`}>
                  <DollarSign size={18} strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>{ADMIN_VIEW_TEXTS.metrics.collectedDeposits}</span>
                  <span className={styles.statValue}>${metrics.revenue.toLocaleString('es-AR')}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrapper} ${styles.statPrimaryIcon}`}>
                  <Users size={18} strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>{ADMIN_VIEW_TEXTS.metrics.confirmedSlots}</span>
                  <span className={styles.statValue}>{metrics.confirmed}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrapper} ${styles.statSuccessIcon}`}>
                  <CheckCircle2 size={18} strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>{ADMIN_VIEW_TEXTS.metrics.availableSlots}</span>
                  <span className={styles.statValue}>{metrics.available}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrapper} ${styles.statPrimaryIcon}`}>
                  <Activity size={18} strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>{ADMIN_VIEW_TEXTS.metrics.totalSlots}</span>
                  <span className={styles.statValue}>{metrics.total}</span>
                </div>
              </div>
            </section>
          )}

          <AssignSlotModal
            isOpen={isAssignModalOpen}
            slot={selectedSlotToAssign}
            onClose={() => {
              setIsAssignModalOpen(false);
              setSelectedSlotToAssign(null);
            }}
            onAssign={assignSlot}
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
                  key={viewMode}
                  className={styles.viewTransitionBox}
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.15, ease: [0.22, 1, 0.36, 1] }}
                >
                  {viewMode === 'create' && (
                    <CreateSlotModal
                      isOpen={true}
                      onClose={() => setViewMode('slots')}
                      onCreateSlot={addSlot}
                      onCreateMultipleSlots={addMultipleSlots}
                      existingSlots={slots}
                    />
                  )}
                  {viewMode === 'agenda' && (
                    <>
                      <div className={styles.toolbar}>
                        <div className={styles.searchWrapper}>
                          <Input
                            placeholder={ADMIN_VIEW_TEXTS.search.agendaPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search size={16} />}
                          />
                        </div>
                      </div>
                      <ConfirmedAgenda
                        slots={slots}
                        searchQuery={searchQuery}
                        onCancel={handleCancelSlot}
                      />
                    </>
                  )}

                  {viewMode === 'services' && <ServicesManager />}

                  {viewMode === 'charts' && <AdminChart slots={slots} />}

                  {viewMode === 'portfolio' && <PortfolioManager />}

                  {viewMode === 'owner' && <OwnerSettings />}

                  {viewMode === 'slots' && (
                    <>
                      <div className={styles.toolbar}>
                        <div className={styles.filterTabs}>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${statusFilter === 'all' ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter('all')}
                          >
                            {ADMIN_VIEW_TEXTS.filters.all(slots.length)}
                          </button>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${statusFilter === 'available' ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter('available')}
                          >
                            {ADMIN_VIEW_TEXTS.filters.available(metrics.available)}
                            {metrics.tempConflicts > 0 && (
                              <span
                                className={styles.tempConflictTag}
                                title={`${metrics.tempConflicts} turno(s) en conflicto temporal por pago en curso`}
                              >
                                {metrics.tempConflicts} en pago
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${statusFilter === 'pending_payment' ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter('pending_payment')}
                          >
                            {ADMIN_VIEW_TEXTS.filters.pendingPayment(metrics.pending)}
                          </button>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${statusFilter === 'confirmed' ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter('confirmed')}
                          >
                            {ADMIN_VIEW_TEXTS.filters.confirmed(metrics.confirmed)}
                          </button>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${statusFilter === 'past' ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter('past')}
                          >
                            {ADMIN_VIEW_TEXTS.filters.past(metrics.past)}
                          </button>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${statusFilter === 'cancelled' ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter('cancelled')}
                          >
                            {ADMIN_VIEW_TEXTS.filters.cancelled(metrics.cancelled)}
                          </button>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${statusFilter === 'conflict' ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter('conflict')}
                          >
                            {ADMIN_VIEW_TEXTS.filters.conflict(metrics.conflict)}
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
                            {ADMIN_VIEW_TEXTS.emptyState.text}
                          </p>
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
        isOpen={Boolean(error && !dismissedError)}
        onClose={() => setDismissedError(true)}
        title={ADMIN_VIEW_TEXTS.errors.connectionTitle}
        message={error || ADMIN_VIEW_TEXTS.errors.connectionFallback}
        type="error"
      />
    </div>
  );
};

export default AdminView;
