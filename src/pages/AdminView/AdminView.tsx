import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
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
  LogOut,
  ExternalLink,
  Sparkles,
  LayoutGrid,
  Zap,
} from 'lucide-react';
import { useSlots } from '../../hooks/useSlots';
import { useAuth } from '../../hooks/useAuth';
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
import ThemeSwitcher from '../../components/common/ThemeSwitcher/ThemeSwitcher';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import Loader from '../../components/common/Loader/Loader';
import AlertModal from '../../components/common/AlertModal';
import { ADMIN_VIEW_TEXTS } from '../../texts';
import styles from './AdminView.module.css';

export const AdminView: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  // Modal create slot state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Modal assign slot state
  const [selectedSlotToAssign, setSelectedSlotToAssign] = useState<Slot | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // View Mode: 'agenda' | 'slots' | 'portfolio' | 'owner' | 'charts' | 'services'
  const [viewMode, setViewMode] = useState<'agenda' | 'slots' | 'portfolio' | 'owner' | 'charts' | 'services'>('agenda');

  // Filters state para la lista de turnos
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

  const handleDensityChange = (newDensity: 'cards' | 'compact') => {
    setViewDensity(newDensity);
    try {
      localStorage.setItem('admin_slots_view_density', newDensity);
    } catch (err) {
      console.error('Error saving admin view density to localStorage:', err);
    }
  };

  // Metrics calculation
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

  // Filtered slots para la vista de lista
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

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error(ADMIN_VIEW_TEXTS.errors.logout, err);
    }
  };

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

  return (
    <div className={`container ${styles.dashboard} animate-fade-in`}>
      {/* 1. Header Ejecutivo y Barra de Controles Superiores */}
      <header className={styles.headerPanel}>
        <div className={styles.titleArea}>
          <div className={styles.statusRow}>
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              {ADMIN_VIEW_TEXTS.header.badgeOnline}
            </span>
            <span className={styles.roleBadge}>
              {ADMIN_VIEW_TEXTS.header.roleAdmin}
            </span>
          </div>

          <h1 className={styles.title}>{ADMIN_VIEW_TEXTS.header.title}</h1>
          <p className={styles.subtitle}>
            <span>{ADMIN_VIEW_TEXTS.header.sessionPrefix}</span>
            <span className={styles.userEmailPill}>{user?.email}</span>
          </p>
        </div>

        <div className={styles.headerControls}>
          <ThemeSwitcher />

          <Link to="/">
            <Button variant="outline" size="sm" leftIcon={<ExternalLink size={15} />}>
              {ADMIN_VIEW_TEXTS.header.viewWeb}
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            className={styles.createSlotBtn}
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus size={16} />}
          >
            {ADMIN_VIEW_TEXTS.header.createSlots}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            leftIcon={<LogOut size={16} />}
          >
            {ADMIN_VIEW_TEXTS.header.logout}
          </Button>
        </div>
      </header>

      {/* 2. Métricas de Rendimiento Jerarquizadas (KPIs) */}
      <section className={styles.statsGrid} aria-label="Métricas de rendimiento del estudio">
        {/* KPI 1: Señas Recaudadas (Acento Financiero Clave) */}
        <div className={`${styles.statCard} ${styles.statCardRevenue}`}>
          <div className={`${styles.statIconWrapper} ${styles.statSuccessIcon}`}>
            <DollarSign size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>{ADMIN_VIEW_TEXTS.metrics.collectedDeposits}</span>
            <span className={styles.statValue}>${metrics.revenue.toLocaleString('es-AR')}</span>
            <span className={styles.statSub}>{ADMIN_VIEW_TEXTS.metrics.revenueSubtitle}</span>
          </div>
        </div>

        {/* KPI 2: Citas Confirmadas */}
        <div className={`${styles.statCard} ${styles.statCardConfirmed}`}>
          <div className={`${styles.statIconWrapper} ${styles.statPrimaryIcon}`}>
            <Users size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>{ADMIN_VIEW_TEXTS.metrics.confirmedSlots}</span>
            <span className={styles.statValue}>{metrics.confirmed}</span>
            <span className={styles.statSub}>{ADMIN_VIEW_TEXTS.metrics.confirmedSubtitle}</span>
          </div>
        </div>

        {/* KPI 3: Turnos Disponibles */}
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statSuccessIcon}`}>
            <CheckCircle2 size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>{ADMIN_VIEW_TEXTS.metrics.availableSlots}</span>
            <span className={styles.statValue}>{metrics.available}</span>
            <span className={styles.statSub}>{ADMIN_VIEW_TEXTS.metrics.availableSubtitle}</span>
          </div>
        </div>

        {/* KPI 4: Total Horarios */}
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statPrimaryIcon}`}>
            <Activity size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>{ADMIN_VIEW_TEXTS.metrics.totalSlots}</span>
            <span className={styles.statValue}>{metrics.total}</span>
            <span className={styles.statSub}>{ADMIN_VIEW_TEXTS.metrics.totalSubtitle}</span>
          </div>
        </div>
      </section>

      {/* Modal / Formulario de Creación de Turnos Masivos */}
      <CreateSlotModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateSlot={addSlot}
        onCreateMultipleSlots={addMultipleSlots}
        existingSlots={slots}
      />

      {/* Modal de Asignación Manual de Turno */}
      <AssignSlotModal
        isOpen={isAssignModalOpen}
        slot={selectedSlotToAssign}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedSlotToAssign(null);
        }}
        onAssign={assignSlot}
      />

      {/* 3. Selector Principal de Vistas Sticky */}
      <nav className={styles.viewModeStickyWrapper} aria-label="Navegación de módulos del administrador">
        <div className={styles.viewModeContainer}>
          <button
            type="button"
            className={`${styles.viewModeBtn} ${viewMode === 'agenda' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('agenda')}
          >
            <CalendarCheck2 size={16} />
            <span>{ADMIN_VIEW_TEXTS.tabs.agenda(metrics.confirmed)}</span>
          </button>

          <button
            type="button"
            className={`${styles.viewModeBtn} ${viewMode === 'slots' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('slots')}
          >
            <Layers size={16} />
            <span>{ADMIN_VIEW_TEXTS.tabs.slots(slots.length)}</span>
          </button>

          <button
            type="button"
            className={`${styles.viewModeBtn} ${viewMode === 'services' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('services')}
          >
            <Sparkles size={16} />
            <span>{ADMIN_VIEW_TEXTS.tabs.services}</span>
          </button>

          <button
            type="button"
            className={`${styles.viewModeBtn} ${viewMode === 'charts' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('charts')}
          >
            <BarChart3 size={16} />
            <span>{ADMIN_VIEW_TEXTS.tabs.charts}</span>
          </button>

          <button
            type="button"
            className={`${styles.viewModeBtn} ${viewMode === 'portfolio' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('portfolio')}
          >
            <ImageIcon size={16} />
            <span>{ADMIN_VIEW_TEXTS.tabs.portfolio}</span>
          </button>

          <button
            type="button"
            className={`${styles.viewModeBtn} ${viewMode === 'owner' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('owner')}
          >
            <UserCheck size={16} />
            <span>{ADMIN_VIEW_TEXTS.tabs.owner}</span>
          </button>
        </div>
      </nav>

      {/* 4. Canvas Enmarcado de Contenido (Módulo Activo) */}
      <main className={styles.mainContentPanel}>
        {/* Loading State Unificado */}
        {loading && (
          <Loader
            size="lg"
            title={ADMIN_VIEW_TEXTS.loaders.loadingAdminTitle}
            subtitle={ADMIN_VIEW_TEXTS.loaders.loadingAdminSubtitle}
            icon="calendar"
          />
        )}

        {/* CONTENIDO SEGÚN LA VISTA SELECCIONADA */}

        {/* VISTA 1: AGENDA COMPACTA DE TURNOS CONFIRMADOS */}
        {!loading && viewMode === 'agenda' && (
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

        {/* VISTA 2: GESTIÓN UNIFICADA DE SERVICIOS, PRECIOS Y TIEMPOS */}
        {!loading && viewMode === 'services' && <ServicesManager />}

        {/* VISTA 3: MÉTRICAS Y GRÁFICOS */}
        {!loading && viewMode === 'charts' && <AdminChart slots={slots} />}

        {/* VISTA 4: GESTOR DE PORTFOLIO / TRABAJOS PREVIOS */}
        {!loading && viewMode === 'portfolio' && <PortfolioManager />}

        {/* VISTA 5: CONFIGURACIÓN DE PERFIL Y PÁGINA ABOUT */}
        {!loading && viewMode === 'owner' && <OwnerSettings />}

        {/* VISTA 6: LISTA Y CLASIFICACIÓN DE TURNOS */}
        {!loading && viewMode === 'slots' && (
          <>
            {/* Toolbar & Filters */}
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
                {/* Segmented Control para Densidad de Visualización */}
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
              <div className={styles.slotsGrid}>
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
      </main>

      {actionLoadingText && (
        <Loader
          fullScreen
          title={actionLoadingText}
          subtitle={ADMIN_VIEW_TEXTS.loaders.actionSubtitle}
          icon="calendar"
        />
      )}

      {/* MODAL DE ERROR DE CARGA */}
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
